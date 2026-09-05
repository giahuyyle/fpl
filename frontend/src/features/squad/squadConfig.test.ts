import { describe, expect, it } from 'vitest'
import type { Player, Squad } from './api/squadApi'
import { remainingDraftBudget } from './squadConfig'

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
