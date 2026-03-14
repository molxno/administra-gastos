import { supabase } from './supabase';
import type { UserProfile, Income, Expense, Debt, Goal, Transaction, DebtStrategy, GoalMode } from '../store/types';

// ============================================================
// LOAD: Fetch all user data from Supabase
// ============================================================
export async function loadUserData(userId: string) {
  const [profileRes, incomesRes, expensesRes, debtsRes, goalsRes, transactionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('incomes').select('*').eq('user_id', userId),
    supabase.from('expenses').select('*').eq('user_id', userId),
    supabase.from('debts').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
  ]);

  // Validate errors — tolerate missing profile (PGRST116) but throw on real failures
  if (profileRes.error && profileRes.error.code !== 'PGRST116') {
    throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  }
  if (incomesRes.error) {
    throw new Error(`Failed to load incomes: ${incomesRes.error.message}`);
  }
  if (expensesRes.error) {
    throw new Error(`Failed to load expenses: ${expensesRes.error.message}`);
  }
  if (debtsRes.error) {
    throw new Error(`Failed to load debts: ${debtsRes.error.message}`);
  }
  if (goalsRes.error) {
    throw new Error(`Failed to load goals: ${goalsRes.error.message}`);
  }
  if (transactionsRes.error) {
    throw new Error(`Failed to load transactions: ${transactionsRes.error.message}`);
  }

  const profile: UserProfile = profileRes.data
    ? {
        name: profileRes.data.name,
        country: profileRes.data.country,
        currency: profileRes.data.currency,
        locale: profileRes.data.locale,
      }
    : { name: '', country: 'Colombia', currency: 'COP', locale: 'es-CO' };

  const settings = profileRes.data
    ? {
        onboardingCompleted: profileRes.data.onboarding_completed as boolean,
        darkMode: profileRes.data.dark_mode as boolean,
        debtStrategy: profileRes.data.debt_strategy as DebtStrategy,
        goalMode: profileRes.data.goal_mode as GoalMode,
        currentFund: Number(profileRes.data.current_fund),
        biweeklyCheckedItems: (profileRes.data.biweekly_checked_items as Record<string, boolean>) ?? {},
      }
    : {
        onboardingCompleted: false,
        darkMode: true,
        debtStrategy: 'avalanche' as DebtStrategy,
        goalMode: 'sequential' as GoalMode,
        currentFund: 0,
        biweeklyCheckedItems: {} as Record<string, boolean>,
      };

  const incomes: Income[] = (incomesRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    frequency: r.frequency,
    payDays: r.pay_days as number[],
    isNet: r.is_net,
  }));

  const expenses: Expense[] = (expensesRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    category: r.category,
    isFixed: r.is_fixed,
    isEssential: r.is_essential,
    dueDay: r.due_day ?? undefined,
    paymentMethod: r.payment_method,
    notes: r.notes ?? undefined,
  }));

  const debts: Debt[] = (debtsRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    currentBalance: Number(r.current_balance),
    originalAmount: r.original_amount != null ? Number(r.original_amount) : undefined,
    monthlyPayment: Number(r.monthly_payment),
    interestRate: Number(r.interest_rate),
    annualRate: r.annual_rate != null ? Number(r.annual_rate) : undefined,
    remainingPayments: r.remaining_payments ?? undefined,
    totalPayments: r.total_payments ?? undefined,
    completedPayments: r.completed_payments ?? undefined,
    dueDay: r.due_day,
    creditLimit: r.credit_limit != null ? Number(r.credit_limit) : undefined,
    minimumPayment: r.minimum_payment != null ? Number(r.minimum_payment) : undefined,
    productName: r.product_name ?? undefined,
    productValue: r.product_value != null ? Number(r.product_value) : undefined,
  }));

  const goals: Goal[] = (goalsRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    targetAmount: Number(r.target_amount),
    currentSaved: Number(r.current_saved),
    priority: r.priority,
    category: r.category,
    deadline: r.deadline ?? undefined,
    isFlexible: r.is_flexible,
    notes: r.notes ?? undefined,
  }));

  const transactions: Transaction[] = (transactionsRes.data ?? []).map(r => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: r.type,
    category: r.category,
    description: r.description,
    paymentMethod: r.payment_method,
    isRecurring: r.is_recurring,
  }));

  return { profile, ...settings, incomes, expenses, debts, goals, transactions };
}

// ============================================================
// SAVE: Upsert individual entities to Supabase
// ============================================================

export async function saveProfile(userId: string, profile: UserProfile, settings: {
  onboardingCompleted: boolean;
  darkMode: boolean;
  debtStrategy: DebtStrategy;
  goalMode: GoalMode;
  currentFund: number;
  biweeklyCheckedItems: Record<string, boolean>;
}) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    name: profile.name,
    country: profile.country,
    currency: profile.currency,
    locale: profile.locale,
    onboarding_completed: settings.onboardingCompleted,
    dark_mode: settings.darkMode,
    debt_strategy: settings.debtStrategy,
    goal_mode: settings.goalMode,
    current_fund: settings.currentFund,
    biweekly_checked_items: settings.biweeklyCheckedItems,
  });
  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}

