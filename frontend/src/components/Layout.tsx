// [ORIGINAL - 2026-02-06] No hamburger menu, hidden sm:flex hid nav below 640px,
// manager/admin links in flat horizontal nav (up to 6 items), no mobile support
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/api';

interface LayoutProps {
  children: ReactNode;
  user?: {
    name: string;
    isManager: boolean;
    isAdmin: boolean;
    isGameMaster?: boolean;
  };
}

export default function Layout({ children, user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const getLinkClasses = (path: string) => {
    const baseClasses = "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium";
    if (isActive(path)) {
      return `${baseClasses} border-blue-500 text-gray-900`;
    }
    return `${baseClasses} border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700`;
  };

  const getMobileLinkClasses = (path: string) => {
    const baseClasses = "block px-3 py-2 rounded-md text-base font-medium";
    if (isActive(path)) {
      return `${baseClasses} bg-blue-50 text-blue-700`;
    }
    return `${baseClasses} text-gray-700 hover:bg-gray-50 hover:text-gray-900`;
  };

  const primaryNavItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/transfers', label: 'Transfers' },
    { path: '/store', label: 'Store' },
    { path: '/games', label: 'Games' },
    { path: '/wellness', label: 'Wellness' },
  ];

  // [ORIGINAL - 2026-02-18] Used background-attachment: fixed on the wrapper div,
  // which breaks on iOS Safari and some Android browsers (zoomed/clipped rendering).
  // Replaced with a fixed-position div behind the content for cross-device support.
  return (
    <div className="min-h-screen relative">
      {/* Fixed background layer — bg-gray-50 is the fallback when no image is set */}
      <div
        className="fixed inset-0 -z-10 bg-gray-50"
        style={{
          backgroundImage: 'var(--campaign-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo + Primary Nav */}
            <div className="flex">
              <Link to="/dashboard" className="flex items-center px-2 py-2 text-xl font-bold text-blue-600">
                Guincoin
              </Link>
              {/* Desktop nav links (md and up) */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {primaryNavItems.map((item) => (
                  <Link key={item.path} to={item.path} className={getLinkClasses(item.path)}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Profile dropdown (desktop) + Hamburger (mobile) */}
            <div className="flex items-center">
              {/* Desktop profile dropdown */}
              <div className="hidden md:flex md:items-center" ref={profileRef}>
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
                  >
                    <span className="mr-1">{user?.name}</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        {user?.isManager && (
                          <Link
                            to="/manager"
                            className={`block px-4 py-2 text-sm ${
                              isActive('/manager') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Manager Portal
                          </Link>
                        )}
                        {user?.isAdmin && (
                          <Link
                            to="/admin"
                            className={`block px-4 py-2 text-sm ${
                              isActive('/admin') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Admin Portal
                          </Link>
                        )}
                        {user?.isGameMaster && !user?.isAdmin && (
                          <Link
                            to="/admin"
                            className={`block px-4 py-2 text-sm ${
                              isActive('/admin') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Game Master
                          </Link>
                        )}
                        {(user?.isManager || user?.isAdmin || user?.isGameMaster) && (
                          <div className="border-t border-gray-100" />
                        )}
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hamburger button (mobile, below md) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {primaryNavItems.map((item) => (
                <Link key={item.path} to={item.path} className={getMobileLinkClasses(item.path)}>
                  {item.label}
                </Link>
              ))}
              {user?.isManager && (
                <Link to="/manager" className={getMobileLinkClasses('/manager')}>
                  Manager Portal
                </Link>
              )}
              {user?.isAdmin && (
                <Link to="/admin" className={getMobileLinkClasses('/admin')}>
                  Admin Portal
                </Link>
              )}
              {user?.isGameMaster && !user?.isAdmin && (
                <Link to="/admin" className={getMobileLinkClasses('/admin')}>
                  Game Master
                </Link>
              )}
            </div>
            <div className="border-t border-gray-200 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <button
                onClick={handleLogout}
                className="mt-2 block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white/85 backdrop-blur-sm rounded-xl p-6 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
