import React, { useMemo } from 'react';
import type { Location } from '../types';
import { Card } from './Card';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// FIX: Default leaflet marker icon path issue with bundlers like Webpack.
// This is a common workaround to ensure marker icons are displayed correctly.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://aistudiocdn.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://aistudiocdn.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://aistudiocdn.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: Location;
  onLocationChange: (location: Location) => void;
}

// FIX: A helper component to update the map view when the location changes.
// It must be a child of MapContainer to use the useMap hook.
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    React.useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};


export const LocationSelector: React.FC<LocationSelectorProps> = ({ locations, selectedLocation, onLocationChange }) => {

  // FIX: Derive map position from props.
  const mapPosition = useMemo((): [number, number] => 
    [selectedLocation.lat, selectedLocation.lon], 
    [selectedLocation]
  );

  // FIX: Implement the change handler for the select dropdown.
  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocationName = event.target.value;
    const newLocation = locations.find(loc => loc.name === newLocationName);
    if (newLocation) {
      onLocationChange(newLocation);
    }
  };

  return (
    <Card 
        title="Select Location" 
        className="h-full" // Keep h-full to match sibling, but internal layout will be robust
    >
        <div className="flex flex-col h-full">
            <div>
                <select
                    value={selectedLocation.name}
                    onChange={handleLocationChange}
                    className="w-full p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {locations.map(loc => (
                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                    ))}
                </select>
            </div>
            
            {/* This container will now have a fixed height, making it visible on all screen sizes */}
            <div className="relative my-4 rounded-lg overflow-hidden flex-grow h-80">
                <MapContainer center={mapPosition} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapPosition}></Marker>
                    <MapUpdater center={mapPosition} zoom={6} />
                </MapContainer>
            </div>

            <div className="text-center text-sm text-slate-400 pt-2">
                <p className="font-semibold">{selectedLocation.name}</p>
                <p>Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</p>
            </div>
        </div>
    </Card>
  );
};