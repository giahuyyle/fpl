import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertPng,
  assertWebp,
  crestAssets,
  inferSeason,
  kitAssets,
  parseArguments,
  seasonKey,
  syncFplCrests,
  syncFplKits,
} from './sync-fpl-kits.mjs'

const temporaryDirectories = []
const webp = Buffer.from('RIFF\x04\x00\x00\x00WEBP', 'binary')
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const bootstrap = {
  events: [
    { deadline_time: '2027-05-30T13:30:00Z' },
    { deadline_time: '2026-08-21T17:30:00Z' },
  ],
  teams: [{ id: 1, name: 'Arsenal', code: 3 }],
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directory) => {
    const { rm } = await import('node:fs/promises')
    await rm(directory, { recursive: true, force: true })
  }))
})

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'fpl-kits-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('seasonal kit sync', () => {
  it('derives season and official kit variants from saved bootstrap data', () => {
    expect(inferSeason(bootstrap.events)).toBe('2026-27')
    expect(seasonKey(' 2026/27 ')).toBe('2026-27')
    expect(kitAssets(bootstrap.teams).map((asset) => asset.filename)).toEqual([
      'shirt_3-220.webp',
      'shirt_3_1-220.webp',
    ])
    expect(crestAssets(bootstrap.teams).map((asset) => asset.filename)).toEqual(['t3.png'])
  })

  it('rejects missing dates, invalid team codes, and invalid images', () => {
    expect(() => inferSeason([])).toThrow('no valid gameweek deadlines')
    expect(() => kitAssets([{ id: 1, name: 'No Code' }])).toThrow('invalid kit code')
    expect(() => crestAssets([{ id: 1, name: 'No Code' }])).toThrow('invalid crest code')
    expect(() => assertWebp(Buffer.from('not an image'), 'asset')).toThrow('valid WebP')
    expect(() => assertPng(Buffer.from('not an image'), 'asset')).toThrow('valid PNG')
  })

  it('downloads crests locally and refreshes them when the season changes', async () => {
    const outputRoot = await temporaryDirectory()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => png,
    }))
    const logger = { info: vi.fn() }
    const now = () => new Date('2026-09-05T00:00:00Z')

    const first = await syncFplCrests({ bootstrap, outputRoot, fetchImpl, logger, now })
    const second = await syncFplCrests({ bootstrap, outputRoot, fetchImpl, logger, now })
    const nextSeason = await syncFplCrests({ bootstrap, outputRoot, season: '2027-28', fetchImpl, logger, now })

    expect(first).toEqual({ season: '2026-27', downloaded: 1, reused: 0, total: 1 })
    expect(second).toEqual({ season: '2026-27', downloaded: 0, reused: 1, total: 1 })
    expect(nextSeason).toEqual({ season: '2027-28', downloaded: 1, reused: 0, total: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(await readFile(join(outputRoot, 't3.png'))).toEqual(png)
    const manifest = JSON.parse(await readFile(join(outputRoot, 'manifest.json'), 'utf8'))
    expect(manifest).toMatchObject({ season: '2027-28', source: expect.stringContaining('/badges/50') })
  })

  it('downloads both variants, writes a manifest, and reuses valid files', async () => {
    const outputRoot = await temporaryDirectory()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => webp,
    }))
    const logger = { info: vi.fn() }
    const now = () => new Date('2026-09-05T00:00:00Z')

    const first = await syncFplKits({ bootstrap, outputRoot, fetchImpl, logger, now })
    const second = await syncFplKits({ bootstrap, outputRoot, fetchImpl, logger, now })

    expect(first).toEqual({ season: '2026-27', downloaded: 2, reused: 0, total: 2 })
    expect(second).toEqual({ season: '2026-27', downloaded: 0, reused: 2, total: 2 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const manifest = JSON.parse(await readFile(join(outputRoot, '2026-27/manifest.json'), 'utf8'))
    expect(manifest.synced_at).toBe('2026-09-05T00:00:00.000Z')
    expect(manifest.assets).toHaveLength(2)
    expect(manifest.assets[0]).toMatchObject({ team_code: 3, variant: 'outfield', bytes: 12 })
  })

  it('redownloads invalid local files and supports force and dry-run', async () => {
    const outputRoot = await temporaryDirectory()
    const seasonDirectory = join(outputRoot, 'custom')
    const { mkdir } = await import('node:fs/promises')
    await mkdir(seasonDirectory)
    await writeFile(join(seasonDirectory, 'shirt_3-220.webp'), 'broken')
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => webp }))
    const logger = { info: vi.fn() }

    const synced = await syncFplKits({ bootstrap, outputRoot, season: 'custom', fetchImpl, logger })
    const forced = await syncFplKits({ bootstrap, outputRoot, season: 'custom', force: true, fetchImpl, logger })
    const dryRun = await syncFplKits({ bootstrap, outputRoot, season: 'custom', dryRun: true, fetchImpl, logger })

    expect(synced.downloaded).toBe(2)
    expect(forced.downloaded).toBe(2)
    expect(dryRun).toEqual({ season: 'custom', downloaded: 0, reused: 0, total: 2 })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('reports download errors and validates arguments', async () => {
    const outputRoot = await temporaryDirectory()
    await expect(syncFplKits({
      bootstrap,
      outputRoot,
      fetchImpl: async () => ({ ok: false, status: 404 }),
      logger: { info: vi.fn() },
    })).rejects.toThrow('HTTP 404')
    await expect(syncFplKits({ bootstrap: { events: bootstrap.events, teams: [] }, outputRoot })).rejects.toThrow('no teams')
    await expect(syncFplKits({ bootstrap, outputRoot, season: '!!!' })).rejects.toThrow('at least one letter')
    expect(parseArguments(['--season', '2026/27', '--crest-output', './badges', '--force', '--dry-run'])).toMatchObject({ season: '2026/27', crestOutputRoot: expect.stringContaining('/badges'), force: true, dryRun: true })
    expect(parseArguments(['--help']).help).toBe(true)
    expect(() => parseArguments(['--season'])).toThrow('requires a value')
    expect(() => parseArguments(['--wat'])).toThrow('Unknown argument')
  })
})
