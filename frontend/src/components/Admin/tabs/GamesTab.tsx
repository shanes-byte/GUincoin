import { AdminGameConfig, GameType, Jackpot } from '../../../services/api';

const GAME_NAMES: Record<string, string> = {
  coin_flip: 'Coin Flip',
  dice_roll: 'Dice Roll',
  spin_wheel: 'Spin the Wheel',
  higher_lower: 'Higher or Lower',
  scratch_card: 'Scratch Card',
  daily_bonus: 'Daily Bonus',
};

interface GamesTabProps {
  gameConfigs: AdminGameConfig[];
  gameConfigsLoading: boolean;
  jackpots: Jackpot[];
  onToggleGame: (gameType: GameType) => void;
  onUpdateConfig: (gameType: GameType, data: Partial<AdminGameConfig>) => void;
  onToggleJackpot: (jackpotId: string) => void;
  onInitializeJackpots: () => void;
  onRefresh: () => void;
}

export default function GamesTab({
  gameConfigs,
  gameConfigsLoading,
  jackpots,
  onToggleGame,
  onUpdateConfig,
  onToggleJackpot,
  onInitializeJackpots,
  onRefresh,
}: GamesTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Game Management</h2>
          <p className="text-sm text-gray-500">Enable, disable, and configure games</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={gameConfigsLoading}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
        >
          {gameConfigsLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Game Configs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">Game Configurations</h3>
        </div>

        {gameConfigsLoading && gameConfigs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading game configs...</div>
        ) : gameConfigs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No game configurations found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {gameConfigs.map((config) => (
              <div key={config.gameType} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      {GAME_NAMES[config.gameType] || config.gameType}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        config.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleGame(config.gameType)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Min Bet */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Bet</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.minBet}
                      onChange={(e) =>
                        onUpdateConfig(config.gameType, { minBet: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Max Bet */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Bet</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.maxBet}
                      onChange={(e) =>
                        onUpdateConfig(config.gameType, { maxBet: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Web */}
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.availableOnWeb}
                        onChange={(e) =>
                          onUpdateConfig(config.gameType, { availableOnWeb: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Web
                    </label>
                  </div>

                  {/* Chat */}
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.availableInChat}
                        onChange={(e) =>
                          onUpdateConfig(config.gameType, { availableInChat: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Chat
                    </label>
                  </div>
                </div>

                {/* Jackpot contribution rate */}
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Jackpot Contribution ({(config.jackpotContributionRate * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={config.jackpotContributionRate}
                    onChange={(e) =>
                      onUpdateConfig(config.gameType, {
                        jackpotContributionRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jackpots */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">Jackpots</h3>
          {jackpots.length === 0 && (
            <button
              onClick={onInitializeJackpots}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600"
            >
              Initialize Default Jackpots
            </button>
          )}
        </div>

        {jackpots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jackpots configured. Click "Initialize Default Jackpots" to create them.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jackpots.map((jp) => (
              <div key={jp.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{jp.name}</h4>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="capitalize">{jp.type} jackpot</span>
                    <span className="font-mono font-semibold text-amber-600">
                      Balance: {jp.balance.toFixed(2)}
                    </span>
                    {jp.lastWonAmount != null && (
                      <span>Last won: {jp.lastWonAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onToggleJackpot(jp.id)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Toggle Active
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
