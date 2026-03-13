import { useEffect, useRef, useCallback, useState } from 'react';
import { useFinancialStore } from '../store/useFinancialStore';
import type { FinancialStore } from '../store/types';
import { useAuth } from '../contexts/AuthContext';
import {
  loadUserData,
  saveProfile,
  saveIncomes,
  saveExpenses,
  saveDebts,
  saveGoals,
  saveTransactions,
} from './syncService';

/**
 * Hook that syncs the Zustand store with Supabase.
 * - On login: loads user data from Supabase into the store
 * - On store changes: debounced save to Supabase
 */

// Extract only the slices that are actually persisted to Supabase
function getPersistedSnapshot(state: FinancialStore) {
  return {
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
  };
}

// Shallow comparison for the persisted snapshot (object props by reference)
function arePersistedSnapshotsEqual(
  a: ReturnType<typeof getPersistedSnapshot>,
  b: ReturnType<typeof getPersistedSnapshot>
) {
  const keys = Object.keys(a) as (keyof typeof a)[];
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

export function useSupabaseSync() {
  const { user } = useAuth();
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);
  // Tracks the snapshot of persisted data after the last successful save (or load)
  const lastSavedSnapshot = useRef<ReturnType<typeof getPersistedSnapshot> | null>(null);
  const userId = user?.id;
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudHydrated, setCloudHydrated] = useState(false);

  // Load data from Supabase when user logs in
  useEffect(() => {
    // Reset state and clear any pending save when the user changes
    loaded.current = false;
    lastSavedSnapshot.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    // If there is no user (logout), clear the store and stop here.
    if (!userId) {
      useFinancialStore.setState({
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
      });
      // Recalculate derived values after clearing the store
      useFinancialStore.getState().recalculate();
      setCloudLoading(false);
      setCloudHydrated(false);
      return;
    }

    // For logged-in users, start cloud loading without clearing the local cache yet.
    setCloudLoading(true);
    setCloudHydrated(false);

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

        // Record the loaded state so the subscription doesn't re-save it immediately
        lastSavedSnapshot.current = getPersistedSnapshot(useFinancialStore.getState());
        loaded.current = true;
        setCloudLoading(false);
        setCloudHydrated(true);
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
        if (!cancelled) {
          // Stop loading but keep whatever is in the local store (do not overwrite with empty).
          setCloudLoading(false);
          setCloudHydrated(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Debounced save to Supabase — only saves slices that changed since the last save
  const saveToCloud = useCallback(() => {
    if (!userId || !loaded.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    const currentSaveVersion = ++saveVersion.current;
    saveTimer.current = setTimeout(async () => { if (currentSaveVersion !== saveVersion.current) return;
      try {
        const s = useFinancialStore.getState();
        const current = getPersistedSnapshot(s);
        const prev = lastSavedSnapshot.current;

        const profileSettingsChanged =
          !prev ||
          current.profile !== prev.profile ||
          current.onboardingCompleted !== prev.onboardingCompleted ||
          current.darkMode !== prev.darkMode ||
          current.debtStrategy !== prev.debtStrategy ||
          current.goalMode !== prev.goalMode ||
          current.currentFund !== prev.currentFund;

        // Save profile first (other tables FK-reference profiles)
        if (profileSettingsChanged) {
          await saveProfile(userId, s.profile, {
            onboardingCompleted: s.onboardingCompleted,
            darkMode: s.darkMode,
            debtStrategy: s.debtStrategy,
            goalMode: s.goalMode,
            currentFund: s.currentFund,
          });
        }

        // Save only the entity slices that actually changed
        await Promise.all([
          (!prev || current.incomes !== prev.incomes)
            ? saveIncomes(userId, s.incomes)
            : Promise.resolve(),
          (!prev || current.expenses !== prev.expenses)
            ? saveExpenses(userId, s.expenses)
            : Promise.resolve(),
          (!prev || current.debts !== prev.debts)
            ? saveDebts(userId, s.debts)
            : Promise.resolve(),
          (!prev || current.goals !== prev.goals)
            ? saveGoals(userId, s.goals)
            : Promise.resolve(),
          (!prev || current.transactions !== prev.transactions)
            ? saveTransactions(userId, s.transactions)
            : Promise.resolve(),
        ]);

        // Update baseline snapshot after a successful save
        lastSavedSnapshot.current = current;
      } catch (err) {
        console.error('Error saving data to Supabase:', err);
      }
    }, 1500); // 1.5s debounce
  }, [userId]);

  // Subscribe to store changes (only for persisted slices)
  useEffect(() => {
    if (!userId) return;

    const unsub = useFinancialStore.subscribe((state, prevState) => {
      const currentPersisted = getPersistedSnapshot(state);
      const previousPersisted = getPersistedSnapshot(prevState);

      // Avoid triggering saves when only non-persisted / derived state changes
      if (arePersistedSnapshotsEqual(currentPersisted, previousPersisted)) {
        return;
      }

      saveToCloud();
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userId, saveToCloud]);
  return {
    cloudLoading,
    cloudHydrated,
  };
}
