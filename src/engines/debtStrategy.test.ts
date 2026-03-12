import { describe, it, expect } from 'vitest'
import { runDebtStrategy } from './debtStrategy'
import type { Debt } from '../store/types'

function makeDebt(balance: number, rate: number, payment: number, opts: Partial<Debt> = {}): Debt {
  return {
    id: opts.id ?? '1',
    name: opts.name ?? 'Deuda',
    type: opts.type ?? 'credit_card',
    currentBalance: balance,
    monthlyPayment: payment,
    interestRate: rate,
    dueDay: 15,
    ...opts,
  }
}

describe('runDebtStrategy', () => {
  const fixedDate = new Date('2026-01-01')

  describe('empty debts', () => {
    it('should return empty plan when no debts', () => {
      const result = runDebtStrategy([], 500000, 'avalanche', fixedDate)
      expect(result.debts).toHaveLength(0)
      expect(result.totalDebt).toBe(0)
      expect(result.monthsToDebtFree).toBe(0)
      expect(result.interestSaved).toBe(0)
    })
  })

  describe('single debt', () => {
    it('should calculate payoff for a single debt', () => {
      const debts = [makeDebt(1000000, 0.02, 100000)]
      const result = runDebtStrategy(debts, 50000, 'avalanche', fixedDate)
      expect(result.debts).toHaveLength(1)
      expect(result.totalDebt).toBe(1000000)
      expect(result.monthsToDebtFree).toBeGreaterThan(0)
      expect(result.debts[0].amortization.length).toBeGreaterThan(0)
    })

    it('should pay off faster with extra flow', () => {
      const debts = [makeDebt(1000000, 0.02, 100000)]
      const withoutExtra = runDebtStrategy(debts, 0, 'avalanche', fixedDate)
      const withExtra = runDebtStrategy(debts, 200000, 'avalanche', fixedDate)
      expect(withExtra.monthsToDebtFree).toBeLessThan(withoutExtra.monthsToDebtFree)
    })

    it('should save interest with extra payments', () => {
      const debts = [makeDebt(2000000, 0.02, 150000)]
      const result = runDebtStrategy(debts, 100000, 'avalanche', fixedDate)
      expect(result.interestSaved).toBeGreaterThan(0)
      expect(result.totalInterestWithPlan).toBeLessThan(result.totalInterestMinimumOnly)
    })
  })

  describe('multiple debts', () => {
    const debts = [
      makeDebt(3000000, 0.025, 200000, { id: '1', name: 'TC Alta' }),
      makeDebt(1000000, 0.01, 100000, { id: '2', name: 'Préstamo' }),
      makeDebt(500000, 0.015, 80000, { id: '3', name: 'TC Media' }),
    ]

    it('should sort by interest rate (highest first) for avalanche', () => {
      const result = runDebtStrategy(debts, 100000, 'avalanche', fixedDate)
      expect(result.debts[0].name).toBe('TC Alta')
      expect(result.debts[0].interestRate).toBe(0.025)
    })

    it('should sort by balance (lowest first) for snowball', () => {
      const result = runDebtStrategy(debts, 100000, 'snowball', fixedDate)
      expect(result.debts[0].name).toBe('TC Media')
      expect(result.debts[0].currentBalance).toBe(500000)
    })

    it('should cascade payments when a debt is paid off', () => {
      const result = runDebtStrategy(debts, 200000, 'avalanche', fixedDate)
      // All debts should eventually be paid off
      for (const d of result.debts) {
        const lastRow = d.amortization[d.amortization.length - 1]
        expect(lastRow.balance).toBeLessThan(1)
      }
    })

    it('avalanche should save more interest than snowball', () => {
      const avalanche = runDebtStrategy(debts, 100000, 'avalanche', fixedDate)
      const snowball = runDebtStrategy(debts, 100000, 'snowball', fixedDate)
      expect(avalanche.totalInterestWithPlan).toBeLessThanOrEqual(snowball.totalInterestWithPlan)
    })
  })

  describe('edge cases', () => {
    it('should handle zero interest debt', () => {
      const debts = [makeDebt(500000, 0, 50000)]
      const result = runDebtStrategy(debts, 0, 'avalanche', fixedDate)
      expect(result.totalInterestWithPlan).toBe(0)
      expect(result.monthsToDebtFree).toBe(10)
    })

    it('should handle zero free flow', () => {
      const debts = [makeDebt(1000000, 0.02, 100000)]
      const result = runDebtStrategy(debts, 0, 'avalanche', fixedDate)
      expect(result.monthsToDebtFree).toBeGreaterThan(0)
    })

    it('should handle negative free flow as zero extra', () => {
      const debts = [makeDebt(1000000, 0.02, 100000)]
      const result = runDebtStrategy(debts, -50000, 'avalanche', fixedDate)
      expect(result.monthsToDebtFree).toBeGreaterThan(0)
    })

    it('should generate valid amortization rows', () => {
      const debts = [makeDebt(500000, 0.015, 80000)]
      const result = runDebtStrategy(debts, 50000, 'avalanche', fixedDate)
      for (const row of result.debts[0].amortization) {
        expect(row.month).toBeGreaterThan(0)
        expect(row.payment).toBeGreaterThan(0)
        expect(row.balance).toBeGreaterThanOrEqual(0)
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })
})
