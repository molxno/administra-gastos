import { useEffect, useRef, useCallback } from 'react';
import { useFinancialStore } from '../store/useFinancialStore';
import { useAuth } from '../contexts/AuthContext';
import { loadUserData, saveAllUserData } from './syncService';

/**
 * Hook that syncs the Zustand store with Supabase.
 * - On login: loads user data from Supabase into the store
 * - On store changes: debounced save to Supabase
 */
export function useSupabaseSync() {
  const { user } = useAuth();
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = user?.id;

  // Load data from Supabase when user logs in
  useEffect(() => {
    // Reset loaded flag and clear any pending save when the user changes
    loaded.current = false;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (!userId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await loadUserData(userId!);
        if (cancelled) return;

        // Hydrate the store with DB data in a single batched update
        useFinancialStore.setState({
          profile: data.profile,
          incomes: data.incomes,
          expenses: data.expenses,
          debts: data.debts,
          goals: data.goals,
          transactions: data.transactions,
          currentFund: data.currentFund,
          onboardingCompleted: data.onboardingCompleted,
          darkMode: data.darkMode,
          debtStrategy: data.debtStrategy,
          goalMode: data.goalMode,
        });

        // Recalculate after full hydration
        useFinancialStore.getState().recalculate();
        loaded.current = true;
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Debounced save to Supabase on store changes
  const saveToCloud = useCallback(() => {
    if (!userId || !loaded.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const s = useFinancialStore.getState();
        await saveAllUserData(userId, {
          profile: s.profile,
          incomes: s.incomes,
          expenses: s.expenses,
          debts: s.debts,
          goals: s.goals,
          transactions: s.transactions,
          onboardingCompleted: s.onboardingCompleted,
          darkMode: s.darkMode,
          debtStrategy: s.debtStrategy,
          goalMode: s.goalMode,
          currentFund: s.currentFund,
        });
      } catch (err) {
        console.error('Error saving data to Supabase:', err);
      }
    }, 1500); // 1.5s debounce
  }, [userId]);

  // Subscribe to store changes (only for persisted slices)
  useEffect(() => {
    if (!userId) return;

    const unsub = useFinancialStore.subscribe(
      (state) => ({
        profile: state.profile,
        incomes: state.incomes,
        expenses: state.expenses,
        debts: state.debts,
        goals: state.goals,
        transactions: state.transactions,
        onboardingCompleted: state.onboardingCompleted,
        darkMode: state.darkMode,
        debtStrategy: state.debtStrategy,
        goalMode: state.goalMode,
        currentFund: state.currentFund,
      }),
      () => {
        saveToCloud();
      }
    );

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userId, saveToCloud]);
}
