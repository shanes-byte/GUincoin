import { useState, useRef, useEffect } from 'react';
import {
  uploadBulkImportFiles,
  previewBulkImport,
  validateBulkImport,
  createBulkImportJob,
  getBulkImportJobs,
  getBulkImportJob,
  sendBulkImportInvitations,
  getPendingImportBalances,
  sendPendingImportInvitation,
  expirePendingImportBalance,
  BulkImportJob,
  PendingImportBalance,
  MergedRow,
  ValidationResult,
  UploadResult,
  PreviewResult,
} from '../../services/api';

interface BulkImportPanelProps {
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'validation' | 'import' | 'complete';
type ViewMode = 'import' | 'jobs' | 'pending';

export default function BulkImportPanel({ onToast }: BulkImportPanelProps) {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('import');

  // Upload state
  const [step, setStep] = useState<Step>('upload');
  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);

  // Mapping state
  const [balanceMapping, setBalanceMapping] = useState({
    nameColumn: '',
    amountColumn: '',
    emailColumn: '',
    marketColumn: '',
  });
  const [emailMapping, setEmailMapping] = useState({
    nameColumn: '',
    emailColumn: '',
  });

  // Preview state
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [mergedRows, setMergedRows] = useState<MergedRow[]>([]);
  const [previewing, setPreviewing] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Import state
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);

  // Jobs list state
  const [jobs, setJobs] = useState<BulkImportJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<(BulkImportJob & { pendingBalances: PendingImportBalance[] }) | null>(null);
  const [, setJobDetailsLoading] = useState(false);

  // Pending balances state
  const [pendingBalances, setPendingBalances] = useState<PendingImportBalance[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<'pending' | 'claimed' | 'expired' | ''>('');
  const [pendingEmailSearch, setPendingEmailSearch] = useState('');

  const balanceFileRef = useRef<HTMLInputElement>(null);
  const emailFileRef = useRef<HTMLInputElement>(null);

  // Load jobs when switching to jobs view
  useEffect(() => {
    if (viewMode === 'jobs') {
      loadJobs();
    } else if (viewMode === 'pending') {
      loadPendingBalances();
    }
  }, [viewMode]);

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await getBulkImportJobs({ limit: 50 });
      setJobs(response.data.jobs);
    } catch (error) {
      onToast('Failed to load import jobs', 'error');
    } finally {
      setJobsLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    setJobDetailsLoading(true);
    try {
      const response = await getBulkImportJob(jobId);
      setSelectedJob(response.data);
    } catch (error) {
      onToast('Failed to load job details', 'error');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const loadPendingBalances = async () => {
    setPendingLoading(true);
    try {
      const params: any = { limit: 100 };
      if (pendingFilter) params.status = pendingFilter;
      if (pendingEmailSearch) params.email = pendingEmailSearch;

      const response = await getPendingImportBalances(params);
      setPendingBalances(response.data.balances);
    } catch (error) {
      onToast('Failed to load pending balances', 'error');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!balanceFile) {
      onToast('Please select a balance file', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('balanceFile', balanceFile);
      if (emailFile) {
        formData.append('emailFile', emailFile);
      }

      const response = await uploadBulkImportFiles(formData);
      setUploadResult(response.data);

      // Auto-detect columns
      const headers = response.data.balanceFile.headers;
      const nameCol = headers.find(h =>
        h.toLowerCase().includes('name') || h.toLowerCase().includes('employee')
      ) || '';
      const amountCol = headers.find(h =>
        h.toLowerCase().includes('amount') ||
        h.toLowerCase().includes('guincoin') ||
        h.toLowerCase().includes('coin') ||
        h.toLowerCase().includes('balance')
      ) || '';
      const emailCol = headers.find(h =>
        h.toLowerCase().includes('email') || h.toLowerCase().includes('mail')
      ) || '';
      const marketCol = headers.find(h =>
        h.toLowerCase().includes('market') || h.toLowerCase().includes('location')
      ) || '';

      setBalanceMapping({
        nameColumn: nameCol,
        amountColumn: amountCol,
        emailColumn: emailCol,
        marketColumn: marketCol,
      });

      if (response.data.emailFile) {
        const emailHeaders = response.data.emailFile.headers;
        setEmailMapping({
          nameColumn: emailHeaders.find(h =>
            h.toLowerCase().includes('name') || h.toLowerCase().includes('employee')
          ) || '',
          emailColumn: emailHeaders.find(h =>
            h.toLowerCase().includes('email') || h.toLowerCase().includes('mail')
          ) || '',
        });
      }

      setStep('mapping');
      onToast('Files uploaded successfully', 'success');
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Failed to upload files', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!balanceFile) return;

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('balanceFile', balanceFile);
      formData.append('balanceMapping', JSON.stringify(balanceMapping));

      if (emailFile) {
        formData.append('emailFile', emailFile);
        formData.append('emailMapping', JSON.stringify(emailMapping));
      }

      const response = await previewBulkImport(formData);
      setPreviewResult(response.data);
      setMergedRows(response.data.rows);
      setStep('preview');
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Failed to preview data', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await validateBulkImport(mergedRows);
      setValidationResult(response.data);
      setStep('validation');
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Validation failed', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!importName.trim()) {
      onToast('Please enter an import name', 'error');
      return;
    }

    setImporting(true);
    try {
      const response = await createBulkImportJob({
        name: importName,
        rows: mergedRows,
        columnMapping: balanceMapping,
      });

      onToast(`Import completed: ${response.data.successCount} successful, ${response.data.errorCount} errors`, 'success');
      setStep('complete');
      loadJobs();
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSendInvitations = async (jobId: string) => {
    try {
      const response = await sendBulkImportInvitations(jobId);
      onToast(response.data.message, 'success');
      if (selectedJob) {
        loadJobDetails(jobId);
      }
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Failed to send invitations', 'error');
    }
  };

  const handleSendSingleInvitation = async (pendingId: string) => {
    try {
      await sendPendingImportInvitation(pendingId);
      onToast('Invitation sent', 'success');
      loadPendingBalances();
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Failed to send invitation', 'error');
    }
  };

  const handleExpireBalance = async (pendingId: string) => {
    if (!confirm('Are you sure you want to expire this pending balance?')) return;

    try {
      await expirePendingImportBalance(pendingId);
      onToast('Balance expired', 'success');
      loadPendingBalances();
      if (selectedJob) {
        loadJobDetails(selectedJob.id);
      }
    } catch (error: any) {
      onToast(error.response?.data?.error || 'Failed to expire balance', 'error');
    }
  };

  const updateRowEmail = (index: number, email: string) => {
    const updated = [...mergedRows];
    updated[index] = { ...updated[index], email: email.toLowerCase(), matchType: 'manual', confidence: 1 };
    setMergedRows(updated);
  };

  const resetImport = () => {
    setStep('upload');
    setBalanceFile(null);
    setEmailFile(null);
    setUploadResult(null);
    setPreviewResult(null);
    setMergedRows([]);
    setValidationResult(null);
    setImportName('');
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900">How to Import</h4>
        <ol className="mt-2 text-sm text-blue-800 list-decimal list-inside space-y-1">
          <li>Upload a balance file with employee names and Guincoin amounts</li>
          <li>Optionally upload an email mapping file if emails are in a separate file</li>
          <li>Map columns to match your spreadsheet format</li>
          <li>Review matches and manually assign emails for unmatched rows</li>
          <li>Validate and import the data</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance File */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={balanceFileRef}
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setBalanceFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-sm text-gray-600">
              <button
                onClick={() => balanceFileRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Select Balance File
              </button>
              <span className="text-gray-500"> (required)</span>
            </div>
            <p className="text-xs text-gray-500">CSV or Excel with names and amounts</p>
            {balanceFile && (
              <p className="text-sm text-green-600 font-medium">{balanceFile.name}</p>
            )}
          </div>
        </div>

        {/* Email File */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={emailFileRef}
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setEmailFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="text-sm text-gray-600">
              <button
                onClick={() => emailFileRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Select Email Mapping File
              </button>
              <span className="text-gray-500"> (optional)</span>
            </div>
            <p className="text-xs text-gray-500">If emails are in a separate file</p>
            {emailFile && (
              <p className="text-sm text-green-600 font-medium">{emailFile.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!balanceFile || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload & Continue'}
        </button>
      </div>
    </div>
  );

  // Render mapping step
  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Map Columns - Balance File</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name Column *</label>
            <select
              value={balanceMapping.nameColumn}
              onChange={(e) => setBalanceMapping({ ...balanceMapping, nameColumn: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select...</option>
              {uploadResult?.balanceFile.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Column *</label>
            <select
              value={balanceMapping.amountColumn}
              onChange={(e) => setBalanceMapping({ ...balanceMapping, amountColumn: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select...</option>
              {uploadResult?.balanceFile.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Column</label>
            <select
              value={balanceMapping.emailColumn}
              onChange={(e) => setBalanceMapping({ ...balanceMapping, emailColumn: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              disabled={!!emailFile}
            >
              <option value="">Select...</option>
              {uploadResult?.balanceFile.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Market Column</label>
            <select
              value={balanceMapping.marketColumn}
              onChange={(e) => setBalanceMapping({ ...balanceMapping, marketColumn: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select...</option>
              {uploadResult?.balanceFile.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {emailFile && uploadResult?.emailFile && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Map Columns - Email File</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name Column *</label>
              <select
                value={emailMapping.nameColumn}
                onChange={(e) => setEmailMapping({ ...emailMapping, nameColumn: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                {uploadResult.emailFile.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Column *</label>
              <select
                value={emailMapping.emailColumn}
                onChange={(e) => setEmailMapping({ ...emailMapping, emailColumn: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                {uploadResult.emailFile.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Preview of first rows */}
      {uploadResult && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Preview (first 5 rows)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  {uploadResult.balanceFile.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadResult.balanceFile.preview.map((row, i) => (
                  <tr key={i} className="border-b">
                    {uploadResult.balanceFile.headers.map(h => (
                      <td key={h} className="px-3 py-2">{String(row[h] || '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep('upload')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handlePreview}
          disabled={!balanceMapping.nameColumn || !balanceMapping.amountColumn || previewing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {previewing ? 'Processing...' : 'Preview Matches'}
        </button>
      </div>
    </div>
  );

  // Render preview step
  const renderPreviewStep = () => (
    <div className="space-y-6">
      {previewResult && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{previewResult.summary.total}</div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{previewResult.summary.highConfidence}</div>
            <div className="text-sm text-green-600">Auto-Matched</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{previewResult.summary.mediumConfidence}</div>
            <div className="text-sm text-yellow-600">Review Needed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{previewResult.summary.noMatch}</div>
            <div className="text-sm text-red-600">No Match</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{previewResult.summary.totalAmount.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Total Guincoins</div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mergedRows.map((row, index) => (
                <tr key={index} className={
                  row.confidence >= 0.9 ? 'bg-green-50' :
                  row.confidence >= 0.7 ? 'bg-yellow-50' :
                  'bg-red-50'
                }>
                  <td className="px-4 py-3">
                    {row.confidence >= 0.9 && row.email ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Auto
                      </span>
                    ) : row.confidence >= 0.7 && row.email ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    {!row.email || row.confidence < 0.7 ? (
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateRowEmail(index, e.target.value)}
                        placeholder="Enter email..."
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-gray-900">{row.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{row.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${
                      row.confidence >= 0.9 ? 'text-green-700' :
                      row.confidence >= 0.7 ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {Math.round(row.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep('mapping')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleValidate}
          disabled={validating || mergedRows.filter(r => r.email).length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {validating ? 'Validating...' : 'Validate Data'}
        </button>
      </div>
    </div>
  );

  // Render validation step
  const renderValidationStep = () => (
    <div className="space-y-6">
      {validationResult && (
        <>
          <div className={`border rounded-lg p-4 ${
            validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-medium ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
              {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
            </h4>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Rows:</span>
                <span className="ml-2 font-medium">{validationResult.summary.totalRows}</span>
              </div>
              <div>
                <span className="text-gray-600">Valid:</span>
                <span className="ml-2 font-medium text-green-600">{validationResult.summary.validRows}</span>
              </div>
              <div>
                <span className="text-gray-600">Registered:</span>
                <span className="ml-2 font-medium">{validationResult.summary.registeredUsers}</span>
              </div>
              <div>
                <span className="text-gray-600">Unregistered:</span>
                <span className="ml-2 font-medium">{validationResult.summary.unregisteredUsers}</span>
              </div>
              <div>
                <span className="text-gray-600">Duplicates:</span>
                <span className="ml-2 font-medium text-yellow-600">{validationResult.summary.duplicates}</span>
              </div>
            </div>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Errors ({validationResult.errors.length})</h4>
              <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                {validationResult.errors.map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Warnings ({validationResult.warnings.length})</h4>
              <ul className="text-sm text-yellow-800 space-y-1 max-h-40 overflow-y-auto">
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>Row {warn.row}: {warn.message}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.valid && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Import Summary</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Import Name *</label>
                  <input
                    type="text"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="e.g., Q4 2024 Guincoin Awards"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p><strong>What will happen:</strong></p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
                    <li>{validationResult.summary.registeredUsers} registered users will receive Guincoins immediately</li>
                    <li>{validationResult.summary.unregisteredUsers} pending balances will be created for unregistered users</li>
                    <li>You can send invitation emails to unregistered users after import</li>
                    <li>Pending balances are automatically claimed when users log in</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep('preview')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        {validationResult?.valid && (
          <button
            onClick={handleImport}
            disabled={importing || !importName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Start Import'}
          </button>
        )}
      </div>
    </div>
  );

  // Render complete step
  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900">Import Complete!</h3>
      <p className="mt-2 text-sm text-gray-600">
        Your import has been processed. Check the Jobs History to send invitation emails to unregistered users.
      </p>
      <div className="mt-6 space-x-4">
        <button
          onClick={resetImport}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Start New Import
        </button>
        <button
          onClick={() => setViewMode('jobs')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Jobs History
        </button>
      </div>
    </div>
  );

  // Render jobs list
  const renderJobsList = () => (
    <div className="space-y-4">
      {selectedJob ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedJob(null)}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </button>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-lg">{selectedJob.name}</h4>
                <p className="text-sm text-gray-600">
                  Created {new Date(selectedJob.createdAt).toLocaleDateString()} by {selectedJob.createdBy?.name}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                selectedJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedJob.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Rows:</span>
                <span className="ml-2 font-medium">{selectedJob.totalRows}</span>
              </div>
              <div>
                <span className="text-gray-600">Successful:</span>
                <span className="ml-2 font-medium text-green-600">{selectedJob.successCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Errors:</span>
                <span className="ml-2 font-medium text-red-600">{selectedJob.errorCount}</span>
              </div>
              {selectedJob.stats && (
                <div>
                  <span className="text-gray-600">Pending:</span>
                  <span className="ml-2 font-medium">{selectedJob.stats.totalPending}</span>
                </div>
              )}
            </div>

            {selectedJob.stats && selectedJob.stats.totalPending > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-600">Invites sent:</span>
                    <span className="ml-2 font-medium">{selectedJob.stats.invitesSent}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="text-gray-600">Claimed:</span>
                    <span className="ml-2 font-medium text-green-600">{selectedJob.stats.totalClaimed}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="text-gray-600">Expired:</span>
                    <span className="ml-2 font-medium text-red-600">{selectedJob.stats.totalExpired}</span>
                  </div>
                  <button
                    onClick={() => handleSendInvitations(selectedJob.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Send All Invitations
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedJob.pendingBalances.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h5 className="font-medium">Pending Balances ({selectedJob.pendingBalances.length})</h5>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Amount</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">Invite Sent</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedJob.pendingBalances.map((balance) => (
                      <tr key={balance.id}>
                        <td className="px-4 py-2">{balance.recipientEmail}</td>
                        <td className="px-4 py-2">{balance.recipientName || '-'}</td>
                        <td className="px-4 py-2 text-right font-mono">{Number(balance.amount).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            balance.status === 'claimed' ? 'bg-green-100 text-green-800' :
                            balance.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {balance.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {balance.inviteSentAt
                            ? new Date(balance.inviteSentAt).toLocaleDateString()
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-2 text-right">
                          {balance.status === 'pending' && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleSendSingleInvitation(balance.id)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Send
                              </button>
                              <button
                                onClick={() => handleExpireBalance(balance.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Expire
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          {jobsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No import jobs yet</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Rows</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Pending</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{job.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{job.totalRows}</td>
                    <td className="px-4 py-3 text-right">{job._count?.pendingBalances || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadJobDetails(job.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // Render pending balances
  const renderPendingBalances = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={pendingFilter}
          onChange={(e) => setPendingFilter(e.target.value as typeof pendingFilter)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
          <option value="expired">Expired</option>
        </select>
        <input
          type="text"
          placeholder="Search by email..."
          value={pendingEmailSearch}
          onChange={(e) => setPendingEmailSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 w-64"
        />
        <button
          onClick={loadPendingBalances}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Search
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {pendingLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : pendingBalances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending balances found</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Import Job</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Invite Sent</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingBalances.map((balance) => (
                <tr key={balance.id}>
                  <td className="px-4 py-3">{balance.recipientEmail}</td>
                  <td className="px-4 py-3">{balance.recipientName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{balance.importJob?.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(balance.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      balance.status === 'claimed' ? 'bg-green-100 text-green-800' :
                      balance.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {balance.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {balance.inviteSentAt
                      ? new Date(balance.inviteSentAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {balance.status === 'pending' && (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleSendSingleInvitation(balance.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => handleExpireBalance(balance.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Expire
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setViewMode('import'); resetImport(); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            New Import
          </button>
          <button
            onClick={() => setViewMode('jobs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'jobs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Jobs History
          </button>
          <button
            onClick={() => setViewMode('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Balances
          </button>
        </nav>
      </div>

      {/* Content */}
      {viewMode === 'import' && (
        <>
          {/* Progress Steps */}
          {step !== 'complete' && (
            <div className="flex items-center justify-between max-w-2xl">
              {(['upload', 'mapping', 'preview', 'validation'] as const).map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step === s ? 'bg-blue-600 text-white' :
                    (['upload', 'mapping', 'preview', 'validation'].indexOf(step) > i) ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm ${step === s ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  {i < 3 && (
                    <div className="w-12 h-0.5 mx-4 bg-gray-200" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step Content */}
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'validation' && renderValidationStep()}
          {step === 'complete' && renderCompleteStep()}
        </>
      )}

      {viewMode === 'jobs' && renderJobsList()}
      {viewMode === 'pending' && renderPendingBalances()}
    </div>
  );
}
