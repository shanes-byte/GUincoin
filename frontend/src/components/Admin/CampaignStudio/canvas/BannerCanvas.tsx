import { useEffect, useRef, useState, useCallback } from 'react';
import { useStudio } from '../context/StudioContext';

// History management hook for undo/redo
function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const current = history[historyIndex];

  const push = useCallback((newState: T) => {
    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state, limit history to 50 entries
      const limited = [...newHistory, newState].slice(-50);
      setHistoryIndex(limited.length - 1);
      return limited;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    setHistoryIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

// Banner dimension presets
const BANNER_PRESETS = {
  header: { width: 728, height: 90, label: 'Header (728x90)' },
  sidebar: { width: 160, height: 600, label: 'Sidebar (160x600)' },
  poster: { width: 800, height: 600, label: 'Poster (800x600)' },
  email: { width: 600, height: 200, label: 'Email (600x200)' },
  chat: { width: 400, height: 300, label: 'Chat (400x300)' },
  background: { width: 1920, height: 1080, label: 'Background (1920x1080)' },
};

type BannerPreset = keyof typeof BANNER_PRESETS;

interface CanvasLayer {
  id: string;
  type: 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // URL for images, text content for text
  zIndex: number;
}

export default function BannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasState, selectedCampaign, getCurrentTheme, setSelectedObjects } = useStudio();

  const [selectedPreset, setSelectedPreset] = useState<BannerPreset>('header');
  const [canvasDimensions, setCanvasDimensions] = useState(BANNER_PRESETS.header);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());

  // Use history hook for undo/redo support
  const {
    current: layers,
    push: pushLayers,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<CanvasLayer[]>([]);

  const theme = getCurrentTheme();

  // Load image helper
  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Render canvas
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;

    // Draw background
    const bgColor = rgbToHex(theme.surfaceColor);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, rgbToHex(theme.primaryColor) + '20');
    gradient.addColorStop(1, rgbToHex(theme.secondaryColor) + '20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw layers (sorted by zIndex)
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (layer.type === 'image') {
        let img = loadedImages.get(layer.content);
        if (!img) {
          try {
            img = await loadImage(layer.content);
            setLoadedImages(prev => new Map(prev).set(layer.content, img!));
          } catch (e) {
            console.error('Failed to load image:', e);
            continue;
          }
        }
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);

        // Draw selection border if selected
        if (canvasState.selectedObjectIds.includes(layer.id)) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(layer.x - 2, layer.y - 2, layer.width + 4, layer.height + 4);
          ctx.setLineDash([]);
        }
      } else if (layer.type === 'text') {
        ctx.fillStyle = rgbToHex(theme.textPrimaryColor);
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(layer.content, layer.x, layer.y);
      }
    }

    // If no layers, draw placeholder text
    if (layers.length === 0) {
      ctx.fillStyle = rgbToHex(theme.textPrimaryColor);
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = selectedCampaign?.name || 'Drop images here';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    // Draw border
    ctx.strokeStyle = rgbToHex(theme.primaryColor);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  }, [canvasDimensions, theme, selectedCampaign, layers, loadedImages, loadImage, canvasState.selectedObjectIds]);

  // Re-render on changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle preset change
  const handlePresetChange = (preset: BannerPreset) => {
    setSelectedPreset(preset);
    setCanvasDimensions(BANNER_PRESETS[preset]);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      if (!asset.url) return;

      // Calculate drop position relative to canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scale = calculateScale();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      // Calculate size to fit within canvas while maintaining aspect ratio
      const maxWidth = canvasDimensions.width * 0.8;
      const maxHeight = canvasDimensions.height * 0.8;
      let width = asset.dimensions?.width || maxWidth;
      let height = asset.dimensions?.height || maxHeight;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      // Center the dropped image at drop point
      const layerId = `layer-${Date.now()}`;
      const newLayer: CanvasLayer = {
        id: layerId,
        type: 'image',
        x: Math.max(0, Math.min(x - width / 2, canvasDimensions.width - width)),
        y: Math.max(0, Math.min(y - height / 2, canvasDimensions.height - height)),
        width,
        height,
        content: asset.url,
        zIndex: layers.length,
      };

      pushLayers([...layers, newLayer]);
      setSelectedObjects([layerId]);
    } catch (err) {
      console.error('Failed to parse dropped asset:', err);
    }
  };

  // Handle canvas click for selection
  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = calculateScale();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Find clicked layer (top-most first)
    const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    for (const layer of sortedLayers) {
      if (
        x >= layer.x &&
        x <= layer.x + layer.width &&
        y >= layer.y &&
        y <= layer.y + layer.height
      ) {
        setSelectedObjects([layer.id]);
        return;
      }
    }

    // Clicked on empty area
    setSelectedObjects([]);
  };

  // Delete selected layer
  const handleDeleteSelected = useCallback(() => {
    if (canvasState.selectedObjectIds.length === 0) return;
    pushLayers(layers.filter(l => !canvasState.selectedObjectIds.includes(l.id)));
    setSelectedObjects([]);
  }, [canvasState.selectedObjectIds, setSelectedObjects, layers, pushLayers]);

  // Clear all layers
  const handleClearCanvas = () => {
    if (!confirm('Clear all layers from the canvas?')) return;
    pushLayers([]);
    setSelectedObjects([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Delete or Backspace to remove selected layer
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState.selectedObjectIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedObjects([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState.selectedObjectIds, handleDeleteSelected, setSelectedObjects, canUndo, canRedo, undo, redo]);

  // Calculate scale to fit canvas in container
  const calculateScale = () => {
    if (!containerRef.current) return 1;

    const containerWidth = containerRef.current.clientWidth - 48;
    const containerHeight = containerRef.current.clientHeight - 120;

    const scaleX = containerWidth / canvasDimensions.width;
    const scaleY = containerHeight / canvasDimensions.height;

    return Math.min(scaleX, scaleY, 1) * canvasState.zoom;
  };

  const scale = calculateScale();

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-gray-100">
      {/* Preset Selector */}
      <div className="p-3 bg-white border-b border-gray-200 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Canvas Size:</label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value as BannerPreset)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(BANNER_PRESETS).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500">
          {canvasDimensions.width} x {canvasDimensions.height}px
        </span>

        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-4 ml-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />

        {layers.length > 0 && (
          <>
            {canvasState.selectedObjectIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                Delete Selected
              </button>
            )}
            <button
              onClick={handleClearCanvas}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Clear All
            </button>
          </>
        )}

        <button
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) {
              const link = document.createElement('a');
              link.download = `${selectedCampaign?.slug || 'banner'}-${selectedPreset}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
            }
          }}
        >
          Export PNG
        </button>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 flex items-center justify-center p-6 overflow-auto"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={`relative bg-white shadow-lg transition-all ${
            isDragOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
          }`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Checkerboard background for transparency */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #ccc 25%, transparent 25%),
                linear-gradient(-45deg, #ccc 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #ccc 75%),
                linear-gradient(-45deg, transparent 75%, #ccc 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          />

          <canvas
            ref={canvasRef}
            className="relative cursor-crosshair"
            style={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
            }}
            onClick={handleCanvasClick}
          />

          {/* Drop overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center pointer-events-none">
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                <span className="text-blue-600 font-medium">Drop to add image</span>
              </div>
            </div>
          )}

          {/* Dimension labels */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
            {canvasDimensions.width}px
          </div>
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 rotate-90 text-xs text-gray-500">
            {canvasDimensions.height}px
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-white border-t border-gray-200 text-center text-sm text-gray-500">
        {!selectedCampaign ? (
          'Select a campaign to start designing'
        ) : layers.length === 0 ? (
          <>
            Drag images from the Asset Library to add them to the canvas.
            <span className="mx-2">|</span>
            Click on a layer to select it.
          </>
        ) : (
          <>
            {layers.length} layer(s)
            <span className="mx-2">|</span>
            {canvasState.selectedObjectIds.length > 0
              ? 'Press Delete to remove selected'
              : 'Click a layer to select'}
          </>
        )}
      </div>
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const parts = rgb.split(' ').map(Number);
  if (parts.length !== 3) return '#3b82f6';
  const [r, g, b] = parts;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
