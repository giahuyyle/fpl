import { useEffect, useMemo, useRef, useState } from 'react'
import { navigate } from '../../shared/lib/navigation'
import { Brand } from '../../shared/ui/Brand'
import { AuthenticationRequiredError, getCurrentUser } from '../auth/api/session'
import type { User } from '../auth/api/session'
import { loadSquadPageData, saveSquad, searchPlayers, setActiveChip, updateSquadProfile } from './api/squadApi'
import type { Fixture, Gameweek, Player, Position, Season, Squad, SquadPoints, SquadProfilePayload, Team, UserChipState } from './api/squadApi'
import { FixturesPanel } from './components/FixturesPanel'
import { PlayerMarket } from './components/PlayerMarket'
import type { MarketFilters } from './components/PlayerMarket'
import { SquadActionDrawer } from './components/SquadActionDrawer'
import { SquadInfoPanel } from './components/SquadInfoPanel'
import { SquadPitch } from './components/SquadPitch'
import { SquadProfileDialog } from './components/SquadProfileDialog'
import type { SquadMode } from './components/SquadPitch'
import { SquadRouteHeader } from './components/SquadRouteHeader'
import { positionOrder, price, remainingDraftBudget } from './squadConfig'

type PickMap = Record<number, Player | undefined>
type RecoveryMap = Record<number, Player>
type SquadPageProps = {
  routeMode?: SquadMode
}

const initialFilters: MarketFilters = {
  query: '', teamId: '', minPrice: '', maxPrice: '', minForm: '',
  statField: '', statMin: '', statMax: '', sortBy: 'now_cost',
}

function slotCode(slot: number): Position['code'] {
  if (slot <= 2) return 'GKP'
  if (slot <= 7) return 'DEF'
  if (slot <= 12) return 'MID'
  return 'FWD'
}

function chipLabel(chip: UserChipState) {
  if (chip.name === 'bboost') return 'Bench Boost'
  if (chip.name === '3xc') return 'Triple Captain'
  if (chip.name === 'freehit') return 'Free Hit'
  if (chip.name === 'wildcard') return 'Wildcard'
  return chip.name
}

function defaultLineupOrder(picks: PickMap) {
  const target = { GKP: 1, DEF: 4, MID: 4, FWD: 2 }
  const grouped = Object.keys(picks).map(Number).filter((slot) => picks[slot]).sort((a, b) => a - b).reduce<Record<Position['code'], number[]>>((result, slot) => {
    result[slotCode(slot)].push(slot)
    return result
  }, { GKP: [], DEF: [], MID: [], FWD: [] })
  const starters = positionOrder.flatMap((code) => grouped[code].slice(0, target[code]))
  const bench = positionOrder.flatMap((code) => grouped[code].slice(target[code]))
  return [...starters, ...bench]
}

function savedLineup(squad: Squad | null, picks: PickMap) {
  if (!squad?.picks.every((pick) => pick.lineup_position !== null)) return defaultLineupOrder(picks)
  return [...squad.picks].sort((a, b) => (a.lineup_position ?? 99) - (b.lineup_position ?? 99)).map((pick) => pick.slot)
}

function validStartingXI(order: number[], picks: PickMap, positions: Position[]) {
  const starters = order.slice(0, 11).flatMap((slot) => picks[slot] ? [picks[slot]] : [])
  if (starters.length !== 11) return false
  return positions.every((position) => {
    const count = starters.filter((player) => player.position.id === position.id).length
    return count >= position.min_play && count <= position.max_play
  })
}

function readRecovery(seasonId: number): RecoveryMap {
  try {
    const value = JSON.parse(window.localStorage.getItem(`fpl:squad-recovery:${seasonId}`) ?? '{}') as Record<string, Player>
    return Object.fromEntries(Object.entries(value).filter(([slot, player]) => Number(slot) >= 1 && Number(slot) <= 15 && typeof player?.id === 'number'))
  } catch {
    return {}
  }
}

