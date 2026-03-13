import { describe, it, expect } from 'vitest'
import { runBudgetOptimizer } from './budgetOptimizer'
import type { Income, Expense, Debt, Phase, ExpenseCategory } from '../store/types'

function makeIncome(amount: number): Income {
  return { id: '1', name: 'Salario', amount, frequency: 'monthly', payDays: [15], isNet: true }
}

function makeExpense(amount: number, category: ExpenseCategory = 'food', opts: Partial<Expense> = {}): Expense {
  return {
    id: opts.id ?? '1', name: opts.name ?? 'Gasto', amount, category,
    isFixed: false, isEssential: true, paymentMethod: 'debit', ...opts,
  }
}

function makeDebt(payment: number): Debt {
  return {
    id: '1', name: 'Deuda', type: 'credit_card',
    currentBalance: 1000000, monthlyPayment: payment,
    interestRate: 0.02, dueDay: 15,
  }
}

describe('runBudgetOptimizer', () => {
  it('should calculate correct totals', () => {
    const incomes = [makeIncome(4000000)]
    const expenses = [makeExpense(1500000), makeExpense(500000, 'transport', { id: '2' })]
    const debts = [makeDebt(300000)]
    const result = runBudgetOptimizer(incomes, expenses, debts, null)

    expect(result.totalIncome).toBe(4000000)
    expect(result.totalExpenses).toBe(2000000)
    expect(result.totalDebtPayments).toBe(300000)
    expect(result.freeFlow).toBe(1700000)
  })

  it('should calculate savings rate correctly', () => {
    const result = runBudgetOptimizer([makeIncome(4000000)], [makeExpense(2000000)], [], null)
    expect(result.savingsRate).toBeCloseTo(0.5, 1)
  })

  it('should return zero savings rate when expenses exceed income', () => {
    const result = runBudgetOptimizer([makeIncome(1000000)], [makeExpense(1500000)], [], null)
    expect(result.savingsRate).toBe(0)
  })

  it('should group expenses by category', () => {
    const expenses = [
      makeExpense(500000, 'food', { id: '1' }),
      makeExpense(300000, 'food', { id: '2', name: 'Restaurante' }),
      makeExpense(800000, 'housing', { id: '3', name: 'Arriendo' }),
    ]
    const result = runBudgetOptimizer([makeIncome(3000000)], expenses, [], null)
    const foodCat = result.categories.find(c => c.category === 'food')
    expect(foodCat).toBeDefined()
    expect(foodCat!.spent).toBe(800000)
  })

  it('should include debt payments in categories', () => {
    const result = runBudgetOptimizer([makeIncome(3000000)], [makeExpense(1000000)], [makeDebt(200000)], null)
    const debtCat = result.categories.find(c => c.category === 'debt')
    expect(debtCat).toBeDefined()
    expect(debtCat!.spent).toBeGreaterThanOrEqual(200000)
  })

  it('should use phase allocations when phase is provided', () => {
    const phase: Phase = {
      id: 'phase-debt-high', number: 1, name: 'Test', description: '',
      startMonth: '', endMonth: '', durationMonths: 6, status: 'active',
      color: '#ef4444', objectives: [],
      monthlyBudget: [
        { category: 'essential', label: 'Esenciales', amount: 1500000, percentage: 0.5, color: '#3b82f6' },
      ],
    }
    const result = runBudgetOptimizer([makeIncome(3000000)], [makeExpense(1500000)], [], phase)
    expect(result.phaseAllocations).toHaveLength(1)
    expect(result.phaseAllocations[0].category).toBe('essential')
  })

  it('should generate default allocations when no phase', () => {
    const result = runBudgetOptimizer([makeIncome(3000000)], [makeExpense(1500000)], [], null)
    expect(result.phaseAllocations.length).toBeGreaterThan(0)
  })

  it('should generate recommendations for high-spending categories', () => {
    const expenses = [
      makeExpense(1000000, 'entertainment', { id: '1', name: 'Entretenimiento' }),
    ]
    const result = runBudgetOptimizer([makeIncome(3000000)], expenses, [], null)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('should add urgent recommendation when free flow is negative', () => {
    const result = runBudgetOptimizer([makeIncome(1000000)], [makeExpense(1500000)], [], null)
    expect(result.recommendations.some(r => r.includes('URGENTE'))).toBe(true)
  })

  it('should handle zero income', () => {
    const result = runBudgetOptimizer([], [makeExpense(500000)], [], null)
    expect(result.totalIncome).toBe(0)
    expect(result.savingsRate).toBe(0)
  })

  it('should sort categories by spent descending', () => {
    const expenses = [
      makeExpense(200000, 'food', { id: '1' }),
      makeExpense(800000, 'housing', { id: '2', name: 'Arriendo' }),
      makeExpense(500000, 'transport', { id: '3', name: 'Transporte' }),
    ]
    const result = runBudgetOptimizer([makeIncome(3000000)], expenses, [], null)
    for (let i = 1; i < result.categories.length; i++) {
      expect(result.categories[i - 1].spent).toBeGreaterThanOrEqual(result.categories[i].spent)
    }
  })
})
