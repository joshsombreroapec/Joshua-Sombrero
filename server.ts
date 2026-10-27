import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPREADSHEET_ID = '1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM';
const SHEET_NAME = 'DATA';

function getServerConfig() {
  const args = process.argv.slice(2);
  let port = 3000;
  let host = '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p)) port = p;
      i++;
    } else if (args[i].startsWith('--port=')) {
      const p = parseInt(args[i].split('=')[1], 10);
      if (!isNaN(p)) port = p;
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[i + 1];
      i++;
    } else if (args[i].startsWith('--host=')) {
      host = args[i].split('=')[1];
    }
  }

  // In AI Studio, the dev server must run on port 3000.
  // process.env.PORT in Cloud Run container is 8080 (proxy), so avoid 8080.
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(p)) port = p;
  }

  return { port, host };
}

const PORT = getServerConfig().port;

export interface SheetRecord {
  id: number;
  projectCode: string;
  developer: string;
  project: string;
  block: string;
  lot: string;
  unitsStatus: string;
  folderStatus: string;
  takeoutDate: string;
  energizedDate: string;
  kpiRemarks: string;
  areaSpe: string;
  facBatch: string;
  facStatus: string;
  facAdjustedTarget: string;
  cooStatus: string;
  cooAdjustedTarget: string;
  sepStatus: string;
  sepAdjustedTarget: string;
  pwgCfeiStatus: string;
  pwgJoAwardStatus: string;
  pwgUpdates: string;
  pwgRemarks: string;
  percentage: string;
  stages: string;
  finalETarget: string;
  mmsApplicationDate: string;
  priorityMoveIn: string;
  incharge: string;
  jo: string;
  raw: Record<string, string>;
}

interface CacheState {
  records: SheetRecord[];
  lastFetched: number;
  isFetching: boolean;
  error: string | null;
  summary: any | null;
}

const cache: CacheState = {
  records: [],
  lastFetched: 0,
  isFetching: false,
  error: null,
  summary: null,
};

const CACHE_TTL_MS = 60 * 1000; // 1 minute auto-sync TTL

