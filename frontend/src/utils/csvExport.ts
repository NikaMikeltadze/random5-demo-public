import type { DayStats, AllLocationsSummary } from '../types/weather.types';

export interface ExportData {
  location: string;
  date: string;
  dayOfYear: number;
  variable: string;
  probability: number;
  probabilityType: string;
  trend?: {
    slope: number;
    significant: boolean;
  };
  nasaCitation: string;
}

/**
 * Escape a CSV field by quoting it if it contains special characters
 * and escaping any internal quotes by doubling them
 */
function escapeCSVField(field: string): string {
  // If field contains comma, quote, newline, or carriage return, it needs to be quoted
  // and internal quotes need to be doubled
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Generate CSV content from export data
 */
export function generateCSV(data: ExportData[]): string {
  const headers = [
    'Location',
    'Date',
    'Day of Year',
    'Variable',
    'Probability Type',
    'Probability (%)',
    'Trend Slope',
    'Trend Significant',
    'NASA Citation'
  ];

  const rows = data.map(item => [
    item.location,
    item.date,
    item.dayOfYear.toString(),
    item.variable,
    item.probabilityType,
    (item.probability * 100).toFixed(2),
    item.trend?.slope.toFixed(6) || 'N/A',
    item.trend?.significant ? 'Yes' : 'No',
    item.nasaCitation
  ]);

  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate export data from day stats
 */
export function prepareExportData(
  location: string,
  date: string,
  dayOfYear: number,
  dayStats: Record<string, DayStats>,
  nasaAttribution: AllLocationsSummary['nasa_attribution']
): ExportData[] {
  const exportData: ExportData[] = [];
  const citation = `${nasaAttribution.dataset} - ${nasaAttribution.full_citation} - ${nasaAttribution.url}`;

  Object.entries(dayStats).forEach(([variable, stats]) => {
    Object.entries(stats.probabilities).forEach(([probType, probValue]) => {
      exportData.push({
        location,
        date,
        dayOfYear,
        variable,
        probability: probValue,
        probabilityType: probType,
        trend: stats.trend ? {
          slope: stats.trend.slope,
          significant: stats.trend.significant
        } : undefined,
        nasaCitation: citation
      });
    });
  });

  return exportData;
}
