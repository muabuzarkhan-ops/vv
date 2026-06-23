import React, { useMemo, useState } from 'react';
import { Check, Trash2, Edit2, X, Search, Square, CheckSquare } from 'lucide-react';
import { RecordItem, UserState } from '../types';

interface AdminViewProps {
  records: RecordItem[];
  user: UserState | null;
  onAdminLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  onUpdateRecord: (record: RecordItem) => void;
  onDeleteRecord: (id: string) => void;
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

export default function AdminView({ records, user, onAdminLogin, onLogout, onUpdateRecord, onDeleteRecord }: AdminViewProps) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<RecordItem | null>(null);

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

  const pendingFieldworkerRecords = records.filter((record) => record.approvalStatus !== 'Approved' || record.submittedByRole !== 'Admin');

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6 text-xs">
        <div className="rounded-3xl border border-brand-border bg-brand-bg/80 p-4">
          <div className="text-brand-grey uppercase tracking-[0.2em] font-semibold mb-2">Total records</div>
          <div className="text-3xl font-bold text-brand-dark">{records.length}</div>
        </div>
        <div className="rounded-3xl border border-brand-border bg-brand-bg/80 p-4">
          <div className="text-brand-grey uppercase tracking-[0.2em] font-semibold mb-2">Selected</div>
          <div className="text-3xl font-bold text-brand-dark">{selectedIds.length}</div>
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
          <button
            onClick={selectAll}
            className="rounded-2xl bg-brand-emerald/10 border border-brand-emerald text-brand-emerald px-4 py-2 text-xs font-bold hover:bg-brand-emerald/15 transition"
          >
            <CheckSquare className="w-4 h-4 inline-block mr-2" /> Select all
          </button>
          <button
            onClick={clearSelection}
            className="rounded-2xl border border-brand-border px-4 py-2 text-xs font-bold text-brand-dark hover:bg-brand-bg transition"
          >
            <Square className="w-4 h-4 inline-block mr-2" /> Clear selection
          </button>
        </div>
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.length === 0}
          className="rounded-2xl bg-rose-600 text-white px-4 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition"
        >
          <Trash2 className="w-4 h-4 inline-block mr-2" /> Delete selected
        </button>
      </div>

      <div className="overflow-x-auto w-full rounded-3xl border border-brand-border bg-brand-bg/50">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-white/90 border-b border-brand-border text-brand-grey text-[10px] uppercase tracking-[0.2em] font-semibold">
              <th className="px-4 py-4 w-[48px]"></th>
              <th className="px-4 py-4">Partner</th>
              <th className="px-4 py-4">Country</th>
              <th className="px-4 py-4">Theme</th>
              <th className="px-4 py-4">Result</th>
              <th className="px-4 py-4">Disease</th>
              <th className="px-4 py-4">Reached</th>
              <th className="px-4 py-4">Approval</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-sm text-brand-dark">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-brand-grey">No records match the filter.</td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                const isEditing = editingId === record.id;

                return (
                  <tr key={record.id} className={isSelected ? 'bg-brand-emerald/10' : ''}>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(record.id)}
                        className="h-4 w-4 text-brand-emerald rounded border-brand-border"
                      />
                    </td>
                    {isEditing && editRecord ? (
                      <>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="text"
                            value={editRecord.partner}
                            onChange={(e) => updateEditField('partner', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="text"
                            value={editRecord.country}
                            onChange={(e) => updateEditField('country', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={editRecord.theme}
                            onChange={(e) => updateEditField('theme', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          >
                            {THEME_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={editRecord.resultType}
                            onChange={(e) => updateEditField('resultType', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          >
                            {RESULT_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={editRecord.disease}
                            onChange={(e) => updateEditField('disease', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          >
                            {DISEASE_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="number"
                            value={editRecord.reached}
                            onChange={(e) => updateEditField('reached', Number(e.target.value))}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={editRecord.approvalStatus || 'Pending'}
                            onChange={(e) => updateEditField('approvalStatus', e.target.value)}
                            className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-dark outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right align-top space-x-2">
                          <button
                            onClick={saveEdit}
                            className="rounded-2xl bg-brand-emerald px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-emerald/90 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-2xl border border-brand-border px-3 py-2 text-[11px] font-bold text-brand-dark hover:bg-brand-bg transition"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 align-top">{record.partner}</td>
                        <td className="px-4 py-3 align-top">{record.country}</td>
                        <td className="px-4 py-3 align-top">{record.theme}</td>
                        <td className="px-4 py-3 align-top">{record.resultType}</td>
                        <td className="px-4 py-3 align-top">{record.disease}</td>
                        <td className="px-4 py-3 align-top">{record.reached}</td>
                        <td className="px-4 py-3 align-top">{record.approvalStatus || 'Pending'}</td>
                        <td className="px-4 py-3 align-top text-right space-x-2">
                          <button
                            onClick={() => beginEdit(record)}
                            className="rounded-2xl border border-brand-border px-3 py-2 text-[11px] font-bold text-brand-dark hover:bg-brand-bg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline-block mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => onDeleteRecord(record.id)}
                            className="rounded-2xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-rose-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline-block mr-1" /> Delete
                          </button>
                        </td>
                      </>
                    )}
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
