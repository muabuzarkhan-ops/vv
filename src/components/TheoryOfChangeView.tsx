import React, { useState } from 'react';
import { TheoryOfChangeModel, Indicator, UserState } from '../types';
import { Sparkles, FileText, UploadCloud, Download, ArrowRight, CircleDashed } from 'lucide-react';

const EMPTY_TOC_MODEL: TheoryOfChangeModel = {
  id: '',
  projectName: '',
  sourceDocument: 'Untitled proposal',
  description: '',
  toc: {
    inputs: [],
    activities: [],
    outputs: [],
    outcomes: [],
    intermediateOutcomes: [],
    longTermOutcomes: [],
    impact: '',
    assumptions: [],
    risks: [],
    indicators: [],
  },
  createdAt: '',
  createdBy: undefined,
  updatedAt: '',
  updatedBy: undefined,
};

export default function TheoryOfChangeView({ user }: { user: UserState | null }) {
  const [sourceText, setSourceText] = useState(`Describe the project narrative or paste a short concept note here. Include inputs, activities, expected outcomes, assumptions, risks, indicators, and the long-term health impact.`);
  const [projectName, setProjectName] = useState('NTD Partnership Impact Model');
  const [sourceLabel, setSourceLabel] = useState('Project concept note');
  const [tocModel, setTocModel] = useState<TheoryOfChangeModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleGenerateToC = async () => {
    if (!sourceText.trim()) {
      setMessage({ type: 'error', text: 'Please provide a project narrative before generating a Theory of Change.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/toc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, projectName, sourceDocument: sourceLabel }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate Theory of Change.');
      }

      setTocModel({
        id: data.toc.id || `toc-${Date.now()}`,
        projectName: data.toc.projectName || projectName,
        sourceDocument: data.toc.sourceDocument || sourceLabel,
        description: data.toc.description || '',
        toc: {
          inputs: data.toc.inputs || [],
          activities: data.toc.activities || [],
          outputs: data.toc.outputs || [],
          outcomes: data.toc.outcomes || [],
          intermediateOutcomes: data.toc.intermediateOutcomes || [],
          longTermOutcomes: data.toc.longTermOutcomes || [],
          impact: data.toc.impact || '',
          assumptions: data.toc.assumptions || [],
          risks: data.toc.risks || [],
          indicators: data.toc.indicators || [],
        },
        createdAt: new Date().toISOString(),
        createdBy: user?.name || user?.email || 'Local planner',
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.email || 'Local planner',
      });
      setMessage({ type: 'success', text: 'Theory of Change model generated successfully. You may review and edit the causal pathway below.' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: `AI generation failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!tocModel) return;
    const content = JSON.stringify(tocModel, null, 2);
    const link = document.createElement('a');
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(content)}`;
    link.download = `anesvad_toc_${tocModel.id || 'model'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateListItem = (section: keyof TheoryOfChangeModel['toc'], index: number, value: string) => {
    if (!tocModel) return;
    const copy = { ...tocModel };
    if (Array.isArray(copy.toc[section])) {
      const list = [...(copy.toc[section] as string[])];
      list[index] = value;
      (copy.toc[section] as string[]) = list;
      setTocModel(copy);
    }
  };

  const addListItem = (section: keyof TheoryOfChangeModel['toc']) => {
    if (!tocModel) return;
    const copy = { ...tocModel };
    if (Array.isArray(copy.toc[section])) {
      (copy.toc[section] as string[]).push('');
      setTocModel(copy);
    }
  };

  const updateImpact = (value: string) => {
    if (!tocModel) return;
    setTocModel({ ...tocModel, toc: { ...tocModel.toc, impact: value } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider uppercase mb-2">Theory of Change Studio</h3>
            <p className="text-xs text-brand-grey leading-relaxed max-w-2xl">
              Automatic causal pathway synthesis from proposals and narrative documents. Generate inputs, activities, outputs, outcomes, risks, assumptions and indicators in a single studio.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              onClick={handleGenerateToC}
              disabled={loading}
              className="rounded-2xl bg-brand-emerald text-white text-xs font-bold px-5 py-3 shadow-md hover:bg-brand-emerald/90 disabled:opacity-50 transition"
            >
              {loading ? 'Generating model...' : 'Generate Theory of Change'}
            </button>
            <button
              onClick={handleDownloadJSON}
              disabled={!tocModel}
              className="rounded-2xl border border-brand-border text-brand-dark text-xs font-bold px-5 py-3 bg-white hover:bg-brand-bg transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-2 inline" /> Export JSON
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-5 p-4 rounded-2xl text-xs font-semibold ${message.type === 'success' ? 'bg-[#EAF7F2] border-[#B9E3D3] text-[#14533D]' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5 mt-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.3em] font-bold text-brand-grey mb-2">Project concept note</label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste project narrative, concept note or proposal text here."
              className="min-h-[260px] w-full rounded-3xl border border-brand-border bg-brand-bg/80 px-4 py-4 text-sm text-brand-dark placeholder:text-brand-grey focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 outline-none transition"
            />
          </div>
          <div className="grid gap-4">
            <div className="bg-[#F1FAF7] rounded-3xl border border-brand-border p-5">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.3em] font-bold text-brand-grey">
                <FileText className="w-4 h-4 text-brand-emerald" /> Project metadata
              </div>
              <label className="text-[10px] font-semibold text-brand-grey uppercase tracking-[0.2em] mb-1 block">Project name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
              />
              <label className="text-[10px] font-semibold text-brand-grey uppercase tracking-[0.2em] mb-1 block mt-4">Source document label</label>
              <input
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
              />
            </div>

            <div className="bg-white rounded-3xl border border-brand-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.3em] font-bold text-brand-grey">
                <UploadCloud className="w-4 h-4 text-brand-emerald" /> Ingestion helpers
              </div>
              <p className="text-[11px] text-brand-dark/80 leading-relaxed">
                Paste or upload narrative proposals and concept notes. This studio is designed for rapid generation of a high-level impact framework.
              </p>
            </div>
          </div>
        </div>
      </div>

      {tocModel ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-brand-border shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-brand-grey font-bold">Causal pathway</p>
                <h3 className="mt-2 font-bold text-brand-dark text-lg">Interactive Theory of Change flowchart</h3>
              </div>
              <span className="rounded-full bg-brand-emerald/10 text-brand-emerald text-[10px] uppercase px-3 py-2 font-bold tracking-[0.2em]">Draft mode</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {['inputs', 'activities', 'outputs', 'outcomes', 'intermediateOutcomes', 'longTermOutcomes'].map((section) => (
                <div key={section} className="bg-brand-bg rounded-3xl border border-brand-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-brand-grey">{section === 'intermediateOutcomes' ? 'Intermediate outcomes' : section.replace(/([A-Z])/g, ' $1')}</h4>
                    <button
                      type="button"
                      onClick={() => addListItem(section as keyof TheoryOfChangeModel['toc'])}
                      className="text-[11px] text-brand-emerald font-bold uppercase"
                    >
                      + add
                    </button>
                  </div>
                  {((tocModel.toc as any)[section] as string[]).map((item: string, index: number) => (
                    <textarea
                      key={`${section}-${index}`}
                      value={item}
                      onChange={(e) => updateListItem(section as keyof TheoryOfChangeModel['toc'], index, e.target.value)}
                      className="w-full min-h-[72px] mb-3 rounded-3xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4 text-[10px] uppercase tracking-[0.3em] font-bold text-brand-grey">
              <CircleDashed className="w-4 h-4 text-brand-emerald" /> Supporting framework
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-brand-grey font-bold mb-2 block">Impact statement</label>
                <textarea
                  value={tocModel.toc.impact}
                  onChange={(e) => updateImpact(e.target.value)}
                  rows={4}
                  className="w-full rounded-3xl border border-brand-border bg-brand-bg/80 px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-brand-grey font-bold mb-2 block">Assumptions</label>
                <div className="space-y-3">
                  {tocModel.toc.assumptions.map((assumption, idx) => (
                    <textarea
                      key={`assumption-${idx}`}
                      value={assumption}
                      onChange={(e) => updateListItem('assumptions', idx, e.target.value)}
                      rows={2}
                      className="w-full rounded-3xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
                    />
                  ))}
                  <button type="button" onClick={() => addListItem('assumptions')} className="text-xs font-bold text-brand-emerald">+ Add assumption</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-brand-grey font-bold mb-2 block">Risks</label>
                <div className="space-y-3">
                  {tocModel.toc.risks.map((risk, idx) => (
                    <textarea
                      key={`risk-${idx}`}
                      value={risk}
                      onChange={(e) => updateListItem('risks', idx, e.target.value)}
                      rows={2}
                      className="w-full rounded-3xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-emerald transition"
                    />
                  ))}
                  <button type="button" onClick={() => addListItem('risks')} className="text-xs font-bold text-brand-emerald">+ Add risk</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-6">
          <div className="text-sm font-semibold text-brand-dark">No Theory of Change model has been generated yet.</div>
          <p className="text-xs text-brand-grey mt-2">Use the concept note editor above and click Generate Theory of Change to create a full causal pathway and indicator framework.</p>
        </div>
      )}
    </div>
  );
}
