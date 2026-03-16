import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransactionFromPayment } from './useFinancialStore';
import type { BiweeklyPayment } from './types';

// Mock nanoid to produce deterministic IDs
vi.mock('../components/shared/nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

describe('createTransactionFromPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16'));
  });

  it('maps an expense payment with category correctly', () => {
    const payment: BiweeklyPayment = {
      key: 'exp-1-p1',
      name: 'Arriendo',
      amount: 1500000,
      type: 'expense',
      category: 'housing',
      dueDay: 5,
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);

    expect(tx).toEqual({
      id: 'test-id-123',
      date: '2026-03-16',
      amount: 1500000,
      type: 'expense',
      category: 'housing',
      description: 'Arriendo',
      paymentMethod: 'debit',
      isRecurring: true,
      biweeklyKey: 'exp-1-p1',
    });
  });

  it('maps an expense payment without category to "other"', () => {
    const payment: BiweeklyPayment = {
      key: 'exp-2-p1',
      name: 'Gasto varios',
      amount: 50000,
      type: 'expense',
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);
    expect(tx.category).toBe('other');
    expect(tx.type).toBe('expense');
    expect(tx.biweeklyKey).toBe('exp-2-p1');
  });

  it('maps a debt payment correctly', () => {
    const payment: BiweeklyPayment = {
      key: 'debt-1',
      name: 'Visa',
      amount: 300000,
      type: 'debt',
      dueDay: 15,
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);
    expect(tx.type).toBe('debt_payment');
    expect(tx.category).toBe('debt');
    expect(tx.description).toBe('Visa');
    expect(tx.amount).toBe(300000);
    expect(tx.biweeklyKey).toBe('debt-1');
  });

  it('maps a savings payment correctly', () => {
    const payment: BiweeklyPayment = {
      key: 'savings-p1',
      name: 'Ahorro/metas',
      amount: 200000,
      type: 'savings',
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);
    expect(tx.type).toBe('savings');
    expect(tx.category).toBe('savings');
  });

  it('maps a buffer payment to expense/other', () => {
    const payment: BiweeklyPayment = {
      key: 'buffer-p1',
      name: 'Colchón',
      amount: 100000,
      type: 'buffer',
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);
    expect(tx.type).toBe('expense');
    expect(tx.category).toBe('other');
  });

  it('uses today date in ISO format', () => {
    vi.setSystemTime(new Date('2026-12-25'));
    const payment: BiweeklyPayment = {
      key: 'exp-1-p2',
      name: 'Test',
      amount: 100,
      type: 'expense',
      completed: false,
    };

    const tx = createTransactionFromPayment(payment);
    expect(tx.date).toBe('2026-12-25');
  });
});
