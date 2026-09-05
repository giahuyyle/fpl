import type { Player, PlayerStats, Position, Squad } from './api/squadApi'

export const positionOrder: Position['code'][] = ['GKP', 'DEF', 'MID', 'FWD']

export const statOptions: Array<{ field: keyof PlayerStats; label: string }> = [
  { field: 'total_points', label: 'Total points' },
  { field: 'form', label: 'Form' },
  { field: 'now_cost', label: 'Price' },
  { field: 'points_per_game', label: 'Points per game' },
  { field: 'selected_by_percent', label: 'Selected by %' },
  { field: 'event_points', label: 'Gameweek points' },
  { field: 'minutes', label: 'Minutes' },
  { field: 'starts', label: 'Starts' },
  { field: 'goals_scored', label: 'Goals scored' },
  { field: 'assists', label: 'Assists' },
  { field: 'clean_sheets', label: 'Clean sheets' },
  { field: 'goals_conceded', label: 'Goals conceded' },
  { field: 'own_goals', label: 'Own goals' },
  { field: 'penalties_saved', label: 'Penalties saved' },
  { field: 'penalties_missed', label: 'Penalties missed' },
  { field: 'yellow_cards', label: 'Yellow cards' },
  { field: 'red_cards', label: 'Red cards' },
  { field: 'saves', label: 'Saves' },
  { field: 'bonus', label: 'Bonus' },
  { field: 'bps', label: 'Bonus points system' },
  { field: 'influence', label: 'Influence' },
  { field: 'creativity', label: 'Creativity' },
  { field: 'threat', label: 'Threat' },
  { field: 'ict_index', label: 'ICT index' },
  { field: 'clearances_blocks_interceptions', label: 'CBI' },
  { field: 'recoveries', label: 'Recoveries' },
  { field: 'tackles', label: 'Tackles' },
  { field: 'defensive_contribution', label: 'Defensive contribution' },
  { field: 'expected_goals', label: 'Expected goals' },
  { field: 'expected_assists', label: 'Expected assists' },
  { field: 'expected_goal_involvements', label: 'Expected goal involvements' },
  { field: 'expected_goals_conceded', label: 'Expected goals conceded' },
  { field: 'transfers_in', label: 'Transfers in' },
  { field: 'transfers_out', label: 'Transfers out' },
  { field: 'transfers_in_event', label: 'GW transfers in' },
  { field: 'transfers_out_event', label: 'GW transfers out' },
  { field: 'chance_of_playing_next_round', label: 'Chance of playing next GW' },
  { field: 'chance_of_playing_this_round', label: 'Chance of playing this GW' },
  { field: 'ep_next', label: 'Expected points next GW' },
  { field: 'ep_this', label: 'Expected points this GW' },
  { field: 'dreamteam_count', label: 'Dream Team appearances' },
  { field: 'value_form', label: 'Value (form)' },
  { field: 'value_season', label: 'Value (season)' },
]

export function price(cost: number) {
  return `£${(cost / 10).toFixed(1)}m`
}

export function remainingDraftBudget(
  picks: Record<number, Player | undefined>,
  squad: Squad | null,
  totalBudget: number,
) {
  const selected = Object.values(picks).filter(
    (player): player is Player => Boolean(player),
  )
  if (!squad?.is_complete) {
    return totalBudget - selected.reduce(
      (total, player) => total + player.stats.now_cost,
      0,
    )
  }

  const selectedIds = new Set(selected.map((player) => player.id))
  const originalIds = new Set(squad.picks.map((pick) => pick.player.id))
  const sales = squad.picks.reduce(
    (total, pick) => total + (selectedIds.has(pick.player.id) ? 0 : pick.selling_price),
    0,
  )
  const purchases = selected.reduce(
    (total, player) => total + (originalIds.has(player.id) ? 0 : player.stats.now_cost),
    0,
  )
  return squad.remaining_budget + sales - purchases
}

export function teamBadge(code: number) {
  return `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`
}

export function playerPhoto(photo: string | null) {
  if (!photo) return null
  const code = photo.replace(/\.jpg$/i, '')
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`
}

export function seasonAssetKey(seasonName: string) {
  return seasonName
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}

export function kitImage(
  seasonName: string,
  teamCode: number,
  positionCode: Position['code'],
) {
  const season = seasonAssetKey(seasonName)
  if (!season) return null
  const goalkeeperSuffix = positionCode === 'GKP' ? '_1' : ''
  return `/kits/${season}/shirt_${teamCode}${goalkeeperSuffix}-220.webp`
}
