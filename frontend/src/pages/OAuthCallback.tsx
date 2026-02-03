import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');

  useEffect(() => {
    // Send message to parent window (the original login page)
    if (window.opener) {
      if (success) {
        window.opener.postMessage({ type: 'oauth-success' }, window.location.origin);
      } else {
        window.opener.postMessage({ type: 'oauth-error', error: error || 'Unknown error' }, window.location.origin);
      }
      // Close the popup after a short delay
      setTimeout(() => window.close(), 500);
    } else {
      // Not in a popup, redirect to dashboard or login
      if (success) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    }
  }, [success, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {success ? 'Sign in successful! Redirecting...' : 'Processing...'}
        </p>
      </div>
    </div>
  );
}
