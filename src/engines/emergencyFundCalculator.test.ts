import { describe, it, expect } from 'vitest'
import { runEmergencyFundCalculator } from './emergencyFundCalculator'
import type { Expense } from '../store/types'

function makeExpense(amount: number, essential = true): Expense {
  return {
    id: '1', name: 'Gasto', amount, category: 'food',
    isFixed: false, isEssential: essential, paymentMethod: 'debit',
  }
}

const fixedDate = new Date('2026-01-01')

describe('runEmergencyFundCalculator', () => {
  describe('level classification', () => {
    it('should return none when fund is 0', () => {
      const expenses = [makeExpense(1500000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 0, fixedDate)
      expect(result.level).toBe('none')
    })

    it('should return partial when fund < 1 month', () => {
      const expenses = [makeExpense(1500000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 500000, fixedDate)
      expect(result.level).toBe('partial')
    })

    it('should return 1month when fund covers 1-3 months', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 1500000, fixedDate)
      expect(result.level).toBe('1month')
    })

    it('should return 3months when fund covers 3-6 months', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 4000000, fixedDate)
      expect(result.level).toBe('3months')
    })

    it('should return 6months when fund covers 6+ months', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 7000000, fixedDate)
      expect(result.level).toBe('6months')
    })
  })

  describe('targets calculation', () => {
    it('should calculate 3-month and 6-month targets from essential expenses', () => {
      const expenses = [
        makeExpense(1000000, true),
        makeExpense(500000, false), // non-essential, excluded
      ]
      const result = runEmergencyFundCalculator(expenses, 200000, 0, fixedDate)
      expect(result.essentialExpenses).toBe(1000000)
      expect(result.target3months).toBe(3000000)
      expect(result.target6months).toBe(6000000)
    })

    it('should calculate months covered correctly', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 2500000, fixedDate)
      expect(result.currentMonthsCovered).toBeCloseTo(2.5, 1)
    })
  })

  describe('months to target', () => {
    it('should calculate months to reach 3-month target', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 500000, 0, fixedDate)
      expect(result.monthsTo3).toBe(6) // 3000000 / 500000
    })

    it('should calculate months to reach 6-month target', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 500000, 0, fixedDate)
      expect(result.monthsTo6).toBe(12) // 6000000 / 500000
    })

    it('should return 0 months when already at target', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 7000000, fixedDate)
      expect(result.monthsTo3).toBe(0)
      expect(result.monthsTo6).toBe(0)
    })

    it('should return 999 when saving is 0 and below target', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 0, 500000, fixedDate)
      expect(result.monthsTo3).toBe(999)
      expect(result.monthsTo6).toBe(999)
    })
  })

  describe('projection', () => {
    it('should generate 25 rows (month 0-24)', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 0, fixedDate)
      expect(result.projection).toHaveLength(25)
    })

    it('should start projection with current fund', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 500000, fixedDate)
      expect(result.projection[0].balance).toBe(500000)
      expect(result.projection[0].month).toBe(0)
    })

    it('should increase balance over time with savings', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 300000, 0, fixedDate)
      expect(result.projection[1].balance).toBeGreaterThan(result.projection[0].balance)
    })

    it('should cap balance at 6-month target', () => {
      const expenses = [makeExpense(500000)]
      const result = runEmergencyFundCalculator(expenses, 1000000, 0, fixedDate)
      const target6 = 3000000
      const lastRow = result.projection[result.projection.length - 1]
      expect(lastRow.balance).toBeLessThanOrEqual(target6)
    })

    it('should include valid dates', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, 200000, 0, fixedDate)
      for (const row of result.projection) {
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle zero essential expenses', () => {
      const expenses = [makeExpense(500000, false)]
      const result = runEmergencyFundCalculator(expenses, 200000, 0, fixedDate)
      expect(result.essentialExpenses).toBe(0)
      expect(result.target3months).toBe(0)
      expect(result.currentMonthsCovered).toBe(0)
    })

    it('should handle negative saving as zero', () => {
      const expenses = [makeExpense(1000000)]
      const result = runEmergencyFundCalculator(expenses, -50000, 0, fixedDate)
      expect(result.monthlySaving).toBe(0)
    })

    it('should handle empty expenses', () => {
      const result = runEmergencyFundCalculator([], 200000, 500000, fixedDate)
      expect(result.essentialExpenses).toBe(0)
      expect(result.level).toBe('none')
    })
  })
})
