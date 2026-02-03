import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    // This page is a fallback - normally OAuth redirects directly to /dashboard
    // Redirect based on success parameter
    if (success) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login?error=auth';
    }
  }, [success]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
