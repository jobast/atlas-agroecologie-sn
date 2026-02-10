import React from 'react';

const formatActorLabel = (value) => {
  if (!value) return '';
  const lower = value.toLowerCase().replace(/_/g, ' ').trim();
  if (lower.startsWith('entreprise')) return 'Entreprise';
  if (lower.startsWith('groupement') || lower.includes('gie') || lower.includes('coopérative')) return 'Groupement';
  if (lower.includes('ong') || lower.includes('association')) return 'ONG / Assoc.';
  if (lower.includes('gouvern') || lower.includes('état') || lower.includes('public')) return 'Gouvernement';
  if (lower.includes('recherche') || lower.includes('université')) return 'Recherche';
  if (lower.includes('informel')) return 'Informel';
  if (lower.includes('civile')) return 'Socité civile';
  if (lower === 'other' || lower === 'autre') return 'Autre';
  const clean = value.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

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

export default function ListView({ items = [], onSelect, selectedId }) {
  return (
    <div>
      {items.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p className="text-gray-400 text-sm">Aucune initiative trouvée.</p>
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
              <div className="font-medium text-sm text-gray-800 leading-snug">{i.initiative || 'Sans nom'}</div>
              <div className="text-xs text-gray-400 mt-0.5">{i.commune || i.village || 'Lieu inconnu'}</div>
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
