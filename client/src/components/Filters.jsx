import React from 'react';

export default function Filters({ filters, setFilters, activities = [], actors = [], communes = [] }) {
  const toggleActivity = (a) => {
    const exists = filters.activities.includes(a);
    setFilters({
      ...filters,
      activities: exists ? filters.activities.filter(x => x !== a) : [...filters.activities, a]
    });
  };

  const formatActivityLabel = (value) => {
    if (!value) return '';
    const lower = value.toLowerCase();
    if (lower === 'other') return 'Autres';
    const withoutUnderscore = value.replace(/_/g, ' ');
    return withoutUnderscore.charAt(0).toUpperCase() + withoutUnderscore.slice(1);
  };

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

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold mb-2">Type d'acteur</h4>
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
              className={`px-2 py-1 rounded border ${filters.actor === a ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200'}`}
            >
              {formatActorLabel(a)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Activités</h4>
        <select
          value=""
          onChange={(e) => { if (e.target.value) toggleActivity(e.target.value); }}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Toutes les activités</option>
          {activities.map(a => <option key={a} value={a}>{formatActivityLabel(a)}</option>)}
        </select>
        {filters.activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filters.activities.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">
                {formatActivityLabel(a)}
                <button type="button" onClick={() => toggleActivity(a)} className="hover:text-green-950">&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-2">Commune</h4>
        <input
          type="text"
          list="communes-list"
          value={filters.commune}
          onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
          className="w-full border rounded px-2 py-1"
        />
        <datalist id="communes-list">
          {communes.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>
    </div>
  );
}
