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

export interface SummaryData {
  totalRecords: number;
  energizedCount: number;
  energizationRate: number;
  priorityMoveInCount: number;
  statusCounts: Record<string, number>;
  folderStatusCounts: Record<string, number>;
  areaCounts: Record<string, number>;
  stageCounts: Record<string, number>;
  inchargeCounts: Record<string, number>;
  projectCounts: Record<string, number>;
  distinctValues: {
    projects: string[];
    incharge: string[];
    areas: string[];
    folderStatuses: string[];
    unitsStatuses: string[];
    stages: string[];
  };
  lastUpdated: number;
}

export interface MonthlyTrendItem {
  key: string;
  label: string;
  takenOut: number;
  energized: number;
  within21Days: number;
}

export interface ChartCategoryItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  totalUnits: number;
  energizedCount: number;
  ongoingCount: number;
  nysCount: number;
  takenOutCount: number;
  priorityCount: number;
  within21DaysCount: number;
  monthlyTrend: MonthlyTrendItem[];
  kpiRemarksDistribution: ChartCategoryItem[];
  pwgUpdatesDistribution: ChartCategoryItem[];
  stagesDistribution: ChartCategoryItem[];
  verticalComparison: {
    key: string;
    label: string;
    count: number;
  }[];
  facStatusDistribution: ChartCategoryItem[];
  cooStatusDistribution: ChartCategoryItem[];
  sepStatusDistribution: ChartCategoryItem[];
  recentRecords?: SheetRecord[];
  topProjects?: {
    rank: number;
    name: string;
    count: number;
    energized: number;
    percentage: number;
  }[];
  topWithin21Projects?: {
    rank: number;
    name: string;
    count: number;
    totalEnergized: number;
    percentage: number;
  }[];
  topCriticalOngoingDelayProjects?: {
    rank: number;
    name: string;
    count: number;
    totalOngoing: number;
    avgDelayDays: number;
    maxDelayDays: number;
  }[];
  inchargeStatusBreakdown?: InchargeStatusBreakdown;
  distinctValues: {
    projects: string[];
    incharge: string[];
    areas: string[];
    folderStatuses: string[];
    unitsStatuses: string[];
    stages: string[];
    pwgUpdates: string[];
  };
  lastUpdated: number;
}

export type UnitStatusCategory =
  | 'TAKEN OUT'
  | 'ENERGIZED'
  | 'ENERGIZED - 1. WITHIN 21 DAYS'
  | 'ONGOING'
  | 'NYS';

export interface InchargePersonStats {
  name: 'RENZ' | 'RONALD' | 'MARK';
  color: string;
  total: number;
  standardCounts: Record<UnitStatusCategory, number>;
  lifecycleCounts: Record<UnitStatusCategory, number>;
  unmatchedCount: number;
}

export interface InchargeStatusBreakdown {
  categories: UnitStatusCategory[];
  people: InchargePersonStats[];
  unmatchedCount: number;
  unmatchedDetails?: {
    id: number;
    incharge: string;
    unitsStatus: string;
    folderStatus: string;
    project: string;
  }[];
  totalAssignedUnits: number;
}

export interface DrilldownTarget {
  category:
    | 'kpiCard'
    | 'monthlyTrend'
    | 'kpiRemarks'
    | 'pwgUpdates'
    | 'verticalComparison'
    | 'facStatus'
    | 'cooStatus'
    | 'sepStatus';
  value: string;
  label: string;
  metric?: string;
  month?: string;
}

export interface DrilldownData {
  title: string;
  subtitle: string;
  target: DrilldownTarget;
  totalUnits: number;
  inchargeBreakdown: ChartCategoryItem[];
  projectBreakdown: ChartCategoryItem[];
  kpiRemarksBreakdown: ChartCategoryItem[];
  pwgUpdatesBreakdown: ChartCategoryItem[];
  sampleRecords: SheetRecord[];
  drillFilterParams: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface FilterState {
  search: string;
  unitsStatus: string;
  folderStatus: string;
  incharge: string;
  area: string;
  project: string;
  block: string;
  lot: string;
  priorityMoveIn: string;
  stage: string;
  pwgUpdates?: string;
  startDate?: string;
  endDate?: string;
  datePreset?: string;
}

export interface ConnectionStatus {
  spreadsheetId: string;
  sheetName: string;
  isLoaded: boolean;
  totalRecords: number;
  lastFetched: string | null;
  error: string | null;
  cacheTtlSeconds: number;
}

export interface WeeklySnapshotItem {
  weekKey: string;
  startDate: string;
  endDate: string;
  label: string;
  fullLabel: string;
  isLive: boolean;
  status: 'LIVE' | 'FINAL';
  totalRecords: number;
  totalTakeouts: number;
}

export interface KpiMatrixRow {
  kpiRemark: string;
  counts: Record<string, number>;
  total: number;
}

export interface TakeoutMatrixRow {
  project: string;
  incharge: string;
  counts: Record<string, number>;
  total: number;
}

export interface WeeklyMatrixData {
  success: boolean;
  timezone: string;
  currentWeekKey: string;
  summaryCards: {
    totalRecords: number;
    totalTakeouts: number;
    activeKpiRemarksCount: number;
    recordsUpdatedThisWeek: number;
  };
  weeks: WeeklySnapshotItem[];
  kpiMatrix: {
    rows: KpiMatrixRow[];
    grandTotals: {
      counts: Record<string, number>;
      overallTotal: number;
    };
  };
  takeoutMatrix: {
    rows: TakeoutMatrixRow[];
    weeklyTotals: {
      counts: Record<string, number>;
      overallTotal: number;
    };
  };
  kpiTrendChart: {
    weekKey: string;
    label: string;
    total: number;
    isLive: boolean;
    byKpi: Record<string, number>;
  }[];
  takeoutTrendChart: {
    weekKey: string;
    label: string;
    takeoutCount: number;
    isLive: boolean;
  }[];
  allKpiRemarks: string[];
  allProjects: string[];
  lastUpdated: number;
}

export interface CumulativeKpiMatrixWeek {
  weekKey: string;
  startDate: string;
  endDate: string;
  label: string;
  fullLabel: string;
  isLive: boolean;
  status: 'LIVE' | 'FINAL';
  weekTotal: number;
  cumulativeGrandTotal: number;
}

export interface CumulativeKpiMatrixRow {
  kpiRemark: string;
  weeklyCounts: Record<string, number>;
  cumulativeCounts: Record<string, number>;
  cumulativeTotal: number;
}

export interface CumulativeKpiMatrixData {
  success: boolean;
  timezone: string;
  currentWeekKey: string;
  weeks: CumulativeKpiMatrixWeek[];
  rows: CumulativeKpiMatrixRow[];
  grandTotals: {
    weeklyCounts: Record<string, number>;
    cumulativeCounts: Record<string, number>;
    cumulativeGrandTotal: number;
  };
  totalUniqueKpis: number;
  lastUpdated: number;
}

