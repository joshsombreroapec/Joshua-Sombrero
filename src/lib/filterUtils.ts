export const MULTI_FILTER_DELIMITER = '||';

export function parseMultiFilter(value?: string): string[] {
  if (!value) return [];
  return value
    .split(MULTI_FILTER_DELIMITER)
    .map((v) => v.trim())
    .filter((v) => v !== '' && v.toUpperCase() !== 'ALL');
}

export function serializeMultiFilter(values: string[]): string {
  const unique = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  return unique.join(MULTI_FILTER_DELIMITER);
}

export function formatMultiFilter(value?: string, emptyLabel = 'All'): string {
  const items = parseMultiFilter(value);
  if (items.length === 0) return emptyLabel;
  return items.join(', ');
}
