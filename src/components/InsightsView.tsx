import React, { useState, useEffect } from 'react';
import { RecordItem } from '../types';
import { Sparkles, Brain, ShieldAlert, Footprints, Grid3X3, HelpCircle } from 'lucide-react';

const STATIC_THEMES = [
  "Case detection",
  "Health system strengthening",
  "Community engagement",
  "Research and laboratory",
  "Policy and governance",
  "Civil society capacity"
];
const STATIC_LEVELS = ["Community", "District", "Subnational", "National", "Regional"];

interface InsightsViewProps {
  records: RecordItem[];
}

export default function InsightsView({ records }: InsightsViewProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Insights State
  const [patternText, setPatternText] = useState(
    "Active portfolio is concentrated around primary community screenings and district diagnostic clinics in Benin and Togo. Key players emphasize the training of health personnel. However, policy adjustments and subnational integration indicators remain poorly mapped."
  );
  const [qualityText, setQualityText] = useState(
    "Data verification is mostly Medium to High as evidence points back to concrete MOH workshops and partner dispatch files. However, Liberia and Senegal exhibit sparse entries, prompting some data-adequacy concerns."
  );
  const [nextText, setNextText] = useState(
    "Trigger systematic subnational data audits in Cote d'Ivoire and Senegal to harmonize results tracking sheet. Prioritize supporting capacity development for civil society coalitions in Togo and Liberia."
  );

  // Generate dynamic insights
  const handleGenerateInsights = async () => {
    if (records.length === 0) {
      setErrorMsg("Cannot compile insights for an empty records portfolio.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Server failed to process intelligence inquiry.");
      }

      setPatternText(data.insights.pattern);
      setQualityText(data.insights.quality);
      setNextText(data.insights.nextStep);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to query Gemini Advisor: ${err.message}. Retaining heuristic fallbacks.`);
    } finally {
      setLoading(false);
    }
  };

  // Compile calculations for Matrix: Theme x Level
  // cells[theme][level] = count
  const matrix: Record<string, Record<string, number>> = {};
  
  STATIC_THEMES.forEach(t => {
    matrix[t] = {};
    STATIC_LEVELS.forEach(l => {
      matrix[t][l] = 0;
    });
  });

  records.forEach(r => {
    if (matrix[r.theme] && matrix[r.theme][r.level] !== undefined) {
      matrix[r.theme][r.level]++;
    }
  });

  // Totals calculations
  const themeTotals: Record<string, number> = {};
  const levelTotals: Record<string, number> = {};

  STATIC_THEMES.forEach(t => {
    themeTotals[t] = STATIC_LEVELS.reduce((sum, l) => sum + (matrix[t][l] || 0), 0);
  });

  STATIC_LEVELS.forEach(l => {
    levelTotals[l] = STATIC_THEMES.reduce((sum, t) => sum + (matrix[t][l] || 0), 0);
  });

  const absoluteGrandTotal = STATIC_THEMES.reduce((sum, t) => sum + themeTotals[t], 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic AI Advisor panel triggers */}
      <div className="bg-[#0F2C27] text-[#DCEFE7] rounded-2xl p-6 border border-[#23584E] shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 select-none">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/30 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-brand-emerald animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-white tracking-wider text-sm">AI INFORMATICS DIAGNOSTIC ADVISOR</h3>
            <p className="text-xs text-[#9cc0b3] mt-1 leading-relaxed max-w-xl font-medium">
              Anesvad clinical-grade model audits the active database portfolio to trace strategic gaps, identify geographic anomalies, and suggest optimized intervention pathways.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateInsights}
          disabled={loading}
          className="text-xs font-extrabold bg-[#208463] text-white hover:bg-[#1a6e52] border border-transparent hover:border-white/10 shadow px-4.5 py-3 shrink-0 flex items-center gap-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer select-none"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Synthesizing Portfolio...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Re-evaluate Diagnostics with AI
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl shadow-inner font-semibold">
          {errorMsg}
        </div>
      )}

      {/* AI Bento Grid Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pattern Card */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm hover:shadow hover:border-brand-grey/25 transition-all flex flex-col gap-3.5 min-h-[170px] group">
          <div className="flex items-center gap-2 border-b border-brand-bg pb-2">
            <span className="p-1 rounded bg-brand-emerald/10 text-brand-emerald shrink-0 group-hover:scale-105 transition-transform">
              <Grid3X3 className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase text-brand-grey tracking-wider font-mono">PORTFOLIO PATTERNS</span>
          </div>
          <p className="text-xs text-brand-dark/95 leading-relaxed font-semibold">{patternText}</p>
        </div>

        {/* Data Quality Card */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm hover:shadow hover:border-brand-grey/25 transition-all flex flex-col gap-3.5 min-h-[170px] group">
          <div className="flex items-center gap-2 border-b border-brand-bg pb-2">
            <span className="p-1 rounded bg-amber-500/10 text-amber-700 shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase text-brand-grey tracking-wider font-mono">DATA INGESTION QUALITY</span>
          </div>
          <p className="text-xs text-brand-dark/95 leading-relaxed font-semibold">{qualityText}</p>
        </div>

        {/* Action Steps Card */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm hover:shadow hover:border-brand-grey/25 transition-all flex flex-col gap-3.5 min-h-[170px] group">
          <div className="flex items-center gap-2 border-b border-brand-bg pb-2">
            <span className="p-1 rounded bg-sky-500/10 text-sky-700 shrink-0 border border-sky-500/20 group-hover:scale-105 transition-transform">
              <Footprints className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase text-brand-grey tracking-wider font-mono">TACTICAL FIELD ACTION</span>
          </div>
          <p className="text-xs text-brand-dark/95 leading-relaxed font-semibold">{nextText}</p>
        </div>
      </div>

      {/* Structured Theme x Level Matrix Table */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-bg">
          <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Theme-by-Scope Aggregation Matrix</h4>
          <p className="text-xs text-brand-grey mt-0.5">Cross-referencing results count across operational levels (Community to Regional).</p>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border text-brand-grey text-[9px] tracking-widest font-extrabold uppercase font-mono select-none">
                <th className="py-4 px-5">THEMATIC RESULTS AXIS</th>
                {STATIC_LEVELS.map(lvl => (
                  <th key={lvl} className="py-4 px-3 text-center">{lvl.toUpperCase()}</th>
                ))}
                <th className="py-4 px-5 text-center bg-brand-bg font-extrabold border-l border-brand-border text-brand-dark">AGG REGISTRY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-xs text-brand-dark font-semibold">
              {STATIC_THEMES.map(theme => (
                <tr key={theme} className="hover:bg-brand-bg/25 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#14231E]">{theme}</td>
                  {STATIC_LEVELS.map(lvl => {
                    const cellCount = matrix[theme][lvl] || 0;
                    return (
                      <td key={lvl} className={`py-3.5 px-3 text-center font-mono font-bold ${cellCount > 0 ? 'text-[#14231E]' : 'text-brand-border'}`}>
                        {cellCount}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-5 text-center font-bold font-mono bg-brand-bg/20 border-l border-brand-border text-brand-emerald">
                    {themeTotals[theme]}
                  </td>
                </tr>
              ))}

              {/* Aggregated totals row of the cross tab */}
              <tr className="bg-brand-bg/40 border-t-2 border-brand-border font-bold text-[#14231E]">
                <td className="py-4 px-5 uppercase tracking-wide font-extrabold text-[10px] text-brand-dark">Grand Metrics Total</td>
                {STATIC_LEVELS.map(lvl => (
                  <td key={lvl} className="py-4 px-3 text-center font-mono font-extrabold text-[#14231E]">
                    {levelTotals[lvl]}
                  </td>
                ))}
                <td className="py-4 px-5 text-center font-mono font-extrabold text-white bg-brand-emerald border-l border-brand-emerald shadow-inner">
                  {absoluteGrandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
