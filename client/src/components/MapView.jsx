import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const initialBounds = [
  [12.45, -16.78], // South-West
  [13.23, -15.70]  // North-East
];

const baseGreen = '#16a34a';

const colorForActivity = (a) => {
  if (!a) return baseGreen;
  const key = a.toLowerCase();
  if (key.includes('production')) return '#22c55e';
  if (key.includes('transformation')) return '#f97316';
  if (key.includes('formation')) return '#3b82f6';
  if (key.includes('gouver')) return '#8b5cf6';
  if (key.includes('commerce')) return '#facc15';
  return baseGreen;
};

function FitBounds({ points }) {
  return null; // désactivé pour conserver l'emprise par défaut
}

function Recenter({ points, selectedId, focusPoint }) {
  const map = useMap();
  useEffect(() => {
    const target = focusPoint || points.find(p => p.id === selectedId);
    if (!target || !target.lat || !target.lon) return;
    const lat = parseFloat(target.lat);
    const lon = parseFloat(target.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const currentZoom = map.getZoom() || 10;
      const targetZoom = Math.max(currentZoom, 13); // zoom village
      map.flyTo([lat, lon], targetZoom, { duration: 0.5 });
    }
  }, [points, selectedId, focusPoint, map]);
  return null;
}

export default function MapView({ points = [], selectedId, onSelect, basemap, setBasemap, focusPoint, activeActivities = [] }) {
  const mapRef = useRef();
  const [localBasemap, setLocalBasemap] = useState(basemap || 'streets');
  const currentBasemap = basemap || localBasemap;
  const updateBasemap = setBasemap || setLocalBasemap;

  return (
    <MapContainer
      whenCreated={(map) => {
        mapRef.current = map;
        map.setView([12.84, -16.24], 10);
      }}
      center={[12.84, -16.24]}
      zoom={10}
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
      <MarkerClusterGroup
        chunkedLoading
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        zoomToBoundsOnClick
        maxClusterRadius={(z) => (z <= 7 ? 80 : z <= 9 ? 60 : z <= 11 ? 40 : 20)}
        iconCreateFunction={(cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 32 : count < 50 ? 40 : 48;
          return L.divIcon({
            html: `<div style="background:#065f46;color:white;border:2px solid white;border-radius:9999px;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${count}</div>`,
            className: 'cluster-icon'
          });
        }}
      >
        {points
          .map(pt => ({
            ...pt,
            latNum: parseFloat(pt.lat),
            lonNum: parseFloat(pt.lon)
          }))
          .filter(pt => !Number.isNaN(pt.latNum) && !Number.isNaN(pt.lonNum))
          .map((pt) => {
            const mainAct = (pt.activities && pt.activities[0]) || '';
            const useActivityPalette = (activeActivities || []).length > 0;
            const color = useActivityPalette ? colorForActivity(mainAct) : baseGreen;
            const isSelected = pt.id === selectedId;
            const icon = L.divIcon({
              html: `<div style="background:${color};width:${isSelected ? 28 : 14}px;height:${isSelected ? 28 : 14}px;border:${isSelected ? 3 : 2}px solid white;border-radius:9999px;"></div>`,
              className: ''
            });
            return (
              <Marker
                key={pt.id}
                position={[pt.latNum, pt.lonNum]}
                icon={icon}
                eventHandlers={{ click: () => onSelect?.(pt.id, pt) }}
              >
                <Popup>
                  <div className="text-sm space-y-1">
                    <div className="font-semibold">{pt.initiative || 'Sans nom'}</div>
                    <div className="text-gray-700">{pt.commune || pt.village || 'Localisation inconnue'}</div>
                    <div className="text-gray-600">{pt.actor_type || 'Type non renseigné'}</div>
                    {pt.activities && pt.activities.length > 0 && (
                      <div className="text-gray-600">Activités : {pt.activities.join(', ')}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
