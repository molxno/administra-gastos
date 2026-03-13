import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // First, check if a session already exists when this component mounts.
    // This avoids getting stuck on this screen if the SIGNED_IN event
    // has already fired before we subscribe to onAuthStateChange.
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted || error) return;
      if (data.session) {
        navigate('/', { replace: true });
      }
    })();

    // Also listen for future auth state changes (e.g. OAuth/magic-link completion).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true });
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
