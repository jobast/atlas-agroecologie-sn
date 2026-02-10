import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useDytael } from '../context/DytaelContext';
import { formatActorLabel, formatActivityLabel } from '../utils/labels';

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

const activityBadgeClass = (a) => {
  if (!a) return 'bg-gray-100 text-gray-500';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-50 text-green-700';
  if (key.includes('transformation')) return 'bg-orange-50 text-orange-700';
  if (key.includes('formation')) return 'bg-blue-50 text-blue-700';
  if (key.includes('gouver')) return 'bg-purple-50 text-purple-700';
  if (key.includes('commerce')) return 'bg-yellow-50 text-yellow-700';
  return 'bg-gray-50 text-gray-600';
};

export default function TableView() {
  const { t } = useTranslation();
  const { currentDytael } = useDytael();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('initiative');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedId, setExpandedId] = useState(null);

  const columns = [
    {
      key: 'initiative',
      label: t('table.initiative_col'),
      render: (i) => (
        <div className="max-w-[200px]">
          <div className="font-semibold text-gray-800 truncate">
            {i.initiative || '—'}
            {i.children && i.children.length > 0 && (
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
                Programme · {i.children.length}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {i.location_type === 'zone'
              ? <span className="text-blue-500">Zone : {i.commune || i.village || ''}</span>
              : (
                <>
                  {i.commune || i.village || ''}
                  {i.locations && i.locations.length > 1 && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
                      +{i.locations.length - 1}
                    </span>
                  )}
                </>
              )
            }
          </div>
        </div>
      )
    },
    {
      key: 'actor_type',
      label: t('table.actor_type_col'),
      className: 'hidden sm:table-cell',
      render: (i) => <span className="text-gray-600 whitespace-nowrap">{formatActorLabel(i.actor_type)}</span>
    },
    {
      key: 'activities',
      label: t('table.activities_col'),
      className: 'hidden md:table-cell',
      render: (i) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {(i.activities || []).length > 0
            ? i.activities.slice(0, 3).map((a, idx) => (
                <span key={idx} className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${activityBadgeClass(a)}`}>
                  {formatActivityLabel(a)}
                </span>
              ))
            : <span className="text-gray-400">—</span>
          }
          {(i.activities || []).length > 3 && (
            <span className="text-xs text-gray-400">+{i.activities.length - 3}</span>
          )}
        </div>
      )
    },
    {
      key: 'person_name',
      label: t('table.contact_col'),
      className: 'hidden lg:table-cell',
      render: (i) => (
        <div className="max-w-[160px]">
          {i.person_name ? <div className="text-gray-700 truncate">{i.person_name}</div> : <span className="text-gray-400">—</span>}
          {i.contact_phone && <div className="text-xs text-gray-400 truncate">{i.contact_phone}</div>}
        </div>
      )
    },
    {
      key: 'website',
      label: t('table.website_col'),
      className: 'hidden lg:table-cell',
      render: (i) => i.website ? (
        <a href={i.website.startsWith('http') ? i.website : `https://${i.website}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-xs truncate block max-w-[160px]">
          {i.website.replace(/^https?:\/\//, '')}
        </a>
      ) : <span className="text-gray-400">—</span>
    },
  ];

  useEffect(() => {
    const params = new URLSearchParams({ status: 'approved' });
    if (currentDytael) params.set('dytael_id', currentDytael.id);
    axios.get(`${import.meta.env.VITE_API_URL}/data?${params}`)
      .then(res => {
        const normalized = res.data.map((i) => ({
          ...i,
          activities: parseActivities(i.activities),
          extra_fields: parseExtra(i.extra_fields)
        }));
        setItems(normalized);
      })
      .catch(() => setError(t('common.load_error')))
      .finally(() => setLoading(false));
  }, [currentDytael]);

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
          i.person_name,
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

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 9l4-4 4 4M16 15l-4 4-4-4"/></svg>;
    return <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={sortDir === 'asc' ? 'M8 15l4-4 4 4' : 'M8 9l4 4 4-4'}/></svg>;
  };

  return (
    <div className="mx-4 md:mx-8 my-6">
      {/* Header */}
      <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{t('table.title')}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} {filtered.length !== 1 ? t('common.result_plural') : t('common.result')}</p>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-400 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('table.search')}
              className="border border-gray-200 rounded-lg pl-10 pr-8 py-2.5 text-sm bg-gray-100 placeholder-gray-400 w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="bg-white border border-gray-200 rounded-b-xl p-8 text-sm text-gray-400 text-center">{t('common.loading')}</div>}
      {error && <div className="bg-white border border-gray-200 rounded-b-xl p-8 text-sm text-red-500 text-center">{error}</div>}

      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className={`px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors ${col.className || ''}`}
                      onClick={() => toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        <SortIcon colKey={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((i) => {
                  const isExpanded = expandedId === i.id;
                  return (
                    <React.Fragment key={i.id}>
                      <tr className={`hover:bg-emerald-50/40 transition-colors ${isExpanded ? 'bg-emerald-50/30' : ''}`}>
                        {columns.map(col => (
                          <td key={col.key} className={`px-5 py-3.5 text-gray-700 align-top ${col.className || ''}`}>
                            {col.render ? col.render(i) : (i[col.key] || '—')}
                          </td>
                        ))}
                        <td className="px-3 py-3.5 align-top">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : i.id)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={columns.length + 1} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                              {i.description && <DetailItem label={t('table.description')} value={i.description} />}
                              {i.zone_intervention && <DetailItem label={t('table.zone_intervention')} value={i.zone_intervention} />}
                              {i.person_name && <DetailItem label={t('table.contact')} value={i.person_name} />}
                              {i.contact_phone && <DetailItem label={t('table.phone')} value={i.contact_phone} />}
                              {i.contact_email && <DetailItem label={t('table.email')} value={i.contact_email} link={`mailto:${i.contact_email}`} />}
                              {i.website && <DetailItem label={t('table.website')} value={i.website.replace(/^https?:\/\//, '')} link={i.website.startsWith('http') ? i.website : `https://${i.website}`} />}
                              {i.year && <DetailItem label={t('table.year')} value={i.year} />}
                              {i.lat && i.lon && <DetailItem label={t('table.coordinates')} value={`${i.lat}, ${i.lon}`} />}
                              {i.extra_fields && Object.keys(i.extra_fields).length > 0 && (
                                Object.entries(i.extra_fields).map(([k, v]) => v ? <DetailItem key={k} label={k} value={v} /> : null)
                              )}
                            </div>
                            {i.locations && i.locations.length > 1 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t('table.locations_count', { count: i.locations.length })}</div>
                                <div className="space-y-1.5">
                                  {i.locations.map((loc, idx) => (
                                    <div key={loc.id || idx} className="flex items-center gap-2 text-sm text-gray-600">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${loc.is_primary ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                      <span className="font-medium">{loc.label || t('table.location_n', { n: idx + 1 })}</span>
                                      {loc.commune && <span className="text-gray-400">— {loc.commune}</span>}
                                      {loc.lat && loc.lon && <span className="text-gray-300 text-xs">({loc.lat}, {loc.lon})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-5 py-12 text-center">
                      <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <p className="text-gray-400">{t('table.no_initiatives')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, link }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-sm">{value}</a>
      ) : (
        <div className="text-gray-700 text-sm">{value}</div>
      )}
    </div>
  );
}
