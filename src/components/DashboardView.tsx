import React from 'react';
import { RecordItem, FilterState } from '../types';
import { THEMES, LEVELS, DISEASES, COUNTRIES } from '../data/demo';
import { Search, FilterX, HelpCircle, CheckCircle, Database } from 'lucide-react';

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
const STATIC_RESULT_TYPES = ["Policy change", "Service delivery", "Capacity building", "Research output", "Community engagement", "System strengthening"];
const STATIC_COUNTRIES = ["Benin", "Ghana", "Togo", "Cote d'Ivoire", "Senegal", "Liberia"];

interface DashboardViewProps {
  records: RecordItem[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function DashboardView({ records, filters, onFilterChange }: DashboardViewProps) {
  // Compute aggregated KPIs
  const filtered = records.filter(r => {
    const haystack = `${r.partner} ${r.theme} ${r.resultType} ${r.country} ${r.region} ${r.level} ${r.disease} ${r.evidence} ${r.source}`.toLowerCase();
    const query = filters.search.toLowerCase();
    return (filters.theme === 'All' || r.theme === filters.theme)
      && (filters.country === 'All' || r.country === filters.country)
      && (filters.level === 'All' || r.level === filters.level)
      && (filters.disease === 'All' || r.disease === filters.disease)
      && (filters.resultType === 'All' || r.resultType === filters.resultType)
      && haystack.includes(query);
  });

  const totalCaptured = filtered.length;
  const distinctCountries = new Set(filtered.map(r => r.country)).size;
  const totalReached = filtered.reduce((acc, curr) => acc + Number(curr.reached || 0), 0);

  // Confidence is calculated based on weights: High=100, Medium=66, Low=33
  const confidenceScore: Record<string, number> = { High: 100, Medium: 66, Low: 33 };
  const totalConfidence = filtered.reduce((acc, curr) => acc + (confidenceScore[curr.confidence] || 50), 0);
  const avgConfidence = totalCaptured > 0 ? Math.round(totalConfidence / totalCaptured) : 0;

  // Aggregate by theme for structural bar charts
  const themeCounts = filtered.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.theme] = (acc[curr.theme] || 0) + 1;
    return acc;
  }, {});

  // Aggregate reached by country for geographical grid list
  const countryReached = filtered.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.country] = (acc[curr.country] || 0) + Number(curr.reached || 0);
    return acc;
  }, {});

  const handleResetFilters = () => {
    onFilterChange({
      theme: 'All',
      country: 'All',
      level: 'All',
      disease: 'All',
      resultType: 'All',
      search: ''
    });
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/25';
      case 'Medium': return 'bg-[#F0C24D]/15 text-[#aa7b21] border-[#F0C24D]/35';
      case 'Low': return 'bg-rose-500/10 text-rose-700 border-rose-500/25';
      default: return 'bg-brand-bg text-brand-grey border-brand-border';
    }
  };

  const getDiseaseBadgeColor = (disease: string) => {
    const lower = disease.toLowerCase();
    if (lower.includes('buruli')) return 'text-brand-emerald bg-brand-emerald/10 border-brand-emerald/25';
    if (lower.includes('leprosy')) return 'text-[#0d7f8b] bg-[#0d7f8b]/10 border-[#0d7f8b]/25';
    if (lower.includes('yaws')) return 'text-[#315f9f] bg-[#315f9f]/10 border-[#315f9f]/25';
    if (lower.includes('lymphatic')) return 'text-[#7e22ce] bg-[#7e22ce]/10 border-[#7e22ce]/25';
    return 'text-[#aa7b21] bg-[#F0C24D]/10 border-[#F0C24D]/25';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters Hub */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-sans font-bold text-brand-dark text-xs tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-brand-emerald rounded-sm block" />
            FILTER INTERVENTION RECORDS
          </h3>
          {(filters.theme !== 'All' || filters.country !== 'All' || filters.level !== 'All' || filters.disease !== 'All' || filters.search) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-brand-emerald hover:text-brand-dark font-bold flex items-center gap-1.5 hover:underline"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Keyword search input */}
          <div className="relative md:col-span-1">
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">SEARCH KEYWORDS</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Partner, evidence..."
                value={filters.search}
                onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl pl-8 pr-3 py-2.5 bg-brand-bg/30 focus:bg-white focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/10 outline-none transition-all placeholder:text-brand-grey"
              />
              <Search className="w-3.5 h-3.5 text-brand-grey absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Theme dropdown */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">THEME AREA</label>
            <select
              value={filters.theme}
              onChange={(e) => onFilterChange({ ...filters, theme: e.target.value })}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-2.5 bg-white outline-none focus:border-brand-emerald transition-all cursor-pointer"
            >
              <option value="All">All Thematic areas</option>
              {STATIC_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Country list dropdown */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">COUNTRY</label>
            <select
              value={filters.country}
              onChange={(e) => onFilterChange({ ...filters, country: e.target.value })}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-2.5 bg-white outline-none focus:border-brand-emerald transition-all cursor-pointer"
            >
              <option value="All">All Countries</option>
              {STATIC_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* District scope selection */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">INTERVENTION SCOPE</label>
            <select
              value={filters.level}
              onChange={(e) => onFilterChange({ ...filters, level: e.target.value })}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-2.5 bg-white outline-none focus:border-brand-emerald transition-all cursor-pointer"
            >
              <option value="All">All Scope Levels</option>
              {STATIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Disease focus selection */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">DISEASE FOCUS</label>
            <select
              value={filters.disease}
              onChange={(e) => onFilterChange({ ...filters, disease: e.target.value })}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-2.5 bg-white outline-none focus:border-brand-emerald transition-all cursor-pointer"
            >
              <option value="All">All Diseases</option>
              {STATIC_DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Result category selection */}
          <div>
            <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-widest mb-1.5 font-mono">RESULT CATEGORY</label>
            <select
              value={filters.resultType}
              onChange={(e) => onFilterChange({ ...filters, resultType: e.target.value })}
              className="w-full text-xs font-bold text-brand-dark border border-brand-border rounded-xl p-2.5 bg-white outline-none focus:border-brand-emerald transition-all cursor-pointer"
            >
              <option value="All">All Result Categories</option>
              {STATIC_RESULT_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[9px] text-brand-grey font-extrabold tracking-widest uppercase block font-mono select-none">RESULTS CAPTURED</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-brand-dark">{totalCaptured}</span>
            <span className="text-xs text-brand-grey font-semibold">records</span>
          </div>
          <div className="w-full bg-brand-bg h-1 rounded-full mt-3.5 overflow-hidden">
            <div className="bg-brand-emerald h-full transition-all" style={{ width: `${Math.min(100, (totalCaptured / records.length) * 100)}%` }} />
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[9px] text-brand-grey font-extrabold tracking-widest uppercase block font-mono select-none">ACTIVE COUNTRIES</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-brand-dark">{distinctCountries}</span>
            <span className="text-xs text-brand-grey font-semibold">nations</span>
          </div>
          <div className="w-full bg-brand-bg h-1 rounded-full mt-3.5 overflow-hidden">
            <div className="bg-[#315f9f] h-full transition-all" style={{ width: `${(distinctCountries / STATIC_COUNTRIES.length) * 100}%` }} />
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[9px] text-brand-grey font-extrabold tracking-widest uppercase block font-mono select-none">BENEFICIARIES REACHED</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-brand-dark">{totalReached.toLocaleString()}</span>
            <span className="text-xs text-brand-grey font-semibold">people</span>
          </div>
          <div className="w-full bg-brand-bg h-1 rounded-full mt-3.5 overflow-hidden">
            <div className="bg-brand-emerald/80 h-full w-3/4 transition-all" />
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[9px] text-brand-grey font-extrabold tracking-widest uppercase block font-mono select-none">AVG DATA CONFIDENCE</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-brand-dark">{avgConfidence}%</span>
            <span className="text-xs text-brand-grey font-semibold">verification</span>
          </div>
          <div className="w-full bg-brand-bg h-1 rounded-full mt-3.5 overflow-hidden">
            <div className={`h-full transition-all ${avgConfidence >= 75 ? 'bg-brand-emerald' : avgConfidence >= 50 ? 'bg-[#F0C24D]' : 'bg-rose-500'}`} style={{ width: `${avgConfidence}%` }} />
          </div>
        </div>
      </div>

      {/* Aggregation Charts (Theme Distribution & Geographical Reach) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results by Theme Area */}
        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-brand-bg pb-3">
            <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Interventions by Theme Focus</h4>
            <span className="text-[10px] text-brand-dark font-mono font-extrabold bg-brand-bg border border-brand-border px-2.5 py-0.5 rounded-full shadow-inner">
              {Object.keys(themeCounts).length} Themes
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {STATIC_THEMES.map((theme, i) => {
              const count = themeCounts[theme] || 0;
              const maxCount = Math.max(1, ...Object.values(themeCounts));
              const pct = (count / maxCount) * 100;
              const barColors = ['bg-brand-emerald', 'bg-[#12815F]', 'bg-[#0d7f8b]', 'bg-[#315f9f]', 'bg-[#aa7b21]', 'bg-[#8f3f3f]'];

              return (
                <div key={theme} className="group">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-grey mb-1.5">
                    <span className="text-[#1F2C27] font-bold tracking-tight truncate max-w-[280px]" title={theme}>{theme}</span>
                    <span className="font-extrabold text-brand-dark">{count} record{count !== 1 && 's'}</span>
                  </div>
                  <div className="w-full bg-brand-bg/50 border border-brand-border/40 p-1 rounded-lg">
                    <div className="w-full h-2.5 bg-brand-bg/85 rounded overflow-hidden relative">
                      <div
                        className={`h-full rounded-md shadow-inner transition-all duration-1000 ${barColors[i % barColors.length]}`}
                        style={{ width: `${count > 0 ? Math.max(5, pct) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aggregated Geographical Grid (Beneficiaries reached) */}
        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-brand-bg pb-3">
            <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">West Africa Aggregation Status</h4>
            <span className="text-[10px] text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Active countries</span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {STATIC_COUNTRIES.map((ct) => {
              const reachedVal = countryReached[ct] || 0;
              const recordsInCountry = filtered.filter(f => f.country === ct).length;
              const isFilterSelected = filters.country === ct;

              return (
                <button
                  key={ct}
                  onClick={() => onFilterChange({ ...filters, country: filters.country === ct ? 'All' : ct })}
                  className={`p-4 rounded-xl text-left border flex flex-col justify-between h-28 transition-all hover:shadow-md cursor-pointer group ${
                    isFilterSelected
                      ? 'bg-brand-emerald/10 border-brand-emerald ring-1 ring-brand-emerald/30'
                      : 'bg-brand-bg/30 border-brand-border hover:border-brand-grey/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-sans text-brand-dark uppercase tracking-wide group-hover:text-brand-emerald transition-colors">{ct}</span>
                    <span className="text-[10px] font-mono text-brand-grey group-hover:text-brand-dark font-extrabold">
                      {recordsInCountry} doc{recordsInCountry !== 1 && 's'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-xl font-black tracking-tight text-brand-dark font-sans block leading-none">
                      {reachedVal.toLocaleString()}
                    </strong>
                    <span className="text-[9px] text-brand-grey font-bold uppercase tracking-wider mt-1 block">PEOPLE REACHED</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Filtered Database Records Table */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-bg flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Intervention Evidence Records</h4>
            <p className="text-xs text-brand-grey mt-0.5">Review filtered change narratives, geographic scope and partner credentials.</p>
          </div>
          <span className="text-[10px] text-brand-dark font-mono font-extrabold bg-brand-bg px-3 py-1 rounded-full border border-brand-border shadow-inner">
            Showing <strong className="text-brand-emerald">{totalCaptured}</strong> of {records.length} records
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border text-brand-grey text-[9px] tracking-widest font-extrabold uppercase font-mono select-none">
                <th className="py-4 px-5">PROJECT / PARTNER</th>
                <th className="py-4 px-3">THEME</th>
                <th className="py-4 px-3">DISEASE</th>
                <th className="py-4 px-3">LOCATION Scope</th>
                <th className="py-4 px-4 w-96">INTERVENTION CHANGE EVIDENCE</th>
                <th className="py-4 px-3 text-right">REACHED</th>
                <th className="py-4 px-5 text-center">CONFIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-xs text-[#21352E]">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-bg/40 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="font-bold text-brand-dark group-hover:text-brand-emerald transition-colors">{item.partner}</div>
                      <span className="text-[10px] text-brand-grey block mt-1 font-mono font-bold truncate max-w-[200px]" title={item.source}>
                        SRC: {item.source}
                      </span>
                    </td>
                    <td className="py-4 px-3 vertical-top">
                      <span className="inline-block bg-brand-bg border border-brand-border text-brand-dark text-[10px] px-2.5 py-0.5 rounded-lg font-bold">
                        {item.theme}
                      </span>
                    </td>
                    <td className="py-4 px-3 vertical-top">
                      <span className={`inline-block border text-[10px] px-2.5 py-0.5 rounded-lg font-bold ${getDiseaseBadgeColor(item.disease)}`}>
                        {item.disease}
                      </span>
                    </td>
                    <td className="py-4 px-3 vertical-top">
                      <div className="font-bold text-brand-dark">{item.country}</div>
                      <div className="text-[10px] text-brand-grey mt-0.5 font-bold">{item.region} ({item.level})</div>
                    </td>
                    <td className="py-4 px-4 w-96 text-brand-dark/90 leading-relaxed font-sans font-normal antialiased">
                      {item.evidence}
                    </td>
                    <td className="py-4 px-3 text-right font-mono font-bold text-brand-dark">
                      {item.reached > 0 ? item.reached.toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-block border text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm ${getConfidenceBadgeColor(item.confidence)}`}>
                        {item.confidence}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={7} className="py-12 px-6 text-center text-brand-grey">
                    <Database className="w-10 h-10 text-brand-border mx-auto mb-3" />
                    <p className="font-bold text-sm text-brand-dark">No health records correspond to your criteria.</p>
                    <p className="text-xs text-brand-grey mt-1">Try to loosen your filters or clear search inputs above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
