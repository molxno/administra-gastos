import type { Income, Expense, Debt, Phase, BiweeklyPlan, BiweeklyPeriod, BiweeklyPayment } from '../store/types';

export function runBiweeklyPlanner(
  incomes: Income[],
  expenses: Expense[],
  debts: Debt[],
  currentPhase: Phase | null
): BiweeklyPlan {
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebtPayments = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const freeFlow = Math.max(0, totalIncome - totalExpenses - totalDebtPayments);

  // Check if biweekly income
  const biweeklyIncomes = incomes.filter(i => i.frequency === 'biweekly');
  const monthlyIncomes = incomes.filter(i => i.frequency === 'monthly');

  // Split income into two periods
  const period1Income = biweeklyIncomes.reduce((s, i) => s + i.amount / 2, 0) +
    monthlyIncomes.reduce((s, i) => s + i.amount / 2, 0);
  const period2Income = period1Income;

  // Classify expenses by period
  const period1Expenses: BiweeklyPayment[] = [];
  const period2Expenses: BiweeklyPayment[] = [];

  for (const exp of expenses) {
    const base: Omit<BiweeklyPayment, 'key' | 'amount'> = {
      name: exp.name,
      type: 'expense',
      dueDay: exp.dueDay,
      category: exp.category,
      completed: false,
    };

    if (!exp.dueDay) {
      // No specific day: split 50/50
      period1Expenses.push({ ...base, key: `exp-${exp.id}-p1`, amount: exp.amount / 2 });
      period2Expenses.push({ ...base, key: `exp-${exp.id}-p2`, amount: exp.amount / 2 });
    } else if (exp.dueDay <= 14) {
      period1Expenses.push({ ...base, key: `exp-${exp.id}`, amount: exp.amount });
    } else {
      period2Expenses.push({ ...base, key: `exp-${exp.id}`, amount: exp.amount });
    }
  }

  for (const debt of debts) {
    const payment: BiweeklyPayment = {
      key: `debt-${debt.id}`,
      name: debt.name,
      amount: debt.monthlyPayment,
      type: 'debt',
      dueDay: debt.dueDay,
      completed: false,
    };

    if (debt.dueDay <= 14) {
      period1Expenses.push(payment);
    } else {
      period2Expenses.push(payment);
    }
  }

  // Determine savings allocation based on phase
  let savingsRatio1 = 0;
  let savingsRatio2 = 0;
  let savingsLabel = 'Ahorro/metas';

  if (currentPhase) {
    if (currentPhase.id.includes('debt')) {
      savingsRatio1 = 0.90;
      savingsRatio2 = 0.90;
      savingsLabel = 'Pago extra deuda';
    } else if (currentPhase.id.includes('emergency')) {
      savingsRatio1 = 0.50;
      savingsRatio2 = 0.50;
      savingsLabel = 'Fondo de emergencia';
    } else {
      savingsRatio1 = 0.45;
      savingsRatio2 = 0.45;
      savingsLabel = 'Ahorro para metas';
    }
  } else {
    savingsRatio1 = 0.80;
    savingsRatio2 = 0.80;
  }

  const p1Total = period1Expenses.reduce((s, p) => s + p.amount, 0);
  const p2Total = period2Expenses.reduce((s, p) => s + p.amount, 0);
  const p1Remaining = period1Income - p1Total;
  const p2Remaining = period2Income - p2Total;

  const p1Savings = Math.max(0, p1Remaining * savingsRatio1);
  const p2Savings = Math.max(0, p2Remaining * savingsRatio2);

  if (p1Savings > 0) {
    period1Expenses.push({ key: 'savings-p1', name: savingsLabel, amount: p1Savings, type: 'savings', completed: false });
  }
  if (p2Savings > 0) {
    period2Expenses.push({ key: 'savings-p2', name: savingsLabel, amount: p2Savings, type: 'savings', completed: false });
  }

  const bufferRatio = 0.10;
  const p1Buffer = Math.max(0, p1Remaining - p1Savings) * bufferRatio;
  const p2Buffer = Math.max(0, p2Remaining - p2Savings) * bufferRatio;
  if (p1Buffer > 0) {
    period1Expenses.push({ key: 'buffer-p1', name: 'Colchón imprevistos', amount: p1Buffer, type: 'buffer', completed: false });
  }
  if (p2Buffer > 0) {
    period2Expenses.push({ key: 'buffer-p2', name: 'Colchón imprevistos', amount: p2Buffer, type: 'buffer', completed: false });
  }

  const period1: BiweeklyPeriod = {
    period: 1,
    label: 'Quincena 1 (Días 1-14)',
    startDay: 1,
    endDay: 14,
    income: period1Income,
    payments: period1Expenses,
    totalPayments: period1Expenses.reduce((s, p) => s + p.amount, 0),
    remaining: period1Income - period1Expenses.reduce((s, p) => s + p.amount, 0),
    savingsAllocation: p1Savings,
  };

  const period2: BiweeklyPeriod = {
    period: 2,
    label: 'Quincena 2 (Días 15-31)',
    startDay: 15,
    endDay: 31,
    income: period2Income,
    payments: period2Expenses,
    totalPayments: period2Expenses.reduce((s, p) => s + p.amount, 0),
    remaining: period2Income - period2Expenses.reduce((s, p) => s + p.amount, 0),
    savingsAllocation: p2Savings,
  };

  return {
    periods: [period1, period2],
    totalMonthlyIncome: totalIncome,
    totalMonthlyExpenses: totalExpenses + totalDebtPayments,
    monthlySavings: p1Savings + p2Savings,
  };
}
