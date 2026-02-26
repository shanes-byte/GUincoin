import { useState, useEffect, useCallback } from 'react';
import { getApiErrorMessage } from '../../../utils/errorUtils';
import {
  getBackgrounds,
  generateBackground,
  activateBackground,
  deactivateBackground,
  deleteBackground,
  Banner,
} from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../Toast';

export default function BackgroundsTab() {
  const [backgrounds, setBackgrounds] = useState<Banner[]>([]);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const { refreshTheme } = useTheme();
  const { addToast, confirm } = useToast();

  const activeBackground = backgrounds.find((b) => b.isActive) || null;

  const loadBackgrounds = useCallback(async () => {
    try {
      const res = await getBackgrounds();
      setBackgrounds(res.data);
    } catch (err: unknown) {
      console.error('Failed to load backgrounds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackgrounds();
  }, [loadBackgrounds]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      addToast('Please enter a prompt', 'error');
      return;
    }

    setGenerating(true);
    try {
      await generateBackground(prompt.trim());
      addToast('Background generated successfully!', 'success');
      setPrompt('');
      await loadBackgrounds();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Failed to generate background'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleActivate = async (bannerId: string) => {
    try {
      await activateBackground(bannerId);
      addToast('Background applied!', 'success');
      await loadBackgrounds();
      await refreshTheme();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Failed to apply background'), 'error');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateBackground();
      addToast('Background removed', 'success');
      await loadBackgrounds();
      await refreshTheme();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Failed to remove background'), 'error');
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!await confirm('Are you sure you want to delete this background? This cannot be undone.')) {
      return;
    }

    try {
      const wasActive = backgrounds.find((b) => b.id === bannerId)?.isActive;
      await deleteBackground(bannerId);
      addToast('Background deleted', 'success');
      await loadBackgrounds();
      if (wasActive) {
        await refreshTheme();
      }
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Failed to delete background'), 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading backgrounds...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900">Site Background</h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate AI background images and apply them to your site
        </p>
      </div>

      {/* Generate New Background */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Generate New Background</h3>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label htmlFor="bg-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Describe your background
            </label>
            <input
              id="bg-prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Soft gradient with abstract geometric shapes in blue and gold tones"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={generating}
            />
            <p className="mt-1 text-xs text-gray-500">
              Size: 1792x1024 (displayed at full viewport width)
            </p>
          </div>
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Background'
            )}
          </button>
        </form>
      </div>

      {/* Active Background */}
      {activeBackground && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-900">Active Background</h3>
            <button
              onClick={handleDeactivate}
              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
            >
              Remove Background
            </button>
          </div>
          {activeBackground.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={activeBackground.imageUrl}
                alt="Active background"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          {activeBackground.aiPromptUsed && (
            <p className="mt-2 text-xs text-gray-500 italic">
              Prompt: {activeBackground.aiPromptUsed}
            </p>
          )}
        </div>
      )}

      {/* Generated Backgrounds Gallery */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          Generated Backgrounds ({backgrounds.length})
        </h3>
        {backgrounds.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No backgrounds yet. Generate one above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                className={`border rounded-lg overflow-hidden ${
                  bg.isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                {bg.imageUrl ? (
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
                <div className="p-3">
                  {bg.aiPromptUsed && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2" title={bg.aiPromptUsed}>
                      {bg.aiPromptUsed}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {bg.isActive ? (
                      <span className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleActivate(bg.id)}
                        className="flex-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                      >
                        Apply
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(bg.id)}
                      className="px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
