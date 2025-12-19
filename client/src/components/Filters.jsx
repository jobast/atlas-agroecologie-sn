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

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold mb-2">Activités</h4>
        <div className="flex flex-wrap gap-2">
          {activities.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleActivity(a)}
              className={`px-2 py-1 rounded border ${filters.activities.includes(a) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200'}`}
            >
              {formatActivityLabel(a)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Type d’acteur</h4>
        <select
          value={filters.actor}
          onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Tous</option>
          {actors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
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
