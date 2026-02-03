import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { generateCampaignImages } from '../../../../services/api';

const MOOD_OPTIONS = ['Professional', 'Playful', 'Energetic', 'Calm', 'Festive', 'Inspiring'];
const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Vibrant', 'Corporate', 'Artistic', 'Nature'];
const SUBJECT_OPTIONS = ['Abstract', 'People', 'Wellness', 'Celebration', 'Achievement', 'Team'];

// Preset combinations for bulk generation
const BULK_PRESETS = [
  { name: 'Professional Set', moods: ['Professional', 'Calm'], styles: ['Modern', 'Minimalist'], subject: 'Wellness' },
  { name: 'Energetic Set', moods: ['Energetic', 'Playful'], styles: ['Vibrant', 'Modern'], subject: 'Achievement' },
  { name: 'Celebration Set', moods: ['Festive', 'Inspiring'], styles: ['Vibrant', 'Artistic'], subject: 'Celebration' },
  { name: 'Team Spirit Set', moods: ['Inspiring', 'Energetic'], styles: ['Corporate', 'Modern'], subject: 'Team' },
];

export default function AIPromptBuilder() {
  const { selectedCampaign, selectCampaign, setHasUnsavedChanges } = useStudio();

  const [mood, setMood] = useState('Professional');
  const [style, setStyle] = useState('Modern');
  const [subject, setSubject] = useState('Wellness');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generation options
  const [generateBanner, setGenerateBanner] = useState(true);
  const [generatePoster, setGeneratePoster] = useState(true);
  const [generateEmail, setGenerateEmail] = useState(false);
  const [generateChat, setGenerateChat] = useState(false);
  const [generateBackground, setGenerateBackground] = useState(false);

  // Bulk generation
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);

  const buildPrompt = () => {
    const campaignName = selectedCampaign?.name || 'Campaign';
    const parts = [
      `Create a ${mood.toLowerCase()} and ${style.toLowerCase()} image`,
      `featuring ${subject.toLowerCase()} elements`,
      `for a wellness campaign called "${campaignName}"`,
    ];

    if (customPrompt) {
      parts.push(customPrompt);
    }

    return parts.join('. ') + '.';
  };

  const handleGenerate = async () => {
    if (!selectedCampaign) return;

    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const prompt = buildPrompt();

      await generateCampaignImages(selectedCampaign.id, {
        prompt,
        generateBanner,
        generatePoster,
        generateEmailBanner: generateEmail,
        generateChatImage: generateChat,
        generateBackground,
      });

      // Refresh campaign to get new image URLs
      await selectCampaign(selectedCampaign.id);
      setSuccess(true);
      setHasUnsavedChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async (preset: typeof BULK_PRESETS[0]) => {
    if (!selectedCampaign) return;

    setGenerating(true);
    setError(null);
    setSuccess(false);

    const combinations: { mood: string; style: string }[] = [];
    for (const m of preset.moods) {
      for (const s of preset.styles) {
        combinations.push({ mood: m, style: s });
      }
    }

    setBulkProgress({ current: 0, total: combinations.length, currentName: '' });

    try {
      for (let i = 0; i < combinations.length; i++) {
        const combo = combinations[i];
        const comboName = `${combo.mood} + ${combo.style}`;
        setBulkProgress({ current: i + 1, total: combinations.length, currentName: comboName });

        const prompt = [
          `Create a ${combo.mood.toLowerCase()} and ${combo.style.toLowerCase()} image`,
          `featuring ${preset.subject.toLowerCase()} elements`,
          `for a wellness campaign called "${selectedCampaign.name}"`,
        ].join('. ') + '.';

        await generateCampaignImages(selectedCampaign.id, {
          prompt,
          generateBanner: i === 0 && generateBanner, // Only first generates banner
          generatePoster: i === 0 && generatePoster, // Only first generates poster
          generateEmailBanner: i === 0 && generateEmail,
          generateChatImage: i === 0 && generateChat,
        });
      }

      await selectCampaign(selectedCampaign.id);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setGenerating(false);
      setBulkProgress(null);
    }
  };

  const anySelected = generateBanner || generatePoster || generateEmail || generateChat || generateBackground;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">AI Image Generator</h3>
        <p className="text-xs text-gray-500 mt-1">
          Generate campaign images using AI
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!selectedCampaign ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Select a campaign to generate images
          </div>
        ) : (
          <>
            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
              <div className="flex flex-wrap gap-1">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMood(option)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      mood === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <div className="flex flex-wrap gap-1">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setStyle(option)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      style === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <div className="flex flex-wrap gap-1">
                {SUBJECT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSubject(option)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      subject === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Generation Mode */}
            <div>
              <button
                type="button"
                onClick={() => setShowBulkMode(!showBulkMode)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showBulkMode ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Bulk Generation Presets
              </button>

              {showBulkMode && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-500">
                    Generate multiple variations with preset combinations:
                  </p>
                  <div className="grid gap-2">
                    {BULK_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleBulkGenerate(preset)}
                        disabled={generating}
                        className="p-2 text-left bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg hover:border-purple-400 disabled:opacity-50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-900">{preset.name}</span>
                          <span className="text-xs text-purple-600">
                            {preset.moods.length * preset.styles.length} variants
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {preset.moods.join(' & ')} | {preset.styles.join(' & ')} | {preset.subject}
                        </div>
                      </button>
                    ))}
                  </div>

                  {bulkProgress && (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-purple-800">
                          Generating {bulkProgress.current}/{bulkProgress.total}
                        </span>
                        <span className="text-xs text-purple-600">{bulkProgress.currentName}</span>
                      </div>
                      <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-3">Or customize your own prompt:</p>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details (optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add specific details..."
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Preview Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Prompt
              </label>
              <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-2 border">
                {buildPrompt()}
              </div>
            </div>

            {/* Image Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generate For
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateBanner}
                    onChange={(e) => setGenerateBanner(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Banner (728x90)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatePoster}
                    onChange={(e) => setGeneratePoster(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Poster (800x600)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateEmail}
                    onChange={(e) => setGenerateEmail(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Email Banner (600x200)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateChat}
                    onChange={(e) => setGenerateChat(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Chat Image (400x300)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateBackground}
                    onChange={(e) => setGenerateBackground(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Background (1920x1080)</span>
                </label>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-800">Images generated successfully!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Generate Button */}
      {selectedCampaign && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleGenerate}
            disabled={generating || !anySelected}
            className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Images
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
