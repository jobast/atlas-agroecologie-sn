import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatActorLabel, formatActivityLabel } from '../utils/labels';

export default function Filters({ filters, setFilters, activities = [], actors = [], communes = [] }) {
  const { t } = useTranslation();

  const toggleActivity = (a) => {
    const exists = filters.activities.includes(a);
    setFilters({
      ...filters,
      activities: exists ? filters.activities.filter(x => x !== a) : [...filters.activities, a]
    });
  };

  const hasActiveFilters = filters.actor || filters.activities.length > 0 || filters.commune;

  return (
    <div className="space-y-5 text-sm">
      {/* Actor type pills */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">{t('filters.actor_type')}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...actors].sort((a, b) => {
            const la = a.toLowerCase();
            const lb = b.toLowerCase();
            const isOtherA = la === 'other' || la === 'autre';
            const isOtherB = lb === 'other' || lb === 'autre';
            if (isOtherA && !isOtherB) return 1;
            if (!isOtherA && isOtherB) return -1;
            return 0;
          }).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFilters({ ...filters, actor: filters.actor === a ? '' : a })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                filters.actor === a
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {formatActorLabel(a)}
            </button>
          ))}
        </div>
      </div>

      {/* Activities dropdown + chips */}
      <div>
        <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2.5">{t('filters.activities')}</h4>
        <select
          value=""
          onChange={(e) => { if (e.target.value) toggleActivity(e.target.value); }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
        >
          <option value="">{t('filters.filter_by_activity')}</option>
          {activities.map(a => <option key={a} value={a}>{formatActivityLabel(a)}</option>)}
        </select>
        {filters.activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {filters.activities.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                {formatActivityLabel(a)}
                <button type="button" onClick={() => toggleActivity(a)} className="w-4 h-4 rounded-full hover:bg-emerald-200 inline-flex items-center justify-center transition-colors">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Commune */}
      <div>
        <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2.5">{t('filters.commune')}</h4>
        <input
          type="text"
          list="communes-list"
          placeholder={t('filters.filter_by_commune')}
          value={filters.commune}
          onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
        />
        <datalist id="communes-list">
          {communes.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => setFilters({ activities: [], actor: '', commune: '' })}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t('filters.clear_all')}
        </button>
      )}
    </div>
  );
}
