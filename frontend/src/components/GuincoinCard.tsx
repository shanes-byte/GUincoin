import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Balance } from '../services/api';

interface GuincoinCardProps {
  variant: 'personal' | 'manager';
  holderName: string;
  balance?: Balance;
  allotmentBalance?: Balance | null;
  isManager?: boolean;
  allotment?: {
    amount: number;
    usedAmount: number;
    remaining: number;
    periodStart: string;
    periodEnd: string;
  };
}

const LOGO_URL = 'https://penguin-support.com/wp-content/uploads/2023/11/Guincoin.png';

function ChipSVG() {
  return (
    <svg width="45" height="34" viewBox="0 0 45 34" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="45" height="34" rx="5" fill="url(#chipGold)" />
      <line x1="0" y1="12" x2="45" y2="12" stroke="#b8860b" strokeWidth="0.5" />
      <line x1="0" y1="22" x2="45" y2="22" stroke="#b8860b" strokeWidth="0.5" />
      <line x1="15" y1="0" x2="15" y2="34" stroke="#b8860b" strokeWidth="0.5" />
      <line x1="30" y1="0" x2="30" y2="34" stroke="#b8860b" strokeWidth="0.5" />
      <rect x="15" y="12" width="15" height="10" fill="#c9a84c" rx="1" />
      <defs>
        <linearGradient id="chipGold" x1="0" y1="0" x2="45" y2="34">
          <stop offset="0%" stopColor="#d4a843" />
          <stop offset="50%" stopColor="#f0d060" />
          <stop offset="100%" stopColor="#c9952a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PersonalFront({ holderName, balance, allotmentBalance, isManager }: Omit<GuincoinCardProps, 'variant' | 'allotment'>) {
  return (
    <div className="card-face rounded-2xl bg-gradient-to-br from-blue-900 via-blue-700 to-teal-600 p-5 flex flex-col justify-between overflow-hidden">
      {/* Penguin watermark */}
      <img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        className="absolute bottom-2 right-2 w-[120px] opacity-10 pointer-events-none select-none"
      />

      {/* Top row: chip + logo */}
      <div className="flex items-start justify-between">
        <ChipSVG />
        <img src={LOGO_URL} alt="Guincoin" className="w-10 h-10 object-contain" />
      </div>

      {/* Card number */}
      <div className="mt-3">
        <p className="font-mono text-lg text-white/90 card-embossed tracking-[0.2em]">
          **** **** **** 0042
        </p>
      </div>

      {/* Balance + Pending */}
      <div className="mt-3 flex gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Balance</p>
          <p className="text-xl font-semibold text-white card-embossed">
            {balance ? balance.total.toFixed(2) : '—'} <span className="text-sm font-normal">GC</span>
          </p>
        </div>
        {balance && balance.pending > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/60">Pending</p>
            <p className="text-xl font-semibold text-yellow-300 card-embossed">
              {balance.pending.toFixed(2)} <span className="text-sm font-normal">GC</span>
            </p>
          </div>
        )}
      </div>

      {/* Manager allotment line */}
      {isManager && allotmentBalance && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-widest text-white/60">
            Mgr Allotment: {allotmentBalance.total.toFixed(2)}
          </p>
          <Link to="/manager" className="text-white/70 hover:text-white" title="Go to Manager Portal">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      )}

      {/* Cardholder + Valid Thru */}
      <div className="mt-3 flex justify-between items-end">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Cardholder</p>
          <p className="text-sm font-medium text-white card-embossed uppercase tracking-wide">
            {holderName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/60">Valid Thru</p>
          <p className="text-sm font-medium text-white card-embossed">12/29</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex justify-between items-center">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Guincoin Rewards</p>
        <p className="text-[10px] uppercase tracking-widest text-white/50">Debit</p>
      </div>
    </div>
  );
}

function ManagerFront({ holderName, allotment }: Pick<GuincoinCardProps, 'holderName' | 'allotment'>) {
  const percentage = allotment ? (allotment.usedAmount / allotment.amount) * 100 : 0;
  const isDanger = percentage > 95;
  const isWarning = percentage > 80;

  const barColor = isDanger ? 'bg-red-400' : isWarning ? 'bg-yellow-300' : 'bg-white';

  return (
    <div className="card-face rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-600 p-5 flex flex-col justify-between overflow-hidden">
      {/* Penguin watermark */}
      <img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        className="absolute bottom-2 right-2 w-[120px] opacity-10 pointer-events-none select-none"
      />

      {/* Top row: chip + logo */}
      <div className="flex items-start justify-between">
        <ChipSVG />
        <img src={LOGO_URL} alt="Guincoin" className="w-10 h-10 object-contain" />
      </div>

      {/* Card number */}
      <div className="mt-3">
        <p className="font-mono text-lg text-white/90 card-embossed tracking-[0.2em]">
          **** **** **** MGR
        </p>
      </div>

      {/* Remaining + Budget */}
      <div className="mt-3 flex gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Remaining</p>
          <p className="text-xl font-semibold text-white card-embossed">
            {allotment ? allotment.remaining.toFixed(2) : '—'} <span className="text-sm font-normal">GC</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Budget</p>
          <p className="text-xl font-semibold text-white/80 card-embossed">
            {allotment ? allotment.amount.toFixed(2) : '—'} <span className="text-sm font-normal">GC</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {allotment && (
        <div className="mt-3">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Cardholder + Valid Thru */}
      <div className="mt-3 flex justify-between items-end">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Manager</p>
          <p className="text-sm font-medium text-white card-embossed uppercase tracking-wide">
            {holderName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/60">Valid Thru</p>
          <p className="text-sm font-medium text-white card-embossed">12/29</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex justify-between items-center">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Guincoin Manager</p>
        <p className="text-[10px] uppercase tracking-widest text-white/50">Corporate</p>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="card-face card-face-back rounded-2xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 flex flex-col overflow-hidden">
      {/* Penguin watermark */}
      <img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] opacity-[0.05] pointer-events-none select-none"
      />

      {/* Magnetic stripe */}
      <div className="mt-6 w-full h-10 bg-gray-950" />

      {/* Signature strip */}
      <div className="mt-4 mx-5 h-8 bg-white/80 rounded-sm flex items-center px-3">
        <div className="w-full h-px bg-gray-300" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <img src={LOGO_URL} alt="Guincoin" className="w-20 h-20 object-contain opacity-80" />
        <p className="text-sm text-white/60 italic">Tap to show balance</p>
      </div>

      {/* Footer */}
      <div className="pb-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Guincoin Rewards Platform</p>
      </div>
    </div>
  );
}

export default function GuincoinCard({
  variant,
  holderName,
  balance,
  allotmentBalance,
  isManager,
  allotment,
}: GuincoinCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleFlip = () => setIsFlipped((prev) => !prev);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div
      className="card-scene w-full max-w-[400px]"
      style={{ aspectRatio: '1586 / 1000' }}
    >
      <div
        className={`card-flipper w-full h-full cursor-pointer ${isFlipped ? 'is-flipped' : ''}`}
        onClick={toggleFlip}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Show card front' : 'Flip card to hide balance'}
      >
        {variant === 'personal' ? (
          <PersonalFront
            holderName={holderName}
            balance={balance}
            allotmentBalance={allotmentBalance}
            isManager={isManager}
          />
        ) : (
          <ManagerFront holderName={holderName} allotment={allotment} />
        )}
        <CardBack />
      </div>
    </div>
  );
}
