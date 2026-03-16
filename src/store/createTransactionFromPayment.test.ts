vi.mock('../components/shared/nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTransactionFromPayment, scopedBiweeklyKey } from './useFinancialStore';
import type { BiweeklyPayment } from './types';

describe('createTransactionFromPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16'));
  });

  afterEach(() => {
    vi.useRealTimers();
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
      biweeklyKey: 'exp-1-p1:2026-03',
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
    expect(tx.biweeklyKey).toBe('exp-2-p1:2026-03');
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
    expect(tx.biweeklyKey).toBe('debt-1:2026-03');
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
    expect(tx.biweeklyKey).toBe('exp-1-p2:2026-12');
  });
});

describe('scopedBiweeklyKey', () => {
  it('appends YYYY-MM to the payment key', () => {
    expect(scopedBiweeklyKey('exp-1-p1', new Date('2026-03-16'))).toBe('exp-1-p1:2026-03');
    expect(scopedBiweeklyKey('debt-1', new Date('2027-01-01'))).toBe('debt-1:2027-01');
  });

  it('uses current date when no date provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15'));
    expect(scopedBiweeklyKey('savings-p1')).toBe('savings-p1:2026-06');
    vi.useRealTimers();
  });

  it('produces different keys for different months', () => {
    const march = scopedBiweeklyKey('exp-1', new Date('2026-03-01'));
    const april = scopedBiweeklyKey('exp-1', new Date('2026-04-01'));
    expect(march).not.toBe(april);
  });
});
