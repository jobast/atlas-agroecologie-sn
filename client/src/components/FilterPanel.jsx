import React, { useState } from 'react';

const ACTIVITIES = [
  { key: 'production', label: 'Production' },
  { key: 'transformation', label: 'Transformation' },
  { key: 'commercialisation', label: 'Commercialisation' },
  { key: 'formation', label: 'Formation' },
  { key: 'plaidoyer', label: 'Plaidoyer' },
  { key: 'autre', label: 'Autre' },
  { key: 'informel', label: 'Informel' }
];

const ACTOR_TYPES = [
  { key: 'ONG', label: 'ONG' },
  { key: 'recherche', label: 'Recherche' },
  { key: 'gouvernement', label: 'Gouvernement' },
  { key: 'groupement', label: 'Groupement' },
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'informel', label: 'Informel' },
  { key: 'autre', label: 'Autre' }
];

export default function FilterPanel({ selectedActivities, onActivitiesChange, selectedCommunes, onCommunesChange, selectedActorTypes, onActorTypesChange }) {
  const [filterType, setFilterType] = useState('');

  const handleToggleActivity = (key) => {
    if (selectedActivities.includes(key)) {
      onActivitiesChange(selectedActivities.filter(a => a !== key));
    } else {
      onActivitiesChange([...selectedActivities, key]);
    }
  };

  const handleCommunesChange = (e) => {
    const value = e.target.value;
    const communes = value.split(',').map(c => c.trim()).filter(c => c.length > 0);
    onCommunesChange(communes);
  };

  const handleToggleActorType = (key) => {
    if (selectedActorTypes.includes(key)) {
      onActorTypesChange(selectedActorTypes.filter(a => a !== key));
    } else {
      onActorTypesChange([...selectedActorTypes, key]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="filterType" className="font-semibold mb-2 block">Sélectionner par :</label>
        <select
          id="filterType"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1"
        >
          <option value="activities">Activités</option>
          <option value="communes">Communes</option>
          <option value="actor_types">Type d'acteur</option>
        </select>
      </div>

      {filterType === 'activities' && (
        <div>
          <div className="space-y-2">
            {ACTIVITIES.map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedActivities.includes(key)}
                  onChange={() => handleToggleActivity(key)}
                  className="accent-blue-600"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {filterType === 'communes' && (
        <div>
          <h3 className="font-semibold mb-2">Communes</h3>
          <input
            type="text"
            value={selectedCommunes.join(', ')}
            onChange={handleCommunesChange}
            placeholder="Entrez les communes, séparées par des virgules"
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>
      )}

      {filterType === 'actor_types' && (
        <div>
          <h3 className="font-semibold mb-2">Types d'acteur</h3>
          <div className="space-y-2">
            {ACTOR_TYPES.map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedActorTypes.includes(key)}
                  onChange={() => handleToggleActorType(key)}
                  className="accent-blue-600"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
