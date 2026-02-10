import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import MapView from './MapView';
import ListView from './ListView';
import SearchBar from './SearchBar';
import Filters from './Filters';
import Sidebar from './Sidebar';
import { useDytael } from '../context/DytaelContext';

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

const normalizeActivity = (a) => {
  if (!a || typeof a !== 'string') return '';
  let s = a.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/,\s*$/, '');
  if (s.toLowerCase() === 'other') s = 'Autres';
  return s;
};

const parsePoint = (pt) => ({
  ...pt,
  activities: parseActivities(pt.activities).map(normalizeActivity).filter(Boolean),
  extra_fields: parseExtra(pt.extra_fields),
  photos: pt.photos || []
});

export default function CartoModule() {
  const { t } = useTranslation();
  const { currentDytael, isNational, bounds } = useDytael();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('list');
  const [filters, setFilters] = useState({
    activities: [],
    actor: '',
    commune: ''
  });
  const [basemap, setBasemap] = useState('streets');

  useEffect(() => {
    const params = new URLSearchParams({ status: 'approved' });
    if (currentDytael) params.set('dytael_id', currentDytael.id);
    axios.get(`${import.meta.env.VITE_API_URL}/data?${params}`)
      .then(res => setRaw(res.data.map(parsePoint)))
      .catch(() => setError(t('carto.load_error')))
      .finally(() => setLoading(false));
  }, [currentDytael]);

  // Sub-initiatives are already filtered out by the API (parent_id IS NULL for public status queries).
  // However, programmes with children should show their children on the map too.
  // We fetch children for programmes to show their markers.
  const [programmeChildren, setProgrammeChildren] = useState([]);

  useEffect(() => {
    // For each programme parent in raw, fetch its children's map points
    const programmes = raw.filter(r => r.children && r.children.length > 0);
    if (programmes.length === 0) {
      setProgrammeChildren([]);
      return;
    }
    const params = new URLSearchParams({ status: 'approved', include_children: 'true' });
    if (currentDytael) params.set('dytael_id', currentDytael.id);
    axios.get(`${import.meta.env.VITE_API_URL}/data?${params}`)
      .then(res => {
        const allItems = res.data.map(parsePoint);
        // Only keep the sub-initiatives (those with parent_id)
        const subs = allItems.filter(i => i.parent_id != null);
        setProgrammeChildren(subs);
      })
      .catch(() => setProgrammeChildren([]));
  }, [raw, currentDytael]);

  // Merge raw (root initiatives) with programme children for map display
  const allInitiatives = useMemo(() => {
    // raw already has root initiatives. Add sub-initiatives that aren't duplicated.
    const rootIds = new Set(raw.map(r => r.id));
    const uniqueChildren = programmeChildren.filter(c => !rootIds.has(c.id));
    return [...raw, ...uniqueChildren];
  }, [raw, programmeChildren]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allInitiatives.filter((pt) => {
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
  }, [allInitiatives, search, filters]);

  // Explode multi-locations into individual map points
  const mapPoints = useMemo(() => {
    const pts = [];
    filtered.forEach(init => {
      // Skip zone-type entries (programmes with zone but no GPS)
      if (init.location_type === 'zone') return;
      const locs = init.locations || [];
      if (locs.length === 0 && init.lat && init.lon) {
        pts.push({ ...init, _locId: `${init.id}-0`, _isPrimary: true });
      } else {
        locs.forEach((loc, idx) => {
          if (loc.lat != null && loc.lon != null) {
            pts.push({
              ...init,
              lat: loc.lat,
              lon: loc.lon,
              _locId: `${init.id}-${loc.id || idx}`,
              _locLabel: loc.label,
              _isPrimary: loc.is_primary,
              _totalLocations: locs.filter(l => l.lat != null).length
            });
          }
        });
      }
    });
    return pts;
  }, [filtered]);

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
    const activities = {};
    filtered.forEach(pt => {
      const a = pt.actor_type || t('common.not_provided');
      actors[a] = (actors[a] || 0) + 1;
      (pt.activities || []).forEach(act => {
        const label = act || t('common.not_provided');
        activities[label] = (activities[label] || 0) + 1;
      });
    });
    return { total, actors, activities };
  }, [filtered, t]);

  return (
    <div className="flex flex-col md:flex-row carto-viewport bg-gray-50">
      <div className="order-1 md:order-2 flex-1 relative z-0 md:pr-96">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/60">{t('common.loading_ellipsis')}</div>}
        {!loading && !error && (
          <MapView
            points={mapPoints}
            selectedId={selectedId}
            onSelect={onSelect}
            basemap={basemap}
            setBasemap={setBasemap}
            focusPoint={focusPoint}
            activeActivities={filters.activities}
            bounds={bounds}
          />
        )}
        {error && <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-white/80">{error}</div>}

        <div className="hidden md:block">
          <Sidebar stats={stats} variant="overlay" />
        </div>

        <button
          type="button"
          onClick={() => { setMobilePanelOpen(true); setMobileTab('list'); }}
          className="md:hidden absolute left-4 z-[600] px-4 py-2 rounded-full bg-emerald-700 text-white shadow hover:bg-emerald-800 active:bg-emerald-900 carto-explorer"
        >
          {t('carto.explore')}
        </button>
      </div>

      <div className="order-2 md:order-1 hidden md:flex w-full md:w-96 border-r bg-white flex-col">
        <div className="px-4 pt-4 pb-3">
          <SearchBar value={search} onChange={setSearch} suggestions={filtered.slice(0, 5)} onSelect={onSelect} />
        </div>
        <div className="px-4 pb-4 border-b border-gray-100">
          <Filters
            filters={filters}
            setFilters={setFilters}
            activities={uniqueActivities}
            actors={uniqueActors}
            communes={uniqueCommunes}
          />
        </div>
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500 font-medium">{t('carto.initiatives_count', { count: filtered.length })}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ListView items={filtered} onSelect={onSelect} selectedId={selectedId} />
        </div>
      </div>

      {mobilePanelOpen && (
        <div className="md:hidden fixed inset-0 z-[700]">
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="p-3 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className={`px-3 py-1 rounded-full text-sm border ${mobileTab === 'list' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'border-gray-200 text-gray-700'}`}
                >
                  {t('carto.list')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('filters')}
                  className={`px-3 py-1 rounded-full text-sm border ${mobileTab === 'filters' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'border-gray-200 text-gray-700'}`}
                >
                  {t('carto.filters')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('stats')}
                  className={`px-3 py-1 rounded-full text-sm border ${mobileTab === 'stats' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'border-gray-200 text-gray-700'}`}
                >
                  {t('carto.stats')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="px-3 py-1 rounded border border-gray-200 text-gray-700"
              >
                {t('common.close')}
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {mobileTab === 'list' && (
                <div className="space-y-4">
                  <SearchBar value={search} onChange={setSearch} suggestions={filtered.slice(0, 5)} onSelect={(id, pt) => { onSelect(id, pt); setMobilePanelOpen(false); }} />
                  <ListView items={filtered} onSelect={(id, pt) => { onSelect(id, pt); setMobilePanelOpen(false); }} selectedId={selectedId} />
                </div>
              )}
              {mobileTab === 'filters' && (
                <div className="space-y-4">
                  <SearchBar value={search} onChange={setSearch} suggestions={filtered.slice(0, 5)} onSelect={(id, pt) => { onSelect(id, pt); setMobilePanelOpen(false); }} />
                  <Filters
                    filters={filters}
                    setFilters={setFilters}
                    activities={uniqueActivities}
                    actors={uniqueActors}
                    communes={uniqueCommunes}
                  />
                </div>
              )}
              {mobileTab === 'stats' && (
                <div className="space-y-3">
                  <Sidebar stats={stats} variant="embedded" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
