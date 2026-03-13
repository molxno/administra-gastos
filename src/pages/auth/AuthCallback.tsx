import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function isPasswordRecoveryUrl(): boolean {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', '?'));
  return params.get('type') === 'recovery';
}

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If the URL contains recovery params, go straight to reset-password
    // before getSession() can race and redirect to /
    if (isPasswordRecoveryUrl()) {
      navigate('/auth/reset-password', { replace: true });
      return;
    }

    let isMounted = true;

    // Check if a session already exists when this component mounts.
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error || !data.session) {
        navigate('/auth/login', { replace: true });
        return;
      }
      navigate('/', { replace: true });
    })();

    // Listen for future auth state changes (e.g. OAuth/magic-link completion).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true });
      } else if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true });
      } else if (!session && (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) {
        navigate('/auth/login', { replace: true });
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
