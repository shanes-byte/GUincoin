import crypto from 'crypto';
import { ChatGameType, ChatGameStatus, TransactionType } from '@prisma/client';
import prisma from '../config/database';
import transactionService from './transactionService';
import accountService from './accountService';

// ─────────────────────────────────────────────────────────────
// New Game Data Banks (added 2026-02-19)
// ─────────────────────────────────────────────────────────────

const SCRAMBLE_WORDS: { easy: string[]; medium: string[]; hard: string[] } = {
  easy: [
    'DESK', 'MEMO', 'FILE', 'COPY', 'MAIL', 'ZOOM', 'TEAM', 'BOSS',
    'CALL', 'PLAN', 'TASK', 'NOTE', 'CHAT', 'SIGN', 'PAGE',
  ],
  medium: [
    'OFFICE', 'BUDGET', 'REPORT', 'LAPTOP', 'AGENDA', 'CLIENT', 'DESIGN',
    'LAUNCH', 'MANAGE', 'SALARY', 'SUPPLY', 'TARGET', 'REVIEW', 'SPRINT',
    'METRIC',
  ],
  hard: [
    'SCHEDULE', 'DEADLINE', 'FEEDBACK', 'TRAINING', 'STRATEGY', 'EMPLOYEE',
    'OVERTIME', 'CALENDAR', 'PROPOSAL', 'WORKSHOP', 'MEETINGS', 'BRAINSTORM',
    'RESOURCE', 'DELEGATE', 'PROGRESS',
  ],
};

const EMOJI_PUZZLES: { movies: { emojis: string; answer: string }[]; songs: { emojis: string; answer: string }[]; phrases: { emojis: string; answer: string }[] } = {
  movies: [
    { emojis: '🦁👑', answer: 'The Lion King' },
    { emojis: '⭐️⚔️', answer: 'Star Wars' },
    { emojis: '🕷️🧑', answer: 'Spider Man' },
    { emojis: '🧊❄️👸', answer: 'Frozen' },
    { emojis: '🦈🌊', answer: 'Jaws' },
    { emojis: '👻👻🔫', answer: 'Ghostbusters' },
    { emojis: '🧙‍♂️💍', answer: 'Lord of the Rings' },
    { emojis: '🏴‍☠️🚢🌊', answer: 'Pirates of the Caribbean' },
    { emojis: '🤖👍', answer: 'Terminator' },
    { emojis: '🦇🧑‍✈️', answer: 'Batman' },
    { emojis: '👽📞🏠', answer: 'ET' },
    { emojis: '🧜‍♀️🌊', answer: 'The Little Mermaid' },
    { emojis: '🏎️💨🔥', answer: 'Fast and Furious' },
    { emojis: '🦖🌴', answer: 'Jurassic Park' },
    { emojis: '🧪💚👹', answer: 'The Hulk' },
    { emojis: '🎩🐇✨', answer: 'Harry Potter' },
    { emojis: '🤠🐎🏜️', answer: 'The Good the Bad and the Ugly' },
    { emojis: '🚀🌑👨‍🚀', answer: 'Apollo 13' },
    { emojis: '🐀👨‍🍳', answer: 'Ratatouille' },
    { emojis: '🏠👆', answer: 'Up' },
  ],
  songs: [
    { emojis: '🎵🌧️☔', answer: 'Singing in the Rain' },
    { emojis: '💎🌌🎵', answer: 'Lucy in the Sky with Diamonds' },
    { emojis: '🔥🔥🔥🎵', answer: 'Ring of Fire' },
    { emojis: '🌈🎵☁️', answer: 'Somewhere Over the Rainbow' },
    { emojis: '🎸🏨🎵', answer: 'Hotel California' },
    { emojis: '👸🎵🐝', answer: 'Queen Bee' },
    { emojis: '🎵🌍🎶', answer: 'We Are the World' },
    { emojis: '💃🌙🎵', answer: 'Dancing in the Moonlight' },
    { emojis: '🎵🚗🚗🚗', answer: 'Drive' },
    { emojis: '🎵❤️💔', answer: 'Heartbreak Hotel' },
    { emojis: '🎵🎄🔔', answer: 'Jingle Bells' },
    { emojis: '🎵☀️😎', answer: 'Here Comes the Sun' },
    { emojis: '🎵🦅🇺🇸', answer: 'Born in the USA' },
    { emojis: '🎵🌊🏖️', answer: 'Surfin USA' },
    { emojis: '🎵🔥👨', answer: 'Man on Fire' },
    { emojis: '🎵💪😤', answer: 'Stronger' },
    { emojis: '🎵🌙🌟', answer: 'Moonlight Sonata' },
    { emojis: '🎵🚂💨', answer: 'Crazy Train' },
    { emojis: '🎵🐕🎶', answer: 'Who Let the Dogs Out' },
    { emojis: '🎵🏠🛣️', answer: 'Take Me Home Country Roads' },
  ],
  phrases: [
    { emojis: '🍎🌳🍏', answer: 'Apple of my eye' },
    { emojis: '☁️9️⃣', answer: 'Cloud nine' },
    { emojis: '🎂🍰🧁', answer: 'Piece of cake' },
    { emojis: '⏰💣💥', answer: 'Time bomb' },
    { emojis: '🐘🏠', answer: 'Elephant in the room' },
    { emojis: '🌧️🐈🐕', answer: 'Raining cats and dogs' },
    { emojis: '💡💡💡', answer: 'Bright idea' },
    { emojis: '🔥🧊', answer: 'Hot and cold' },
    { emojis: '🐔🥚', answer: 'Chicken or the egg' },
    { emojis: '⭐️🎯', answer: 'Shoot for the stars' },
    { emojis: '🧊🧊🏔️', answer: 'Tip of the iceberg' },
    { emojis: '🎯🎯🎯', answer: 'Bullseye' },
    { emojis: '🗝️🏆', answer: 'Key to success' },
    { emojis: '🌈🦄', answer: 'Unicorn' },
    { emojis: '🐎🎠🌊', answer: 'Dark horse' },
    { emojis: '🏃💨🏁', answer: 'Running out of time' },
    { emojis: '🧠💪', answer: 'Brain power' },
    { emojis: '🔑🚪', answer: 'Open door' },
    { emojis: '🎲🎲', answer: 'Roll the dice' },
    { emojis: '🎯👀', answer: 'Keeping an eye on it' },
  ],
};

