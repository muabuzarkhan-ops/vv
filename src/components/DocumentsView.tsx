import React, { useState, useRef } from 'react';
import { DocumentItem, RecordItem } from '../types';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, FileSpreadsheet, Trash2, Calendar } from 'lucide-react';

interface DocumentsViewProps {
  documents: DocumentItem[];
  onUploadDocument: (doc: DocumentItem, extractedRecords: RecordItem[]) => void;
  onDeleteDocument: (id: string) => void;
}

export default function DocumentsView({ documents, onUploadDocument, onDeleteDocument }: DocumentsViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [parseFeedback, setParseFeedback] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse files depending on file extension
  const processUploadedFile = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    const sourceName = sourceLabel.trim() || `${file.name} Import`;

    reader.onload = (e) => {
      const content = e.target?.result as string;
      let extracted: RecordItem[] = [];
      let status: DocumentItem['status'] = 'Extracted successfully';

      try {
        if (file.name.toLowerCase().endsWith('.json')) {
          // Parse JSON
          const raw = JSON.parse(content);
          const items = Array.isArray(raw) ? raw : [raw];
          extracted = items.map((row: any, i: number) => ({
            id: `record-json-${Date.now()}-${i}`,
            partner: String(row.partner || row.project || row.organisation || row.organization || "JSON Decoded Partner"),
            country: String(row.country || "Benin"),
            region: String(row.region || row.district || row.location || "Unspecified"),
            theme: String(row.theme || "Case detection"),
            level: String(row.level || "District"),
            disease: String(row.disease || "Buruli ulcer"),
            evidence: String(row.evidence || row.result || row.description || "Decoded result evidence"),
            reached: Number(row.reached || row.beneficiaries || 0),
            confidence: (row.confidence === 'High' || row.confidence === 'Medium' || row.confidence === 'Low' ? row.confidence : 'Medium'),
            source: sourceName,
            updatedAt: new Date().toISOString(),
            updatedBy: "JSON Mass Import"
          }));
        } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv') || file.name.toLowerCase().endsWith('.txt')) {
          // Parse CSV or general layout rows line by line
          const isTsv = file.name.toLowerCase().endsWith('.tsv');
          const delimiter = isTsv ? '\t' : ',';
          const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

          if (lines.length > 1 && (file.name.endsWith('.csv') || file.name.endsWith('.tsv'))) {
            // Assume CSV header schema
            const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
            
            extracted = lines.slice(1).map((line, idx) => {
              const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
              const getCol = (names: string[]) => {
                const i = headers.findIndex(h => names.some(n => h.includes(n)));
                return i > -1 ? cols[i] : null;
              };

              const partnerVal = getCol(['partner', 'project', 'org', 'agency']) || 'CSV Decoded Partner';
              const countryVal = getCol(['country', 'nation']) || 'Benin';
              const regionVal = getCol(['region', 'district', 'area', 'location']) || 'Unspecified';
              const themeVal = getCol(['theme', 'focus', 'objective']) || 'Case detection';
              const levelVal = getCol(['level', 'scope']) || 'District';
              const diseaseVal = getCol(['disease', 'ntd', 'illness']) || 'Buruli ulcer';
              const reachedVal = Number(getCol(['reached', 'reached_count', 'beneficiaries', 'peoplereached', 'count'])) || 0;
              const confidenceVal = getCol(['confidence', 'evidence_quality', 'data_reliability']) || 'Medium';
              const evidenceVal = getCol(['evidence', 'result', 'narrative', 'outcome', 'change']) || line;

              return {
                id: `record-csv-${Date.now()}-${idx}`,
                partner: partnerVal,
                country: countryVal,
                region: regionVal,
                theme: themeVal,
                level: levelVal,
                disease: diseaseVal,
                evidence: evidenceVal,
                reached: reachedVal,
                confidence: (confidenceVal === 'High' || confidenceVal === 'Medium' || confidenceVal === 'Low' ? confidenceVal as any : 'Medium'),
                source: sourceName,
                updatedAt: new Date().toISOString(),
                updatedBy: "CSV Mass Ingestion"
              };
            });
          } else {
            // Line-by-line raw TXT notes extraction
            extracted = lines.map((line, idx) => {
              if (line.trim().length < 15) return null; // Skip short debris lines
              // Simple heuristic parse
              return {
                id: `record-txt-${Date.now()}-${idx}`,
                partner: "Document Line Extractor",
                country: line.toLowerCase().includes("ghana") ? "Ghana" : line.toLowerCase().includes("togo") ? "Togo" : line.toLowerCase().includes("cote d'ivoire") ? "Cote d'Ivoire" : "Benin",
                region: "Extract district",
                theme: "Case detection",
                level: "District",
                disease: line.toLowerCase().includes("leprosy") ? "Leprosy" : "Buruli ulcer",
                evidence: line.trim(),
                reached: 0,
                confidence: "Medium",
                source: sourceName,
                updatedAt: new Date().toISOString(),
                updatedBy: "TXT Log Parser"
              };
            }).filter(Boolean) as RecordItem[];
          }
        } else {
          // Document metadata registry
          status = 'Saved locally';
        }

        const newDoc: DocumentItem = {
          id: `doc-${Date.now()}`,
          fileName: file.name,
          size: file.size,
          source: sourceName,
          extractedCount: extracted.length,
          status: status,
          uploadedAt: new Date().toISOString()
        };

        onUploadDocument(newDoc, extracted);
        setParseStatus('success');
        setParseFeedback(`Document parsed correctly! successfully extracted and appended ${extracted.length} records into active hub.`);
      } catch (err: any) {
        console.error(err);
        setParseStatus('error');
        setParseFeedback(`Parser failed to read structured indicators: ${err.message}. Ensure JSON array format or separated columns.`);
      }
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Upload Drag & Drop Area container */}
      <div className="lg:col-span-1 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6">
          <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider flex items-center gap-2 mb-2">
            <UploadCloud className="w-4 h-4 text-brand-emerald animate-pulse" />
            BATCH INGEST FILES
          </h3>
          <p className="text-xs text-brand-grey mb-4 leading-relaxed font-medium">Ingest mass registers directly. The system auto-extracts records client-side or preserves metadata index.</p>
 
          <div className="mb-4">
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">ASSIGN LOG SOURCE</label>
            <input
              type="text"
              placeholder="e.g. Benin MOH excel register"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 outline-none focus:border-brand-emerald bg-brand-bg/30 transition-all placeholder:text-brand-grey"
            />
          </div>
 
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            className={`w-full h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-brand-emerald bg-[#EAF7F2]' 
                : 'border-brand-border hover:border-brand-grey/30 hover:bg-brand-bg/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".csv,.tsv,.json,.txt"
            />
            <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-brand-emerald animate-bounce' : 'text-brand-grey'} mb-2`} />
            <p className="text-xs font-bold text-brand-dark">Drag & drop files here</p>
            <p className="text-[10px] text-brand-grey mt-1 font-medium">Accepts CSV, TSV, JSON, and raw TXT logs</p>
            <p className="text-[10px] text-brand-emerald font-extrabold underline mt-2.5">Or browse on computer</p>
          </div>
        </div>
 
        {/* Feedback block */}
        {parseStatus !== 'idle' && (
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs shadow-sm shadow-brand-border/10 ${
            parseStatus === 'success' 
              ? 'bg-[#EAF7F2] border-[#B9E3D3] text-[#14533D]' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {parseStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-extrabold">{parseStatus === 'success' ? 'Extraction completed' : 'Parsing failed'}</p>
              <p className="mt-1 leading-relaxed text-brand-dark/95 font-semibold">{parseFeedback}</p>
            </div>
          </div>
        )}
      </div>
 
      {/* Ingested File Registry/Logs */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="px-5 py-4 border-b border-brand-bg flex items-center justify-between">
          <div>
            <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Ingested Documents Index</h4>
            <p className="text-xs text-brand-grey mt-0.5">Audit log of spreadsheets and manifests uploaded to this results hub session.</p>
          </div>
          <span className="text-[10px] text-brand-dark font-mono font-extrabold bg-brand-bg px-2.5 py-0.5 rounded-full border border-brand-border shadow-inner">
            {documents.length} document{documents.length !== 1 && 's'}
          </span>
        </div>
 
        <div className="overflow-x-auto w-full flex-grow">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border text-brand-grey text-[9px] tracking-widest font-extrabold uppercase font-mono select-none">
                <th className="py-4 px-5">FILE ATRIBUTES</th>
                <th className="py-4 px-4">INGESTION LABEL</th>
                <th className="py-4 px-3 text-center">RECORDS MERGED</th>
                <th className="py-4 px-4">INGESTION STAGES</th>
                <th className="py-4 px-5 text-right font-extrabold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-xs text-brand-dark">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-brand-bg/40 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        {doc.fileName.toLowerCase().endsWith('.json') ? (
                          <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-brand-emerald shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-brand-dark group-hover:text-brand-emerald transition-colors truncate max-w-[180px] block" title={doc.fileName}>{doc.fileName}</span>
                          <span className="text-[10px] text-brand-grey font-bold block mt-0.5">
                            {(doc.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-brand-dark/90">
                      {doc.source}
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-brand-dark font-mono">
                      {doc.extractedCount > 0 ? (
                        <span className="text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-2.5 py-0.5 rounded-full font-bold">
                          +{doc.extractedCount}
                        </span>
                      ) : (
                        <span className="text-brand-grey">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${
                        doc.status.includes('successfully') || doc.status.includes('Server') || doc.status.includes('Uploaded')
                          ? 'bg-brand-emerald/10 border-brand-emerald/25 text-brand-emerald'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="hover:bg-rose-50 border border-transparent hover:border-[#FEE2E2] px-2 py-1 rounded-xl text-brand-grey hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete document index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-brand-grey">
                    <FileSpreadsheet className="w-10 h-10 text-brand-border mx-auto mb-3" />
                    <p className="font-bold text-sm text-brand-dark">Document register empty.</p>
                    <p className="text-xs text-brand-grey mt-1">Drag and drop file reports or CSV charts in the panel to populate.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
 
        {/* Footer info logs */}
        <div className="bg-brand-bg/50 border-t border-brand-border px-5 py-3 text-[10px] text-brand-grey flex items-center justify-between">
          <div className="flex items-center gap-1 font-semibold">
            <Calendar className="w-3 h-3 text-brand-grey shrink-0" />
            <span>Last change monitored: {new Date().toLocaleDateString()}</span>
          </div>
          <span className="font-bold">Automatic local validation & column mapping active</span>
        </div>
      </div>
    </div>
  );
}
