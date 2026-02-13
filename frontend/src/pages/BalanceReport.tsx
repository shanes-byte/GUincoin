import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  getBalanceReport,
  getReportStats,
  User,
  BalanceReport as BalanceReportData,
  ReportStats,
} from '../services/api';
import Layout from '../components/Layout';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#22c55e',
];

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  manager_award: 'Manager Awards',
  peer_transfer_sent: 'Peer Transfers (Sent)',
  peer_transfer_received: 'Peer Transfers (Received)',
  wellness_reward: 'Wellness Rewards',
  adjustment: 'Adjustments',
  store_purchase: 'Store Purchases',
  allotment_deposit: 'Allotment Deposits',
  bulk_import: 'Bulk Imports',
  game_bet: 'Game Bets',
  game_win: 'Game Wins',
  game_refund: 'Game Refunds',
  jackpot_contribution: 'Jackpot Contributions',
  jackpot_win: 'Jackpot Wins',
  daily_bonus: 'Daily Bonuses',
  prediction_bet: 'Prediction Bets',
  prediction_win: 'Prediction Wins',
};

export default function BalanceReport() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<BalanceReportData | null>(null);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const userRes = await getCurrentUser();
        if (!userRes.data.isAdmin) {
          navigate('/dashboard');
          return;
        }
        setUser(userRes.data);

        const [balanceRes, statsRes] = await Promise.all([
          getBalanceReport(),
          getReportStats(),
        ]);
        setBalanceData(balanceRes.data);
        setReportStats(statsRes.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          navigate('/login');
        } else if (axiosErr.response?.status === 403) {
          navigate('/dashboard');
        } else {
          setError('Failed to load report data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  // Derived data
  const leaderboard = useMemo(() => {
    if (!balanceData) return [];
    return [...balanceData.reportData]
      .sort((a, b) => b.userBalance - a.userBalance)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [balanceData]);

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardSearch.trim()) return leaderboard;
    const q = leaderboardSearch.toLowerCase();
    return leaderboard.filter(
      (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [leaderboard, leaderboardSearch]);

  const topEarners = useMemo(() => {
    return leaderboard.slice(0, 10).map((r) => ({
      name: r.name.split(' ')[0],
      fullName: r.name,
      balance: r.userBalance,
    }));
  }, [leaderboard]);

  const managerAllotments = useMemo(() => {
    if (!balanceData) return [];
    return balanceData.reportData
      .filter((r) => r.allotment !== null)
      .map((r) => ({
        name: r.name,
        email: r.email,
        total: r.allotment!.total,
        used: r.allotment!.used,
        remaining: r.allotment!.remaining,
        usagePct: r.allotment!.total > 0
          ? Math.round((r.allotment!.used / r.allotment!.total) * 100)
          : 0,
      }));
  }, [balanceData]);

  const pieData = useMemo(() => {
    if (!reportStats) return [];
    return reportStats.transactionsByType
      .filter((t) => t.count > 0)
      .map((t) => ({
        name: FRIENDLY_TYPE_NAMES[t.type] || t.type.replace(/_/g, ' '),
        value: t.count,
        amount: Math.abs(t.totalAmount),
      }));
  }, [reportStats]);

  if (loading) {
    return (
      <Layout user={user || undefined}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user || undefined}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!balanceData || !user) return null;

  const { totals } = balanceData;

  return (
    <Layout user={user}>
      <div className="px-4 py-6 sm:px-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generated {new Date(balanceData.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin
          </button>
        </div>

        {/* Row 1: Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total User Balances"
            value={totals.totalUserBalances.toFixed(2)}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          <SummaryCard
            title="Allotment Remaining"
            value={totals.totalAllotmentRemaining.toFixed(2)}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            color="blue"
          />
          <SummaryCard
            title="Total In Circulation"
            value={totals.totalInCirculation.toFixed(2)}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="purple"
          />
          <SummaryCard
            title="Active Users"
            value={String(balanceData.reportData.length)}
            icon={
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="amber"
          />
        </div>

        {/* Row 2: Charts */}
        {reportStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Transaction Breakdown */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Transactions by Type</h2>
              {pieData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No transaction data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={((value: number, _name: string, props: { payload?: { amount?: number } }) => [
                        `${value} txns (${(props.payload?.amount ?? 0).toFixed(2)} GC)`,
                        'Count',
                      ]) as never}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Area Chart: Daily Activity */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Daily Activity (30 Days)</h2>
              {reportStats.dailyActivity.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No activity data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={reportStats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const parts = d.split('-');
                        return `${parts[1]}/${parts[2]}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis yAxisId="left" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip
                      labelFormatter={(d) => new Date(String(d) + 'T00:00:00').toLocaleDateString()}
                      formatter={((value: number, name: string) => [
                        name === 'amount' ? `${value.toFixed(2)} GC` : value,
                        name === 'amount' ? 'Volume' : 'Transactions',
                      ]) as never}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      fill="#93c5fd"
                      fillOpacity={0.3}
                      name="count"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="amount"
                      stroke="#10b981"
                      fill="#6ee7b7"
                      fillOpacity={0.2}
                      name="amount"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Row 3: Leaderboard + Top Earners Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard Table */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Guincoin Leaderboard</h2>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:border-green-500 focus:ring-green-500 w-48"
              />
            </div>
            <div className="overflow-y-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeaderboard.map((row) => {
                    const roles: string[] = [];
                    if (row.isAdmin) roles.push('Admin');
                    if (row.isManager) roles.push('Manager');
                    const roleName = roles.length > 0 ? roles.join(' & ') : 'Employee';

                    return (
                      <tr key={row.employeeId} className={row.rank <= 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-2 text-sm">
                          {row.rank <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white bg-gradient-to-r from-yellow-400 to-amber-500">
                              {row.rank}
                            </span>
                          ) : (
                            <span className="text-gray-500">{row.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.email}</div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono font-medium text-gray-900">
                          {row.userBalance.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.isAdmin
                                ? 'bg-purple-100 text-purple-800'
                                : row.isManager
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {roleName}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No users match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Earners Bar Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Top 10 Earners</h2>
            {topEarners.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topEarners} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                  <Tooltip
                    formatter={((value: number) => [`${value.toFixed(2)} GC`, 'Balance']) as never}
                    labelFormatter={(label, payload) =>
                      (payload as Array<{ payload?: { fullName?: string } }>)?.[0]?.payload?.fullName || String(label)
                    }
                  />
                  <Bar dataKey="balance" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 4: Manager Allotment Overview */}
        {managerAllotments.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Manager Allotment Overview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {managerAllotments.map((mgr) => (
                    <tr key={mgr.email}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{mgr.name}</div>
                        <div className="text-xs text-gray-500">{mgr.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                        {mgr.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                        {mgr.used.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                        {mgr.remaining.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                mgr.usagePct >= 90
                                  ? 'bg-red-500'
                                  : mgr.usagePct >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(mgr.usagePct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-10 text-right">{mgr.usagePct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gaming Overview */}
        {reportStats && reportStats.gamingOverview.gamesPlayed > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Gaming Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{reportStats.gamingOverview.gamesPlayed.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Games Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{reportStats.gamingOverview.totalWagered.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Total Wagered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{reportStats.gamingOverview.totalWon.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Total Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 font-mono">{reportStats.gamingOverview.jackpotPool.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Jackpot Pool</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const bgMap = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
  };

  return (
    <div className="bg-white shadow rounded-lg p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgMap[color]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="text-xl font-bold text-gray-900 font-mono">{value}</p>
        </div>
      </div>
    </div>
  );
}
