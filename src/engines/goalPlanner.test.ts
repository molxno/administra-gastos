import { describe, it, expect } from 'vitest'
import { runGoalPlanner } from './goalPlanner'
import type { Goal } from '../store/types'

function makeGoal(target: number, saved = 0, priority = 1, opts: Partial<Goal> = {}): Goal {
  return {
    id: opts.id ?? '1', name: opts.name ?? 'Meta',
    icon: '🎯', targetAmount: target, currentSaved: saved,
    priority, category: 'purchase', isFlexible: true, ...opts,
  }
}

const fixedDate = new Date('2026-01-01')

describe('runGoalPlanner', () => {
  describe('empty goals', () => {
    it('should return empty plan when no goals', () => {
      const result = runGoalPlanner([], 500000, 0, fixedDate)
      expect(result.goals).toHaveLength(0)
      expect(result.totalMonthlySaving).toBe(0)
    })

    it('should return empty plan when budget is zero', () => {
      const result = runGoalPlanner([makeGoal(1000000)], 0, 0, fixedDate)
      expect(result.goals).toHaveLength(0)
      expect(result.totalMonthlySaving).toBe(0)
    })
  })

  describe('sequential mode', () => {
    it('should calculate months needed for single goal', () => {
      const goals = [makeGoal(1000000, 0)]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].monthsNeeded).toBe(5)
      expect(result.mode).toBe('sequential')
    })

    it('should account for already saved amount', () => {
      const goals = [makeGoal(1000000, 600000)]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].monthsNeeded).toBe(2)
      expect(result.goals[0].remaining).toBe(400000)
    })

    it('should focus budget on first goal only', () => {
      const goals = [
        makeGoal(1000000, 0, 1, { id: '1', name: 'Meta 1' }),
        makeGoal(2000000, 0, 2, { id: '2', name: 'Meta 2' }),
      ]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].monthlySaving).toBe(200000)
      expect(result.goals[1].monthlySaving).toBe(0)
    })

    it('should sort goals by priority', () => {
      const goals = [
        makeGoal(500000, 0, 3, { id: '1', name: 'Baja' }),
        makeGoal(500000, 0, 1, { id: '2', name: 'Alta' }),
      ]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].name).toBe('Alta')
    })

    it('should calculate progress percent', () => {
      const goals = [makeGoal(1000000, 500000)]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].progressPercent).toBe(50)
    })
  })

  describe('parallel mode', () => {
    it('should divide budget among all goals', () => {
      const goals = [
        makeGoal(1000000, 0, 1, { id: '1' }),
        makeGoal(1000000, 0, 2, { id: '2' }),
      ]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'parallel')
      expect(result.goals[0].monthlySaving).toBe(100000)
      expect(result.goals[1].monthlySaving).toBe(100000)
    })

    it('should calculate independent estimated dates', () => {
      const goals = [
        makeGoal(500000, 0, 1, { id: '1' }),
        makeGoal(1000000, 0, 2, { id: '2' }),
      ]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'parallel')
      expect(result.goals[0].monthsNeeded).toBeLessThan(result.goals[1].monthsNeeded)
    })
  })

  describe('with debt free months delay', () => {
    it('should set goals to waiting when debts exist', () => {
      const goals = [makeGoal(1000000)]
      const result = runGoalPlanner(goals, 200000, 6, fixedDate, 'sequential')
      expect(result.goals[0].status).toBe('waiting')
      expect(result.totalMonthlySaving).toBe(0)
    })

    it('should delay start date by debt free months', () => {
      const goals = [makeGoal(1000000)]
      const result = runGoalPlanner(goals, 200000, 6, fixedDate, 'sequential')
      expect(result.startDate).not.toBe(result.goals[0].estimatedDate)
    })
  })

  describe('edge cases', () => {
    it('should handle goal already completed', () => {
      const goals = [makeGoal(1000000, 1000000)]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate, 'sequential')
      expect(result.goals[0].remaining).toBe(0)
      expect(result.goals[0].monthsNeeded).toBe(0)
      expect(result.goals[0].progressPercent).toBe(100)
    })

    it('should filter out emergency fund goals', () => {
      const goals = [
        makeGoal(3000000, 0, 1, { id: '1', category: 'emergency_fund' }),
        makeGoal(1000000, 0, 2, { id: '2', category: 'purchase' }),
      ]
      const result = runGoalPlanner(goals, 200000, 0, fixedDate)
      expect(result.goals).toHaveLength(1)
      expect(result.goals[0].category).toBe('purchase')
    })
  })
})
