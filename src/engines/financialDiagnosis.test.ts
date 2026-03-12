import { describe, it, expect } from 'vitest'
import { runFinancialDiagnosis } from './financialDiagnosis'
import type { Income, Expense, Debt, Goal } from '../store/types'

function makeIncome(amount: number): Income {
  return { id: '1', name: 'Salario', amount, frequency: 'monthly', payDays: [15], isNet: true }
}

function makeExpense(amount: number, opts: Partial<Expense> = {}): Expense {
  return {
    id: opts.id ?? '1',
    name: opts.name ?? 'Gasto',
    amount,
    category: opts.category ?? 'food',
    isFixed: opts.isFixed ?? false,
    isEssential: opts.isEssential ?? true,
    paymentMethod: 'debit',
    ...opts,
  }
}

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

describe('runFinancialDiagnosis', () => {
  describe('health score calculation', () => {
    it('should return excellent score for ideal financial situation', () => {
      const incomes = [makeIncome(5000000)]
      const expenses = [makeExpense(2000000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 6000000)
      expect(result.healthScore).toBeGreaterThanOrEqual(80)
      expect(result.level).toBe('excellent')
    })

    it('should return critical score for terrible financial situation', () => {
      const incomes = [makeIncome(2000000)]
      const expenses = [makeExpense(1800000)]
      const debts = [makeDebt(10000000, 0.025, 300000, { creditLimit: 5000000 })]
      const result = runFinancialDiagnosis(incomes, expenses, debts, [], 0)
      expect(result.healthScore).toBeLessThan(30)
      expect(result.level).toBe('critical')
    })

    it('should return moderate score for average situation', () => {
      const incomes = [makeIncome(3000000)]
      const expenses = [makeExpense(2200000)]
      const debts = [makeDebt(5000000, 0.012, 300000)]
      const result = runFinancialDiagnosis(incomes, expenses, debts, [], 200000)
      expect(result.healthScore).toBeGreaterThanOrEqual(30)
      expect(result.healthScore).toBeLessThan(80)
    })

    it('should clamp score between 0 and 100', () => {
      const incomes = [makeIncome(10000000)]
      const expenses = [makeExpense(1000000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 60000000)
      expect(result.healthScore).toBeLessThanOrEqual(100)
      expect(result.healthScore).toBeGreaterThanOrEqual(0)
    })

    it('should handle zero income gracefully', () => {
      const result = runFinancialDiagnosis([], [], [], [], 0)
      expect(result.healthScore).toBeDefined()
      expect(result.level).toBeDefined()
    })
  })

  describe('level classification', () => {
    it('should classify levels correctly based on score thresholds', () => {
      // No debts, no expenses, big fund = excellent
      const r1 = runFinancialDiagnosis([makeIncome(5000000)], [makeExpense(1500000)], [], [], 10000000)
      expect(['excellent', 'healthy']).toContain(r1.level)

      // Overloaded = critical or warning
      const r2 = runFinancialDiagnosis(
        [makeIncome(2000000)],
        [makeExpense(1900000)],
        [makeDebt(20000000, 0.03, 500000, { creditLimit: 10000000 })],
        [],
        0
      )
      expect(['critical', 'warning']).toContain(r2.level)
    })
  })

  describe('alerts generation', () => {
    it('should generate danger alert for expense ratio > 85%', () => {
      const incomes = [makeIncome(2000000)]
      const expenses = [makeExpense(1800000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 0)
      const dangerAlert = result.alerts.find(a => a.type === 'danger' && a.title.includes('Ratio'))
      expect(dangerAlert).toBeDefined()
    })

    it('should generate warning alert for expense ratio 75-85%', () => {
      const incomes = [makeIncome(2000000)]
      const expenses = [makeExpense(1600000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 5000000)
      const warningAlert = result.alerts.find(a => a.type === 'warning' && a.title.includes('Gastos'))
      expect(warningAlert).toBeDefined()
    })

    it('should generate danger alert for no emergency fund', () => {
      const incomes = [makeIncome(3000000)]
      const expenses = [makeExpense(1500000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 0)
      const fundAlert = result.alerts.find(a => a.title.includes('fondo de emergencia'))
      expect(fundAlert).toBeDefined()
      expect(fundAlert!.type).toBe('danger')
    })

    it('should generate warning for insufficient emergency fund', () => {
      const incomes = [makeIncome(3000000)]
      const expenses = [makeExpense(1500000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 2000000)
      const fundAlert = result.alerts.find(a => a.title.includes('Fondo de emergencia insuficiente'))
      expect(fundAlert).toBeDefined()
    })

    it('should generate alert for high credit utilization', () => {
      const debts = [makeDebt(4500000, 0.02, 200000, { type: 'credit_card', creditLimit: 5000000 })]
      const incomes = [makeIncome(5000000)]
      const result = runFinancialDiagnosis(incomes, [makeExpense(2000000)], debts, [], 3000000)
      const creditAlert = result.alerts.find(a => a.title.includes('Utilización'))
      expect(creditAlert).toBeDefined()
    })

    it('should generate alert for high interest debts', () => {
      const debts = [makeDebt(5000000, 0.025, 300000)]
      const incomes = [makeIncome(4000000)]
      const result = runFinancialDiagnosis(incomes, [makeExpense(1500000)], debts, [], 1000000)
      const debtAlert = result.alerts.find(a => a.title.includes('alto costo'))
      expect(debtAlert).toBeDefined()
    })

    it('should generate danger alert for negative free flow', () => {
      const incomes = [makeIncome(2000000)]
      const expenses = [makeExpense(1500000)]
      const debts = [makeDebt(5000000, 0.02, 800000)]
      const result = runFinancialDiagnosis(incomes, expenses, debts, [], 0)
      const flowAlert = result.alerts.find(a => a.title.includes('Flujo negativo'))
      expect(flowAlert).toBeDefined()
    })

    it('should generate success alert for great savings rate with no debts', () => {
      const incomes = [makeIncome(5000000)]
      const expenses = [makeExpense(2000000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 10000000)
      const successAlert = result.alerts.find(a => a.type === 'success')
      expect(successAlert).toBeDefined()
    })
  })

  describe('strengths and weaknesses', () => {
    it('should identify strengths for healthy finances', () => {
      const incomes = [makeIncome(5000000)]
      const expenses = [makeExpense(1500000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 6000000)
      expect(result.strengths.length).toBeGreaterThan(0)
    })

    it('should identify weaknesses for unhealthy finances', () => {
      const incomes = [makeIncome(2000000)]
      const expenses = [makeExpense(1800000)]
      const debts = [makeDebt(5000000, 0.02, 300000, { type: 'credit_card', creditLimit: 5000000 })]
      const result = runFinancialDiagnosis(incomes, expenses, debts, [], 0)
      expect(result.weaknesses.length).toBeGreaterThan(0)
    })

    it('should list no debts as a strength', () => {
      const incomes = [makeIncome(3000000)]
      const expenses = [makeExpense(1500000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 5000000)
      expect(result.strengths.some(s => s.includes('deudas'))).toBe(true)
    })
  })

  describe('recommendations', () => {
    it('should recommend paying high interest debts first', () => {
      const debts = [makeDebt(5000000, 0.025, 300000, { name: 'TC Visa' })]
      const incomes = [makeIncome(4000000)]
      const result = runFinancialDiagnosis(incomes, [makeExpense(2000000)], debts, [], 1000000)
      const debtRec = result.recommendations.find(r => r.title.includes('TC Visa'))
      expect(debtRec).toBeDefined()
      expect(debtRec!.priority).toBe('high')
    })

    it('should recommend building emergency fund', () => {
      const incomes = [makeIncome(4000000)]
      const expenses = [makeExpense(2000000)]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 1000000)
      const fundRec = result.recommendations.find(r => r.title.includes('fondo de emergencia'))
      expect(fundRec).toBeDefined()
    })

    it('should recommend reviewing non-essential fixed expenses', () => {
      const incomes = [makeIncome(3000000)]
      const expenses = [
        makeExpense(1000000, { id: '1', isEssential: true, isFixed: true }),
        makeExpense(500000, { id: '2', name: 'Gimnasio', isEssential: false, isFixed: true }),
      ]
      const result = runFinancialDiagnosis(incomes, expenses, [], [], 5000000)
      const nonEssRec = result.recommendations.find(r => r.title.includes('no esenciales'))
      expect(nonEssRec).toBeDefined()
    })
  })
})
