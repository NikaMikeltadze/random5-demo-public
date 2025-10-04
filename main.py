

import requests
import pandas as pd
from datetime import datetime, timedelta
import time
import json

# City coordinates (latitude, longitude)
CITIES = {
    'Tbilisi': {'lat': 41.7151, 'lon': 44.8271},
    'London': {'lat': 51.5074, 'lon': -0.1278},
    'Madrid': {'lat': 40.4168, 'lon': -3.7038},
    'Hamburg': {'lat': 53.5511, 'lon': 9.9937}
}

# Weather parameters available from NASA POWER API (hourly)
# Temperature and related
PARAMETERS = [
    'T2M',           # Temperature at 2 Meters (°C)
    'T2MDEW',        # Dew Point Temperature at 2 Meters (°C)
    'T2MWET',        # Wet Bulb Temperature at 2 Meters (°C)
    'TS',            # Earth Skin Temperature (°C)
    'QV2M',          # Specific Humidity at 2 Meters (g/kg)
    'RH2M',          # Relative Humidity at 2 Meters (%)
    'PRECTOTCORR',   # Precipitation Corrected (mm/hour)
    'PS',            # Surface Pressure (kPa)
    'WS10M',         # Wind Speed at 10 Meters (m/s)
    'WD10M',         # Wind Direction at 10 Meters (Degrees)
    'WS50M',         # Wind Speed at 50 Meters (m/s)
    'WD50M',         # Wind Direction at 50 Meters (Degrees)
    'ALLSKY_SFC_SW_DWN',  # All Sky Surface Shortwave Downward Irradiance (W/m²)
    'CLRSKY_SFC_SW_DWN',  # Clear Sky Surface Shortwave Downward Irradiance (W/m²)
]

def download_weather_data(city_name, lat, lon, start_date, end_date, 
                         parameters=PARAMETERS, temporal='hourly'):
    """
    Download weather data from NASA POWER API
    
    Parameters:
    -----------
    city_name : str
        Name of the city
    lat : float
        Latitude
    lon : float
        Longitude
    start_date : str
        Start date in format 'YYYYMMDD'
    end_date : str
        End date in format 'YYYYMMDD'
    parameters : list
        List of parameter codes to download
    temporal : str
        Temporal resolution: 'hourly', 'daily', 'monthly'
    
    Returns:
    --------
    pandas.DataFrame or None
    """
    
    base_url = "https://power.larc.nasa.gov/api/temporal/{temporal}/point"
    
    # Join parameters with comma
    params_str = ','.join(parameters)
    
    # Construct API URL
    url = base_url.format(temporal=temporal)
    
    params = {
        'parameters': params_str,
        'community': 'RE',  # Renewable Energy community
        'longitude': lon,
        'latitude': lat,
        'start': start_date,
        'end': end_date,
        'format': 'JSON',
        'time-standard': 'LST'  # Local Solar Time
    }
    
    print(f"\nDownloading data for {city_name}...")
    print(f"Coordinates: {lat}, {lon}")
    print(f"Date range: {start_date} to {end_date}")
    
    try:
        response = requests.get(url, params=params, timeout=120)
        response.raise_for_status()
        
        data = response.json()
        
        if 'properties' in data and 'parameter' in data['properties']:
            # Extract parameter data
            param_data = data['properties']['parameter']
            
            # Create DataFrame
            dfs = []
            for param, values in param_data.items():
                df_temp = pd.DataFrame(list(values.items()), 
                                      columns=['datetime', param])
                dfs.append(df_temp.set_index('datetime'))
            
            # Merge all parameters
            df = pd.concat(dfs, axis=1)
            
            # Reset index to make datetime a column
            df.reset_index(inplace=True)
            
            # Add city information
            df.insert(0, 'city', city_name)
            df.insert(1, 'latitude', lat)
            df.insert(2, 'longitude', lon)
            
            # Convert datetime column
            if temporal == 'hourly':
                # Format: YYYYMMDDHH
                df['datetime'] = pd.to_datetime(df['datetime'], format='%Y%m%d%H')
            elif temporal == 'daily':
                # Format: YYYYMMDD
                df['datetime'] = pd.to_datetime(df['datetime'], format='%Y%m%d')
            
            print(f"✓ Successfully downloaded {len(df)} records")
            return df
            
        else:
            print(f"✗ Error: Unexpected API response format")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error downloading data: {e}")
        return None
    except Exception as e:
        print(f"✗ Error processing data: {e}")
        return None