const TRIVIA_QUESTIONS: Record<string, { question: string; options: string[]; answer: string }[]> = {
  office: [
    { question: 'What does "EOD" stand for in office lingo?', options: ['A) End of Delivery', 'B) End of Day', 'C) End of Deal', 'D) End of Duty'], answer: 'B' },
    { question: 'What is the standard size of US letter paper?', options: ['A) 8.5 x 11 in', 'B) 8 x 10 in', 'C) A4 size', 'D) 9 x 12 in'], answer: 'A' },
    { question: 'Which software is most commonly used for spreadsheets?', options: ['A) Word', 'B) PowerPoint', 'C) Excel', 'D) Outlook'], answer: 'C' },
    { question: 'What does "PTO" stand for?', options: ['A) Part Time Off', 'B) Paid Time Off', 'C) Personal Time Out', 'D) Planned Time Off'], answer: 'B' },
    { question: 'What color is a standard Post-it note?', options: ['A) Blue', 'B) Pink', 'C) Yellow', 'D) Green'], answer: 'C' },
    { question: 'What does BCC stand for in email?', options: ['A) Basic Carbon Copy', 'B) Blind Carbon Copy', 'C) Brief CC', 'D) Backup Carbon Copy'], answer: 'B' },
    { question: 'Which company invented the cubicle?', options: ['A) IBM', 'B) Herman Miller', 'C) Steelcase', 'D) IKEA'], answer: 'B' },
    { question: 'What does "ASAP" stand for?', options: ['A) As Slow As Possible', 'B) As Soon As Practical', 'C) As Soon As Possible', 'D) Always Stay And Produce'], answer: 'C' },
    { question: 'What is a "standup" in agile methodology?', options: ['A) A comedy show', 'B) A daily short meeting', 'C) A desk type', 'D) A health break'], answer: 'B' },
    { question: 'What does "FYI" stand for?', options: ['A) For Your Interest', 'B) Follow Your Instinct', 'C) For Your Information', 'D) File Your Info'], answer: 'C' },
    { question: 'What is the keyboard shortcut to undo on Windows?', options: ['A) Ctrl+Z', 'B) Ctrl+U', 'C) Ctrl+X', 'D) Ctrl+Y'], answer: 'A' },
    { question: 'How many minutes are in a standard "lunch hour"?', options: ['A) 30', 'B) 45', 'C) 60', 'D) 90'], answer: 'C' },
    { question: 'What does "WFH" stand for?', options: ['A) Work From Here', 'B) Work From Home', 'C) Wait For Help', 'D) Weekly Free Hours'], answer: 'B' },
    { question: 'What is "scope creep"?', options: ['A) A bug', 'B) Uncontrolled project growth', 'C) A type of meeting', 'D) A report format'], answer: 'B' },
    { question: 'What does "KPI" stand for?', options: ['A) Key Performance Indicator', 'B) Known Problem Issue', 'C) Keep Producing Income', 'D) Key Project Input'], answer: 'A' },
  ],
  general: [
    { question: 'What planet is known as the Red Planet?', options: ['A) Venus', 'B) Mars', 'C) Jupiter', 'D) Saturn'], answer: 'B' },
    { question: 'What is the longest river in the world?', options: ['A) Amazon', 'B) Mississippi', 'C) Nile', 'D) Yangtze'], answer: 'C' },
    { question: 'How many continents are there?', options: ['A) 5', 'B) 6', 'C) 7', 'D) 8'], answer: 'C' },
    { question: 'What year did the Titanic sink?', options: ['A) 1905', 'B) 1912', 'C) 1920', 'D) 1898'], answer: 'B' },
    { question: 'What gas do plants absorb from the atmosphere?', options: ['A) Oxygen', 'B) Nitrogen', 'C) Carbon Dioxide', 'D) Helium'], answer: 'C' },
    { question: 'Which country invented pizza?', options: ['A) France', 'B) Greece', 'C) USA', 'D) Italy'], answer: 'D' },
    { question: 'What is the smallest country by area?', options: ['A) Monaco', 'B) Vatican City', 'C) San Marino', 'D) Liechtenstein'], answer: 'B' },
    { question: 'How many bones does an adult human have?', options: ['A) 196', 'B) 206', 'C) 216', 'D) 186'], answer: 'B' },
    { question: 'What is the chemical symbol for gold?', options: ['A) Go', 'B) Gd', 'C) Au', 'D) Ag'], answer: 'C' },
    { question: 'Who painted the Mona Lisa?', options: ['A) Michelangelo', 'B) Raphael', 'C) Rembrandt', 'D) Leonardo da Vinci'], answer: 'D' },
    { question: 'What is the capital of Australia?', options: ['A) Sydney', 'B) Melbourne', 'C) Canberra', 'D) Brisbane'], answer: 'C' },
    { question: 'Which ocean is the largest?', options: ['A) Atlantic', 'B) Indian', 'C) Arctic', 'D) Pacific'], answer: 'D' },
    { question: 'How many colors are in a rainbow?', options: ['A) 5', 'B) 6', 'C) 7', 'D) 8'], answer: 'C' },
    { question: 'What element does "O" represent on the periodic table?', options: ['A) Osmium', 'B) Oganesson', 'C) Oxygen', 'D) Olivine'], answer: 'C' },
    { question: 'What is the hardest natural substance?', options: ['A) Gold', 'B) Iron', 'C) Diamond', 'D) Titanium'], answer: 'C' },
  ],
  tech: [
    { question: 'What does "HTML" stand for?', options: ['A) Hyper Text Markup Language', 'B) High Tech Machine Learning', 'C) Home Tool Markup Language', 'D) Hyper Transfer Markup Language'], answer: 'A' },
    { question: 'Who is the co-founder of Apple?', options: ['A) Bill Gates', 'B) Steve Jobs', 'C) Mark Zuckerberg', 'D) Jeff Bezos'], answer: 'B' },
    { question: 'What does "CPU" stand for?', options: ['A) Central Processing Unit', 'B) Computer Personal Unit', 'C) Central Power Unit', 'D) Computer Processing Utility'], answer: 'A' },
    { question: 'What programming language has a snake name?', options: ['A) Java', 'B) C++', 'C) Python', 'D) Ruby'], answer: 'C' },
    { question: 'What does "SaaS" stand for?', options: ['A) Software as a Service', 'B) Storage as a System', 'C) Server and App Software', 'D) Secure App as Service'], answer: 'A' },
    { question: 'What year was the iPhone first released?', options: ['A) 2005', 'B) 2006', 'C) 2007', 'D) 2008'], answer: 'C' },
    { question: 'What does "RAM" stand for?', options: ['A) Random Access Memory', 'B) Read All Memory', 'C) Readily Available Memory', 'D) Run All Memory'], answer: 'A' },
    { question: 'Which company created Android?', options: ['A) Apple', 'B) Google', 'C) Microsoft', 'D) Samsung'], answer: 'B' },
    { question: 'What does "URL" stand for?', options: ['A) Uniform Resource Locator', 'B) Universal Resource Link', 'C) Uniform Reference Link', 'D) Universal Reference Locator'], answer: 'A' },
    { question: 'In what year was Google founded?', options: ['A) 1996', 'B) 1998', 'C) 2000', 'D) 2002'], answer: 'B' },
    { question: 'What does the "www" stand for?', options: ['A) Wide World Web', 'B) World Wide Web', 'C) Web World Wide', 'D) World Web Wide'], answer: 'B' },
    { question: 'What is the primary language of web browsers?', options: ['A) Python', 'B) Java', 'C) JavaScript', 'D) C++'], answer: 'C' },
    { question: 'What does "API" stand for?', options: ['A) App Programming Interface', 'B) Application Program Interface', 'C) Application Programming Interface', 'D) Automated Program Interface'], answer: 'C' },
    { question: 'What does "DNS" stand for?', options: ['A) Domain Name System', 'B) Digital Network Service', 'C) Data Name Server', 'D) Domain Network System'], answer: 'A' },
    { question: 'How many bits are in a byte?', options: ['A) 4', 'B) 8', 'C) 16', 'D) 32'], answer: 'B' },
  ],
  pop_culture: [
    { question: 'What was the name of the coffee shop in Friends?', options: ['A) The Bean', 'B) Central Perk', 'C) Coffee House', 'D) Java Joe'], answer: 'B' },
    { question: 'Who played Iron Man in the MCU?', options: ['A) Chris Evans', 'B) Chris Hemsworth', 'C) Robert Downey Jr.', 'D) Mark Ruffalo'], answer: 'C' },
    { question: 'What is the name of Harry Potter\'s owl?', options: ['A) Errol', 'B) Hedwig', 'C) Pigwidgeon', 'D) Crookshanks'], answer: 'B' },
    { question: 'Which artist sang "Shape of You"?', options: ['A) Justin Bieber', 'B) Bruno Mars', 'C) Ed Sheeran', 'D) Drake'], answer: 'C' },
    { question: 'What show featured Walter White?', options: ['A) Better Call Saul', 'B) Ozark', 'C) Narcos', 'D) Breaking Bad'], answer: 'D' },
    { question: 'What fictional country is Black Panther from?', options: ['A) Zamunda', 'B) Wakanda', 'C) Genovia', 'D) Latveria'], answer: 'B' },
    { question: 'Who is the voice of Buzz Lightyear (original)?', options: ['A) Tom Hanks', 'B) Tim Allen', 'C) Billy Crystal', 'D) Robin Williams'], answer: 'B' },
    { question: 'What is the highest-grossing film of all time (unadjusted)?', options: ['A) Endgame', 'B) Titanic', 'C) Avatar', 'D) Star Wars'], answer: 'C' },
    { question: 'In The Office, what is Dwight\'s last name?', options: ['A) Schrute', 'B) Scott', 'C) Howard', 'D) Bernard'], answer: 'A' },
    { question: 'What band was Freddie Mercury the lead singer of?', options: ['A) The Beatles', 'B) Led Zeppelin', 'C) Queen', 'D) Pink Floyd'], answer: 'C' },
    { question: 'Who directed Jurassic Park?', options: ['A) James Cameron', 'B) Steven Spielberg', 'C) Ridley Scott', 'D) George Lucas'], answer: 'B' },
    { question: 'What is Baby Yoda\'s real name?', options: ['A) Grogu', 'B) Yodel', 'C) Yaddle', 'D) Gizmo'], answer: 'A' },
    { question: 'Which streamer platform is owned by Amazon?', options: ['A) YouTube', 'B) Kick', 'C) Twitch', 'D) Rumble'], answer: 'C' },
    { question: 'What game features a character named Master Chief?', options: ['A) Call of Duty', 'B) Destiny', 'C) Halo', 'D) Gears of War'], answer: 'C' },
    { question: 'What year did "Gangnam Style" go viral?', options: ['A) 2010', 'B) 2011', 'C) 2012', 'D) 2013'], answer: 'C' },
  ],
};

