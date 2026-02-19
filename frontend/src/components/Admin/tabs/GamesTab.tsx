import { useState } from 'react';
import { AdminGameConfig, GameType, Jackpot } from '../../../services/api';

const GAME_NAMES: Record<string, string> = {
  coin_flip: 'Coin Flip',
  dice_roll: 'Dice Roll',
  spin_wheel: 'Spin the Wheel',
  higher_lower: 'Higher or Lower',
  scratch_card: 'Scratch Card',
  daily_bonus: 'Daily Bonus',
};

const FAIR_MULTIPLIERS: Record<string, number> = {
  coin_flip: 2.0,
  dice_roll: 6.0,
  higher_lower: 2.0,
};

interface GamesTabProps {
  gameConfigs: AdminGameConfig[];
  gameConfigsLoading: boolean;
  jackpots: Jackpot[];
  bankBalance: number;
  bankLoading: boolean;
  onToggleGame: (gameType: GameType) => void;
  onUpdateConfig: (gameType: GameType, data: Partial<AdminGameConfig>) => void;
  onToggleJackpot: (jackpotId: string) => void;
  onInitializeJackpots: () => void;
  onDeposit: (amount: number) => void;
  onTransferFromJackpot: (jackpotId: string, amount: number) => void;
  onRefresh: () => void;
}

export default function GamesTab({
  gameConfigs,
  gameConfigsLoading,
  jackpots,
  bankBalance,
  bankLoading,
  onToggleGame,
  onUpdateConfig,
  onToggleJackpot,
  onInitializeJackpots,
  onDeposit,
  onTransferFromJackpot,
  onRefresh,
}: GamesTabProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [showTransferInput, setShowTransferInput] = useState(false);
  const [transferJackpotId, setTransferJackpotId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!isNaN(amount) && amount > 0) {
      onDeposit(amount);
      setDepositAmount('');
      setShowDepositInput(false);
    }
  };

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (!isNaN(amount) && amount > 0 && transferJackpotId) {
      onTransferFromJackpot(transferJackpotId, amount);
      setTransferAmount('');
      setTransferJackpotId('');
      setShowTransferInput(false);
    }
  };

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

      {/* Games Bank Account */}
      <div className={`bg-white shadow rounded-lg overflow-hidden border-2 ${
        bankBalance > 0 ? 'border-green-200' : 'border-red-200'
      }`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">Games Bank Account</h3>
        </div>
        <div className="px-6 py-5">
          {bankLoading ? (
            <div className="text-center text-gray-500">Loading bank balance...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bank Balance</p>
                  <p className={`text-3xl font-bold font-mono ${
                    bankBalance > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {bankBalance.toFixed(2)} <span className="text-lg font-normal">GC</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDepositInput(!showDepositInput); setShowTransferInput(false); }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Deposit Funds
                  </button>
                  {jackpots.length > 0 && (
                    <button
                      onClick={() => { setShowTransferInput(!showTransferInput); setShowDepositInput(false); }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
                    >
                      Transfer from Jackpot
                    </button>
                  )}
                </div>
              </div>

              {/* Warning banner */}
              {bankBalance <= 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
                  <p className="text-sm font-medium text-red-800">
                    Games are auto-disabled — add funds to re-enable
                  </p>
                </div>
              )}

              {/* Deposit Input */}
              {showDepositInput && (
                <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-md p-3">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setShowDepositInput(false); setDepositAmount(''); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Transfer from Jackpot Input */}
              {showTransferInput && (
                <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-md p-3 flex-wrap">
                  <select
                    value={transferJackpotId}
                    onChange={(e) => setTransferJackpotId(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Select jackpot...</option>
                    {jackpots.filter(jp => jp.balance > 0).map((jp) => (
                      <option key={jp.id} value={jp.id}>
                        {jp.name} ({jp.balance.toFixed(2)} GC)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <button
                    onClick={handleTransfer}
                    disabled={!transferJackpotId || !transferAmount || parseFloat(transferAmount) <= 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => { setShowTransferInput(false); setTransferAmount(''); setTransferJackpotId(''); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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
            {gameConfigs.map((config) => {
              const fairMultiplier = FAIR_MULTIPLIERS[config.gameType];
              const effectiveMultiplier = fairMultiplier
                ? (fairMultiplier * (1 - (config.houseEdgePercent || 0) / 100)).toFixed(2)
                : null;

              return (
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

                  {/* House Edge */}
                  {config.gameType !== 'daily_bonus' && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        House Edge ({(config.houseEdgePercent || 0).toFixed(1)}%)
                        {effectiveMultiplier && (
                          <span className="ml-2 text-blue-600 font-medium">
                            Effective multiplier: {effectiveMultiplier}x
                          </span>
                        )}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="0.5"
                        value={config.houseEdgePercent || 0}
                        onChange={(e) =>
                          onUpdateConfig(config.gameType, {
                            houseEdgePercent: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
