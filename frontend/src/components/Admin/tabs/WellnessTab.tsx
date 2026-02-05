import { WellnessTask as WellnessTaskType, WellnessSubmission } from '../../../services/api';
import PendingSubmissionsList from '../PendingSubmissionsList';

interface Submission {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  wellnessTask: {
    id: string;
    name: string;
    coinValue: number;
  };
  documentUrl: string;
  submittedAt: string;
  status: string;
}

interface TaskForm {
  name: string;
  description: string;
  instructions: string;
  coinValue: string;
  frequencyRule: string;
  maxRewardedUsers: string;
}

interface WellnessTabProps {
  submissions: Submission[];
  wellnessTasks: WellnessTaskType[];
  wellnessTasksLoading: boolean;
  usersWithSubmissions: Array<{
    id: string;
    name: string;
    email: string;
    submissions: WellnessSubmission[];
  }>;
  usersLoading: boolean;
  selectedUserId: string | null;
  taskForm: TaskForm;
  templateFile: File | null;
  creating: boolean;
  deletingTaskId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onCreateTask: (e: React.FormEvent) => void;
  onTaskFormChange: (form: TaskForm) => void;
  onTemplateFileChange: (file: File | null) => void;
  onDeleteTask: (taskId: string, taskName: string) => void;
  onLoadWellnessTasks: () => void;
  onLoadUsersWithSubmissions: () => void;
  onSelectUser: (userId: string | null) => void;
}

export default function WellnessTab({
  submissions,
  wellnessTasks,
  wellnessTasksLoading,
  usersWithSubmissions,
  usersLoading,
  selectedUserId,
  taskForm,
  templateFile,
  creating,
  deletingTaskId,
  onApprove,
  onReject,
  onCreateTask,
  onTaskFormChange,
  onTemplateFileChange,
  onDeleteTask,
  onLoadWellnessTasks,
  onLoadUsersWithSubmissions,
  onSelectUser,
}: WellnessTabProps) {
  const selectedUser = usersWithSubmissions.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Pending Submissions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Pending Submissions</h2>
          <span className="text-sm text-gray-500">{submissions.length} pending</span>
        </div>
        <PendingSubmissionsList
          submissions={submissions}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>

      {/* Create Wellness Task */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create Wellness Task</h2>
        <form onSubmit={onCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
              <input
                type="text"
                value={taskForm.name}
                onChange={(e) => onTaskFormChange({ ...taskForm, name: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coin Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taskForm.coinValue}
                onChange={(e) => onTaskFormChange({ ...taskForm, coinValue: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => onTaskFormChange({ ...taskForm, description: e.target.value })}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={taskForm.instructions}
              onChange={(e) => onTaskFormChange({ ...taskForm, instructions: e.target.value })}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={taskForm.frequencyRule}
                onChange={(e) => onTaskFormChange({ ...taskForm, frequencyRule: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="one_time">One-time</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Rewarded Users
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={taskForm.maxRewardedUsers}
                onChange={(e) => onTaskFormChange({ ...taskForm, maxRewardedUsers: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Template (optional)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={(e) => onTemplateFileChange(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">PDF or image files only (max 5MB)</p>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Wellness Programs Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Wellness Programs</h2>
          <div className="flex gap-2">
            <button
              onClick={onLoadWellnessTasks}
              disabled={wellnessTasksLoading}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
            >
              {wellnessTasksLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {wellnessTasksLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : wellnessTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No wellness programs found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coin Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wellnessTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {task.coinValue}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          task.frequencyRule === 'one_time'
                            ? 'bg-purple-100 text-purple-800'
                            : task.frequencyRule === 'annual'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {task.frequencyRule.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          task.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {task.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onDeleteTask(task.id, task.name)}
                        disabled={deletingTaskId === task.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Submission History */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">User Submission History</h2>
          <button
            onClick={onLoadUsersWithSubmissions}
            disabled={usersLoading}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            {usersLoading ? 'Loading...' : 'Load Users'}
          </button>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : usersWithSubmissions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Click &quot;Load Users&quot; to view user submission history
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* User list */}
            <div className="lg:col-span-1 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">Users</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {usersWithSubmissions.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user.id)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${
                      selectedUserId === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {user.submissions.length} submission(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions for selected user */}
            <div className="lg:col-span-2 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">
                  {selectedUser
                    ? `Submissions for ${selectedUser.name}`
                    : 'Select a user to view submissions'}
                </h3>
              </div>
              {selectedUser ? (
                <div className="max-h-96 overflow-y-auto">
                  {selectedUser.submissions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No submissions</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Task
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedUser.submissions.map((sub) => (
                          <tr key={sub.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {sub.wellnessTask?.name || 'Unknown'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  sub.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : sub.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="p-4 text-gray-500 text-center">
                  Select a user from the list to view their submissions
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
