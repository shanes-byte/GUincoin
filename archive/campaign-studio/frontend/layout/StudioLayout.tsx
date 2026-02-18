import { ReactNode } from 'react';
import StudioHeader from './StudioHeader';
import StudioStatusBar from './StudioStatusBar';
import { useStudio } from '../context/StudioContext';

interface StudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  previewPanel?: ReactNode;
}

export default function StudioLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  previewPanel,
}: StudioLayoutProps) {
  const { previewState } = useStudio();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <StudioHeader />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 240px */}
        <div className="w-60 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {leftPanel}
        </div>

        {/* Center - Canvas Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Area */}
          <div className={`flex-1 overflow-hidden ${previewState.isOpen ? 'h-1/2' : 'h-full'}`}>
            {centerPanel}
          </div>

          {/* Preview Panel (collapsible) */}
          {previewState.isOpen && previewPanel && (
            <div className="h-1/2 border-t border-gray-200 overflow-hidden">
              {previewPanel}
            </div>
          )}
        </div>

        {/* Right Panel - 320px */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {rightPanel}
        </div>
      </div>

      {/* Status Bar */}
      <StudioStatusBar />
    </div>
  );
}
