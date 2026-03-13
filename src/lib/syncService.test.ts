import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing syncService
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  loadUserData,
  saveProfile,
  saveIncomes,
  saveExpenses,
  saveDebts,
  saveGoals,
  saveTransactions,
  saveAllUserData,
} from './syncService';

// Helper to create a chainable query builder mock
function createQueryChain(data: unknown = [], error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.order = vi.fn().mockResolvedValue({ data, error });
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ data, error });
  chain.upsert = vi.fn().mockResolvedValue({ data, error });
  // If no .single() or .order() is called, resolve the chain itself
  (chain as { then: unknown }).then = vi.fn((cb: (v: unknown) => unknown) => cb({ data, error }));
  return chain;
}

describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadUserData', () => {
    it('returns default values when profile is not found (PGRST116)', async () => {
      const profileChain = createQueryChain(null, { code: 'PGRST116', message: 'not found' });
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        return emptyChain;
      });

      const result = await loadUserData('user-123');

      expect(result.profile).toEqual({
        name: '',
        country: 'Colombia',
        currency: 'COP',
        locale: 'es-CO',
      });
      expect(result.onboardingCompleted).toBe(false);
      expect(result.darkMode).toBe(true);
      expect(result.debtStrategy).toBe('avalanche');
      expect(result.goalMode).toBe('sequential');
      expect(result.currentFund).toBe(0);
      expect(result.incomes).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.debts).toEqual([]);
      expect(result.goals).toEqual([]);
      expect(result.transactions).toEqual([]);
    });

    it('maps profile data from snake_case to camelCase', async () => {
      const profileData = {
        name: 'Carlos',
        country: 'Colombia',
        currency: 'COP',
        locale: 'es-CO',
        onboarding_completed: true,
        dark_mode: false,
        debt_strategy: 'snowball',
        goal_mode: 'parallel',
        current_fund: 5000000,
      };
      const profileChain = createQueryChain(profileData);
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        return emptyChain;
      });

      const result = await loadUserData('user-123');

      expect(result.profile.name).toBe('Carlos');
      expect(result.onboardingCompleted).toBe(true);
      expect(result.darkMode).toBe(false);
      expect(result.debtStrategy).toBe('snowball');
      expect(result.goalMode).toBe('parallel');
      expect(result.currentFund).toBe(5000000);
    });

    it('maps income rows from snake_case to camelCase', async () => {
      const profileChain = createQueryChain(null);
      const incomesChain = createQueryChain([
        { id: 'inc-1', name: 'Salario', amount: '3000000', frequency: 'monthly', pay_days: [1, 15], is_net: true },
      ]);
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'incomes') return incomesChain;
        return emptyChain;
      });

      const result = await loadUserData('user-123');

      expect(result.incomes).toHaveLength(1);
      expect(result.incomes[0]).toEqual({
        id: 'inc-1',
        name: 'Salario',
        amount: 3000000,
        frequency: 'monthly',
        payDays: [1, 15],
        isNet: true,
      });
    });

    it('maps debt rows with all optional fields', async () => {
      const profileChain = createQueryChain(null, { code: 'PGRST116', message: 'not found' });
      const debtsChain = createQueryChain([
        {
          id: 'debt-1', name: 'Visa', type: 'credit_card',
          current_balance: '5000000', original_amount: '8000000',
          monthly_payment: '200000', interest_rate: '2.5', annual_rate: '30',
          remaining_payments: 24, total_payments: 36, completed_payments: 12,
          due_day: 15, credit_limit: '10000000', minimum_payment: '150000',
          product_name: null, product_value: null,
        },
      ]);
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'debts') return debtsChain;
        return emptyChain;
      });

      const result = await loadUserData('user-123');

      expect(result.debts).toHaveLength(1);
      const debt = result.debts[0];
      expect(debt.currentBalance).toBe(5000000);
      expect(debt.originalAmount).toBe(8000000);
      expect(debt.creditLimit).toBe(10000000);
      expect(debt.productName).toBeUndefined();
      expect(debt.productValue).toBeUndefined();
    });

    it('throws on profile fetch error (non-PGRST116)', async () => {
      const profileChain = createQueryChain(null, { code: '42501', message: 'permission denied' });
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        return emptyChain;
      });

      await expect(loadUserData('user-123')).rejects.toThrow('Failed to load profile: permission denied');
    });

    it('throws on incomes fetch error', async () => {
      const profileChain = createQueryChain(null, { code: 'PGRST116', message: 'not found' });
      const errorChain = createQueryChain(null, { code: '42501', message: 'permission denied' });
      const emptyChain = createQueryChain([]);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'incomes') return errorChain;
        return emptyChain;
      });

      await expect(loadUserData('user-123')).rejects.toThrow('Failed to load incomes: permission denied');
    });
  });

  describe('saveProfile', () => {
    it('upserts profile with snake_case fields', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveProfile('user-123', {
        name: 'Carlos',
        country: 'Colombia',
        currency: 'COP',
        locale: 'es-CO',
      }, {
        onboardingCompleted: true,
        darkMode: true,
        debtStrategy: 'avalanche',
        goalMode: 'sequential',
        currentFund: 1000,
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(chain.upsert).toHaveBeenCalledWith({
        id: 'user-123',
        name: 'Carlos',
        country: 'Colombia',
        currency: 'COP',
        locale: 'es-CO',
        onboarding_completed: true,
        dark_mode: true,
        debt_strategy: 'avalanche',
        goal_mode: 'sequential',
        current_fund: 1000,
      });
    });

    it('throws on upsert error', async () => {
      const chain = createQueryChain(null, { message: 'upsert failed' });
      mockFrom.mockReturnValue(chain);

      await expect(saveProfile('user-123', {
        name: 'Carlos',
        country: 'Colombia',
        currency: 'COP',
        locale: 'es-CO',
      }, {
        onboardingCompleted: true,
        darkMode: true,
        debtStrategy: 'avalanche',
        goalMode: 'sequential',
        currentFund: 1000,
      })).rejects.toThrow('Failed to save profile: upsert failed');
    });
  });

  describe('saveIncomes', () => {
    it('upserts rows then deletes removed ones', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveIncomes('user-123', [
        { id: 'i1', name: 'Salario', amount: 3000000, frequency: 'monthly', payDays: [1], isNet: true },
      ]);

      expect(mockFrom).toHaveBeenCalledWith('incomes');
      // Upsert called with mapped data
      expect(chain.upsert).toHaveBeenCalledWith([
        { id: 'i1', user_id: 'user-123', name: 'Salario', amount: 3000000, frequency: 'monthly', pay_days: [1], is_net: true },
      ]);
      // Delete called for cleanup of removed IDs
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.not).toHaveBeenCalledWith('id', 'in', '(i1)');
    });

    it('deletes all rows when incomes array is empty (no upsert, no not-in filter)', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveIncomes('user-123', []);

      expect(chain.upsert).not.toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      // Should NOT use .not() filter when array is empty to avoid empty in() list
      expect(chain.not).not.toHaveBeenCalled();
    });

    it('throws on upsert error', async () => {
      const chain = createQueryChain(null, { message: 'upsert failed' });
      mockFrom.mockReturnValue(chain);

      await expect(saveIncomes('user-123', [
        { id: 'i1', name: 'Salario', amount: 3000000, frequency: 'monthly', payDays: [1], isNet: true },
      ])).rejects.toThrow('Failed to save incomes: upsert failed');
    });

    it('throws on cleanup delete error', async () => {
      // Upsert succeeds, but the cleanup delete fails
      const upsertChain = createQueryChain(null, null);
      const deleteChain = createQueryChain(null, { message: 'delete failed' });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return upsertChain;
        return deleteChain;
      });

      await expect(saveIncomes('user-123', [
        { id: 'i1', name: 'Salario', amount: 3000000, frequency: 'monthly', payDays: [1], isNet: true },
      ])).rejects.toThrow('Failed to clean up incomes: delete failed');
    });
  });

  describe('saveExpenses', () => {
    it('upserts rows then deletes removed ones', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveExpenses('user-123', [
        { id: 'e1', name: 'Arriendo', amount: 1500000, category: 'housing', isFixed: true, isEssential: true, paymentMethod: 'debit' },
      ]);

      expect(chain.upsert).toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
    });

    it('deletes all rows when expenses array is empty (no not-in filter)', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveExpenses('user-123', []);

      expect(chain.upsert).not.toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.not).not.toHaveBeenCalled();
    });
  });

  describe('saveDebts', () => {
    it('upserts rows then deletes removed ones', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveDebts('user-123', [
        { id: 'd1', name: 'Visa', type: 'credit_card', currentBalance: 5000000, monthlyPayment: 200000, interestRate: 2.5, dueDay: 15 },
      ]);

      expect(chain.upsert).toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
    });

    it('deletes all rows when debts array is empty (no not-in filter)', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveDebts('user-123', []);

      expect(chain.upsert).not.toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.not).not.toHaveBeenCalled();
    });
  });

  describe('saveGoals', () => {
    it('upserts rows then deletes removed ones', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveGoals('user-123', [
        { id: 'g1', name: 'Vacaciones', icon: '', targetAmount: 5000000, currentSaved: 1000000, priority: 1, category: 'travel', isFlexible: true },
      ]);

      expect(chain.upsert).toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
    });

    it('deletes all rows when goals array is empty (no not-in filter)', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveGoals('user-123', []);

      expect(chain.upsert).not.toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.not).not.toHaveBeenCalled();
    });
  });

  describe('saveTransactions', () => {
    it('upserts rows then deletes removed ones', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveTransactions('user-123', [
        { id: 't1', date: '2026-03-01', amount: 50000, type: 'expense', category: 'food', description: 'Almuerzo', paymentMethod: 'cash', isRecurring: false },
      ]);

      expect(chain.upsert).toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
    });

    it('deletes all rows when transactions array is empty (no not-in filter)', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveTransactions('user-123', []);

      expect(chain.upsert).not.toHaveBeenCalled();
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.not).not.toHaveBeenCalled();
    });
  });

  describe('saveAllUserData', () => {
    it('saves profile first, then other entities in parallel', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveAllUserData('user-123', {
        profile: { name: 'Test', country: 'CO', currency: 'COP', locale: 'es-CO' },
        incomes: [],
        expenses: [],
        debts: [],
        goals: [],
        transactions: [],
        onboardingCompleted: false,
        darkMode: true,
        debtStrategy: 'avalanche',
        goalMode: 'sequential',
        currentFund: 0,
      });

      // Profile upsert should be the first call
      expect(mockFrom.mock.calls[0][0]).toBe('profiles');
      // All entity tables should also be called
      const calledTables = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledTables).toContain('incomes');
      expect(calledTables).toContain('expenses');
      expect(calledTables).toContain('debts');
      expect(calledTables).toContain('goals');
      expect(calledTables).toContain('transactions');
    });
  });
});
