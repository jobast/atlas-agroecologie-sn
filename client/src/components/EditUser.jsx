import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const inputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors';

export default function EditUser({ user, onUpdated }) {
  const { t } = useTranslation();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const adminRoles = ['admin', 'dytael_admin', 'dytaes_admin'];
  if (!currentUser || !adminRoles.includes(currentUser.role)) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
        {t('common.access_denied_admin')}
      </div>
    );
  }

  const [form, setForm] = useState({
    email: user.email || '',
    name: user.name || '',
    surname: user.surname || '',
    phone: user.phone || '',
    organization: user.organization || '',
    role: user.role || '',
    confirmed: user.confirmed || false,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${user.id}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdated();
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'utilisateur :", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.first_name')}</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder={t('users.first_name')} className={inputClasses} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.last_name')}</label>
          <input type="text" name="surname" value={form.surname} onChange={handleChange} placeholder={t('users.last_name')} className={inputClasses} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.email')}</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={t('users.email')} className={inputClasses} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.phone')}</label>
          <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder={t('users.phone')} className={inputClasses} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.organization')}</label>
          <input type="text" name="organization" value={form.organization} onChange={handleChange} placeholder={t('users.organization')} className={inputClasses} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.role')}</label>
          <select name="role" value={form.role} onChange={handleChange} className={inputClasses}>
            <option value="editor">{t('users.role_editor')}</option>
            <option value="dytael_admin">{t('users.role_dytael_admin')}</option>
            {currentUser.role === 'dytaes_admin' && <option value="dytaes_admin">{t('users.role_dytaes_admin')}</option>}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.confirmed ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
              {form.confirmed && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
            </div>
            <input
              type="checkbox"
              name="confirmed"
              checked={form.confirmed}
              onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
              className="sr-only"
            />
            <span className="text-sm text-gray-600">{t('users.account_confirmed')}</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {t('common.save')}
        </button>
        <button type="button" onClick={onUpdated} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
