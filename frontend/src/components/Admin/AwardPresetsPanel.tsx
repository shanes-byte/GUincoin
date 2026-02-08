import { useEffect, useState } from 'react';
import {
  AwardPreset,
  getAdminAwardPresets,
  createAwardPreset,
  updateAwardPreset,
  deleteAwardPreset,
} from '../../services/api';
import { useToast } from '../Toast';

export default function AwardPresetsPanel() {
  const { addToast, confirm } = useToast();
  const [presets, setPresets] = useState<AwardPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', amount: '', displayOrder: '' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '', displayOrder: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const res = await getAdminAwardPresets();
      setPresets(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load presets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(addForm.amount);
    if (!addForm.title.trim() || isNaN(amount) || amount <= 0) {
      addToast('Title and a positive amount are required', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await createAwardPreset({
        title: addForm.title.trim(),
        amount,
        displayOrder: addForm.displayOrder ? parseInt(addForm.displayOrder) : undefined,
      });
      setPresets(prev => [...prev, res.data].sort((a, b) => a.displayOrder - b.displayOrder));
      setAddForm({ title: '', amount: '', displayOrder: '' });
      setShowAddForm(false);
      addToast('Award preset created', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to create preset', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (preset: AwardPreset) => {
    setEditingId(preset.id);
    setEditForm({
      title: preset.title,
      amount: preset.amount.toString(),
      displayOrder: preset.displayOrder.toString(),
    });
  };

  const handleSaveEdit = async (id: string) => {
    const amount = parseFloat(editForm.amount);
    const displayOrder = parseInt(editForm.displayOrder);
    if (!editForm.title.trim() || isNaN(amount) || amount <= 0) {
      addToast('Title and a positive amount are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await updateAwardPreset(id, {
        title: editForm.title.trim(),
        amount,
        displayOrder: isNaN(displayOrder) ? 0 : displayOrder,
      });
      setPresets(prev =>
        prev.map(p => (p.id === id ? res.data : p)).sort((a, b) => a.displayOrder - b.displayOrder)
      );
      setEditingId(null);
      addToast('Preset updated', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to update preset', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (preset: AwardPreset) => {
    setTogglingId(preset.id);
    try {
      const res = await updateAwardPreset(preset.id, { isActive: !preset.isActive });
      setPresets(prev => prev.map(p => (p.id === preset.id ? res.data : p)));
      addToast(res.data.isActive ? 'Preset activated' : 'Preset deactivated', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to toggle preset', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (preset: AwardPreset) => {
    if (!(await confirm(`Delete "${preset.title}"? This cannot be undone.`))) return;

    setDeletingId(preset.id);
    try {
      await deleteAwardPreset(preset.id);
      setPresets(prev => prev.filter(p => p.id !== preset.id));
      addToast('Preset deleted', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to delete preset', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Award Presets</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure quick-select award amounts for managers and Google Chat. Active presets appear
              as one-click options in both the Manager Portal and the /award chat wizard.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadPresets}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-500"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {showAddForm ? 'Cancel' : 'Add Preset'}
            </button>
          </div>
        </div>

        {/* Add Preset Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">New Preset</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="Great teamwork!"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (gc)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addForm.amount}
                  onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="25"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addForm.displayOrder}
                  onChange={e => setAddForm(f => ({ ...f, displayOrder: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creating ? 'Creating...' : 'Create Preset'}
              </button>
            </div>
          </form>
        )}

        {/* Presets Table */}
        {loading && presets.length === 0 ? (
          <div className="text-center py-6 text-gray-500">Loading presets...</div>
        ) : presets.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No award presets configured. Click "Add Preset" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {presets.map(preset => (
                  <tr key={preset.id} className={!preset.isActive ? 'bg-gray-50 opacity-60' : ''}>
                    {editingId === preset.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={editForm.displayOrder}
                            onChange={e => setEditForm(f => ({ ...f, displayOrder: e.target.value }))}
                            className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editForm.amount}
                            onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${preset.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {preset.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleSaveEdit(preset.id)}
                            disabled={saving}
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-500">{preset.displayOrder}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{preset.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{preset.amount.toFixed(2)} gc</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(preset)}
                            disabled={togglingId === preset.id}
                            className={`px-2 py-0.5 text-xs font-medium rounded cursor-pointer ${
                              preset.isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {togglingId === preset.id ? '...' : preset.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => startEdit(preset)}
                            className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(preset)}
                            disabled={deletingId === preset.id}
                            className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            {deletingId === preset.id ? '...' : 'Delete'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