def save_to_formats(df, city_name, base_filename):
    """
    Save DataFrame to multiple formats
    """
    if df is None or df.empty:
        print(f"No data to save for {city_name}")
        return
    
    # Save to CSV
    csv_filename = f"{base_filename}.csv"
    df.to_csv(csv_filename, index=False)
    print(f"✓ Saved to CSV: {csv_filename}")
    
    # Save to JSON
    json_filename = f"{base_filename}.json"
    df.to_json(json_filename, orient='records', date_format='iso', indent=2)
    print(f"✓ Saved to JSON: {json_filename}")
    
    # Save to Excel (if openpyxl is installed)
    try:
        excel_filename = f"{base_filename}.xlsx"
        df.to_excel(excel_filename, index=False, engine='openpyxl')
        print(f"✓ Saved to Excel: {excel_filename}")
    except ImportError:
        print("  Note: Install openpyxl to enable Excel export (pip install openpyxl)")

def main():
    """
    Main function to download weather data for all cities
    """
    print("=" * 70)
    print("NASA POWER Weather Data Downloader")
    print("=" * 70)
    
    # Get date range from user or use defaults
    print("\nEnter date range for data download:")
    print("Format: YYYYMMDD (e.g., 20240101)")
    
    # Default: last 30 days
    end = datetime.now()
    start = end - timedelta(days=30)
    
    start_input = input(f"Start date (default: {start.strftime('%Y%m%d')}): ").strip()
    end_input = input(f"End date (default: {end.strftime('%Y%m%d')}): ").strip()
    
    start_date = start_input if start_input else start.strftime('%Y%m%d')
    end_date = end_input if end_input else end.strftime('%Y%m%d')
    
    # Choose temporal resolution
    print("\nChoose temporal resolution:")
    print("1. Hourly (detailed, larger files)")
    print("2. Daily (summary)")
    
    temporal_choice = input("Enter choice (1 or 2, default: 1): ").strip()
    temporal = 'hourly' if temporal_choice != '2' else 'daily'
    
    print(f"\nUsing {temporal} temporal resolution")
    print("=" * 70)
    
    all_data = []
    
    # Download data for each city
    for city_name, coords in CITIES.items():
        df = download_weather_data(
            city_name=city_name,
            lat=coords['lat'],
            lon=coords['lon'],
            start_date=start_date,
            end_date=end_date,
            temporal=temporal
        )
        
        if df is not None:
            all_data.append(df)
            
            # Save individual city data
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"weather_{city_name.lower()}_{temporal}_{timestamp}"
            save_to_formats(df, city_name, filename)
        
        # Be nice to the API
        time.sleep(1)
    
    # Combine all cities into one file
    if all_data:
        print("\n" + "=" * 70)
        print("Combining all cities data...")
        combined_df = pd.concat(all_data, ignore_index=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        combined_filename = f"weather_all_cities_{temporal}_{timestamp}"
        save_to_formats(combined_df, "All Cities", combined_filename)
        
        # Print summary statistics
        print("\n" + "=" * 70)
        print("DATA SUMMARY")
        print("=" * 70)
        print(f"Total records: {len(combined_df)}")
        print(f"Cities: {combined_df['city'].nunique()}")
        print(f"Date range: {combined_df['datetime'].min()} to {combined_df['datetime'].max()}")
        print(f"\nParameters included:")
        for col in combined_df.columns:
            if col not in ['city', 'latitude', 'longitude', 'datetime']:
                print(f"  - {col}")
        
        print("\n" + "=" * 70)
        print("Download complete!")
        print("=" * 70)
    else:
        print("\n✗ No data was downloaded successfully")

if __name__ == "__main__":
    main()