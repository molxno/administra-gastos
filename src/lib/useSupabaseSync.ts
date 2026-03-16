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
import { addToast } from '../components/shared/ToastContainer';

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
  const [cloudLoading, setCloudLoading] = useState(!!userId);

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
      return;
    }

    // Snapshot the current localStorage-persisted state before clearing, so we can
    // restore it if the cloud load fails (avoids leaving user with empty store).
    const localFallback = getPersistedSnapshot(useFinancialStore.getState());

    // For logged-in users, clear any existing user-specific data before starting cloud loading
    // to avoid briefly showing a previous user's financial data after a new login.
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

    setCloudLoading(true);

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
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
        if (!cancelled) {
          // Restore the locally-persisted state so the user isn't left with an empty store
          useFinancialStore.setState(localFallback);
          useFinancialStore.getState().recalculate();

          const message = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
          setCloudLoading(false);
          addToast({
            type: 'warning',
            title: 'Sincronización fallida',
            message: `No se pudo cargar desde la nube. Usando datos locales. (${message})`,
          });
          // Mark load as completed for this session and initialize the last saved snapshot
          // so that future local changes can be saved, without immediately overwriting cloud data.
          lastSavedSnapshot.current = getPersistedSnapshot(useFinancialStore.getState());
          loaded.current = true;
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
    saveTimer.current = setTimeout(async () => { try { if (currentSaveVersion !== saveVersion.current) return;
      const s = useFinancialStore.getState();
      const current = getPersistedSnapshot(s);
      const prev = lastSavedSnapshot.current;
      // Track which slices saved successfully to build the new baseline snapshot
      const saved = { ...(prev ?? current) };
      let hasError = false;

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
        try {
          await saveProfile(userId, s.profile, {
            onboardingCompleted: s.onboardingCompleted,
            darkMode: s.darkMode,
            debtStrategy: s.debtStrategy,
            goalMode: s.goalMode,
            currentFund: s.currentFund,
          });
          saved.profile = current.profile;
          saved.onboardingCompleted = current.onboardingCompleted;
          saved.darkMode = current.darkMode;
          saved.debtStrategy = current.debtStrategy;
          saved.goalMode = current.goalMode;
          saved.currentFund = current.currentFund;
        } catch (err) {
          hasError = true;
          console.error('Error saving profile to Supabase:', err);
        }
      }

      // Save entity slices independently — one failure doesn't block others
      const slices = [
        { key: 'incomes' as const, changed: !prev || current.incomes !== prev.incomes, save: () => saveIncomes(userId, s.incomes) },
        { key: 'expenses' as const, changed: !prev || current.expenses !== prev.expenses, save: () => saveExpenses(userId, s.expenses) },
        { key: 'debts' as const, changed: !prev || current.debts !== prev.debts, save: () => saveDebts(userId, s.debts) },
        { key: 'goals' as const, changed: !prev || current.goals !== prev.goals, save: () => saveGoals(userId, s.goals) },
        { key: 'transactions' as const, changed: !prev || current.transactions !== prev.transactions, save: () => saveTransactions(userId, s.transactions) },
      ];

      await Promise.all(slices.map(async (slice) => {
        if (!slice.changed) return;
        try {
          await slice.save();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (saved as any)[slice.key] = current[slice.key];
        } catch (err) {
          hasError = true;
          console.error(`Error saving ${slice.key} to Supabase:`, err);
        }
      }));

      // Always update baseline with what succeeded — prevents cascading failures
      lastSavedSnapshot.current = saved;

      if (hasError) {
        addToast({
          type: 'error',
          title: 'Error al guardar',
          message: 'No se pudieron sincronizar algunos cambios. Se reintentará automáticamente.',
        });
      }
    } catch (err) {
      console.error('Unexpected error in autosync save:', err);
      addToast({
        type: 'error',
        title: 'Sync error',
        message: 'An unexpected error occurred while saving. Changes will be retried.',
      });
    } }, 1500); // 1.5s debounce
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
  return { cloudLoading };
}
