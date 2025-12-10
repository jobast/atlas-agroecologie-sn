import React from 'react';

const colorForActivity = (a) => {
  if (!a) return 'bg-gray-400';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-500';
  if (key.includes('transformation')) return 'bg-orange-500';
  if (key.includes('formation')) return 'bg-blue-500';
  if (key.includes('gouver')) return 'bg-purple-500';
  if (key.includes('commerce')) return 'bg-yellow-400';
  return 'bg-gray-400';
};

export default function ListView({ items = [], onSelect, selectedId }) {
  return (
    <div className="divide-y">
      {items.length === 0 && (
        <p className="p-4 text-gray-500">Aucune initiative.</p>
      )}
      {items.map((i) => {
        const mainAct = (i.activities && i.activities[0]) || '';
        const photo = i.photos?.[0];
        return (
          <button
            key={i.id}
            onClick={() => onSelect?.(i.id, i)}
            className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 ${selectedId === i.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
          >
            <span className={`w-3 h-3 rounded-full ${colorForActivity(mainAct)}`} aria-hidden />
            <div className="flex-1">
              <div className="font-semibold text-sm">{i.initiative || 'Sans nom'}</div>
              <div className="text-xs text-gray-500">{i.commune || i.village || 'Lieu inconnu'}</div>
            </div>
            {photo && (
              <img src={photo} alt="miniature" className="w-12 h-12 object-cover rounded border" />
            )}
          </button>
        );
      })}
    </div>
  );
}
