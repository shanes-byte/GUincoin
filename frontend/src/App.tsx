import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import ManagerPortal from './pages/ManagerPortal';
import Transfers from './pages/Transfers';
import Wellness from './pages/Wellness';
import AdminPortal from './pages/AdminPortal';
import BalanceReport from './pages/BalanceReport';
import Store from './pages/Store';
import Games from './pages/Games';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/manager" element={<ManagerPortal />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/store" element={<Store />} />
            <Route path="/games" element={<Games />} />
            <Route path="/wellness" element={<Wellness />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/balances" element={<BalanceReport />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        </ThemeProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
