import { useState, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import { CampaignTheme, updateCampaign } from '../../../../services/api';

// Extract dominant colors from an image using canvas
async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Sample at a smaller size for performance
      const sampleSize = 50;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // Simple color quantization - collect colors and find most common
      const colorMap: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;

        // Skip very dark or very light colors
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;

        const key = `${r} ${g} ${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // Sort by frequency and get top 5 distinct colors
      const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      // Filter to get visually distinct colors
      const distinctColors: string[] = [];
      for (const color of sortedColors) {
        if (distinctColors.length >= 5) break;

        const [r, g, b] = color.split(' ').map(Number);
        const isDistinct = distinctColors.every(existing => {
          const [er, eg, eb] = existing.split(' ').map(Number);
          const diff = Math.abs(r - er) + Math.abs(g - eg) + Math.abs(b - eb);
          return diff > 100; // Minimum color difference
        });

        if (isDistinct) {
          distinctColors.push(color);
        }
      }

      resolve(distinctColors);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

const PRESET_INFO: Record<string, { name: string; description: string }> = {
  default: { name: 'Default Blue', description: 'Clean professional look' },
  wellness_month: { name: 'Wellness Month', description: 'Fresh green tones' },
  holiday: { name: 'Holiday', description: 'Festive red and green' },
  summer_challenge: { name: 'Summer Challenge', description: 'Warm orange vibes' },
  breast_cancer_awareness: { name: 'Pink Awareness', description: 'Pink theme' },
  spirit_week: { name: 'Spirit Week', description: 'Vibrant purple' },
};

function rgbToHex(rgb: string): string {
  const parts = rgb.split(' ').map(Number);
  if (parts.length !== 3) return '#3b82f6';
  const [r, g, b] = parts;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '37 99 235';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

export default function ThemeControlPanel() {
  const {
    themeMode,
    setManualTheme,
    themePresets,
    selectedCampaign,
    selectCampaign,
    getCurrentTheme,
    setHasUnsavedChanges,
    applyPreviewTheme,
  } = useStudio();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTheme = getCurrentTheme();

  const handleExtractFromUrl = async (url: string) => {
    setExtracting(true);
    try {
      const colors = await extractColorsFromImage(url);
      setExtractedColors(colors);
    } catch (error) {
      console.error('Failed to extract colors:', error);
      alert('Could not extract colors from image. Try uploading directly.');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    await handleExtractFromUrl(url);
    URL.revokeObjectURL(url);
  };

  const applyExtractedColor = (color: string, target: 'primary' | 'secondary' | 'accent') => {
    const colorKeys: Record<string, keyof CampaignTheme> = {
      primary: 'primaryColor',
      secondary: 'secondaryColor',
      accent: 'accentColor',
    };

    const [r, g, b] = color.split(' ').map(Number);
    const newTheme: CampaignTheme = {
      ...currentTheme,
      [colorKeys[target]]: color,
      presetName: undefined,
    };

    // Auto-generate related colors
    if (target === 'primary') {
      // Darker hover color
      newTheme.primaryHoverColor = `${Math.max(0, r - 20)} ${Math.max(0, g - 20)} ${Math.max(0, b - 20)}`;
      // Lighter variant
      newTheme.primaryLightColor = `${Math.min(255, r + 80)} ${Math.min(255, g + 80)} ${Math.min(255, b + 80)}`;
    }

    if (themeMode === 'manual') {
      setManualTheme(newTheme);
    }

    setHasUnsavedChanges(true);
    applyPreviewTheme(newTheme);
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = themePresets[presetKey];
    if (!preset) return;

    const newTheme = { ...preset, presetName: presetKey };

    if (themeMode === 'manual') {
      setManualTheme(newTheme);
    } else if (selectedCampaign) {
      // Save to campaign
      saveCampaignTheme(newTheme);
    }

    applyPreviewTheme(newTheme);
  };

  const handleColorChange = (colorKey: keyof CampaignTheme, hexValue: string) => {
    const newTheme: CampaignTheme = {
      ...currentTheme,
      [colorKey]: hexToRgb(hexValue),
      presetName: undefined,
    };

    if (themeMode === 'manual') {
      setManualTheme(newTheme);
    }

    setHasUnsavedChanges(true);
    applyPreviewTheme(newTheme);
  };

  const handleAnimationChange = (type: CampaignTheme['animationType']) => {
    const newTheme: CampaignTheme = {
      ...currentTheme,
      animationType: type,
      enableAnimations: type !== 'none',
    };

    if (themeMode === 'manual') {
      setManualTheme(newTheme);
    }

    setHasUnsavedChanges(true);
    applyPreviewTheme(newTheme);
  };

  const saveCampaignTheme = async (theme: CampaignTheme) => {
    if (!selectedCampaign) return;

    setSaving(true);
    try {
      await updateCampaign(selectedCampaign.id, { theme });
      await selectCampaign(selectedCampaign.id);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (themeMode === 'campaign' && selectedCampaign) {
      saveCampaignTheme(currentTheme);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Theme Control</h3>
          {themeMode === 'campaign' && selectedCampaign && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {themeMode === 'manual'
            ? 'Manual mode - theme applies globally'
            : selectedCampaign
            ? `Editing ${selectedCampaign.name} theme`
            : 'Select a campaign to edit theme'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Preset Grid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme Preset</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(themePresets).map(([key, preset]) => {
              const info = PRESET_INFO[key] || { name: key, description: '' };
              const isSelected = currentTheme.presetName === key;
              const primaryHex = rgbToHex(preset.primaryColor);
              const secondaryHex = rgbToHex(preset.secondaryColor);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`p-2 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
                      }}
                    />
                    <span className="text-xs font-medium truncate">{info.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{info.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Extraction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Extract from Image</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="flex-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {extracting ? 'Extracting...' : 'Upload Image'}
              </button>
              {selectedCampaign?.bannerImageUrl && (
                <button
                  type="button"
                  onClick={() => handleExtractFromUrl(selectedCampaign.bannerImageUrl!)}
                  disabled={extracting}
                  className="px-2 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  From Banner
                </button>
              )}
            </div>

            {extractedColors.length > 0 && (
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Click a color to apply:</p>
                <div className="flex gap-1 mb-2">
                  {extractedColors.map((color, idx) => (
                    <div key={idx} className="relative group">
                      <div
                        className="w-8 h-8 rounded-md cursor-pointer ring-2 ring-transparent hover:ring-blue-400 transition-all"
                        style={{ backgroundColor: `rgb(${color})` }}
                        title={`rgb(${color})`}
                      />
                      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-0.5 bg-white shadow-lg rounded p-1 z-10">
                        <button
                          type="button"
                          onClick={() => applyExtractedColor(color, 'primary')}
                          className="px-2 py-0.5 text-[10px] hover:bg-gray-100 rounded whitespace-nowrap"
                        >
                          As Primary
                        </button>
                        <button
                          type="button"
                          onClick={() => applyExtractedColor(color, 'secondary')}
                          className="px-2 py-0.5 text-[10px] hover:bg-gray-100 rounded whitespace-nowrap"
                        >
                          As Secondary
                        </button>
                        <button
                          type="button"
                          onClick={() => applyExtractedColor(color, 'accent')}
                          className="px-2 py-0.5 text-[10px] hover:bg-gray-100 rounded whitespace-nowrap"
                        >
                          As Accent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setExtractedColors([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div
            className="p-3 rounded-lg border"
            style={{ backgroundColor: rgbToHex(currentTheme.backgroundColor) }}
          >
            <div
              className="p-3 rounded-lg shadow-sm"
              style={{ backgroundColor: rgbToHex(currentTheme.surfaceColor) }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${rgbToHex(currentTheme.primaryColor)} 0%, ${rgbToHex(currentTheme.secondaryColor)} 100%)`,
                  }}
                />
                <div>
                  <h4
                    className="font-medium text-sm"
                    style={{ color: rgbToHex(currentTheme.textPrimaryColor) }}
                  >
                    Campaign Name
                  </h4>
                  <p
                    className="text-xs"
                    style={{ color: rgbToHex(currentTheme.textSecondaryColor) }}
                  >
                    Description preview
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: rgbToHex(currentTheme.primaryColor) }}
                >
                  Primary
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: rgbToHex(currentTheme.accentColor) }}
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Animation Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Animation Effect</label>
          <div className="flex flex-wrap gap-1">
            {(['none', 'confetti', 'particles', 'gradient'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAnimationChange(type)}
                className={`px-2 py-1 rounded text-xs capitalize ${
                  currentTheme.animationType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'none' ? 'None' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Colors */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Colors
          </button>

          {showAdvanced && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: 'primaryColor', label: 'Primary' },
                { key: 'primaryHoverColor', label: 'Primary Hover' },
                { key: 'secondaryColor', label: 'Secondary' },
                { key: 'accentColor', label: 'Accent' },
                { key: 'backgroundColor', label: 'Background' },
                { key: 'surfaceColor', label: 'Surface' },
                { key: 'textPrimaryColor', label: 'Text Primary' },
                { key: 'textSecondaryColor', label: 'Text Secondary' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] text-gray-600 mb-0.5">{label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={rgbToHex(currentTheme[key as keyof CampaignTheme] as string)}
                      onChange={(e) => handleColorChange(key as keyof CampaignTheme, e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={rgbToHex(currentTheme[key as keyof CampaignTheme] as string)}
                      onChange={(e) => handleColorChange(key as keyof CampaignTheme, e.target.value)}
                      className="flex-1 text-[10px] px-1.5 py-0.5 border rounded w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
