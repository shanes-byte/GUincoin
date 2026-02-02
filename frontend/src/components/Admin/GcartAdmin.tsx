/**
 * GCART Admin Component
 *
 * Admin interface for managing GCART tiers, tasks, submissions, and employee assignments.
 */

import { useState, useEffect } from 'react';
import {
  getAdminGcartTiers,
  getAdminGcartTasks,
  getAdminGcartSubmissions,
  getAdminGcartSubmissionStats,
  getAdminGcartEmployees,
  createGcartTier,
  updateGcartTier,
  createGcartTask,
  updateGcartTask,
  approveGcartSubmission,
  rejectGcartSubmission,
  assignEmployeeToGcartTier,
  bulkAssignEmployeesToGcartTier,
  GcartTier,
  GcartTask,
  GcartSubmission,
  GcartTaskType,
  EmployeeWithGcartProgress,
} from '../../services/api';

type AdminTab = 'submissions' | 'tiers' | 'tasks' | 'employees';

export default function GcartAdmin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('submissions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [tiers, setTiers] = useState<GcartTier[]>([]);
  const [tasks, setTasks] = useState<GcartTask[]>([]);
  const [submissions, setSubmissions] = useState<GcartSubmission[]>([]);
  const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; total: number } | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithGcartProgress[]>([]);

  // Forms
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState<GcartTier | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<GcartTask | null>(null);
  const [selectedTierForTask, setSelectedTierForTask] = useState<string>('');

  // Bulk assign
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkAssignTierId, setBulkAssignTierId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tiersRes, tasksRes, submissionsRes, statsRes, employeesRes] = await Promise.all([
        getAdminGcartTiers(true),
        getAdminGcartTasks(),
        getAdminGcartSubmissions('pending'),
        getAdminGcartSubmissionStats(),
        getAdminGcartEmployees(),
      ]);

      setTiers(tiersRes.data);
      setTasks(tasksRes.data);
      setSubmissions(submissionsRes.data);
      setStats(statsRes.data);
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error('Failed to load GCART data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      await approveGcartSubmission(submissionId);
      loadData();
    } catch (err) {
      console.error('Failed to approve submission:', err);
      alert('Failed to approve submission');
    }
  };

  const handleReject = async (submissionId: string) => {
    const reason = prompt('Enter rejection reason (optional):');
    try {
      await rejectGcartSubmission(submissionId, reason || undefined);
      loadData();
    } catch (err) {
      console.error('Failed to reject submission:', err);
      alert('Failed to reject submission');
    }
  };

  const handleAssignTier = async (employeeId: string, tierId: string) => {
    try {
      await assignEmployeeToGcartTier(employeeId, tierId);
      loadData();
    } catch (err) {
      console.error('Failed to assign tier:', err);
      alert('Failed to assign tier');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0 || !bulkAssignTierId) {
      alert('Please select employees and a tier');
      return;
    }
    try {
      await bulkAssignEmployeesToGcartTier(selectedEmployees, bulkAssignTierId);
      setSelectedEmployees([]);
      setBulkAssignTierId('');
      setShowBulkAssign(false);
      loadData();
    } catch (err) {
      console.error('Failed to bulk assign:', err);
      alert('Failed to bulk assign employees');
    }
  };

  const tabs = [
    { id: 'submissions' as AdminTab, name: 'Submissions', count: stats?.pending || 0 },
    { id: 'tiers' as AdminTab, name: 'Tiers', count: tiers.length },
    { id: 'tasks' as AdminTab, name: 'Tasks', count: tasks.length },
    { id: 'employees' as AdminTab, name: 'Employees', count: employees.length },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button onClick={loadData} className="mt-2 text-sm text-red-600 underline">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">GCART Administration</h2>
          <p className="text-sm text-gray-600">Manage career tiers, tasks, and employee progression</p>
        </div>
        <div className="flex space-x-2">
          {activeTab === 'tiers' && (
            <button
              onClick={() => { setEditingTier(null); setShowTierForm(true); }}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
            >
              Add Tier
            </button>
          )}
          {activeTab === 'tasks' && (
            <button
              onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
            >
              Add Task
            </button>
          )}
          {activeTab === 'employees' && (
            <button
              onClick={() => setShowBulkAssign(true)}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
            >
              Bulk Assign
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            <p className="text-sm text-yellow-600">Pending</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
            <p className="text-sm text-green-600">Approved</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
            <p className="text-sm text-red-600">Rejected</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-sm text-blue-600">Total</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white shadow rounded-lg divide-y">
          {submissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No pending submissions</div>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{submission.gcartTask?.name}</p>
                  <p className="text-sm text-gray-600">
                    {submission.employee?.name} ({submission.employee?.email})
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  {submission.documentUrl && (
                    <a
                      href={submission.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Document
                    </a>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(submission.id)}
                    className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(submission.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="bg-white shadow rounded-lg divide-y">
          {tiers.map((tier) => (
            <div key={tier.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900">{tier.name}</p>
                  <span className="text-xs text-gray-500">({tier.code})</span>
                  {!tier.isActive && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">Inactive</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{tier.description}</p>
                {tier.rewardName && (
                  <p className="text-xs text-yellow-600">Reward: {tier.rewardName}</p>
                )}
                <p className="text-xs text-gray-500">
                  {tier._count?.tasks || 0} tasks | {tier._count?.employees || 0} employees
                </p>
              </div>
              <button
                onClick={() => { setEditingTier(tier); setShowTierForm(true); }}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedTierForTask}
              onChange={(e) => setSelectedTierForTask(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Tiers</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-white shadow rounded-lg divide-y">
            {tasks
              .filter((task) => !selectedTierForTask || task.tierId === selectedTierForTask)
              .map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{task.name}</p>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        task.taskType === 'document_upload' ? 'bg-blue-100 text-blue-700' :
                        task.taskType === 'video_watch' ? 'bg-purple-100 text-purple-700' :
                        task.taskType === 'website_visit' ? 'bg-green-100 text-green-700' :
                        task.taskType === 'checkbox' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.taskType.replace('_', ' ')}
                      </span>
                      {!task.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {tiers.find((t) => t.id === task.tierId)?.name} | {task.coinValue} coins
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingTask(task); setShowTaskForm(true); }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="bg-white shadow rounded-lg divide-y">
          {employees.map((emp) => (
            <div key={emp.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{emp.name}</p>
                <p className="text-sm text-gray-600">{emp.email}</p>
                <p className="text-xs text-gray-500">
                  {emp.currentTier ? (
                    <>
                      Current: {emp.currentTier.name}
                      {emp.progress && ` (${emp.progress.completedTasks}/${emp.progress.totalTasks} tasks)`}
                    </>
                  ) : (
                    'No tier assigned'
                  )}
                  {emp.completedTiersCount > 0 && ` | ${emp.completedTiersCount} completed`}
                </p>
              </div>
              <select
                value={emp.currentTier?.id || ''}
                onChange={(e) => handleAssignTier(emp.id, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Assign Tier...</option>
                {tiers.filter((t) => t.isActive).map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Tier Form Modal */}
      {showTierForm && (
        <TierFormModal
          tier={editingTier}
          onClose={() => { setShowTierForm(false); setEditingTier(null); }}
          onSave={loadData}
        />
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskFormModal
          task={editingTask}
          tiers={tiers}
          onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
          onSave={loadData}
        />
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Bulk Assign Employees to Tier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Tier</label>
                <select
                  value={bulkAssignTierId}
                  onChange={(e) => setBulkAssignTierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a tier...</option>
                  {tiers.filter((t) => t.isActive).map((tier) => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employees ({selectedEmployees.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg divide-y">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{emp.name}</span>
                      {emp.currentTier && (
                        <span className="ml-2 text-xs text-gray-500">({emp.currentTier.code})</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowBulkAssign(false); setSelectedEmployees([]); setBulkAssignTierId(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedEmployees.length === 0 || !bulkAssignTierId}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Assign ({selectedEmployees.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tier Form Modal Component
function TierFormModal({
  tier,
  onClose,
  onSave,
}: {
  tier: GcartTier | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: tier?.name || '',
    code: tier?.code || '',
    description: tier?.description || '',
    sortOrder: tier?.sortOrder || 0,
    rewardName: tier?.rewardName || '',
    rewardDescription: tier?.rewardDescription || '',
    isActive: tier?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (tier) {
        await updateGcartTier(tier.id, form);
      } else {
        await createGcartTier(form);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save tier:', err);
      alert('Failed to save tier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold mb-4">{tier ? 'Edit Tier' : 'Add Tier'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reward Name</label>
              <input
                type="text"
                value={form.rewardName}
                onChange={(e) => setForm({ ...form, rewardName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          {tier && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Task Form Modal Component
function TaskFormModal({
  task,
  tiers,
  onClose,
  onSave,
}: {
  task: GcartTask | null;
  tiers: GcartTier[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    tierId: task?.tierId || '',
    name: task?.name || '',
    description: task?.description || '',
    instructions: task?.instructions || '',
    taskType: (task?.taskType || 'document_upload') as GcartTaskType,
    coinValue: task?.coinValue || 10,
    frequencyRule: task?.frequencyRule || 'one_time',
    requiresApproval: task?.requiresApproval ?? true,
    isActive: task?.isActive ?? true,
    sortOrder: task?.sortOrder || 0,
    configUrl: (task?.config as { url?: string })?.url || '',
    configVideoId: (task?.config as { videoId?: string })?.videoId || '',
    configMinWatchSeconds: (task?.config as { minWatchSeconds?: number })?.minWatchSeconds || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const config: Record<string, unknown> = {};
      if (form.taskType === 'video_watch') {
        if (form.configUrl) config.url = form.configUrl;
        if (form.configVideoId) config.videoId = form.configVideoId;
        if (form.configMinWatchSeconds) config.minWatchSeconds = form.configMinWatchSeconds;
      } else if (form.taskType === 'website_visit' && form.configUrl) {
        config.url = form.configUrl;
      }

      const data = {
        tierId: form.tierId,
        name: form.name,
        description: form.description || undefined,
        instructions: form.instructions || undefined,
        taskType: form.taskType,
        coinValue: form.coinValue,
        frequencyRule: form.frequencyRule as 'one_time' | 'annual' | 'quarterly',
        requiresApproval: form.requiresApproval,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        config: Object.keys(config).length > 0 ? config : undefined,
      };

      if (task) {
        await updateGcartTask(task.id, data);
      } else {
        await createGcartTask(data);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      alert('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">{task ? 'Edit Task' : 'Add Task'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select
              value={form.tierId}
              onChange={(e) => setForm({ ...form, tierId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a tier...</option>
              {tiers.filter((t) => t.isActive).map((tier) => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
              <select
                value={form.taskType}
                onChange={(e) => setForm({ ...form, taskType: e.target.value as GcartTaskType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="document_upload">Document Upload</option>
                <option value="video_watch">Video Watch</option>
                <option value="website_visit">Website Visit</option>
                <option value="checkbox">Checkbox</option>
                <option value="manager_verify">Manager Verify</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coin Value</label>
              <input
                type="number"
                value={form.coinValue}
                onChange={(e) => setForm({ ...form, coinValue: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequencyRule}
                onChange={(e) => setForm({ ...form, frequencyRule: e.target.value as 'one_time' | 'annual' | 'quarterly' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="one_time">One Time</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Task type specific config */}
          {(form.taskType === 'video_watch' || form.taskType === 'website_visit') && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Task Configuration</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">URL</label>
                  <input
                    type="url"
                    value={form.configUrl}
                    onChange={(e) => setForm({ ...form, configUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                {form.taskType === 'video_watch' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">YouTube Video ID (alternative)</label>
                      <input
                        type="text"
                        value={form.configVideoId}
                        onChange={(e) => setForm({ ...form, configVideoId: e.target.value })}
                        placeholder="dQw4w9WgXcQ"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minimum Watch Seconds</label>
                      <input
                        type="number"
                        value={form.configMinWatchSeconds}
                        onChange={(e) => setForm({ ...form, configMinWatchSeconds: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.requiresApproval}
                onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Requires Approval</span>
            </label>
            {task && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
