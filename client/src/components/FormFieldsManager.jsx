import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function FormFieldsManager() {
  const [fields, setFields] = useState([]);
  const [draft, setDraft] = useState({ key: '', label: '', type: 'text', required: false, dytael: '' });
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const load = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/custom-fields`);
      setFields(res.data);
    } catch (err) {
      setMessage("Erreur de chargement des champs.");
      setTimeout(() => setMessage(''), 1500);
    }
  };

  useEffect(() => { load(); }, []);

  const addField = async () => {
    if (!draft.key.trim() || !draft.label.trim()) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/custom-fields`, {
        field_key: draft.key.trim(),
        field_label: draft.label.trim(),
        field_type: draft.type,
        required: draft.required,
        dytael: draft.dytael || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      setDraft({ key: '', label: '', type: 'text', required: false, dytael: '' });
      setMessage('Champ ajouté.');
      load();
    } catch (err) {
      setMessage("Impossible d'ajouter le champ (admin requis).");
      setTimeout(() => setMessage(''), 1500);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Champs dynamiques du formulaire</h2>
      <p className="text-sm text-gray-600 mb-4">
        Champs persistés en base et utilisés par le formulaire de soumission.
      </p>

      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <input
          type="text"
          placeholder="Identifiant (ex: superficie)"
          value={draft.key}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Label (ex: Superficie cultivée)"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="border rounded px-3 py-2"
        />
        <select
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="text">Texte</option>
          <option value="number">Nombre</option>
          <option value="textarea">Zone de texte</option>
        </select>
        <input
          type="text"
          placeholder="DyTAEL (optionnel)"
          value={draft.dytael}
          onChange={(e) => setDraft({ ...draft, dytael: e.target.value })}
          className="border rounded px-3 py-2"
        />
      </div>
      <label className="inline-flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          checked={draft.required}
          onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
        />
        <span className="text-sm">Obligatoire ?</span>
      </label>
      <button
        onClick={addField}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Ajouter
      </button>

      <div className="mt-6 space-y-2">
        {fields.length === 0 && <p className="text-gray-500">Aucun champ ajouté.</p>}
        {fields.map((f) => (
          <div key={`${f.dytael || 'global'}-${f.field_key || f.key}`} className="border rounded px-3 py-2 flex justify-between items-center">
            <div>
              <div className="font-semibold">{f.field_label || f.label}</div>
              <div className="text-xs text-gray-500">
                {(f.field_key || f.key)} · {f.field_type || f.type} · {f.dytael || 'Global'} {f.required ? '· obligatoire' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message}
        </div>
      )}
    </div>
  );
}
