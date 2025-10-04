import { CloudRain, Thermometer, Wind, AlertTriangle } from 'lucide-react';
import type { DayStats, RiskLevel } from '../types/weather.types';

interface ProbabilityDisplayProps {
  dayOfYear: number;
  rainStats?: DayStats;
  heatStats?: DayStats;
  windStats?: DayStats;
  loading?: boolean;
}

function getRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.4) return 'high';
  if (probability >= 0.2) return 'medium';
  return 'low';
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'high': return 'bg-risk-high';
    case 'medium': return 'bg-risk-medium';
    case 'low': return 'bg-risk-low';
  }
}

function getRiskTextColor(level: RiskLevel): string {
  switch (level) {
    case 'high': return 'text-risk-high';
    case 'medium': return 'text-risk-medium';
    case 'low': return 'text-risk-low';
  }
}

function getRiskEmoji(level: RiskLevel): string {
  switch (level) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
  }
}

interface EventCardProps {
  title: string;
  icon: React.ReactNode;
  probability: number;
  sampleSize: number;
  description: string;
}

function EventCard({ title, icon, probability, sampleSize, description }: EventCardProps) {
  const riskLevel = getRiskLevel(probability);
  const riskColor = getRiskColor(riskLevel);
  const riskTextColor = getRiskTextColor(riskLevel);
  const emoji = getRiskEmoji(riskLevel);

  return (
    <div className="card hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${riskColor} bg-opacity-20`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <span className="text-3xl">{emoji}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <span className={`text-5xl font-bold ${riskTextColor}`}>
            {(probability * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${riskColor} transition-all duration-500`}
            style={{ width: `${probability * 100}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-400 mt-2">
          Based on {sampleSize} years of data
        </p>
      </div>
    </div>
  );
}

export default function ProbabilityDisplay({
  dayOfYear,
  rainStats,
  heatStats,
  windStats,
  loading = false
}: ProbabilityDisplayProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-3/4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-2xl font-bold mb-2 text-nasa-blue flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Weather Probabilities
        </h2>
        <p className="text-gray-400 text-sm">Day of year: {dayOfYear}</p>
      </div>

      {rainStats && (
        <EventCard
          title="Heavy Rain"
          icon={<CloudRain className="w-6 h-6 text-blue-400" />}
          probability={rainStats.probabilities.heavy_rain_above_10mm || 0}
          sampleSize={rainStats.sample_size}
          description="> 10mm precipitation"
        />
      )}

      {heatStats && (
        <EventCard
          title="Extreme Heat"
          icon={<Thermometer className="w-6 h-6 text-red-400" />}
          probability={heatStats.probabilities.very_hot_above_35C || 0}
          sampleSize={heatStats.sample_size}
          description="> 35°C temperature"
        />
      )}

      {windStats && (
        <EventCard
          title="High Wind"
          icon={<Wind className="w-6 h-6 text-cyan-400" />}
          probability={windStats.probabilities.windy_above_10mps || 0}
          sampleSize={windStats.sample_size}
          description="> 10 m/s wind speed"
        />
      )}
    </div>
  );
}
