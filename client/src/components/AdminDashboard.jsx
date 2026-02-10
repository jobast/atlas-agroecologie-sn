import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDytael } from '../context/DytaelContext';
import { formatActorLabel, formatActivityLabel, statusConfig } from '../utils/labels';

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const activityBadgeClass = (a) => {
  if (!a) return 'bg-gray-100 text-gray-500';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-50 text-green-700';
  if (key.includes('transformation')) return 'bg-orange-50 text-orange-700';
  if (key.includes('formation')) return 'bg-blue-50 text-blue-700';
  if (key.includes('gouver') || key.includes('plaidoyer')) return 'bg-purple-50 text-purple-700';
  if (key.includes('commerce')) return 'bg-yellow-50 text-yellow-700';
  return 'bg-gray-50 text-gray-600';
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { currentDytael, isNational } = useDytael();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {};
        if (currentDytael) params.dytael_id = currentDytael.id;
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/data`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        const normalized = res.data.map((i) => ({
          ...i,
          activities: parseMaybeJson(i.activities, []),
          social_media: parseMaybeJson(i.social_media, []),
          videos: parseMaybeJson(i.videos, []),
          extra_fields: parseMaybeJson(i.extra_fields, null),
        }));
        setItems(normalized);
      } catch (err) {
        console.error('Erreur chargement données', err);
        if (err.response?.status === 403) {
          setError(t('admin.access_denied'));
        } else {
          setError(t('admin.load_error'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDytael]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  const updateStatusLocally = (ids, status) => {
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, status } : i)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const handleValidate = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          axios.put(`${import.meta.env.VITE_API_URL}/data/${id}/validate`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      updateStatusLocally(ids, 'approved');
    } catch (err) {
      console.error('Erreur validation', err);
      setError(t('admin.validate_error'));
    }
  };

  const handleReject = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          axios.put(`${import.meta.env.VITE_API_URL}/data/${id}/reject`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      updateStatusLocally(ids, 'rejected');
    } catch (err) {
      console.error('Erreur rejet', err);
      setError(t('admin.reject_error'));
    }
  };

  const filtered = useMemo(() => {
    let arr = [...items];
    if (filterStatus !== 'all') {
      arr = arr.filter((i) => i.status === filterStatus);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      arr = arr.filter(i => {
        const haystack = [
          i.initiative, i.description, i.commune, i.village,
          i.actor_type, i.person_name, i.contact_email, i.contact_phone,
          ...(i.activities || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(term);
      });
    }
    if (sortBy === 'newest') {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'name') {
      arr.sort((a, b) => (a.initiative || '').localeCompare(b.initiative || ''));
    }
    return arr;
  }, [items, filterStatus, sortBy, search]);

  const stats = useMemo(() => {
    const base = { total: items.length, pending: 0, approved: 0, rejected: 0, delete_requested: 0 };
    items.forEach((i) => {
      base[i.status] = (base[i.status] || 0) + 1;
    });
    return base;
  }, [items]);

  const sc = statusConfig();

  if (loading) return (
    <div className="mx-4 md:mx-8 my-6">
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-4 md:mx-8 my-6 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-800">{t('admin.dashboard')}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{isNational ? t('admin.national_view') : currentDytael?.name || ''} — {t('admin.initiative_management')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'total', label: t('admin.total'), value: stats.total, color: 'text-gray-800', accent: 'bg-gray-100' },
          { key: 'pending', label: sc.pending.label, value: stats.pending || 0, color: 'text-amber-600', accent: 'bg-amber-50' },
          { key: 'approved', label: t('status.approved_plural'), value: stats.approved || 0, color: 'text-emerald-600', accent: 'bg-emerald-50' },
          { key: 'rejected', label: t('status.rejected_plural'), value: stats.rejected || 0, color: 'text-red-600', accent: 'bg-red-50' },
        ].map(card => (
          <button
            key={card.key}
            type="button"
            onClick={() => setFilterStatus(card.key === 'total' ? 'all' : card.key)}
            className={`bg-white rounded-xl border px-5 py-4 text-left transition-all hover:shadow-sm ${
              (filterStatus === card.key || (card.key === 'total' && filterStatus === 'all'))
                ? 'border-emerald-300 ring-2 ring-emerald-100'
                : 'border-gray-200'
            }`}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${card.color}`}>{card.value}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-col gap-3 px-5 py-4">
          {/* Search + Sort row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.search_placeholder')}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-8 py-2.5 text-sm bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-lg bg-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
              >
                <option value="newest">{t('admin.sort_newest')}</option>
                <option value="oldest">{t('admin.sort_oldest')}</option>
                <option value="name">{t('admin.sort_name')}</option>
              </select>
              <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length > 1 ? t('common.results_count_plural', { count: filtered.length }) : t('common.results_count', { count: filtered.length })}</span>
            </div>
          </div>
          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'pending', 'approved', 'rejected', 'delete_requested'].map(status => {
              const conf = status === 'all'
                ? { label: t('common.all'), bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
                : sc[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filterStatus === status
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : `${conf.bg} ${conf.border} ${conf.text} border hover:opacity-80`
                  }`}
                >
                  {conf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-emerald-50/50 flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">{selectedIds.length > 1 ? t('common.selected_plural', { count: selectedIds.length }) : t('common.selected', { count: selectedIds.length })}</span>
            <button
              onClick={() => handleValidate(selectedIds)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {t('common.validate')}
            </button>
            <button
              onClick={() => handleReject(selectedIds)}
              className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              {t('common.reject')}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-gray-500 hover:text-gray-700 ml-auto transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-t border-b border-gray-200">
                <th className="px-3 py-3 w-8"></th>
                <th className="px-2 py-3 w-8">
                  <div
                    onClick={toggleSelectAll}
                    className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      selectedIds.length === filtered.length && filtered.length > 0
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </div>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.initiative_col')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('admin.actor_col')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('admin.activities_col')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status_col')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('admin.date_col')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">{t('admin.actions_col')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    <p className="text-gray-400">{filterStatus !== 'all' ? t('admin.no_initiatives_status') : t('admin.no_initiatives')}.</p>
                  </td>
                </tr>
              ) : filtered.map((i) => {
                const rowSc = sc[i.status] || sc.pending;
                const isExpanded = expandedId === i.id;
                return (
                  <React.Fragment key={i.id}>
                    <tr className={`hover:bg-emerald-50/40 transition-colors ${isExpanded ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-3 py-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : i.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                      </td>
                      <td className="px-2 py-3.5 align-top">
                        <div
                          onClick={() => toggleSelect(i.id)}
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                            selectedIds.includes(i.id)
                              ? 'bg-emerald-600 border-emerald-600'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          {selectedIds.includes(i.id) && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="max-w-[200px]">
                          <div className="font-semibold text-gray-800 truncate">
                            {i.initiative || t('common.unnamed')}
                            {i.children && i.children.length > 0 && (
                              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
                                {t('admin.programme_badge', { count: i.children.length })}
                              </span>
                            )}
                            {i.parent && (
                              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                {t('admin.sub_initiative')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {i.location_type === 'zone'
                              ? <span className="text-blue-500">{t('admin.zone_label', { location: i.commune || i.village || t('admin.zone_not_specified') })}</span>
                              : (
                                <>
                                  {i.village || i.commune || t('common.unknown_location')}
                                  {i.locations && i.locations.length > 1 && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
                                      +{i.locations.length - 1}
                                    </span>
                                  )}
                                </>
                              )
                            }
                            {i.parent && (
                              <span className="ml-1 text-gray-300">({i.parent.initiative})</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden md:table-cell">
                        <span className="text-gray-600 whitespace-nowrap">{formatActorLabel(i.actor_type)}</span>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(i.activities || []).length > 0
                            ? i.activities.slice(0, 2).map((a, idx) => (
                                <span key={idx} className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${activityBadgeClass(a)}`}>
                                  {formatActivityLabel(a)}
                                </span>
                              ))
                            : <span className="text-gray-400">{t('common.none')}</span>
                          }
                          {(i.activities || []).length > 2 && (
                            <span className="text-xs text-gray-400">+{i.activities.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${rowSc.bg} ${rowSc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rowSc.dot}`} />
                          {rowSc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden sm:table-cell">
                        <span className="text-xs text-gray-400">{i.created_at ? new Date(i.created_at).toLocaleDateString('fr-FR') : t('common.none')}</span>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/${slug}/edit/${i.id}`}
                            title={t('common.edit')}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </Link>
                          {i.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleValidate([i.id])}
                              title={t('common.validate')}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReject([i.id])}
                            title={t('common.reject')}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="8" className="px-5 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                            {i.description && <DetailItem label="Description" value={i.description} wide />}
                            {i.zone_intervention && <DetailItem label="Zone d'intervention" value={i.zone_intervention} />}
                            {i.person_name && <DetailItem label="Contact" value={i.person_name} />}
                            {i.contact_phone && <DetailItem label="Téléphone" value={i.contact_phone} />}
                            {i.contact_email && <DetailItem label="Email" value={i.contact_email} link={`mailto:${i.contact_email}`} />}
                            {i.website && <DetailItem label="Site web" value={i.website.replace(/^https?:\/\//, '')} link={i.website.startsWith('http') ? i.website : `https://${i.website}`} />}
                            {i.year && <DetailItem label="Année" value={i.year} />}
                            {i.lat && i.lon && <DetailItem label="Coordonnées" value={`${i.lat}, ${i.lon}`} />}
                            {i.social_media?.length > 0 && <DetailItem label="Réseaux sociaux" value={i.social_media.map(s => `${s.platform}: ${s.url}`).join(', ')} />}
                            {i.videos?.length > 0 && <DetailItem label="Vidéos" value={i.videos.filter(Boolean).join(', ')} />}
                            <DetailItem label="ID utilisateur" value={i.user_id || t('common.none')} />
                            <DetailItem label="Créé le" value={i.created_at ? new Date(i.created_at).toLocaleString('fr-FR') : t('common.none')} />
                            {i.extra_fields && Object.keys(i.extra_fields).length > 0 && (
                              Object.entries(i.extra_fields).map(([k, v]) => v ? <DetailItem key={k} label={k} value={v} /> : null)
                            )}
                          </div>
                          {i.locations && i.locations.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t('admin.locations_count', { count: i.locations.length })}</div>
                              <div className="space-y-1.5">
                                {i.locations.map((loc, idx) => (
                                  <div key={loc.id || idx} className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${loc.is_primary ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    <span className="font-medium">{loc.label || `Lieu ${idx + 1}`}</span>
                                    {loc.commune && <span className="text-gray-400">— {loc.commune}</span>}
                                    {loc.lat && loc.lon && <span className="text-gray-300 text-xs">({loc.lat}, {loc.lon})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {i.photos && i.photos.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Photos</div>
                              <div className="flex gap-2 flex-wrap">
                                {i.photos.map((p, idx) => (
                                  <a key={idx} href={p} target="_blank" rel="noopener noreferrer">
                                    <img src={p} alt="photo" className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {i.parent && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('admin.parent_programme')}</div>
                              <Link to={`/${slug}/programme/${i.parent.id}`} className="text-sm text-emerald-700 hover:underline font-medium">{i.parent.initiative}</Link>
                            </div>
                          )}
                          {i.children && i.children.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t('admin.sub_initiatives_count', { count: i.children.length })}</div>
                              <div className="space-y-1.5">
                                {i.children.map(child => (
                                  <div key={child.id} className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${(sc[child.status] || sc.pending).dot}`} />
                                    <span className="font-medium">{child.initiative}</span>
                                    {child.commune && <span className="text-gray-400">— {child.commune}</span>}
                                  </div>
                                ))}
                              </div>
                              <Link to={`/${slug}/programme/${i.id}`} className="inline-block mt-2 text-xs text-emerald-700 hover:underline font-medium">{t('admin.view_programme')}</Link>
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                            <Link
                              to={`/${slug}/edit/${i.id}`}
                              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              {t('common.edit')}
                            </Link>
                            {i.children && i.children.length > 0 && (
                              <Link
                                to={`/${slug}/programme/${i.id}`}
                                className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                              >
                                Programme
                              </Link>
                            )}
                            <button
                              onClick={() => handleValidate([i.id])}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              {t('common.validate')}
                            </button>
                            <button
                              onClick={() => handleReject([i.id])}
                              className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                              {t('common.reject')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, link, wide }) {
  return (
    <div className={wide ? 'md:col-span-2 lg:col-span-3' : ''}>
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-sm">{value}</a>
      ) : (
        <div className="text-gray-700 text-sm">{value}</div>
      )}
    </div>
  );
}
