import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFinancialStore } from '../../store/useFinancialStore';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/presupuesto': 'Presupuesto',
  '/deudas': 'Deudas',
  '/metas': 'Metas',
  '/quincenal': 'Plan Quincenal',
  '/emergencia': 'Fondo de Emergencia',
  '/transacciones': 'Transacciones',
  '/insights': 'Insights del Tutor',
  '/configuracion': 'Configuración',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { financialState, profile } = useFinancialStore();
  const { user, signOut } = useAuth();
  const title = PAGE_TITLES[location.pathname] ?? 'Tutor Financiero';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Mostrar feedback básico al usuario y evitar que la excepción se propague
      window.alert('No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {financialState && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-gray-500">Flujo libre:</span>
            <span className={`font-semibold ${financialState.freeFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(financialState.freeFlow, profile.currency, profile.locale)}
            </span>
          </div>
        )}

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm hover:bg-blue-600/30 transition-colors cursor-pointer"
            aria-label={profile.name ? `Abrir menú de usuario para ${profile.name}` : 'Abrir menú de usuario'}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-lg shadow-black/40 py-2 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-gray-100 truncate">{profile.name || 'Sin nombre'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/configuracion'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuración
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors text-left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
