import { useStudio } from '../context/StudioContext';

export default function StudioStatusBar() {
  const {
    selectedCampaign,
    hasUnsavedChanges,
    previewState,
    setPreviewDevice,
    togglePreview,
    openActivationWizard,
    canvasState,
    setCanvasZoom,
  } = useStudio();

  const zoomPercentage = Math.round(canvasState.zoom * 100);

  return (
    <footer className="h-10 border-t border-gray-200 bg-white flex items-center justify-between px-4 text-sm">
      {/* Left: Status */}
      <div className="flex items-center gap-4">
        {hasUnsavedChanges ? (
          <span className="text-amber-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Unsaved changes
          </span>
        ) : (
          <span className="text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            All changes saved
          </span>
        )}

        {selectedCampaign && (
          <span className="text-gray-400">|</span>
        )}

        {selectedCampaign && (
          <span className="text-gray-600">
            Editing: <strong>{selectedCampaign.name}</strong>
          </span>
        )}
      </div>

      {/* Center: Preview Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={`p-1.5 rounded transition-colors ${
              previewState.device === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
            title="Desktop view"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewDevice('tablet')}
            className={`p-1.5 rounded transition-colors ${
              previewState.device === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
            title="Tablet view"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={`p-1.5 rounded transition-colors ${
              previewState.device === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
            title="Mobile view"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <button
          onClick={togglePreview}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            previewState.isOpen
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {previewState.isOpen ? 'Close Preview' : 'Live Preview'}
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCanvasZoom(canvasState.zoom - 0.1)}
            className="p-1 rounded hover:bg-gray-100"
            title="Zoom out"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-gray-600 w-12 text-center">{zoomPercentage}%</span>
          <button
            onClick={() => setCanvasZoom(canvasState.zoom + 0.1)}
            className="p-1 rounded hover:bg-gray-100"
            title="Zoom in"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right: Activate Button */}
      <div className="flex items-center gap-2">
        {selectedCampaign && selectedCampaign.status !== 'active' && (
          <button
            onClick={openActivationWizard}
            className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Activate Campaign
          </button>
        )}

        {selectedCampaign?.status === 'active' && (
          <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-md flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>
    </footer>
  );
}
