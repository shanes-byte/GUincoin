import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error from OAuth callback
    const authError = searchParams.get('error');
    if (authError) {
      setError(authError === 'auth' ? 'Authentication failed. Please try again.' : authError);
      setIsLoading(false);
      return;
    }

    // Check if already logged in
    getCurrentUser()
      .then(() => {
        // Already logged in, go to dashboard
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        // Not logged in, show login button
        setIsLoading(false);
      });
  }, [navigate, searchParams]);

  const handleGoogleLogin = () => {
    // Direct redirect to Google OAuth - no popup needed
    // The backend will redirect back to /dashboard after successful auth
    window.location.href = '/api/auth/google';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

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
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div>
          <button
            onClick={handleGoogleLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
