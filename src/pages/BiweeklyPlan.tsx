import { useState, useMemo } from 'react';
import { useFinancialStore, scopedBiweeklyKey } from '../store/useFinancialStore';
import { formatCurrency } from '../utils/formatters';
import { CATEGORY_ICONS } from '../utils/constants';
import { Card } from '../components/shared/Card';
import { ProgressBar } from '../components/shared/ProgressBar';
import type { BiweeklyPayment, ExpenseCategory } from '../store/types';

const TYPE_COLORS: Record<BiweeklyPayment['type'], string> = {
  expense: '#3b82f6',
  debt: '#ef4444',
  savings: '#22c55e',
  buffer: '#6b7280',
};

const TYPE_ICONS: Record<BiweeklyPayment['type'], string> = {
  expense: '🏠',
  debt: '💳',
  savings: '💰',
  buffer: '🛡️',
};

export function BiweeklyPlan() {
  const { financialState, profile, transactions, toggleBiweeklyCheck } = useFinancialStore();
  const [activePeriod, setActivePeriod] = useState<1 | 2>(1);

  const fs = financialState;
  if (!fs) return null;

  const { currency, locale } = profile;
  const fmt = (v: number) => formatCurrency(v, currency, locale);
  const { biweeklyPlan } = fs;

  const period = biweeklyPlan.periods.find(p => p.period === activePeriod)!;

  // Derive checked state from transactions with biweeklyKey scoped to current month
  const checkedKeys = useMemo(() => new Set(
    transactions.filter(t => t.biweeklyKey).map(t => t.biweeklyKey)
  ), [transactions]);
  const completedCount = period.payments.filter(p => checkedKeys.has(scopedBiweeklyKey(p.key))).length;
  const progressPct = period.payments.length > 0 ? (completedCount / period.payments.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-base font-bold text-green-400">{fmt(biweeklyPlan.totalMonthlyIncome)}</p>
          <p className="text-xs text-gray-500 mt-1">Ingreso Mensual</p>
        </Card>
        <Card className="text-center">
          <p className="text-base font-bold text-blue-400">{fmt(biweeklyPlan.totalMonthlyExpenses)}</p>
          <p className="text-xs text-gray-500 mt-1">Gastos Totales</p>
        </Card>
        <Card className="text-center">
          <p className="text-base font-bold text-purple-400">{fmt(biweeklyPlan.monthlySavings)}</p>
          <p className="text-xs text-gray-500 mt-1">Ahorro Mensual</p>
        </Card>
      </div>

      {/* Period selector */}
      <div className="flex rounded-xl overflow-hidden border border-gray-800">
        {biweeklyPlan.periods.map(p => (
          <button
            key={p.period}
            onClick={() => setActivePeriod(p.period)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activePeriod === p.period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Period details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Period summary */}
        <Card title={period.label} className="lg:col-span-1">
          <div className="space-y-3 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Ingreso quincena</span>
              <span className="text-green-400 font-medium">{fmt(period.income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pagos</span>
              <span className="text-red-400 font-medium">{fmt(period.totalPayments)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Ahorro</span>
              <span className="text-purple-400 font-medium">{fmt(period.savingsAllocation)}</span>
            </div>
            <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
              <span className="text-gray-300 font-medium">Remanente</span>
              <span className={`font-bold ${period.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(period.remaining)}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">Tareas completadas</span>
              <span className="text-gray-300">{completedCount}/{period.payments.length}</span>
            </div>
            <ProgressBar value={progressPct} color="#22c55e" height="h-2" />
          </div>
        </Card>

        {/* Checklist */}
        <Card title="Checklist de la Quincena" className="lg:col-span-2">
          <div className="space-y-2 mt-2">
            {period.payments.map((payment) => {
              const isChecked = checkedKeys.has(scopedBiweeklyKey(payment.key));
              const icon = payment.category
                ? CATEGORY_ICONS[payment.category as ExpenseCategory]
                : TYPE_ICONS[payment.type];

              return (
                <div
                  key={payment.key}
                  role="checkbox"
                  aria-checked={isChecked}
                  aria-label={`${payment.name} - ${fmt(payment.amount)}`}
                  tabIndex={0}
                  onClick={() => toggleBiweeklyCheck(payment)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleBiweeklyCheck(payment);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-green-950/30 border border-green-700/40'
                      : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    isChecked ? 'bg-green-600 border-green-600' : 'border-gray-600'
                  }`}>
                    {isChecked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-base">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isChecked ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                      {payment.name}
                    </p>
                    {payment.dueDay && (
                      <p className="text-xs text-gray-600">Vence día {payment.dueDay}</p>
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold shrink-0"
                    style={{ color: TYPE_COLORS[payment.type] }}
                  >
                    {fmt(payment.amount)}
                  </span>
                </div>
              );
            })}
          </div>

          {completedCount === period.payments.length && period.payments.length > 0 && (
            <div className="mt-4 p-3 bg-green-950/30 border border-green-700/40 rounded-xl text-center">
              <p className="text-sm font-semibold text-green-400">🎉 ¡Quincena completada!</p>
              <p className="text-xs text-gray-500 mt-1">Todas las tareas de esta quincena están listas</p>
            </div>
          )}
        </Card>
      </div>

      {/* Phase context */}
      {fs.currentPhase && (
        <Card className="border-blue-500/20 bg-blue-950/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📌</span>
            <div>
              <p className="text-sm font-semibold text-blue-400">Fase actual: {fs.currentPhase.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                En esta fase, el objetivo quincenal es: {fs.currentPhase.objectives[0]}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
