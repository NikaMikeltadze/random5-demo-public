import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useAppStore } from '../hooks/useAppStore';
import { Location } from '../types';
import L from 'leaflet';

// Fix for default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


const LocationMarker: React.FC = () => {
  const { location, setLocation } = useAppStore();

  const map = useMapEvents({
    click(e) {
      setLocation(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return location === null ? null : (
    <Marker position={location}>
      <Popup>You selected this location. <br /> Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</Popup>
    </Marker>
  );
};

const MapPage: React.FC = () => {
  const { location } = useAppStore();
  const defaultPosition: [number, number] = [location?.lat || 51.505, location?.lng || -0.09];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Select Your Location</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 h-[60vh] md:h-[70vh]">
        <MapContainer center={defaultPosition} zoom={13} scrollWheelZoom={true} className="rounded-lg">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker />
        </MapContainer>
        <div className="mt-4 text-center text-slate-600 dark:text-slate-300">
            Click on the map to drop a pin and select your location of interest.
        </div>
      </div>
    </div>
  );
};

export default MapPage;
