import crypto from 'crypto';
import { ChatGameType, ChatGameStatus, TransactionType } from '@prisma/client';
import prisma from '../config/database';
import transactionService from './transactionService';
import accountService from './accountService';

// --- Type Interfaces ---

interface CipherLayer {
  type: 'caesar' | 'atbash' | 'vigenere' | 'substitution';
  params: Record<string, unknown>;
  encryptedText: string;
}
interface EncryptedOfficeConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  layers: CipherLayer[];
  originalPhrase: string;
  hintTokens: number;
}
interface EncryptedOfficeState {
  currentLayer: number;
  solvedLayers: number[];
  hints: string[];
}
interface SkillShotConfig { rounds: number; range: number; currentRound: number }
interface SkillShotState {
  targets: number[];
  bids: Record<string, { value: number; doubleRisk: boolean; timestamp: string; round: number }[]>;
  roundResults: { roundNumber: number; target: number; winnerId: string | null; scores: Record<string, number> }[];
}

// --- Cipher Helpers ---

const OFFICE_PHRASES = [
  'COFFEE BREAK TIME', 'MEETING AT NOON', 'PROJECT DEADLINE', 'TEAM LUNCH FRIDAY',
  'PRINTER IS JAMMED', 'CHECK YOUR EMAIL', 'SUBMIT TIMESHEET', 'MONDAY MORNING',
  'OFFICE SUPPLIES', 'PARKING LOT FULL', 'BREAK ROOM SNACKS', 'FIRE DRILL TODAY',
  'HAPPY HOUR PLANS', 'QUARTERLY REVIEW', 'BIRTHDAY CAKE', 'WATER COOLER CHAT',
  'DESK IS MESSY', 'WIFI PASSWORD', 'LUNCH ORDER IN', 'EARLY FRIDAY',
];

const rInt = (min: number, max: number) => min + crypto.randomInt(max - min + 1);

const mapLetters = (text: string, fn: (code: number) => number) =>
  text.split('').map(ch => ch >= 'A' && ch <= 'Z' ? String.fromCharCode(fn(ch.charCodeAt(0))) : ch).join('');

const caesarEnc = (t: string, s: number) => mapLetters(t, c => ((c - 65 + s) % 26) + 65);
const atbashEnc = (t: string) => mapLetters(t, c => 90 - (c - 65));
const vigenereEnc = (t: string, kw: string) => {
  let ki = 0;
  return t.split('').map(ch => {
    if (ch >= 'A' && ch <= 'Z') { const s = kw.charCodeAt(ki++ % kw.length) - 65; return String.fromCharCode(((ch.charCodeAt(0) - 65 + s) % 26) + 65); }
    return ch;
  }).join('');
};

function genSubMap(): Record<string, string> {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const shuf = [...alpha];
  for (let i = shuf.length - 1; i > 0; i--) { const j = rInt(0, i); [shuf[i], shuf[j]] = [shuf[j], shuf[i]]; }
  const m: Record<string, string> = {};
  alpha.forEach((c, i) => m[c] = shuf[i]);
  return m;
}
const subEnc = (t: string, m: Record<string, string>) => t.split('').map(ch => m[ch] ?? ch).join('');
const rKeyword = (len: number) => Array.from({ length: len }, () => String.fromCharCode(65 + rInt(0, 25))).join('');

// --- ChatGameService ---

