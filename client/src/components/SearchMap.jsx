import React, { useEffect } from 'react';

// Remarque : la fonction onSelect(pt) peut être utilisée pour réagir à la sélection d’un point (ex : zoom automatique sur la carte depuis le parent).
export default function SearchMap({ value, field, onValueChange, onFieldChange, results, onSelect }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 w-full mb-4">
      <h4 className="text-sm font-semibold mb-3">Recherche</h4>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1 text-gray-600">Champ de recherche</label>
        <select
          value={field}
          onChange={(e) => onFieldChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="all">Tous les champs</option>
          <option value="initiative">Nom</option>
          <option value="village">Village</option>
          <option value="commune">Commune</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1 text-gray-600">Mot-clé</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Ex: agroécologie"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {results?.length > 0
          ? `${results.length} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`
          : 'Aucun résultat'}
      </div>

      <ul className="text-sm max-h-40 overflow-y-auto space-y-1">
        {results?.map((pt) => (
          <li key={pt.id} className="border border-gray-200 rounded p-2 hover:bg-gray-50">
            <button onClick={() => onSelect(pt)} className="text-left w-full">
              <strong>{pt.initiative}</strong>
              <div className="text-xs text-gray-600">{pt.village}, {pt.commune}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}