import React, { useState } from 'react';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Flame,
  Zap,
  MapPin,
  Clock,
  Download,
  RotateCw,
} from 'lucide-react';
import { SheetRecord, FilterState, PaginationMeta, SummaryData } from '../lib/types';
import { exportFilteredCSV } from '../lib/api';

interface DirectoryViewProps {
  records: SheetRecord[];
  pagination: PaginationMeta | null;
  filters: FilterState;
  summary: SummaryData | null;
  isLoading: boolean;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectRecord: (record: SheetRecord) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  records,
  pagination,
  filters,
  summary,
  isLoading,
  onFilterChange,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
  onSelectRecord,
}) => {
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportCSV = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportFilteredCSV(filters);
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = [
    filters.unitsStatus,
    filters.incharge,
    filters.project,
    filters.area,
    filters.folderStatus,
    filters.priorityMoveIn,
    filters.block,
    filters.lot,
    filters.stage,
    filters.startDate,
    filters.search,
  ].filter(Boolean).length;

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('ENERGIZED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
          ENERGIZED
        </span>
      );
    }
    if (s.includes('ONGOING')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <Clock className="w-3 h-3 text-blue-600" />
          ONGOING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
        {status || 'NYS'}
      </span>
    );
  };

  const getFolderBadge = (status: string) => {
    if (!status || status === '-') return <span className="text-[#334155] font-semibold text-xs">-</span>;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Filters Bar - Slate #334155 */}
      <div className="p-4 rounded-2xl bg-[#334155] border border-[#CBD5E1]/30 shadow-md space-y-3 text-white">
        {/* Filters Top Header with Reset and Mobile Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#38bdf8]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Filter Records
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#2563EB] text-white border border-blue-400">
                {activeFilterCount} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-semibold border border-[#CBD5E1]/30"
            >
              <span>{showFiltersMobile ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-rose-400/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid: Inputs & Dropdowns #0F172A with text-white */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 ${showFiltersMobile ? 'block' : 'hidden sm:grid'}`}>
          {/* Status filter */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Unit Status
            </label>
            <select
              value={filters.unitsStatus}
              onChange={(e) => onFilterChange({ unitsStatus: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="" className="bg-[#0F172A] text-white">All Statuses</option>
              {summary?.distinctValues.unitsStatuses.map((s) => (
                <option key={s} value={s} className="bg-[#0F172A] text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* In charge filter */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              In Charge
            </label>
            <select
              value={filters.incharge}
              onChange={(e) => onFilterChange({ incharge: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="" className="bg-[#0F172A] text-white">All Personnel</option>
              {summary?.distinctValues.incharge.map((inch) => (
                <option key={inch} value={inch} className="bg-[#0F172A] text-white">
                  {inch}
                </option>
              ))}
            </select>
          </div>

          {/* Project filter */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Project ({summary?.distinctValues.projects.length || 0})
            </label>
            <select
              value={filters.project}
              onChange={(e) => onFilterChange({ project: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Projects</option>
              {summary?.distinctValues.projects.map((proj) => (
                <option key={proj} value={proj} className="bg-[#0F172A] text-white">
                  {proj}
                </option>
              ))}
            </select>
          </div>

          {/* Area SPE filter */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Area / SPE
            </label>
            <select
              value={filters.area}
              onChange={(e) => onFilterChange({ area: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="" className="bg-[#0F172A] text-white">All Areas</option>
              {summary?.distinctValues.areas.map((a) => (
                <option key={a} value={a} className="bg-[#0F172A] text-white">
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Folder Status */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Folder Status
            </label>
            <select
              value={filters.folderStatus}
              onChange={(e) => onFilterChange({ folderStatus: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB] truncate"
            >
              <option value="" className="bg-[#0F172A] text-white">All Folders</option>
              {summary?.distinctValues.folderStatuses.map((f) => (
                <option key={f} value={f} className="bg-[#0F172A] text-white">
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Move-In */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Priority Move-In
            </label>
            <select
              value={filters.priorityMoveIn}
              onChange={(e) => onFilterChange({ priorityMoveIn: e.target.value })}
              className="w-full py-1.5 px-2 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="" className="bg-[#0F172A] text-white">All Priorities</option>
              <option value="PRIORITY" className="bg-[#0F172A] text-white">Priority Only 🔥</option>
              <option value="NON_PRIORITY" className="bg-[#0F172A] text-white">Standard (Non-Priority)</option>
            </select>
          </div>
        </div>

        {/* Block, Lot, Export CSV button, and Stage dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#475569] text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white font-bold">Block:</span>
              <input
                type="text"
                value={filters.block}
                onChange={(e) => onFilterChange({ block: e.target.value })}
                placeholder="e.g. 1"
                className="w-20 px-2.5 py-1 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-mono font-bold text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white font-bold">Lot:</span>
              <input
                type="text"
                value={filters.lot}
                onChange={(e) => onFilterChange({ lot: e.target.value })}
                placeholder="e.g. 10"
                className="w-20 px-2.5 py-1 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-mono font-bold text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Export CSV - Primary Button #2563EB */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              title="Export only currently filtered and searched records"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {summary?.distinctValues.stages && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white font-bold">Stage:</span>
                <select
                  value={filters.stage}
                  onChange={(e) => onFilterChange({ stage: e.target.value })}
                  className="py-1 px-2.5 bg-[#0F172A] border border-[#CBD5E1]/40 rounded-lg text-xs font-bold text-white"
                >
                  <option value="" className="bg-[#0F172A] text-white">All Stages</option>
                  {summary.distinctValues.stages.map((stg) => (
                    <option key={stg} value={stg} className="bg-[#0F172A] text-white">
                      {stg}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {(filters.search || filters.startDate || filters.pwgUpdates) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#475569] text-[11px]">
            <span className="text-[#CBD5E1] font-medium">Applied Filters:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F172A] text-white border border-[#CBD5E1]/40 font-medium">
                <span>Keywords: "{filters.search}"</span>
                <button
                  onClick={() => onFilterChange({ search: '' })}
                  className="hover:text-rose-400 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {filters.pwgUpdates && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F172A] text-white border border-[#CBD5E1]/40 font-medium">
                <span>PWG Update: "{filters.pwgUpdates}"</span>
                <button
                  onClick={() => onFilterChange({ pwgUpdates: '' })}
                  className="hover:text-rose-400 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {filters.startDate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F172A] text-white border border-[#CBD5E1]/40 font-medium">
                <span>Timeline: {filters.datePreset === '120d' ? 'Last 120 Days' : `${filters.startDate} to ${filters.endDate}`}</span>
                <button
                  onClick={() => onFilterChange({ startDate: '', endDate: '', datePreset: 'all' })}
                  className="hover:text-rose-400 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {exportError && (
          <p className="text-[11px] text-rose-300 font-medium pt-1">
            {exportError}
          </p>
        )}
      </div>

      {/* Directory Table Card - Container #FFFFFF, borders #CBD5E1 */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm overflow-hidden">
        {/* Table Header Bar with counts and page size */}
        <div className="p-3.5 px-4 bg-[#F8FAFC] border-b border-[#CBD5E1] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E293B]">
              Matching Records:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2563EB] font-mono text-xs font-bold border border-blue-300">
              {pagination?.totalRecords.toLocaleString() ?? '...'}
            </span>
          </div>

          {/* Rows per page selector: #0F172A background, #FFFFFF text */}
          <div className="flex items-center gap-2 text-xs text-[#334155] font-semibold">
            <span>Rows per page:</span>
            <select
              value={pagination?.pageSize || 25}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2.5 bg-[#0F172A] text-white border border-[#CBD5E1]/40 rounded-lg text-xs font-bold cursor-pointer"
            >
              <option value="10" className="bg-[#0F172A] text-white">10</option>
              <option value="25" className="bg-[#0F172A] text-white">25</option>
              <option value="50" className="bg-[#0F172A] text-white">50</option>
              <option value="100" className="bg-[#0F172A] text-white">100</option>
            </select>
          </div>
        </div>

        {/* Loading Skeleton Cards / Table State */}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-[#CBD5E1]"
              >
                <div className="space-y-2 w-1/4">
                  <div className="h-3.5 bg-slate-200 rounded w-24"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-16"></div>
                </div>
                <div className="space-y-2 w-1/4">
                  <div className="h-3.5 bg-slate-200 rounded w-36"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-20"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                <div className="h-6 bg-slate-200 rounded-lg w-24"></div>
                <div className="h-7 bg-slate-200 rounded-lg w-16"></div>
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#334155]">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1E293B]">No matching units found</h4>
            <p className="text-xs text-[#334155] font-semibold max-w-sm mx-auto">
              Try adjusting or clearing your filters to see more results from the Google Sheets database.
            </p>
            <button
              onClick={onResetFilters}
              className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              {/* Table header background #1E293B, text #FFFFFF */}
              <thead className="bg-[#1E293B] text-white border-b-2 border-[#CBD5E1] uppercase font-extrabold text-[11px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4 text-white">Unit Identification</th>
                  <th className="py-3 px-4 text-white">Project & Area</th>
                  <th className="py-3 px-4 text-white">Status</th>
                  <th className="py-3 px-4 text-white">Folder & Priority</th>
                  <th className="py-3 px-4 text-white">In Charge</th>
                  <th className="py-3 px-4 text-white">Stages / Progress</th>
                  <th className="py-3 px-4 text-white">Energized Date</th>
                  <th className="py-3 px-4 text-right text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1] text-[#1E293B]">
                {records.map((r) => {
                  const isPriority = r.priorityMoveIn && r.priorityMoveIn.toUpperCase().includes('PRIORITY');
                  const pct = r.percentage || '0%';
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      {/* Unit ID - main text #1E293B, secondary #334155 */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-extrabold text-[#1E293B] flex items-center gap-1.5 text-xs">
                          <span>Blk {r.block}</span>
                          <span className="text-[#334155] font-semibold">•</span>
                          <span>Lot {r.lot}</span>
                        </div>
                        <div className="text-[11px] text-[#334155] font-mono font-semibold">
                          ID: #{r.id} ({r.projectCode})
                        </div>
                      </td>

                      {/* Project & Area */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-extrabold text-[#1E293B] truncate text-xs" title={r.project}>
                          {r.project}
                        </div>
                        <div className="text-[11px] text-[#334155] font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span className="truncate">{r.areaSpe || 'Area N/A'}</span>
                        </div>
                      </td>

                      {/* Status - Energized Green, Ongoing Blue */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(r.unitsStatus)}
                      </td>

                      {/* Folder & Priority - Folder Blue, Priority Red */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {getFolderBadge(r.folderStatus)}
                          {isPriority && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              <Flame className="w-2.5 h-2.5 fill-red-600 text-red-600" />
                              PRIORITY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* In Charge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-extrabold text-[10px] text-blue-900 border border-blue-200">
                            {r.incharge?.[0] || '-'}
                          </span>
                          <span className="font-bold text-[#1E293B]">
                            {r.incharge || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Stages / Progress - Progress bars green requirement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-[#1E293B]">
                          {r.stages || 'Stage -'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: pct.includes('%') ? pct : `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#334155] font-semibold">{pct}</span>
                        </div>
                      </td>

                      {/* Energized Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-bold text-[#1E293B]">
                        {r.energizedDate || '-'}
                      </td>

                      {/* Action - Details button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectRecord(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#2563EB] hover:text-white text-[#1E293B] text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs border border-[#CBD5E1]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-3.5 px-4 bg-[#F8FAFC] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[#334155] font-semibold">
              Showing Page <strong className="text-[#1E293B] font-extrabold">{pagination.page}</strong> of{' '}
              <strong className="text-[#1E293B] font-extrabold">{pagination.totalPages.toLocaleString()}</strong> ({pagination.totalRecords.toLocaleString()} items)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#1E293B] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNext || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#1E293B] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
