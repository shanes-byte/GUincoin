import CanvasToolbar from './CanvasToolbar';
import BannerCanvas from './BannerCanvas';

export default function CanvasWorkspace() {
  return (
    <div className="h-full flex flex-col">
      <CanvasToolbar />
      <div className="flex-1 overflow-hidden">
        <BannerCanvas />
      </div>
    </div>
  );
}
