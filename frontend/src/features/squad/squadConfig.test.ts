import { describe, expect, it } from 'vitest'
import type { Player, Squad } from './api/squadApi'
import { kitImage, playerPhoto, remainingDraftBudget, seasonAssetKey } from './squadConfig'

function player(id: number, nowCost: number) {
  return { id, stats: { now_cost: nowCost } } as Player
}

describe('remainingDraftBudget', () => {
  it('allows an initial squad draft to go over budget', () => {
    expect(remainingDraftBudget({ 1: player(1, 1001) }, null, 1000)).toBe(-1)
  })

  it('uses the selling value and bank for transfers', () => {
    const original = player(1, 54)
    const replacement = player(2, 52)
    const squad = {
      is_complete: true,
      remaining_budget: 0,
      picks: [{ player: original, purchase_price: 50, selling_price: 52 }],
    } as Squad

    expect(remainingDraftBudget({ 1: replacement }, squad, 1000)).toBe(0)
    expect(
      remainingDraftBudget({ 1: player(3, 53) }, squad, 1000),
    ).toBe(-1)
  })
})

describe('local kit assets', () => {
  it('normalizes season names into stable folder names', () => {
    expect(seasonAssetKey(' 2026/27 ')).toBe('2026-27')
    expect(seasonAssetKey('Premier League 2026/27!')).toBe('Premier-League-2026-27')
  })

  it('uses the goalkeeper variant only for goalkeepers', () => {
    expect(kitImage('2026/27', 11, 'GKP')).toBe('/kits/2026-27/shirt_11_1-220.webp')
    expect(kitImage('2026/27', 14, 'MID')).toBe('/kits/2026-27/shirt_14-220.webp')
    expect(kitImage('', 14, 'MID')).toBeNull()
  })
})

describe('playerPhoto', () => {
  it('uses the current versioned Premier League CDN without the legacy prefix', () => {
    expect(playerPhoto('466052.jpg')).toBe(
      'https://resources.premierleague.com/premierleague25/photos/players/110x140/466052.png',
    )
    expect(playerPhoto(null)).toBeNull()
  })
})
