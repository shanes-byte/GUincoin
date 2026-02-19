// [ORIGINAL - 2026-02-12] Stub-only gameEngine (getGameConfig returned { type, enabled: false, config: {} })
// [ORIGINAL - 2026-02-12] Stub-only jackpotService (toggleJackpot, adminAdjustBalance, triggerScheduledDrawing,
//   initializeJackpots, getJackpotStatus all returned mock data)

import crypto from 'crypto';
import { Prisma, GameType, GameStatus, GameTxType, JackpotType, TransactionType } from '@prisma/client';
import prisma from '../config/database';

// ============================================================================
// Constants & Configuration
// ============================================================================

const FAIR_MULTIPLIERS: Record<string, number> = {
  coin_flip: 2.0,
  dice_roll: 6.0,
  higher_lower: 2.0,
};

const WHEEL_SEGMENTS = [
  { multiplier: 0, weight: 10, label: 'Lose', color: '#ef4444' },
  { multiplier: 0.5, weight: 20, label: '0.5x', color: '#f97316' },
  { multiplier: 1, weight: 25, label: '1x', color: '#eab308' },
  { multiplier: 1.5, weight: 15, label: '1.5x', color: '#84cc16' },
  { multiplier: 2, weight: 12, label: '2x', color: '#22c55e' },
  { multiplier: 3, weight: 8, label: '3x', color: '#14b8a6' },
  { multiplier: 5, weight: 5, label: '5x', color: '#3b82f6' },
  { multiplier: 10, weight: 3, label: '10x', color: '#8b5cf6' },
  { multiplier: 0.5, weight: 15, label: '0.5x', color: '#f97316' },
  { multiplier: 1, weight: 12, label: '1x', color: '#eab308' },
];

const TOTAL_WHEEL_WEIGHT = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

const SCRATCH_CARD_SYMBOLS = [
  { symbol: 'cherry', multiplier: 0.5, weight: 30 },
  { symbol: 'lemon', multiplier: 1, weight: 25 },
  { symbol: 'orange', multiplier: 2, weight: 18 },
  { symbol: 'grape', multiplier: 5, weight: 12 },
  { symbol: 'bell', multiplier: 10, weight: 8 },
  { symbol: 'seven', multiplier: 50, weight: 4 },
  { symbol: 'blank', multiplier: 0, weight: 28 },
];

const TOTAL_SCRATCH_WEIGHT = SCRATCH_CARD_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

const DAILY_BONUS_PRIZES = [0.5, 1, 1.5, 2, 3, 5, 0.25, 1, 0.5, 2];

const DEFAULT_GAME_CONFIGS: Record<string, {
  enabled: boolean;
  minBet: number;
  maxBet: number;
  jackpotContributionRate: number;
  availableInChat: boolean;
  availableOnWeb: boolean;
}> = {
  coin_flip: { enabled: true, minBet: 1, maxBet: 500, jackpotContributionRate: 0.05, availableInChat: true, availableOnWeb: true },
  dice_roll: { enabled: true, minBet: 1, maxBet: 500, jackpotContributionRate: 0.05, availableInChat: true, availableOnWeb: true },
  spin_wheel: { enabled: true, minBet: 1, maxBet: 200, jackpotContributionRate: 0.05, availableInChat: true, availableOnWeb: true },
  higher_lower: { enabled: true, minBet: 1, maxBet: 500, jackpotContributionRate: 0.05, availableInChat: true, availableOnWeb: true },
  scratch_card: { enabled: true, minBet: 2, maxBet: 100, jackpotContributionRate: 0.05, availableInChat: false, availableOnWeb: true },
  daily_bonus: { enabled: true, minBet: 0, maxBet: 0, jackpotContributionRate: 0, availableInChat: true, availableOnWeb: true },
};

// ============================================================================
// Game Bank Account Helpers
// ============================================================================

/**
 * Returns the singleton GameBankAccount, creating with balance=0 if absent.
 * Works inside or outside a Prisma transaction.
 */
async function getOrCreateBankAccount(tx?: any) {
  const client = tx || prisma;
  let bank = await client.gameBankAccount.findFirst();
  if (!bank) {
    bank = await client.gameBankAccount.create({
      data: { balance: new Prisma.Decimal(0) },
    });
  }
  return bank;
}

/**
 * If bankAccount.balance <= 0, sets ALL GameConfig.enabled = false.
 * Returns whether games were disabled.
 */
async function checkAndAutoDisable(tx: any, bankBalance: Prisma.Decimal): Promise<boolean> {
  if (bankBalance.lte(new Prisma.Decimal(0))) {
    await tx.gameConfig.updateMany({
      data: { enabled: false },
    });
    console.log('[Games] Bank depleted — all games auto-disabled');
    return true;
  }
  return false;
}

// ============================================================================
// Provably Fair Helpers
// ============================================================================

function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a provably fair random number from seeds.
 * Returns an integer derived from the first 8 hex chars of the HMAC digest.
 */
