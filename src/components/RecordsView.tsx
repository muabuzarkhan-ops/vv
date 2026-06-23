import React, { useEffect, useState } from 'react';
import { RecordItem, UserState } from '../types';
import { Edit2, Trash2, Check, X, PlusCircle, Database, Search } from 'lucide-react';

const STATIC_THEMES = [
  "Case detection",
  "Health system strengthening",
  "Community engagement",
  "Research and laboratory",
  "Policy and governance",
  "Civil society capacity"
];
const STATIC_LEVELS = ["Community", "District", "Subnational", "National", "Regional"];
const STATIC_DISEASES = ["Buruli ulcer", "Leprosy", "Yaws", "Lymphatic filariasis", "Multiple skin NTDs"];
const STATIC_COUNTRIES = ["Benin", "Ghana", "Togo", "Cote d'Ivoire", "Senegal", "Liberia"];
const STATIC_RESULT_TYPES = ["Policy change", "Service delivery", "Capacity building", "Research output", "Community engagement", "System strengthening"];

interface RecordsViewProps {
  records: RecordItem[];
  onAddRecord: (record: RecordItem) => void;
  onUpdateRecord: (record: RecordItem) => void;
  onDeleteRecord: (id: string) => void;
  user: UserState | null;
}

export default function RecordsView({ records, onAddRecord, onUpdateRecord, onDeleteRecord, user }: RecordsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [requiredPassword, setRequiredPassword] = useState('');
  const [accessGranted, setAccessGranted] = useState(user?.role === 'Admin');
  const [authError, setAuthError] = useState<string | null>(null);

  // States for the inline record editor
  const [editPartner, setEditPartner] = useState('');
  const [editCountry, setEditCountry] = useState('Benin');
  const [editRegion, setEditRegion] = useState('');
  const [editTheme, setEditTheme] = useState('Case detection');
  const [editLevel, setEditLevel] = useState('District');
  const [editDisease, setEditDisease] = useState('Buruli ulcer');
  const [editResultType, setEditResultType] = useState<'Policy change' | 'Service delivery' | 'Capacity building' | 'Research output' | 'Community engagement' | 'System strengthening'>('Service delivery');
  const [editEvidence, setEditEvidence] = useState('');
  const [editReached, setEditReached] = useState(0);
  const [editConfidence, setEditConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editSource, setEditSource] = useState('');

  // Starts the inline editing sequence
  const startEditing = (record: RecordItem) => {
    setEditingId(record.id);
    setEditPartner(record.partner);
    setEditCountry(record.country);
    setEditRegion(record.region);
    setEditTheme(record.theme);
    setEditResultType(record.resultType);
    setEditLevel(record.level);
    setEditDisease(record.disease);
    setEditEvidence(record.evidence);
    setEditReached(Number(record.reached) || 0);
    setEditConfidence(record.confidence);
    setEditSource(record.source);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleApprovalAction = (id: string, status: 'Approved' | 'Rejected') => {
    const original = records.find((record) => record.id === id);
    if (!original) return;

    const updated: RecordItem = {
      ...original,
      approvalStatus: status,
      approvedBy: status === 'Approved' ? (user?.name || user?.email || 'Administrator') : original.approvedBy,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || original.updatedBy || 'system-admin'
    };
    onUpdateRecord(updated);
  };

  const saveEditing = (id: string) => {
    const original = records.find((r) => r.id === id);
    const updated: RecordItem = {
      id,
      partner: editPartner,
      country: editCountry,
      region: editRegion,
      theme: editTheme,
      resultType: editResultType,
      level: editLevel,
      disease: editDisease,
      evidence: editEvidence,
      reached: editReached,
      confidence: editConfidence,
      source: editSource,
      approvalStatus: original?.approvalStatus || 'Pending',
      submittedBy: original?.submittedBy,
      submittedByRole: original?.submittedByRole,
      approvedBy: original?.approvedBy,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || original?.updatedBy || 'local-analyst'
    };
    onUpdateRecord(updated);
    setEditingId(null);
  };

  // Add a fully customizable blank entry for immediate inline editing
  const handleAdminUnlock = () => {
    if (requiredPassword === '11223344') {
      setAccessGranted(true);
      setAuthError(null);
    } else {
      setAuthError('Invalid admin password.');
    }
  };

  const handleAddBlank = () => {
    const blankId = `record-blank-${Date.now()}`;
    const newBlank: RecordItem = {
      id: blankId,
      partner: "New Partner Org",
      country: "Benin",
      region: "Enter local district",
      theme: "Case detection",
      level: "District",
      disease: "Buruli ulcer",
      resultType: "Service delivery",
      evidence: "Describe intervention results and change narratives here...",
      reached: 0,
      confidence: "Medium",
      source: "Manual entry",
      approvalStatus: user?.role === 'Admin' ? 'Approved' : 'Pending',
      submittedBy: user?.name || user?.email || 'Field officer',
      submittedByRole: user?.role || 'Field officer',
      approvedBy: user?.role === 'Admin' ? (user?.name || user?.email) : undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'local-analyst'
    };

    onAddRecord(newBlank);
    startEditing(newBlank);
  };

  // Filter local rows
  useEffect(() => {
    if (user?.role === 'Admin') {
      setAccessGranted(true);
    }
  }, [user]);

  const filtered = records.filter(r => {
    const haystack = `${r.partner} ${r.theme} ${r.resultType} ${r.country} ${r.region} ${r.level} ${r.disease} ${r.evidence} ${r.source}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const getDiseaseBadgeColor = (disease: string) => {
    const lower = disease.toLowerCase();
    if (lower.includes('buruli')) return 'text-brand-emerald bg-brand-emerald/10 border-brand-emerald/25';
    if (lower.includes('leprosy')) return 'text-[#0d7f8b] bg-[#0d7f8b]/10 border-[#0d7f8b]/25';
    if (lower.includes('yaws')) return 'text-[#315f9f] bg-[#315f9f]/10 border-[#315f9f]/25';
    if (lower.includes('lymphatic')) return 'text-[#7e22ce] bg-[#7e22ce]/10 border-[#7e22ce]/25';
    return 'text-[#aa7b21] bg-[#F0C24D]/10 border-[#F0C24D]/25';
  };

  if (!accessGranted) {
    return (
      <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-8 max-w-3xl mx-auto text-center">
        <h3 className="text-lg font-bold text-brand-dark mb-3">Admin access required</h3>
        <p className="text-sm text-brand-grey mb-6">Please enter the admin password to access the Record database.</p>
        <div className="max-w-md mx-auto space-y-4">
          <input
            type="password"
            value={requiredPassword}
            onChange={(e) => setRequiredPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
          />
          <button
            onClick={handleAdminUnlock}
            className="w-full rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
          >
            Unlock Records
          </button>
          {authError && <div className="text-sm text-rose-600">{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
      {/* Header controls list */}
      <div className="px-5 py-4 border-b border-brand-bg flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-brand-emerald rounded-sm block" />
            OPERATIONAL DATABASE INDEX
          </h3>
          <p className="text-xs text-brand-grey mt-0.5">Maintain, edit, create or remove records of West African NTD interventions.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Internal search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3.5 py-2.5 text-xs font-semibold text-brand-dark border border-brand-border rounded-xl outline-none focus:border-brand-emerald bg-brand-bg/30 focus:bg-white transition-all w-48 sm:w-64 placeholder:text-brand-grey font-sans"
            />
            <Search className="w-3.5 h-3.5 text-brand-grey absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={handleAddBlank}
            className="text-xs flex items-center gap-2 font-bold px-4 py-2.5 border border-brand-emerald text-brand-emerald hover:bg-[#EAF7F2] transition-colors rounded-xl bg-white shrink-0 cursor-pointer select-none"
          >
            <PlusCircle className="w-4 h-4" />
            Add Blank record
          </button>
        </div>
      </div>

      {/* Structured Database Rows */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-brand-bg/50 border-b border-brand-border text-brand-grey text-[9px] tracking-widest font-extrabold uppercase font-mono select-none">
              <th className="py-4 px-5">PARTNER / SOURCE</th>
              <th className="py-4 px-3">COUNTRY / SCOPE</th>
              <th className="py-4 px-3">TAXONOMY AREA</th>
              <th className="py-4 px-3">RESULT CATEGORY</th>
              <th className="py-4 px-4 w-96">INTERVENTION CHANGE EVIDENCE</th>
              <th className="py-4 px-3 text-right">PEOPLE REACHED</th>
              <th className="py-4 px-4 text-center">CONFIDENCE</th>
              <th className="py-4 px-4 text-center">APPROVAL</th>
              <th className="py-4 px-5 text-right">CONTROLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-xs text-[#21352E]">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isEditing = editingId === item.id;
                
                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-brand-emerald/5 divide-x divide-transparent">
                      {/* Edit Col 1: Partner & Source */}
                      <td className="p-3 vertical-top">
                        <input
                          type="text"
                          value={editPartner}
                          onChange={(e) => setEditPartner(e.target.value)}
                          placeholder="Partner name"
                          className="w-full border border-brand-border rounded-lg p-2 mb-1.5 text-xs font-semibold text-brand-dark bg-white focus:border-brand-emerald outline-none"
                        />
                        <input
                          type="text"
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          placeholder="Source label"
                          className="w-full border border-brand-border rounded-lg p-2 text-[10px] font-semibold text-brand-grey bg-white focus:border-brand-emerald outline-none"
                        />
                      </td>

                      {/* Edit Col 2 Location */}
                      <td className="p-3 vertical-top">
                        <select
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          className="w-full border border-brand-border rounded-lg p-2 mb-1.5 text-xs font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          {STATIC_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="text"
                          value={editRegion}
                          onChange={(e) => setEditRegion(e.target.value)}
                          placeholder="District province"
                          className="w-full border border-brand-border rounded-lg p-2 text-[10px] font-semibold text-brand-grey bg-white focus:border-brand-emerald outline-none"
                        />
                      </td>

                      {/* Edit Col 3 tags */}
                      <td className="p-3 vertical-top">
                        <select
                          value={editTheme}
                          onChange={(e) => setEditTheme(e.target.value)}
                          className="w-full border border-brand-border rounded-lg p-2 mb-1.5 text-[10px] font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          {STATIC_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select
                          value={editResultType}
                          onChange={(e) => setEditResultType(e.target.value as any)}
                          className="w-full border border-brand-border rounded-lg p-2 mb-1.5 text-[10px] font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          {STATIC_RESULT_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                        </select>
                        <select
                          value={editDisease}
                          onChange={(e) => setEditDisease(e.target.value)}
                          className="w-full border border-brand-border rounded-lg p-2 mb-1.5 text-[10px] font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          {STATIC_DISEASES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-full border border-brand-border rounded-lg p-2 text-[10px] font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          {STATIC_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>

                      {/* Edit Col 4 Text proof */}
                      <td className="p-3 vertical-top w-96 font-medium">
                        <textarea
                          value={editEvidence}
                          onChange={(e) => setEditEvidence(e.target.value)}
                          className="w-full h-24 border border-brand-border rounded-lg p-2.5 text-[11px] font-semibold text-brand-dark bg-white focus:border-brand-emerald outline-none font-normal leading-relaxed"
                          required
                        />
                      </td>

                      {/* Edit Col 5 numeric reached */}
                      <td className="p-3 vertical-top text-right">
                        <input
                          type="number"
                          min="0"
                          value={editReached}
                          onChange={(e) => setEditReached(Number(e.target.value))}
                          className="w-20 border border-brand-border rounded-lg p-2 text-right text-xs focus:border-brand-emerald outline-none font-extrabold font-mono text-brand-dark"
                        />
                      </td>

                      {/* Edit Col 6 weights */}
                      <td className="p-3 vertical-top text-center">
                        <select
                          value={editConfidence}
                          onChange={(e) => setEditConfidence(e.target.value as any)}
                          className="border border-brand-border rounded-lg p-2 text-[10px] font-bold text-brand-dark bg-white focus:border-brand-emerald outline-none cursor-pointer"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>

                      {/* Edit controls action triggers */}
                      <td className="p-3 vertical-top text-right">
                        <div className="flex flex-col gap-1.5 items-end">
                          <button
                            onClick={() => saveEditing(item.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-brand-emerald text-white font-extrabold text-[10px] hover:bg-brand-emerald/90 font-sans flex items-center gap-1 shadow-sm shrink-0"
                          >
                            <Check className="w-3 h-3" />
                            SAVE
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2.5 py-1.5 rounded-xl bg-brand-bg text-brand-grey border border-brand-border font-extrabold text-[10px] hover:bg-brand-bg/85 flex items-center gap-1 shrink-0"
                          >
                            <X className="w-3 h-3" />
                            CANCEL
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id} className="hover:bg-brand-bg/40 transition-colors group">
                    {/* Render Row Partner/Source */}
                    <td className="py-4 px-5 vertical-top">
                      <span className="font-extrabold text-brand-dark group-hover:text-brand-emerald transition-colors tracking-tight">{item.partner}</span>
                      <span className="text-[10px] text-brand-grey block mt-1 font-mono font-bold truncate max-w-[170px]" title={item.source}>
                        SRC: {item.source}
                      </span>
                      <span className="text-[10px] text-brand-grey block mt-1 font-mono">
                        {item.resultType}
                      </span>
                      <span className="text-[10px] text-brand-grey block mt-1 font-mono">
                        Submitted by: {item.submittedBy || 'Unknown'}
                      </span>
                      <span className="text-[9px] text-[#5f776e] block uppercase tracking-wider mt-0.5 font-semibold">
                        {item.submittedByRole || 'Field officer'}
                      </span>
                    </td>

                    {/* Location scope */}
                    <td className="py-4 px-3 vertical-top">
                      <span className="font-bold text-brand-dark">{item.country}</span>
                      <span className="text-[10px] text-brand-grey font-bold block mt-0.5 uppercase tracking-wider font-mono">
                        {item.region ? `${item.region} (${item.level})` : `(${item.level})`}
                      </span>
                    </td>

                    {/* Disease area */}
                    <td className="py-4 px-3 vertical-top flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-bold text-brand-dark uppercase tracking-widest bg-brand-bg border border-brand-border px-1.5 py-0.5 rounded leading-none shrink-0" title={item.theme}>
                        {item.theme}
                      </span>
                      <span className={`inline-block border text-[10px] px-1.5 py-0.5 rounded font-bold leading-none mt-0.5 ${getDiseaseBadgeColor(item.disease)}`}>
                        {item.disease}
                      </span>
                    </td>                    <td className="py-4 px-3 vertical-top">
                      <span className="inline-block bg-brand-bg border border-brand-border text-brand-dark text-[10px] px-2.5 py-0.5 rounded-lg font-bold uppercase tracking-wide">
                        {item.resultType}
                      </span>
                    </td>
                    {/* Free comments/evidence */}
                    <td className="py-4 px-4 w-96 leading-relaxed vertical-top text-brand-dark/95">
                      <p className="font-sans font-normal antialiased">{item.evidence}</p>
                    </td>

                    {/* Beneficiaries reached */}
                    <td className="py-4 px-3 text-right font-mono font-extrabold text-brand-dark vertical-top">
                      {item.reached > 0 ? item.reached.toLocaleString() : '-'}
                    </td>

                    {/* Reliability index */}
                    <td className="py-4 px-4 text-center vertical-top">
                      <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-extrabold border uppercase tracking-wider shadow-sm ${
                        item.confidence === 'High' 
                          ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/25' 
                          : item.confidence === 'Medium' 
                            ? 'bg-[#F0C24D]/15 text-[#aa7b21] border-[#F0C24D]/35' 
                            : 'bg-rose-500/10 text-rose-700 border-rose-500/25'
                      }`}>
                        {item.confidence}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center vertical-top">
                      <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-extrabold border uppercase tracking-wider shadow-sm ${
                        item.approvalStatus === 'Approved' 
                          ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/25' 
                          : item.approvalStatus === 'Rejected' 
                            ? 'bg-rose-100 text-rose-700 border-rose-200' 
                            : 'bg-[#F59E0B]/10 text-[#92400E] border-[#F59E0B]/30'
                      }`}>
                        {item.approvalStatus || 'Pending'}
                      </span>
                    </td>

                    {/* Standard edit deletes triggers */}
                    <td className="py-4 px-5 text-right vertical-top">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {user?.role === 'Admin' && item.approvalStatus === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprovalAction(item.id, 'Approved')}
                              className="px-2 py-1 rounded-xl bg-brand-emerald text-white text-[10px] font-bold hover:bg-brand-emerald/90 transition-all"
                              title="Approve this record"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprovalAction(item.id, 'Rejected')}
                              className="px-2 py-1 rounded-xl bg-rose-100 text-rose-700 text-[10px] font-bold hover:bg-rose-200 transition-all"
                              title="Reject this record"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => startEditing(item)}
                          className="hover:bg-brand-bg border border-transparent hover:border-brand-border px-2 py-1 rounded-xl text-brand-grey hover:text-brand-emerald transition-all cursor-pointer"
                          title="Edit row details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Confirm deletion of this health record from results database?")) {
                              onDeleteRecord(item.id);
                            }
                          }}
                          className="hover:bg-rose-50 border border-transparent hover:border-[#FEE2E2] px-2 py-1 rounded-xl text-brand-grey hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 px-6 text-center text-brand-grey">
                  <Database className="w-10 h-10 text-brand-border mx-auto mb-3" />
                  <p className="font-bold text-sm text-brand-dark">No structured records match criteria.</p>
                  <p className="text-xs text-brand-grey mt-1">Try to loosen search query or click "Add Blank record" above.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
