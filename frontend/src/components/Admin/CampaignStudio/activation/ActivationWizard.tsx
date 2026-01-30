import { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { activateCampaignFull } from '../../../../services/api';

const STEPS = [
  { id: 'checklist', title: 'Pre-flight Check' },
  { id: 'preview', title: 'Final Preview' },
  { id: 'options', title: 'Rollout Options' },
  { id: 'activate', title: 'Activate' },
];

export default function ActivationWizard() {
  const {
    activationState,
    closeActivationWizard,
    setActivationStep,
    updateRolloutOptions,
    selectedCampaign,
    selectCampaign,
    refreshCampaigns,
    getCurrentTheme,
  } = useStudio();

  const [activating, setActivating] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { checklist, rolloutOptions, step } = activationState;

  const allChecksPassed =
    checklist.themeReady && checklist.assetsReady && checklist.tasksLinked;

  const canProceed = () => {
    switch (step) {
      case 0:
        return allChecksPassed;
      case 1:
        return true;
      case 2:
        return rolloutOptions.applyTheme || rolloutOptions.sendEmail || rolloutOptions.postChat;
      case 3:
        return !activating;
      default:
        return false;
    }
  };

  const handleActivate = async () => {
    if (!selectedCampaign) return;

    setActivating(true);
    setError(null);

    try {
      await activateCampaignFull(selectedCampaign.id, {
        applyTheme: rolloutOptions.applyTheme,
        sendEmail: rolloutOptions.sendEmail,
        postChat: rolloutOptions.postChat,
      });

      await refreshCampaigns();
      await selectCampaign(selectedCampaign.id);

      setActivationComplete(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to activate campaign');
    } finally {
      setActivating(false);
    }
  };

  const theme = getCurrentTheme();

  if (!activationState.isWizardOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Activate Campaign
            </h2>
            <button
              onClick={closeActivationWizard}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    idx < step
                      ? 'bg-green-500 text-white'
                      : idx === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      idx < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activationComplete ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Campaign Activated!
              </h3>
              <p className="text-gray-600 mb-6">
                {selectedCampaign?.name} is now live and the theme has been applied site-wide.
              </p>
              <button
                onClick={closeActivationWizard}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Step 0: Checklist */}
              {step === 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Pre-flight Checklist
                  </h3>
                  <div className="space-y-3">
                    <ChecklistItem
                      checked={checklist.themeReady}
                      label="Theme configured"
                      description="Campaign has a theme set"
                    />
                    <ChecklistItem
                      checked={checklist.assetsReady}
                      label="Assets ready"
                      description="At least one banner or poster uploaded"
                    />
                    <ChecklistItem
                      checked={checklist.tasksLinked}
                      label="Tasks linked"
                      description="One or more wellness tasks assigned"
                    />
                  </div>

                  {!allChecksPassed && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        Complete all checklist items before activating.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Preview */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Preview Campaign
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div
                      className="h-48 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, rgb(${theme.primaryColor}), rgb(${theme.secondaryColor}))`,
                      }}
                    >
                      <div className="text-center text-white">
                        <h4 className="text-2xl font-bold mb-2">
                          {selectedCampaign?.name}
                        </h4>
                        <p className="opacity-90">
                          {selectedCampaign?.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Status: Draft</span>
                        <span>Tasks: {selectedCampaign?.campaignTasks?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Options */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Rollout Options
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolloutOptions.applyTheme}
                        onChange={(e) =>
                          updateRolloutOptions({ applyTheme: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Apply Theme</div>
                        <div className="text-sm text-gray-500">
                          Update site-wide theme to campaign colors
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolloutOptions.sendEmail}
                        onChange={(e) =>
                          updateRolloutOptions({ sendEmail: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Send Email Announcement</div>
                        <div className="text-sm text-gray-500">
                          Email all employees about the campaign launch
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolloutOptions.postChat}
                        onChange={(e) =>
                          updateRolloutOptions({ postChat: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Post to Google Chat</div>
                        <div className="text-sm text-gray-500">
                          Announce campaign in configured chat spaces
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Activate */}
              {step === 3 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Ready to Activate
                  </h3>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Campaign: {selectedCampaign?.name}</li>
                      {rolloutOptions.applyTheme && <li>- Theme will be applied site-wide</li>}
                      {rolloutOptions.sendEmail && <li>- Email announcement will be sent</li>}
                      {rolloutOptions.postChat && <li>- Google Chat announcement will be posted</li>}
                    </ul>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleActivate}
                    disabled={activating}
                    className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {activating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Activate Campaign
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!activationComplete && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setActivationStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < 3 && (
              <button
                onClick={() => setActivationStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  checked,
  label,
  description,
}: {
  checked: boolean;
  label: string;
  description: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        {checked ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div>
        <div className={`font-medium ${checked ? 'text-green-900' : 'text-gray-700'}`}>
          {label}
        </div>
        <div className={`text-sm ${checked ? 'text-green-700' : 'text-gray-500'}`}>
          {description}
        </div>
      </div>
    </div>
  );
}
