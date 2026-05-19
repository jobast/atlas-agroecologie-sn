import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const inputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors';

export default function DytaelManager() {
  const { t } = useTranslation();
  const [dytaels, setDytaels] = useState([]);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    bounds_sw_lat: '', bounds_sw_lon: '', bounds_ne_lat: '', bounds_ne_lon: '',
    default_zoom: 10, active: true, admin_user_ids: []
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const token = localStorage.getItem('token');

  const load = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/dytaels`);
      setDytaels(res.data || []);
    } catch (err) {
      console.error('Erreur chargement DyTAELs:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data || []);
    } catch (err) {
      // Non-admin role hitting this page would 403 - leave users empty silently.
      console.error('Erreur chargement utilisateurs:', err);
    }
  };

  useEffect(() => { load(); loadUsers(); }, []);

  const toggleAdmin = (userId) => {
    setForm(prev => {
      const set = new Set(prev.admin_user_ids || []);
      if (set.has(userId)) set.delete(userId); else set.add(userId);
      return { ...prev, admin_user_ids: [...set] };
    });
  };

  const filteredUsers = users.filter(u => {
    if (!userQuery.trim()) return true;
    const q = userQuery.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.surname || '').toLowerCase().includes(q)
    );
  });

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', bounds_sw_lat: '', bounds_sw_lon: '', bounds_ne_lat: '', bounds_ne_lon: '', default_zoom: 10, active: true, admin_user_ids: [] });
    setUserQuery('');
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.bounds_sw_lat || !form.bounds_sw_lon || !form.bounds_ne_lat || !form.bounds_ne_lon) {
      showMessage(t('dytael_manager.required_error'), 'error');
      return;
    }
    try {
      if (editing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/dytaels/${editing}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showMessage(t('dytael_manager.updated'));
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/dytaels`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showMessage(t('dytael_manager.created'));
      }
      resetForm();
      load();
    } catch (err) {
      showMessage(err.response?.data?.error || t('dytael_manager.save_error'), 'error');
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
      active: d.active !== false,
      admin_user_ids: Array.isArray(d.admin_user_ids) ? d.admin_user_ids : []
    });
    setUserQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm(t('dytael_manager.confirm_deactivate'))) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/dytaels/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(t('dytael_manager.deactivated'));
      load();
    } catch (err) {
      showMessage(t('dytael_manager.deactivate_error'), 'error');
    }
  };

  return (
    <div className="mx-4 md:mx-8 my-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-800">{t('dytael_manager.title')}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{dytaels.length > 1 ? t('dytael_manager.dytaels_count_plural', { count: dytaels.length }) : t('dytael_manager.dytaels_count', { count: dytaels.length })}</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-5 py-3 text-sm flex items-center gap-2 ${
          messageType === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          {message}
        </div>
      )}

      {/* Create/Edit form */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">
          {editing ? t('dytael_manager.edit_dytael') : t('dytael_manager.new_dytael')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dytael_manager.name')} <span className="text-red-400">*</span></label>
              <input placeholder={t('dytael_manager.name_placeholder')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dytael_manager.slug')} <span className="text-red-400">*</span></label>
              <input placeholder={t('dytael_manager.slug_placeholder')} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className={inputClasses} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dytael_manager.description')}</label>
            <input placeholder={t('dytael_manager.description_placeholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClasses} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('dytael_manager.geo_bounds')} <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lat SW</label>
                <input type="number" step="any" placeholder="12.45" value={form.bounds_sw_lat} onChange={e => setForm({ ...form, bounds_sw_lat: e.target.value })} className={inputClasses} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lon SW</label>
                <input type="number" step="any" placeholder="-16.78" value={form.bounds_sw_lon} onChange={e => setForm({ ...form, bounds_sw_lon: e.target.value })} className={inputClasses} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lat NE</label>
                <input type="number" step="any" placeholder="13.23" value={form.bounds_ne_lat} onChange={e => setForm({ ...form, bounds_ne_lat: e.target.value })} className={inputClasses} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lon NE</label>
                <input type="number" step="any" placeholder="-15.70" value={form.bounds_ne_lon} onChange={e => setForm({ ...form, bounds_ne_lon: e.target.value })} className={inputClasses} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('dytael_manager.default_zoom')}</label>
              <input type="number" placeholder="10" value={form.default_zoom} onChange={e => setForm({ ...form, default_zoom: parseInt(e.target.value) || 10 })} className={inputClasses} />
            </div>
          </div>

          {/* Admin assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('dytael_manager.admins_label', { defaultValue: 'Administrateurs de ce DyTAEL' })}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {t('dytael_manager.admins_help', {
                defaultValue: "Cochez les utilisateurs qui pourront valider/rejeter les initiatives de ce DyTAEL. Ils recevront aussi un email à chaque nouvelle soumission."
              })}
            </p>
            <input
              type="text"
              placeholder={t('dytael_manager.admins_search', { defaultValue: 'Rechercher un utilisateur (nom, email)…' })}
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              className={inputClasses + ' mb-2'}
            />
            <div className="border border-gray-200 rounded-lg bg-white max-h-64 overflow-y-auto divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">
                  {users.length === 0
                    ? t('dytael_manager.admins_no_users', { defaultValue: 'Aucun utilisateur disponible.' })
                    : t('dytael_manager.admins_no_match', { defaultValue: 'Aucun résultat.' })}
                </div>
              ) : (
                filteredUsers.map(u => {
                  const checked = form.admin_user_ids.includes(u.id);
                  const label = [u.name, u.surname].filter(Boolean).join(' ').trim() || u.email;
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-emerald-50/40 ${checked ? 'bg-emerald-50/60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdmin(u.id)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{label}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {u.email}
                          {u.dytael_name ? ` · ${u.dytael_name}` : ''}
                          {u.role ? ` · ${u.role}` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {form.admin_user_ids.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {t('dytael_manager.admins_selected_count', {
                  count: form.admin_user_ids.length,
                  defaultValue: '{{count}} admin(s) sélectionné(s)'
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {editing ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  {t('common.update')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  {t('common.create')}
                </>
              )}
            </button>
            {editing && (
              <button onClick={resetForm} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DyTAEL list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dytael_manager.existing_dytaels')}</span>
        </div>
        {dytaels.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="text-gray-400">{t('dytael_manager.no_dytaels')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dytaels.map(d => (
              <div key={d.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{d.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">/{d.slug}</span>
                    {d.active === false && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{t('dytael_manager.inactive')}</span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{d.description || t('dytael_manager.no_description')}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Bounds: [{d.bounds_sw_lat}, {d.bounds_sw_lon}] → [{d.bounds_ne_lat}, {d.bounds_ne_lon}] · Zoom: {d.default_zoom}
                  </div>
                  {Array.isArray(d.admin_user_ids) && d.admin_user_ids.length > 0 && (
                    <div className="text-xs text-emerald-700 mt-1">
                      {t('dytael_manager.admins_inline', {
                        count: d.admin_user_ids.length,
                        defaultValue: '{{count}} administrateur(s)'
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(d)}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDeactivate(d.id)}
                    className="inline-flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    {t('dytael_manager.deactivate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