function generateHmacResult(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = crypto.createHmac('sha256', serverSeed)
    .update(clientSeed + ':' + nonce)
    .digest('hex');
  return parseInt(hmac.substring(0, 8), 16);
}

// ============================================================================
// Game Resolution Logic
// ============================================================================

interface GameOutcome {
  outcome: any;
  won: boolean;
  multiplier: number;
}

// [ORIGINAL - 2026-02-19] resolveCoinFlip returned hardcoded multiplier 1.95
// House edge is now applied in playGame() payout calculation, so return fair multiplier
function resolveCoinFlip(hmacResult: number, prediction: any): GameOutcome {
  const result = hmacResult % 2; // 0 = heads, 1 = tails
  const resultLabel = result === 0 ? 'heads' : 'tails';
  const playerPick = String(prediction).toLowerCase();
  const won = playerPick === resultLabel;
  return {
    outcome: { result: resultLabel, playerPick },
    won,
    multiplier: won ? FAIR_MULTIPLIERS.coin_flip : 0,
  };
}

// [ORIGINAL - 2026-02-19] resolveDiceRoll returned hardcoded multiplier 5.7
function resolveDiceRoll(hmacResult: number, prediction: any): GameOutcome {
  const result = (hmacResult % 6) + 1;
  const playerPick = Number(prediction);
  const won = playerPick === result;
  return {
    outcome: { result, playerPick },
    won,
    multiplier: won ? FAIR_MULTIPLIERS.dice_roll : 0,
  };
}

function resolveSpinWheel(hmacResult: number): GameOutcome {
  const roll = hmacResult % TOTAL_WHEEL_WEIGHT;
  let cumulative = 0;
  let selectedSegment = WHEEL_SEGMENTS[0];
  let segmentIndex = 0;

  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    cumulative += WHEEL_SEGMENTS[i].weight;
    if (roll < cumulative) {
      selectedSegment = WHEEL_SEGMENTS[i];
      segmentIndex = i;
      break;
    }
  }

  return {
    outcome: {
      segmentIndex,
      label: selectedSegment.label,
      color: selectedSegment.color,
      multiplier: selectedSegment.multiplier,
    },
    won: selectedSegment.multiplier > 0,
    multiplier: selectedSegment.multiplier,
  };
}

// [ORIGINAL - 2026-02-19] resolveHigherLower returned hardcoded multiplier 1.95
function resolveHigherLower(hmacResult: number, prediction: any): GameOutcome {
  const generatedNumber = (hmacResult % 100) + 1;
  const playerPick = String(prediction).toLowerCase(); // 'higher' or 'lower'
  let won = false;

  if (playerPick === 'higher') {
    won = generatedNumber > 50;
  } else if (playerPick === 'lower') {
    won = generatedNumber < 50;
  }
  // Exactly 50 is a loss for both picks

  return {
    outcome: { generatedNumber, playerPick, threshold: 50 },
    won,
    multiplier: won ? FAIR_MULTIPLIERS.higher_lower : 0,
  };
}

function resolveScratchCard(serverSeed: string, clientSeed: string, nonce: number): GameOutcome {
  // Generate 9 cells by using nonce offsets 0..8
  const grid: Array<{ symbol: string; multiplier: number }> = [];
  for (let i = 0; i < 9; i++) {
    const cellHmac = generateHmacResult(serverSeed, clientSeed, nonce * 10 + i);
    const roll = cellHmac % TOTAL_SCRATCH_WEIGHT;
    let cumulative = 0;
    let selectedSymbol = SCRATCH_CARD_SYMBOLS[0];

    for (const sym of SCRATCH_CARD_SYMBOLS) {
      cumulative += sym.weight;
      if (roll < cumulative) {
        selectedSymbol = sym;
        break;
      }
    }
    grid.push({ symbol: selectedSymbol.symbol, multiplier: selectedSymbol.multiplier });
  }

  // Check for 3 matching symbols (rows, columns, diagonals)
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  let bestMultiplier = 0;
  let matchedLine: number[] | null = null;
  let matchedSymbol: string | null = null;

  for (const line of lines) {
    const [a, b, c] = line;
    if (
      grid[a].symbol === grid[b].symbol &&
      grid[b].symbol === grid[c].symbol &&
      grid[a].symbol !== 'blank'
    ) {
      if (grid[a].multiplier > bestMultiplier) {
        bestMultiplier = grid[a].multiplier;
        matchedLine = line;
        matchedSymbol = grid[a].symbol;
      }
    }
  }

  return {
    outcome: {
      grid: grid.map(cell => cell.symbol),
      matchedLine,
      matchedSymbol,
      multiplier: bestMultiplier,
    },
    won: bestMultiplier > 0,
    multiplier: bestMultiplier,
  };
}

