import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { updateCampaign } from '../../../../services/api';

export default function PropertiesPanel() {
  const {
    selectedCampaign,
    selectCampaign,
    canvasState,
    setHasUnsavedChanges,
  } = useStudio();

  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const hasSelectedObjects = canvasState.selectedObjectIds.length > 0;

  const startEditing = () => {
    if (selectedCampaign) {
      setEditedName(selectedCampaign.name);
      setEditedDescription(selectedCampaign.description || '');
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedName('');
    setEditedDescription('');
  };

  const saveChanges = async () => {
    if (!selectedCampaign) return;

    setSaving(true);
    try {
      await updateCampaign(selectedCampaign.id, {
        name: editedName,
        description: editedDescription || undefined,
      });
      await selectCampaign(selectedCampaign.id);
      setIsEditing(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  // Show canvas object properties if something is selected
  if (hasSelectedObjects) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Object Properties</h3>
          <p className="text-xs text-gray-500 mt-1">
            {canvasState.selectedObjectIds.length} object(s) selected
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">X</label>
                <input
                  type="number"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Y</label>
                <input
                  type="number"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width</label>
                <input
                  type="number"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height</label>
                <input
                  type="number"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rotation</label>
            <input
              type="number"
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
              placeholder="0"
              min="0"
              max="360"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opacity</label>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // Show campaign properties by default
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Campaign Properties</h3>
          {selectedCampaign && !isEditing && (
            <button
              onClick={startEditing}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!selectedCampaign ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Select a campaign to view properties
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={saveChanges}
                disabled={saving || !editedName.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEditing}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <p className="text-sm font-medium text-gray-900">{selectedCampaign.name}</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <p className="text-sm text-gray-700">
                {selectedCampaign.description || <span className="italic text-gray-400">No description</span>}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                  selectedCampaign.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : selectedCampaign.status === 'draft'
                    ? 'bg-gray-100 text-gray-800'
                    : selectedCampaign.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {selectedCampaign.status}
              </span>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <p className="text-sm text-gray-700 font-mono">{selectedCampaign.slug}</p>
            </div>

            {/* Dates */}
            {(selectedCampaign.startDate || selectedCampaign.endDate) && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duration</label>
                <p className="text-sm text-gray-700">
                  {selectedCampaign.startDate
                    ? new Date(selectedCampaign.startDate).toLocaleDateString()
                    : 'No start date'}
                  {' - '}
                  {selectedCampaign.endDate
                    ? new Date(selectedCampaign.endDate).toLocaleDateString()
                    : 'No end date'}
                </p>
              </div>
            )}

            {/* Tasks */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Linked Tasks</label>
              <p className="text-sm text-gray-700">
                {selectedCampaign.campaignTasks?.length || 0} tasks
              </p>
            </div>

            {/* Created */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Created</label>
              <p className="text-sm text-gray-700">
                {new Date(selectedCampaign.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
