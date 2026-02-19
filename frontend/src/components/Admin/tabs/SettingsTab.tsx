import { useState, useEffect } from 'react';
import { EmailTemplate, Employee, ManagerAllotmentDetails, User, getDailyReportRecipients, updateDailyReportRecipients, triggerDailyReport } from '../../../services/api';
import SmtpSettings from '../SmtpSettings';
import AwardPresetsPanel from '../AwardPresetsPanel';

type SettingsSubTab = 'smtp' | 'email-templates' | 'roles' | 'allotments' | 'award-presets' | 'daily-report';

interface SettingsTabProps {
  user: User | null;
  settingsTab: SettingsSubTab;
  onSettingsTabChange: (tab: SettingsSubTab) => void;

  // Email Templates
  emailTemplates: EmailTemplate[];
  templatesLoading: boolean;
  savingTemplateKey: string | null;
  onTemplateChange: (key: string, updates: Partial<EmailTemplate>) => void;
  onSaveTemplate: (template: EmailTemplate) => void;

  // Role Management
  employees: Employee[];
  employeesLoading: boolean;
  updatingEmployeeId: string | null;
  showAddUserForm: boolean;
  newUserForm: { email: string; name: string; isManager: boolean; isAdmin: boolean; isGameMaster: boolean };
  creatingUser: boolean;
  onLoadEmployees: () => void;
  onUpdateRoles: (employeeId: string, updates: { isManager?: boolean; isAdmin?: boolean; isGameMaster?: boolean }) => void;
  onShowAddUserFormChange: (show: boolean) => void;
  onNewUserFormChange: (form: { email: string; name: string; isManager: boolean; isAdmin: boolean; isGameMaster: boolean }) => void;
  onCreateUser: (e: React.FormEvent) => void;

  // Bulk Upload
  onBulkUpload: (file: File) => Promise<void>;
  bulkUploading: boolean;

  // Balance Management
  balanceMap: Record<string, number>;
  balanceError: string | null;
  onRetryBalance: () => void;
  onAdjustBalance: (employeeId: string, amount: number, reason: string) => Promise<void>;

  // Manager Allotments
  managers: Employee[];
  managersLoading: boolean;
  selectedManagerId: string | null;
  selectedManagerAllotment: ManagerAllotmentDetails | null;
  allotmentLoading: boolean;
  depositForm: { amount: string; description: string };
  depositLoading: boolean;
  recurringForm: { amount: string };
  recurringLoading: boolean;
  onLoadManagers: () => void;
  onSelectManager: (managerId: string) => void;
  onDepositFormChange: (form: { amount: string; description: string }) => void;
  onRecurringFormChange: (form: { amount: string }) => void;
  onDeposit: (e: React.FormEvent) => void;
  onSetRecurring: (e: React.FormEvent) => void;
}

