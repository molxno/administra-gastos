import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialStore, FinancialState, Transaction, BiweeklyPayment, ExpenseCategory } from './types';
import { nanoid } from '../components/shared/nanoid';
import { runFinancialDiagnosis } from '../engines/financialDiagnosis';
import { runDebtStrategy } from '../engines/debtStrategy';
import { runBudgetOptimizer } from '../engines/budgetOptimizer';
import { runBiweeklyPlanner } from '../engines/biweeklyPlanner';
import { runGoalPlanner } from '../engines/goalPlanner';
import { runEmergencyFundCalculator } from '../engines/emergencyFundCalculator';
import { generatePhases } from '../engines/phaseGenerator';

function computeFinancialState(
  store: Omit<FinancialStore, 'financialState' | 'recalculate' | keyof ReturnType<typeof getActions>>
): FinancialState {
  const { incomes, expenses, debts, goals, currentFund, debtStrategy, goalMode } = store;

  const totalMonthlyIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalMonthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebtPayments = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const freeFlow = totalMonthlyIncome - totalMonthlyExpenses - totalDebtPayments;
  const totalDebt = debts.reduce((s, d) => s + d.currentBalance, 0);
  const essentialExpenses = expenses.filter(e => e.isEssential).reduce((s, e) => s + e.amount, 0);

  const expenseToIncomeRatio = totalMonthlyIncome > 0
    ? (totalMonthlyExpenses + totalDebtPayments) / totalMonthlyIncome
    : 0;

  const debtToIncomeRatio = totalMonthlyIncome > 0
    ? totalDebt / (totalMonthlyIncome * 12)
    : 0;

  const creditCards = debts.filter(d => d.type === 'credit_card' && d.creditLimit);
  const totalCreditUsed = creditCards.reduce((s, d) => s + d.currentBalance, 0);
  const totalCreditLimit = creditCards.reduce((s, d) => s + (d.creditLimit ?? 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? totalCreditUsed / totalCreditLimit : undefined;

  const emergencyFundMonths = essentialExpenses > 0 ? currentFund / essentialExpenses : 0;
  const savingsRate = totalMonthlyIncome > 0 ? Math.max(0, freeFlow) / totalMonthlyIncome : 0;

  // Run engines
  const diagnosis = runFinancialDiagnosis(incomes, expenses, debts, goals, currentFund);
  const debtPlan = runDebtStrategy(debts, freeFlow, debtStrategy);

  // Generate phases
  const phases = generatePhases(
    incomes, expenses, debts, goals, currentFund,
    debtPlan.monthsToDebtFree
  );
  const currentPhase = phases.find(p => p.status === 'active') ?? phases[0] ?? null;

  const budgetPlan = runBudgetOptimizer(incomes, expenses, debts, currentPhase);
  const biweeklyPlan = runBiweeklyPlanner(incomes, expenses, debts, currentPhase);

  // Goals budget (from phase allocation)
  const goalsBudget = currentPhase
    ? (currentPhase.monthlyBudget.find(a => a.category === 'goals')?.amount ?? 0)
    : Math.max(0, freeFlow * 0.4);

  const goalPlan = runGoalPlanner(goals, goalsBudget, debtPlan.monthsToDebtFree, new Date(), goalMode);

  const emergencySaving = currentPhase
    ? (currentPhase.monthlyBudget.find(a => a.category === 'emergency')?.amount ?? 0)
    : Math.max(0, freeFlow * 0.3);
  const emergencyPlan = runEmergencyFundCalculator(expenses, emergencySaving, currentFund);

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    totalDebtPayments,
    freeFlow,
    expenseToIncomeRatio,
    debtToIncomeRatio,
    totalDebt,
    creditUtilization,
    emergencyFundMonths,
    savingsRate,
    currentPhase,
    phases,
    diagnosis,
    debtPlan,
    budgetPlan,
    biweeklyPlan,
    goalPlan,
    emergencyPlan,
  };
}

const BIWEEKLY_TYPE_TO_TRANSACTION_TYPE: Record<BiweeklyPayment['type'], Transaction['type']> = {
  expense: 'expense',
  debt: 'debt_payment',
  savings: 'savings',
  buffer: 'expense',
};

const BIWEEKLY_TYPE_TO_CATEGORY: Record<BiweeklyPayment['type'], ExpenseCategory> = {
  expense: 'other',
  debt: 'debt',
  savings: 'savings',
  buffer: 'other',
};

export function createTransactionFromPayment(payment: BiweeklyPayment): Transaction {
  return {
    id: nanoid(),
    date: new Date().toISOString().slice(0, 10),
    amount: payment.amount,
    type: BIWEEKLY_TYPE_TO_TRANSACTION_TYPE[payment.type],
    category: payment.category ?? BIWEEKLY_TYPE_TO_CATEGORY[payment.type],
    description: payment.name,
    paymentMethod: 'debit',
    isRecurring: true,
    biweeklyKey: payment.key,
  };
}

// Placeholder for action types
function getActions(_set: unknown, _get: unknown) {
  return {};
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: { name: '', country: 'Colombia', currency: 'COP', locale: 'es-CO' },
      incomes: [],
      expenses: [],
      debts: [],
      goals: [],
      transactions: [],
      currentFund: 0,
      onboardingCompleted: false,
      darkMode: true,
      debtStrategy: 'avalanche',
      goalMode: 'sequential',
      biweeklyCheckedItems: {},
      financialState: null,

      // Profile
      setProfile: (profile) => {
        set({ profile });
        get().recalculate();
      },

      // Incomes
      setIncomes: (incomes) => { set({ incomes }); get().recalculate(); },
      addIncome: (income) => { set(s => ({ incomes: [...s.incomes, income] })); get().recalculate(); },
      updateIncome: (income) => {
        set(s => ({ incomes: s.incomes.map(i => i.id === income.id ? income : i) }));
        get().recalculate();
      },
      removeIncome: (id) => { set(s => ({ incomes: s.incomes.filter(i => i.id !== id) })); get().recalculate(); },

      // Expenses
      setExpenses: (expenses) => { set({ expenses }); get().recalculate(); },
      addExpense: (expense) => { set(s => ({ expenses: [...s.expenses, expense] })); get().recalculate(); },
      updateExpense: (expense) => {
        set(s => ({ expenses: s.expenses.map(e => e.id === expense.id ? expense : e) }));
        get().recalculate();
      },
      removeExpense: (id) => { set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })); get().recalculate(); },

      // Debts
      setDebts: (debts) => { set({ debts }); get().recalculate(); },
      addDebt: (debt) => { set(s => ({ debts: [...s.debts, debt] })); get().recalculate(); },
      updateDebt: (debt) => {
        set(s => ({ debts: s.debts.map(d => d.id === debt.id ? debt : d) }));
        get().recalculate();
      },
      removeDebt: (id) => { set(s => ({ debts: s.debts.filter(d => d.id !== id) })); get().recalculate(); },

      // Goals
      setGoals: (goals) => { set({ goals }); get().recalculate(); },
      addGoal: (goal) => { set(s => ({ goals: [...s.goals, goal] })); get().recalculate(); },
      updateGoal: (goal) => {
        set(s => ({ goals: s.goals.map(g => g.id === goal.id ? goal : g) }));
        get().recalculate();
      },
      removeGoal: (id) => { set(s => ({ goals: s.goals.filter(g => g.id !== id) })); get().recalculate(); },

      // Transactions
      addTransaction: (transaction) => { set(s => ({ transactions: [transaction, ...s.transactions] })); },
      removeTransaction: (id) => { set(s => ({ transactions: s.transactions.filter(t => t.id !== id) })); },

      // Settings
      setCurrentFund: (amount) => { set({ currentFund: amount }); get().recalculate(); },
      setOnboardingCompleted: (v) => {
        set({ onboardingCompleted: v });
        get().recalculate();
      },
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      setDebtStrategy: (s) => { set({ debtStrategy: s }); get().recalculate(); },
      setGoalMode: (m) => { set({ goalMode: m }); get().recalculate(); },

      toggleBiweeklyCheck: (payment) => {
        const s = get();
        const isChecked = s.biweeklyCheckedItems[payment.key];

        if (isChecked) {
          // Unchecking: remove the linked transaction and uncheck
          const next = { ...s.biweeklyCheckedItems };
          delete next[payment.key];
          set({ biweeklyCheckedItems: next });
          set(state => ({
            transactions: state.transactions.filter(t => t.biweeklyKey !== payment.key),
          }));
        } else {
          // Checking: create a linked transaction and check
          const transaction = createTransactionFromPayment(payment);
          set(state => ({
            biweeklyCheckedItems: { ...state.biweeklyCheckedItems, [payment.key]: true },
          }));
          set(state => ({
            transactions: [transaction, ...state.transactions],
          }));
        }
      },
      resetBiweeklyChecks: () => { set({ biweeklyCheckedItems: {} }); },

      // Recalculate all computed state
      recalculate: () => {
        const s = get();
        if (s.incomes.length === 0 && s.expenses.length === 0 && s.debts.length === 0) {
          set({ financialState: null });
          return;
        }
        const financialState = computeFinancialState(s);
        set({ financialState });
      },
    }),
    {
      name: 'tutor-financiero-store',
      partialize: (state) => ({
        profile: state.profile,
        incomes: state.incomes,
        expenses: state.expenses,
        debts: state.debts,
        goals: state.goals,
        transactions: state.transactions,
        currentFund: state.currentFund,
        onboardingCompleted: state.onboardingCompleted,
        darkMode: state.darkMode,
        debtStrategy: state.debtStrategy,
        goalMode: state.goalMode,
        biweeklyCheckedItems: state.biweeklyCheckedItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => state.recalculate(), 0);
        }
      },
    }
  )
);
