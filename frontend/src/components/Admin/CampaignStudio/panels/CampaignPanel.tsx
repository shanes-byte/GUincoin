import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { createCampaign, activateCampaign, deactivateCampaign, deleteCampaign, CampaignCreateInput, CampaignTheme } from '../../../../services/api';

// Campaign templates with predefined themes and settings
const CAMPAIGN_TEMPLATES = [
  {
    id: 'wellness-challenge',
    name: 'Wellness Challenge',
    icon: '🏃',
    description: 'Monthly fitness and health challenge',
    theme: {
      primaryColor: '16 185 129',
      primaryHoverColor: '5 150 105',
      primaryLightColor: '209 250 229',
      secondaryColor: '34 197 94',
      accentColor: '245 158 11',
      backgroundColor: '240 253 244',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
  {
    id: 'mental-health',
    name: 'Mental Health Month',
    icon: '🧠',
    description: 'Focus on mindfulness and stress relief',
    theme: {
      primaryColor: '139 92 246',
      primaryHoverColor: '124 58 237',
      primaryLightColor: '237 233 254',
      secondaryColor: '168 85 247',
      accentColor: '236 72 153',
      backgroundColor: '250 245 255',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
  {
    id: 'step-challenge',
    name: 'Step Challenge',
    icon: '👟',
    description: 'Team walking competition',
    theme: {
      primaryColor: '59 130 246',
      primaryHoverColor: '37 99 235',
      primaryLightColor: '219 234 254',
      secondaryColor: '14 165 233',
      accentColor: '34 211 238',
      backgroundColor: '240 249 255',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
  {
    id: 'nutrition-focus',
    name: 'Nutrition Month',
    icon: '🥗',
    description: 'Healthy eating and meal tracking',
    theme: {
      primaryColor: '234 88 12',
      primaryHoverColor: '194 65 12',
      primaryLightColor: '255 237 213',
      secondaryColor: '249 115 22',
      accentColor: '132 204 22',
      backgroundColor: '255 251 235',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
  {
    id: 'sleep-wellness',
    name: 'Sleep Wellness',
    icon: '😴',
    description: 'Better sleep habits program',
    theme: {
      primaryColor: '99 102 241',
      primaryHoverColor: '79 70 229',
      primaryLightColor: '224 231 255',
      secondaryColor: '129 140 248',
      accentColor: '251 191 36',
      backgroundColor: '238 242 255',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
  {
    id: 'team-building',
    name: 'Team Building',
    icon: '🤝',
    description: 'Group activities and collaboration',
    theme: {
      primaryColor: '236 72 153',
      primaryHoverColor: '219 39 119',
      primaryLightColor: '252 231 243',
      secondaryColor: '244 114 182',
      accentColor: '168 85 247',
      backgroundColor: '253 242 248',
      surfaceColor: '255 255 255',
      textPrimaryColor: '17 24 39',
      textSecondaryColor: '107 114 128',
    } as CampaignTheme,
  },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-red-100 text-red-800',
};

export default function CampaignPanel() {
  const {
    campaigns,
    selectedCampaign,
    selectCampaign,
    refreshCampaigns,
    campaignsLoading,
    themePresets,
  } = useStudio();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof CAMPAIGN_TEMPLATES[0] | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newCampaignName.trim()) return;

    setCreating(true);
    try {
      // Use template theme if selected, otherwise default
      const theme = selectedTemplate?.theme || themePresets['default'] || {
        primaryColor: '37 99 235',
        primaryHoverColor: '29 78 216',
        primaryLightColor: '219 234 254',
        secondaryColor: '124 58 237',
        accentColor: '16 185 129',
        backgroundColor: '249 250 251',
        surfaceColor: '255 255 255',
        textPrimaryColor: '17 24 39',
        textSecondaryColor: '107 114 128',
      };

      const data: CampaignCreateInput = {
        name: newCampaignName.trim(),
        description: selectedTemplate?.description,
        theme,
      };

      const res = await createCampaign(data);
      await refreshCampaigns();
      selectCampaign(res.data.id);
      setShowCreateForm(false);
      setShowTemplates(false);
      setNewCampaignName('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectTemplate = (template: typeof CAMPAIGN_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setNewCampaignName(template.name);
    setShowTemplates(false);
    setShowCreateForm(true);
  };

  const handleActivate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await activateCampaign(id);
      await refreshCampaigns();
      if (selectedCampaign?.id === id) {
        selectCampaign(id);
      }
    } catch (error) {
      console.error('Failed to activate campaign:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await deactivateCampaign(id);
      await refreshCampaigns();
      if (selectedCampaign?.id === id) {
        selectCampaign(id);
      }
    } catch (error) {
      console.error('Failed to deactivate campaign:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to archive this campaign?')) return;

    setActionLoading(id);
    try {
      await deleteCampaign(id);
      await refreshCampaigns();
      if (selectedCampaign?.id === id) {
        selectCampaign(null);
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Campaigns</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowTemplates(!showTemplates);
                setShowCreateForm(false);
              }}
              className={`p-1 rounded-md transition-colors ${showTemplates ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Use template"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setShowTemplates(false);
                setSelectedTemplate(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Create blank campaign"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="p-3 border-b border-gray-200 bg-purple-50">
          <h4 className="text-xs font-medium text-purple-900 mb-2">Choose a Template</h4>
          <div className="grid grid-cols-2 gap-2">
            {CAMPAIGN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="p-2 bg-white border border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-xs font-medium text-gray-900 truncate">{template.name}</span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ background: `rgb(${template.theme.primaryColor})` }}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTemplates(false)}
            className="w-full mt-2 text-xs text-purple-600 hover:text-purple-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          {selectedTemplate && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-md border border-blue-200">
              <span className="text-lg">{selectedTemplate.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900">Using template</div>
                <div className="text-xs text-gray-500 truncate">{selectedTemplate.description}</div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <input
            type="text"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            placeholder="Campaign name..."
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newCampaignName.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCampaignName('');
                setSelectedTemplate(null);
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="flex-1 overflow-y-auto">
        {campaignsLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => selectCampaign(campaign.id)}
                className={`p-2 rounded-md cursor-pointer transition-colors group ${
                  selectedCampaign?.id === campaign.id
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-gray-100 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {campaign.name}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${STATUS_COLORS[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {campaign.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {actionLoading === campaign.id ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={(e) => handleActivate(campaign.id, e)}
                            className="p-1 hover:bg-green-100 rounded text-green-600"
                            title="Activate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {campaign.status === 'active' && (
                          <button
                            onClick={(e) => handleDeactivate(campaign.id, e)}
                            className="p-1 hover:bg-amber-100 rounded text-amber-600"
                            title="Deactivate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(campaign.id, e)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Archive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
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
