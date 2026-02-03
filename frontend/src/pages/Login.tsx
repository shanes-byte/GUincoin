import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    getCurrentUser()
      .then(() => navigate('/dashboard'))
      .catch(() => {
        // Not logged in, show login button
      });
  }, [navigate]);

  useEffect(() => {
    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin matches our domain
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'oauth-success') {
        setIsLoading(false);
        navigate('/dashboard');
      } else if (event.data?.type === 'oauth-error') {
        setIsLoading(false);
        console.error('OAuth error:', event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleGoogleLogin = () => {
    setIsLoading(true);

    // Open OAuth in popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/api/auth/google?popup=true',
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // Check if popup was blocked
    if (!popup) {
      setIsLoading(false);
      alert('Please allow popups for this site to sign in with Google');
      return;
    }

    // Monitor popup for manual close
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Guincoin Rewards
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your Google Workspace account
          </p>
        </div>
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