export class ChatGameService {
  async startGame(params: {
    type: ChatGameType; createdById: string; spaceName: string;
    threadName?: string; difficulty?: string; rounds?: number;
  }) {
    if (params.type === ChatGameType.encrypted_office) {
      const difficulty = (params.difficulty as 'easy' | 'medium' | 'hard') || 'medium';
      const { config, state } = this.generateCipher(difficulty);
      return prisma.chatGame.create({
        data: {
          type: ChatGameType.encrypted_office, status: ChatGameStatus.active,
          spaceName: params.spaceName, threadName: params.threadName,
          createdById: params.createdById, config: config as any, state: state as any,
          startedAt: new Date(), expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
        include: { participants: true },
      });
    }
    return this.startSkillShot({ createdById: params.createdById, spaceName: params.spaceName, threadName: params.threadName, rounds: params.rounds });
  }

  async endGame(gameId: string, gmId: string) {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.createdById !== gmId) throw new Error('Only the game creator can end this game');
      if (game.status === ChatGameStatus.completed || game.status === ChatGameStatus.cancelled) throw new Error('Game is already finished');
      return tx.chatGame.update({ where: { id: gameId }, data: { status: ChatGameStatus.cancelled, completedAt: new Date() }, include: { participants: true } });
    });
  }

  async getActiveGames(spaceName?: string) {
    const where: any = { status: { in: [ChatGameStatus.waiting, ChatGameStatus.active] } };
    if (spaceName) where.spaceName = spaceName;
    return prisma.chatGame.findMany({ where, include: { participants: { include: { employee: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  async getGameById(gameId: string) {
    const game = await prisma.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true, email: true } } } } } });
    if (!game) throw new Error('Game not found');
    return game;
  }

  async expireStaleGames() {
    const now = new Date();
    const stale = await prisma.chatGame.findMany({ where: { status: { in: [ChatGameStatus.waiting, ChatGameStatus.active] }, expiresAt: { lte: now } } });
    return Promise.all(stale.map(g => prisma.chatGame.update({ where: { id: g.id }, data: { status: ChatGameStatus.expired, completedAt: now } })));
  }

  // --- Encrypted Office ---

  generateCipher(difficulty: 'easy' | 'medium' | 'hard'): { config: EncryptedOfficeConfig; state: EncryptedOfficeState } {
    const phrase = OFFICE_PHRASES[rInt(0, OFFICE_PHRASES.length - 1)];
    const layers: CipherLayer[] = [];
    let text = phrase;

    const shift = rInt(1, 25);
    text = caesarEnc(text, shift);
    layers.push({ type: 'caesar', params: { shift }, encryptedText: text });

    text = atbashEnc(text);
    layers.push({ type: 'atbash', params: {}, encryptedText: text });

    if (difficulty === 'medium' || difficulty === 'hard') {
      const kw = rKeyword(4);
      text = vigenereEnc(text, kw);
      layers.push({ type: 'vigenere', params: { keyword: kw }, encryptedText: text });
    }
    if (difficulty === 'hard') {
      const m = genSubMap();
      text = subEnc(text, m);
      layers.push({ type: 'substitution', params: { map: m }, encryptedText: text });
    }
    layers.reverse(); // outermost first for solving

    return {
      config: { difficulty, layers, originalPhrase: phrase, hintTokens: difficulty === 'hard' ? 2 : 3 },
      state: { currentLayer: 0, solvedLayers: [], hints: [] },
    };
  }

  async submitGuess(gameId: string, employeeId: string, guess: string) {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.encrypted_office) throw new Error('Not an Encrypted Office game');

      const config = game.config as unknown as EncryptedOfficeConfig;
      const state = game.state as unknown as EncryptedOfficeState;
      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) participant = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });

      const progress = (participant.progress as any) || {};
      const layerIdx = state.currentLayer;
      const total = config.layers.length;
      if (layerIdx >= total) return { correct: false, layerSolved: false, gameComplete: true, points: 0 };

      // Expected: text before this layer's encryption (next layer's output or original phrase)
      const expected = layerIdx === total - 1 ? config.originalPhrase : config.layers[layerIdx + 1].encryptedText;
      if (guess.toUpperCase().trim() !== expected) {
        await tx.chatGameParticipant.update({ where: { id: participant.id }, data: { progress: { ...progress, guessCount: (progress.guessCount || 0) + 1 }, lastActionAt: new Date() } });
        return { correct: false, layerSolved: false, gameComplete: false, points: 0 };
      }

      // Correct — score with hint penalty
      const basePts: Record<string, number> = { easy: 50, medium: 100, hard: 150 };
      let points = Math.round(basePts[config.difficulty] * Math.pow(0.67, progress.hintsPerLayer?.[layerIdx] || 0));
      const newScore = participant.score + points;
      const gameComplete = layerIdx + 1 >= total;

      await tx.chatGameParticipant.update({ where: { id: participant.id }, data: { score: newScore, progress: { ...progress, guessCount: (progress.guessCount || 0) + 1, hintsPerLayer: progress.hintsPerLayer || {} }, isWinner: gameComplete, lastActionAt: new Date() } });

      const updateData: any = { state: { currentLayer: layerIdx + 1, solvedLayers: [...state.solvedLayers, layerIdx], hints: state.hints } as any };
      if (gameComplete) {
        updateData.status = ChatGameStatus.completed;
        updateData.completedAt = new Date();
        updateData.result = { winnerId: employeeId, totalScore: newScore, layersSolved: total };
      }
      await tx.chatGame.update({ where: { id: gameId }, data: updateData });

      if (gameComplete) await this._awardEOPrize(employeeId, newScore, config.difficulty, tx);
      return { correct: true, layerSolved: true, gameComplete, points };
    });
  }

  async useHint(gameId: string, employeeId: string) {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.encrypted_office) throw new Error('Not an Encrypted Office game');

      const config = game.config as unknown as EncryptedOfficeConfig;
      const state = game.state as unknown as EncryptedOfficeState;
      if (state.hints.length >= config.hintTokens) throw new Error('No hint tokens remaining');
      if (state.currentLayer >= config.layers.length) throw new Error('All layers already solved');

      const layer = config.layers[state.currentLayer];
      const hint = this._hintText(layer);

      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) participant = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });
      const progress = (participant.progress as any) || {};
      const hpl = { ...(progress.hintsPerLayer || {}) };
      hpl[state.currentLayer] = (hpl[state.currentLayer] || 0) + 1;
      await tx.chatGameParticipant.update({ where: { id: participant.id }, data: { progress: { ...progress, hintsPerLayer: hpl }, lastActionAt: new Date() } });

      const newHints = [...state.hints, hint];
      await tx.chatGame.update({ where: { id: gameId }, data: { state: { ...state, hints: newHints } as any } });
      return { hint, hintsRemaining: config.hintTokens - newHints.length };
    });
  }

  private _hintText(layer: CipherLayer): string {
    switch (layer.type) {
      case 'caesar': { const s = layer.params.shift as number; return `This is a Caesar cipher with shift between ${Math.max(1, s - 3)}-${Math.min(25, s + 3)}`; }
      case 'atbash': return 'This layer uses a mirror cipher (A=Z, B=Y, ...) — try reversing the alphabet';
      case 'vigenere': { const kw = layer.params.keyword as string; return `This is a Vigenere cipher. The keyword starts with "${kw[0]}" and is ${kw.length} letters long`; }
      case 'substitution': { const m = layer.params.map as Record<string, string>; const s = Object.keys(m).slice(0, 3).map(k => `${k}->${m[k]}`).join(', '); return `This is a substitution cipher. Some mappings: ${s}`; }
      default: return 'Try looking for a pattern in the letter frequencies';
    }
  }

  // --- Skill Shot ---

  async startSkillShot(params: { createdById: string; spaceName: string; threadName?: string; rounds?: number; range?: number }) {
    const rounds = params.rounds ?? 3, range = params.range ?? 1000;
    const config: SkillShotConfig = { rounds, range, currentRound: 1 };
    const state: SkillShotState = { targets: [rInt(1, range)], bids: {}, roundResults: [] };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.skill_shot, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  async submitBid(gameId: string, employeeId: string, bid: number, doubleRisk: boolean) {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.skill_shot) throw new Error('Not a Skill Shot game');

      const config = game.config as unknown as SkillShotConfig;
      const state = game.state as unknown as SkillShotState;
      if (bid < 1 || bid > config.range) throw new Error(`Bid must be between 1 and ${config.range}`);

      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) participant = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });

      const playerBids = state.bids[employeeId] || [];
      if (playerBids.some(b => b.round === config.currentRound)) throw new Error('You already bid this round');

      const updatedBids = { ...state.bids, [employeeId]: [...playerBids, { value: bid, doubleRisk, timestamp: new Date().toISOString(), round: config.currentRound }] };
      await tx.chatGame.update({ where: { id: gameId }, data: { state: { ...state, bids: updatedBids } as any } });
      await tx.chatGameParticipant.update({ where: { id: participant.id }, data: { lastActionAt: new Date() } });
      return { accepted: true, bid, doubleRisk };
    });
  }

  async resolveRound(gameId: string) {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.skill_shot) throw new Error('Not a Skill Shot game');

      const config = game.config as unknown as SkillShotConfig;
      const state = game.state as unknown as SkillShotState;
      const round = config.currentRound, target = state.targets[round - 1];

      // Collect this round's bids
      const roundBids: { employeeId: string; value: number; doubleRisk: boolean }[] = [];
      for (const [eid, bids] of Object.entries(state.bids)) {
        const b = bids.find(b => b.round === round);
        if (b) roundBids.push({ employeeId: eid, value: b.value, doubleRisk: b.doubleRisk });
      }

      // Closest bid <= target wins
      let winnerId: string | null = null, closestDiff = Infinity;
      for (const b of roundBids) {
        if (b.value <= target && target - b.value < closestDiff) { closestDiff = target - b.value; winnerId = b.employeeId; }
      }

      // Score: winner 100 (200 if doubleRisk), losers with doubleRisk get -50
      const scores: Record<string, number> = {};
      for (const b of roundBids) {
        scores[b.employeeId] = b.employeeId === winnerId ? (b.doubleRisk ? 200 : 100) : (b.doubleRisk ? -50 : 0);
      }

      // Update participant scores
      for (const p of game.participants) {
        const d = scores[p.employeeId] || 0;
        if (d !== 0) await tx.chatGameParticipant.update({ where: { id: p.id }, data: { score: p.score + d, lastActionAt: new Date() } });
      }

      const roundResult = { roundNumber: round, target, winnerId, scores };
      const newResults = [...state.roundResults, roundResult];
      const isLast = round >= config.rounds;

      if (isLast) {
        const parts = await tx.chatGameParticipant.findMany({ where: { chatGameId: gameId }, orderBy: { score: 'desc' } });
        const top = parts[0]?.score ?? 0;
        const winners = parts.filter(p => p.score === top && top > 0);
        for (const w of winners) await tx.chatGameParticipant.update({ where: { id: w.id }, data: { isWinner: true } });

        const finalScores: Record<string, number> = {};
        parts.forEach(p => finalScores[p.employeeId] = p.score);

        await tx.chatGame.update({ where: { id: gameId }, data: {
          status: ChatGameStatus.completed, completedAt: new Date(),
          config: { ...config, currentRound: round } as any,
          state: { ...state, roundResults: newResults } as any,
          result: { winners: winners.map(w => w.employeeId), finalScores } as any,
        }});

        for (const w of winners) await this._awardSSPrize(w.employeeId, w.score, tx);
        return { roundNumber: round, target, winner: winnerId, scores, gameComplete: true, finalScores };
      }

      // Next round
      await tx.chatGame.update({ where: { id: gameId }, data: {
        config: { ...config, currentRound: round + 1 } as any,
        state: { ...state, targets: [...state.targets, rInt(1, config.range)], roundResults: newResults } as any,
      }});
      return { roundNumber: round, target, winner: winnerId, scores, gameComplete: false };
    });
  }

  // --- Scoring & Payouts ---

  async awardGamePrizes(gameId: string) {
    const game = await prisma.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
    if (!game) throw new Error('Game not found');
    if (game.status !== ChatGameStatus.completed) throw new Error('Game is not completed');
    const winners = game.participants.filter(p => p.isWinner);
    if (!winners.length) return [];
    return Promise.all(winners.map(w =>
      game.type === ChatGameType.encrypted_office
        ? this._awardEOPrize(w.employeeId, w.score, (game.config as unknown as EncryptedOfficeConfig).difficulty)
        : this._awardSSPrize(w.employeeId, w.score)
    ));
  }

  private async _awardEOPrize(employeeId: string, score: number, difficulty: 'easy' | 'medium' | 'hard', tx?: any) {
    const coins = Math.round(score * ({ easy: 0.5, medium: 1, hard: 1.5 })[difficulty] * 100) / 100;
    if (coins <= 0) return { employeeId, coins: 0 };
    const account = await accountService.getOrCreateAccount(employeeId);
    const pending = await transactionService.createPendingTransaction(account.id, TransactionType.game_win, coins, `Encrypted Office win (${difficulty})`);
    await transactionService.postTransaction(pending.id, tx);
    return { employeeId, coins };
  }

  private async _awardSSPrize(employeeId: string, score: number, tx?: any) {
    const coins = Math.round((score / 10) * 100) / 100;
    if (coins <= 0) return { employeeId, coins: 0 };
    const account = await accountService.getOrCreateAccount(employeeId);
    const pending = await transactionService.createPendingTransaction(account.id, TransactionType.game_win, coins, 'Skill Shot win');
    await transactionService.postTransaction(pending.id, tx);
    return { employeeId, coins };
  }
}

export default new ChatGameService();
