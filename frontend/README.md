# Will It Rain On My Parade? - Frontend Dashboard

A React + TypeScript + Vite dashboard for visualizing weather probabilities from NASA POWER data.

## Features

- 🗺️ **Interactive Map**: Select from three Georgian cities (Tbilisi, Batumi, Kutaisi)
- 📅 **Date Selection**: Pick any date to see weather event probabilities
- 📊 **Probability Display**: Color-coded risk levels for extreme weather events
  - Heavy rain (>10mm)
  - Extreme heat (>35°C)
  - High wind (>10 m/s)
- 📈 **Trend Charts**: Historical trends with statistical significance
- 🎯 **Quick Demos**: Preset queries for instant demonstration
- ⌨️ **Keyboard Shortcuts**: Fast navigation (1/2/3 for cities, R to reset)
- 📥 **CSV Export**: Download data with NASA attribution

## Quick Start

```bash
# Install dependencies
npm install

# Create symlink to data directory (if not already present)
cd public && ln -s ../../data data && cd ..

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dashboard will be available at `http://localhost:5173`

**Note**: The `public/data` symlink allows the frontend to access the pre-processed weather data files. This symlink is already included in the repository.

## Data Sources

The dashboard loads pre-processed JSON files from `/data` directory:
- `data/processed/{city}_daily_stats.json` - Daily statistics by location
- `data/demo/all_locations_summary.json` - Climate summaries
- `data/demo/preset_demo_queries.json` - Demo query presets

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── LocationSelector.tsx
│   │   ├── DatePicker.tsx
│   │   ├── ProbabilityDisplay.tsx
│   │   ├── TrendChart.tsx
│   │   ├── StatsCard.tsx
│   │   └── ExportButton.tsx
│   ├── utils/           # Utility functions
│   │   ├── dataLoader.ts
│   │   ├── dateHelpers.ts
│   │   └── csvExport.ts
│   ├── types/           # TypeScript type definitions
│   │   └── weather.types.ts
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles (Tailwind)
├── public/              # Static assets
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **React Leaflet** - Interactive maps
- **date-fns** - Date manipulation
- **lucide-react** - Icons

## Development

### Requirements

- Node.js 18+ 
- npm 9+

### Configuration

The Vite server is configured to serve files from the parent `data/` directory. This allows the dashboard to load the pre-processed JSON files.

### Keyboard Shortcuts

- `1` - Select Tbilisi
- `2` - Select Batumi
- `3` - Select Kutaisi
- `R` - Reset to default (Tbilisi, August 15)

### Color Scheme

The dashboard uses a dark space theme with NASA branding:
- **NASA Blue**: `#0B3D91` (primary accent)
- **Risk High**: Red (`#EF4444`) - >40% probability
- **Risk Medium**: Yellow (`#F59E0B`) - 20-40% probability
- **Risk Low**: Green (`#10B981`) - <20% probability

## NASA Data Attribution

All data displayed in the dashboard comes from:
- **Dataset**: NASA POWER
- **Source**: https://power.larc.nasa.gov/
- **Citation**: NASA/POWER CERES/MERRA2 Native Resolution Daily and Hourly Data
- **License**: Creative Commons Attribution 4.0 International

## Browser Support

Optimized for Chrome (hackathon requirement). Desktop only, recommended resolution: 1920x1080.

## License

Created for NASA Space Apps 2025 Challenge
