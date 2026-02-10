import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatActorLabel } from '../utils/labels';

const colorForActivity = (a) => {
  if (!a) return 'bg-gray-300';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-500';
  if (key.includes('transformation')) return 'bg-orange-500';
  if (key.includes('formation')) return 'bg-blue-500';
  if (key.includes('gouver')) return 'bg-purple-500';
  if (key.includes('commerce')) return 'bg-yellow-400';
  return 'bg-gray-300';
};

export default function ListView({ items = [], onSelect, selectedId, slug }) {
  const { t } = useTranslation();
  return (
    <div>
      {items.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p className="text-gray-400 text-sm">{t('list.no_initiatives')}</p>
        </div>
      )}
      {items.map((i) => {
        const mainAct = (i.activities && i.activities[0]) || '';
        const photo = i.photos?.[0];
        const isSelected = selectedId === i.id;
        return (
          <button
            key={i.id}
            onClick={() => onSelect?.(i.id, i)}
            className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-b border-gray-50 transition-all duration-150 ${
              isSelected
                ? 'bg-emerald-50 border-l-3 border-l-emerald-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${colorForActivity(mainAct)}`} aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-800 leading-snug">
                {i.initiative || t('common.unnamed')}
                {i.children && i.children.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
                    {t('admin.programme_badge', { count: i.children.length })}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {i.location_type === 'zone'
                  ? <span>{t('list.zone', { location: i.commune || i.village || t('common.not_specified') })}</span>
                  : (
                    <>
                      {i.commune || i.village || t('common.unknown_location')}
                      {i.locations && i.locations.length > 1 && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600">
                          {t('list.locations_extra', { count: i.locations.length - 1 })}
                        </span>
                      )}
                    </>
                  )
                }
              </div>
              {i.actor_type && (
                <div className="text-xs text-gray-400 mt-0.5">{formatActorLabel(i.actor_type)}</div>
              )}
            </div>
            {photo && (
              <img src={photo} alt="" className="w-11 h-11 object-cover rounded-lg border border-gray-100 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
