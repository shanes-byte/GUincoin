// [ORIGINAL - 2026-02-09] Superseded by GuincoinCard — kept for reference/rollback
import { Balance } from '../../services/api';
import { Link } from 'react-router-dom';

interface BalanceCardProps {
  balance: Balance;
  allotmentBalance?: Balance | null;
  isManager?: boolean;
}

// [ORIGINAL - 2026-02-06] BalanceCard only showed personal balance, no allotment section
export default function BalanceCard({ balance, allotmentBalance, isManager }: BalanceCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-3xl"><span aria-label="Balance">💰</span></div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Personal Balance</dt>
              <dd className="text-2xl font-semibold text-gray-900">{balance.total.toFixed(2)}</dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Posted</span>
            <span className="font-medium text-gray-900">{balance.posted.toFixed(2)}</span>
          </div>
          {balance.pending > 0 && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Pending</span>
              <span className="font-medium text-yellow-600">{balance.pending.toFixed(2)}</span>
            </div>
          )}
        </div>

        {isManager && allotmentBalance && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">Manager Allotment</dt>
              <dd className="text-lg font-semibold text-blue-700">{allotmentBalance.total.toFixed(2)}</dd>
            </div>
            <div className="mt-2">
              <Link
                to="/manager"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Go to Manager Portal →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
