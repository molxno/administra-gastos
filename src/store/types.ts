export interface UserProfile {
  name: string;
  country: string;
  currency: string;
  locale: string;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly';
  payDays: number[];
  isNet: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  isFixed: boolean;
  isEssential: boolean;
  dueDay?: number;
  paymentMethod: 'cash' | 'debit' | 'credit_card';
  notes?: string;
}

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'health'
  | 'family'
  | 'education'
  | 'entertainment'
  | 'subscriptions'
  | 'personal'
  | 'debt'
  | 'savings'
  | 'insurance'
  | 'other';

export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'personal_loan' | 'mortgage' | 'car_loan' | 'financed_purchase' | 'informal' | 'other';
  currentBalance: number;
  originalAmount?: number;
  monthlyPayment: number;
  interestRate: number;
  annualRate?: number;
  remainingPayments?: number;
  totalPayments?: number;
  completedPayments?: number;
  dueDay: number;
  creditLimit?: number;
  minimumPayment?: number;
  productName?: string;
  productValue?: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentSaved: number;
  priority: number;
  category: 'purchase' | 'emergency_fund' | 'investment' | 'travel' | 'education' | 'housing' | 'other';
  deadline?: string;
  isFlexible: boolean;
  notes?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'debt_payment' | 'savings' | 'transfer';
  category: ExpenseCategory;
  description: string;
  paymentMethod: 'cash' | 'debit' | 'credit_card';
  isRecurring: boolean;
}

export interface BudgetAllocation {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface Phase {
  id: string;
  number: number;
  name: string;
  description: string;
  startMonth: string;
  endMonth: string;
  durationMonths: number;
  status: 'active' | 'upcoming' | 'completed';
  color: string;
  objectives: string[];
  monthlyBudget: BudgetAllocation[];
}

export interface DiagnosisAlert {
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionSteps: string[];
}

export interface Diagnosis {
  healthScore: number;
  level: 'critical' | 'warning' | 'moderate' | 'healthy' | 'excellent';
  alerts: DiagnosisAlert[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
}

export interface AmortizationRow {
  month: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface DebtWithPlan extends Debt {
  order: number;
  extraPayment: number;
  amortization: AmortizationRow[];
  payoffDate: string;
  totalInterest: number;
  monthsToPayoff: number;
  interestSavedVsMinimum: number;
}

export interface DebtPlan {
  strategy: 'avalanche' | 'snowball';
  debts: DebtWithPlan[];
  totalDebt: number;
  totalMonthlyPayment: number;
  totalInterestWithPlan: number;
  totalInterestMinimumOnly: number;
  interestSaved: number;
  debtFreeDate: string;
  monthsToDebtFree: number;
}

export interface BudgetCategory {
  category: ExpenseCategory | string;
  label: string;
  budgeted: number;
  spent: number;
  percentage: number;
  color: string;
  isOverBudget: boolean;
}

export interface BudgetPlan {
  totalIncome: number;
  totalExpenses: number;
  totalDebtPayments: number;
  freeFlow: number;
  categories: BudgetCategory[];
  phaseAllocations: BudgetAllocation[];
  savingsRate: number;
  recommendations: string[];
}

export interface BiweeklyPayment {
  key: string;
  name: string;
  amount: number;
  type: 'expense' | 'debt' | 'savings' | 'buffer';
  dueDay?: number;
  category?: ExpenseCategory;
  completed: boolean;
}

export interface BiweeklyPeriod {
  period: 1 | 2;
  label: string;
  startDay: number;
  endDay: number;
  income: number;
  payments: BiweeklyPayment[];
  totalPayments: number;
  remaining: number;
  savingsAllocation: number;
}

export interface BiweeklyPlan {
  periods: BiweeklyPeriod[];
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlySavings: number;
}

export interface GoalWithPlan extends Goal {
  status: 'saving' | 'waiting' | 'completed';
  monthlySaving: number;
  estimatedDate: string;
  monthsNeeded: number;
  progressPercent: number;
  remaining: number;
}

export interface GoalPlan {
  mode: 'sequential' | 'parallel';
  goals: GoalWithPlan[];
  totalMonthlySaving: number;
  startDate: string;
}

export interface EmergencyProjectionRow {
  month: number;
  date: string;
  balance: number;
  monthsCovered: number;
}

export interface EmergencyPlan {
  currentFund: number;
  essentialExpenses: number;
  target3months: number;
  target6months: number;
  currentMonthsCovered: number;
  level: 'none' | 'partial' | '1month' | '3months' | '6months';
  monthlySaving: number;
  monthsTo3: number;
  monthsTo6: number;
  dateFor3months: string;
  dateFor6months: string;
  projection: EmergencyProjectionRow[];
}

export interface FinancialState {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  totalDebtPayments: number;
  freeFlow: number;
  expenseToIncomeRatio: number;
  debtToIncomeRatio: number;
  totalDebt: number;
  creditUtilization?: number;
  emergencyFundMonths: number;
  savingsRate: number;
  currentPhase: Phase | null;
  phases: Phase[];
  diagnosis: Diagnosis;
  debtPlan: DebtPlan;
  budgetPlan: BudgetPlan;
  biweeklyPlan: BiweeklyPlan;
  goalPlan: GoalPlan;
  emergencyPlan: EmergencyPlan;
}

export type DebtStrategy = 'avalanche' | 'snowball';
export type GoalMode = 'sequential' | 'parallel';

export interface FinancialStore {
  // Data
  profile: UserProfile;
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
  transactions: Transaction[];
  currentFund: number;

  // UI State
  onboardingCompleted: boolean;
  darkMode: boolean;
  debtStrategy: DebtStrategy;
  goalMode: GoalMode;
  biweeklyCheckedItems: Record<string, boolean>;

  // Computed state
  financialState: FinancialState | null;

  // Actions
  setProfile: (profile: UserProfile) => void;
  setIncomes: (incomes: Income[]) => void;
  addIncome: (income: Income) => void;
  updateIncome: (income: Income) => void;
  removeIncome: (id: string) => void;

  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;

  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (debt: Debt) => void;
  removeDebt: (id: string) => void;

  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;

  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;

  setCurrentFund: (amount: number) => void;
  setOnboardingCompleted: (v: boolean) => void;
  toggleDarkMode: () => void;
  setDebtStrategy: (s: DebtStrategy) => void;
  setGoalMode: (m: GoalMode) => void;

  toggleBiweeklyCheck: (key: string) => void;
  resetBiweeklyChecks: () => void;

  recalculate: () => void;
}
