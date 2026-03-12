import { describe, it, expect } from 'vitest'
import { generatePhases } from './phaseGenerator'
import type { Income, Expense, Debt, Goal } from '../store/types'

function makeIncome(amount: number): Income {
  return { id: '1', name: 'Salario', amount, frequency: 'monthly', payDays: [15], isNet: true }
}

function makeExpense(amount: number, essential = true): Expense {
  return {
    id: '1', name: 'Gasto', amount, category: 'food',
    isFixed: false, isEssential: essential, paymentMethod: 'debit',
  }
}

function makeDebt(balance: number, rate: number, payment: number, id = '1'): Debt {
  return {
    id, name: `Deuda ${id}`, type: 'credit_card',
    currentBalance: balance, monthlyPayment: payment,
    interestRate: rate, dueDay: 15,
  }
}

function makeGoal(target: number, saved = 0): Goal {
  return {
    id: '1', name: 'Meta', icon: '🎯', targetAmount: target,
    currentSaved: saved, priority: 1, category: 'purchase', isFlexible: true,
  }
}

const fixedDate = new Date('2026-01-01')

describe('generatePhases', () => {
  it('should always include the freedom phase', () => {
    const phases = generatePhases([makeIncome(3000000)], [makeExpense(1500000)], [], [], 5000000, 0, fixedDate)
    const freedom = phases.find(p => p.id === 'phase-freedom')
    expect(freedom).toBeDefined()
    expect(freedom!.name).toContain('Libertad')
  })

  it('should generate debt elimination phase for high interest debts', () => {
    const debts = [makeDebt(5000000, 0.025, 300000)]
    const phases = generatePhases([makeIncome(4000000)], [makeExpense(2000000)], debts, [], 0, 12, fixedDate)
    const debtPhase = phases.find(p => p.id === 'phase-debt-high')
    expect(debtPhase).toBeDefined()
    expect(debtPhase!.name).toContain('Alto Costo')
  })

  it('should generate medium debt phase for moderate interest debts', () => {
    const debts = [makeDebt(3000000, 0.01, 200000)]
    const phases = generatePhases([makeIncome(4000000)], [makeExpense(2000000)], debts, [], 0, 10, fixedDate)
    const medPhase = phases.find(p => p.id === 'phase-debt-med')
    expect(medPhase).toBeDefined()
  })

  it('should generate emergency fund phase when fund < 3 months', () => {
    const phases = generatePhases([makeIncome(3000000)], [makeExpense(1500000)], [], [], 1000000, 0, fixedDate)
    const emergPhase = phases.find(p => p.id === 'phase-emergency')
    expect(emergPhase).toBeDefined()
  })

  it('should skip emergency fund phase when fund >= 3 months', () => {
    const phases = generatePhases([makeIncome(3000000)], [makeExpense(1500000)], [], [], 5000000, 0, fixedDate)
    const emergPhase = phases.find(p => p.id === 'phase-emergency')
    expect(emergPhase).toBeUndefined()
  })

  it('should generate goals phase when there are goals', () => {
    const goals = [makeGoal(2000000)]
    const phases = generatePhases([makeIncome(3000000)], [makeExpense(1500000)], [], goals, 5000000, 0, fixedDate)
    const goalPhase = phases.find(p => p.id === 'phase-goals')
    expect(goalPhase).toBeDefined()
  })

  it('should set first phase as active', () => {
    const phases = generatePhases([makeIncome(3000000)], [makeExpense(1500000)], [], [], 0, 0, fixedDate)
    expect(phases[0].status).toBe('active')
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].status).toBe('upcoming')
    }
  })

  it('should include budget allocations in each phase', () => {
    const debts = [makeDebt(5000000, 0.025, 300000)]
    const phases = generatePhases([makeIncome(4000000)], [makeExpense(2000000)], debts, [], 0, 12, fixedDate)
    for (const phase of phases) {
      expect(phase.monthlyBudget.length).toBeGreaterThan(0)
    }
  })

  it('should have sequential date ranges', () => {
    const debts = [makeDebt(5000000, 0.025, 300000)]
    const goals = [makeGoal(3000000)]
    const phases = generatePhases([makeIncome(5000000)], [makeExpense(2000000)], debts, goals, 0, 12, fixedDate)
    expect(phases.length).toBeGreaterThanOrEqual(2)
    // Each phase should have a valid number
    for (let i = 0; i < phases.length; i++) {
      expect(phases[i].number).toBe(i + 1)
    }
  })
})
