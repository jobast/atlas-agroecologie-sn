import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const colorForActivity = (a) => {
  if (!a) return '#9CA3AF';
  const key = a.toLowerCase();
  if (key.includes('production')) return '#22c55e';
  if (key.includes('transformation')) return '#f97316';
  if (key.includes('formation')) return '#3b82f6';
  if (key.includes('gouver')) return '#8b5cf6';
  if (key.includes('commerce')) return '#facc15';
  return '#9CA3AF';
};

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const coords = points.filter(p => p.lat && p.lon);
    if (coords.length === 0) return;
    const latLngs = coords.map(p => [p.lat, p.lon]);
    map.fitBounds(latLngs, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

function Recenter({ points, selectedId, focusPoint }) {
  const map = useMap();
  useEffect(() => {
    const target = focusPoint || points.find(p => p.id === selectedId);
    if (!target || !target.lat || !target.lon) return;
    const lat = parseFloat(target.lat);
    const lon = parseFloat(target.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      map.flyTo([lat, lon], 11, { duration: 0.5 });
    }
  }, [points, selectedId, focusPoint, map]);
  return null;
}

export default function MapView({ points = [], selectedId, onSelect, basemap, setBasemap, focusPoint }) {
  const mapRef = useRef();
  const [localBasemap, setLocalBasemap] = useState(basemap || 'streets');
  const currentBasemap = basemap || localBasemap;
  const updateBasemap = setBasemap || setLocalBasemap;

  return (
    <MapContainer
      whenCreated={(map) => { mapRef.current = map; }}
      center={[14.5, -17.5]}
      zoom={7}
      className="h-full w-full"
    >
      {currentBasemap === 'streets' && (
        <TileLayer
          key="streets"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      {currentBasemap === 'satellite' && (
        <TileLayer
          key="satellite"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      )}
      {currentBasemap === 'terrain' && (
        <TileLayer
          key="terrain"
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        />
      )}
      <div className="leaflet-top leaflet-right z-[1000] pointer-events-auto">
        <div className="m-2 bg-white rounded shadow p-2 text-sm flex items-center gap-2">
          <label className="text-xs text-gray-600">Fond</label>
          <select
            value={currentBasemap}
            onChange={(e) => updateBasemap(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="streets">OSM</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Relief</option>
          </select>
        </div>
      </div>
      <FitBounds points={points} />
      <Recenter points={points} selectedId={selectedId} focusPoint={focusPoint} />
      {points
        .filter(pt => pt.lat && pt.lon)
        .map(pt => {
          const mainAct = (pt.activities && pt.activities[0]) || '';
          const color = colorForActivity(mainAct);
          const isSelected = pt.id === selectedId;
          return (
            <CircleMarker
              key={pt.id}
              center={[parseFloat(pt.lat), parseFloat(pt.lon)]}
              radius={isSelected ? 10 : 7}
              pathOptions={{ color, weight: isSelected ? 3 : 1, fillOpacity: 0.8 }}
              eventHandlers={{ click: () => onSelect?.(pt.id, pt) }}
            >
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
}
