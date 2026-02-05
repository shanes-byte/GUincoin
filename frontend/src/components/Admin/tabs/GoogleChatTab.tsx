import { ChatCommandAudit, ChatAuditStats } from '../../../services/api';

interface GoogleChatTabProps {
  chatStats: ChatAuditStats | null;
  chatAuditLogs: ChatCommandAudit[];
  chatLogsLoading: boolean;
  chatPage: number;
  chatTotalPages: number;
  chatFilters: {
    status?: string;
    userEmail?: string;
  };
  onFiltersChange: (filters: { status?: string; userEmail?: string }) => void;
  onPageChange: (page: number) => void;
}

export default function GoogleChatTab({
  chatStats,
  chatAuditLogs,
  chatLogsLoading,
  chatPage,
  chatTotalPages,
  chatFilters,
  onFiltersChange,
  onPageChange,
}: GoogleChatTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {chatStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900">{chatStats.total}</div>
                  <div className="text-xs text-gray-500">Total (30d)</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-green-600">{chatStats.byStatus.succeeded}</div>
                  <div className="text-xs text-gray-500">Succeeded</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-red-600">{chatStats.byStatus.rejected}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-yellow-600">{chatStats.byStatus.failed}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-blue-600">{chatStats.byStatus.received}</div>
                  <div className="text-xs text-gray-500">Received</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-purple-600">{chatStats.recentActivity}</div>
                  <div className="text-xs text-gray-500">Last 7 Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={chatFilters.status || ''}
              onChange={(e) =>
                onFiltersChange({ ...chatFilters, status: e.target.value || undefined })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="authorized">Authorized</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="succeeded">Succeeded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
            <input
              type="email"
              value={chatFilters.userEmail || ''}
              onChange={(e) =>
                onFiltersChange({ ...chatFilters, userEmail: e.target.value || undefined })
              }
              placeholder="Filter by email..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                onFiltersChange({});
                onPageChange(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Command Audit Logs</h2>
        </div>
        {chatLogsLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : chatAuditLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Command
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Space
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chatAuditLogs.map((log: ChatCommandAudit) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userEmail || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={log.commandText || ''}>
                          {log.commandName || 'N/A'}
                        </div>
                        {log.commandText && (
                          <div className="text-xs text-gray-500 truncate max-w-xs" title={log.commandText}>
                            {log.commandText}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.status === 'succeeded'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'rejected' || log.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : log.status === 'authorized'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate" title={log.spaceName || ''}>
                          {log.spaceName ? log.spaceName.split('/').pop() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.transaction ? (
                          <div>
                            <div className="font-medium">{log.transaction.amount} coins</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {log.transaction.id.substring(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.errorMessage ? (
                          <div className="max-w-xs truncate text-red-600" title={log.errorMessage}>
                            {log.errorMessage}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {chatTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {chatPage} of {chatTotalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onPageChange(Math.max(1, chatPage - 1))}
                    disabled={chatPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => onPageChange(Math.min(chatTotalPages, chatPage + 1))}
                    disabled={chatPage === chatTotalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
