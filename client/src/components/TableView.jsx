import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

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

export default function TableView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('initiative');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/data?status=approved`)
      .then(res => {
        const normalized = res.data.map((i) => ({
          ...i,
          activities: parseActivities(i.activities),
          extra_fields: parseExtra(i.extra_fields)
        }));
        setItems(normalized);
      })
      .catch(() => setError("Impossible de charger les initiatives."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let arr = items;
    if (term) {
      arr = arr.filter(i => {
        const haystack = [
          i.initiative,
          i.description,
          i.commune,
          i.village,
          i.actor_type,
          ...(i.activities || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(term);
      });
    }
    const sorted = [...arr].sort((a, b) => {
      const va = (a[sortKey] ?? '').toString().toLowerCase();
      const vb = (b[sortKey] ?? '').toString().toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-white shadow rounded border mx-4 md:mx-8 my-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Tableau des initiatives</h1>
          <p className="text-sm text-gray-600">Vue tabulaire des initiatives validées</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, commune, acteur, activité...)"
          className="border rounded px-3 py-2 w-full md:w-80"
        />
      </div>

      {loading && <div className="p-4 text-sm text-gray-600">Chargement…</div>}
      {error && <div className="p-4 text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 cursor-pointer select-none align-top ${col.className || ''}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {sortKey === col.key && (
                        <span className="text-xs text-gray-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b hover:bg-emerald-50/60">
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 text-gray-700 align-top ${col.className || ''}`}>
                      {col.render ? col.render(i) : (i[col.key] || '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-4 text-center text-gray-500">
                    Aucune initiative trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const columns = [
  { key: 'initiative', label: 'Initiative', className: 'whitespace-nowrap', render: (i) => <span className="font-medium text-gray-800">{i.initiative || '—'}</span> },
  { key: 'commune', label: 'Commune / Village', className: 'whitespace-nowrap', render: (i) => i.commune || i.village || '—' },
  { key: 'actor_type', label: "Type d'acteur", className: 'hidden sm:table-cell whitespace-nowrap' },
  { key: 'activities', label: 'Activités', className: 'hidden md:table-cell', render: (i) => (i.activities || []).join(', ') || '—' },
  { key: 'year', label: 'Année', className: 'hidden sm:table-cell whitespace-nowrap' },
  { key: 'description', label: 'Description', className: 'hidden lg:table-cell' },
  { key: 'zone_intervention', label: 'Zone intervention', className: 'hidden lg:table-cell' },
  { key: 'person_name', label: 'Contact', className: 'hidden md:table-cell whitespace-nowrap' },
  { key: 'contact_phone', label: 'Téléphone', className: 'hidden md:table-cell whitespace-nowrap' },
  { key: 'contact_email', label: 'Email', className: 'hidden lg:table-cell whitespace-nowrap' },
  { key: 'website', label: 'Site web', className: 'hidden lg:table-cell', },
  { key: 'social_media', label: 'Réseaux sociaux', className: 'hidden xl:table-cell', render: (i) => {
    const sm = i.social_media;
    if (!sm) return '—';
    if (Array.isArray(sm)) return sm.map(s => s.url || s.platform || '').filter(Boolean).join(', ') || '—';
    if (typeof sm === 'string') {
      try { const parsed = JSON.parse(sm); return Array.isArray(parsed) ? parsed.map(s => s.url || s.platform || '').join(', ') || '—' : sm; }
      catch (_) { return sm; }
    }
    return '—';
  }},
  { key: 'videos', label: 'Vidéos', className: 'hidden xl:table-cell', render: (i) => {
    const vids = i.videos;
    if (!vids) return '—';
    if (Array.isArray(vids)) return vids.join(', ') || '—';
    return vids;
  }},
  { key: 'extra_fields', label: 'Champs supplémentaires', className: 'hidden xl:table-cell', render: (i) => {
    const extras = i.extra_fields;
    if (!extras || Object.keys(extras).length === 0) return '—';
    return Object.entries(extras).map(([k,v]) => `${k}: ${v}`).join(' • ');
  }},
  { key: 'status', label: 'Statut', className: 'hidden xl:table-cell whitespace-nowrap' },
  { key: 'created_at', label: 'Créé le', className: 'hidden xl:table-cell whitespace-nowrap', render: (i) => i.created_at ? new Date(i.created_at).toLocaleDateString() : '—' },
  { key: 'lat', label: 'Lat', className: 'hidden 2xl:table-cell whitespace-nowrap' },
  { key: 'lon', label: 'Lon', className: 'hidden 2xl:table-cell whitespace-nowrap' },
];
