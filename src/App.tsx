import React, { useState, useEffect } from 'react';
import { RecordItem, DocumentItem, FilterState, UserState } from './types';
import { DEMO_RECORDS } from './data/demo';

// Component Imports
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ImportView from './components/ImportView';
import DocumentsView from './components/DocumentsView';
import RecordsView from './components/RecordsView';
import InsightsView from './components/InsightsView';
import SyncView from './components/SyncView';
import AdminView from './components/AdminView';
import FieldWorkerView from './components/fieldworkers/FieldWorkerView';

// Standard Lucide icons
import { Cloud, Wifi, WifiOff, FileSpreadsheet, Download, RefreshCw, AlertCircle, Database, Check } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Core Application States
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    theme: 'All',
    country: 'All',
    level: 'All',
    disease: 'All',
    resultType: 'All',
    search: ''
  });

  // Offline syncing parameters
  const [user, setUser] = useState<UserState | null>(null);
  const [pendingChanges, setPendingChanges] = useState<RecordItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  // Toast Alerts
  const [notification, setNotification] = useState<{ type: 'info' | 'success' | 'warn'; msg: string } | null>(null);

  // Trigger temporary toast announcements
  const triggerNotification = (type: 'info' | 'success' | 'warn', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Mount logic: pull credentials and initial results
  useEffect(() => {
    const cachedUser = localStorage.getItem('anesvad_user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }

    const cachedSync = localStorage.getItem('anesvad_last_sync_time');
    if (cachedSync) {
      setLastSyncedAt(cachedSync);
    }

    const cachedPending = localStorage.getItem('anesvad_pending_pushes');
    if (cachedPending) {
      setPendingChanges(JSON.parse(cachedPending));
    }

    const cachedDocs = localStorage.getItem('anesvad_documents');
    if (cachedDocs) {
      setDocuments(JSON.parse(cachedDocs));
    }

    // Try starting by fetching from the backend API, or fall back to localStorage/demo
    fetchRecordsOnMount();
  }, []);

  const fetchRecordsOnMount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/records');
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
        localStorage.setItem('anesvad_records_cache', JSON.stringify(data.records));
        triggerNotification('success', "Live health operational records loaded from server.");
      } else {
        throw new Error("Unable to contact records endpoint");
      }
    } catch (e) {
      console.warn("Express backend database offline. Falling back to local cache mode.");
      const cachedRecs = localStorage.getItem('anesvad_records_cache');
      if (cachedRecs) {
        setRecords(JSON.parse(cachedRecs));
      } else {
        setRecords(DEMO_RECORDS);
        localStorage.setItem('anesvad_records_cache', JSON.stringify(DEMO_RECORDS));
      }
      triggerNotification('info', "Offline mode active. Utilizing local caching.");
    } finally {
      setLoading(false);
    }
  };

  // Save specific states to disk
  const saveDocumentsToCache = (docs: DocumentItem[]) => {
    setDocuments(docs);
    localStorage.setItem('anesvad_documents', JSON.stringify(docs));
  };

  // Auth logins handler
  const handleLogin = (newUser: UserState) => {
    setUser(newUser);
    localStorage.setItem('anesvad_user', JSON.stringify(newUser));
  };

  const handleAdminLogin = async (username: string, password: string) => {
    if (username !== 'Anesvad' || password !== '11223344') {
      return { success: false, message: 'Invalid admin credentials. Please enter Anesvad / 11223344.' };
    }

    const adminUser: UserState = {
      name: 'Anesvad',
      email: 'anesvad@local',
      role: 'Admin',
      org: 'Anesvad Alliance',
      serverUrl: 'http://localhost:3000',
      authProvider: 'local'
    };

    setUser(adminUser);
    localStorage.setItem('anesvad_user', JSON.stringify(adminUser));
    triggerNotification('success', 'Local admin authenticated. Pending field submissions can now upload.');

    return { success: true, message: 'Admin authenticated successfully.' };
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('anesvad_user');
    triggerNotification('info', "Operator logged out successfully.");
  };

  // Record mutators (bidirectional local & remote handlers)
  const handleAddRecord = (record: RecordItem) => {
    const updated = [record, ...records];
    setRecords(updated);
    localStorage.setItem('anesvad_records_cache', JSON.stringify(updated));

    // Save locally to pending sync queue
    const pend = [record, ...pendingChanges];
    setPendingChanges(pend);
    localStorage.setItem('anesvad_pending_pushes', JSON.stringify(pend));
    triggerNotification('success', record.approvalStatus === 'Approved'
      ? "New approved record queued for upload."
      : "New record logged locally pending admin approval.");
  };

  const handleUpdateRecord = (record: RecordItem) => {
    const updated = records.map(r => r.id === record.id ? record : r);
    setRecords(updated);
    localStorage.setItem('anesvad_records_cache', JSON.stringify(updated));

    // Queue in pending changes
    const existingPendIdx = pendingChanges.findIndex(p => p.id === record.id);
    let pend = [...pendingChanges];
    if (existingPendIdx > -1) {
      pend[existingPendIdx] = record;
    } else {
      pend.push(record);
    }
    setPendingChanges(pend);
    localStorage.setItem('anesvad_pending_pushes', JSON.stringify(pend));
    triggerNotification('success', `Record for ${record.partner} modified correctly.`);
  };

  const handleDeleteRecord = async (id: string) => {
    // Optimistic local deletion
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('anesvad_records_cache', JSON.stringify(updated));

    // Also remove from pending pushes if present
    const pend = pendingChanges.filter(p => p.id !== id);
    setPendingChanges(pend);
    localStorage.setItem('anesvad_pending_pushes', JSON.stringify(pend));

    try {
      // Try hitting the backend server
      const headers: Record<string, string> = {};
      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`/api/records/${id}`, { 
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        triggerNotification('success', "Record purged from server database successfully.");
      } else {
        throw new Error("HTTP failure");
      }
    } catch (e) {
      triggerNotification('warn', "Purged locally. Will align with central database during next push sync.");
    }
  };

  // Document attachments handlers
  const handleUploadDocument = (doc: DocumentItem, extractedRecords: RecordItem[]) => {
    const updatedDocs = [doc, ...documents];
    saveDocumentsToCache(updatedDocs);

    if (extractedRecords.length > 0) {
      const mergedRecs = [...extractedRecords, ...records];
      setRecords(mergedRecs);
      localStorage.setItem('anesvad_records_cache', JSON.stringify(mergedRecs));

      const updatedPend = [...extractedRecords, ...pendingChanges];
      setPendingChanges(updatedPend);
      localStorage.setItem('anesvad_pending_pushes', JSON.stringify(updatedPend));
      triggerNotification('success', `Merged file details successfully! ${extractedRecords.length} records appended to verification queue.`);
    } else {
      triggerNotification('success', `Document '${doc.fileName}' archived correctly.`);
    }
  };

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    saveDocumentsToCache(updated);
    triggerNotification('info', "Document index removed.");
  };

  // Synchronizers
  const handleTriggerSync = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user && user.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const approvedRecords = pendingChanges.filter((record) => record.approvalStatus === 'Approved');
    let uploadRecords = approvedRecords;

    if (uploadRecords.length === 0) {
      if (user?.role === 'Admin') {
        uploadRecords = pendingChanges.map((record) => ({
          ...record,
          approvalStatus: 'Approved',
          approvedBy: 'Anesvad',
          updatedAt: new Date().toISOString(),
          updatedBy: user.email || 'anesvad-admin'
        }));
      } else {
        throw new Error("No approved records are ready for upload. Admin approval is required before syncing field submissions.");
      }
    }

    let responseData: { added: number; updated: number; records: RecordItem[] } | null = null;
    let attemptedRemote = false;

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers,
        body: JSON.stringify({ records: uploadRecords })
      });
      attemptedRemote = true;
      if (!response.ok) {
        throw new Error("Push sequence failed.");
      }
      responseData = await response.json();
      setRecords(responseData.records);
      localStorage.setItem('anesvad_records_cache', JSON.stringify(responseData.records));
    } catch (error: any) {
      if (user?.role !== 'Admin') {
        throw error;
      }

      const mergedRecords = uploadRecords.reduce<RecordItem[]>((acc, record) => {
        const existingIndex = acc.findIndex((r) => r.id === record.id);
        if (existingIndex >= 0) {
          acc[existingIndex] = record;
        } else {
          acc.unshift(record);
        }
        return acc;
      }, [...records]);

      setRecords(mergedRecords);
      localStorage.setItem('anesvad_records_cache', JSON.stringify(mergedRecords));
      responseData = { added: 0, updated: uploadRecords.length, records: mergedRecords };
      if (attemptedRemote) {
        triggerNotification('warn', 'Remote sync failed, but admin-approved records were preserved locally.');
      }
    }

    const remaining = pendingChanges.filter((record) => !uploadRecords.some((uploaded) => uploaded.id === record.id));
    setPendingChanges(remaining);
    localStorage.setItem('anesvad_pending_pushes', JSON.stringify(remaining));

    const now = new Date().toISOString();
    setLastSyncedAt(now);
    localStorage.setItem('anesvad_last_sync_time', now);

    return {
      added: responseData?.added ?? 0,
      updated: responseData?.updated ?? uploadRecords.length
    };
  };

  const handleTriggerPull = async () => {
    const headers: Record<string, string> = {};
    if (user && user.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const response = await fetch('/api/sync/pull', {
      headers
    });
    if (!response.ok) {
      throw new Error("Pull sequence failed.");
    }

    const data = await response.json();
    setRecords(data.records);
    localStorage.setItem('anesvad_records_cache', JSON.stringify(data.records));

    const now = new Date().toISOString();
    setLastSyncedAt(now);
    localStorage.setItem('anesvad_last_sync_time', now);
  };

  // Global reset back to demo
  const handleResetData = async () => {
    if (window.confirm("WARNING: This will reset operational database data back to prepackaged Anesvad West African clinical trials! All manual copy-pasted changes will be lost. Proceed?")) {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (user && user.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        const response = await fetch('/api/records/reset', { 
          method: 'POST',
          headers
        });
        if (response.ok) {
          const data = await response.json();
          setRecords(data.records);
          localStorage.setItem('anesvad_records_cache', JSON.stringify(data.records));
          triggerNotification('success', "Operational database set back to initial West African demo values.");
        } else {
          throw new Error("HTTP reset fail.");
        }
      } catch (e) {
        setRecords(DEMO_RECORDS);
        localStorage.setItem('anesvad_records_cache', JSON.stringify(DEMO_RECORDS));
        triggerNotification('success', "Local operational cache reset back to standard demo markers.");
      } finally {
        setPendingChanges([]);
        localStorage.removeItem('anesvad_pending_pushes');
        saveDocumentsToCache([]);
        setLoading(false);
      }
    }
  };

  // Filter computations for spreadsheet downloads
  const filteredRecordsForExport = records.filter(r => {
    const haystack = `${r.partner} ${r.theme} ${r.resultType} ${r.country} ${r.region} ${r.level} ${r.disease} ${r.evidence} ${r.source}`.toLowerCase();
    const query = filters.search.toLowerCase();
    return (filters.theme === 'All' || r.theme === filters.theme)
      && (filters.country === 'All' || r.country === filters.country)
      && (filters.level === 'All' || r.level === filters.level)
      && (filters.disease === 'All' || r.disease === filters.disease)
      && (filters.resultType === 'All' || r.resultType === filters.resultType)
      && haystack.includes(query);
  });

  // Client-Side CSV file exports
  const handleExportCSV = () => {
    try {
      const csvHeaders = ["Project / Partner", "Theme Area", "Result Category", "Country Focus", "Region / Districts", "Operational Level", "Disease Focus", "Beneficiaries Reached", "Data Confidence", "Verifiable Source", "Intervention Change Evidence"];
      const csvRows = filteredRecordsForExport.map(r => [
        `"${(r.partner || '').replace(/"/g, '""')}"`,
        `"${(r.theme || '').replace(/"/g, '""')}"`,
        `"${(r.resultType || '').replace(/"/g, '""')}"`,
        `"${(r.country || '').replace(/"/g, '""')}"`,
        `"${(r.region || '').replace(/"/g, '""')}"`,
        `"${(r.level || '').replace(/"/g, '""')}"`,
        `"${(r.disease || '').replace(/"/g, '""')}"`,
        r.reached,
        `"${(r.confidence || '').replace(/"/g, '""')}"`,
        `"${(r.source || '').replace(/"/g, '""')}"`,
        `"${(r.evidence || '').replace(/"/g, '""')}"`
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [csvHeaders.join(","), ...csvRows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const dlLink = document.createElement("a");
      dlLink.setAttribute("href", encodedUri);
      dlLink.setAttribute("download", `anesvad_hub_results_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      triggerNotification('success', "CSV audit spreadsheet successfully generated.");
    } catch (err) {
      console.error(err);
      triggerNotification('warn', "Failed to download audit spreadsheet.");
    }
  };

  // Client-Side JSON file exports
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredRecordsForExport, null, 2));
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `anesvad_hub_results_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      document.body.removeChild(dlAnchor);
      triggerNotification('success', "Taxonomy JSON blueprint download complete.");
    } catch (err) {
      console.error(err);
      triggerNotification('warn', "Failed to generate JSON blueprint.");
    }
  };

  // Render Navigation Views
  const renderViewContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView records={records} filters={filters} onFilterChange={setFilters} />;
      case 'import':
        return <ImportView onSaveRecord={handleAddRecord} user={user} />;
      case 'documents':
        return (
          <DocumentsView
            documents={documents}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        );
      case 'records':
        return (
          <RecordsView
            records={records}
            onAddRecord={handleAddRecord}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            user={user}
          />
        );
      case 'insights':
        return <InsightsView records={records} />;
      case 'fieldworker':
        return (
          <FieldWorkerView
            records={records}
            user={user}
            onSaveRecord={handleAddRecord}
          />
        );
      case 'sync':
        return (
          <SyncView
            user={user}
            onLogin={handleLogin}
            onAdminLogin={handleAdminLogin}
            onLogout={handleLogout}
            pendingChangesCount={pendingChanges.length}
            onTriggerSync={handleTriggerSync}
            onTriggerPull={handleTriggerPull}
            lastSyncedAt={lastSyncedAt}
          />
        );
      case 'admin':
        return (
          <AdminView
            records={records}
            user={user}
            onAdminLogin={handleAdminLogin}
            onLogout={handleLogout}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        );
      default:
        return <DashboardView records={records} filters={filters} onFilterChange={setFilters} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-brand-bg font-sans antialiased text-brand-dark">
      {/* Sidebar navigation */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        user={user}
        pendingSyncCount={pendingChanges.length}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top bar header parameters */}
        <header className="bg-white border-b border-brand-border sticky top-0 z-10 px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-all">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-sans font-extrabold text-brand-dark text-lg leading-tight tracking-tight select-none">
                {activeView === 'dashboard' ? 'Operational Dashboard' : 
                 activeView === 'import' ? 'Classify Raw Reports' :
                 activeView === 'documents' ? 'Documents Archive' :
                 activeView === 'records' ? 'Structured Database' :
                 activeView === 'fieldworker' ? 'Field Worker Portal' :
                 activeView === 'insights' ? 'Diagnostic Insights AI' :
                 'Federated Sync Config'}
              </h2>
              <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
              <span className="text-[10px] bg-brand-bg text-brand-dark font-extrabold border border-brand-border/60 rounded-full px-2.5 py-0.5 uppercase tracking-wider font-mono shadow-inner select-none">
                {activeView}
              </span>
            </div>
            <p className="text-xs text-brand-grey font-medium mt-1 select-none">
              {activeView === 'dashboard' ? 'Overview of interventions, health workers reached, and geographical coverage.' : 
               activeView === 'import' ? 'Map unstructured dispatches, Excel transcripts and narratives into taxonomy fields.' :
               activeView === 'documents' ? 'Archiving original partner manifests, CSV directories and file logs.' :
               activeView === 'records' ? 'Manage detailed data rows, modify values, and add or delete metrics.' :
               activeView === 'fieldworker' ? 'Field workers can register submissions by country and upload file-based evidence.' :
               activeView === 'insights' ? 'AI evaluation of gaps, data verification indices, and operational next steps.' :
               'Configure connections, login credentials, and synchronize caches.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Download triggers */}
            <button
              onClick={handleExportCSV}
              className="text-[11px] font-bold text-brand-dark hover:text-brand-dark px-3.5 py-2 bg-white hover:bg-brand-bg/50 border border-brand-border rounded-xl flex items-center gap-2 transition-all duration-150 shadow-sm hover:shadow cursor-pointer"
              title="Download standard CSV spreadsheet of active filtered dataset"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-emerald" />
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="text-[11px] font-bold text-brand-dark hover:text-brand-dark px-3.5 py-2 bg-white hover:bg-brand-bg/50 border border-brand-border rounded-xl flex items-center gap-2 transition-all duration-150 shadow-sm hover:shadow cursor-pointer"
              title="Download JSON blueprint metadata"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              Export JSON
            </button>

            {/* Sync trigger shortcuts */}
            {user && pendingChanges.length > 0 && (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await handleTriggerSync();
                    triggerNotification('success', `Merged updates successfully! Added ${res.added} and adjusted ${res.updated}.`);
                  } catch (e: any) {
                    triggerNotification('warn', `Sync failed: ${e.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-[11px] font-extrabold bg-brand-emerald hover:bg-brand-emerald/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer animate-pulse"
                title={`${pendingChanges.length} local edits ready to sync`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                Sync ({pendingChanges.length})
              </button>
            )}
          </div>
        </header>

        {/* Global sticky notifications logs */}
        {notification && (
          <div className="mx-8 mt-4 relative z-50 animate-fade-in">
            <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 font-sans shadow-md ${
              notification.type === 'success' 
                ? 'bg-[#EAF7F2] text-[#14533D] border-[#B9E3D3]'
                : notification.type === 'warn'
                  ? 'bg-[#FFF9E6] text-[#705100] border-[#FFE699]'
                  : 'bg-brand-dark text-white border-brand-dark shadow-xl'
            }`}>
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-brand-emerald shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold">{notification.msg}</span>
            </div>
          </div>
        )}

        {/* Content routing pane */}
        <main className="p-8 flex-grow max-w-7xl w-full mx-auto pb-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 text-neutral-400 gap-3">
              <svg className="animate-spin h-9 w-9 text-[#1f7a5a]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="font-semibold text-sm">Organizing health informatics data...</p>
            </div>
          ) : (
            renderViewContent()
          )}
        </main>
      </div>
    </div>
  );
}
