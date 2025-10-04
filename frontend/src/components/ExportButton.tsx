import { Download } from 'lucide-react';
import type { DayStats, AllLocationsSummary } from '../types/weather.types';
import { generateCSV, downloadCSV, prepareExportData } from '../utils/csvExport';

interface ExportButtonProps {
  location: string;
  date: string;
  dayOfYear: number;
  rainStats?: DayStats;
  heatStats?: DayStats;
  windStats?: DayStats;
  nasaAttribution: AllLocationsSummary['nasa_attribution'];
  disabled?: boolean;
}

export default function ExportButton({
  location,
  date,
  dayOfYear,
  rainStats,
  heatStats,
  windStats,
  nasaAttribution,
  disabled = false
}: ExportButtonProps) {
  const handleExport = () => {
    const dayStats: Record<string, DayStats> = {};
    
    if (rainStats) dayStats['PRECTOTCORR'] = rainStats;
    if (heatStats) dayStats['T2M_MAX'] = heatStats;
    if (windStats) dayStats['WS10M_MAX'] = windStats;

    const exportData = prepareExportData(
      location,
      date,
      dayOfYear,
      dayStats,
      nasaAttribution
    );

    const csvContent = generateCSV(exportData);
    const filename = `weather_probabilities_${location}_${date.replace('-', '')}.csv`;
    downloadCSV(csvContent, filename);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-5 h-5" />
      Export to CSV
    </button>
  );
}
