import React, { useMemo, useState } from 'react';
import { RecordItem, UserState } from '../types';
import { FIELD_WORKERS } from '../data/fieldworkers';

interface AdminViewProps {
  records: RecordItem[];
  user: UserState | null;
  onAdminLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  onUpdateRecord: (record: RecordItem) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: (record: RecordItem) => void;
}

const THEME_OPTIONS = [
  'Case detection',
  'Health system strengthening',
  'Community engagement',
  'Research and laboratory',
  'Policy and governance',
  'Civil society capacity'
];

const LEVEL_OPTIONS = ['Community', 'District', 'Subnational', 'National', 'Regional'];
const DISEASE_OPTIONS = ['Buruli ulcer', 'Leprosy', 'Yaws', 'Lymphatic filariasis', 'Multiple skin NTDs'];
const RESULT_OPTIONS = ['Policy change', 'Service delivery', 'Capacity building', 'Research output', 'Community engagement', 'System strengthening'];
const CONFIDENCE_OPTIONS = ['High', 'Medium', 'Low'] as const;

export default function AdminView({ records, user, onAdminLogin, onLogout, onUpdateRecord, onDeleteRecord, onAddRecord }: AdminViewProps) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<RecordItem | null>(null);
  const [workerCountry, setWorkerCountry] = useState('Benin');
  const [selectedWorkerId, setSelectedWorkerId] = useState(FIELD_WORKERS[0]?.id || '');
  const [fieldPartner, setFieldPartner] = useState('');
  const [fieldRegion, setFieldRegion] = useState('');
  const [fieldTheme, setFieldTheme] = useState(THEME_OPTIONS[0]);
  const [fieldLevel, setFieldLevel] = useState(LEVEL_OPTIONS[1]);
  const [fieldDisease, setFieldDisease] = useState(DISEASE_OPTIONS[0]);
  const [fieldResultType, setFieldResultType] = useState(RESULT_OPTIONS[1]);
  const [fieldReached, setFieldReached] = useState(0);
  const [fieldConfidence, setFieldConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [fieldEvidence, setFieldEvidence] = useState('');
  const [fieldUploadPreview, setFieldUploadPreview] = useState('');
  const [fieldSubmitMessage, setFieldSubmitMessage] = useState<string | null>(null);
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerProfile, setWorkerProfile] = useState<{ id: string; name: string; role: string; country: string } | null>(null);
  const [workerLoginError, setWorkerLoginError] = useState<string | null>(null);

  const currentWorkersByCountry = useMemo(
    () => FIELD_WORKERS.filter((worker) => worker.country === workerCountry),
    [workerCountry]
  );

  const selectedWorker = FIELD_WORKERS.find((worker) => worker.id === selectedWorkerId);

  const pendingFieldworkerRecords = useMemo(() => {
    return records.filter((record) => record.approvalStatus !== 'Approved' || record.submittedByRole !== 'Admin');
  }, [records]);

  const filteredRecords = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return records.filter((record) => {
      const haystack = `${record.partner} ${record.country} ${record.region} ${record.theme} ${record.level} ${record.disease} ${record.resultType} ${record.evidence} ${record.source} ${record.submittedBy || ''} ${record.submittedByRole || ''}`.toLowerCase();
      return haystack.includes(lowerSearch);
    });
  }, [records, searchTerm]);

  const handleAdminSubmit = async () => {
    setLoading(true);
    setLoginFeedback(null);
    const result = await onAdminLogin(loginUser, loginPassword);
    setLoginFeedback({ type: result.success ? 'success' : 'error', msg: result.message });
    setLoading(false);
  };

  const handleWorkerSelectionChange = (value: string) => {
    setSelectedWorkerId(value);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredRecords.map((record) => record.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedIds.length} selected records permanently?`);
    if (!confirmDelete) return;
    selectedIds.forEach((id) => onDeleteRecord(id));
    clearSelection();
  };

  const beginEdit = (record: RecordItem) => {
    setEditingId(record.id);
    setEditRecord({ ...record });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRecord(null);
  };

  const saveEdit = () => {
    if (!editRecord) return;
    onUpdateRecord({
      ...editRecord,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'admin-console'
    });
    cancelEdit();
  };

  const updateEditField = (field: keyof RecordItem, value: string | number) => {
    setEditRecord((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleWorkerLogin = () => {
    const worker = FIELD_WORKERS.find((w) => w.id === selectedWorkerId && w.password === workerPassword);
    if (!worker) {
      setWorkerLoginError('Invalid worker ID or password.');
      setWorkerProfile(null);
      return;
    }
    if (worker.country !== workerCountry) {
      setWorkerLoginError(`Worker ID ${worker.id} is assigned to ${worker.country}. Select the correct country first.`);
      setWorkerProfile(null);
      return;
    }
    setWorkerLoginError(null);
    setWorkerProfile({ id: worker.id, name: worker.name, role: worker.role, country: worker.country });
    setFieldSubmitMessage(`Worker ${worker.name} (${worker.role}) authenticated for ${worker.country}. Submit data pending admin approval.`);
  };

  const handleFieldWorkerRecordSave = () => {
    if (!workerProfile) {
      setFieldSubmitMessage('Please authenticate a field worker before submitting data.');
      return;
    }
    if (!fieldPartner.trim() || !fieldEvidence.trim()) {
      setFieldSubmitMessage('Please fill in partner and evidence before saving.');
      return;
    }

    const newRecord: RecordItem = {
      id: `fieldworker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      partner: fieldPartner,
      theme: fieldTheme,
      country: selectedWorker.country,
      region: fieldRegion,
      level: fieldLevel,
      disease: fieldDisease,
      evidence: fieldEvidence,
      reached: fieldReached,
      confidence: fieldConfidence,
      source: 'Field worker upload',
      resultType: fieldResultType,
      approvalStatus: 'Pending',
      submittedBy: selectedWorker.name,
      submittedByRole: selectedWorker.role,
      updatedAt: new Date().toISOString(),
      updatedBy: workerProfile.id
    };

    onAddRecord(newRecord);
    setFieldSubmitMessage('Field worker submission added and pending admin approval.');
    setFieldPartner('');
    setFieldRegion('');
    setFieldTheme(THEME_OPTIONS[0]);
    setFieldLevel(LEVEL_OPTIONS[1]);
    setFieldDisease(DISEASE_OPTIONS[0]);
    setFieldResultType(RESULT_OPTIONS[1]);
    setFieldReached(0);
    setFieldConfidence('Medium');
    setFieldEvidence('');
    setFieldUploadPreview('');
  };

  const handleFieldUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setFieldUploadPreview(text.slice(0, 1500));
      setFieldEvidence(text.slice(0, 3000));
      setFieldSubmitMessage('File loaded. Please review and save as a new pending submission.');
    };
    reader.readAsText(file);
  };

  if (!user || user.role !== 'Admin') {
    return (
      <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-8 max-w-5xl mx-auto space-y-6">
        <div className="mb-6 text-center">
          <h3 className="text-lg font-bold text-brand-dark">Admin Console Access</h3>
          <p className="text-sm text-brand-grey mt-2">Login with admin credentials to manage records and perform bulk deletes. Pending field worker submissions are visible below for review.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase text-brand-grey tracking-[0.2em] mb-2">Username</label>
            <input
              type="text"
              value={loginUser}
              placeholder="Enter admin username"
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase text-brand-grey tracking-[0.2em] mb-2">Password</label>
            <input
              type="password"
              value={loginPassword}
              placeholder="Enter admin password"
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleAdminSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Verifying credentials...' : 'Login as Admin'}
          </button>
          {loginFeedback && (
            <div className={`rounded-2xl p-4 text-xs font-semibold ${loginFeedback.type === 'success' ? 'bg-[#e6f8ef] text-[#14533d] border border-[#b9e3d3]' : 'bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]'}`}>
              {loginFeedback.msg}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-brand-border bg-brand-bg/70 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-bold text-brand-dark">Pending field worker submissions</div>
              <div className="text-xs text-brand-grey">These items are awaiting admin approval and can be managed after login.</div>
            </div>
            <div className="rounded-full border border-brand-emerald/30 bg-brand-emerald/10 px-3 py-1 text-[11px] font-bold text-brand-emerald">{pendingFieldworkerRecords.length} pending</div>
          </div>
          {pendingFieldworkerRecords.length === 0 ? (
            <div className="text-sm text-brand-grey">No pending field worker submissions currently available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="text-brand-grey uppercase tracking-[0.2em] font-semibold text-[10px] border-b border-brand-border/70">
                    <th className="py-3 pr-3">Partner</th>
                    <th className="py-3 pr-3">Country</th>
                    <th className="py-3 pr-3">Approval</th>
                    <th className="py-3 pr-3">Submitted by</th>
                    <th className="py-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFieldworkerRecords.slice(0, 6).map((record) => (
                    <tr key={record.id} className="border-b border-brand-border/50 last:border-0">
                      <td className="py-3 pr-3 text-sm text-brand-dark">{record.partner}</td>
                      <td className="py-3 pr-3 text-sm text-brand-dark">{record.country}</td>
                      <td className="py-3 pr-3 text-sm text-brand-dark">{record.approvalStatus || 'Pending'}</td>
                      <td className="py-3 pr-3 text-sm text-brand-dark">{record.submittedBy || 'Field worker'}</td>
                      <td className="py-3 text-sm text-brand-dark">{record.submittedByRole || 'Field worker'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-6 max-w-full mx-auto">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-brand-dark">Admin Record Management</h3>
          <p className="text-sm text-brand-grey mt-1">Approve, edit, or delete records. Select multiple rows for bulk deletion.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={onLogout}
            className="rounded-2xl border border-brand-border px-4 py-2 text-xs font-bold text-brand-dark hover:bg-brand-bg transition"
          >
            Logout admin
          </button>
          <div className="rounded-2xl bg-brand-bg/70 px-4 py-2 text-xs text-brand-grey">Logged in as {user.name}</div>
        </div>
      </div>

      <div className="bg-brand-bg/70 border border-brand-border rounded-3xl p-5 mb-6">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-end justify-between">
          <div>
            <h4 className="font-semibold text-brand-dark">Fieldworker / Data Collector Submission</h4>
            <p className="text-sm text-brand-grey mt-1">Select a country, sign in with worker credentials, then submit data or upload a file. Records remain pending until approved.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full xl:w-auto">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Country</label>
              <select
                value={workerCountry}
                onChange={(e) => setWorkerCountry(e.target.value)}
                className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
              >
                {['Benin', 'Ghana', 'Togo', 'Cote d\'Ivoire', 'Senegal', 'Liberia'].map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Worker ID</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
              >
                {currentWorkersByCountry.map((worker) => (
                  <option key={worker.id} value={worker.id}>{`${worker.id} — ${worker.name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Password</label>
              <input
                type="password"
                value={workerPassword}
                onChange={(e) => setWorkerPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleWorkerLogin}
                className="w-full rounded-2xl bg-brand-emerald px-4 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
              >
                Authenticate worker
              </button>
            </div>
          </div>
        </div>

        {workerLoginError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{workerLoginError}</div>
        )}

        {workerProfile && (
          <div className="mt-6 rounded-3xl border border-brand-border bg-white p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-sm font-semibold text-brand-dark">Signed in as {workerProfile.name}</div>
                <div className="text-xs text-brand-grey">{workerProfile.role} • {workerProfile.country}</div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-brand-emerald font-bold bg-brand-emerald/10 rounded-full px-3 py-1">Pending approval</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Partner / project</label>
                <input
                  type="text"
                  value={fieldPartner}
                  onChange={(e) => setFieldPartner(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Region / district</label>
                <input
                  type="text"
                  value={fieldRegion}
                  onChange={(e) => setFieldRegion(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Theme</label>
                <select
                  value={fieldTheme}
                  onChange={(e) => setFieldTheme(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Result type</label>
                <select
                  value={fieldResultType}
                  onChange={(e) => setFieldResultType(e.target.value as any)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                >
                  {RESULT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Disease focus</label>
                <select
                  value={fieldDisease}
                  onChange={(e) => setFieldDisease(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                >
                  {DISEASE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Reached</label>
                <input
                  type="number"
                  value={fieldReached}
                  onChange={(e) => setFieldReached(Number(e.target.value))}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Confidence</label>
                <select
                  value={fieldConfidence}
                  onChange={(e) => setFieldConfidence(e.target.value as any)}
                  className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                >
                  {['High', 'Medium', 'Low'].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Evidence summary</label>
                <textarea
                  value={fieldEvidence}
                  onChange={(e) => setFieldEvidence(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-grey mb-2">Upload file</label>
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFieldUploadFile}
                  className="w-full text-sm text-brand-dark"
                />
              </div>
            </div>

            {fieldUploadPreview && (
              <div className="rounded-2xl border border-brand-border bg-brand-bg/50 p-4 text-sm text-brand-dark overflow-hidden whitespace-pre-wrap max-h-40 overflow-y-auto">
                <strong className="block mb-2">Uploaded preview</strong>
                {fieldUploadPreview}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-4">
              <button
                onClick={handleFieldWorkerRecordSave}
                className="rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
              >
                Save pending submission
              </button>
              {fieldSubmitMessage && (
                <div className="text-sm text-brand-grey">{fieldSubmitMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6 text-xs">
        <div className="rounded-3xl border border-brand-border bg-brand-bg/80 p-4">
          <div className="text-brand-grey uppercase tracking-[0.2em] font-semibold mb-2">Total records</div>
          <div className="text-3xl font-bold text-brand-dark">{records.length}</div>
        </div>
        <div className="rounded-3xl border border-brand-border bg-brand-bg/80 p-4">
          <div className="text-brand-grey uppercase tracking-[0.2em] font-semibold mb-2">Search filter</div>
          <div className="mt-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="w-full rounded-2xl border border-brand-border bg-white/90 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {/* Controls removed */}
        </div>
      </div>

      <div className="overflow-x-auto w-full rounded-3xl border border-brand-border bg-brand-bg/50">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-white/90 border-b border-brand-border text-brand-grey text-[10px] uppercase tracking-[0.2em] font-semibold">
              <th className="px-4 py-4">Partner</th>
              <th className="px-4 py-4">Country</th>
              <th className="px-4 py-4">Theme</th>
              <th className="px-4 py-4">Result</th>
              <th className="px-4 py-4">Disease</th>
              <th className="px-4 py-4">Reached</th>
              <th className="px-4 py-4">Approval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-sm text-brand-dark">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-grey">No records match the filter.</td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                return (
                  <tr key={record.id} className="">
                    <td className="px-4 py-3 align-top">{record.partner}</td>
                    <td className="px-4 py-3 align-top">{record.country}</td>
                    <td className="px-4 py-3 align-top">{record.theme}</td>
                    <td className="px-4 py-3 align-top">{record.resultType}</td>
                    <td className="px-4 py-3 align-top">{record.disease}</td>
                    <td className="px-4 py-3 align-top">{record.reached}</td>
                    <td className="px-4 py-3 align-top">{record.approvalStatus || 'Pending'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
