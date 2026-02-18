import { useStudio } from '../context/StudioContext';

export default function StudioHeader() {
  const {
    campaigns,
    selectedCampaign,
    selectCampaign,
    campaignsLoading,
    themeMode,
    setThemeMode,
    hasUnsavedChanges,
  } = useStudio();

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      {/* Left: Campaign Selector */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Campaign Studio</h1>

        <div className="flex items-center gap-2">
          <label htmlFor="campaign-select" className="text-sm text-gray-600">
            Campaign:
          </label>
          <select
            id="campaign-select"
            value={selectedCampaign?.id || ''}
            onChange={(e) => selectCampaign(e.target.value || null)}
            disabled={campaignsLoading}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
          >
            <option value="">Select a campaign...</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
                {campaign.status === 'active' && ' (Active)'}
              </option>
            ))}
          </select>

          {campaignsLoading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Center: Mode Toggle */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setThemeMode('campaign')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            themeMode === 'campaign'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Campaign Mode
        </button>
        <button
          onClick={() => setThemeMode('manual')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            themeMode === 'manual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Manual Mode
        </button>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center gap-4">
        {hasUnsavedChanges && (
          <span className="text-sm text-amber-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Unsaved changes
          </span>
        )}

        {selectedCampaign && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
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
        )}
      </div>
    </header>
  );
}
