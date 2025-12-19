import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import MapView from './MapView';
import ListView from './ListView';
import SearchBar from './SearchBar';
import Filters from './Filters';
import Sidebar from './Sidebar';

const parseActivities = (a) => {
  if (Array.isArray(a)) return a;
  if (typeof a === 'string') {
    try { return JSON.parse(a); } catch (_) { return a ? [a] : []; }
  }
  return [];
};

const parseExtra = (e) => {
  if (!e) return {};
  if (typeof e === 'object') return e;
  try { return JSON.parse(e); } catch (_) { return {}; }
};

const parsePoint = (pt) => ({
  ...pt,
  activities: parseActivities(pt.activities),
  extra_fields: parseExtra(pt.extra_fields),
  photos: pt.photos || []
});

export default function CartoModule() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [filters, setFilters] = useState({
    activities: [],
    actor: '',
    commune: ''
  });
  const [basemap, setBasemap] = useState('streets');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/data?status=approved`)
      .then(res => setRaw(res.data.map(parsePoint)))
      .catch(() => setError("Impossible de charger les initiatives."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return raw.filter((pt) => {
      // search
      if (term) {
        const haystack = [
          pt.initiative,
          pt.description,
          pt.commune,
          pt.village,
          pt.actor_type,
          ...(pt.activities || []),
          ...Object.entries(pt.extra_fields || {}).map(([k, v]) => `${k}: ${v}`)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      // activities
      if (filters.activities.length > 0) {
        const acts = (pt.activities || []).map(a => a.toLowerCase());
        const match = filters.activities.some(f => acts.includes(f.toLowerCase()));
        if (!match) return false;
      }
      // actor type
      if (filters.actor && pt.actor_type) {
        if (!pt.actor_type.toLowerCase().includes(filters.actor.toLowerCase())) return false;
      }
      // commune
      if (filters.commune && pt.commune) {
        if (!pt.commune.toLowerCase().includes(filters.commune.toLowerCase())) return false;
      }
      return true;
    });
  }, [raw, search, filters]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) || null,
    [filtered, selectedId]
  );

  const onSelect = useCallback((id, point) => {
    setSelectedId(id);
    if (point && point.lat && point.lon) {
      setFocusPoint(point);
    } else {
      const found = filtered.find(p => p.id === id) || raw.find(p => p.id === id);
      if (found) setFocusPoint(found);
    }
  }, [filtered, raw]);

  const uniqueActivities = useMemo(() => {
    const set = new Set();
    raw.forEach(pt => (pt.activities || []).forEach(a => set.add(a)));
    return Array.from(set);
  }, [raw]);

  const uniqueActors = useMemo(() => {
    const set = new Set();
    raw.forEach(pt => { if (pt.actor_type) set.add(pt.actor_type); });
    return Array.from(set);
  }, [raw]);

  const uniqueCommunes = useMemo(() => {
    const set = new Set();
    raw.forEach(pt => { if (pt.commune) set.add(pt.commune); });
    return Array.from(set);
  }, [raw]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const actors = {};
    filtered.forEach(pt => {
      const a = pt.actor_type || 'Non renseigné';
      actors[a] = (actors[a] || 0) + 1;
    });
    return { total, actors };
  }, [filtered]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <div className="w-full md:w-96 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <SearchBar value={search} onChange={setSearch} suggestions={filtered.slice(0,5)} onSelect={onSelect} />
        </div>
        <div className="p-4 border-b">
          <Filters
            filters={filters}
            setFilters={setFilters}
            activities={uniqueActivities}
            actors={uniqueActors}
            communes={uniqueCommunes}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ListView items={filtered} onSelect={onSelect} selectedId={selectedId} />
        </div>
      </div>

      <div className="flex-1 relative z-0 md:pr-96">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/60">Chargement…</div>}
        {!loading && !error && (
          <MapView
            points={filtered}
            selectedId={selectedId}
            onSelect={onSelect}
            basemap={basemap}
            setBasemap={setBasemap}
            focusPoint={focusPoint}
            activeActivities={filters.activities}
          />
        )}
        {error && <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-white/80">{error}</div>}

        <Sidebar
          item={selected}
          stats={stats}
          onClose={() => setSelectedId(null)}
          onFocusMap={() => selected && onSelect(selected.id)}
        />
      </div>
    </div>
  );
}
