import { createHash } from 'node:crypto'
import { readFile, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const FPL_KIT_ROOT = 'https://fantasy.premierleague.com/dist/img/shirts/standard'
export const PREMIER_LEAGUE_CREST_ROOT = 'https://resources.premierleague.com/premierleague/badges/50'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const frontendDirectory = resolve(scriptDirectory, '..')
const defaultBootstrapPath = resolve(frontendDirectory, '../backend/data/initial_bootstrap.json')
const defaultOutputRoot = resolve(frontendDirectory, 'public/kits')
const defaultCrestOutputRoot = resolve(frontendDirectory, 'public/crests')

export function seasonKey(value) {
  return value
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}

export function inferSeason(events) {
  const deadlines = events
    .map((event) => new Date(event.deadline_time))
    .filter((deadline) => !Number.isNaN(deadline.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())

  if (deadlines.length === 0) {
    throw new Error('Cannot infer the season because the bootstrap has no valid gameweek deadlines.')
  }

  const firstYear = deadlines[0].getUTCFullYear()
  const lastYear = deadlines.at(-1).getUTCFullYear()
  return `${firstYear}-${String(lastYear).slice(-2)}`
}

export function kitAssets(teams) {
  return [...teams]
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((team) => {
      if (!Number.isInteger(team.code) || team.code <= 0) {
        throw new Error(`Team ${team.name ?? team.id ?? 'unknown'} has an invalid kit code.`)
      }
      return [
        { team, variant: 'outfield', filename: `shirt_${team.code}-220.webp` },
        { team, variant: 'goalkeeper', filename: `shirt_${team.code}_1-220.webp` },
      ]
    })
    .map((asset) => ({
      ...asset,
      sourceUrl: `${FPL_KIT_ROOT}/${asset.filename}`,
    }))
}

export function crestAssets(teams) {
  return [...teams]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((team) => {
      if (!Number.isInteger(team.code) || team.code <= 0) {
        throw new Error(`Team ${team.name ?? team.id ?? 'unknown'} has an invalid crest code.`)
      }
      const filename = `t${team.code}.png`
      return {
        team,
        filename,
        sourceUrl: `${PREMIER_LEAGUE_CREST_ROOT}/${filename}`,
      }
    })
}

export function assertWebp(buffer, label) {
  const isWebp = buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!isWebp) throw new Error(`${label} did not return a valid WebP image.`)
}

export function assertPng(buffer, label) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buffer.length < pngSignature.length || !buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${label} did not return a valid PNG image.`)
  }
}

function checksum(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function download(asset, fetchImpl, timeoutMs, validate) {
  const response = await fetchImpl(asset.sourceUrl, {
    headers: { 'User-Agent': 'fpl-local-seasonal-asset-sync/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`${asset.sourceUrl} returned HTTP ${response.status}.`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  validate(buffer, asset.sourceUrl)
  return buffer
}

export async function syncFplKits({
  bootstrap,
  outputRoot = defaultOutputRoot,
  season,
  force = false,
  dryRun = false,
  fetchImpl = fetch,
  timeoutMs = 30_000,
  now = () => new Date(),
  logger = console,
}) {
  const normalizedSeason = seasonKey(season || inferSeason(bootstrap.events ?? []))
  if (!normalizedSeason) throw new Error('Season must contain at least one letter or number.')
  const assets = kitAssets(bootstrap.teams ?? [])
  if (assets.length === 0) throw new Error('The bootstrap contains no teams.')

  const seasonDirectory = resolve(outputRoot, normalizedSeason)
  if (dryRun) {
    logger.info(`Would sync ${assets.length} kits into ${seasonDirectory}`)
    return { season: normalizedSeason, downloaded: 0, reused: 0, total: assets.length }
  }

  await mkdir(seasonDirectory, { recursive: true })
  const manifestAssets = []
  let downloaded = 0
  let reused = 0

  for (const asset of assets) {
    const destination = resolve(seasonDirectory, asset.filename)
    let buffer = null
    if (!force) {
      try {
        const existing = await readFile(destination)
        assertWebp(existing, destination)
        buffer = existing
        reused += 1
      } catch {
        buffer = null
      }
    }

    if (!buffer) {
      buffer = await download(asset, fetchImpl, timeoutMs, assertWebp)
      const temporary = `${destination}.${process.pid}.tmp`
      try {
        await writeFile(temporary, buffer)
        await rename(temporary, destination)
      } finally {
        await rm(temporary, { force: true })
      }
      downloaded += 1
      logger.info(`Downloaded ${asset.team.name} ${asset.variant} kit`)
    }

    manifestAssets.push({
      team_id: asset.team.id,
      team_code: asset.team.code,
      team_name: asset.team.name,
      variant: asset.variant,
      file: asset.filename,
      source_url: asset.sourceUrl,
      sha256: checksum(buffer),
      bytes: buffer.length,
    })
  }

  const manifest = {
    season: normalizedSeason,
    synced_at: now().toISOString(),
    source: FPL_KIT_ROOT,
    assets: manifestAssets,
  }
  const manifestPath = resolve(seasonDirectory, 'manifest.json')
  const temporaryManifest = `${manifestPath}.${process.pid}.tmp`
  try {
    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    await rename(temporaryManifest, manifestPath)
  } finally {
    await rm(temporaryManifest, { force: true })
  }

  logger.info(`Kit sync complete: ${downloaded} downloaded, ${reused} reused, ${assets.length} total.`)
  return { season: normalizedSeason, downloaded, reused, total: assets.length }
}

export async function syncFplCrests({
  bootstrap,
  outputRoot = defaultCrestOutputRoot,
  season,
  force = false,
  dryRun = false,
  fetchImpl = fetch,
  timeoutMs = 30_000,
  now = () => new Date(),
  logger = console,
}) {
  const normalizedSeason = seasonKey(season || inferSeason(bootstrap.events ?? []))
  if (!normalizedSeason) throw new Error('Season must contain at least one letter or number.')
  const assets = crestAssets(bootstrap.teams ?? [])
  if (assets.length === 0) throw new Error('The bootstrap contains no teams.')

  if (dryRun) {
    logger.info(`Would sync ${assets.length} crests into ${outputRoot}`)
    return { season: normalizedSeason, downloaded: 0, reused: 0, total: assets.length }
  }

  await mkdir(outputRoot, { recursive: true })
  const manifestPath = resolve(outputRoot, 'manifest.json')
  let previousSeason = null
  try {
    previousSeason = JSON.parse(await readFile(manifestPath, 'utf8')).season
  } catch {
    previousSeason = null
  }
  const canReuse = !force && previousSeason === normalizedSeason
  const manifestAssets = []
  let downloaded = 0
  let reused = 0

  for (const asset of assets) {
    const destination = resolve(outputRoot, asset.filename)
    let buffer = null
    if (canReuse) {
      try {
        const existing = await readFile(destination)
        assertPng(existing, destination)
        buffer = existing
        reused += 1
      } catch {
        buffer = null
      }
    }

    if (!buffer) {
      buffer = await download(asset, fetchImpl, timeoutMs, assertPng)
      const temporary = `${destination}.${process.pid}.tmp`
      try {
        await writeFile(temporary, buffer)
        await rename(temporary, destination)
      } finally {
        await rm(temporary, { force: true })
      }
      downloaded += 1
      logger.info(`Downloaded ${asset.team.name} crest`)
    }

    manifestAssets.push({
      team_id: asset.team.id,
      team_code: asset.team.code,
      team_name: asset.team.name,
      file: asset.filename,
      source_url: asset.sourceUrl,
      sha256: checksum(buffer),
      bytes: buffer.length,
    })
  }

  const manifest = {
    season: normalizedSeason,
    synced_at: now().toISOString(),
    source: PREMIER_LEAGUE_CREST_ROOT,
    assets: manifestAssets,
  }
  const temporaryManifest = `${manifestPath}.${process.pid}.tmp`
  try {
    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    await rename(temporaryManifest, manifestPath)
  } finally {
    await rm(temporaryManifest, { force: true })
  }

  logger.info(`Crest sync complete: ${downloaded} downloaded, ${reused} reused, ${assets.length} total.`)
  return { season: normalizedSeason, downloaded, reused, total: assets.length }
}

export function parseArguments(arguments_) {
  const options = {
    bootstrapPath: defaultBootstrapPath,
    outputRoot: defaultOutputRoot,
    crestOutputRoot: defaultCrestOutputRoot,
    season: '',
    force: false,
    dryRun: false,
    help: false,
  }
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--force') options.force = true
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--help' || argument === '-h') options.help = true
    else if (['--season', '--bootstrap', '--output', '--crest-output'].includes(argument)) {
      const value = arguments_[index + 1]
      if (!value) throw new Error(`${argument} requires a value.`)
      if (argument === '--season') options.season = value
      if (argument === '--bootstrap') options.bootstrapPath = resolve(value)
      if (argument === '--output') options.outputRoot = resolve(value)
      if (argument === '--crest-output') options.crestOutputRoot = resolve(value)
      index += 1
    } else throw new Error(`Unknown argument: ${argument}`)
  }
  return options
}

function usage() {
  return `Usage: npm run sync:assets -- [options]

Options:
  --season <name>      Override the season folder (default: infer from deadlines)
  --bootstrap <file>   Use a different saved bootstrap JSON
  --output <folder>    Use a different local kit root
  --crest-output <dir> Use a different local crest root
  --force              Download again even when a valid local file exists
  --dry-run            Print the intended sync without downloading
  --help                Show this help`
}

export async function main(arguments_ = process.argv.slice(2)) {
  const options = parseArguments(arguments_)
  if (options.help) {
    console.info(usage())
    return
  }
  const bootstrap = JSON.parse(await readFile(options.bootstrapPath, 'utf8'))
  await syncFplKits({ ...options, bootstrap })
  await syncFplCrests({
    ...options,
    bootstrap,
    outputRoot: options.crestOutputRoot,
  })
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
