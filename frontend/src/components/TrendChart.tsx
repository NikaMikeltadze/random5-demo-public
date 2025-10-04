import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DayStats } from '../types/weather.types';

interface TrendChartProps {
  stats?: DayStats;
  title: string;
  color: string;
  yAxisLabel: string;
}

export default function TrendChart({ stats, title, color, yAxisLabel }: TrendChartProps) {
  if (!stats || !stats.yearly_values || stats.yearly_values.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-gray-400">No trend data available</p>
      </div>
    );
  }

  const data = stats.yearly_values.map(yv => ({
    year: yv.year,
    value: yv.value,
    // Calculate trend line value
    trendValue: stats.trend 
      ? stats.trend.slope * yv.year + (stats.mean - stats.trend.slope * stats.yearly_values[0].year)
      : undefined
  }));

  const trend = stats.trend;
  const hasTrend = trend && trend.significant;
  
  let trendIcon;
  let trendText;
  let trendColor;
  
  if (hasTrend) {
    if (trend.slope > 0) {
      trendIcon = <TrendingUp className="w-5 h-5" />;
      trendText = 'Increasing';
      trendColor = 'text-yellow-400';
    } else {
      trendIcon = <TrendingDown className="w-5 h-5" />;
      trendText = 'Decreasing';
      trendColor = 'text-blue-400';
    }
  } else {
    trendIcon = <Minus className="w-5 h-5" />;
    trendText = 'Stable';
    trendColor = 'text-gray-400';
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">{title}</h3>
        {trend && (
          <div className={`flex items-center gap-2 ${trendColor}`}>
            {trendIcon}
            <span className="font-medium">{trendText}</span>
            {hasTrend && (
              <span className="text-sm">
                (slope: {trend.slope.toFixed(4)}/year, p={trend.p_value.toFixed(4)})
              </span>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="year" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB'
            }}
            formatter={(value: number) => [value.toFixed(2), yAxisLabel]}
          />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={3}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
            name="Actual"
            animationDuration={1000}
          />
          {hasTrend && (
            <Line 
              type="monotone" 
              dataKey="trendValue" 
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Trend"
              animationDuration={1000}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
