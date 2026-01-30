import { useState, useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import { getCampaignAssets } from '../../../../services/api';

interface Asset {
  id: string;
  type: 'banner' | 'poster' | 'email' | 'chat';
  url: string;
  name: string;
  dimensions?: { width: number; height: number };
}

const ASSET_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'banner', label: 'Banners' },
  { key: 'poster', label: 'Posters' },
  { key: 'email', label: 'Email' },
  { key: 'chat', label: 'Chat' },
] as const;

export default function AssetLibraryPanel() {
  const {
    selectedCampaign,
    selectedAssetType,
    setSelectedAssetType,
  } = useStudio();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (!selectedCampaign) {
      setAssets([]);
      return;
    }

    const loadAssets = async () => {
      setLoading(true);
      try {
        const res = await getCampaignAssets(selectedCampaign.id);
        const loadedAssets: Asset[] = [];

        if (res.data.bannerImageUrl) {
          loadedAssets.push({
            id: 'banner-' + selectedCampaign.id,
            type: 'banner',
            url: res.data.bannerImageUrl,
            name: 'Campaign Banner',
            dimensions: { width: 728, height: 90 },
          });
        }
        if (res.data.posterImageUrl) {
          loadedAssets.push({
            id: 'poster-' + selectedCampaign.id,
            type: 'poster',
            url: res.data.posterImageUrl,
            name: 'Campaign Poster',
            dimensions: { width: 800, height: 600 },
          });
        }
        if (res.data.emailBannerUrl) {
          loadedAssets.push({
            id: 'email-' + selectedCampaign.id,
            type: 'email',
            url: res.data.emailBannerUrl,
            name: 'Email Banner',
            dimensions: { width: 600, height: 200 },
          });
        }
        if (res.data.chatImageUrl) {
          loadedAssets.push({
            id: 'chat-' + selectedCampaign.id,
            type: 'chat',
            url: res.data.chatImageUrl,
            name: 'Chat Image',
            dimensions: { width: 400, height: 300 },
          });
        }

        setAssets(loadedAssets);
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [selectedCampaign]);

  const filteredAssets = selectedAssetType === 'all'
    ? assets
    : assets.filter((a) => a.type === selectedAssetType);

  const handleDragStart = (asset: Asset, e: React.DragEvent) => {
    setDraggedAsset(asset);
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedAsset(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Asset Library</h3>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-1">
          {ASSET_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedAssetType(key)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedAssetType === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {!selectedCampaign ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Select a campaign to view assets
          </div>
        ) : loading ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading assets...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            No assets yet
            <p className="text-xs mt-1">Generate images using the AI Assistant</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(asset, e)}
                onDragEnd={handleDragEnd}
                className={`group relative bg-gray-100 rounded-lg overflow-hidden cursor-move transition-transform hover:scale-105 ${
                  draggedAsset?.id === asset.id ? 'opacity-50' : ''
                }`}
              >
                <div className="aspect-video relative">
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-medium text-gray-900 truncate">{asset.name}</p>
                  {asset.dimensions && (
                    <p className="text-[10px] text-gray-500">
                      {asset.dimensions.width}x{asset.dimensions.height}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-200">
        <button
          disabled={!selectedCampaign}
          className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Image
        </button>
      </div>
    </div>
  );
}