function resolveDailyBonus(hmacResult: number): GameOutcome {
  const segmentIndex = hmacResult % DAILY_BONUS_PRIZES.length;
  const prize = DAILY_BONUS_PRIZES[segmentIndex];

  return {
    outcome: { segmentIndex, prize, prizes: DAILY_BONUS_PRIZES },
    won: true,
    multiplier: prize, // The prize IS the multiplier of the "free" 1-coin bet
  };
}

// ============================================================================
// Game Engine
// ============================================================================

export const gameEngine = {
  /**
   * Returns game config from DB, falling back to defaults.
   */
  async getGameConfig(type: GameType) {
    const dbConfig = await prisma.gameConfig.findUnique({
      where: { gameType: type },
    });

    if (dbConfig) {
      return {
        enabled: dbConfig.enabled,
        minBet: Number(dbConfig.minBet),
        maxBet: Number(dbConfig.maxBet),
        jackpotContributionRate: Number(dbConfig.jackpotContributionRate),
        houseEdgePercent: Number(dbConfig.houseEdgePercent),
        availableInChat: dbConfig.availableInChat,
        availableOnWeb: dbConfig.availableOnWeb,
        payoutMultiplier: dbConfig.payoutMultiplier ? Number(dbConfig.payoutMultiplier) : null,
        customConfig: dbConfig.customConfig,
      };
    }

    const defaults = DEFAULT_GAME_CONFIGS[type] || DEFAULT_GAME_CONFIGS.coin_flip;
    return {
      enabled: defaults.enabled,
      minBet: defaults.minBet,
      maxBet: defaults.maxBet,
      jackpotContributionRate: defaults.jackpotContributionRate,
      houseEdgePercent: 5, // Default 5% house edge
      availableInChat: defaults.availableInChat,
      availableOnWeb: defaults.availableOnWeb,
      payoutMultiplier: null,
      customConfig: null,
    };
  },

  /**
   * Returns default payout multiplier for each game type.
   */
  getDefaultPayoutMultiplier(type: GameType): number {
    switch (type) {
      case 'coin_flip': return 1.95;
      case 'dice_roll': return 5.7;
      case 'spin_wheel': return 1; // variable — this is a placeholder base
      case 'higher_lower': return 1.95;
      case 'scratch_card': return 1; // variable
      case 'daily_bonus': return 1;
      default: return 1;
    }
  },

  /**
   * Core game play function. Executes the full game lifecycle inside a
   * serializable transaction: balance check, debit, outcome, credit, stats.
   */
  async playGame(params: {
    employeeId: string;
    gameType: GameType;
    bet: number;
    prediction?: any;
    clientSeed?: string;
  }) {
    const { employeeId, gameType, bet, prediction, clientSeed: providedClientSeed } = params;

    // Pre-flight validation
    if (gameType === 'daily_bonus') {
      throw new Error('Use playDailyBonus() for the daily bonus game');
    }

    const config = await this.getGameConfig(gameType);

    if (!config.enabled) {
      throw new Error(`Game "${gameType}" is currently disabled`);
    }
    if (!config.availableOnWeb) {
      throw new Error(`Game "${gameType}" is not available on web`);
    }
    if (bet < config.minBet) {
      throw new Error(`Minimum bet is ${config.minBet} Guincoins`);
    }
    if (bet > config.maxBet) {
      throw new Error(`Maximum bet is ${config.maxBet} Guincoins`);
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = providedClientSeed || generateClientSeed();
    const betDecimal = new Prisma.Decimal(bet);

    const result = await prisma.$transaction(async (tx) => {
      // 0. Pre-check: Fetch bank account, reject if depleted
      const bankAccount = await getOrCreateBankAccount(tx);
      if (new Prisma.Decimal(bankAccount.balance).lte(new Prisma.Decimal(0))) {
        throw new Error('Games are currently unavailable — bank depleted');
      }

      // 1. Look up player's account and check balance
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { account: true },
      });

      if (!employee || !employee.account) {
        throw new Error('Player account not found');
      }

      const account = employee.account;
      const currentBalance = Number(account.balance);

      if (currentBalance < bet) {
        throw new Error('Insufficient balance');
      }

      // 2. Determine nonce (count of games played by this employee)
      const nonce = await tx.game.count({
        where: { createdById: employeeId },
      });

      // 3. Debit the bet from the player's account
      await tx.account.update({
        where: { id: account.id },
        data: { balance: { decrement: betDecimal } },
      });

      // 4. Create the bet ledger transaction
      const betLedgerTx = await tx.ledgerTransaction.create({
        data: {
          accountId: account.id,
          transactionType: TransactionType.game_bet,
          amount: betDecimal,
          status: 'posted',
          postedAt: new Date(),
          description: `${gameType} bet`,
          sourceEmployeeId: employeeId,
        },
      });

      // 5. Generate provably fair outcome
      const hmacResult = generateHmacResult(serverSeed, clientSeed, nonce);
      let gameOutcome: GameOutcome;

      switch (gameType) {
        case 'coin_flip':
          gameOutcome = resolveCoinFlip(hmacResult, prediction);
          break;
        case 'dice_roll':
          gameOutcome = resolveDiceRoll(hmacResult, prediction);
          break;
        case 'spin_wheel':
          gameOutcome = resolveSpinWheel(hmacResult);
          break;
        case 'higher_lower':
          gameOutcome = resolveHigherLower(hmacResult, prediction);
          break;
        case 'scratch_card':
          gameOutcome = resolveScratchCard(serverSeed, clientSeed, nonce);
          break;
        default:
          throw new Error(`Game type "${gameType}" is not implemented`);
      }

      // [ORIGINAL - 2026-02-19] Payout used raw multiplier from resolve functions (already had edge baked in)
      // const payoutAmount = gameOutcome.won
      //   ? new Prisma.Decimal(bet).mul(new Prisma.Decimal(gameOutcome.multiplier))
      //   : new Prisma.Decimal(0);

      // 6. Calculate payout with house edge
      const houseEdgeFactor = 1 - (config.houseEdgePercent / 100);
      let effectiveMultiplier = 0;

      if (gameOutcome.won) {
        if (gameType === 'spin_wheel' || gameType === 'scratch_card') {
          // For variable-multiplier games, scale the outcome multiplier
          effectiveMultiplier = gameOutcome.multiplier * houseEdgeFactor;
        } else {
          // For fixed-multiplier games, apply house edge to fair multiplier
          const fairMultiplier = FAIR_MULTIPLIERS[gameType] || gameOutcome.multiplier;
          effectiveMultiplier = fairMultiplier * houseEdgeFactor;
        }
      }

      const payoutAmount = gameOutcome.won
        ? new Prisma.Decimal(bet).mul(new Prisma.Decimal(effectiveMultiplier))
        : new Prisma.Decimal(0);

      // 7. Credit winnings if won
      let winLedgerTx = null;
      if (gameOutcome.won && payoutAmount.greaterThan(0)) {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: payoutAmount } },
        });

        winLedgerTx = await tx.ledgerTransaction.create({
          data: {
            accountId: account.id,
            transactionType: TransactionType.game_win,
            amount: payoutAmount,
            status: 'posted',
            postedAt: new Date(),
            description: `${gameType} win (${effectiveMultiplier.toFixed(2)}x)`,
            targetEmployeeId: employeeId,
          },
        });
      }

      // [ORIGINAL - 2026-02-19] Jackpot contribution was deducted from player as extra charge on top of bet
      // if (config.jackpotContributionRate > 0) {
      //   jackpotContribution = betDecimal.mul(new Prisma.Decimal(config.jackpotContributionRate));
      //   ... deducted from player account ...
      // }

      // 8. Handle bank + jackpot flow (jackpot funded from bet, not extra player charge)
      let jackpotContribution = new Prisma.Decimal(0);
      let jackpotLedgerTx = null;

      if (gameOutcome.won) {
        // WIN: bank receives bet, bank pays payout → net: bank += bet - payout
        const bankDelta = betDecimal.sub(payoutAmount); // negative when payout > bet
        await tx.gameBankAccount.update({
          where: { id: bankAccount.id },
          data: { balance: { increment: bankDelta } },
        });
      } else {
        // LOSS: X% of bet goes to jackpot, rest goes to bank
        if (config.jackpotContributionRate > 0) {
          jackpotContribution = betDecimal.mul(new Prisma.Decimal(config.jackpotContributionRate));

          const activeJackpot = await tx.jackpot.findFirst({
            where: { isActive: true, type: 'rolling' },
          });

          if (activeJackpot && jackpotContribution.greaterThan(0)) {
            await tx.jackpot.update({
              where: { id: activeJackpot.id },
              data: { balance: { increment: jackpotContribution } },
            });

            // Create jackpot contribution ledger transaction (no player debit — comes from bet)
            jackpotLedgerTx = await tx.ledgerTransaction.create({
              data: {
                accountId: account.id,
                transactionType: TransactionType.jackpot_contribution,
                amount: jackpotContribution,
                status: 'posted',
                postedAt: new Date(),
                description: `Jackpot contribution from ${gameType} (from bet)`,
                sourceEmployeeId: employeeId,
              },
            });
          }
        }

        // Bank receives bet minus jackpot contribution
        const bankGain = betDecimal.sub(jackpotContribution);
        await tx.gameBankAccount.update({
          where: { id: bankAccount.id },
          data: { balance: { increment: bankGain } },
        });
      }

      // Check if bank is depleted after this game
      const updatedBank = await tx.gameBankAccount.findFirst();
      if (updatedBank) {
        await checkAndAutoDisable(tx, new Prisma.Decimal(updatedBank.balance));
      }

      // 9. Create Game record
      const game = await tx.game.create({
        data: {
          type: gameType,
          status: GameStatus.completed,
          startedAt: new Date(),
          completedAt: new Date(),
          config: {
            minBet: config.minBet,
            maxBet: config.maxBet,
            jackpotContributionRate: config.jackpotContributionRate,
          },
          result: gameOutcome.outcome,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          createdById: employeeId,
        },
      });

      // 10. Create GameParticipant record
      const participant = await tx.gameParticipant.create({
        data: {
          gameId: game.id,
          employeeId,
          betAmount: betDecimal,
          prediction: prediction !== undefined ? prediction : Prisma.JsonNull,
          payout: gameOutcome.won ? payoutAmount : new Prisma.Decimal(0),
          isWinner: gameOutcome.won,
        },
      });

      // 11. Create GameTransaction records
      await tx.gameTransaction.create({
        data: {
          gameId: game.id,
          participantId: participant.id,
          transactionId: betLedgerTx.id,
          type: GameTxType.bet,
          amount: betDecimal,
        },
      });

      if (winLedgerTx) {
        await tx.gameTransaction.create({
          data: {
            gameId: game.id,
            participantId: participant.id,
            transactionId: winLedgerTx.id,
            type: GameTxType.payout,
            amount: payoutAmount,
          },
        });
      }

      if (jackpotLedgerTx) {
        const activeJackpotForRecord = await tx.jackpot.findFirst({
          where: { isActive: true, type: 'rolling' },
        });

        if (activeJackpotForRecord) {
          await tx.jackpotContribution.create({
            data: {
              jackpotId: activeJackpotForRecord.id,
              gameId: game.id,
              employeeId,
              amount: jackpotContribution,
            },
          });
        }

        await tx.gameTransaction.create({
          data: {
            gameId: game.id,
            participantId: participant.id,
            transactionId: jackpotLedgerTx.id,
            type: GameTxType.jackpot_in,
            amount: jackpotContribution,
          },
        });
      }

      // 12. Update GameStats (upsert)
      const netProfit = Number(payoutAmount) - bet;
      const gameTypeKey = gameType as string;

      const existingStats = await tx.gameStats.findUnique({
        where: { employeeId },
      });

      const existingStatsByGame: Record<string, any> = existingStats?.statsByGame
        ? (typeof existingStats.statsByGame === 'object' ? existingStats.statsByGame as Record<string, any> : {})
        : {};

      const gameTypeStats = existingStatsByGame[gameTypeKey] || {
        played: 0,
        won: 0,
        totalBet: 0,
        totalWon: 0,
      };

      gameTypeStats.played += 1;
      if (gameOutcome.won) gameTypeStats.won += 1;
      gameTypeStats.totalBet = (gameTypeStats.totalBet || 0) + bet;
      gameTypeStats.totalWon = (gameTypeStats.totalWon || 0) + Number(payoutAmount);

      existingStatsByGame[gameTypeKey] = gameTypeStats;

      const currentWinStreak = existingStats
        ? (gameOutcome.won ? existingStats.currentWinStreak + 1 : 0)
        : (gameOutcome.won ? 1 : 0);

      const longestWinStreak = existingStats
        ? Math.max(existingStats.longestWinStreak, currentWinStreak)
        : currentWinStreak;

      await tx.gameStats.upsert({
        where: { employeeId },
        update: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: gameOutcome.won ? 1 : 0 },
          totalBet: { increment: betDecimal },
          totalWon: { increment: payoutAmount },
          netProfit: { increment: new Prisma.Decimal(netProfit) },
          currentWinStreak,
          longestWinStreak,
          statsByGame: existingStatsByGame,
        },
        create: {
          employeeId,
          gamesPlayed: 1,
          gamesWon: gameOutcome.won ? 1 : 0,
          totalBet: betDecimal,
          totalWon: payoutAmount,
          netProfit: new Prisma.Decimal(netProfit),
          currentWinStreak,
          longestWinStreak,
          statsByGame: existingStatsByGame,
        },
      });

      // 13. Get updated balance
      const updatedAccount = await tx.account.findUnique({
        where: { id: account.id },
      });

      return {
        game,
        result: {
          outcome: gameOutcome.outcome,
          won: gameOutcome.won,
          payout: Number(payoutAmount),
          jackpotContribution: Number(jackpotContribution),
          multiplier: effectiveMultiplier,
          serverSeedHash,
        },
        balance: Number(updatedAccount!.balance),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return result;
  },

  /**
   * Free daily bonus spin. One per calendar day, no bet required.
   */
  async playDailyBonus(employeeId: string) {
    const config = await this.getGameConfig(GameType.daily_bonus);

    if (!config.enabled) {
      throw new Error('Daily bonus is currently disabled');
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = generateClientSeed();

    const result = await prisma.$transaction(async (tx) => {
      // 0. Pre-check: Fetch bank account, reject if depleted
      const bankAccount = await getOrCreateBankAccount(tx);
      if (new Prisma.Decimal(bankAccount.balance).lte(new Prisma.Decimal(0))) {
        throw new Error('Games are currently unavailable — bank depleted');
      }

      // 1. Check if the player already claimed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const existingSpin = await tx.dailyBonusSpin.findFirst({
        where: {
          employeeId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      });

      if (existingSpin) {
        throw new Error('You have already claimed your daily bonus today');
      }

      // 2. Look up player's account
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { account: true },
      });

      if (!employee || !employee.account) {
        throw new Error('Player account not found');
      }

      const account = employee.account;

      // 3. Determine nonce
      const nonce = await tx.game.count({
        where: { createdById: employeeId },
      });

      // 4. Generate outcome
      const hmacResult = generateHmacResult(serverSeed, clientSeed, nonce);
      const gameOutcome = resolveDailyBonus(hmacResult);
      const prizeAmount = new Prisma.Decimal(gameOutcome.outcome.prize);

      // 5. Credit the prize
      await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: prizeAmount } },
      });

      // 5b. Debit prize from bank account
      await tx.gameBankAccount.update({
        where: { id: bankAccount.id },
        data: { balance: { decrement: prizeAmount } },
      });

      // 6. Create the daily_bonus ledger transaction
      const bonusLedgerTx = await tx.ledgerTransaction.create({
        data: {
          accountId: account.id,
          transactionType: TransactionType.daily_bonus,
          amount: prizeAmount,
          status: 'posted',
          postedAt: new Date(),
          description: `Daily bonus spin: ${gameOutcome.outcome.prize} Guincoins`,
          targetEmployeeId: employeeId,
        },
      });

      // 7. Record DailyBonusSpin
      await tx.dailyBonusSpin.create({
        data: {
          employeeId,
          prize: prizeAmount,
          segmentIndex: gameOutcome.outcome.segmentIndex,
        },
      });

      // 8. Create Game record
      const game = await tx.game.create({
        data: {
          type: GameType.daily_bonus,
          status: GameStatus.completed,
          startedAt: new Date(),
          completedAt: new Date(),
          config: { type: 'daily_bonus' },
          result: gameOutcome.outcome,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          createdById: employeeId,
        },
      });

      // 9. Create GameParticipant
      const participant = await tx.gameParticipant.create({
        data: {
          gameId: game.id,
          employeeId,
          betAmount: new Prisma.Decimal(0),
          prediction: Prisma.JsonNull,
          payout: prizeAmount,
          isWinner: true,
        },
      });

      // 10. Create GameTransaction
      await tx.gameTransaction.create({
        data: {
          gameId: game.id,
          participantId: participant.id,
          transactionId: bonusLedgerTx.id,
          type: GameTxType.payout,
          amount: prizeAmount,
        },
      });

      // 11. Update GameStats
      const existingStats = await tx.gameStats.findUnique({
        where: { employeeId },
      });

      const existingStatsByGame: Record<string, any> = existingStats?.statsByGame
        ? (typeof existingStats.statsByGame === 'object' ? existingStats.statsByGame as Record<string, any> : {})
        : {};

      const dailyStats = existingStatsByGame['daily_bonus'] || {
        played: 0,
        won: 0,
        totalBet: 0,
        totalWon: 0,
      };

      dailyStats.played += 1;
      dailyStats.won += 1;
      dailyStats.totalWon = (dailyStats.totalWon || 0) + Number(prizeAmount);
      existingStatsByGame['daily_bonus'] = dailyStats;

      const currentWinStreak = existingStats
        ? existingStats.currentWinStreak + 1
        : 1;
      const longestWinStreak = existingStats
        ? Math.max(existingStats.longestWinStreak, currentWinStreak)
        : 1;

      await tx.gameStats.upsert({
        where: { employeeId },
        update: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: 1 },
          totalWon: { increment: prizeAmount },
          netProfit: { increment: prizeAmount },
          currentWinStreak,
          longestWinStreak,
          statsByGame: existingStatsByGame,
        },
        create: {
          employeeId,
          gamesPlayed: 1,
          gamesWon: 1,
          totalBet: new Prisma.Decimal(0),
          totalWon: prizeAmount,
          netProfit: prizeAmount,
          currentWinStreak: 1,
          longestWinStreak: 1,
          statsByGame: existingStatsByGame,
        },
      });

      // 12. Check if bank is depleted after daily bonus
      const updatedBank = await tx.gameBankAccount.findFirst();
      if (updatedBank) {
        await checkAndAutoDisable(tx, new Prisma.Decimal(updatedBank.balance));
      }

      // 13. Get updated balance
      const updatedAccount = await tx.account.findUnique({
        where: { id: account.id },
      });

      return {
        game,
        result: {
          outcome: gameOutcome.outcome,
          won: true,
          payout: Number(prizeAmount),
          jackpotContribution: 0,
          multiplier: gameOutcome.multiplier,
          serverSeedHash,
        },
        balance: Number(updatedAccount!.balance),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return result;
  },

  /**
   * Provably fair verification. Allows anyone to verify that a game outcome
   * was determined fairly by the server seed, client seed, and nonce.
   */
  verifyOutcome(params: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    expectedOutcome: number;
    maxValue: number;
  }): { verified: boolean; computedResult: number; expectedOutcome: number } {
    const hmacResult = generateHmacResult(params.serverSeed, params.clientSeed, params.nonce);
    const computedResult = hmacResult % params.maxValue;

    return {
      verified: computedResult === params.expectedOutcome,
      computedResult,
      expectedOutcome: params.expectedOutcome,
    };
  },
};

