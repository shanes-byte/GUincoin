import { StudioProvider, useStudio } from './context/StudioContext';
import StudioLayout from './layout/StudioLayout';
import CampaignPanel from './panels/CampaignPanel';
import AssetLibraryPanel from './panels/AssetLibraryPanel';
import LayerPanel from './panels/LayerPanel';
import ThemeControlPanel from './panels/ThemeControlPanel';
import PropertiesPanel from './panels/PropertiesPanel';
import TasksPanel from './panels/TasksPanel';
import AIPromptBuilder from './ai/AIPromptBuilder';
import CanvasWorkspace from './canvas/CanvasWorkspace';
import LivePreviewFrame from './preview/LivePreviewFrame';
import ActivationWizard from './activation/ActivationWizard';
import ErrorBoundary from './ErrorBoundary';

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-1">Loading Campaign Studio</h2>
        <p className="text-sm text-gray-500">Preparing your creative workspace...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h2>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function LeftPanel() {
  const { leftPanelTab, setLeftPanelTab } = useStudio();

  return (
    <div className="h-full flex flex-col">
      {/* Tab Selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setLeftPanelTab('campaigns')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            leftPanelTab === 'campaigns'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setLeftPanelTab('assets')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            leftPanelTab === 'assets'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Assets
        </button>
        <button
          onClick={() => setLeftPanelTab('layers')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            leftPanelTab === 'layers'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Layers
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary fallback={<PanelErrorFallback name="Campaign" />}>
          {leftPanelTab === 'campaigns' && <CampaignPanel />}
        </ErrorBoundary>
        <ErrorBoundary fallback={<PanelErrorFallback name="Assets" />}>
          {leftPanelTab === 'assets' && <AssetLibraryPanel />}
        </ErrorBoundary>
        <ErrorBoundary fallback={<PanelErrorFallback name="Layers" />}>
          {leftPanelTab === 'layers' && <LayerPanel />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function RightPanel() {
  const { rightPanelTab, setRightPanelTab } = useStudio();

  return (
    <div className="h-full flex flex-col">
      {/* Tab Selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setRightPanelTab('properties')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            rightPanelTab === 'properties'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setRightPanelTab('theme')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            rightPanelTab === 'theme'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Theme
        </button>
        <button
          onClick={() => setRightPanelTab('tasks')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            rightPanelTab === 'tasks'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setRightPanelTab('ai')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            rightPanelTab === 'ai'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary fallback={<PanelErrorFallback name="Properties" />}>
          {rightPanelTab === 'properties' && <PropertiesPanel />}
        </ErrorBoundary>
        <ErrorBoundary fallback={<PanelErrorFallback name="Theme" />}>
          {rightPanelTab === 'theme' && <ThemeControlPanel />}
        </ErrorBoundary>
        <ErrorBoundary fallback={<PanelErrorFallback name="Tasks" />}>
          {rightPanelTab === 'tasks' && <TasksPanel />}
        </ErrorBoundary>
        <ErrorBoundary fallback={<PanelErrorFallback name="AI" />}>
          {rightPanelTab === 'ai' && <AIPromptBuilder />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function PanelErrorFallback({ name }: { name: string }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-gray-500">{name} panel encountered an error</p>
      </div>
    </div>
  );
}

function StudioContent() {
  const { isInitializing, error, clearError, refreshCampaigns } = useStudio();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          clearError();
          refreshCampaigns();
        }}
      />
    );
  }

  return (
    <>
      <StudioLayout
        leftPanel={<LeftPanel />}
        centerPanel={
          <ErrorBoundary fallback={<CanvasErrorFallback />}>
            <CanvasWorkspace />
          </ErrorBoundary>
        }
        rightPanel={<RightPanel />}
        previewPanel={
          <ErrorBoundary fallback={<PreviewErrorFallback />}>
            <LivePreviewFrame />
          </ErrorBoundary>
        }
      />
      <ActivationWizard />
    </>
  );
}

function CanvasErrorFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Canvas Error</h3>
        <p className="text-sm text-gray-500">The canvas editor encountered an error.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Reload Studio
        </button>
      </div>
    </div>
  );
}

function PreviewErrorFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-900">
      <div className="text-center p-8">
        <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-400 mb-2">Preview Error</h3>
        <p className="text-sm text-gray-500">Failed to load preview.</p>
      </div>
    </div>
  );
}

export default function CampaignStudio() {
  return (
    <ErrorBoundary>
      <StudioProvider>
        <StudioContent />
      </StudioProvider>
    </ErrorBoundary>
  );
}
