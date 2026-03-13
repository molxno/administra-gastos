import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the OAuth/magic-link tokens from the URL hash automatically.
    // We just need to wait for the session to be established, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true });
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl animate-pulse">
          <span className="text-2xl font-bold text-white">TF</span>
        </div>
        <p className="text-sm text-gray-400">Verificando sesión...</p>
      </div>
    </div>
  );
}
