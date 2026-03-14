import { useEffect, useState, useCallback, useRef } from 'react';

export interface Toast {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

// Simple event-based toast store (no context needed)
let toasts: Toast[] = [];
let listeners: Listener[] = [];
let nextId = 0;

function emit() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = String(++nextId);
  toasts = [...toasts, { ...toast, id }];
  emit();
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

function useToasts() {
  // Initialize from current toasts so pre-mount calls are reflected
  const [state, setState] = useState<Toast[]>(() => [...toasts]);
  useEffect(() => {
    // Sync with any toasts added between initial render and effect
    setState([...toasts]);
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);
  return state;
}

const TYPE_CONFIG = {
  error: { bg: 'bg-red-950/90', border: 'border-red-500/50', title: 'text-red-400', icon: '!' },
  warning: { bg: 'bg-yellow-950/90', border: 'border-yellow-500/50', title: 'text-yellow-400', icon: '!' },
  success: { bg: 'bg-green-950/90', border: 'border-green-500/50', title: 'text-green-400', icon: '!' },
  info: { bg: 'bg-blue-950/90', border: 'border-blue-500/50', title: 'text-blue-400', icon: 'i' },
};

export function ToastContainer() {
  const items = useToasts();

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  // Auto-dismiss each toast after 8 seconds
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    for (const toast of items) {
      if (!dismissTimers.current.has(toast.id)) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
          dismissTimers.current.delete(toast.id);
        }, 8000);
        dismissTimers.current.set(toast.id, timer);
      }
    }
    // Clean up timers for removed toasts
    const currentIds = new Set(items.map(t => t.id));
    for (const [id, timer] of dismissTimers.current) {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        dismissTimers.current.delete(id);
      }
    }

    // Clear all timers on unmount
    return () => {
      for (const timer of dismissTimers.current.values()) {
        clearTimeout(timer);
      }
      dismissTimers.current.clear();
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {items.map(toast => {
        const cfg = TYPE_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            className={`${cfg.bg} ${cfg.border} border rounded-lg p-3 shadow-lg backdrop-blur-sm pointer-events-auto animate-slide-in`}
          >
            <div className="flex items-start gap-2">
              <span className={`${cfg.title} text-sm font-bold mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${cfg.border}`}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${cfg.title}`}>{toast.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar notificación"
                className="text-gray-600 hover:text-gray-400 text-xs shrink-0"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
