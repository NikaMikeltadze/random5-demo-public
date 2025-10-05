"""
Calculate ML-based probability trends for extreme weather events.

This script aggregates trend data across all days of the year to provide
overall probability trends for each variable (rain, temperature, wind).
The output is used for demo-ready visualization in the Historical Trends graphs.
"""
import os
import json
from typing import Dict, List, Tuple
import numpy as np

# Mapping of variables to their extreme event probability keys
VARIABLE_PROBABILITIES = {
    'PRECTOTCORR': ['heavy_rain_above_10mm', 'very_heavy_rain_above_25mm', 'extreme_rain_above_50mm'],
    'T2M_MAX': ['hot_above_30C', 'very_hot_above_35C', 'extreme_heat_above_40C'],
    'WS10M_MAX': ['windy_above_10mps', 'very_windy_above_15mps', 'extreme_wind_above_20mps'],
}

VARIABLE_LABELS = {
    'PRECTOTCORR': 'Heavy Rain',
    'T2M_MAX': 'Extreme Heat',
    'WS10M_MAX': 'High Wind',
}


def calculate_probability_trend_for_variable(
    daily_stats: Dict, variable: str, prob_key: str
) -> Dict:
    """
    Calculate the probability trend across all days of the year for a specific probability threshold.
    
    Returns aggregate trend statistics including:
    - Average slope across all days
    - Percentage of days with significant trends
    - Start and end period probability estimates
    """
    variable_data = daily_stats.get('variables', {}).get(variable, {})
    if not variable_data:
        return None
    
    slopes = []
    significant_slopes = []
    start_probs = []
    end_probs = []
    
    data_period = daily_stats.get('data_period', {})
    start_year = int(data_period.get('start', '2005-01-01')[:4])
    end_year = int(data_period.get('end', '2024-12-31')[:4])
    mid_year = (start_year + end_year) / 2
    
    for doy_key, day_stats in variable_data.items():
        if 'trend' not in day_stats:
            continue
        
        trend = day_stats['trend']
        probabilities = day_stats.get('probabilities', {})
        
        # Get the probability value for this threshold
        prob_value = probabilities.get(prob_key, 0)
        
        # Calculate probability change using the trend slope
        slope = trend['slope']
        slopes.append(slope)
        
        if trend['significant']:
            significant_slopes.append(slope)
        
        # Estimate start and end probabilities based on the trend line
        # probability = baseline + slope * (year - mid_year)
        # We use the actual probability as the baseline at mid_year
        start_prob = max(0, min(1, prob_value - slope * (mid_year - start_year)))
        end_prob = max(0, min(1, prob_value + slope * (end_year - mid_year)))
        
        start_probs.append(start_prob)
        end_probs.append(end_prob)
    
    if not slopes:
        return None
    
    # Calculate aggregate statistics
    avg_slope = np.mean(slopes)
    median_slope = np.median(slopes)
    
    # Calculate per-decade change (slope is per year)
    per_decade_change = avg_slope * 10 * 100  # Convert to percentage points per decade
    
    # Estimate aggregate start/end probabilities
    avg_start_prob = np.mean(start_probs) * 100  # Convert to percentage
    avg_end_prob = np.mean(end_probs) * 100
    
    # Determine trend direction and significance
    pct_significant = len(significant_slopes) / len(slopes) * 100 if slopes else 0
    
    # Trend direction
    if abs(per_decade_change) < 0.5:
        direction = 'stable'
        risk_level = 'low'
    elif per_decade_change > 0:
        direction = 'increasing'
        risk_level = 'high' if per_decade_change > 2 else 'medium'
    else:
        direction = 'decreasing'
        risk_level = 'low'
    
    return {
        'average_slope_per_year': float(avg_slope),
        'median_slope_per_year': float(median_slope),
        'per_decade_change_percentage_points': float(per_decade_change),
        'start_year': start_year,
        'end_year': end_year,
        'estimated_start_probability_percent': float(avg_start_prob),
        'estimated_end_probability_percent': float(avg_end_prob),
        'direction': direction,
        'risk_level': risk_level,
        'percent_days_significant_trend': float(pct_significant),
        'num_days_analyzed': len(slopes),
    }


def generate_trend_summary(city_key: str) -> Dict:
    """Generate a complete trend summary for a city."""
    daily_stats_path = os.path.join('data', 'processed', f'{city_key}_daily_stats.json')
    
    if not os.path.exists(daily_stats_path):
        return None
    
    with open(daily_stats_path, 'r', encoding='utf-8') as f:
        daily_stats = json.load(f)
    
    summary = {
        'location': city_key,
        'generated_at': daily_stats.get('nasa_source', {}).get('access_date'),
        'data_period': daily_stats.get('data_period', {}),
        'trends': {}
    }
    
    # Calculate trends for each variable
    for variable, prob_keys in VARIABLE_PROBABILITIES.items():
        if variable not in daily_stats.get('variables', {}):
            continue
        
        variable_trends = {}
        for prob_key in prob_keys:
            trend = calculate_probability_trend_for_variable(daily_stats, variable, prob_key)
            if trend:
                variable_trends[prob_key] = trend
        
        if variable_trends:
            # Pick the most relevant threshold (typically the first/moderate one)
            primary_key = prob_keys[0]
            summary['trends'][variable] = {
                'label': VARIABLE_LABELS.get(variable, variable),
                'primary_threshold': primary_key,
                'primary_trend': variable_trends.get(primary_key, {}),
                'all_thresholds': variable_trends,
            }
    
    return summary


if __name__ == '__main__':
    output_dir = os.path.join('data', 'processed')
    os.makedirs(output_dir, exist_ok=True)
    
    for city_key in ['tbilisi', 'batumi', 'kutaisi']:
        print(f'Calculating probability trends for {city_key}...')
        
        trend_summary = generate_trend_summary(city_key)
        
        if trend_summary:
            output_path = os.path.join(output_dir, f'{city_key}_trend_summary.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(trend_summary, f, indent=2)
            
            print(f'  Saved to {output_path}')
            
            # Print a quick summary
            for var, trend_data in trend_summary.get('trends', {}).items():
                primary = trend_data.get('primary_trend', {})
                label = trend_data.get('label', var)
                direction = primary.get('direction', 'unknown')
                change = primary.get('per_decade_change_percentage_points', 0)
                print(f'  {label}: {direction} ({change:+.2f}% per decade)')
        else:
            print(f'  No data available for {city_key}')
    
    print('\nTrend calculation complete.')
