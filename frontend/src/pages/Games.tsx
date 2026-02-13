import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  getBalance,
  getGameConfigs,
  playGame,
  getGameHistory,
  getGameStats,
  getLeaderboard,
  getDailyBonusStatus,
  getJackpots,
  User,
  Balance,
  GameConfig,
  GameType,
  PlayGameResponse,
  GameHistory as GameHistoryType,
  GameStats as GameStatsType,
  LeaderboardEntry,
  DailyBonusStatus,
  Jackpot,
} from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

const GAME_NAMES: Record<string, string> = {
  coin_flip: 'Coin Flip',
  dice_roll: 'Dice Roll',
  spin_wheel: 'Spin the Wheel',
  higher_lower: 'Higher or Lower',
  scratch_card: 'Scratch Card',
  daily_bonus: 'Daily Bonus',
};

const GAME_ICONS: Record<string, string> = {
  coin_flip: '\u{1FA99}',
  dice_roll: '\u{1F3B2}',
  spin_wheel: '\u{1F3A1}',
  higher_lower: '\u{1F4CA}',
  scratch_card: '\u{1F3B0}',
  daily_bonus: '\u{1F381}',
};

type TabType = 'games' | 'history' | 'stats' | 'leaderboard';

export default function Games() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('games');

  // Games tab state
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [dailyBonus, setDailyBonus] = useState<DailyBonusStatus | null>(null);
  const [jackpots, setJackpots] = useState<Jackpot[]>([]);
  const [playModal, setPlayModal] = useState<GameConfig | null>(null);
  const [bet, setBet] = useState('');
  const [prediction, setPrediction] = useState<unknown>(null);
  const [playing, setPlaying] = useState(false);
  const [playResult, setPlayResult] = useState<PlayGameResponse | null>(null);
  const [spinningDaily, setSpinningDaily] = useState(false);
  const [dailyResult, setDailyResult] = useState<PlayGameResponse | null>(null);

  // History tab state
  const [history, setHistory] = useState<GameHistoryType[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<GameType | ''>('');

  // Stats tab state
  const [stats, setStats] = useState<GameStatsType | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Leaderboard tab state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'week' | 'month'>('all');

  // Countdown timer for daily bonus
  const [countdown, setCountdown] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial data load
  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          getCurrentUser(),
          getBalance(),
          getGameConfigs(),
          getDailyBonusStatus(),
          getJackpots(),
        ]);

        if (controller.signal.aborted) return;

        const hasAuthError = results.some(
          (r) =>
            r.status === 'rejected' &&
            (r.reason as { response?: { status: number } })?.response?.status === 401
        );
        if (hasAuthError) {
          navigate('/login');
          return;
        }

        if (results[0].status === 'fulfilled') setUser(results[0].value.data);
        if (results[1].status === 'fulfilled') setBalance(results[1].value.data);
        if (results[2].status === 'fulfilled') setGameConfigs(results[2].value.data || []);
        if (results[3].status === 'fulfilled') setDailyBonus(results[3].value.data);
        if (results[4].status === 'fulfilled') {
          const jpData = results[4].value.data;
          setJackpots(jpData?.jackpots ?? (Array.isArray(jpData) ? jpData : []));
        }
      } catch {
        navigate('/login');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadData();
    return () => {
      controller.abort();
    };
  }, [navigate]);

  // Track current user id for leaderboard highlighting
  useEffect(() => {
    if (user) setCurrentUserId(user.id);
  }, [user]);

  // Countdown timer for daily bonus
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!dailyBonus || dailyBonus.canPlay || !dailyBonus.nextAvailable) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const now = Date.now();
      const target = new Date(dailyBonus.nextAvailable!).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown('Available now!');
        setDailyBonus((prev) => (prev ? { ...prev, canPlay: true } : prev));
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hrs}h ${mins}m ${secs}s`);
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [dailyBonus]);

  // Tab data loaders
  useEffect(() => {
    if (activeTab === 'history') loadHistory(true);
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload history when filter changes
  useEffect(() => {
    if (activeTab === 'history') loadHistory(true);
  }, [historyFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload leaderboard when period changes
  useEffect(() => {
    if (activeTab === 'leaderboard') loadLeaderboard();
  }, [leaderboardPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBalance = useCallback(async () => {
    try {
      const res = await getBalance();
      setBalance(res.data);
    } catch { /* ignore */ }
  }, []);

  const refreshGameData = useCallback(async () => {
    try {
      const [configRes, bonusRes, jackpotRes] = await Promise.allSettled([
        getGameConfigs(),
        getDailyBonusStatus(),
        getJackpots(),
      ]);
      if (configRes.status === 'fulfilled') setGameConfigs(configRes.value.data || []);
      if (bonusRes.status === 'fulfilled') setDailyBonus(bonusRes.value.data);
      if (jackpotRes.status === 'fulfilled') {
        const jpData = jackpotRes.value.data;
        setJackpots(jpData?.jackpots ?? (Array.isArray(jpData) ? jpData : []));
      }
    } catch { /* ignore */ }
  }, []);

  const loadHistory = async (reset: boolean) => {
    setHistoryLoading(true);
    try {
      const offset = reset ? 0 : historyOffset;
      const params: { limit: number; offset: number; type?: GameType } = { limit: 20, offset };
      if (historyFilter) params.type = historyFilter;
      const res = await getGameHistory(params);
      const { games, pagination } = res.data;
      if (reset) {
        setHistory(games);
        setHistoryOffset(games.length);
      } else {
        setHistory((prev) => [...prev, ...games]);
        setHistoryOffset((prev) => prev + games.length);
      }
      setHistoryHasMore(pagination.hasMore);
    } catch {
      addToast('Failed to load game history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await getGameStats();
      setStats(res.data);
    } catch {
      addToast('Failed to load game stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await getLeaderboard({ limit: 50, period: leaderboardPeriod });
      setLeaderboard(res.data.leaderboard);
      setCurrentUserRank(res.data.currentUser.rank);
    } catch {
      addToast('Failed to load leaderboard', 'error');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Play a regular game
  const handlePlay = async () => {
    if (!playModal) return;
    const betNum = parseFloat(bet);
    if (isNaN(betNum) || betNum < playModal.minBet || betNum > playModal.maxBet) {
      addToast(`Bet must be between ${playModal.minBet} and ${playModal.maxBet}`, 'error');
      return;
    }

    setPlaying(true);
    setPlayResult(null);
    try {
      const res = await playGame({
        gameType: playModal.gameType,
        bet: betNum,
        prediction: prediction ?? undefined,
      });
      setPlayResult(res.data);
      setBalance({ posted: res.data.balance, pending: 0, total: res.data.balance });
      if (res.data.result.won) {
        addToast(`You won ${res.data.result.payout.toFixed(2)} Guincoin!`, 'success');
      } else {
        addToast('Better luck next time!', 'info');
      }
      refreshGameData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to play game', 'error');
    } finally {
      setPlaying(false);
    }
  };

  // Play daily bonus
  const handleDailyBonus = async () => {
    setSpinningDaily(true);
    setDailyResult(null);
    try {
      const res = await playGame({ gameType: 'daily_bonus', bet: 0 });
      // Let the spin animation play for 2 seconds
      await new Promise((r) => setTimeout(r, 2000));
      setDailyResult(res.data);
      setBalance({ posted: res.data.balance, pending: 0, total: res.data.balance });
      addToast(`Daily bonus: +${res.data.result.payout.toFixed(2)} Guincoin!`, 'success');
      refreshGameData();
      refreshBalance();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to claim daily bonus', 'error');
    } finally {
      setSpinningDaily(false);
    }
  };

  const openPlayModal = (config: GameConfig) => {
    setPlayModal(config);
    setBet(config.minBet.toString());
    setPrediction(null);
    setPlayResult(null);
  };

  const closePlayModal = () => {
    setPlayModal(null);
    setBet('');
    setPrediction(null);
    setPlayResult(null);
  };

  // Format date for display
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const webGames = gameConfigs.filter((c) => c.availableOnWeb && c.enabled && c.gameType !== 'daily_bonus');

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  const tabs: { id: TabType; name: string }[] = [
    { id: 'games', name: 'Games' },
    { id: 'history', name: 'History' },
    { id: 'stats', name: 'Stats' },
    { id: 'leaderboard', name: 'Leaderboard' },
  ];

  return (
    <Layout user={user || undefined}>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Games</h1>
            <p className="mt-1 text-sm text-gray-500">Play games and win Guincoin!</p>
          </div>
          {balance && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Balance</p>
              <p className="text-xl font-mono font-bold text-gray-900">{balance.total.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* ==================== GAMES TAB ==================== */}
        {activeTab === 'games' && (
          <div className="space-y-8">
            {/* Daily Bonus Card — only show if the daily_bonus game is enabled */}
            {dailyBonus && gameConfigs.some(c => c.gameType === 'daily_bonus' && c.enabled) && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{GAME_ICONS.daily_bonus}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Daily Bonus</h2>
                      <p className="text-sm text-gray-600">Free spin every day — no bet required!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {dailyBonus.canPlay && !dailyResult ? (
                      <button
                        onClick={handleDailyBonus}
                        disabled={spinningDaily}
                        className="px-6 py-3 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 disabled:opacity-50"
                      >
                        <span className={spinningDaily ? 'inline-block animate-spin' : ''}>
                          {spinningDaily ? '\u{1F3A1}' : 'Spin!'}
                        </span>
                      </button>
                    ) : dailyResult ? (
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          +{dailyResult.result.payout.toFixed(2)} Guincoin
                        </p>
                        <p className="text-xs text-gray-500">Come back tomorrow!</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Next spin in</p>
                        <p className="text-lg font-mono font-semibold text-amber-700">{countdown}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Game Cards Grid */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Play Games</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {webGames.map((config) => (
                  <button
                    key={config.gameType}
                    onClick={() => openPlayModal(config)}
                    className="bg-white shadow rounded-lg p-6 text-left hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{GAME_ICONS[config.gameType] || '\u{1F3AE}'}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {GAME_NAMES[config.gameType] || config.gameType}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Bet: {config.minBet} &ndash; {config.maxBet} Guincoin</p>
                      {config.jackpotContributionRate > 0 && (
                        <p className="text-amber-600 font-medium">
                          Jackpot eligible ({(config.jackpotContributionRate * 100).toFixed(0)}% contribution)
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                {webGames.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No games are available right now.
                  </div>
                )}
              </div>
            </div>

            {/* Jackpot Section */}
            {jackpots.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Active Jackpots</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jackpots.map((jp) => (
                    <div key={jp.id} className="bg-white shadow rounded-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-1">{jp.name}</h3>
                      <p className="text-2xl font-mono font-bold text-amber-600">{jp.balance.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{jp.type} jackpot</p>
                      {jp.lastWonAmount && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last won: {jp.lastWonAmount.toFixed(2)} by {jp.lastWonBy || 'someone'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== HISTORY TAB ==================== */}
        {activeTab === 'history' && (
          <div>
            {/* Filter */}
            <div className="mb-4">
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as GameType | '')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Games</option>
                {Object.entries(GAME_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bet</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payout</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">W/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((game) => (
                      <tr key={game.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(game.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {GAME_ICONS[game.type]} {GAME_NAMES[game.type] || game.type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">
                          {game.participant?.betAmount.toFixed(2) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {game.result ? JSON.stringify(game.result).slice(0, 40) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          <span className={game.participant?.isWinner ? 'text-green-600' : 'text-gray-600'}>
                            {game.participant?.payout?.toFixed(2) ?? '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {game.participant?.isWinner === true && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">W</span>
                          )}
                          {game.participant?.isWinner === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">L</span>
                          )}
                          {game.participant?.isWinner == null && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && !historyLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          No game history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Load More */}
            {historyHasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => loadHistory(false)}
                  disabled={historyLoading}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== STATS TAB ==================== */}
        {activeTab === 'stats' && (
          <div>
            {statsLoading ? (
              <div className="text-center py-12 text-gray-500">Loading stats...</div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Games Played</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.gamesPlayed}</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{(stats.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className={`text-2xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Best Streak</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.longestWinStreak}</p>
                  </div>
                </div>

                {/* Extra Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Total Bet</p>
                    <p className="text-lg font-mono font-semibold text-gray-900">{stats.totalBet.toFixed(2)}</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Total Won</p>
                    <p className="text-lg font-mono font-semibold text-green-600">{stats.totalWon.toFixed(2)}</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Current Streak</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.currentWinStreak}</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-sm text-gray-500">Jackpots Won</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {stats.jackpotsWon} ({stats.totalJackpotWinnings.toFixed(2)})
                    </p>
                  </div>
                </div>

                {/* Per-game breakdown */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Per-Game Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Played</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Won</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Bet</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Won</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(stats.statsByGame).map(([gameType, gs]) => {
                          const net = gs.totalWon - gs.totalBet;
                          const wr = gs.played > 0 ? (gs.won / gs.played) * 100 : 0;
                          return (
                            <tr key={gameType} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {GAME_ICONS[gameType]} {GAME_NAMES[gameType] || gameType}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{gs.played}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{gs.won}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">{wr.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">{gs.totalBet.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-green-600 text-right font-mono">{gs.totalWon.toFixed(2)}</td>
                              <td className={`px-4 py-3 text-sm text-right font-mono ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {net >= 0 ? '+' : ''}{net.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        {Object.keys(stats.statsByGame).length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                              No per-game stats yet. Play some games!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Could not load stats.</div>
            )}
          </div>
        )}

        {/* ==================== LEADERBOARD TAB ==================== */}
        {activeTab === 'leaderboard' && (
          <div>
            {/* Period Filter */}
            <div className="mb-4 flex items-center gap-2">
              {([
                ['all', 'All Time'],
                ['week', 'This Week'],
                ['month', 'This Month'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLeaderboardPeriod(val)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    leaderboardPeriod === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {leaderboardLoading ? (
              <div className="text-center py-12 text-gray-500">Loading leaderboard...</div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Games</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Best Streak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {leaderboard.map((entry) => {
                        const isCurrentUser = entry.employeeId === currentUserId;
                        return (
                          <tr
                            key={entry.employeeId}
                            className={isCurrentUser ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.rank <= 3 ? (
                                <span className="text-lg">
                                  {entry.rank === 1 ? '\u{1F947}' : entry.rank === 2 ? '\u{1F948}' : '\u{1F949}'}
                                </span>
                              ) : (
                                `#${entry.rank}`
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.name}
                              {isCurrentUser && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{entry.gamesPlayed}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{(entry.winRate * 100).toFixed(1)}%</td>
                            <td className={`px-4 py-3 text-sm text-right font-mono ${entry.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{entry.longestWinStreak}</td>
                          </tr>
                        );
                      })}
                      {leaderboard.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                            No leaderboard data for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {currentUserRank && currentUserRank > 50 && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-blue-50 text-sm text-blue-700">
                    Your current rank: #{currentUserRank}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== PLAY MODAL ==================== */}
        {playModal && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) closePlayModal(); }}
          >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {GAME_ICONS[playModal.gameType]} {GAME_NAMES[playModal.gameType]}
                </h2>
                <button
                  onClick={closePlayModal}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              {!playResult ? (
                <>
                  {/* Bet Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bet Amount ({playModal.minBet} &ndash; {playModal.maxBet})
                    </label>
                    <input
                      type="number"
                      value={bet}
                      onChange={(e) => setBet(e.target.value)}
                      min={playModal.minBet}
                      max={playModal.maxBet}
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {balance && (
                      <p className="mt-1 text-xs text-gray-500">
                        Available: <span className="font-mono">{balance.total.toFixed(2)}</span> Guincoin
                      </p>
                    )}
                  </div>

                  {/* Prediction Input (varies by game type) */}
                  {playModal.gameType === 'coin_flip' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Prediction</label>
                      <div className="flex gap-2">
                        {['heads', 'tails'].map((side) => (
                          <button
                            key={side}
                            onClick={() => setPrediction(side)}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                              prediction === side
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {side === 'heads' ? 'Heads' : 'Tails'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {playModal.gameType === 'dice_roll' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pick a Number (1-6)</label>
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <button
                            key={n}
                            onClick={() => setPrediction(n)}
                            className={`px-3 py-2 text-sm font-medium rounded-md border ${
                              prediction === n
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {playModal.gameType === 'higher_lower' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Prediction</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'higher', label: 'Over 50' },
                          { value: 'lower', label: 'Under 50' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setPrediction(opt.value)}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                              prediction === opt.value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(playModal.gameType === 'spin_wheel' || playModal.gameType === 'scratch_card') && (
                    <p className="mb-4 text-sm text-gray-500">No prediction needed — just place your bet!</p>
                  )}

                  {/* Play Button */}
                  <button
                    onClick={handlePlay}
                    disabled={playing}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {playing ? 'Playing...' : 'Play'}
                  </button>
                </>
              ) : (
                /* Result Display */
                <div className="text-center py-4">
                  <div className={`text-5xl mb-3 ${playResult.result.won ? 'animate-bounce' : ''}`}>
                    {playResult.result.won ? '\u{1F389}' : '\u{1F614}'}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${playResult.result.won ? 'text-green-600' : 'text-red-600'}`}>
                    {playResult.result.won ? 'You Won!' : 'You Lost'}
                  </h3>
                  {playResult.result.won && (
                    <p className="text-lg font-mono font-semibold text-green-600 mb-1">
                      +{playResult.result.payout.toFixed(2)} Guincoin
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    New balance: <span className="font-mono font-medium">{playResult.balance.toFixed(2)}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPlayResult(null);
                        setPrediction(null);
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Play Again
                    </button>
                    <button
                      onClick={closePlayModal}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