// ============================================================================
// Jackpot Service
// ============================================================================

export const jackpotService = {
  /**
   * Toggle jackpot active status.
   */
  async toggleJackpot(jackpotId: string) {
    const existing = await prisma.jackpot.findUnique({
      where: { id: jackpotId },
    });

    if (!existing) {
      throw new Error('Jackpot not found');
    }

    const updated = await prisma.jackpot.update({
      where: { id: jackpotId },
      data: { isActive: !existing.isActive },
    });

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      balance: Number(updated.balance),
      isActive: updated.isActive,
    };
  },

  /**
   * Admin adjustment of jackpot balance with audit trail.
   */
  async adminAdjustBalance(
    jackpotId: string,
    amount: number,
    adminId: string,
    reason?: string
  ) {
    const jackpot = await prisma.jackpot.findUnique({
      where: { id: jackpotId },
    });

    if (!jackpot) {
      throw new Error('Jackpot not found');
    }

    const newBalance = Number(jackpot.balance) + amount;
    if (newBalance < 0) {
      throw new Error('Adjustment would result in negative jackpot balance');
    }

    const updated = await prisma.jackpot.update({
      where: { id: jackpotId },
      data: {
        balance: new Prisma.Decimal(newBalance),
      },
    });

    // Log the adjustment (non-blocking)
    console.log(
      `[Jackpot] Admin ${adminId} adjusted jackpot "${updated.name}" by ${amount}. ` +
      `New balance: ${newBalance}. Reason: ${reason || 'No reason provided'}`
    );

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      balance: Number(updated.balance),
      isActive: updated.isActive,
      newBalance: Number(updated.balance),
    };
  },

  /**
   * Trigger a scheduled jackpot drawing. Picks a random contributor as the winner.
   * Accepts either a jackpotId (UUID) or a JackpotType string.
   */
  async triggerScheduledDrawing(jackpotIdOrType: string) {
    // Determine if this is a jackpot type or an ID
    const jackpotTypes: string[] = ['rolling', 'daily', 'weekly', 'event'];
    let jackpot;

    if (jackpotTypes.includes(jackpotIdOrType)) {
      jackpot = await prisma.jackpot.findFirst({
        where: { type: jackpotIdOrType as JackpotType, isActive: true },
      });
    } else {
      jackpot = await prisma.jackpot.findUnique({
        where: { id: jackpotIdOrType },
      });
    }

    if (!jackpot || !jackpot.isActive || Number(jackpot.balance) <= 0) {
      return null;
    }

    const prizeAmount = Number(jackpot.balance);

    // Get all contributors (unique employees who contributed to this jackpot)
    const contributors = await prisma.jackpotContribution.findMany({
      where: { jackpotId: jackpot.id },
      select: { employeeId: true, amount: true },
    });

    if (contributors.length === 0) {
      return { winner: null, amount: prizeAmount };
    }

    // Weighted random selection based on contribution amounts
    const totalContributed = contributors.reduce(
      (sum, c) => sum + Number(c.amount), 0
    );

    const roll = Math.random() * totalContributed;
    let cumulative = 0;
    let winnerId: string | null = null;

    for (const contributor of contributors) {
      cumulative += Number(contributor.amount);
      if (roll < cumulative) {
        winnerId = contributor.employeeId;
        break;
      }
    }

    // Fallback to last contributor if rounding issues
    if (!winnerId) {
      winnerId = contributors[contributors.length - 1].employeeId;
    }

    // Award the jackpot
    await prisma.$transaction(async (tx) => {
      // Find winner's account
      const winner = await tx.employee.findUnique({
        where: { id: winnerId! },
        include: { account: true },
      });

      if (!winner || !winner.account) {
        throw new Error('Winner account not found');
      }

      const prizeDecimal = new Prisma.Decimal(prizeAmount);

      // Credit the winner
      await tx.account.update({
        where: { id: winner.account.id },
        data: { balance: { increment: prizeDecimal } },
      });

      // Create ledger transaction
      await tx.ledgerTransaction.create({
        data: {
          accountId: winner.account.id,
          transactionType: TransactionType.jackpot_win,
          amount: prizeDecimal,
          status: 'posted',
          postedAt: new Date(),
          description: `Jackpot win: "${jackpot!.name}"`,
          targetEmployeeId: winnerId!,
        },
      });

      // Reset jackpot balance and record winner
      await tx.jackpot.update({
        where: { id: jackpot!.id },
        data: {
          balance: new Prisma.Decimal(0),
          lastWonAt: new Date(),
          lastWonBy: winnerId!,
          lastWonAmount: prizeDecimal,
        },
      });

      // Update winner's game stats
      await tx.gameStats.upsert({
        where: { employeeId: winnerId! },
        update: {
          jackpotsWon: { increment: 1 },
          totalJackpotWinnings: { increment: prizeDecimal },
          totalWon: { increment: prizeDecimal },
          netProfit: { increment: prizeDecimal },
        },
        create: {
          employeeId: winnerId!,
          gamesPlayed: 0,
          gamesWon: 0,
          totalBet: new Prisma.Decimal(0),
          totalWon: prizeDecimal,
          netProfit: prizeDecimal,
          jackpotsWon: 1,
          totalJackpotWinnings: prizeDecimal,
          statsByGame: {},
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return {
      winner: winnerId,
      amount: prizeAmount,
    };
  },

  /**
   * Initialize default jackpots if they don't already exist.
   */
  async initializeJackpots() {
    const defaults = [
      { name: 'Rolling Jackpot', type: JackpotType.rolling },
      { name: 'Daily Jackpot', type: JackpotType.daily },
      { name: 'Weekly Mega Jackpot', type: JackpotType.weekly },
    ];

    for (const def of defaults) {
      const existing = await prisma.jackpot.findFirst({
        where: { type: def.type },
      });

      if (!existing) {
        await prisma.jackpot.create({
          data: {
            name: def.name,
            type: def.type,
            balance: new Prisma.Decimal(0),
            isActive: true,
          },
        });
        console.log(`[Games] Created default jackpot: ${def.name}`);
      }
    }

    console.log('[Games] Jackpots initialized');
  },

  /**
   * Return all active jackpots with their current status.
   */
  async getJackpotStatus() {
    const jackpots = await prisma.jackpot.findMany({
      where: { isActive: true },
      orderBy: { balance: 'desc' },
    });

    return jackpots.map((j) => ({
      id: j.id,
      name: j.name,
      type: j.type,
      balance: Number(j.balance),
      isActive: j.isActive,
      lastWonAt: j.lastWonAt,
      lastWonBy: j.lastWonBy,
      lastWonAmount: j.lastWonAmount ? Number(j.lastWonAmount) : null,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));
  },
};

// ============================================================================
// Game Bank Service
// ============================================================================

export const gameBankService = {
  /**
   * Returns the current bank balance.
   */
  async getBalance() {
    const bank = await getOrCreateBankAccount();
    return {
      balance: Number(bank.balance),
      updatedAt: bank.updatedAt,
    };
  },

  /**
   * Admin deposits funds into the game bank.
   */
  async deposit(amount: number, adminId: string) {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    const bank = await getOrCreateBankAccount();
    const updated = await prisma.gameBankAccount.update({
      where: { id: bank.id },
      data: { balance: { increment: new Prisma.Decimal(amount) } },
    });

    console.log(`[GameBank] Admin ${adminId} deposited ${amount}. New balance: ${Number(updated.balance)}`);

    return {
      balance: Number(updated.balance),
      updatedAt: updated.updatedAt,
    };
  },

  /**
   * Transfer funds from a jackpot to the game bank.
   */
  async transferFromJackpot(jackpotId: string, amount: number, adminId: string) {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    const result = await prisma.$transaction(async (tx) => {
      const jackpot = await tx.jackpot.findUnique({
        where: { id: jackpotId },
      });

      if (!jackpot) {
        throw new Error('Jackpot not found');
      }

      if (Number(jackpot.balance) < amount) {
        throw new Error('Insufficient jackpot balance');
      }

      const updatedJackpot = await tx.jackpot.update({
        where: { id: jackpotId },
        data: { balance: { decrement: new Prisma.Decimal(amount) } },
      });

      const bank = await getOrCreateBankAccount(tx);
      const updatedBank = await tx.gameBankAccount.update({
        where: { id: bank.id },
        data: { balance: { increment: new Prisma.Decimal(amount) } },
      });

      console.log(
        `[GameBank] Admin ${adminId} transferred ${amount} from jackpot "${jackpot.name}" to bank. ` +
        `Bank balance: ${Number(updatedBank.balance)}, Jackpot balance: ${Number(updatedJackpot.balance)}`
      );

      return {
        bank: {
          balance: Number(updatedBank.balance),
          updatedAt: updatedBank.updatedAt,
        },
        jackpot: {
          id: updatedJackpot.id,
          name: updatedJackpot.name,
          type: updatedJackpot.type,
          balance: Number(updatedJackpot.balance),
          isActive: updatedJackpot.isActive,
          lastWonAt: updatedJackpot.lastWonAt,
          lastWonBy: updatedJackpot.lastWonBy,
          lastWonAmount: updatedJackpot.lastWonAmount ? Number(updatedJackpot.lastWonAmount) : null,
        },
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return result;
  },
};
