import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { statusConfig } from '../utils/labels';

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
};

export default function ProgrammeView() {
  const { t } = useTranslation();
  const { slug, id } = useParams();
  const [programme, setProgramme] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, childRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/data/${id}`),
          axios.get(`${import.meta.env.VITE_API_URL}/data/${id}/children`),
        ]);
        const prog = progRes.data;
        prog.activities = parseMaybeJson(prog.activities, []);
        setProgramme(prog);
        setChildren(childRes.data.map(c => ({
          ...c,
          activities: parseMaybeJson(c.activities, []),
        })));
      } catch (err) {
        console.error('Erreur chargement programme:', err);
        setError(t('programme.load_error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="mx-4 md:mx-8 my-6">
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="mx-4 md:mx-8 my-6">
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-700 text-sm">{error}</div>
    </div>
  );

  if (!programme) return (
    <div className="mx-4 md:mx-8 my-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">{t('programme.not_found')}</div>
    </div>
  );

  const statuses = statusConfig();
  const sc = statuses[programme.status] || statuses.pending;

  return (
    <div className="mx-4 md:mx-8 my-6 space-y-6">
      {/* Programme header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {t('programme.programme')}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">{programme.initiative}</h1>
            {programme.description && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{programme.description}</p>
            )}
          </div>
          <Link
            to={`/${slug}/edit/${programme.id}`}
            className="shrink-0 inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {t('common.edit')}
          </Link>
        </div>

        {/* Programme details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          {programme.commune && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.commune')}</div>
              <div className="text-sm text-gray-700">{programme.commune}</div>
            </div>
          )}
          {programme.zone_intervention && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.zone_intervention')}</div>
              <div className="text-sm text-gray-700">{programme.zone_intervention}</div>
            </div>
          )}
          {programme.actor_type && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.actor_type')}</div>
              <div className="text-sm text-gray-700">{programme.actor_type}</div>
            </div>
          )}
          {programme.person_name && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.contact')}</div>
              <div className="text-sm text-gray-700">{programme.person_name}</div>
              {programme.contact_phone && <div className="text-xs text-gray-400">{programme.contact_phone}</div>}
            </div>
          )}
          {programme.website && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.website')}</div>
              <a href={programme.website.startsWith('http') ? programme.website : `https://${programme.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 hover:underline">{programme.website.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
          {programme.year && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.year')}</div>
              <div className="text-sm text-gray-700">{programme.year}</div>
            </div>
          )}
          {programme.organisation && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.organisation')}</div>
              <div className="text-sm text-gray-700">{programme.organisation}</div>
            </div>
          )}
          {programme.bailleurs && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.bailleurs')}</div>
              <div className="text-sm text-gray-700 whitespace-pre-line">{programme.bailleurs}</div>
            </div>
          )}
          {programme.point_contact && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.point_contact')}</div>
              <div className="text-sm text-gray-700">{programme.point_contact}</div>
            </div>
          )}
          {programme.duree && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('form.duration')}</div>
              <div className="text-sm text-gray-700">{programme.duree}</div>
            </div>
          )}
        </div>

        {/* Activities */}
        {programme.activities && programme.activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {programme.activities.map((a, idx) => (
                <span key={idx} className="inline-block text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">{a}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub-initiatives section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">{t('programme.initiatives')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('programme.initiatives_count', { count: children.length })}</p>
          </div>
          <Link
            to={`/${slug}/submit?parent_id=${programme.id}`}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            {t('programme.add_initiative')}
          </Link>
        </div>

        {children.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            <p className="text-gray-400 text-sm">{t('programme.no_initiatives')}</p>
            <p className="text-gray-300 text-xs mt-1">{t('programme.no_initiatives_hint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {children.map((child) => {
              const csc = statuses[child.status] || statuses.pending;
              return (
                <div key={child.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800">{child.initiative || t('common.unnamed')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {child.commune || child.village || t('common.unknown_location')}
                      {child.locations && child.locations.length > 1 && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
                          {t('programme.locations_count', { count: child.locations.length })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${csc.bg} ${csc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${csc.dot}`} />
                    {csc.label}
                  </span>
                  <Link
                    to={`/${slug}/edit/${child.id}`}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    title={t('common.edit')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="flex items-center gap-4">
        <Link to={`/${slug}/map`} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
          {t('programme.back_to_map')}
        </Link>
        <Link to={`/${slug}/admin`} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
          {t('programme.dashboard')}
        </Link>
      </div>
    </div>
  );
}
