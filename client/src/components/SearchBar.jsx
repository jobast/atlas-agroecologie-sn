import React, { useEffect, useState } from 'react';

export default function SearchBar({ value, onChange, suggestions = [], onSelect }) {
  const [local, setLocal] = useState(value || '');

  useEffect(() => { setLocal(value || ''); }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (suggestions[0]) onSelect?.(suggestions[0].id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-400 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          type="text"
          placeholder="Rechercher..."
          value={local}
          onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-8 py-2.5 text-sm bg-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
        />
        {local && (
          <button
            type="button"
            onClick={() => { setLocal(''); onChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>
      {local && suggestions.length > 0 && (
        <ul className="bg-white border border-gray-100 rounded-lg shadow-lg text-sm max-h-48 overflow-y-auto">
          {suggestions.slice(0,5).map(s => (
            <li
              key={s.id}
              className="px-3 py-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
              onClick={() => onSelect?.(s.id, s)}
            >
              <span className="font-medium text-gray-800">{s.initiative}</span>
              {s.commune && <span className="text-xs text-gray-400">{s.commune}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