export function SquadPage({ routeMode }: SquadPageProps = {}) {
  const initialRouteMode = useRef(routeMode)
  const [season, setSeason] = useState<Season | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [pointsHistory, setPointsHistory] = useState<SquadPoints[]>([])
  const [selectedGameweekNumber, setSelectedGameweekNumber] = useState<number | undefined>()
  const [chips, setChips] = useState<UserChipState[]>([])
  const [squad, setSquad] = useState<Squad | null>(null)
  const [picks, setPicks] = useState<PickMap>({})
  const [lineupOrder, setLineupOrder] = useState<number[]>([])
  const [captainSlot, setCaptainSlot] = useState<number | null>(null)
  const [viceCaptainSlot, setViceCaptainSlot] = useState<number | null>(null)
  const [internalMode, setInternalMode] = useState<SquadMode>('transfers')
  const [selectedSlot, setSelectedSlot] = useState<number | null>(1)
  const [actionSlot, setActionSlot] = useState<number | null>(null)
  const [substituteFromSlot, setSubstituteFromSlot] = useState<number | null>(null)
  const [recovery, setRecovery] = useState<RecoveryMap>({})
  const [filters, setFilters] = useState(initialFilters)
  const [players, setPlayers] = useState<Player[]>([])
  const [playerTotal, setPlayerTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [chipUpdating, setChipUpdating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([loadSquadPageData(), getCurrentUser()]).then(([data, currentUser]) => {
      if (!active) return
      const loadedPicks = Object.fromEntries(data.squad?.picks.map((pick) => [pick.slot, pick.player]) ?? [])
      setSeason(data.season)
      setUser(currentUser)
      setTeams(data.teams)
      setPositions(data.positions)
      setGameweeks(data.gameweeks)
      const loadedFixtures = Array.isArray(data.fixtures) ? data.fixtures : []
      const loadedPoints = Array.isArray(data.pointsHistory) ? data.pointsHistory : []
      setFixtures(loadedFixtures)
      setPointsHistory(loadedPoints)
      setSelectedGameweekNumber(
        loadedPoints.filter((item) => item.has_snapshot).at(-1)?.gameweek.number
        ?? data.gameweeks.find((item) => !item.finished)?.number
        ?? data.gameweeks.at(-1)?.number,
      )
      setChips(data.chips)
      setSquad(data.squad)
      setProfileOpen(!data.squad)
      setPicks(loadedPicks)
      setLineupOrder(savedLineup(data.squad, loadedPicks))
      setCaptainSlot(data.squad?.picks.find((pick) => pick.is_captain)?.slot ?? null)
      setViceCaptainSlot(data.squad?.picks.find((pick) => pick.is_vice_captain)?.slot ?? null)
      const requestedMode = initialRouteMode.current
      const loadedMode = data.squad?.is_complete ? requestedMode ?? 'view' : 'transfers'
      setInternalMode(loadedMode)
      if (!data.squad?.is_complete && requestedMode && requestedMode !== 'transfers') navigate('/squad/transfers')
      setSelectedSlot(data.squad?.is_complete ? null : Array.from({ length: 15 }, (_, index) => index + 1).find((slot) => !loadedPicks[slot]) ?? null)
      setRecovery(readRecovery(data.season.id))
      const flashMessage = window.sessionStorage.getItem('fpl:squad-flash')
      if (flashMessage) {
        setMessage(flashMessage)
        window.sessionStorage.removeItem('fpl:squad-flash')
      }
    }).catch((error: unknown) => {
      if (!active) return
      if (error instanceof AuthenticationRequiredError) navigate('/login')
      else setMessage(error instanceof Error ? error.message : 'Unable to load your squad.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!season) return
    window.localStorage.setItem(`fpl:squad-recovery:${season.id}`, JSON.stringify(recovery))
  }, [recovery, season])

  const selectedPosition = positions.find((position) => position.code === (selectedSlot ? slotCode(selectedSlot) : undefined))
  const mode = routeMode ?? internalMode
  const selectedIds = useMemo(() => new Set(Object.values(picks).flatMap((player) => player ? [player.id] : [])), [picks])
  const spent = Object.values(picks).reduce((total, player) => total + (player?.stats.now_cost ?? 0), 0)
  const budget = squad?.budget ?? 1000
  const draftBudget = remainingDraftBudget(picks, squad, budget)
  const pickCount = selectedIds.size
  const actionPlayer = actionSlot ? picks[actionSlot] ?? recovery[actionSlot] : undefined
  const actionRemoved = Boolean(actionSlot && !picks[actionSlot] && recovery[actionSlot])
  const selectedGameweekIndex = gameweeks.findIndex((item) => item.number === selectedGameweekNumber)
  const selectedGameweek = selectedGameweekIndex >= 0 ? gameweeks[selectedGameweekIndex] : undefined
  const selectedPoints = pointsHistory.find((item) => item.gameweek.number === selectedGameweekNumber)
  const gameweekPoints = Object.fromEntries(selectedPoints?.picks.map((pick) => [pick.player_id, pick.points]) ?? [])
  const historicalPicks = Object.fromEntries(selectedPoints?.picks.map((pick) => [pick.slot, pick.player]) ?? [])
  const displayedPicks = mode === 'view' && selectedPoints?.has_snapshot ? historicalPicks : picks
  const displayedLineup = mode === 'view' && selectedPoints?.has_snapshot
    ? [...selectedPoints.picks].sort((a, b) => a.lineup_position - b.lineup_position).map((pick) => pick.slot)
    : lineupOrder
  const displayedCaptain = mode === 'view' && selectedPoints?.has_snapshot
    ? selectedPoints.picks.find((pick) => pick.is_captain)?.slot ?? null
    : captainSlot
  const displayedViceCaptain = mode === 'view' && selectedPoints?.has_snapshot
    ? selectedPoints.picks.find((pick) => pick.is_vice_captain)?.slot ?? null
    : viceCaptainSlot
  const savedPlayerIds = new Set(squad?.picks.map((pick) => pick.player.id) ?? [])
  const draftTransfers = squad?.is_complete
    ? [...selectedIds].filter((playerId) => !savedPlayerIds.has(playerId)).length
    : 0
  const freeTransfers = pointsHistory.filter((item) => item.has_snapshot).at(-1)?.next_free_transfers ?? 1
  const transferCost = Math.max(0, draftTransfers - freeTransfers) * 4

  useEffect(() => {
    if (!season || mode !== 'transfers') return
    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      const statFilters = []
      if (filters.minPrice || filters.maxPrice) statFilters.push({ field: 'now_cost', ...(filters.minPrice ? { minimum: Number(filters.minPrice) * 10 } : {}), ...(filters.maxPrice ? { maximum: Number(filters.maxPrice) * 10 } : {}) })
      if (filters.minForm) statFilters.push({ field: 'form', minimum: Number(filters.minForm) })
      if (filters.statField && (filters.statMin || filters.statMax)) statFilters.push({ field: filters.statField, ...(filters.statMin ? { minimum: Number(filters.statMin) } : {}), ...(filters.statMax ? { maximum: Number(filters.statMax) } : {}) })
      searchPlayers({
        season_id: season.id,
        ...(filters.query.trim() ? { query: filters.query.trim() } : {}),
        ...(filters.teamId ? { team_ids: [Number(filters.teamId)] } : {}),
        ...(selectedPosition ? { position_ids: [selectedPosition.id] } : {}),
        filters: statFilters,
        sort_by: filters.sortBy,
        sort_direction: filters.sortBy === 'web_name' ? 'asc' : 'desc',
        limit: 100,
      }).then((result) => {
        if (!active) return
        setPlayers(result.items)
        setPlayerTotal(result.total)
      }).catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Unable to search players.')
      }).finally(() => { if (active) setSearching(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [filters, mode, season, selectedPosition])

  function persistRecovery(next: RecoveryMap) {
    setRecovery(next)
  }

  function placePlayer(slot: number, player: Player) {
    setMessage('')
    if (player.position.code !== slotCode(slot)) {
      setMessage(`That slot requires a ${slotCode(slot)}.`)
      return false
    }
    const clubCount = Object.entries(picks).filter(([pickSlot, pick]) => Number(pickSlot) !== slot && pick?.team.id === player.team.id).length
    if (clubCount >= 3) {
      setMessage('You can select no more than three players from one club.')
      return false
    }
    const nextPicks = { ...picks, [slot]: player }
    setPicks(nextPicks)
    const nextBudget = remainingDraftBudget(nextPicks, squad, budget)
    if (nextBudget < 0) {
      setMessage(
        `Over budget by ${price(Math.abs(nextBudget))}. Adjust your squad before saving.`,
      )
    }
    if (recovery[slot]?.id === player.id) {
      const nextRecovery = { ...recovery }
      delete nextRecovery[slot]
      persistRecovery(nextRecovery)
    }
    const nextEmpty = Array.from({ length: 15 }, (_, index) => index + 1).find((candidate) => !nextPicks[candidate]) ?? null
    setSelectedSlot(nextEmpty)
    if (!nextEmpty && lineupOrder.length !== 15) setLineupOrder(defaultLineupOrder(nextPicks))
    return true
  }

  function addPlayer(player: Player) {
    if (selectedSlot) placePlayer(selectedSlot, player)
  }

  function scrollToMarket() {
    window.requestAnimationFrame(() => document.getElementById('player-market')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
  }

  function selectReplacement(slot: number) {
    const currentPlayer = picks[slot]
    if (currentPlayer) {
      if (!recovery[slot]) persistRecovery({ ...recovery, [slot]: currentPlayer })
      setPicks({ ...picks, [slot]: undefined })
      setMessage(`${currentPlayer.web_name} is ready to be replaced.`)
    }
    setSelectedSlot(slot)
    setActionSlot(null)
    scrollToMarket()
  }

  function removeTransferPlayer(slot: number) {
    const player = picks[slot]
    if (!player) return
    if (!recovery[slot]) persistRecovery({ ...recovery, [slot]: player })
    setPicks({ ...picks, [slot]: undefined })
    setSelectedSlot(slot)
    setMessage(`${player.web_name} was removed. Restore them or choose a replacement.`)
  }

  function restoreOriginal(slot: number) {
    const player = recovery[slot]
    if (!player || !placePlayer(slot, player)) return
    const nextRecovery = { ...recovery }
    delete nextRecovery[slot]
    persistRecovery(nextRecovery)
    setActionSlot(null)
    setMessage(`${player.web_name} was restored.`)
  }

  function handleEmptySlot(slot: number) {
    if (recovery[slot]) setActionSlot(slot)
    else selectReplacement(slot)
  }

  function handlePlayerClick(slot: number) {
    if (mode === 'transfers') {
      setActionSlot(slot)
      return
    }
    if (mode !== 'pick-team') return
    if (substituteFromSlot === null) {
      setActionSlot(slot)
      return
    }
    if (slot === substituteFromSlot) {
      setSubstituteFromSlot(null)
      setMessage('Substitution cancelled.')
      return
    }
    const fromIndex = lineupOrder.indexOf(substituteFromSlot)
    const toIndex = lineupOrder.indexOf(slot)
    if ((fromIndex < 11) === (toIndex < 11)) {
      setMessage('Choose a player from the other side of the starting XI and bench.')
      return
    }
    const nextOrder = [...lineupOrder]
    ;[nextOrder[fromIndex], nextOrder[toIndex]] = [nextOrder[toIndex], nextOrder[fromIndex]]
    if (!validStartingXI(nextOrder, picks, positions)) {
      setMessage('That substitution would create an invalid formation.')
      return
    }
    const benchedSlot = nextOrder.slice(11).includes(substituteFromSlot) ? substituteFromSlot : slot
    if (captainSlot === benchedSlot) setCaptainSlot(null)
    if (viceCaptainSlot === benchedSlot) setViceCaptainSlot(null)
    setLineupOrder(nextOrder)
    setSubstituteFromSlot(null)
    setMessage('Substitution staged. Save your team to confirm it.')
  }

  function beginSubstitution(slot: number) {
    setSubstituteFromSlot(slot)
    setActionSlot(null)
    setMessage(`Select another player to substitute with ${picks[slot]?.web_name}.`)
  }

  function chooseCaptain(slot: number) {
    setCaptainSlot((current) => current === slot ? null : slot)
    if (viceCaptainSlot === slot) setViceCaptainSlot(null)
  }

  function chooseViceCaptain(slot: number) {
    setViceCaptainSlot((current) => current === slot ? null : slot)
    if (captainSlot === slot) setCaptainSlot(null)
  }

  function enterMode(nextMode: SquadMode) {
    setInternalMode(nextMode)
    setActionSlot(null)
    setSubstituteFromSlot(null)
    setSelectedSlot(null)
    setMessage('')
    navigate(nextMode === 'pick-team' ? '/squad/pick' : nextMode === 'transfers' ? '/squad/transfers' : '/squad')
  }

  async function submitSquad() {
    if (!season) return
    setSaving(true)
    setMessage('')
    try {
      const order = lineupOrder.length === 15 ? lineupOrder : defaultLineupOrder(picks)
      const positionsBySlot = Object.fromEntries(order.map((slot, index) => [slot, index + 1]))
      const saved = await saveSquad(season.id, Object.entries(picks).flatMap(([slotText, player]) => {
        if (!player) return []
        const slot = Number(slotText)
        return [{ slot, player_id: player.id, ...(pickCount === 15 ? { lineup_position: positionsBySlot[slot], is_captain: slot === captainSlot, is_vice_captain: slot === viceCaptainSlot } : {}) }]
      }))
      const savedPicks = Object.fromEntries(saved.picks.map((pick) => [pick.slot, pick.player]))
      setSquad(saved)
      setPicks(savedPicks)
      setLineupOrder(savedLineup(saved, savedPicks))
      setCaptainSlot(saved.picks.find((pick) => pick.is_captain)?.slot ?? null)
      setViceCaptainSlot(saved.picks.find((pick) => pick.is_vice_captain)?.slot ?? null)
      setRecovery({})
      window.localStorage.removeItem(`fpl:squad-recovery:${season.id}`)
      setMessage(saved.is_complete ? 'Squad changes saved.' : 'Draft squad saved.')
      if (saved.is_complete) {
        setInternalMode('view')
        setActionSlot(null)
        setSubstituteFromSlot(null)
        setSelectedSlot(null)
        if (routeMode) window.sessionStorage.setItem('fpl:squad-flash', 'Squad changes saved.')
        navigate('/squad')
      }
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) navigate('/login')
      else setMessage(error instanceof Error ? error.message : 'Unable to save your squad.')
    } finally {
      setSaving(false)
    }
  }

  async function submitProfile(profile: SquadProfilePayload) {
    if (!season) return
    setProfileSaving(true)
    setMessage('')
    try {
      const saved = await updateSquadProfile(season.id, profile)
      setSquad(saved)
      setProfileOpen(false)
      setMessage(squad ? 'Squad details saved.' : 'Squad created.')
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) navigate('/login')
      else setMessage(error instanceof Error ? error.message : 'Unable to save squad details.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function changeChip(chip: UserChipState) {
    if (!season) return
    setChipUpdating(true)
    setMessage('')
    try {
      const updated = await setActiveChip(
        season.id,
        chip.status === 'active' ? null : chip.id,
      )
      setChips(updated)
      setMessage(
        chip.status === 'active'
          ? `${chipLabel(chip)} deactivated.`
          : `${chipLabel(chip)} activated.`,
      )
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) navigate('/login')
      else setMessage(error instanceof Error ? error.message : 'Unable to update chip.')
    } finally {
      setChipUpdating(false)
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-paper text-pl-purple"><p role="status">Loading your squad…</p></main>

  const transferNeedsReplacement = mode === 'transfers' && Boolean(squad?.is_complete) && pickCount < 15
  const overBudget = mode === 'transfers' && draftBudget < 0
  const helper = substituteFromSlot ? `Choose a starter or substitute to swap with ${picks[substituteFromSlot]?.web_name}.` : mode === 'pick-team' ? 'Select a player to make them captain, vice captain, or substitute them.' : mode === 'transfers' ? `Select a ${selectedPosition?.name.toLowerCase() ?? 'player'} slot or open a player’s transfer menu.` : 'Your saved starting XI and four substitutes.'
  const successfulMessage = ['activated', 'created', 'deactivated', 'saved', 'restored', 'staged'].some((word) => message.toLowerCase().includes(word))
  const nextGameweek = gameweeks.find((gameweek) => !gameweek.finished) ?? gameweeks.at(-1)
  const deadline = nextGameweek ? new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(new Date(nextGameweek.deadline_time)) : null

  return <main className="min-h-screen bg-[#f4f1f5] pb-16 text-ink">
    <header className="bg-pl-purple text-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 tablet:px-8"><Brand light /><nav className="flex gap-2"><button className="rounded-full border border-white/25 px-4 py-2 text-[10px] font-bold" onClick={() => navigate('/')} type="button">Home</button><button className="rounded-full bg-white px-4 py-2 text-[10px] font-bold text-pl-purple" onClick={() => navigate('/account')} type="button">Account</button></nav></div>
    </header>

    <div className="mx-auto max-w-[1440px] px-3 pt-6 tablet:px-8 tablet:pt-8">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm tablet:flex-row tablet:items-center tablet:justify-between">
        <div><p className="text-xs font-bold text-pl-purple">{helper}</p><p className="mt-1 text-[10px] text-muted">2 GKP · 5 DEF · 5 MID · 3 FWD · Maximum 3 per club</p></div>
        <div className="flex flex-wrap gap-2">
          {squad?.is_complete && mode === 'view' && <><button className="rounded-full border border-pl-purple px-5 py-2.5 text-xs font-bold text-pl-purple" onClick={() => enterMode('pick-team')} type="button">Pick team</button><button className="rounded-full border border-pl-purple px-5 py-2.5 text-xs font-bold text-pl-purple" onClick={() => enterMode('transfers')} type="button">Transfers</button></>}
          {mode !== 'view' && squad?.is_complete && <button className="rounded-full border border-pl-purple px-5 py-2.5 text-xs font-bold text-pl-purple" onClick={() => enterMode('view')} type="button">View squad</button>}
          {mode !== 'view' && <button className="rounded-full bg-pl-pink px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_24px_#e9005240] disabled:opacity-55" disabled={saving || transferNeedsReplacement || overBudget} onClick={submitSquad} type="button">{saving ? 'Saving…' : transferNeedsReplacement ? 'Select a replacement' : overBudget ? `Over budget by ${price(Math.abs(draftBudget))}` : mode === 'pick-team' ? 'Save team' : pickCount === 15 ? squad?.is_complete ? 'Make transfers' : 'Save squad' : `Save draft · ${pickCount}/15`}</button>}
        </div>
      </div>
      {message && <p className={`mb-5 rounded-xl px-4 py-3 text-xs font-bold ${successfulMessage ? 'bg-[#ddf8e7] text-[#05633d]' : 'bg-[#fff1f5] text-[#8b0030]'}`} role="status">{message}</p>}

      <div className="grid items-start gap-6 wide:grid-cols-[minmax(390px,5fr)_minmax(0,7fr)] wide:items-stretch">
        <div aria-label="Squad selection and fixtures" className="wide:order-2" role="group">
          <SquadRouteHeader budget={draftBudget} canGoNextGameweek={selectedGameweekIndex >= 0 && selectedGameweekIndex < gameweeks.length - 1} canGoPreviousGameweek={selectedGameweekIndex > 0} chipUpdating={chipUpdating} chips={chips} deadline={deadline} freeTransfers={freeTransfers} gameweekName={selectedGameweek?.name} mode={mode} onChipChange={changeChip} onNextGameweek={() => setSelectedGameweekNumber(gameweeks[selectedGameweekIndex + 1]?.number)} onPreviousGameweek={() => setSelectedGameweekNumber(gameweeks[selectedGameweekIndex - 1]?.number)} pickCount={pickCount} points={selectedPoints} squadName={squad?.name} squadValue={spent} transferCost={transferCost} />
          <SquadPitch captainSlot={displayedCaptain} gameweekPoints={gameweekPoints} lineupOrder={displayedLineup} mode={mode} onEmptySlot={handleEmptySlot} onPlayerClick={handlePlayerClick} picks={displayedPicks} positions={positions} seasonName={season?.name ?? ''} selectedSlot={selectedSlot} substituteFromSlot={substituteFromSlot} viceCaptainSlot={displayedViceCaptain} />
          <FixturesPanel fixtures={fixtures} gameweeks={gameweeks} onGameweekChange={setSelectedGameweekNumber} selectedGameweekNumber={selectedGameweekNumber} />
        </div>
        <div className="wide:relative wide:order-1 wide:min-h-0">
          {mode === 'transfers'
            ? <PlayerMarket filters={filters} loading={searching} onAdd={addPlayer} onFilters={setFilters} players={players} selectedIds={selectedIds} selectedPosition={selectedPosition} teams={teams} total={playerTotal} />
            : <SquadInfoPanel badgeStyle={squad?.badge_style ?? 'classic-purple'} bank={Math.max(0, squad?.remaining_budget ?? draftBudget)} favoriteTeams={squad?.favorite_teams ?? []} onEdit={() => setProfileOpen(true)} points={selectedPoints} squadName={squad?.name ?? 'Squad'} squadValue={spent} username={user?.username ?? ''} />}
        </div>
      </div>
    </div>

    {mode !== 'view' && actionSlot && actionPlayer && <SquadActionDrawer isCaptain={captainSlot === actionSlot} isStarter={lineupOrder.indexOf(actionSlot) < 11} isViceCaptain={viceCaptainSlot === actionSlot} mode={mode} onCaptain={() => chooseCaptain(actionSlot)} onClose={() => setActionSlot(null)} onRemove={() => removeTransferPlayer(actionSlot)} onRestore={() => restoreOriginal(actionSlot)} onSelectReplacement={() => selectReplacement(actionSlot)} onSubstitute={() => beginSubstitution(actionSlot)} onViceCaptain={() => chooseViceCaptain(actionSlot)} player={actionPlayer} removed={actionRemoved} />}
    {profileOpen && <SquadProfileDialog onClose={() => setProfileOpen(false)} onSave={submitProfile} open saving={profileSaving} squad={squad} teams={teams} />}
  </main>
}
