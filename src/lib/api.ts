import { getAccessToken } from './auth';
import {
  SheetRecord,
  SummaryData,
  PaginationMeta,
  FilterState,
  ConnectionStatus,
  AnalyticsData,
  DrilldownTarget,
  DrilldownData,
} from './types';

export async function fetchSummary(): Promise<{ summary: SummaryData; status: { lastUpdated: number; totalRecords: number } }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/sheets/summary', { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch summary: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAnalytics(filters: FilterState): Promise<AnalyticsData> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.unitsStatus) params.set('unitsStatus', filters.unitsStatus);
  if (filters.folderStatus) params.set('folderStatus', filters.folderStatus);
  if (filters.incharge) params.set('incharge', filters.incharge);
  if (filters.area) params.set('area', filters.area);
  if (filters.project) params.set('project', filters.project);
  if (filters.block) params.set('block', filters.block);
  if (filters.lot) params.set('lot', filters.lot);
  if (filters.priorityMoveIn) params.set('priorityMoveIn', filters.priorityMoveIn);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.pwgUpdates) params.set('pwgUpdates', filters.pwgUpdates);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const res = await fetch(`/api/sheets/analytics?${params.toString()}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch analytics: ${res.statusText}`);
  }
  const data = await res.json();
  return data.analytics;
}

export async function fetchDrilldown(
  target: DrilldownTarget,
  filters: FilterState
): Promise<DrilldownData> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams();
  // Base filters
  if (filters.search) params.set('search', filters.search);
  if (filters.unitsStatus) params.set('unitsStatus', filters.unitsStatus);
  if (filters.folderStatus) params.set('folderStatus', filters.folderStatus);
  if (filters.incharge) params.set('incharge', filters.incharge);
  if (filters.area) params.set('area', filters.area);
  if (filters.project) params.set('project', filters.project);
  if (filters.block) params.set('block', filters.block);
  if (filters.lot) params.set('lot', filters.lot);
  if (filters.priorityMoveIn) params.set('priorityMoveIn', filters.priorityMoveIn);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.pwgUpdates) params.set('pwgUpdates', filters.pwgUpdates);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  // Drilldown dimensions
  params.set('category', target.category);
  params.set('drillLabel', target.label);
  params.set('value', target.value);

  if (target.category === 'kpiRemarks') {
    params.set('kpiRemarks', target.value);
  } else if (target.category === 'pwgUpdates') {
    params.set('pwgUpdates', target.value);
  } else if (target.category === 'kpiCard' || target.category === 'verticalComparison') {
    params.set('drillMetric', target.value);
  } else if (target.category === 'monthlyTrend') {
    if (target.month) params.set('month', target.month);
    if (target.metric) params.set('metric', target.metric);
  } else if (target.category === 'project') {
    params.set('project', target.value);
  } else if (target.category === 'facStatus') {
    params.set('facStatus', target.value);
  } else if (target.category === 'cooStatus') {
    params.set('cooStatus', target.value);
  } else if (target.category === 'sepStatus') {
    params.set('sepStatus', target.value);
  } else if (target.category === 'inchargeStatus') {
    if (target.incharge) params.set('incharge', target.incharge);
    if (target.unitsStatus) params.set('unitsStatus', target.unitsStatus);
    if (target.folderStatus) params.set('folderStatus', target.folderStatus);
    if (target.metric) params.set('drillMetric', target.metric);
  }

  const res = await fetch(`/api/sheets/drilldown?${params.toString()}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch drilldown data: ${res.statusText}`);
  }
  const data = await res.json();
  return data.drilldown;
}

export async function fetchRecords(
  filters: FilterState,
  page = 1,
  pageSize = 25
): Promise<{ records: SheetRecord[]; pagination: PaginationMeta }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  if (filters.search) params.set('search', filters.search);
  if (filters.unitsStatus) params.set('unitsStatus', filters.unitsStatus);
  if (filters.folderStatus) params.set('folderStatus', filters.folderStatus);
  if (filters.incharge) params.set('incharge', filters.incharge);
  if (filters.area) params.set('area', filters.area);
  if (filters.project) params.set('project', filters.project);
  if (filters.block) params.set('block', filters.block);
  if (filters.lot) params.set('lot', filters.lot);
  if (filters.priorityMoveIn) params.set('priorityMoveIn', filters.priorityMoveIn);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const res = await fetch(`/api/sheets/records?${params.toString()}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch records: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRecordById(id: number): Promise<SheetRecord> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/sheets/record/${id}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch record #${id}`);
  }
  const data = await res.json();
  return data.record;
}

export async function refreshCache(): Promise<{ totalRecords: number; message: string }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/sheets/refresh', {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh sheet data');
  }
  return res.json();
}

export function getExportCSVUrl(
  filters: FilterState,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.unitsStatus) params.set('unitsStatus', filters.unitsStatus);
  if (filters.folderStatus) params.set('folderStatus', filters.folderStatus);
  if (filters.incharge) params.set('incharge', filters.incharge);
  if (filters.area) params.set('area', filters.area);
  if (filters.project) params.set('project', filters.project);
  if (filters.block) params.set('block', filters.block);
  if (filters.lot) params.set('lot', filters.lot);
  if (filters.priorityMoveIn) params.set('priorityMoveIn', filters.priorityMoveIn);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.pwgUpdates) params.set('pwgUpdates', filters.pwgUpdates);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }

  return `/api/sheets/export-csv?${params.toString()}`;
}

export async function exportFilteredCSV(
  filters: FilterState,
  extraParams?: Record<string, string>,
  fileNamePrefix = 'energization_units'
): Promise<void> {
  const url = getExportCSVUrl(filters, extraParams);
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download exported CSV');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${fileNamePrefix}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const res = await fetch('/api/sheets/status');
  if (!res.ok) {
    throw new Error(`Failed to check connection: ${res.statusText}`);
  }
  return res.json();
}

