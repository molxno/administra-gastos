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
    it('returns default values when profile is null', async () => {
      const profileChain = createQueryChain(null);
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
      const profileChain = createQueryChain(null);
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
  });

  describe('saveIncomes', () => {
    it('deletes existing then inserts new incomes', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveIncomes('user-123', [
        { id: 'i1', name: 'Salario', amount: 3000000, frequency: 'monthly', payDays: [1], isNet: true },
      ]);

      // First call: delete
      expect(mockFrom).toHaveBeenCalledWith('incomes');
      expect(chain.delete).toHaveBeenCalled();
      // Second call: insert
      expect(chain.insert).toHaveBeenCalledWith([
        { id: 'i1', user_id: 'user-123', name: 'Salario', amount: 3000000, frequency: 'monthly', pay_days: [1], is_net: true },
      ]);
    });

    it('skips insert when incomes array is empty', async () => {
      const chain = createQueryChain();
      mockFrom.mockReturnValue(chain);

      await saveIncomes('user-123', []);

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.insert).not.toHaveBeenCalled();
    });
  });

  describe('saveAllUserData', () => {
    it('calls all save functions in parallel', async () => {
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

      // profiles + 5 entity tables (delete calls) + profiles upsert
      expect(mockFrom).toHaveBeenCalled();
      const calledTables = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledTables).toContain('profiles');
      expect(calledTables).toContain('incomes');
      expect(calledTables).toContain('expenses');
      expect(calledTables).toContain('debts');
      expect(calledTables).toContain('goals');
      expect(calledTables).toContain('transactions');
    });
  });
});