const HANGMAN_WORDS: { easy: string[]; medium: string[]; hard: string[] } = {
  easy: [
    'DESK', 'COPY', 'FILE', 'MAIL', 'TEAM', 'BOSS', 'CALL', 'PLAN',
    'NOTE', 'TASK', 'SIGN', 'PAGE', 'CHAT', 'ZOOM', 'MEMO',
  ],
  medium: [
    'OFFICE', 'BUDGET', 'REPORT', 'LAPTOP', 'AGENDA', 'CLIENT', 'DESIGN',
    'LAUNCH', 'MANAGE', 'SUPPLY', 'TARGET', 'REVIEW', 'PROFIT', 'METRIC',
    'SAFETY',
  ],
  hard: [
    'SCHEDULE', 'DEADLINE', 'FEEDBACK', 'STRATEGY', 'EMPLOYEE', 'OVERTIME',
    'CALENDAR', 'PROPOSAL', 'WORKSHOP', 'BRAINSTORM', 'MARKETING', 'RESOURCES',
    'QUARTERLY', 'INTERVIEW', 'PROMOTIONS',
  ],
};

const HANGMAN_STAGES = [
  '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========',
];

// --- New Game Type Interfaces ---

interface ScrambleConfig { difficulty: 'easy' | 'medium' | 'hard'; rounds: number }
interface ScrambleState {
  currentRound: number;
  words: string[];
  scrambled: string[];
  scores: Record<string, number>;
}

