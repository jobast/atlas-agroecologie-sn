import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_BOUNDS = [
  [12.0, -17.6], // South-West (Senegal)
  [16.7, -11.3]  // North-East (Senegal)
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

const activityBadgeStyle = (a) => {
  if (!a) return 'bg-gray-100 text-gray-600';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-50 text-green-700 ring-1 ring-green-200';
  if (key.includes('transformation')) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
  if (key.includes('formation')) return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  if (key.includes('gouver')) return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
  if (key.includes('commerce')) return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
  return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
};

function FitBounds({ points }) {
  return null; // désactivé pour conserver l'emprise par défaut
}

function FullExtentControl({ className = '' }) {
  const map = useMap();
  return (
    <button
      type="button"
      aria-label="Vue globale"
      title="Vue globale"
      onClick={() => map.fitBounds(initialBounds, { padding: [20, 20] })}
      className={`bg-white rounded shadow border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 w-9 h-9 flex items-center justify-center ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8V4h4M4 4l6 6M20 8V4h-4M20 4l-6 6M4 16v4h4M4 20l6-6M20 16v4h-4M20 20l-6-6" />
      </svg>
    </button>
  );
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

export default function MapView({ points = [], selectedId, onSelect, basemap, setBasemap, focusPoint, activeActivities = [], bounds: propBounds }) {
  const initialBounds = propBounds || DEFAULT_BOUNDS;
  const mapRef = useRef();
  const [localBasemap, setLocalBasemap] = useState(basemap || 'streets');
  const currentBasemap = basemap || localBasemap;
  const updateBasemap = setBasemap || setLocalBasemap;
  const basemapOrder = ['streets', 'satellite', 'terrain'];
  const basemapLabel = {
    streets: 'OSM',
    satellite: 'Satellite',
    terrain: 'Relief'
  };

  return (
    <MapContainer
      whenCreated={(map) => {
        mapRef.current = map;
        map.fitBounds(initialBounds, { padding: [20, 20] });
        map.setMinZoom(8);
      }}
      bounds={initialBounds}
      boundsOptions={{ padding: [20, 20] }}
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
        <div className="m-2 flex flex-col gap-2 items-end">
          <button
            type="button"
            aria-label={`Fond: ${basemapLabel[currentBasemap]}`}
            title={`Fond: ${basemapLabel[currentBasemap]}`}
            onClick={() => {
              const idx = basemapOrder.indexOf(currentBasemap);
              const next = basemapOrder[(idx + 1) % basemapOrder.length];
              updateBasemap(next);
            }}
            className="bg-white rounded shadow border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 w-9 h-9 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4-8 4-8-4 8-4z" />
              <path d="M4 11l8 4 8-4" />
              <path d="M4 15l8 4 8-4" />
            </svg>
          </button>
          <FullExtentControl />
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
                <Popup maxWidth={600} minWidth={420} className="custom-popup">
                  <div className="-mx-3 -my-2">
                    {/* Header */}
                    <div className="bg-emerald-700 px-6 py-5">
                      <h3 className="font-semibold text-white text-base leading-snug">{pt.initiative || 'Sans nom'}</h3>
                      <div className="text-emerald-200 text-sm mt-1.5">{pt.actor_type || 'Type non renseigné'}</div>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5 space-y-5">
                      {/* Activities */}
                      {pt.activities && pt.activities.length > 0 && (
                        <div className="flex flex-wrap gap-2.5">
                          {pt.activities.map((act, i) => (
                            <span key={i} className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${activityBadgeStyle(act)}`}>{act}</span>
                          ))}
                        </div>
                      )}
                      {/* Location */}
                      <div className="flex items-center gap-3 text-gray-700 text-sm">
                        <svg className="w-[18px] h-[18px] shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{pt.commune || pt.village || 'Localisation inconnue'}</span>
                      </div>
                      {/* Website */}
                      {pt.website && (
                        <div className="flex items-center gap-3 text-sm">
                          <svg className="w-[18px] h-[18px] shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                          <a href={pt.website.startsWith('http') ? pt.website : `https://${pt.website}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline truncate">{pt.website.replace(/^https?:\/\//, '')}</a>
                        </div>
                      )}
                      {/* Contact */}
                      {(pt.person_name || pt.contact_email || pt.contact_phone) && (
                        <div className="flex items-start gap-3 text-sm border-t border-gray-100 pt-5">
                          <svg className="w-[18px] h-[18px] shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <div className="space-y-1.5 text-gray-600">
                            {pt.person_name && <div className="font-medium text-gray-800">{pt.person_name}</div>}
                            {pt.contact_phone && <div>{pt.contact_phone}</div>}
                            {pt.contact_email && <div className="text-emerald-700">{pt.contact_email}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
