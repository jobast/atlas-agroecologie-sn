import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export default function FilterPanel({ selectedActivities, onActivitiesChange, selectedCommunes, onCommunesChange, selectedActorTypes, onActorTypesChange }) {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState('');

  const ACTIVITIES = useMemo(() => [
    { key: 'production', label: t('activities.production') },
    { key: 'transformation', label: t('activities.transformation') },
    { key: 'commercialisation', label: t('activities.commercialisation') },
    { key: 'formation', label: t('activities.formation') },
    { key: 'plaidoyer', label: t('activities.plaidoyer') },
    { key: 'autre', label: t('activities.autre') },
    { key: 'informel', label: t('actors.informel') }
  ], [t]);

  const ACTOR_TYPES = useMemo(() => [
    { key: 'ONG', label: t('actors.ong') },
    { key: 'recherche', label: t('actors.recherche') },
    { key: 'gouvernement', label: t('actors.gouvernement') },
    { key: 'groupement', label: t('actors.groupement') },
    { key: 'entreprise', label: t('actors.entreprise') },
    { key: 'informel', label: t('actors.informel') },
    { key: 'autre', label: t('actors.autre') }
  ], [t]);

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
        <label htmlFor="filterType" className="font-semibold mb-2 block">{t('filters.select_by')}</label>
        <select
          id="filterType"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1"
        >
          <option value="activities">{t('filters.activities')}</option>
          <option value="communes">{t('filters.communes')}</option>
          <option value="actor_types">{t('filters.actor_type')}</option>
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
          <h3 className="font-semibold mb-2">{t('filters.communes')}</h3>
          <input
            type="text"
            value={selectedCommunes.join(', ')}
            onChange={handleCommunesChange}
            placeholder={t('filters.communes_placeholder')}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>
      )}

      {filterType === 'actor_types' && (
        <div>
          <h3 className="font-semibold mb-2">{t('filters.actor_type')}</h3>
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
