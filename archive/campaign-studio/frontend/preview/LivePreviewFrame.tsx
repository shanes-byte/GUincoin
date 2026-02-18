import { useRef, useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import { CampaignTheme } from '../../../../services/api';

const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '100%' },
  mobile: { width: '375px', height: '100%' },
};

export default function LivePreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const {
    previewState,
    getCurrentTheme,
    selectedCampaign,
    togglePreview,
  } = useStudio();

  const theme = getCurrentTheme();

  // Send theme to iframe via postMessage
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    const sendTheme = () => {
      iframe.contentWindow?.postMessage(
        {
          type: 'THEME_UPDATE',
          theme: previewState.previewTheme || theme,
        },
        window.location.origin
      );
    };

    // Send on load
    iframe.onload = sendTheme;

    // Send on theme change
    sendTheme();
  }, [theme, previewState.previewTheme]);

  const deviceSize = DEVICE_SIZES[previewState.device];

  // Generate preview HTML with theme applied
  const generatePreviewHTML = (theme: CampaignTheme) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }

            :root {
              --color-primary: ${theme.primaryColor};
              --color-primary-hover: ${theme.primaryHoverColor};
              --color-secondary: ${theme.secondaryColor};
              --color-accent: ${theme.accentColor};
              --color-background: ${theme.backgroundColor};
              --color-surface: ${theme.surfaceColor};
              --color-text-primary: ${theme.textPrimaryColor};
              --color-text-secondary: ${theme.textSecondaryColor};
            }

            body {
              font-family: system-ui, -apple-system, sans-serif;
              background-color: rgb(var(--color-background));
              color: rgb(var(--color-text-primary));
              min-height: 100vh;
            }

            .nav {
              background-color: rgb(var(--color-surface));
              border-bottom: 1px solid rgba(0,0,0,0.1);
              padding: 16px 24px;
              display: flex;
              align-items: center;
              gap: 24px;
            }

            .nav-brand {
              font-weight: bold;
              font-size: 20px;
              background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }

            .nav-link {
              color: rgb(var(--color-text-secondary));
              text-decoration: none;
              font-size: 14px;
            }

            .nav-link:hover {
              color: rgb(var(--color-text-primary));
            }

            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 32px 24px;
            }

            .card {
              background-color: rgb(var(--color-surface));
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .card-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 12px;
              color: rgb(var(--color-text-primary));
            }

            .card-text {
              color: rgb(var(--color-text-secondary));
              font-size: 14px;
              line-height: 1.5;
            }

            .btn {
              display: inline-block;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              text-decoration: none;
              cursor: pointer;
              border: none;
              transition: background-color 0.2s;
            }

            .btn-primary {
              background-color: rgb(var(--color-primary));
              color: white;
            }

            .btn-primary:hover {
              background-color: rgb(var(--color-primary-hover));
            }

            .btn-accent {
              background-color: rgb(var(--color-accent));
              color: white;
            }

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-top: 16px;
            }

            .stat-card {
              background: linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-secondary)) 100%);
              border-radius: 8px;
              padding: 16px;
              color: white;
              text-align: center;
            }

            .stat-value {
              font-size: 24px;
              font-weight: bold;
            }

            .stat-label {
              font-size: 12px;
              opacity: 0.9;
              margin-top: 4px;
            }

            .campaign-banner {
              background: linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-secondary)) 100%);
              border-radius: 12px;
              padding: 32px;
              color: white;
              text-align: center;
              margin-bottom: 24px;
            }

            .campaign-title {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
            }

            .campaign-description {
              opacity: 0.9;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <nav class="nav">
            <span class="nav-brand">GuinCoin</span>
            <a href="#" class="nav-link">Dashboard</a>
            <a href="#" class="nav-link">Transfers</a>
            <a href="#" class="nav-link">Store</a>
            <a href="#" class="nav-link">Wellness</a>
          </nav>

          <div class="container">
            <div class="campaign-banner">
              <div class="campaign-title">${selectedCampaign?.name || 'Campaign Name'}</div>
              <div class="campaign-description">${selectedCampaign?.description || 'Campaign description goes here'}</div>
            </div>

            <div class="card">
              <div class="card-title">Your Balance</div>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">1,234</div>
                  <div class="stat-label">Posted</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">56</div>
                  <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">1,290</div>
                  <div class="stat-label">Total</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title">Quick Actions</div>
              <div class="card-text" style="margin-bottom: 16px;">
                Transfer coins to teammates or browse the store.
              </div>
              <div style="display: flex; gap: 12px;">
                <button class="btn btn-primary">Send Transfer</button>
                <button class="btn btn-accent">Browse Store</button>
              </div>
            </div>
          </div>

          <script>
            window.addEventListener('message', (event) => {
              if (event.data.type === 'THEME_UPDATE') {
                const theme = event.data.theme;
                const root = document.documentElement;

                root.style.setProperty('--color-primary', theme.primaryColor);
                root.style.setProperty('--color-primary-hover', theme.primaryHoverColor);
                root.style.setProperty('--color-secondary', theme.secondaryColor);
                root.style.setProperty('--color-accent', theme.accentColor);
                root.style.setProperty('--color-background', theme.backgroundColor);
                root.style.setProperty('--color-surface', theme.surfaceColor);
                root.style.setProperty('--color-text-primary', theme.textPrimaryColor);
                root.style.setProperty('--color-text-secondary', theme.textSecondaryColor);
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="h-10 bg-gray-800 flex items-center justify-between px-4">
        <span className="text-sm text-gray-400">
          Live Preview - {previewState.device.charAt(0).toUpperCase() + previewState.device.slice(1)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const iframe = iframeRef.current;
              if (iframe) {
                iframe.src = iframe.src;
              }
            }}
            className="p-1.5 text-gray-400 hover:text-white rounded"
            title="Refresh preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={togglePreview}
            className="p-1.5 text-gray-400 hover:text-white rounded"
            title="Close preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className="bg-white shadow-2xl rounded-lg overflow-hidden"
          style={{
            width: deviceSize.width,
            height: deviceSize.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={generatePreviewHTML(previewState.previewTheme || theme)}
            className="w-full h-full border-0"
            title="Campaign Preview"
          />
        </div>
      </div>
    </div>
  );
}
