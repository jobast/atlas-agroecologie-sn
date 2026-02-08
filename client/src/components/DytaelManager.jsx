import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function DytaelManager() {
  const [dytaels, setDytaels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    bounds_sw_lat: '', bounds_sw_lon: '', bounds_ne_lat: '', bounds_ne_lon: '',
    default_zoom: 10, active: true
  });
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const load = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/dytaels`);
      setDytaels(res.data || []);
    } catch (err) {
      console.error('Erreur chargement DyTAELs:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', bounds_sw_lat: '', bounds_sw_lon: '', bounds_ne_lat: '', bounds_ne_lon: '', default_zoom: 10, active: true });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.bounds_sw_lat || !form.bounds_sw_lon || !form.bounds_ne_lat || !form.bounds_ne_lon) {
      setMessage('Tous les champs obligatoires doivent etre remplis.');
      return;
    }
    try {
      if (editing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/dytaels/${editing}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('DyTAEL mis a jour.');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/dytaels`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('DyTAEL cree.');
      }
      resetForm();
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleEdit = (d) => {
    setEditing(d.id);
    setForm({
      name: d.name,
      slug: d.slug,
      description: d.description || '',
      bounds_sw_lat: d.bounds_sw_lat,
      bounds_sw_lon: d.bounds_sw_lon,
      bounds_ne_lat: d.bounds_ne_lat,
      bounds_ne_lon: d.bounds_ne_lon,
      default_zoom: d.default_zoom || 10,
      active: d.active !== false
    });
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/dytaels/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('DyTAEL desactive.');
      load();
    } catch (err) {
      setMessage('Erreur lors de la desactivation.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gestion des DyTAELs</h2>

      <div className="bg-white border rounded p-4 mb-6 space-y-3">
        <h3 className="font-semibold">{editing ? 'Modifier le DyTAEL' : 'Nouveau DyTAEL'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Slug (URL) *" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2 md:col-span-2" />
          <input type="number" step="any" placeholder="Lat SW *" value={form.bounds_sw_lat} onChange={e => setForm({ ...form, bounds_sw_lat: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" step="any" placeholder="Lon SW *" value={form.bounds_sw_lon} onChange={e => setForm({ ...form, bounds_sw_lon: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" step="any" placeholder="Lat NE *" value={form.bounds_ne_lat} onChange={e => setForm({ ...form, bounds_ne_lat: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" step="any" placeholder="Lon NE *" value={form.bounds_ne_lon} onChange={e => setForm({ ...form, bounds_ne_lon: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" placeholder="Zoom par defaut" value={form.default_zoom} onChange={e => setForm({ ...form, default_zoom: parseInt(e.target.value) || 10 })} className="border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
            {editing ? 'Mettre a jour' : 'Creer'}
          </button>
          {editing && (
            <button onClick={resetForm} className="bg-gray-400 text-white px-4 py-2 rounded">Annuler</button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 text-sm bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-700">{message}</div>
      )}

      <div className="space-y-2">
        {dytaels.map(d => (
          <div key={d.id} className="border rounded p-3 bg-white flex justify-between items-center">
            <div>
              <div className="font-semibold">{d.name} <span className="text-xs text-gray-500">/{d.slug}</span></div>
              <div className="text-sm text-gray-600">{d.description || 'Pas de description'}</div>
              <div className="text-xs text-gray-400">
                Bounds: [{d.bounds_sw_lat}, {d.bounds_sw_lon}] - [{d.bounds_ne_lat}, {d.bounds_ne_lon}] | Zoom: {d.default_zoom}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(d)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">Modifier</button>
              <button onClick={() => handleDeactivate(d.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded">Desactiver</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
