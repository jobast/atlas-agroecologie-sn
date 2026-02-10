import React from 'react';
import { useTranslation } from 'react-i18next';

const ACTIVITY_COLORS = {
  production: '#4CAF50',
  transformation: '#FFC107',
  commercialisation: '#F44336',
  formation: '#2196F3',
  plaidoyer: '#9C27B0',
  autre: '#9E9E9E'
};

export default function Legend() {
  const { t } = useTranslation();

  const LABELS = {
    production: t('activities.production'),
    transformation: t('activities.transformation'),
    commercialisation: t('activities.commercialisation'),
    formation: t('activities.formation'),
    plaidoyer: t('activities.plaidoyer'),
    autre: t('activities.autre')
  };

  return (
    <div className="bg-white shadow rounded-xl p-4 w-full">
      <h4 className="text-sm font-semibold mb-2">{t('legend.title')}</h4>
      <ul className="space-y-2">
        {Object.entries(ACTIVITY_COLORS).map(([key, color]) => (
          <li key={key} className="flex items-center space-x-2 text-sm">
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
              title={LABELS[key]}
            ></span>
            <span>{LABELS[key] || key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
