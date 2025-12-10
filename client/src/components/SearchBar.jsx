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
      <input
        type="text"
        placeholder="Rechercher une initiative..."
        value={local}
        onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
      />
      {local && suggestions.length > 0 && (
        <ul className="bg-white border rounded shadow text-sm max-h-40 overflow-y-auto">
          {suggestions.slice(0,5).map(s => (
            <li
              key={s.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
              onClick={() => onSelect?.(s.id, s)}
            >
              <span>{s.initiative}</span>
              {s.commune && <span className="text-gray-500">{s.commune}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
