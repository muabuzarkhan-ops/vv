import React, { useMemo, useState } from 'react';
import { RecordItem, UserState } from '../types';
import { FIELD_WORKERS } from '../data/fieldworkers';
import { Sparkles, FilePlus, UploadCloud, Check, Search, CloudUpload } from 'lucide-react';

interface FieldWorkerViewProps {
  records: RecordItem[];
  user: UserState | null;
  onSaveRecord: (record: RecordItem) => void;
}

const COUNTRIES = ['Benin', 'Ghana', 'Togo', 'Cote d\'Ivoire', 'Senegal', 'Liberia'];

export default function FieldWorkerView({ records, user, onSaveRecord }: FieldWorkerViewProps) {
  const [step, setStep] = useState<'country' | 'login' | 'work'>('country');
  const [country, setCountry] = useState('Benin');
  const [workerId, setWorkerId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string; country: string } | null>(null);
  const [inputText, setInputText] = useState('');
  const [partner, setPartner] = useState('');
  const [region, setRegion] = useState('');
  const [theme, setTheme] = useState('Case detection');
  const [level, setLevel] = useState('District');
  const [disease, setDisease] = useState('Buruli ulcer');
  const [reached, setReached] = useState<number>(0);
  const [resultType, setResultType] = useState<'Policy change' | 'Service delivery' | 'Capacity building' | 'Research output' | 'Community engagement' | 'System strengthening'>('Service delivery');
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [source, setSource] = useState('Field worker submission');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [fileText, setFileText] = useState('');

  const availableWorkers = useMemo(() => FIELD_WORKERS, []);

  const currentCountryWorkers = useMemo(
    () => availableWorkers,
    [availableWorkers]
  );

  const handleCountryContinue = () => {
    setStep('login');
    setLoginError(null);
  };

  const handleLogin = () => {
    const worker = FIELD_WORKERS.find((w) => w.id === workerId && w.password === password);
    if (!worker) {
      setLoginError('Invalid worker ID or password.');
      return;
    }

    setProfile({ id: worker.id, name: worker.name, country });
    setStep('work');
    setLoginError(null);
    setMessage(`Welcome ${worker.name}. Your submissions for ${country} are pending admin approval.`);
  };

  const handleSave = () => {
    if (!profile) return;
    if (!partner.trim() || !evidence.trim()) {
      setMessage('Please fill partner and evidence fields before saving.');
      return;
    }

    const newRecord: RecordItem = {
      id: `record-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      partner,
      theme,
      country: profile.country,
      region,
      level,
      disease,
      evidence,
      reached,
      confidence,
      source,
      resultType,
      approvalStatus: 'Pending',
      submittedBy: profile.name,
      submittedByRole: 'Field worker',
      updatedAt: new Date().toISOString(),
      updatedBy: profile.id
    };

    onSaveRecord(newRecord);
    setMessage('Submission saved locally. It will appear on the dashboard once approved by admin.');
    setPartner('');
    setRegion('');
    setTheme('Case detection');
    setLevel('District');
    setDisease('Buruli ulcer');
    setReached(0);
    setResultType('Service delivery');
    setConfidence('Medium');
    setSource('Field worker submission');
    setEvidence('');
    setFileText('');
  };

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setFileText(text);
      setEvidence(text.slice(0, 1000));
      setMessage('File loaded. Please review and save as a new submission.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-6 max-w-5xl mx-auto">
      {!profile ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-brand-dark">Field Worker Data Submission</h3>
            <p className="text-sm text-brand-grey mt-2">Select your country first, then login with your worker ID and password.</p>
          </div>

          {step === 'country' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Select country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCountryContinue}
                  className="w-full rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
                >
                  Continue to login
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Worker ID</label>
                <input
                  type="text"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border bg-brand-bg/60 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
                >
                  Login as field worker
                </button>
              </div>
              {loginError && (
                <div className="md:col-span-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm">
                  {loginError}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-brand-dark">Welcome, {profile.name}</h3>
              <p className="text-sm text-brand-grey mt-2">Your records will remain pending until an admin approves them.</p>
            </div>
            <div className="rounded-2xl bg-brand-bg/70 px-4 py-3 text-sm text-brand-dark border border-brand-border">
              Country: <strong>{profile.country}</strong>
            </div>
          </div>

          {message && (
            <div className="rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald p-4 text-sm">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-brand-border bg-brand-bg/60 p-5">
              <h4 className="font-bold text-brand-dark text-sm mb-4">New Submission</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Partner / Project</label>
                  <input
                    type="text"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Region / District</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                    >
                      <option>Case detection</option>
                      <option>Health system strengthening</option>
                      <option>Community engagement</option>
                      <option>Research and laboratory</option>
                      <option>Policy and governance</option>
                      <option>Civil society capacity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Result type</label>
                    <select
                      value={resultType}
                      onChange={(e) => setResultType(e.target.value as any)}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                    >
                      <option>Policy change</option>
                      <option>Service delivery</option>
                      <option>Capacity building</option>
                      <option>Research output</option>
                      <option>Community engagement</option>
                      <option>System strengthening</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Evidence / summary</label>
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Reached</label>
                    <input
                      type="number"
                      value={reached}
                      onChange={(e) => setReached(Number(e.target.value))}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-grey mb-2">Confidence</label>
                    <select
                      value={confidence}
                      onChange={(e) => setConfidence(e.target.value as any)}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleSave}
                    className="w-full rounded-2xl bg-brand-emerald px-5 py-3 text-sm font-bold text-white hover:bg-brand-emerald/90 transition"
                  >
                    Save submission for approval
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-brand-border bg-brand-bg/60 p-5">
              <div className="flex items-center gap-3 mb-4">
                <UploadCloud className="w-5 h-5 text-brand-emerald" />
                <h4 className="font-bold text-brand-dark text-sm">File Upload</h4>
              </div>
              <p className="text-sm text-brand-grey mb-4">Upload a CSV or TXT file to seed the evidence field. It will still require admin approval once saved.</p>
              <input type="file" accept=".txt,.csv" onChange={handleUploadFile} className="block w-full text-sm text-brand-dark" />
              {fileText && (
                <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4 text-sm text-brand-dark max-h-48 overflow-y-auto">
                  <div className="font-semibold mb-2">Uploaded file preview</div>
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">{fileText.slice(0, 1200)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
