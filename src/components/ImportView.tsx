import React, { useState } from 'react';
import { RecordItem, UserState } from '../types';
import { Sparkles, Save, Check, AlertCircle, FilePlus } from 'lucide-react';

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

interface ImportViewProps {
  onSaveRecord: (record: RecordItem) => void;
  user: UserState | null;
}

export default function ImportView({ onSaveRecord, user }: ImportViewProps) {
  // Unstructured layout states
  const [inputText, setInputText] = useState(
    "In Benin, the Ministry of Health and local civil society partners completed training for 42 health workers on early Buruli ulcer detection. Community screening reached 3,450 people across Zou and Atlantique departments, with referral pathways updated at district level."
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form structured review states
  const [partner, setPartner] = useState('');
  const [country, setCountry] = useState('Benin');
  const [region, setRegion] = useState('');
  const [theme, setTheme] = useState('Case detection');
  const [level, setLevel] = useState('District');
  const [disease, setDisease] = useState('Buruli ulcer');
  const [reached, setReached] = useState<number>(0);
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [source, setSource] = useState('Unstructured copy-paste');
  const [evidence, setEvidence] = useState('');

  const [hasUnsavedExtraction, setHasUnsavedExtraction] = useState(false);

  // Invoke Gemini API for automatic classification
  const handleClassify = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter or paste unstructured report narrative first.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Server failed to unpack text indicators.");
      }

      const res = data.result;
      
      // Populate the form reviews screen with Gemini's response
      setPartner(res.partner || '');
      setCountry(STATIC_COUNTRIES.includes(res.country) ? res.country : 'Benin');
      setRegion(res.region || '');
      setTheme(STATIC_THEMES.includes(res.theme) ? res.theme : 'Case detection');
      setLevel(STATIC_LEVELS.includes(res.level) ? res.level : 'District');
      setDisease(STATIC_DISEASES.includes(res.disease) ? res.disease : 'Buruli ulcer');
      setReached(Number(res.reached) || 0);
      setConfidence(res.confidence === 'High' || res.confidence === 'Medium' || res.confidence === 'Low' ? res.confidence : 'Medium');
      setSource(res.source || 'AI Classified Pasted Text');
      setEvidence(res.evidence || inputText);

      setHasUnsavedExtraction(true);
      setSuccessMsg("AI Classification completed! Please review, adjust, and validate the record properties below.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`AI extraction failed: ${err.message}. Let's fall back to parsing manually.`);
      
      // Simple local parsing rules if Gemini API is missing or fails
      const lower = inputText.toLowerCase();
      
      // Guess country
      let guessedCountry = 'Benin';
      for (const c of STATIC_COUNTRIES) {
        if (lower.includes(c.toLowerCase())) {
          guessedCountry = c;
          break;
        }
      }

      // Guess disease
      let guessedDisease = 'Buruli ulcer';
      for (const d of STATIC_DISEASES) {
        if (lower.includes(d.toLowerCase())) {
          guessedDisease = d;
          break;
        }
      }

      // Guess theme
      let guessedTheme = 'Case detection';
      if (lower.includes('governance') || lower.includes('policy') || lower.includes('indicator')) guessedTheme = 'Policy and governance';
      else if (lower.includes('civil society') || lower.includes('ngo') || lower.includes('coalition')) guessedTheme = 'Civil society capacity';
      else if (lower.includes('research') || lower.includes('laboratory') || lower.includes('sample')) guessedTheme = 'Research and laboratory';
      else if (lower.includes('strengthen') || lower.includes('ministry') || lower.includes('system')) guessedTheme = 'Health system strengthening';
      else if (lower.includes('community') || lower.includes('peer') || lower.includes('educator')) guessedTheme = 'Community engagement';

      // Guess reached
      const numMatch = inputText.match(/[\d,.]+(?=\s*(people|community|patients|health workers|participants|households))/i);
      const guessedReached = numMatch ? Number(numMatch[0].replace(/,/g, '')) : 0;

      setPartner('Inferred Partner');
      setCountry(guessedCountry);
      setRegion('Inferred departments');
      setTheme(guessedTheme);
      setLevel('District');
      setDisease(guessedDisease);
      setReached(guessedReached);
      setConfidence('Medium');
      setSource('Heuristic Local Classifier Fallback');
      setEvidence(inputText);
      setHasUnsavedExtraction(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner.trim()) {
      setErrorMsg("Project/Partner name is required to index the records.");
      return;
    }
    if (!evidence.trim()) {
      setErrorMsg("Intervention change evidence details must be supplied.");
      return;
    }

    const newRecord: RecordItem = {
      id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      partner,
      theme,
      country,
      region,
      level,
      disease,
      evidence,
      reached,
      confidence,
      source,
      approvalStatus: user?.role === 'Admin' ? 'Approved' : 'Pending',
      submittedBy: user?.name || user?.email || 'Field officer',
      submittedByRole: user?.role || 'Field officer',
      approvedBy: user?.role === 'Admin' ? (user?.name || user?.email) : undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'local-officer'
    };

    onSaveRecord(newRecord);
    setHasUnsavedExtraction(false);
    setSuccessMsg("Success! structured record successfully saved in operational database.");
    
    // Clear out form
    setPartner('');
    setRegion('');
    setReached(0);
    setEvidence('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Narrative input box */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6">
        <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-emerald animate-pulse" />
          PAST UNSTRUCTURED FIELD NOTES & DISPATCHES
        </h3>
        <p className="text-xs text-brand-grey mb-4 leading-relaxed font-medium">
          Copy/paste Excel excerpts, conference minutes, PDF summaries, team emails or transcription snippets. Anesvad results categorization rules and AI intelligence parses this instantly.
        </p>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. In Togo, Togo civil society coalition conducted community outreach in Maritime..."
          className="w-full h-36 p-4 text-xs font-semibold leading-relaxed border border-brand-border rounded-xl outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/15 bg-brand-bg/30 text-brand-dark mb-4 antialiased transition-all"
        />

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[11px] text-brand-grey italic font-medium">
            Characters typed: {inputText.length} chars
          </div>
          <button
            onClick={handleClassify}
            disabled={isLoading}
            className={`btn primary text-xs flex items-center gap-2 font-extrabold shadow px-5 py-2.5 bg-brand-dark text-white hover:bg-black transition-all rounded-xl disabled:opacity-50 cursor-pointer`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Extracting taxonomic elements...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-brand-emerald" />
                Analyze & Classify Natural Text
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual feedbacks */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="font-semibold">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-[#EAF7F2] border border-[#B9E3D3] text-[#14533D] text-xs p-4 rounded-xl flex items-start gap-2.5 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
          <div className="font-semibold">{successMsg}</div>
        </div>
      )}

      {/* Validation Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-brand-border shadow-sm p-6 flex flex-col gap-5">
        <div>
          <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-brand-emerald" />
            VALIDATE STRUCTURED INDICATOR PROPERTIES
          </h3>
          <p className="text-xs text-brand-grey mt-1 font-medium">Review taxonomy alignments closely before appending files to structured health records.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Partner / Project */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">PROJECT / PARTNER</label>
            <input
              type="text"
              placeholder="e.g. Ministry of Health, local lab"
              value={partner}
              onChange={(e) => { setPartner(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 bg-brand-bg/30 focus:border-brand-emerald focus:bg-white outline-none outline-none transition-all"
              required
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">COUNTRY</label>
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-3 bg-white outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              {STATIC_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Region / District */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">REGION / DISTRICTS</label>
            <input
              type="text"
              placeholder="e.g. Zou and Atlantique departments"
              value={region}
              onChange={(e) => { setRegion(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 bg-brand-bg/30 focus:border-brand-emerald focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">ANESVAD THERMATIC AXIS</label>
            <select
              value={theme}
              onChange={(e) => { setTheme(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-3 bg-white outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              {STATIC_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Level Scope */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">SCOPE LEVEL</label>
            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-3 bg-white outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              {STATIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Disease Focus */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">DISEASE FOCUS</label>
            <select
              value={disease}
              onChange={(e) => { setDisease(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-3 bg-white outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              {STATIC_DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Beneficiaries */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">PEOPLE REACHED</label>
            <input
              type="number"
              min="0"
              value={reached}
              onChange={(e) => { setReached(Number(e.target.value)); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 bg-brand-bg/30 focus:border-brand-emerald focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">DATA EVIDENCE CONFIDENCE</label>
            <select
              value={confidence}
              onChange={(e) => { setConfidence(e.target.value as any); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-3 bg-white outline-none cursor-pointer focus:border-brand-emerald transition-all"
            >
              <option value="High">High (Fully verified report / signed minutes)</option>
              <option value="Medium">Medium (Field narrative summary / validated Excel)</option>
              <option value="Low">Low (Informal anecdote / unparsed transcript)</option>
            </select>
          </div>

          {/* Document Source */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">VERIFIABLE DATA SOURCE</label>
            <input
              type="text"
              placeholder="e.g. Benin Quarterly Report Zou_V2.pdf"
              value={source}
              onChange={(e) => { setSource(e.target.value); setHasUnsavedExtraction(true); }}
              className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 bg-brand-bg/30 focus:border-brand-emerald focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Change Evidence text area */}
        <div>
          <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">RESULT & CHANGE EVIDENCE SUMMARY</label>
          <textarea
            required
            value={evidence}
            onChange={(e) => { setEvidence(e.target.value); setHasUnsavedExtraction(true); }}
            placeholder="Highlight what concrete shift in NTD response, health worker capacity, or local policy took place because of this action."
            className="w-full h-24 p-3.5 text-xs font-semibold text-brand-dark border border-brand-border rounded-xl outline-none focus:border-brand-emerald focus:bg-white bg-brand-bg/30 transition-all"
          />
        </div>

        {/* Action triggers */}
        <div className="flex justify-end gap-3 border-t border-brand-border pt-5">
          <button
            type="button"
            onClick={() => {
              setPartner('');
              setRegion('');
              setReached(0);
              setEvidence('');
              setHasUnsavedExtraction(false);
              setSuccessMsg("Validator cleared.");
            }}
            className="px-5 py-2.5 border border-brand-border text-xs font-bold text-brand-grey hover:bg-brand-bg hover:text-brand-dark transition-all rounded-xl cursor-pointer"
          >
            Clear Fields
          </button>
          <button
            type="submit"
            className="btn primary text-xs flex items-center gap-2 font-extrabold shadow px-5 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald/90 transition-all rounded-xl cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Append Verifiable Record to Database
          </button>
        </div>
      </form>
    </div>
  );
}
