import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import {
  linkTaskToCampaign,
  createCampaignExclusiveTask,
  updateCampaignTask,
  unlinkCampaignTask,
} from '../../../../services/api';
import { useToast } from '../../../Toast';

export default function TasksPanel() {
  const {
    selectedCampaign,
    campaignTasks,
    wellnessTasks,
    tasksLoading,
    refreshCampaignTasks,
  } = useStudio();
  const { addToast } = useToast();

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [bonusMultiplier, setBonusMultiplier] = useState('1');
  const [linking, setLinking] = useState(false);

  // Create exclusive task form
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCoinValue, setNewTaskCoinValue] = useState('');
  const [creating, setCreating] = useState(false);

  // Editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editMultiplier, setEditMultiplier] = useState('');
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  // Filter out already linked tasks
  const linkedTaskIds = new Set(campaignTasks.filter(ct => ct.wellnessTaskId).map(ct => ct.wellnessTaskId));
  const availableTasks = wellnessTasks.filter(t => t.isActive && !linkedTaskIds.has(t.id));

  const handleLink = async () => {
    if (!selectedCampaign || !selectedTaskId) return;

    setLinking(true);
    try {
      await linkTaskToCampaign(selectedCampaign.id, {
        wellnessTaskId: selectedTaskId,
        bonusMultiplier: parseFloat(bonusMultiplier) || 1,
      });
      setShowLinkForm(false);
      setSelectedTaskId('');
      setBonusMultiplier('1');
      await refreshCampaignTasks();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to link task', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCampaign || !newTaskName.trim() || !newTaskCoinValue) return;

    setCreating(true);
    try {
      await createCampaignExclusiveTask(selectedCampaign.id, {
        name: newTaskName.trim(),
        description: newTaskDescription.trim() || undefined,
        coinValue: parseFloat(newTaskCoinValue),
      });
      setShowCreateForm(false);
      setNewTaskName('');
      setNewTaskDescription('');
      setNewTaskCoinValue('');
      await refreshCampaignTasks();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to create task', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMultiplier = async (taskId: string) => {
    if (!selectedCampaign) return;

    setSaving(true);
    try {
      await updateCampaignTask(selectedCampaign.id, taskId, {
        bonusMultiplier: parseFloat(editMultiplier) || 1,
      });
      setEditingTaskId(null);
      await refreshCampaignTasks();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to update task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (taskId: string) => {
    if (!selectedCampaign || !confirm('Remove this task from the campaign?')) return;

    setUnlinking(taskId);
    try {
      await unlinkCampaignTask(selectedCampaign.id, taskId);
      await refreshCampaignTasks();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to unlink task', 'error');
    } finally {
      setUnlinking(null);
    }
  };

  if (!selectedCampaign) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Campaign Tasks</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Select a campaign to manage tasks
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Campaign Tasks</h3>
        <p className="text-xs text-gray-500 mt-1">
          {campaignTasks.length} task(s) linked
        </p>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b border-gray-200 flex gap-2">
        <button
          onClick={() => {
            setShowLinkForm(!showLinkForm);
            setShowCreateForm(false);
          }}
          className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
        >
          Link Existing
        </button>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setShowLinkForm(false);
          }}
          className="flex-1 px-2 py-1.5 text-xs font-medium text-green-600 border border-green-300 rounded hover:bg-green-50"
        >
          Create New
        </button>
      </div>

      {/* Link Form */}
      {showLinkForm && (
        <div className="p-3 border-b border-gray-200 bg-blue-50 space-y-2">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="">Choose a task...</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name} ({task.coinValue} coins)
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Multiplier:</label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={bonusMultiplier}
              onChange={(e) => setBonusMultiplier(e.target.value)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLink}
              disabled={!selectedTaskId || linking}
              className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {linking ? 'Linking...' : 'Link'}
            </button>
            <button
              onClick={() => setShowLinkForm(false)}
              className="px-2 py-1.5 text-gray-600 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-3 border-b border-gray-200 bg-green-50 space-y-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Task name..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Coins:</label>
            <input
              type="number"
              min="1"
              value={newTaskCoinValue}
              onChange={(e) => setNewTaskCoinValue(e.target.value)}
              placeholder="25"
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newTaskName.trim() || !newTaskCoinValue || creating}
              className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-2 py-1.5 text-gray-600 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2">
        {tasksLoading ? (
          <div className="text-center py-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : campaignTasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No tasks linked yet
          </p>
        ) : (
          <div className="space-y-2">
            {campaignTasks.map((ct) => {
              const isExclusive = !ct.wellnessTaskId;
              const taskName = isExclusive ? ct.name : ct.wellnessTask?.name;
              const coinValue = isExclusive ? ct.coinValue : ct.wellnessTask?.coinValue;
              const effectiveValue = coinValue ? coinValue * ct.bonusMultiplier : 0;

              return (
                <div
                  key={ct.id}
                  className="p-2 bg-white border rounded-lg text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{taskName}</span>
                        {isExclusive && (
                          <span className="px-1 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
                            Exclusive
                          </span>
                        )}
                        {ct.bonusMultiplier > 1 && (
                          <span className="px-1 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
                            {ct.bonusMultiplier}x
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {coinValue} coins
                        {ct.bonusMultiplier > 1 && ` (${effectiveValue.toFixed(0)} effective)`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {editingTaskId === ct.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={editMultiplier}
                            onChange={(e) => setEditMultiplier(e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs border rounded"
                          />
                          <button
                            onClick={() => handleUpdateMultiplier(ct.id)}
                            disabled={saving}
                            className="text-[10px] text-green-600 hover:text-green-700"
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="text-[10px] text-gray-500"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isExclusive && (
                            <button
                              onClick={() => {
                                setEditingTaskId(ct.id);
                                setEditMultiplier(ct.bonusMultiplier.toString());
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit multiplier"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleUnlink(ct.id)}
                            disabled={unlinking === ct.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            {unlinking === ct.id ? (
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