export async function saveIncomes(userId: string, incomes: Income[]) {
  const currentIds = incomes.map(i => i.id);

  // Upsert existing + new rows
  if (incomes.length > 0) {
    const { error: upsertError } = await supabase.from('incomes').upsert(
      incomes.map(i => ({
        id: i.id,
        user_id: userId,
        name: i.name,
        amount: i.amount,
        frequency: i.frequency,
        pay_days: i.payDays,
        is_net: i.isNet,
      }))
    );
    if (upsertError) {
      throw new Error(`Failed to save incomes: ${upsertError.message}`);
    }
  }

  // Delete rows removed from the store
  const deleteQuery = supabase
    .from('incomes')
    .delete()
    .eq('user_id', userId);
  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to clean up incomes: ${deleteError.message}`);
  }
}

export async function saveExpenses(userId: string, expenses: Expense[]) {
  const currentIds = expenses.map(e => e.id);

  if (expenses.length > 0) {
    const { error: upsertError } = await supabase.from('expenses').upsert(
      expenses.map(e => ({
        id: e.id,
        user_id: userId,
        name: e.name,
        amount: e.amount,
        category: e.category,
        is_fixed: e.isFixed,
        is_essential: e.isEssential,
        due_day: e.dueDay ?? null,
        payment_method: e.paymentMethod,
        notes: e.notes ?? null,
      }))
    );
    if (upsertError) {
      throw new Error(`Failed to save expenses: ${upsertError.message}`);
    }
  }

  const deleteQuery = supabase
    .from('expenses')
    .delete()
    .eq('user_id', userId);
  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to clean up expenses: ${deleteError.message}`);
  }
}

export async function saveDebts(userId: string, debts: Debt[]) {
  const currentIds = debts.map(d => d.id);

  if (debts.length > 0) {
    const { error: upsertError } = await supabase.from('debts').upsert(
      debts.map(d => ({
        id: d.id,
        user_id: userId,
        name: d.name,
        type: d.type,
        current_balance: d.currentBalance,
        original_amount: d.originalAmount ?? null,
        monthly_payment: d.monthlyPayment,
        interest_rate: d.interestRate,
        annual_rate: d.annualRate ?? null,
        remaining_payments: d.remainingPayments ?? null,
        total_payments: d.totalPayments ?? null,
        completed_payments: d.completedPayments ?? null,
        due_day: d.dueDay,
        credit_limit: d.creditLimit ?? null,
        minimum_payment: d.minimumPayment ?? null,
        product_name: d.productName ?? null,
        product_value: d.productValue ?? null,
      }))
    );
    if (upsertError) {
      throw new Error(`Failed to save debts: ${upsertError.message}`);
    }
  }

  const deleteQuery = supabase
    .from('debts')
    .delete()
    .eq('user_id', userId);
  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to clean up debts: ${deleteError.message}`);
  }
}

export async function saveGoals(userId: string, goals: Goal[]) {
  const currentIds = goals.map(g => g.id);

  if (goals.length > 0) {
    const { error: upsertError } = await supabase.from('goals').upsert(
      goals.map(g => ({
        id: g.id,
        user_id: userId,
        name: g.name,
        icon: g.icon,
        target_amount: g.targetAmount,
        current_saved: g.currentSaved,
        priority: g.priority,
        category: g.category,
        deadline: g.deadline ?? null,
        is_flexible: g.isFlexible,
        notes: g.notes ?? null,
      }))
    );
    if (upsertError) {
      throw new Error(`Failed to save goals: ${upsertError.message}`);
    }
  }

  const deleteQuery = supabase
    .from('goals')
    .delete()
    .eq('user_id', userId);
  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to clean up goals: ${deleteError.message}`);
  }
}

export async function saveTransactions(userId: string, transactions: Transaction[]) {
  const currentIds = transactions.map(t => t.id);

  if (transactions.length > 0) {
    const { error: upsertError } = await supabase.from('transactions').upsert(
      transactions.map(t => ({
        id: t.id,
        user_id: userId,
        date: t.date,
        amount: t.amount,
        type: t.type,
        category: t.category,
        description: t.description,
        payment_method: t.paymentMethod,
        is_recurring: t.isRecurring,
      }))
    );
    if (upsertError) {
      throw new Error(`Failed to save transactions: ${upsertError.message}`);
    }
  }

  const deleteQuery = supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);
  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to clean up transactions: ${deleteError.message}`);
  }
}

// ============================================================
// FULL SAVE: Save all user data at once
// ============================================================
export async function saveAllUserData(
  userId: string,
  data: {
    profile: UserProfile;
    incomes: Income[];
    expenses: Expense[];
    debts: Debt[];
    goals: Goal[];
    transactions: Transaction[];
    onboardingCompleted: boolean;
    darkMode: boolean;
    debtStrategy: DebtStrategy;
    goalMode: GoalMode;
    currentFund: number;
    biweeklyCheckedItems?: Record<string, boolean>;
  }
) {
  // Ensure profile exists before saving entities that FK-reference it
  await saveProfile(userId, data.profile, {
    onboardingCompleted: data.onboardingCompleted,
    darkMode: data.darkMode,
    debtStrategy: data.debtStrategy,
    goalMode: data.goalMode,
    currentFund: data.currentFund,
    biweeklyCheckedItems: data.biweeklyCheckedItems ?? {},
  });

  await Promise.all([
    saveIncomes(userId, data.incomes),
    saveExpenses(userId, data.expenses),
    saveDebts(userId, data.debts),
    saveGoals(userId, data.goals),
    saveTransactions(userId, data.transactions),
  ]);
}