function DailyReportSection() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getDailyReportRecipients()
      .then(res => setRecipients(res.data.recipients))
      .catch(() => setMessage({ type: 'error', text: 'Failed to load recipients' }))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (recipients.includes(email)) return;
    setRecipients(prev => [...prev, email]);
    setNewEmail('');
  };

  const handleRemove = (email: string) => {
    setRecipients(prev => prev.filter(e => e !== email));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateDailyReportRecipients(recipients);
      setMessage({ type: 'success', text: 'Recipients saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save recipients.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await triggerDailyReport();
      if (res.data.skipped) {
        setMessage({ type: 'error', text: 'Report skipped — no recipients configured or template disabled.' });
      } else if (res.data.error) {
        setMessage({ type: 'error', text: `Report error: ${res.data.error}` });
      } else {
        setMessage({ type: 'success', text: `Report sent to ${res.data.sent} recipient(s).` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to trigger report.' });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Daily Balance Report</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure recipients for a daily email report sent at 6:00 AM with all balances, recent activity, and anomaly flags.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Recipient list */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
        {recipients.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No recipients configured.</p>
        ) : (
          <ul className="space-y-2">
            {recipients.map(email => (
              <li key={email} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                <span className="text-sm text-gray-800">{email}</span>
                <button
                  onClick={() => handleRemove(email)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add email */}
      <div className="flex gap-2 mb-6">
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="admin@company.com"
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100"
        >
          Add
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {triggering ? 'Sending...' : 'Send Test Report'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsTab({
  user,
  settingsTab,
  onSettingsTabChange,
  emailTemplates,
  templatesLoading,
  savingTemplateKey,
  onTemplateChange,
  onSaveTemplate,
  employees,
  employeesLoading,
  updatingEmployeeId,
  showAddUserForm,
  newUserForm,
  creatingUser,
  onLoadEmployees,
  onUpdateRoles,
  onShowAddUserFormChange,
  onNewUserFormChange,
  onCreateUser,
  onBulkUpload,
  bulkUploading,
  balanceMap,
  balanceError,
  onRetryBalance,
  onAdjustBalance,
  managers,
  managersLoading,
  selectedManagerId,
  selectedManagerAllotment,
  allotmentLoading,
  depositForm,
  depositLoading,
  recurringForm,
  recurringLoading,
  onLoadManagers,
  onSelectManager,
  onDepositFormChange,
  onRecurringFormChange,
  onDeposit,
  onSetRecurring,
}: SettingsTabProps) {
  const [adjustingEmployeeId, setAdjustingEmployeeId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEmployeeId) return;
    const amount = parseFloat(adjustForm.amount);
    if (isNaN(amount) || amount === 0) return;

    setAdjustLoading(true);
    try {
      await onAdjustBalance(adjustingEmployeeId, amount, adjustForm.reason);
      setAdjustingEmployeeId(null);
      setAdjustForm({ amount: '', reason: '' });
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onSettingsTabChange('smtp')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'smtp'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            SMTP / Email
          </button>
          <button
            onClick={() => onSettingsTabChange('email-templates')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'email-templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Email Templates
          </button>
          <button
            onClick={() => onSettingsTabChange('roles')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Role Management
          </button>
          <button
            onClick={() => onSettingsTabChange('allotments')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'allotments'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Manager Allotments
          </button>
          <button
            onClick={() => onSettingsTabChange('award-presets')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'award-presets'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Award Presets
          </button>
          <button
            onClick={() => onSettingsTabChange('daily-report')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              settingsTab === 'daily-report'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Daily Report
          </button>
        </nav>
      </div>

      {/* SMTP Settings Sub-tab */}
      {settingsTab === 'smtp' && <SmtpSettings />}

      {/* Email Templates Sub-tab */}
      {settingsTab === 'email-templates' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Email Templates</h2>
          <p className="text-sm text-gray-500 mb-6">
            Edit the subject and HTML for notification emails. Variables can be used with
            <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded">{'{{variable}}'}</code>.
          </p>

          {templatesLoading ? (
            <div className="text-center py-6 text-gray-500">Loading templates...</div>
          ) : emailTemplates.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No templates available.</div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {emailTemplates.map((template) => (
                <div key={template.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={template.isEnabled}
                        onChange={(e) =>
                          onTemplateChange(template.key, { isEnabled: e.target.checked })
                        }
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={template.subject}
                      onChange={(e) =>
                        onTemplateChange(template.key, { subject: e.target.value })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">HTML</label>
                    <textarea
                      rows={6}
                      value={template.html}
                      onChange={(e) =>
                        onTemplateChange(template.key, { html: e.target.value })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Variables: {template.variables.join(', ')}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSaveTemplate(template)}
                      disabled={savingTemplateKey === template.key}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {savingTemplateKey === template.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role Management Sub-tab */}
      {settingsTab === 'roles' && (
        <div className="space-y-6">
          {/* Add User Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Add New User</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Add a new user to the Guincoin Rewards Program. They will receive an email notification with a link to access their dashboard.
                </p>
              </div>
              <div className="flex gap-2">
                <label className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer ${
                  bulkUploading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'text-green-700 bg-green-50 hover:bg-green-100'
                }`}>
                  {bulkUploading ? 'Uploading...' : 'Bulk Upload CSV'}
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    disabled={bulkUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onBulkUpload(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    onShowAddUserFormChange(!showAddUserForm);
                    if (showAddUserForm) {
                      onNewUserFormChange({ email: '', name: '', isManager: false, isAdmin: false, isGameMaster: false });
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {showAddUserForm ? 'Cancel' : 'Add User'}
                </button>
              </div>
            </div>

            {showAddUserForm && (
              <form onSubmit={onCreateUser} className="space-y-4 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => onNewUserFormChange({ ...newUserForm, email: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserForm.name}
                      onChange={(e) => onNewUserFormChange({ ...newUserForm, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Roles</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newUserForm.isManager}
                        onChange={(e) => onNewUserFormChange({ ...newUserForm, isManager: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Manager (can award Guincoins to employees)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newUserForm.isAdmin}
                        onChange={(e) => onNewUserFormChange({ ...newUserForm, isAdmin: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Admin (full system access)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newUserForm.isGameMaster}
                        onChange={(e) => onNewUserFormChange({ ...newUserForm, isGameMaster: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Game Master (can manage games)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Employee List */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage employee roles and permissions. Managers can award coins, Admins have full system access.
                </p>
              </div>
              <button
                onClick={onLoadEmployees}
                disabled={employeesLoading}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {employeesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {balanceError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-yellow-800">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>{balanceError}</span>
                </div>
                <button
                  onClick={onRetryBalance}
                  className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded hover:bg-yellow-200"
                >
                  Retry
                </button>
              </div>
            )}

            {employeesLoading && employees.length === 0 ? (
              <div className="text-center py-6 text-gray-500">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6 text-gray-500">No employees found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => {
                      const roles: string[] = [];
                      if (employee.isAdmin) roles.push('Admin');
                      if (employee.isManager) roles.push('Manager');
                      if (employee.isGameMaster) roles.push('GM');
                      const roleName = roles.length > 0 ? roles.join(' & ') : 'Employee';
                      const isCurrentUser = employee.id === user?.id;

                      return (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            {isCurrentUser && (
                              <div className="text-xs text-gray-500">(You)</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={employee.isManager}
                              onChange={(e) =>
                                onUpdateRoles(employee.id, { isManager: e.target.checked })
                              }
                              disabled={updatingEmployeeId === employee.id || isCurrentUser}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={employee.isAdmin}
                              onChange={(e) =>
                                onUpdateRoles(employee.id, { isAdmin: e.target.checked })
                              }
                              disabled={
                                updatingEmployeeId === employee.id ||
                                (isCurrentUser && employee.isAdmin)
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              title={
                                isCurrentUser && employee.isAdmin
                                  ? 'You cannot remove your own admin status'
                                  : ''
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={employee.isGameMaster}
                              onChange={(e) =>
                                onUpdateRoles(employee.id, { isGameMaster: e.target.checked })
                              }
                              disabled={updatingEmployeeId === employee.id}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                employee.isAdmin
                                  ? 'bg-purple-100 text-purple-800'
                                  : employee.isManager
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {roleName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-mono text-gray-900">
                                {(balanceMap[employee.id] ?? 0).toFixed(2)}
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustingEmployeeId(
                                    adjustingEmployeeId === employee.id ? null : employee.id
                                  );
                                  setAdjustForm({ amount: '', reason: '' });
                                }}
                                className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                              >
                                Adjust
                              </button>
                            </div>
                            {adjustingEmployeeId === employee.id && (
                              <form onSubmit={handleAdjustSubmit} className="mt-2 space-y-2 text-left">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={adjustForm.amount}
                                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                                  placeholder="Amount (+/-)"
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                  required
                                />
                                <input
                                  type="text"
                                  value={adjustForm.reason}
                                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                  placeholder="Reason"
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                  required
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setAdjustingEmployeeId(null)}
                                    className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={adjustLoading || !adjustForm.amount || !adjustForm.reason}
                                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                  >
                                    {adjustLoading ? 'Saving...' : 'Apply'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Award Presets Sub-tab */}
      {settingsTab === 'award-presets' && <AwardPresetsPanel />}

      {/* Daily Report Sub-tab */}
      {settingsTab === 'daily-report' && <DailyReportSection />}

      {/* Manager Allotments Sub-tab */}
      {settingsTab === 'allotments' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Manager Allotments</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Deposit funds into manager allotment balances. Managers use allotments exclusively for awarding coins to employees.
                </p>
              </div>
              <button
                onClick={onLoadManagers}
                disabled={managersLoading}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {managersLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {managersLoading && managers.length === 0 ? (
              <div className="text-center py-6 text-gray-500">Loading managers...</div>
            ) : managers.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No managers found. Assign the manager role to employees in the Role Management tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Manager List */}
                <div className="lg:col-span-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Select a Manager</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {managers.map((manager) => (
                      <button
                        key={manager.id}
                        onClick={() => onSelectManager(manager.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selectedManagerId === manager.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                        <div className="text-xs text-gray-500">{manager.email}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allotment Details & Actions */}
                <div className="lg:col-span-2">
                  {!selectedManagerId ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
                      Select a manager to view and manage their allotment balance
                    </div>
                  ) : allotmentLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading allotment details...</div>
                  ) : selectedManagerAllotment ? (
                    <div className="space-y-6">
                      {/* Current Balance Card */}
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-purple-900">
                            {selectedManagerAllotment.employee.name}'s Allotment
                          </h3>
                          <span className="text-2xl">🎁</span>
                        </div>
                        <div className="text-center py-4">
                          <p className="text-sm text-purple-600 mb-1">Current Balance</p>
                          <p className="text-4xl font-bold text-purple-900">
                            {selectedManagerAllotment.allotment.balance.toFixed(2)}
                          </p>
                          <p className="text-sm text-purple-500 mt-1">Guincoin</p>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3 mt-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-xs text-purple-600">Awarded This Period</p>
                              <p className="text-lg font-semibold text-purple-900">
                                {selectedManagerAllotment.allotment.usedThisPeriod.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-purple-600">Recurring Budget</p>
                              <p className="text-lg font-semibold text-purple-900">
                                {selectedManagerAllotment.allotment.recurringBudget > 0
                                  ? `${selectedManagerAllotment.allotment.recurringBudget.toFixed(2)}/period`
                                  : 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Deposit Form */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Adjust Balance</h4>
                        <p className="text-xs text-gray-500 mb-3">
                          Use a positive number to deposit, or a negative number to deduct.
                        </p>
                        <form onSubmit={onDeposit} className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Amount (+/-)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={depositForm.amount}
                              onChange={(e) =>
                                onDepositFormChange({ ...depositForm, amount: e.target.value })
                              }
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                              placeholder="100.00 or -50.00"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              value={depositForm.description}
                              onChange={(e) =>
                                onDepositFormChange({ ...depositForm, description: e.target.value })
                              }
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                              placeholder="Q1 2026 allotment"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={depositLoading}
                              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                            >
                              {depositLoading ? 'Saving...' : 'Apply'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Recurring Budget Form */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recurring Budget</h4>
                        <p className="text-xs text-gray-500 mb-3">
                          Set an automatic recurring deposit amount. Enter 0 to disable.
                        </p>
                        <form onSubmit={onSetRecurring} className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Amount per Period
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={recurringForm.amount}
                              onChange={(e) =>
                                onRecurringFormChange({ ...recurringForm, amount: e.target.value })
                              }
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                              placeholder={selectedManagerAllotment.allotment.recurringBudget > 0
                                ? selectedManagerAllotment.allotment.recurringBudget.toString()
                                : '500.00'
                              }
                              required
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={recurringLoading}
                              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                            >
                              {recurringLoading ? 'Saving...' : 'Set Recurring'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Recent Deposits */}
                      {selectedManagerAllotment.recentDeposits && selectedManagerAllotment.recentDeposits.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Deposits</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedManagerAllotment.recentDeposits.map((deposit, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    +{deposit.amount.toFixed(2)} Guincoin
                                  </p>
                                  {deposit.description && (
                                    <p className="text-xs text-gray-500">{deposit.description}</p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">
                                  {new Date(deposit.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Failed to load allotment details
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
