#!/usr/bin/env python3
"""
Comprehensive data verification script to ensure:
1. All available variables from raw data are processed
2. All 366 days of year are covered for each variable
3. All probability calculations are within valid range [0, 1]
4. Trend analysis is computed where applicable
5. Hourly patterns include all available variables
"""

import json
import os
from typing import Dict, List
import pandas as pd


def verify_daily_data_completeness():
    """Verify daily processed data uses all available raw data variables"""
    print("=" * 80)
    print("DAILY DATA VERIFICATION")
    print("=" * 80)
    
    for city in ['tbilisi', 'batumi', 'kutaisi']:
        print(f"\n{city.upper()}:")
        
        # Load raw data
        raw_path = os.path.join('data', 'raw', f'{city}_daily_raw.csv')
        if not os.path.exists(raw_path):
            print(f"  ❌ Raw data not found: {raw_path}")
            continue
            
        raw_df = pd.read_csv(raw_path, index_col=0, nrows=1)
        raw_variables = set(raw_df.columns)
        print(f"  Raw variables ({len(raw_variables)}): {sorted(raw_variables)}")
        
        # Load processed data
        processed_path = os.path.join('data', 'processed', f'{city}_daily_stats.json')
        if not os.path.exists(processed_path):
            print(f"  ❌ Processed data not found: {processed_path}")
            continue
            
        with open(processed_path, 'r') as f:
            processed_data = json.load(f)
        
        processed_variables = set(processed_data.get('variables', {}).keys())
        print(f"  Processed variables ({len(processed_variables)}): {sorted(processed_variables)}")
        
        # Check completeness
        missing = raw_variables - processed_variables
        if missing:
            print(f"  ⚠️  Missing {len(missing)} variables: {sorted(missing)}")
        else:
            print(f"  ✅ All raw variables are processed!")
        
        # Check day coverage
        print(f"\n  Day of Year Coverage:")
        for var in sorted(processed_variables):
            var_data = processed_data['variables'][var]
            days_covered = len(var_data)
            expected_days = 366
            
            if days_covered == expected_days:
                print(f"    ✅ {var}: {days_covered}/{expected_days} days")
            else:
                missing_days = [d for d in range(1, 367) if str(d) not in var_data]
                print(f"    ❌ {var}: {days_covered}/{expected_days} days (missing: {len(missing_days)} days)")
        
        # Check probability validity
        print(f"\n  Probability Validation:")
        total_probs = 0
        invalid_probs = 0
        
        for var in processed_variables:
            for day, stats in processed_data['variables'][var].items():
                probs = stats.get('probabilities', {})
                for prob_name, prob_val in probs.items():
                    total_probs += 1
                    if prob_val is None or not (0.0 <= prob_val <= 1.0):
                        invalid_probs += 1
        
        if invalid_probs == 0:
            print(f"    ✅ All {total_probs} probability values are valid [0, 1]")
        else:
            print(f"    ❌ {invalid_probs}/{total_probs} probability values are invalid")
        
        # Check trend analysis
        print(f"\n  Trend Analysis:")
        vars_with_trends = 0
        for var in processed_variables:
            sample_day = processed_data['variables'][var].get('180', {})
            if 'trend' in sample_day:
                vars_with_trends += 1
        
        print(f"    ✅ {vars_with_trends}/{len(processed_variables)} variables have trend analysis")


def verify_hourly_data_completeness():
    """Verify hourly processed data includes diurnal patterns for key variables"""
    print("\n" + "=" * 80)
    print("HOURLY DATA VERIFICATION")
    print("=" * 80)
    
    for city in ['tbilisi', 'batumi', 'kutaisi']:
        print(f"\n{city.upper()}:")
        
        # Load raw data
        raw_path = os.path.join('data', 'raw', f'{city}_hourly_raw.csv')
        if not os.path.exists(raw_path):
            print(f"  ❌ Raw data not found: {raw_path}")
            continue
            
        raw_df = pd.read_csv(raw_path, index_col=0, nrows=1)
        raw_variables = set(raw_df.columns)
        print(f"  Raw variables ({len(raw_variables)}): {sorted(raw_variables)}")
        
        # Load processed data
        processed_path = os.path.join('data', 'processed', f'{city}_hourly_stats.json')
        if not os.path.exists(processed_path):
            print(f"  ❌ Processed data not found: {processed_path}")
            continue
            
        with open(processed_path, 'r') as f:
            processed_data = json.load(f)
        
        hourly_patterns = processed_data.get('hourly_patterns', {})
        diurnal_patterns = processed_data.get('diurnal_patterns', {})
        
        print(f"  Hourly patterns ({len(hourly_patterns)}): {sorted(hourly_patterns.keys())}")
        print(f"  Diurnal patterns ({len(diurnal_patterns)}): {sorted(diurnal_patterns.keys())}")
        
        # Key variables that should have diurnal patterns
        expected_diurnal = {'T2M', 'WS2M', 'WS10M', 'RH2M', 'ALLSKY_SFC_SW_DWN'}
        available_diurnal = expected_diurnal & raw_variables
        missing_diurnal = available_diurnal - set(diurnal_patterns.keys())
        
        if missing_diurnal:
            print(f"  ⚠️  Missing diurnal patterns for: {sorted(missing_diurnal)}")
        else:
            print(f"  ✅ All expected variables have diurnal patterns!")


def verify_frontend_sync():
    """Verify that frontend data is in sync with processed data"""
    print("\n" + "=" * 80)
    print("FRONTEND DATA SYNC VERIFICATION")
    print("=" * 80)
    
    files_to_check = [
        ('tbilisi_daily_stats.json', 'processed'),
        ('tbilisi_hourly_stats.json', 'processed'),
        ('batumi_daily_stats.json', 'processed'),
        ('batumi_hourly_stats.json', 'processed'),
        ('kutaisi_daily_stats.json', 'processed'),
        ('kutaisi_hourly_stats.json', 'processed'),
        ('all_locations_summary.json', 'demo'),
        ('preset_demo_queries.json', 'demo'),
    ]
    
    all_synced = True
    for filename, subdir in files_to_check:
        backend_path = os.path.join('data', subdir, filename)
        frontend_path = os.path.join('frontend', 'public', 'static-data', subdir, filename)
        
        if not os.path.exists(backend_path):
            print(f"  ⚠️  Backend file missing: {backend_path}")
            all_synced = False
            continue
            
        if not os.path.exists(frontend_path):
            print(f"  ❌ Frontend file missing: {frontend_path}")
            all_synced = False
            continue
        
        # Compare file sizes
        backend_size = os.path.getsize(backend_path)
        frontend_size = os.path.getsize(frontend_path)
        
        if backend_size == frontend_size:
            print(f"  ✅ {filename}: {backend_size/1024:.1f} KB (synced)")
        else:
            print(f"  ❌ {filename}: backend={backend_size/1024:.1f} KB, frontend={frontend_size/1024:.1f} KB (NOT synced)")
            all_synced = False
    
    if all_synced:
        print("\n  ✅ All frontend files are in sync with backend!")
    else:
        print("\n  ⚠️  Some files are out of sync. Run: cp data/processed/*.json frontend/public/static-data/processed/ && cp data/demo/*.json frontend/public/static-data/demo/")


def main():
    """Run all verification checks"""
    verify_daily_data_completeness()
    verify_hourly_data_completeness()
    verify_frontend_sync()
    
    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)


if __name__ == '__main__':
    main()