function fetchUrlWithRedirects(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleRequest = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects while accessing Google Sheets'));
      }

      const req = https.get(currentUrl, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) {
            const parsed = new URL(currentUrl);
            nextUrl = `${parsed.protocol}//${parsed.host}${nextUrl}`;
          }
          return handleRequest(nextUrl, redirectCount + 1);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Google Sheets responded with HTTP status ${res.statusCode}`));
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(body);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Google Sheets request timed out'));
      });
    };

    handleRequest(url);
  });
}

function computeSummary(records: SheetRecord[]) {
  const statusCounts: Record<string, number> = {};
  const folderStatusCounts: Record<string, number> = {};
  const areaCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  const inchargeCounts: Record<string, number> = {};
  const projectCounts: Record<string, number> = {};

  const projectsSet = new Set<string>();
  const inchargeSet = new Set<string>();
  const areaSet = new Set<string>();
  const folderStatusSet = new Set<string>();
  const unitsStatusSet = new Set<string>();
  const stagesSet = new Set<string>();
  const pwgUpdatesSet = new Set<string>();

  let energizedCount = 0;
  let priorityMoveInCount = 0;

  for (const r of records) {
    // Counts
    const uStatus = r.unitsStatus || 'Unknown';
    statusCounts[uStatus] = (statusCounts[uStatus] || 0) + 1;
    unitsStatusSet.add(uStatus);

    if (uStatus.toUpperCase().includes('ENERGIZED')) {
      energizedCount++;
    }

    if (r.priorityMoveIn && r.priorityMoveIn.toUpperCase().includes('PRIORITY')) {
      priorityMoveInCount++;
    }

    const fStatus = r.folderStatus || 'Unassigned';
    folderStatusCounts[fStatus] = (folderStatusCounts[fStatus] || 0) + 1;
    folderStatusSet.add(fStatus);

    const area = r.areaSpe || 'Unknown';
    areaCounts[area] = (areaCounts[area] || 0) + 1;
    areaSet.add(area);

    const stage = r.stages || 'Unspecified';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    stagesSet.add(stage);

    const pwg = (r.pwgUpdates || '').trim();
    if (pwg) {
      pwgUpdatesSet.add(pwg);
    }

    const inch = r.incharge || 'Unassigned';
    inchargeCounts[inch] = (inchargeCounts[inch] || 0) + 1;
    inchargeSet.add(inch);

    const proj = r.project || 'Unknown';
    projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    projectsSet.add(proj);
  }

  const total = records.length;
  const energizationRate = total > 0 ? Number(((energizedCount / total) * 100).toFixed(2)) : 0;

  return {
    totalRecords: total,
    energizedCount,
    energizationRate,
    priorityMoveInCount,
    statusCounts,
    folderStatusCounts,
    areaCounts,
    stageCounts,
    inchargeCounts,
    projectCounts,
    distinctValues: {
      projects: Array.from(projectsSet).filter(Boolean).sort(),
      incharge: Array.from(inchargeSet).filter(Boolean).sort(),
      areas: Array.from(areaSet).filter(Boolean).sort(),
      folderStatuses: Array.from(folderStatusSet).filter(Boolean).sort(),
      unitsStatuses: Array.from(unitsStatusSet).filter(Boolean).sort(),
      stages: Array.from(stagesSet).filter(Boolean).sort(),
      pwgUpdates: Array.from(pwgUpdatesSet).filter(Boolean).sort(),
    },
    lastUpdated: Date.now(),
  };
}

async function fetchFromGoogleSheets(authToken?: string): Promise<SheetRecord[]> {
  let csvData = '';

  // 1. If auth token provided, attempt official Google Sheets API v4
  if (authToken) {
    try {
      const range = encodeURIComponent(`${SHEET_NAME}!A1:AC`);
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
      const jsonStr = await fetchUrlWithRedirects(apiUrl, {
        Authorization: `Bearer ${authToken}`,
      });
      const parsed = JSON.parse(jsonStr);
      if (parsed.values && parsed.values.length > 1) {
        const headers: string[] = parsed.values[0];
        const rows: string[][] = parsed.values.slice(1);
        const records: SheetRecord[] = rows.map((row, idx) => {
          const rawObj: Record<string, string> = {};
          headers.forEach((h, hIdx) => {
            rawObj[h] = row[hIdx] ? String(row[hIdx]).trim() : '';
          });
          return mapRawToRecord(rawObj, idx + 1);
        });
        return records;
      }
    } catch (apiErr: any) {
      console.warn('Direct Google Sheets v4 API call failed, falling back to public export:', apiErr.message);
    }
  }

  // 2. Fallback to Google Sheets export stream
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
  csvData = await fetchUrlWithRedirects(exportUrl, {
    'User-Agent': 'Mozilla/5.0 GoogleSheetsViewer/1.0',
  });

  const parsedRows: Record<string, string>[] = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  return parsedRows.map((row, idx) => mapRawToRecord(row, idx + 1));
}

function mapRawToRecord(row: Record<string, string>, id: number): SheetRecord {
  return {
    id,
    projectCode: row['ProjectCode'] || '',
    developer: row['Developer'] || '',
    project: row['Project'] || '',
    block: row['Block'] || '',
    lot: row['Lot'] || '',
    unitsStatus: row['Units Status'] || '',
    folderStatus: row['Folder Status'] || '',
    takeoutDate: row['TAKEOUT DATE'] || '',
    energizedDate: row['ENERGIZED DATE'] || '',
    kpiRemarks: row['KPI Remarks'] || '',
    areaSpe: row['AreaSPE'] || '',
    facBatch: row['FAC Batch'] || '',
    facStatus: row['FAC Status'] || '',
    facAdjustedTarget: row['FAC Adjusted Target'] || '',
    cooStatus: row['COO Status'] || '',
    cooAdjustedTarget: row['COO Adjusted Target'] || '',
    sepStatus: row['SEP Status'] || '',
    sepAdjustedTarget: row['SEP Adjusted Target'] || '',
    pwgCfeiStatus: row['PWG CFEI Status'] || '',
    pwgJoAwardStatus: row['PWG JO Award Status'] || '',
    pwgUpdates: row['PWG Updates'] || '',
    pwgRemarks: row['PWG Remarks'] || '',
    percentage: row['PERCENTAGE'] || '',
    stages: row['STAGES'] || '',
    finalETarget: row['FINAL E-TARGET'] || '',
    mmsApplicationDate: row['MMS Application Date'] || '',
    priorityMoveIn: row['PriorityMoveIn'] || '',
    incharge: row['Incharge'] || '',
    jo: row['JO'] || '',
    raw: row,
  };
}

async function ensureCache(authToken?: string, force = false): Promise<SheetRecord[]> {
  const now = Date.now();
  if (!force && cache.records.length > 0 && now - cache.lastFetched < CACHE_TTL_MS) {
    return cache.records;
  }

  if (cache.isFetching) {
    // Wait until in-flight request finishes
    while (cache.isFetching) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return cache.records;
  }

  cache.isFetching = true;
  try {
    const records = await fetchFromGoogleSheets(authToken);
    cache.records = records;
    cache.lastFetched = Date.now();
    cache.error = null;
    cache.summary = computeSummary(records);
    return records;
  } catch (err: any) {
    cache.error = err.message || 'Failed to fetch from Google Sheets';
    console.error('Error fetching Google Sheets data:', cache.error);
    if (cache.records.length > 0) {
      // Fallback to existing stale records if available
      return cache.records;
    }
    throw err;
  } finally {
    cache.isFetching = false;
  }
}

export const app = express();
app.use(express.json());

// Normalization middleware in case Vercel rewrites strip /api prefix
app.use((req, res, next) => {
  if (req.url.startsWith('/sheets')) {
    req.url = '/api' + req.url;
  }
  next();
});

  // Background warm-up
  ensureCache().catch((err) => {
    console.warn('Initial cache warm-up notice:', err.message);
  });

  // Extract bearer token middleware helper
  const getAuthToken = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return undefined;
  };

  // API Route: Status & Diagnostics
  app.get('/api/sheets/status', async (req: Request, res: Response) => {
    res.json({
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      isLoaded: cache.records.length > 0,
      totalRecords: cache.records.length,
      lastFetched: cache.lastFetched ? new Date(cache.lastFetched).toISOString() : null,
      error: cache.error,
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
    });
  });

  // API Route: Summary & Aggregates
  app.get('/api/sheets/summary', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      await ensureCache(token);
      res.json({
        success: true,
        summary: cache.summary,
        status: {
          lastUpdated: cache.lastFetched,
          totalRecords: cache.records.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to load summary',
        recordsCount: cache.records.length,
      });
    }
  });

  const parseRecordDate = (str: string): number | null => {
    if (!str || str === '-' || str === '#N/A') return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      const t = d.getTime();
      return isNaN(t) ? null : t;
    }
    const d = new Date(str);
    const t = d.getTime();
    return isNaN(t) ? null : t;
  };

  const parseDateObj = (str: string): Date | null => {
    if (!str || str === '-' || str === '#N/A') return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const isEnergizedWithin21Days = (kpiRemarks: string): boolean => {
    const k = (kpiRemarks || '').trim().toUpperCase();
    return k.includes('ENERGIZED') && k.includes('WITHIN 21') && !k.includes('121');
  };

  function filterRecords(records: SheetRecord[], query: any): SheetRecord[] {
    const search = ((query.search as string) || '').toLowerCase().trim();
    const unitsStatus = ((query.unitsStatus as string) || '').trim();
    const folderStatus = ((query.folderStatus as string) || '').trim();
    const incharge = ((query.incharge as string) || '').trim();
    const area = ((query.area as string) || '').trim();
    const project = ((query.project as string) || '').trim();
    const block = ((query.block as string) || '').trim();
    const lot = ((query.lot as string) || '').trim();
    const stage = ((query.stage as string) || '').trim();
    const priorityMoveIn = ((query.priorityMoveIn as string) || '').trim();
    const pwgUpdates = ((query.pwgUpdates as string) || '').trim();
    const kpiRemarks = ((query.kpiRemarks as string) || '').trim();
    const drillMetric = ((query.drillMetric as string) || '').trim();
    const month = ((query.month as string) || '').trim();
    const facStatus = ((query.facStatus as string) || '').trim();
    const cooStatus = ((query.cooStatus as string) || '').trim();
    const sepStatus = ((query.sepStatus as string) || '').trim();

    let filtered = records;

    if (search) {
      filtered = filtered.filter((r) => {
        return (
          r.project.toLowerCase().includes(search) ||
          r.projectCode.toLowerCase().includes(search) ||
          r.developer.toLowerCase().includes(search) ||
          r.block.toLowerCase().includes(search) ||
          r.lot.toLowerCase().includes(search) ||
          r.incharge.toLowerCase().includes(search) ||
          r.areaSpe.toLowerCase().includes(search) ||
          r.unitsStatus.toLowerCase().includes(search) ||
          r.folderStatus.toLowerCase().includes(search) ||
          r.kpiRemarks.toLowerCase().includes(search) ||
          r.pwgUpdates.toLowerCase().includes(search)
        );
      });
    }

    if (unitsStatus && unitsStatus !== 'ALL') {
      filtered = filtered.filter((r) => r.unitsStatus.toLowerCase() === unitsStatus.toLowerCase());
    }

    if (folderStatus && folderStatus !== 'ALL') {
      filtered = filtered.filter((r) => r.folderStatus.toLowerCase() === folderStatus.toLowerCase());
    }

    if (incharge && incharge !== 'ALL') {
      filtered = filtered.filter((r) => r.incharge.toLowerCase() === incharge.toLowerCase());
    }

    if (area && area !== 'ALL') {
      filtered = filtered.filter((r) => r.areaSpe.toLowerCase() === area.toLowerCase());
    }

    if (project && project !== 'ALL') {
      filtered = filtered.filter((r) => r.project.toLowerCase() === project.toLowerCase());
    }

    if (stage && stage !== 'ALL') {
      filtered = filtered.filter((r) => r.stages.toLowerCase() === stage.toLowerCase());
    }

    if (pwgUpdates && pwgUpdates !== 'ALL') {
      filtered = filtered.filter((r) => {
        if (pwgUpdates === 'No Update' || pwgUpdates === 'Unassigned') {
          return !r.pwgUpdates || r.pwgUpdates === '-';
        }
        return (r.pwgUpdates || '').toLowerCase() === pwgUpdates.toLowerCase();
      });
    }

    if (kpiRemarks && kpiRemarks !== 'ALL') {
      filtered = filtered.filter((r) => (r.kpiRemarks || '').toLowerCase().includes(kpiRemarks.toLowerCase()));
    }

    if (facStatus && facStatus !== 'ALL') {
      filtered = filtered.filter((r) => (r.facStatus || '').toLowerCase() === facStatus.toLowerCase());
    }

    if (cooStatus && cooStatus !== 'ALL') {
      filtered = filtered.filter((r) => (r.cooStatus || '').toLowerCase() === cooStatus.toLowerCase());
    }

    if (sepStatus && sepStatus !== 'ALL') {
      filtered = filtered.filter((r) => (r.sepStatus || '').toLowerCase() === sepStatus.toLowerCase());
    }

    if (drillMetric) {
      const m = drillMetric.toLowerCase();
      if (m === 'energized') {
        filtered = filtered.filter((r) => (r.unitsStatus || '').toUpperCase().includes('ENERGIZED'));
      } else if (m === 'ongoing') {
        filtered = filtered.filter((r) => (r.unitsStatus || '').toUpperCase().includes('ONGOING'));
      } else if (m === 'nys') {
        filtered = filtered.filter((r) => (r.unitsStatus || '').toUpperCase().includes('NYS'));
      } else if (m === 'takenout') {
        filtered = filtered.filter((r) => (r.folderStatus || '').toUpperCase().includes('TAKEN OUT') || (r.takeoutDate && r.takeoutDate !== '-'));
      } else if (m === 'priority') {
        filtered = filtered.filter((r) => (r.priorityMoveIn || '').toUpperCase().includes('PRIORITY'));
      } else if (m === 'within21days') {
        filtered = filtered.filter((r) => isEnergizedWithin21Days(r.kpiRemarks));
      }
    }

    if (month) {
      const metric = query.metric || 'energized';
      filtered = filtered.filter((r) => {
        if (metric === 'takenOut') {
          const d = parseDateObj(r.takeoutDate);
          return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
        } else if (metric === 'within21Days') {
          const d = parseDateObj(r.energizedDate);
          return (
            d &&
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month &&
            isEnergizedWithin21Days(r.kpiRemarks)
          );
        } else {
          const d = parseDateObj(r.energizedDate);
          return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
        }
      });
    }

    if (block) {
      filtered = filtered.filter((r) => r.block === block);
    }

    if (lot) {
      filtered = filtered.filter((r) => r.lot === lot);
    }

    if (priorityMoveIn && priorityMoveIn !== 'ALL') {
      if (priorityMoveIn.toUpperCase() === 'PRIORITY') {
        filtered = filtered.filter((r) => r.priorityMoveIn.toUpperCase().includes('PRIORITY'));
      } else if (priorityMoveIn.toUpperCase() === 'NON_PRIORITY') {
        filtered = filtered.filter((r) => !r.priorityMoveIn.toUpperCase().includes('PRIORITY'));
      } else {
        filtered = filtered.filter((r) => r.priorityMoveIn.toLowerCase() === priorityMoveIn.toLowerCase());
      }
    }

    const startDateStr = ((query.startDate as string) || '').trim();
    const endDateStr = ((query.endDate as string) || '').trim();
    if (startDateStr || endDateStr) {
      const start = startDateStr ? new Date(startDateStr).getTime() : 0;
      const end = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`).getTime() : Infinity;

      filtered = filtered.filter((r) => {
        const eTime = parseRecordDate(r.energizedDate);
        const tTime = parseRecordDate(r.takeoutDate);
        if (eTime && eTime >= start && eTime <= end) return true;
        if (tTime && tTime >= start && tTime <= end) return true;
        return false;
      });
    }

    return filtered;
  }

  // API Route: Dynamic Analytics & Distribution (respecting active filters & date range)
  app.get('/api/sheets/analytics', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const filtered = filterRecords(records, req.query);

      let energizedCount = 0;
      let ongoingCount = 0;
      let nysCount = 0;
      let takenOutCount = 0;
      let priorityCount = 0;
      let within21DaysCount = 0;

      const monthlyTakenOutMap: Record<string, number> = {};
      const monthlyEnergizedMap: Record<string, number> = {};
      const monthlyWithin21Map: Record<string, number> = {};

      const kpiRemarksMap: Record<string, number> = {};
      const pwgUpdatesMap: Record<string, number> = {};
      const stagesMap: Record<string, number> = {};
      const facStatusMap: Record<string, number> = {};
      const cooStatusMap: Record<string, number> = {};
      const sepStatusMap: Record<string, number> = {};

      const monthKeysSet = new Set<string>();

      for (const r of filtered) {
        const uStatus = (r.unitsStatus || '').toUpperCase();
        if (uStatus.includes('ENERGIZED')) energizedCount++;
        else if (uStatus.includes('ONGOING')) ongoingCount++;
        else if (uStatus.includes('NYS')) nysCount++;

        const isTakenOut = (r.folderStatus || '').toUpperCase().includes('TAKEN OUT') || (r.takeoutDate && r.takeoutDate !== '-');
        if (isTakenOut) takenOutCount++;

        const isPriority = (r.priorityMoveIn || '').toUpperCase().includes('PRIORITY');
        if (isPriority) priorityCount++;

        const kpi = (r.kpiRemarks || '').trim();
        if (isEnergizedWithin21Days(r.kpiRemarks)) within21DaysCount++;

        // Categorical breakdowns
        if (kpi) {
          kpiRemarksMap[kpi] = (kpiRemarksMap[kpi] || 0) + 1;
        }

        const pwg = (r.pwgUpdates || '').trim() || 'No Update';
        pwgUpdatesMap[pwg] = (pwgUpdatesMap[pwg] || 0) + 1;

        const stage = r.stages || 'Unspecified';
        stagesMap[stage] = (stagesMap[stage] || 0) + 1;

        const fac = r.facStatus || 'Unspecified';
        facStatusMap[fac] = (facStatusMap[fac] || 0) + 1;

        const coo = r.cooStatus || 'Unspecified';
        cooStatusMap[coo] = (cooStatusMap[coo] || 0) + 1;

        const sep = r.sepStatus || 'Unspecified';
        sepStatusMap[sep] = (sepStatusMap[sep] || 0) + 1;

        // Monthly trends
        const tDate = parseDateObj(r.takeoutDate);
        if (tDate) {
          const mKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyTakenOutMap[mKey] = (monthlyTakenOutMap[mKey] || 0) + 1;
          monthKeysSet.add(mKey);
        }

        const eDate = parseDateObj(r.energizedDate);
        if (eDate) {
          const mKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyEnergizedMap[mKey] = (monthlyEnergizedMap[mKey] || 0) + 1;
          monthKeysSet.add(mKey);

          if (isEnergizedWithin21Days(r.kpiRemarks)) {
            monthlyWithin21Map[mKey] = (monthlyWithin21Map[mKey] || 0) + 1;
          }
        }
      }

      // Format monthly trend array (last 12 active months, sorted)
      const sortedMonthKeys = Array.from(monthKeysSet).sort();
      const recentMonthKeys = sortedMonthKeys.slice(-12);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrend = recentMonthKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const monthIndex = parseInt(monthStr, 10) - 1;
        const label = `${monthNames[monthIndex]} ${yearStr}`;
        return {
          key,
          label,
          takenOut: monthlyTakenOutMap[key] || 0,
          energized: monthlyEnergizedMap[key] || 0,
          within21Days: monthlyWithin21Map[key] || 0,
        };
      });

      const total = filtered.length || 1;

      const kpiRemarksDistribution = Object.entries(kpiRemarksMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const pwgUpdatesDistribution = Object.entries(pwgUpdatesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const stagesDistribution = Object.entries(stagesMap)
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const facStatusDistribution = Object.entries(facStatusMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
          label: label === '100' ? '100% Completed' : label === '0' ? '0% Not Started' : `${label}%`,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const cooStatusDistribution = Object.entries(cooStatusMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const sepStatusDistribution = Object.entries(sepStatusMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
          label: label === 'YES' ? 'SEP Approved (YES)' : label === 'NO' ? 'No SEP (NO)' : label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const verticalComparison = [
        { key: 'takenOut', label: 'Taken Out', count: takenOutCount },
        { key: 'priority', label: 'Priority', count: priorityCount },
        { key: 'energized', label: 'Energized', count: energizedCount },
        { key: 'within21Days', label: 'Within 21 Days', count: within21DaysCount },
        { key: 'ongoing', label: 'Ongoing Works', count: ongoingCount },
        { key: 'nys', label: 'Pending / NYS', count: nysCount },
      ];

      const recentRecords = filtered.slice(0, 5);

      const projectStatsMap: Record<string, { count: number; energized: number }> = {};
      for (const r of filtered) {
        if (r.project) {
          if (!projectStatsMap[r.project]) {
            projectStatsMap[r.project] = { count: 0, energized: 0 };
          }
          projectStatsMap[r.project].count++;
          if ((r.unitsStatus || '').toUpperCase().includes('ENERGIZED')) {
            projectStatsMap[r.project].energized++;
          }
        }
      }

      const topProjects = Object.entries(projectStatsMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, stat], idx) => ({
          rank: idx + 1,
          name,
          count: stat.count,
          energized: stat.energized,
          percentage: stat.count > 0 ? Number(((stat.energized / stat.count) * 100).toFixed(1)) : 0,
        }));

      // Top 6 Projects with ENERGIZED - 1. WITHIN 21 DAYS
      const within21ProjectsMap: Record<string, { count: number; totalEnergized: number }> = {};
      // Top 6 Critical Ongoing Delay Projects from Takeout Date
      const ongoingDelayProjectsMap: Record<
        string,
        { count: number; totalOngoing: number; totalDelayDays: number; maxDelayDays: number }
      > = {};
      const todayTimestamp = new Date('2026-10-24').getTime();

      for (const r of filtered) {
        if (!r.project) continue;
        const projName = r.project;
        const u = (r.unitsStatus || '').toUpperCase();
        const k = (r.kpiRemarks || '').toUpperCase();

        // 1. Within 21 Days
        if (isEnergizedWithin21Days(r.kpiRemarks)) {
          if (!within21ProjectsMap[projName]) {
            within21ProjectsMap[projName] = { count: 0, totalEnergized: 0 };
          }
          within21ProjectsMap[projName].count++;
        }
        if (u.includes('ENERGIZED')) {
          if (!within21ProjectsMap[projName]) {
            within21ProjectsMap[projName] = { count: 0, totalEnergized: 0 };
          }
          within21ProjectsMap[projName].totalEnergized++;
        }

        // 2. Critical Ongoing Delay from Takeout Date
        if (u.includes('ONGOING')) {
          if (!ongoingDelayProjectsMap[projName]) {
            ongoingDelayProjectsMap[projName] = {
              count: 0,
              totalOngoing: 0,
              totalDelayDays: 0,
              maxDelayDays: 0,
            };
          }
          ongoingDelayProjectsMap[projName].totalOngoing++;

          const tStr = (r.takeoutDate || '').trim();
          if (tStr && tStr !== '-' && tStr !== '#N/A') {
            const tTime = parseRecordDate(tStr);
            if (tTime) {
              const delayDays = Math.max(0, Math.floor((todayTimestamp - tTime) / (1000 * 60 * 60 * 24)));
              ongoingDelayProjectsMap[projName].count++;
              ongoingDelayProjectsMap[projName].totalDelayDays += delayDays;
              if (delayDays > ongoingDelayProjectsMap[projName].maxDelayDays) {
                ongoingDelayProjectsMap[projName].maxDelayDays = delayDays;
              }
            }
          }
        }
      }

      const topWithin21Projects = Object.entries(within21ProjectsMap)
        .filter(([, stat]) => stat.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(([name, stat], idx) => ({
          rank: idx + 1,
          name,
          count: stat.count,
          totalEnergized: stat.totalEnergized,
          percentage:
            stat.totalEnergized > 0
              ? Number(((stat.count / stat.totalEnergized) * 100).toFixed(1))
              : 100,
        }));

      const topCriticalOngoingDelayProjects = Object.entries(ongoingDelayProjectsMap)
        .filter(([, stat]) => stat.count > 0)
        .sort((a, b) => b[1].count - a[1].count || b[1].maxDelayDays - a[1].maxDelayDays)
        .slice(0, 6)
        .map(([name, stat], idx) => ({
          rank: idx + 1,
          name,
          count: stat.count,
          totalOngoing: stat.totalOngoing,
          avgDelayDays: Math.round(stat.totalDelayDays / stat.count),
          maxDelayDays: stat.maxDelayDays,
        }));

      // Compute Incharge Status Breakdown for RENZ, RONALD, MARK across 5 status categories
      const targetPeople = [
        { name: 'RENZ' as const, color: '#2563EB' },
        { name: 'RONALD' as const, color: '#0D9488' },
        { name: 'MARK' as const, color: '#7C3AED' },
      ];

      const statusCategories = [
        'TAKEN OUT',
        'ENERGIZED',
        'ENERGIZED - 1. WITHIN 21 DAYS',
        'ONGOING',
        'NYS',
      ];

      const peopleStatsMap: Record<
        string,
        {
          name: 'RENZ' | 'RONALD' | 'MARK';
          color: string;
          total: number;
          standardCounts: Record<string, number>;
          lifecycleCounts: Record<string, number>;
          unmatchedCount: number;
        }
      > = {
        RENZ: {
          name: 'RENZ',
          color: '#2563EB',
          total: 0,
          standardCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          lifecycleCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          unmatchedCount: 0,
        },
        RONALD: {
          name: 'RONALD',
          color: '#0D9488',
          total: 0,
          standardCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          lifecycleCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          unmatchedCount: 0,
        },
        MARK: {
          name: 'MARK',
          color: '#7C3AED',
          total: 0,
          standardCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          lifecycleCounts: { 'TAKEN OUT': 0, 'ENERGIZED': 0, 'ENERGIZED - 1. WITHIN 21 DAYS': 0, 'ONGOING': 0, 'NYS': 0 },
          unmatchedCount: 0,
        },
      };

      const unmatchedDetails: {
        id: number;
        incharge: string;
        unitsStatus: string;
        folderStatus: string;
        project: string;
      }[] = [];

      for (const r of filtered) {
        const inc = (r.incharge || '').trim().toUpperCase();
        if (inc === 'RENZ' || inc === 'RONALD' || inc === 'MARK') {
          const pStat = peopleStatsMap[inc];
          pStat.total++;

          const u = (r.unitsStatus || '').trim().toUpperCase();
          const f = (r.folderStatus || '').trim().toUpperCase();
          const k = (r.kpiRemarks || '').trim().toUpperCase();
          const t = (r.takeoutDate || '').trim();

          const isTaken = f.includes('TAKEN OUT') || f.includes('TAKEOUT') || (t !== '' && t !== '-' && t !== '#N/A');
          const isWithin21 = isEnergizedWithin21Days(r.kpiRemarks);
          const isEnergized = u.includes('ENERGIZED');
          const isOngoing = u.includes('ONGOING');
          const isNys = u.includes('NYS') || u.includes('NOT YET STARTED');

          // Standard counts (dedicated status metrics, non-overlapping energized)
          if (isTaken) {
            pStat.standardCounts['TAKEN OUT']++;
          }
          if (isWithin21) {
            pStat.standardCounts['ENERGIZED - 1. WITHIN 21 DAYS']++;
          } else if (isEnergized) {
            pStat.standardCounts['ENERGIZED']++;
          } else if (isOngoing) {
            pStat.standardCounts['ONGOING']++;
          } else if (isNys) {
            pStat.standardCounts['NYS']++;
          }

          // Strict Lifecycle milestone partition (every single unit counted exactly once)
          if (isTaken) {
            pStat.lifecycleCounts['TAKEN OUT']++;
          } else if (isWithin21) {
            pStat.lifecycleCounts['ENERGIZED - 1. WITHIN 21 DAYS']++;
          } else if (isEnergized) {
            pStat.lifecycleCounts['ENERGIZED']++;
          } else if (isOngoing) {
            pStat.lifecycleCounts['ONGOING']++;
          } else if (isNys) {
            pStat.lifecycleCounts['NYS']++;
          } else {
            pStat.unmatchedCount++;
            if (unmatchedDetails.length < 50) {
              unmatchedDetails.push({
                id: r.id,
                incharge: r.incharge,
                unitsStatus: r.unitsStatus,
                folderStatus: r.folderStatus,
                project: r.project,
              });
            }
          }
        }
      }

      const inchargeStatusBreakdown = {
        categories: statusCategories,
        people: targetPeople.map((p) => peopleStatsMap[p.name]),
        unmatchedCount: unmatchedDetails.length,
        unmatchedDetails,
        totalAssignedUnits: targetPeople.reduce((acc, p) => acc + peopleStatsMap[p.name].total, 0),
      };

      res.json({
        success: true,
        analytics: {
          totalUnits: filtered.length,
          energizedCount,
          ongoingCount,
          nysCount,
          takenOutCount,
          priorityCount,
          within21DaysCount,
          monthlyTrend,
          kpiRemarksDistribution,
          pwgUpdatesDistribution,
          stagesDistribution,
          verticalComparison,
          facStatusDistribution,
          cooStatusDistribution,
          sepStatusDistribution,
          recentRecords,
          topProjects,
          topWithin21Projects,
          topCriticalOngoingDelayProjects,
          inchargeStatusBreakdown,
          distinctValues: cache.summary?.distinctValues || {
            projects: [],
            incharge: [],
            areas: [],
            folderStatuses: [],
            unitsStatuses: [],
            stages: [],
            pwgUpdates: [],
          },
          lastUpdated: cache.lastFetched,
        },
      });
    } catch (err: any) {
      console.error('Analytics computation error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to compute analytics' });
    }
  });

  const SNAPSHOTS_FILE = path.resolve(__dirname, 'data', 'weekly_snapshots.json');

  function loadWeeklySnapshots(): Record<string, any> {
    try {
      if (fs.existsSync(SNAPSHOTS_FILE)) {
        const raw = fs.readFileSync(SNAPSHOTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed.snapshots || {};
      }
    } catch (e) {
      console.error('Failed to read weekly snapshots:', e);
    }
    return {};
  }

  function saveWeeklySnapshots(snapshots: Record<string, any>) {
    try {
      const dir = path.dirname(SNAPSHOTS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        SNAPSHOTS_FILE,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            timezone: 'Asia/Manila',
            snapshots,
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch (e) {
      console.error('Failed to save weekly snapshots:', e);
    }
  }

  function getWeekRangeMondayToSunday(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr === '#N/A') return null;
    const parts = dateStr.split('/');
    let d: Date;
    if (parts.length === 3) {
      d = new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1])));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return null;

    // Timezone: Asia/Manila (UTC+8)
    const manilaTime = new Date(d.getTime() + 8 * 3600 * 1000);
    const day = manilaTime.getUTCDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = (day === 0 ? -6 : 1) - day;

    const mon = new Date(manilaTime);
    mon.setUTCDate(manilaTime.getUTCDate() + diffToMon);

    const sun = new Date(mon);
    sun.setUTCDate(sun.getUTCDate() + 6);

    const monStr = mon.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label =
      mNames[mon.getUTCMonth()] +
      ' ' +
      mon.getUTCDate() +
      '–' +
      (mon.getUTCMonth() === sun.getUTCMonth()
        ? sun.getUTCDate()
        : mNames[sun.getUTCMonth()] + ' ' + sun.getUTCDate());

    const fullLabel = `${label}, ${mon.getUTCFullYear()}`;

    return {
      monStr,
      sunStr,
      label,
      fullLabel,
      weekKey: `${monStr}_${sunStr}`,
      monTime: mon.getTime(),
      sunTime: sun.getTime(),
    };
  }

  function getRecordUpdatedDate(r: SheetRecord): string {
    return (
      r.raw['Updated Date'] ||
      r.raw['Date Updated'] ||
      r.raw['Update Date'] ||
      r.energizedDate ||
      r.takeoutDate ||
      ''
    );
  }

  function calculateWeeklyMatrix(records: SheetRecord[], query: any) {
    // Dynamic Present Week calculation in Asia/Manila (UTC+8)
    const now = new Date();
    const manilaNow = new Date(now.getTime() + 8 * 3600 * 1000);
    const manilaIsoToday = manilaNow.toISOString().split('T')[0];
    const currentWeekInfo = getWeekRangeMondayToSunday(manilaIsoToday)!;
    const currentWeekKey = currentWeekInfo.weekKey;
    const baselineWeekInfo = getWeekRangeMondayToSunday('2026-07-27')!;
    const baselineWeekKey = baselineWeekInfo.weekKey; // '2026-07-27_2026-08-02'
    const baselineMonTime = baselineWeekInfo.monTime;

    let filtered = filterRecords(records, query);
    const datePreset = ((query.datePreset as string) || 'all').trim();
    const takeoutStatus = ((query.takeoutStatus as string) || '').trim();
    const updatedStartDate = ((query.updatedStartDate as string) || '').trim();
    const updatedEndDate = ((query.updatedEndDate as string) || '').trim();
    const takeoutStartDate = ((query.takeoutStartDate as string) || '').trim();
    const takeoutEndDate = ((query.takeoutEndDate as string) || '').trim();

    if (takeoutStatus === 'with_takeout') {
      filtered = filtered.filter((r) => r.takeoutDate && r.takeoutDate !== '-' && r.takeoutDate !== '#N/A');
    } else if (takeoutStatus === 'without_takeout') {
      filtered = filtered.filter((r) => !r.takeoutDate || r.takeoutDate === '-' || r.takeoutDate === '#N/A');
    }

    if (updatedStartDate || updatedEndDate) {
      const start = updatedStartDate ? new Date(updatedStartDate).getTime() : 0;
      const end = updatedEndDate ? new Date(`${updatedEndDate}T23:59:59.999Z`).getTime() : Infinity;
      filtered = filtered.filter((r) => {
        const uDate = getRecordUpdatedDate(r);
        const t = parseRecordDate(uDate);
        return t ? t >= start && t <= end : false;
      });
    }

    if (takeoutStartDate || takeoutEndDate) {
      const start = takeoutStartDate ? new Date(takeoutStartDate).getTime() : 0;
      const end = takeoutEndDate ? new Date(`${takeoutEndDate}T23:59:59.999Z`).getTime() : Infinity;
      filtered = filtered.filter((r) => {
        const t = parseRecordDate(r.takeoutDate);
        return t ? t >= start && t <= end : false;
      });
    }

    const weekMap = new Map<
      string,
      {
        weekKey: string;
        monStr: string;
        sunStr: string;
        label: string;
        fullLabel: string;
        monTime: number;
        sunTime: number;
        isLive: boolean;
        status: 'LIVE' | 'FINAL';
      }
    >();

    // Pre-populate all weekly columns starting from baseline "Jul 27-Aug 2" to current week
    let currentIter = new Date('2026-07-27T00:00:00Z');
    const endIter = new Date(`${currentWeekInfo.sunStr}T23:59:59Z`);
    while (currentIter.getTime() <= endIter.getTime()) {
      const iterStr = currentIter.toISOString().split('T')[0];
      const wInfo = getWeekRangeMondayToSunday(iterStr);
      if (wInfo) {
        const isLive = wInfo.weekKey === currentWeekKey;
        weekMap.set(wInfo.weekKey, {
          ...wInfo,
          isLive,
          status: isLive ? 'LIVE' : 'FINAL',
        });
      }
      currentIter.setUTCDate(currentIter.getUTCDate() + 7);
    }

    const kpiRemarksSet = new Set<string>();
    const projectsSet = new Set<string>();

    const seenUnitsKpi = new Set<string>();
    const seenUnitsTakeout = new Set<string>();

    let totalTakeouts = 0;
    let recordsUpdatedThisWeek = 0;

    const liveKpiCounts = new Map<string, Map<string, number>>();
    const liveTakeoutCounts = new Map<string, Map<string, number>>();

    filtered.forEach((r) => {
      const unitKey = `${r.projectCode || r.project}__${r.block}__${r.lot}__${r.id}`;
      const kpi = (r.kpiRemarks || '').trim();
      const proj = (r.project || '').trim() || 'Unknown Project';
      projectsSet.add(proj);

      if (kpi && kpi.toLowerCase() !== 'unassigned remarks' && kpi.toLowerCase() !== 'unassigned' && kpi !== '-') {
        kpiRemarksSet.add(kpi);
      }

      const hasValidTakeout = r.takeoutDate && r.takeoutDate !== '-' && r.takeoutDate !== '#N/A';
      if (hasValidTakeout && !seenUnitsTakeout.has(unitKey)) {
        seenUnitsTakeout.add(unitKey);
        totalTakeouts++;

        let tWeek = getWeekRangeMondayToSunday(r.takeoutDate);
        if (!tWeek || tWeek.monTime < baselineMonTime) {
          tWeek = baselineWeekInfo;
        }

        if (tWeek) {
          if (!weekMap.has(tWeek.weekKey)) {
            const isLive = tWeek.weekKey === currentWeekKey;
            weekMap.set(tWeek.weekKey, {
              ...tWeek,
              isLive,
              status: isLive ? 'LIVE' : 'FINAL',
            });
          }

          if (!liveTakeoutCounts.has(proj)) {
            liveTakeoutCounts.set(proj, new Map<string, number>());
          }
          const pMap = liveTakeoutCounts.get(proj)!;
          pMap.set(tWeek.weekKey, (pMap.get(tWeek.weekKey) || 0) + 1);
        }
      }

      const updatedDateStr = getRecordUpdatedDate(r);
      let uWeek = getWeekRangeMondayToSunday(updatedDateStr);
      // On KPI Remarks: Any data not covered before Jul 27-Aug 2 is mapped to first column "Jul 27-Aug 2"
      if (!uWeek || uWeek.monTime < baselineMonTime) {
        uWeek = baselineWeekInfo;
      }

      if (!seenUnitsKpi.has(unitKey)) {
        seenUnitsKpi.add(unitKey);

        if (uWeek.weekKey === currentWeekKey) {
          recordsUpdatedThisWeek++;
        }

        if (!weekMap.has(uWeek.weekKey)) {
          const isLive = uWeek.weekKey === currentWeekKey;
          weekMap.set(uWeek.weekKey, {
            ...uWeek,
            isLive,
            status: isLive ? 'LIVE' : 'FINAL',
          });
        }

        // Remove Unassigned Remarks - only track actual non-empty remarks
        if (kpi && kpi.toLowerCase() !== 'unassigned remarks' && kpi.toLowerCase() !== 'unassigned' && kpi !== '-') {
          kpiRemarksSet.add(kpi);

          if (!liveKpiCounts.has(kpi)) {
            liveKpiCounts.set(kpi, new Map<string, number>());
          }
          const kMap = liveKpiCounts.get(kpi)!;
          kMap.set(uWeek.weekKey, (kMap.get(uWeek.weekKey) || 0) + 1);
        }
      }
    });

    let sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.monTime - b.monTime);

    const currentTimestamp = currentWeekInfo.sunTime;
    if (datePreset === '30d') {
      const cutoff = currentTimestamp - 30 * 86400000;
      sortedWeeks = sortedWeeks.filter((w) => w.sunTime >= cutoff);
    } else if (datePreset === '60d') {
      const cutoff = currentTimestamp - 60 * 86400000;
      sortedWeeks = sortedWeeks.filter((w) => w.sunTime >= cutoff);
    } else if (datePreset === '90d') {
      const cutoff = currentTimestamp - 90 * 86400000;
      sortedWeeks = sortedWeeks.filter((w) => w.sunTime >= cutoff);
    } else if (datePreset === '180d') {
      const cutoff = currentTimestamp - 180 * 86400000;
      sortedWeeks = sortedWeeks.filter((w) => w.sunTime >= cutoff);
    }

    if (!sortedWeeks.some((w) => w.weekKey === currentWeekKey)) {
      sortedWeeks.push({
        ...currentWeekInfo,
        isLive: true,
        status: 'LIVE',
      });
    }

    // Freeze & Finalize Past Ended Weeks / Keep Present Week LIVE
    const snapshots = loadWeeklySnapshots();
    let hasNewSnapshots = false;

    const filterKey = (query.project || query.incharge || query.area || query.unitsStatus || query.folderStatus)
      ? `${query.project || ''}__${query.incharge || ''}__${query.area || ''}__${query.unitsStatus || ''}__${query.folderStatus || ''}`
      : 'global';

    sortedWeeks.forEach((w) => {
      const isPastEndedWeek = !w.isLive && w.weekKey !== currentWeekKey;

      if (isPastEndedWeek) {
        if (!snapshots[w.weekKey]) {
          snapshots[w.weekKey] = {
            weekKey: w.weekKey,
            label: w.label,
            fullLabel: w.fullLabel,
            status: 'FINAL',
            frozenAt: new Date().toISOString(),
            kpiByFilter: {},
            takeoutByFilter: {},
          };
        }
        if (!snapshots[w.weekKey].kpiByFilter) {
          snapshots[w.weekKey].kpiByFilter = {};
        }
        if (!snapshots[w.weekKey].takeoutByFilter) {
          snapshots[w.weekKey].takeoutByFilter = {};
        }

        // Freeze if not already snapshotted for this filter configuration
        if (!snapshots[w.weekKey].kpiByFilter[filterKey]) {
          const weekKpi: Record<string, number> = {};
          liveKpiCounts.forEach((counts, kpi) => {
            const c = counts.get(w.weekKey) || 0;
            if (c > 0) weekKpi[kpi] = c;
          });
          snapshots[w.weekKey].kpiByFilter[filterKey] = weekKpi;
          hasNewSnapshots = true;
        }

        if (!snapshots[w.weekKey].takeoutByFilter[filterKey]) {
          const weekTakeout: Record<string, number> = {};
          liveTakeoutCounts.forEach((counts, proj) => {
            const c = counts.get(w.weekKey) || 0;
            if (c > 0) weekTakeout[proj] = c;
          });
          snapshots[w.weekKey].takeoutByFilter[filterKey] = weekTakeout;
          hasNewSnapshots = true;
        }
      }
    });

    if (hasNewSnapshots) {
      saveWeeklySnapshots(snapshots);
    }

    const sortedKpiRemarks = Array.from(kpiRemarksSet).sort((a, b) => a.localeCompare(b));
    const finalizedKpiCounts = new Map<string, Record<string, number>>();
    const finalizedTakeoutCounts = new Map<string, Record<string, number>>();

    sortedWeeks.forEach((w) => {
      const isPastEndedWeek = !w.isLive && w.weekKey !== currentWeekKey;
      const weekKpi: Record<string, number> = {};
      const weekTakeout: Record<string, number> = {};

      if (isPastEndedWeek && snapshots[w.weekKey]?.kpiByFilter?.[filterKey]) {
        // FROZEN & FINAL: Use permanently locked snapshot data for ended week
        const frozenKpi = snapshots[w.weekKey].kpiByFilter[filterKey];
        sortedKpiRemarks.forEach((kpi) => {
          weekKpi[kpi] = frozenKpi[kpi] || 0;
        });

        const frozenTakeout = snapshots[w.weekKey].takeoutByFilter?.[filterKey] || {};
        projectsSet.forEach((proj) => {
          weekTakeout[proj] = frozenTakeout[proj] || 0;
        });
      } else {
        // PRESENT WEEK: LIVE and dynamic from real-time incoming Google Sheet data
        liveKpiCounts.forEach((counts, kpi) => {
          weekKpi[kpi] = counts.get(w.weekKey) || 0;
        });
        liveTakeoutCounts.forEach((counts, proj) => {
          weekTakeout[proj] = counts.get(w.weekKey) || 0;
        });
      }

      finalizedKpiCounts.set(w.weekKey, weekKpi);
      finalizedTakeoutCounts.set(w.weekKey, weekTakeout);
    });

    // 5. Cumulative KPI Matrix calculation across reporting weeks
    let runningCumulative: Record<string, number> = {};
    let runningGrandTotal = 0;

    const finalizedCumulativeKpiCounts = new Map<string, Record<string, number>>();
    const weeklyGrandTotals: Record<string, number> = {};
    const cumulativeGrandTotals: Record<string, number> = {};

    sortedWeeks.forEach((w) => {
      const weekKpi = finalizedKpiCounts.get(w.weekKey) || {};
      let weekTotal = 0;
      const currentCumulativeForWeek: Record<string, number> = {};

      sortedKpiRemarks.forEach((kpi) => {
        const count = weekKpi[kpi] || 0;
        weekTotal += count;
        currentCumulativeForWeek[kpi] = (runningCumulative[kpi] || 0) + count;
      });

      runningCumulative = { ...currentCumulativeForWeek };
      runningGrandTotal += weekTotal;

      finalizedCumulativeKpiCounts.set(w.weekKey, currentCumulativeForWeek);
      weeklyGrandTotals[w.weekKey] = weekTotal;
      cumulativeGrandTotals[w.weekKey] = runningGrandTotal;
    });

    const cumulativeKpiRows = sortedKpiRemarks.map((kpi) => {
      const weeklyCounts: Record<string, number> = {};
      const cumulativeCounts: Record<string, number> = {};

      sortedWeeks.forEach((w) => {
        const weekKpiMap = finalizedKpiCounts.get(w.weekKey) || {};
        const cumKpiMap = finalizedCumulativeKpiCounts.get(w.weekKey) || {};

        weeklyCounts[w.weekKey] = weekKpiMap[kpi] || 0;
        cumulativeCounts[w.weekKey] = cumKpiMap[kpi] || 0;
      });

      const lastWeekKey = sortedWeeks[sortedWeeks.length - 1]?.weekKey;
      const cumulativeTotal = lastWeekKey ? cumulativeCounts[lastWeekKey] || 0 : 0;

      return {
        kpiRemark: kpi,
        weeklyCounts,
        cumulativeCounts,
        cumulativeTotal,
      };
    });

    const cumulativeWeeks = sortedWeeks.map((w) => ({
      weekKey: w.weekKey,
      startDate: w.monStr,
      endDate: w.sunStr,
      label: w.label,
      fullLabel: w.fullLabel,
      isLive: w.isLive,
      status: w.status,
      weekTotal: weeklyGrandTotals[w.weekKey] || 0,
      cumulativeGrandTotal: cumulativeGrandTotals[w.weekKey] || 0,
    }));

    const kpiGrandTotals: Record<string, number> = {};
    sortedWeeks.forEach((w) => {
      kpiGrandTotals[w.weekKey] = 0;
    });
    let overallKpiTotal = 0;

    const kpiMatrixRows = sortedKpiRemarks.map((kpi) => {
      const counts: Record<string, number> = {};
      let rowTotal = 0;

      sortedWeeks.forEach((w) => {
        const weekKpiMap = finalizedKpiCounts.get(w.weekKey) || {};
        const count = weekKpiMap[kpi] || 0;
        counts[w.weekKey] = count;
        rowTotal += count;
        kpiGrandTotals[w.weekKey] = (kpiGrandTotals[w.weekKey] || 0) + count;
      });

      overallKpiTotal += rowTotal;

      return {
        kpiRemark: kpi,
        counts,
        total: rowTotal,
      };
    });

    const sortedProjects = Array.from(projectsSet).sort().slice(0, 50);
    const takeoutWeeklyTotals: Record<string, number> = {};
    sortedWeeks.forEach((w) => {
      takeoutWeeklyTotals[w.weekKey] = 0;
    });
    let overallTakeoutTotal = 0;

    const takeoutMatrixRows = sortedProjects
      .map((proj) => {
        const counts: Record<string, number> = {};
        let rowTotal = 0;

        sortedWeeks.forEach((w) => {
          const weekTakeoutMap = finalizedTakeoutCounts.get(w.weekKey) || {};
          const count = weekTakeoutMap[proj] || 0;
          counts[w.weekKey] = count;
          rowTotal += count;
          takeoutWeeklyTotals[w.weekKey] = (takeoutWeeklyTotals[w.weekKey] || 0) + count;
        });

        overallTakeoutTotal += rowTotal;

        return {
          project: proj,
          incharge: '',
          counts,
          total: rowTotal,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    const kpiTrendChart = sortedWeeks.map((w) => {
      const weekKpiMap = finalizedKpiCounts.get(w.weekKey) || {};
      const total = kpiGrandTotals[w.weekKey] || 0;
      return {
        weekKey: w.weekKey,
        label: w.label,
        total,
        isLive: w.isLive,
        byKpi: weekKpiMap,
      };
    });

    const takeoutTrendChart = sortedWeeks.map((w) => {
      const takeoutCount = takeoutWeeklyTotals[w.weekKey] || 0;
      return {
        weekKey: w.weekKey,
        label: w.label,
        takeoutCount,
        isLive: w.isLive,
      };
    });

    const weeksResult = sortedWeeks.map((w) => ({
      weekKey: w.weekKey,
      startDate: w.monStr,
      endDate: w.sunStr,
      label: w.label,
      fullLabel: w.fullLabel,
      isLive: w.isLive,
      status: w.status,
      totalRecords: kpiGrandTotals[w.weekKey] || 0,
      totalTakeouts: takeoutWeeklyTotals[w.weekKey] || 0,
    }));

    return {
      success: true,
      timezone: 'Asia/Manila',
      currentWeekKey,
      summaryCards: {
        totalRecords: filtered.length,
        totalTakeouts,
        activeKpiRemarksCount: kpiRemarksSet.size,
        recordsUpdatedThisWeek,
      },
      weeks: weeksResult,
      kpiMatrix: {
        rows: kpiMatrixRows,
        grandTotals: {
          counts: kpiGrandTotals,
          overallTotal: overallKpiTotal,
        },
      },
      cumulativeKpiMatrix: {
        weeks: cumulativeWeeks,
        rows: cumulativeKpiRows,
        grandTotals: {
          weeklyCounts: weeklyGrandTotals,
          cumulativeCounts: cumulativeGrandTotals,
          cumulativeGrandTotal: runningGrandTotal,
        },
        totalUniqueKpis: sortedKpiRemarks.length,
      },
      takeoutMatrix: {
        rows: takeoutMatrixRows,
        weeklyTotals: {
          counts: takeoutWeeklyTotals,
          overallTotal: overallTakeoutTotal,
        },
      },
      kpiTrendChart,
      takeoutTrendChart,
      allKpiRemarks: sortedKpiRemarks,
      allProjects: Array.from(projectsSet).sort(),
      lastUpdated: cache.lastFetched,
    };
  }

  // API Route: Weekly KPI Remarks & Takeout Matrix Dashboard
  app.get('/api/sheets/weekly-matrix', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const data = calculateWeeklyMatrix(records, req.query);
      res.json(data);
    } catch (err: any) {
      console.error('Weekly matrix computation error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to compute weekly matrix' });
    }
  });

  // API Route: Cumulative Weekly KPI Matrix
  app.get('/api/sheets/cumulative-kpi-matrix', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const data = calculateWeeklyMatrix(records, req.query);
      res.json({
        success: true,
        timezone: data.timezone,
        currentWeekKey: data.currentWeekKey,
        weeks: data.cumulativeKpiMatrix.weeks,
        rows: data.cumulativeKpiMatrix.rows,
        grandTotals: data.cumulativeKpiMatrix.grandTotals,
        totalUniqueKpis: data.cumulativeKpiMatrix.totalUniqueKpis,
        lastUpdated: data.lastUpdated,
      });
    } catch (err: any) {
      console.error('Cumulative KPI matrix error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to compute cumulative KPI matrix' });
    }
  });

  // API Route: Manual Snapshot / Freeze Week
  app.post('/api/sheets/weekly-matrix/freeze', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const data = calculateWeeklyMatrix(records, req.query);
      res.json({
        success: true,
        message: 'Historical week snapshots updated and frozen to disk successfully',
        data,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Drill-Down Breakdown (In charge, Project, KPI Remarks, PWG Updates)
  app.get('/api/sheets/drilldown', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const filtered = filterRecords(records, req.query);

      const total = filtered.length || 1;

      // 1. In charge breakdown
      const inchargeMap: Record<string, number> = {};
      // 2. Project breakdown
      const projectMap: Record<string, number> = {};
      // 3. KPI Remarks breakdown
      const kpiRemarksMap: Record<string, number> = {};
      // 4. PWG Updates breakdown
      const pwgUpdatesMap: Record<string, number> = {};

      for (const r of filtered) {
        const inch = (r.incharge || '').trim() || 'Unassigned';
        inchargeMap[inch] = (inchargeMap[inch] || 0) + 1;

        const proj = (r.project || '').trim() || 'Unknown Project';
        projectMap[proj] = (projectMap[proj] || 0) + 1;

        const kpi = (r.kpiRemarks || '').trim();
        if (kpi && kpi.toLowerCase() !== 'unassigned remarks' && kpi.toLowerCase() !== 'unassigned' && kpi !== '-') {
          kpiRemarksMap[kpi] = (kpiRemarksMap[kpi] || 0) + 1;
        }

        const pwg = (r.pwgUpdates || '').trim() || 'No PWG Update';
        pwgUpdatesMap[pwg] = (pwgUpdatesMap[pwg] || 0) + 1;
      }

      const inchargeBreakdown = Object.entries(inchargeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const projectBreakdown = Object.entries(projectMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const kpiRemarksBreakdown = Object.entries(kpiRemarksMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const pwgUpdatesBreakdown = Object.entries(pwgUpdatesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Number(((count / total) * 100).toFixed(1)),
        }));

      const drillLabel = (req.query.drillLabel as string) || (req.query.value as string) || 'Visual Drill-Down';

      res.json({
        success: true,
        drilldown: {
          title: drillLabel,
          subtitle: `${filtered.length.toLocaleString()} matching units identified in active selection`,
          target: {
            category: req.query.category || 'general',
            value: (req.query.value as string) || '',
            label: drillLabel,
            metric: req.query.metric as string,
            month: req.query.month as string,
          },
          totalUnits: filtered.length,
          inchargeBreakdown,
          projectBreakdown,
          kpiRemarksBreakdown,
          pwgUpdatesBreakdown,
          sampleRecords: filtered.slice(0, 25),
          drillFilterParams: req.query,
        },
      });
    } catch (err: any) {
      console.error('Drilldown error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to compute drill-down' });
    }
  });

  // API Route: Paginated & Filtered Records
  app.get('/api/sheets/records', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize as string) || 25));

      const filtered = filterRecords(records, req.query);
      const totalMatches = filtered.length;
      const totalPages = Math.ceil(totalMatches / pageSize) || 1;
      const startIndex = (page - 1) * pageSize;
      const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize);

      res.json({
        success: true,
        records: paginatedRecords,
        pagination: {
          page,
          pageSize,
          totalRecords: totalMatches,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to query records',
      });
    }
  });

  // API Route: Export Filtered CSV
  app.get('/api/sheets/export-csv', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const filtered = filterRecords(records, req.query);

      const columns: { header: string; get: (r: SheetRecord) => string }[] = [
        { header: 'Unit ID', get: (r) => String(r.id) },
        { header: 'Project Code', get: (r) => r.projectCode },
        { header: 'Developer', get: (r) => r.developer },
        { header: 'Project Name', get: (r) => r.project },
        { header: 'Block', get: (r) => r.block },
        { header: 'Lot', get: (r) => r.lot },
        { header: 'Unit Status', get: (r) => r.unitsStatus },
        { header: 'Folder Status', get: (r) => r.folderStatus },
        { header: 'Priority Move-In', get: (r) => r.priorityMoveIn || 'No' },
        { header: 'Area / SPE', get: (r) => r.areaSpe },
        { header: 'Personnel In Charge', get: (r) => r.incharge },
        { header: 'Energized Date', get: (r) => r.energizedDate },
        { header: 'Takeout Date', get: (r) => r.takeoutDate },
        { header: 'Completion Percentage', get: (r) => r.percentage },
        { header: 'Progression Stage', get: (r) => r.stages },
        { header: 'Final E-Target', get: (r) => r.finalETarget },
        { header: 'MMS Application Date', get: (r) => r.mmsApplicationDate },
        { header: 'FAC Batch', get: (r) => r.facBatch },
        { header: 'FAC Status', get: (r) => r.facStatus },
        { header: 'FAC Adjusted Target', get: (r) => r.facAdjustedTarget },
        { header: 'COO Status', get: (r) => r.cooStatus },
        { header: 'COO Adjusted Target', get: (r) => r.cooAdjustedTarget },
        { header: 'SEP Status', get: (r) => r.sepStatus },
        { header: 'SEP Adjusted Target', get: (r) => r.sepAdjustedTarget },
        { header: 'PWG CFEI Status', get: (r) => r.pwgCfeiStatus },
        { header: 'PWG JO Award Status', get: (r) => r.pwgJoAwardStatus },
        { header: 'PWG Updates', get: (r) => r.pwgUpdates },
        { header: 'PWG Remarks', get: (r) => r.pwgRemarks },
        { header: 'Job Order (JO)', get: (r) => r.jo },
        { header: 'KPI Remarks', get: (r) => r.kpiRemarks },
      ];

      const escapeVal = (val: string) => {
        const str = val == null ? '' : String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const headerLine = columns.map((c) => escapeVal(c.header)).join(',');
      const rowsLines = filtered.map((r) => columns.map((c) => escapeVal(c.get(r))).join(','));
      const csvContent = [headerLine, ...rowsLines].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="energization_filtered_units.csv"');
      res.send(csvContent);
    } catch (err: any) {
      console.error('CSV export failed:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to export CSV' });
    }
  });

  // API Route: Single Record by ID
  app.get('/api/sheets/record/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const token = getAuthToken(req);
      const records = await ensureCache(token);
      const record = records.find((r) => r.id === id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Manual Invalidation & Refresh
  app.post('/api/sheets/refresh', async (req: Request, res: Response) => {
    try {
      const token = getAuthToken(req);
      const records = await ensureCache(token, true);
      res.json({
        success: true,
        message: 'Spreadsheet cache refreshed successfully',
        totalRecords: records.length,
        lastUpdated: cache.lastFetched,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to refresh cache',
      });
    }
  });

export default app;

// Standalone server lifecycle (used for local development and non-serverless Node hosting)
export async function startStandaloneServer() {
  const { port, host } = getServerConfig();

  // Mount Vite or Static Files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Re-fetch every 1 minute in the background to stay in sync
  setInterval(async () => {
    try {
      await ensureCache(undefined, true);
      console.log(`[Auto-sync] Successfully re-synced ${cache.records.length} records from Google Sheets`);
    } catch (err: any) {
      console.error('[Auto-sync] Background re-fetch failed (retaining existing data):', err.message);
    }
  }, 60 * 1000);

  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
}

// Only start standalone server when run directly (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  startStandaloneServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
