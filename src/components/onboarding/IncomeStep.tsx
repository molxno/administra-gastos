import { useState } from 'react';
import type { Income } from '../../store/types';
import { CurrencyInput } from '../shared/CurrencyInput';
import { nanoid } from '../shared/nanoid';

interface IncomeStepProps {
  currency: string;
  setCurrency: (v: string) => void;
  incomes: Income[];
  setIncomes: (v: Income[]) => void;
  onNext: () => void;
}

const CURRENCIES = [
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar americano (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
];

export function IncomeStep({ currency, setCurrency, incomes, setIncomes, onNext }: IncomeStepProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Income>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    payDays: [1],
    isNet: true,
  });
  const [error, setError] = useState('');

  const addIncome = () => {
    if (!form.name || !form.amount || form.amount <= 0) {
      setError('Completa nombre y monto');
      return;
    }
    setIncomes([...incomes, { ...form, id: nanoid() } as Income]);
    setForm({ name: '', amount: 0, frequency: 'monthly', payDays: [1], isNet: true });
    setShowForm(false);
    setError('');
  };

  const removeIncome = (id: string) => setIncomes(incomes.filter(i => i.id !== id));

  const canNext = incomes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-1">¿Cuánto ganas?</h2>
        <p className="text-sm text-gray-500">Configura tu moneda y tus fuentes de ingreso</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Moneda</label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Incomes list */}
      {incomes.length > 0 && (
        <div className="space-y-2">
          {incomes.map(inc => (
            <div key={inc.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-gray-200">{inc.name}</p>
                <p className="text-xs text-gray-500">
                  {inc.amount.toLocaleString('es-CO')} {currency}/mes · {inc.frequency === 'biweekly' ? 'Quincenal' : inc.frequency === 'weekly' ? 'Semanal' : 'Mensual'}
                </p>
              </div>
              <button onClick={() => removeIncome(inc.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded">Eliminar</button>
            </div>
          ))}
        </div>
      )}

      {/* Add income form */}
      {showForm ? (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">Nueva fuente de ingreso</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Salario, Freelance"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <CurrencyInput
              label="Monto mensual"
              value={form.amount ?? 0}
              onChange={v => setForm(f => ({ ...f, amount: v }))}
              currency={currency}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Frecuencia de pago</label>
              <select
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Income['frequency'] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
              >
                <option value="monthly">Mensual</option>
                <option value="biweekly">Quincenal (días 1 y 15)</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Días de pago</label>
              <input
                type="text"
                value={form.payDays?.join(', ')}
                onChange={e => setForm(f => ({ ...f, payDays: e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n)) }))}
                placeholder="Ej: 1, 15"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isNet}
              onChange={e => setForm(f => ({ ...f, isNet: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
            <span className="text-sm text-gray-300">Este monto ya tiene descuentos aplicados (neto)</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={addIncome}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Agregar ingreso
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl py-3 text-sm text-gray-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          Agregar fuente de ingreso
        </button>
      )}

      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          Continuar →
        </button>
        {!canNext && <p className="text-xs text-gray-600 text-center mt-2">Agrega al menos un ingreso para continuar</p>}
      </div>
    </div>
  );
}
