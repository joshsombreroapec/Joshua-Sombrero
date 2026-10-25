import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Menu,
  RotateCw,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { initAuth } from './lib/auth';
import {
  fetchSummary,
  fetchAnalytics,
  fetchRecords,
  fetchConnectionStatus,
  refreshCache,
} from './lib/api';
import {
  SheetRecord,
  SummaryData,
  AnalyticsData,
  PaginationMeta,
  FilterState,
  ConnectionStatus,
} from './lib/types';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';

const ManagementReportView = React.lazy(() =>
  import('./components/ManagementReportView').then((m) => ({ default: m.ManagementReportView }))
);
const DirectoryView = React.lazy(() =>
  import('./components/DirectoryView').then((m) => ({ default: m.DirectoryView }))
);
const ProjectsView = React.lazy(() =>
  import('./components/ProjectsView').then((m) => ({ default: m.ProjectsView }))
);
const ConnectionView = React.lazy(() =>
  import('./components/ConnectionView').then((m) => ({ default: m.ConnectionView }))
);
const RecordDetailModal = React.lazy(() =>
  import('./components/RecordDetailModal').then((m) => ({ default: m.RecordDetailModal }))
);

const initialFilters: FilterState = {
  search: '',
  unitsStatus: '',
  folderStatus: '',
  incharge: '',
  area: '',
  project: '',
  block: '',
  lot: '',
  priorityMoveIn: '',
  stage: '',
  datePreset: 'all',
  startDate: '',
  endDate: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedRecord, setSelectedRecord] = useState<SheetRecord | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  // Status flags
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures in background interval
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;
  const recordsRef = useRef(records);
  recordsRef.current = records;

  // Init Auth on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch summary and connection status
  const loadSummaryData = useCallback(async (isInitial = false) => {
    if (isInitial && !summaryRef.current) {
      setIsLoadingSummary(true);
    }
    try {
      const [sumRes, connRes] = await Promise.all([
        fetchSummary(),
        fetchConnectionStatus(),
      ]);
      setSummary(sumRes.summary);
      setConnectionStatus(connRes);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load summary from Google Sheets:', err);
      // If a fetch fails, keep showing the last successful data and log the error - don't blank the page
      if (isInitial && !summaryRef.current) {
        setError(err.message || 'Error connecting to Individual Energization Database');
      }
    } finally {
      if (isInitial) {
        setIsLoadingSummary(false);
      }
    }
  }, []);

  // Fetch analytics calculated dynamically based on active filters
  const loadAnalyticsData = useCallback(async (isInitial = false) => {
    if (isInitial && !analyticsRef.current) {
      setIsLoadingAnalytics(true);
    }
    try {
      const data = await fetchAnalytics(filtersRef.current);
      setAnalytics(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      if (isInitial && !analyticsRef.current) {
        setError(err.message || 'Error loading dashboard analytics');
      }
    } finally {
      if (isInitial) {
        setIsLoadingAnalytics(false);
      }
    }
  }, []);

  // Fetch paginated filtered records
  const loadRecords = useCallback(async (currentPage = 1, currentSize = 25, isInitial = false) => {
    if (isInitial && recordsRef.current.length === 0) {
      setIsLoadingRecords(true);
    }
    try {
      const res = await fetchRecords(filtersRef.current, currentPage, currentSize);
      setRecords(res.records);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to query records from Google Sheets:', err);
      // If a fetch fails, keep showing the last successful data and log the error - don't blank the page
      if (recordsRef.current.length === 0) {
        setError(err.message || 'Error querying records from spreadsheet');
      }
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadSummaryData(true);
    loadAnalyticsData(true);
    loadRecords(1, 25, true);
  }, [loadSummaryData, loadAnalyticsData, loadRecords]);

  // Synchronized update: Reload both analytics and records when filters change
  useEffect(() => {
    loadAnalyticsData(false);
    loadRecords(1, paginationRef.current?.pageSize || 25, false);
  }, [filters, loadAnalyticsData, loadRecords]);

  // Re-fetch every 1 minute in the background to stay in sync
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Background Sync] 1-minute auto-refresh from Google Sheets...');
      loadSummaryData(false);
      loadAnalyticsData(false);
      loadRecords(paginationRef.current?.page || 1, paginationRef.current?.pageSize || 25, false);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [loadSummaryData, loadAnalyticsData, loadRecords]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
      await Promise.all([
        loadSummaryData(false),
        loadAnalyticsData(false),
        loadRecords(pagination?.page || 1, pagination?.pageSize || 25, false),
      ]);
      setError(null);
    } catch (err: any) {
      console.error('Manual refresh failed:', err);
      setError(err.message || 'Failed to refresh cache from Google Sheets');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handlePageChange = (page: number) => {
    loadRecords(page, pagination?.pageSize || 25, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (pageSize: number) => {
    loadRecords(1, pageSize, false);
  };

  const handleSelectProject = (projectName: string) => {
    setFilters((prev) => ({ ...prev, project: projectName }));
    setActiveTab('directory');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row antialiased selection:bg-[#2563eb] selection:text-white">
      {/* Sidebar Navigation with expand/collapse */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        onAuthChange={setUser}
        connectionStatus={connectionStatus}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area - Slate/Grayish Blue background #E2E8F0 */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#E2E8F0] min-h-screen">
        {/* Top Header Bar - Slate #1E293B with Logo Top-Left */}
        <header className="sticky top-0 z-30 bg-[#1E293B] text-white border-b border-[#CBD5E1]/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
              title="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Expand / Collapse button on top header */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#38bdf8]" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Logo top-left in the header */}
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/assets/aistudio/image_9ffff062.png"
                alt="Power-Water Group"
                className="h-9 w-9 rounded-xl object-contain bg-[#0F172A] border border-[#CBD5E1]/30 shrink-0 shadow-xs"
              />
              <div className="truncate">
                <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest block leading-tight">
                  Power-Water Group
                </span>
                <h1 className="text-sm sm:text-base font-bold text-white capitalize truncate leading-tight">
                  {activeTab === 'directory'
                    ? 'Units Directory'
                    : activeTab === 'projects'
                    ? 'Project Developments'
                    : activeTab === 'settings'
                    ? 'Sync & Connection'
                    : 'Individual Energization Database'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {connectionStatus && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F172A] border border-[#CBD5E1]/30 text-white text-xs font-mono font-medium">
                {/* Live dot in Royal Blue #2563eb */}
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shadow-[0_0_8px_#38bdf8] animate-pulse"></span>
                <span>{connectionStatus.totalRecords.toLocaleString()} units</span>
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Manual sync with Google Sheets"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </header>

        {/* Error Alert Banner (does not blank page; keeps existing data) */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sync Notice (Showing Last Known Data)</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              analytics={analytics}
              filters={filters}
              isLoading={isLoadingAnalytics}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onNavigateToDirectory={() => setActiveTab('directory')}
              onSelectRecord={setSelectedRecord}
            />
          )}

          <React.Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
                <RotateCw className="w-7 h-7 text-[#2563eb] animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wider">Loading view...</span>
              </div>
            }
          >
            {activeTab === 'reports' && (
              <ManagementReportView
                summary={summary}
                analytics={analytics}
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                onNavigateToDirectory={(filterUpdates) => {
                  if (filterUpdates) handleFilterChange(filterUpdates);
                  setActiveTab('directory');
                }}
                onSelectRecord={setSelectedRecord}
              />
            )}

            {activeTab === 'directory' && (
              <DirectoryView
                records={records}
                pagination={pagination}
                filters={filters}
                summary={summary}
                isLoading={isLoadingRecords}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSelectRecord={setSelectedRecord}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsView
                summary={summary}
                onSelectProject={handleSelectProject}
              />
            )}

            {activeTab === 'settings' && (
              <ConnectionView
                status={connectionStatus}
                user={user}
                onAuthChange={setUser}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}

            {/* Record Details Slide-over Drawer / Modal */}
            {selectedRecord && (
              <RecordDetailModal
                record={selectedRecord}
                onClose={() => setSelectedRecord(null)}
              />
            )}
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}
