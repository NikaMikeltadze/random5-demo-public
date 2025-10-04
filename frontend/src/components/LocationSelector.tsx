import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationInfo } from '../types/weather.types';

interface LocationSelectorProps {
  locations: LocationInfo[];
  selectedLocation: string;
  onLocationSelect: (locationId: string) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LocationSelector({
  locations,
  selectedLocation,
  onLocationSelect
}: LocationSelectorProps) {
  const selected = locations.find(loc => loc.id === selectedLocation);
  const center: [number, number] = selected 
    ? [selected.coordinates.lat, selected.coordinates.lon]
    : [42.0, 43.0]; // Georgia center

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-nasa-blue">Select Location</h2>
      
      {/* Dropdown selector */}
      <div className="mb-4">
        <select
          value={selectedLocation}
          onChange={(e) => onLocationSelect(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-nasa-blue"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <div className="h-80 rounded-lg overflow-hidden border border-gray-700">
        <MapContainer
          center={center}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={center} />
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.coordinates.lat, loc.coordinates.lon]}
              eventHandlers={{
                click: () => onLocationSelect(loc.id)
              }}
            >
              <Popup>
                <div className="text-gray-900">
                  <strong>{loc.name}</strong>
                  <br />
                  Lat: {loc.coordinates.lat.toFixed(4)}
                  <br />
                  Lon: {loc.coordinates.lon.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected location info */}
      {selected && (
        <div className="mt-4 p-4 bg-gray-700 rounded">
          <h3 className="font-semibold text-lg">{selected.name}</h3>
          <p className="text-sm text-gray-300">
            Coordinates: {selected.coordinates.lat.toFixed(4)}, {selected.coordinates.lon.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}
