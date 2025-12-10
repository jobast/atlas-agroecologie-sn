import React from 'react';

const ACTIVITY_COLORS = {
  production: '#4CAF50',
  transformation: '#FFC107',
  commercialisation: '#F44336',
  formation: '#2196F3',
  plaidoyer: '#9C27B0',
  autre: '#9E9E9E'
};

const LABELS = {
  production: 'Production',
  transformation: 'Transformation',
  commercialisation: 'Commercialisation',
  formation: 'Formation',
  plaidoyer: 'Plaidoyer',
  autre: 'Autre'
};

export default function Legend() {
  return (
    <div className="bg-white shadow rounded-xl p-4 w-full">
      <h4 className="text-sm font-semibold mb-2">Légende</h4>
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
