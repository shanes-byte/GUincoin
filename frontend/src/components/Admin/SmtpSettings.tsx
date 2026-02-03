import { useState, useEffect } from 'react';
import { getSmtpSettings, updateSmtpSettings, testSmtpConnection, SmtpSettings as SmtpSettingsType } from '../../services/api';

export default function SmtpSettings() {
  const [settings, setSettings] = useState<SmtpSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'Guincoin Rewards',
    fromEmail: '',
    isEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSmtpSettings();
      setSettings(res.data);
      setFormData({
        host: res.data.host || '',
        port: res.data.port || 587,
        secure: res.data.secure || false,
        user: res.data.user || '',
        pass: res.data.hasPassword ? '********' : '',
        fromName: res.data.fromName || 'Guincoin Rewards',
        fromEmail: res.data.fromEmail || '',
        isEnabled: res.data.isEnabled || false,
      });
    } catch (err) {
      setError('Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const dataToSave = {
        ...formData,
        // Only send password if it's been changed from the placeholder
        pass: formData.pass === '********' ? undefined : formData.pass,
      };

      await updateSmtpSettings(dataToSave);
      setSuccess('SMTP settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const res = await testSmtpConnection(testEmail || undefined);
      if (res.data.success) {
        setSuccess(res.data.message || 'SMTP connection test successful');
      } else {
        setError(res.data.error || 'SMTP connection test failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'SMTP connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Email Settings (SMTP)</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your email server to send notifications to users
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Gmail Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>
              Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Account Security Settings</a>
            </li>
            <li>
              Enable <strong>2-Step Verification</strong> if not already enabled
            </li>
            <li>
              Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">App Passwords</a>
            </li>
            <li>
              Select "Mail" and your device, then click "Generate"
            </li>
            <li>
              Copy the 16-character password and paste it in the "App Password" field below
            </li>
          </ol>
          <div className="mt-3 p-3 bg-blue-100 rounded text-sm">
            <strong>Gmail Settings:</strong>
            <ul className="mt-1 space-y-1">
              <li>SMTP Host: <code className="bg-blue-200 px-1 rounded">smtp.gmail.com</code></li>
              <li>Port: <code className="bg-blue-200 px-1 rounded">587</code> (TLS) or <code className="bg-blue-200 px-1 rounded">465</code> (SSL)</li>
              <li>Username: Your full Gmail address</li>
              <li>Password: The App Password you generated (NOT your Gmail password)</li>
            </ul>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Enable Email Sending</h4>
            <p className="text-sm text-gray-500">Turn on to send emails via SMTP</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* SMTP Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
                className="w-24 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={formData.secure}
                  onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                Use SSL (port 465)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username (Email)
            </label>
            <input
              type="email"
              value={formData.user}
              onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              placeholder="your-email@gmail.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.pass}
                onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                placeholder="16-character app password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Name
            </label>
            <input
              type="text"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              placeholder="Guincoin Rewards"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Email (optional)
            </label>
            <input
              type="email"
              value={formData.fromEmail}
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              placeholder="Same as username if blank"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Test Connection */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Test Connection</h4>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send test email to (optional)
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleTest}
              disabled={testing || !formData.host || !formData.user}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>
          {settings?.lastTestedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Last tested: {new Date(settings.lastTestedAt).toLocaleString()} -
              <span className={settings.lastTestResult === 'success' ? 'text-green-600' : 'text-red-600'}>
                {' '}{settings.lastTestResult}
              </span>
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className="border-t pt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