interface EmojiConfig { category: 'movies' | 'songs' | 'phrases' | 'mixed'; rounds: number }
interface EmojiState {
  currentRound: number;
  puzzles: { emojis: string; answer: string }[];
  scores: Record<string, number>;
}

interface TriviaConfig { category: string; count: number }
interface TriviaState {
  currentQuestion: number;
  questions: { question: string; options: string[]; answer: string }[];
  scores: Record<string, number>;
  answered: boolean;
}

interface RPSConfig { rounds: number }
interface RPSState {
  currentRound: number;
  throws: Record<string, string[]>;
  roundResults: { roundNumber: number; winners: string[] }[];
  scores: Record<string, number>;
}

interface HangmanConfig { difficulty: 'easy' | 'medium' | 'hard'; rounds: number }
interface HangmanState {
  currentRound: number;
  words: string[];
  guessedLetters: string[];
  wrongLetters: string[];
  wrongCount: number;
  scores: Record<string, number>;
}

// --- Shared Helpers ---

function shuffleWord(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  // If shuffle produced the same word, try again (unlikely but possible for short words)
  return result === word && word.length > 1 ? shuffleWord(word) : result;
}

function fuzzyMatch(guess: string, answer: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return normalize(guess) === normalize(answer);
}

function getHangmanBlanks(word: string, guessed: string[]): string {
  return word
    .split('')
    .map(ch => (guessed.includes(ch) ? ch : '_'))
    .join(' ');
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = crypto.randomInt(copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

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

  // ─────────────────────────────────────────────────────────────
  // New Casual Games (added 2026-02-19) — No coin prizes
  // ─────────────────────────────────────────────────────────────

  // --- Word Scramble ---

  async startScramble(params: { createdById: string; spaceName: string; threadName?: string; rounds?: number; difficulty?: string }) {
    const rounds = Math.min(Math.max(params.rounds ?? 5, 1), 15);
    const difficulty = (['easy', 'medium', 'hard'].includes(params.difficulty || '') ? params.difficulty : 'medium') as 'easy' | 'medium' | 'hard';
    const words = pickRandom(SCRAMBLE_WORDS[difficulty], rounds);
    const scrambled = words.map(w => shuffleWord(w));
    const config: ScrambleConfig = { difficulty, rounds: words.length };
    const state: ScrambleState = { currentRound: 1, words, scrambled, scores: {} };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.word_scramble, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  async startEmoji(params: { createdById: string; spaceName: string; threadName?: string; rounds?: number; category?: string }) {
    const rounds = Math.min(Math.max(params.rounds ?? 5, 1), 15);
    const cat = (['movies', 'songs', 'phrases', 'mixed'].includes(params.category || '') ? params.category : 'mixed') as 'movies' | 'songs' | 'phrases' | 'mixed';
    let pool: { emojis: string; answer: string }[];
    if (cat === 'mixed') {
      pool = [...EMOJI_PUZZLES.movies, ...EMOJI_PUZZLES.songs, ...EMOJI_PUZZLES.phrases];
    } else {
      pool = EMOJI_PUZZLES[cat];
    }
    const puzzles = pickRandom(pool, rounds);
    const config: EmojiConfig = { category: cat, rounds: puzzles.length };
    const state: EmojiState = { currentRound: 1, puzzles, scores: {} };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.emoji_decoder, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  async startTrivia(params: { createdById: string; spaceName: string; threadName?: string; count?: number; category?: string }) {
    const count = Math.min(Math.max(params.count ?? 5, 1), 15);
    const cat = params.category || 'random';
    let pool: { question: string; options: string[]; answer: string }[];
    if (cat === 'random' || !TRIVIA_QUESTIONS[cat]) {
      pool = Object.values(TRIVIA_QUESTIONS).flat();
    } else {
      pool = TRIVIA_QUESTIONS[cat];
    }
    const questions = pickRandom(pool, count);
    const config: TriviaConfig = { category: cat, count: questions.length };
    const state: TriviaState = { currentQuestion: 1, questions, scores: {}, answered: false };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.trivia_blitz, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  async startRPS(params: { createdById: string; spaceName: string; threadName?: string; rounds?: number }) {
    const rounds = Math.min(Math.max(params.rounds ?? 3, 1), 10);
    const config: RPSConfig = { rounds };
    const state: RPSState = { currentRound: 1, throws: {}, roundResults: [], scores: {} };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.rps_showdown, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  async startHangman(params: { createdById: string; spaceName: string; threadName?: string; rounds?: number; difficulty?: string }) {
    const rounds = Math.min(Math.max(params.rounds ?? 3, 1), 10);
    const difficulty = (['easy', 'medium', 'hard'].includes(params.difficulty || '') ? params.difficulty : 'medium') as 'easy' | 'medium' | 'hard';
    const words = pickRandom(HANGMAN_WORDS[difficulty], rounds);
    const config: HangmanConfig = { difficulty, rounds: words.length };
    const state: HangmanState = { currentRound: 1, words, guessedLetters: [], wrongLetters: [], wrongCount: 0, scores: {} };
    return prisma.chatGame.create({
      data: {
        type: ChatGameType.hangman, status: ChatGameStatus.active,
        spaceName: params.spaceName, threadName: params.threadName,
        createdById: params.createdById, config: config as any, state: state as any,
        startedAt: new Date(), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { participants: true },
    });
  }

  // --- Unified Answer Handler ---

  async submitAnswer(gameId: string, employeeId: string, answer: string): Promise<{
    correct: boolean; gameComplete: boolean; roundComplete: boolean;
    playerName?: string | null; points?: number; correctAnswer?: string;
    nextRoundData?: any; rankings?: any[]; scores?: Record<string, number>;
    won?: boolean; word?: string; hangmanArt?: string;
  }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true } } } } } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');

      // Ensure participant exists
      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) {
        const created = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });
        const emp = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true } });
        participant = { ...created, employee: emp } as any;
      }

      const playerName = (participant as any).employee?.name || 'Player';

      switch (game.type) {
        case ChatGameType.word_scramble:
          return this._handleScrambleAnswer(tx, game, participant as any, playerName, answer);
        case ChatGameType.emoji_decoder:
          return this._handleEmojiAnswer(tx, game, participant as any, playerName, answer);
        case ChatGameType.trivia_blitz:
          return this._handleTriviaAnswer(tx, game, participant as any, playerName, answer);
        case ChatGameType.hangman:
          return this._handleHangmanAnswer(tx, game, participant as any, playerName, answer);
        default:
          throw new Error(`Game type ${game.type} does not support /games answer`);
      }
    });
  }

  private async _handleScrambleAnswer(tx: any, game: any, participant: any, playerName: string, answer: string) {
    const state = game.state as unknown as ScrambleState;
    const config = game.config as unknown as ScrambleConfig;
    const idx = state.currentRound - 1;
    if (idx >= state.words.length) return { correct: false, gameComplete: true, roundComplete: false };

    const correctWord = state.words[idx];
    if (answer.toUpperCase().trim() !== correctWord) {
      return { correct: false, gameComplete: false, roundComplete: false };
    }

    // Correct!
    const newScores = { ...state.scores };
    newScores[participant.employeeId] = (newScores[participant.employeeId] || 0) + 1;
    const nextRound = state.currentRound + 1;
    const gameComplete = nextRound > config.rounds;

    const newState: ScrambleState = { ...state, currentRound: nextRound, scores: newScores };

    if (gameComplete) {
      const rankings = this._buildRankings(newScores, game.participants);
      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
      await this._markWinners(tx, game.id, newScores, game.participants);
      return { correct: true, gameComplete: true, roundComplete: true, playerName, points: 1, scores: newScores, rankings, correctAnswer: correctWord };
    }

    await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
    return {
      correct: true, gameComplete: false, roundComplete: true, playerName, points: 1,
      scores: newScores, correctAnswer: correctWord,
      nextRoundData: { round: nextRound, total: config.rounds, scrambled: state.scrambled[nextRound - 1] },
    };
  }

  private async _handleEmojiAnswer(tx: any, game: any, participant: any, playerName: string, answer: string) {
    const state = game.state as unknown as EmojiState;
    const config = game.config as unknown as EmojiConfig;
    const idx = state.currentRound - 1;
    if (idx >= state.puzzles.length) return { correct: false, gameComplete: true, roundComplete: false };

    const puzzle = state.puzzles[idx];
    if (!fuzzyMatch(answer, puzzle.answer)) {
      return { correct: false, gameComplete: false, roundComplete: false };
    }

    const newScores = { ...state.scores };
    newScores[participant.employeeId] = (newScores[participant.employeeId] || 0) + 1;
    const nextRound = state.currentRound + 1;
    const gameComplete = nextRound > config.rounds;

    const newState: EmojiState = { ...state, currentRound: nextRound, scores: newScores };

    if (gameComplete) {
      const rankings = this._buildRankings(newScores, game.participants);
      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
      await this._markWinners(tx, game.id, newScores, game.participants);
      return { correct: true, gameComplete: true, roundComplete: true, playerName, points: 1, scores: newScores, rankings, correctAnswer: puzzle.answer };
    }

    await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
    const nextPuzzle = state.puzzles[nextRound - 1];
    return {
      correct: true, gameComplete: false, roundComplete: true, playerName, points: 1,
      scores: newScores, correctAnswer: puzzle.answer,
      nextRoundData: { round: nextRound, total: config.rounds, emojis: nextPuzzle.emojis, category: config.category },
    };
  }

  private async _handleTriviaAnswer(tx: any, game: any, participant: any, playerName: string, answer: string) {
    const state = game.state as unknown as TriviaState;
    const idx = state.currentQuestion - 1;
    if (idx >= state.questions.length) return { correct: false, gameComplete: true, roundComplete: false };
    if (state.answered) return { correct: false, gameComplete: false, roundComplete: false }; // already answered

    const q = state.questions[idx];
    const letter = answer.toUpperCase().trim().charAt(0);
    const isCorrect = letter === q.answer;

    const newScores = { ...state.scores };
    if (isCorrect) {
      newScores[participant.employeeId] = (newScores[participant.employeeId] || 0) + 15; // 10 correct + 5 first bonus
    }

    // Mark this question as answered — GM uses /games next to advance
    const newState: TriviaState = { ...state, scores: newScores, answered: true };
    await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });

    return {
      correct: isCorrect, gameComplete: false, roundComplete: false, playerName,
      points: isCorrect ? 15 : 0, scores: newScores, correctAnswer: q.answer,
    };
  }

  private async _handleHangmanAnswer(tx: any, game: any, participant: any, playerName: string, answer: string) {
    const state = game.state as unknown as HangmanState;
    const config = game.config as unknown as HangmanConfig;
    const idx = state.currentRound - 1;
    if (idx >= state.words.length) return { correct: false, gameComplete: true, roundComplete: false };

    const word = state.words[idx];
    if (answer.toUpperCase().trim() !== word) {
      // Wrong full-word guess counts as a wrong guess
      const newWrongCount = state.wrongCount + 1;
      const dead = newWrongCount >= 6;
      const newState: HangmanState = { ...state, wrongCount: newWrongCount };

      if (dead) {
        return this._resolveHangmanRound(tx, game, newState, config, false, null);
      }
      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
      return { correct: false, gameComplete: false, roundComplete: false };
    }

    // Correct full word!
    const newScores = { ...state.scores };
    newScores[participant.employeeId] = (newScores[participant.employeeId] || 0) + 3;
    const newState: HangmanState = { ...state, scores: newScores, guessedLetters: word.split('') };
    return this._resolveHangmanRound(tx, game, newState, config, true, playerName);
  }

  // --- Hangman Letter Handler ---

  async submitLetter(gameId: string, employeeId: string, letter: string): Promise<{
    hit: boolean; gameComplete: boolean; roundComplete: boolean;
    word?: string; blanks?: string; hangmanArt?: string;
    guessedLetters?: string[]; wrongLetters?: string[];
    playerName?: string | null; scores?: Record<string, number>;
    rankings?: any[]; nextRoundData?: any; won?: boolean;
  }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true } } } } } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.hangman) throw new Error('Not a Hangman game');

      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) {
        const created = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });
        const emp = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true } });
        participant = { ...created, employee: emp } as any;
      }
      const playerName = (participant as any).employee?.name || 'Player';

      const state = game.state as unknown as HangmanState;
      const config = game.config as unknown as HangmanConfig;
      const idx = state.currentRound - 1;
      if (idx >= state.words.length) return { hit: false, gameComplete: true, roundComplete: false };

      const ch = letter.toUpperCase().trim().charAt(0);
      if (state.guessedLetters.includes(ch) || state.wrongLetters.includes(ch)) {
        throw new Error(`"${ch}" has already been guessed`);
      }

      const word = state.words[idx];
      const hit = word.includes(ch);
      let newState: HangmanState;

      if (hit) {
        const newGuessed = [...state.guessedLetters, ch];
        const newScores = { ...state.scores };
        newScores[employeeId] = (newScores[employeeId] || 0) + 1;
        newState = { ...state, guessedLetters: newGuessed, scores: newScores };

        // Check if word is fully revealed
        const allRevealed = word.split('').every(c => newGuessed.includes(c));
        if (allRevealed) {
          // Player who revealed last letter gets solve bonus
          newScores[employeeId] = (newScores[employeeId] || 0) + 2; // +2 bonus for finishing (total: letter+bonus = 3 same as full word solve)
          newState.scores = newScores;
          const result = await this._resolveHangmanRound(tx, game, newState, config, true, playerName);
          return { hit: true, ...result };
        }

        await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
        return {
          hit: true, gameComplete: false, roundComplete: false, playerName,
          blanks: getHangmanBlanks(word, newGuessed),
          hangmanArt: HANGMAN_STAGES[state.wrongCount],
          guessedLetters: newGuessed, wrongLetters: state.wrongLetters,
          scores: newScores,
        };
      } else {
        // Miss
        const newWrong = [...state.wrongLetters, ch];
        const newWrongCount = state.wrongCount + 1;
        newState = { ...state, wrongLetters: newWrong, wrongCount: newWrongCount };

        if (newWrongCount >= 6) {
          const result = await this._resolveHangmanRound(tx, game, newState, config, false, null);
          return { hit: false, ...result };
        }

        await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
        return {
          hit: false, gameComplete: false, roundComplete: false,
          blanks: getHangmanBlanks(word, state.guessedLetters),
          hangmanArt: HANGMAN_STAGES[newWrongCount],
          guessedLetters: state.guessedLetters, wrongLetters: newWrong,
          scores: state.scores,
        };
      }
    });
  }

  private async _resolveHangmanRound(tx: any, game: any, state: HangmanState, config: HangmanConfig, won: boolean, solverName: string | null) {
    const idx = state.currentRound - 1;
    const word = state.words[idx];
    const nextRound = state.currentRound + 1;
    const gameComplete = nextRound > config.rounds;

    const newState: HangmanState = {
      ...state,
      currentRound: nextRound,
      guessedLetters: [],
      wrongLetters: [],
      wrongCount: 0,
    };

    if (gameComplete) {
      const rankings = this._buildRankings(state.scores, game.participants);
      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
      await this._markWinners(tx, game.id, state.scores, game.participants);
      return {
        correct: won, gameComplete: true, roundComplete: true, won, word, playerName: solverName,
        scores: state.scores, rankings,
        hangmanArt: HANGMAN_STAGES[won ? state.wrongCount : 6],
      };
    }

    await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
    const nextWord = state.words[nextRound - 1];
    return {
      correct: won, gameComplete: false, roundComplete: true, won, word, playerName: solverName,
      scores: state.scores, hangmanArt: HANGMAN_STAGES[won ? state.wrongCount : 6],
      nextRoundData: {
        round: nextRound, total: config.rounds,
        blanks: getHangmanBlanks(nextWord, []),
        hangmanArt: HANGMAN_STAGES[0],
      },
    };
  }

  // --- RPS Throw ---

  async submitThrow(gameId: string, employeeId: string, choice: string): Promise<{ accepted: boolean }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: true } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.rps_showdown) throw new Error('Not an RPS game');

      const normalized = choice.toLowerCase().trim();
      if (!['rock', 'paper', 'scissors'].includes(normalized)) throw new Error('Invalid choice. Use: rock, paper, or scissors');

      let participant = game.participants.find(p => p.employeeId === employeeId);
      if (!participant) {
        participant = await tx.chatGameParticipant.create({ data: { chatGameId: gameId, employeeId } });
      }

      const state = game.state as unknown as RPSState;
      const roundIdx = state.currentRound - 1;
      const playerThrows = state.throws[employeeId] || [];

      if (playerThrows.length > roundIdx) throw new Error('You already threw this round');

      const updatedThrows = { ...state.throws, [employeeId]: [...playerThrows, normalized] };
      await tx.chatGame.update({ where: { id: game.id }, data: { state: { ...state, throws: updatedThrows } as any } });
      await tx.chatGameParticipant.update({ where: { id: participant.id }, data: { lastActionAt: new Date() } });
      return { accepted: true };
    });
  }

  // --- RPS Resolve ---

  async resolveRPSRound(gameId: string): Promise<{
    roundNumber: number; throws: Record<string, string>; roundWinners: string[];
    scores: Record<string, number>; gameComplete: boolean; rankings?: any[];
  }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true } } } } } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.rps_showdown) throw new Error('Not an RPS game');

      const config = game.config as unknown as RPSConfig;
      const state = game.state as unknown as RPSState;
      const roundIdx = state.currentRound - 1;

      // Gather this round's throws
      const roundThrows: Record<string, string> = {};
      for (const [eid, throws] of Object.entries(state.throws)) {
        if (throws[roundIdx]) roundThrows[eid] = throws[roundIdx];
      }

      // Score: compare each pair. rock > scissors, scissors > paper, paper > rock
      const beats: Record<string, string> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
      const newScores = { ...state.scores };
      const playerIds = Object.keys(roundThrows);

      for (const p1 of playerIds) {
        for (const p2 of playerIds) {
          if (p1 >= p2) continue;
          const t1 = roundThrows[p1], t2 = roundThrows[p2];
          if (beats[t1] === t2) {
            newScores[p1] = (newScores[p1] || 0) + 1;
          } else if (beats[t2] === t1) {
            newScores[p2] = (newScores[p2] || 0) + 1;
          }
        }
      }

      // Determine round winners (players who beat the most opponents this round)
      const roundPoints: Record<string, number> = {};
      for (const p1 of playerIds) {
        roundPoints[p1] = 0;
        for (const p2 of playerIds) {
          if (p1 === p2) continue;
          if (beats[roundThrows[p1]] === roundThrows[p2]) roundPoints[p1]++;
        }
      }
      const maxPts = Math.max(0, ...Object.values(roundPoints));
      const roundWinners = maxPts > 0 ? playerIds.filter(id => roundPoints[id] === maxPts) : [];

      const roundResult = { roundNumber: state.currentRound, winners: roundWinners };
      const newResults = [...state.roundResults, roundResult];
      const nextRound = state.currentRound + 1;
      const gameComplete = nextRound > config.rounds;

      const newState: RPSState = { ...state, currentRound: nextRound, scores: newScores, roundResults: newResults };

      if (gameComplete) {
        const rankings = this._buildRankings(newScores, game.participants);
        await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
        await this._markWinners(tx, game.id, newScores, game.participants);
        return { roundNumber: state.currentRound, throws: roundThrows, roundWinners, scores: newScores, gameComplete: true, rankings };
      }

      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
      return { roundNumber: state.currentRound, throws: roundThrows, roundWinners, scores: newScores, gameComplete: false };
    });
  }

  // --- Trivia Advance ---

  async advanceTrivia(gameId: string): Promise<{
    gameComplete: boolean; questionNum?: number; total?: number;
    question?: string; options?: string[]; rankings?: any[]; scores?: Record<string, number>;
  }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true } } } } } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');
      if (game.type !== ChatGameType.trivia_blitz) throw new Error('Not a Trivia game');

      const state = game.state as unknown as TriviaState;
      const config = game.config as unknown as TriviaConfig;
      const nextQ = state.currentQuestion + 1;
      const gameComplete = nextQ > config.count;

      if (gameComplete) {
        const rankings = this._buildRankings(state.scores, game.participants);
        const newState = { ...state, currentQuestion: nextQ };
        await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
        await this._markWinners(tx, game.id, state.scores, game.participants);
        return { gameComplete: true, rankings, scores: state.scores };
      }

      const q = state.questions[nextQ - 1];
      const newState: TriviaState = { ...state, currentQuestion: nextQ, answered: false };
      await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
      return { gameComplete: false, questionNum: nextQ, total: config.count, question: q.question, options: q.options, scores: state.scores };
    });
  }

  // --- Skip Round (multi-game) ---

  async skipRound(gameId: string): Promise<{
    gameComplete: boolean; skippedAnswer?: string;
    nextRoundData?: any; rankings?: any[]; scores?: Record<string, number>;
  }> {
    return prisma.$transaction(async (tx) => {
      const game = await tx.chatGame.findUnique({ where: { id: gameId }, include: { participants: { include: { employee: { select: { id: true, name: true } } } } } });
      if (!game) throw new Error('Game not found');
      if (game.status !== ChatGameStatus.active) throw new Error('Game is not active');

      switch (game.type) {
        case ChatGameType.word_scramble: {
          const state = game.state as unknown as ScrambleState;
          const config = game.config as unknown as ScrambleConfig;
          const idx = state.currentRound - 1;
          const skippedAnswer = state.words[idx];
          const nextRound = state.currentRound + 1;
          const gameComplete = nextRound > config.rounds;
          const newState = { ...state, currentRound: nextRound };

          if (gameComplete) {
            const rankings = this._buildRankings(state.scores, game.participants);
            await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
            await this._markWinners(tx, game.id, state.scores, game.participants);
            return { gameComplete: true, skippedAnswer, rankings, scores: state.scores };
          }
          await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
          return { gameComplete: false, skippedAnswer, scores: state.scores, nextRoundData: { round: nextRound, total: config.rounds, scrambled: state.scrambled[nextRound - 1] } };
        }

        case ChatGameType.emoji_decoder: {
          const state = game.state as unknown as EmojiState;
          const config = game.config as unknown as EmojiConfig;
          const idx = state.currentRound - 1;
          const skippedAnswer = state.puzzles[idx]?.answer;
          const nextRound = state.currentRound + 1;
          const gameComplete = nextRound > config.rounds;
          const newState = { ...state, currentRound: nextRound };

          if (gameComplete) {
            const rankings = this._buildRankings(state.scores, game.participants);
            await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
            await this._markWinners(tx, game.id, state.scores, game.participants);
            return { gameComplete: true, skippedAnswer, rankings, scores: state.scores };
          }
          await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
          const nextPuzzle = state.puzzles[nextRound - 1];
          return { gameComplete: false, skippedAnswer, scores: state.scores, nextRoundData: { round: nextRound, total: config.rounds, emojis: nextPuzzle.emojis, category: config.category } };
        }

        case ChatGameType.trivia_blitz: {
          // Skip = advance to next question (treated as advance with no answer)
          return this.advanceTrivia(gameId);
        }

        case ChatGameType.hangman: {
          const state = game.state as unknown as HangmanState;
          const config = game.config as unknown as HangmanConfig;
          const idx = state.currentRound - 1;
          const skippedAnswer = state.words[idx];
          const newState: HangmanState = { ...state, currentRound: state.currentRound + 1, guessedLetters: [], wrongLetters: [], wrongCount: 0 };
          const gameComplete = newState.currentRound > config.rounds;

          if (gameComplete) {
            const rankings = this._buildRankings(state.scores, game.participants);
            await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any, status: ChatGameStatus.completed, completedAt: new Date(), result: { rankings } as any } });
            await this._markWinners(tx, game.id, state.scores, game.participants);
            return { gameComplete: true, skippedAnswer, rankings, scores: state.scores };
          }
          await tx.chatGame.update({ where: { id: game.id }, data: { state: newState as any } });
          const nextWord = state.words[newState.currentRound - 1];
          return {
            gameComplete: false, skippedAnswer, scores: state.scores,
            nextRoundData: { round: newState.currentRound, total: config.rounds, blanks: getHangmanBlanks(nextWord, []), hangmanArt: HANGMAN_STAGES[0] },
          };
        }

        default:
          throw new Error(`Skip is not supported for ${game.type}`);
      }
    });
  }

  // --- Shared Helpers ---

  private _buildRankings(scores: Record<string, number>, participants: any[]): { employeeId: string; name: string; score: number }[] {
    // Include all participants (even those with 0 score)
    const allIds = new Set([...Object.keys(scores), ...participants.map((p: any) => p.employeeId)]);
    const nameMap: Record<string, string> = {};
    for (const p of participants) nameMap[p.employeeId] = p.employee?.name || 'Player';

    return Array.from(allIds)
      .map(id => ({ employeeId: id, name: nameMap[id] || 'Player', score: scores[id] || 0 }))
      .sort((a, b) => b.score - a.score);
  }

  private async _markWinners(tx: any, gameId: string, scores: Record<string, number>, participants: any[]) {
    if (Object.keys(scores).length === 0) return;
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore <= 0) return;
    const winnerIds = Object.entries(scores).filter(([, s]) => s === maxScore).map(([id]) => id);
    for (const p of participants) {
      if (winnerIds.includes(p.employeeId)) {
        await tx.chatGameParticipant.update({ where: { id: p.id }, data: { isWinner: true, score: scores[p.employeeId] || 0 } });
      } else {
        await tx.chatGameParticipant.update({ where: { id: p.id }, data: { score: scores[p.employeeId] || 0 } });
      }
    }
  }
}

export default new ChatGameService();
