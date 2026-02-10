import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const inputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors';

export default function FormFieldsManager() {
  const { t } = useTranslation();
  const [fields, setFields] = useState([]);
  const [dytaels, setDytaels] = useState([]);
  const [draft, setDraft] = useState({ key: '', label: '', type: 'text', required: false, dytael_id: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const token = localStorage.getItem('token');

  const typeLabels = { text: t('form_fields.type_text'), number: t('form_fields.type_number'), textarea: t('form_fields.type_textarea') };

  const load = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/custom-fields`);
      setFields(res.data);
    } catch (err) {
      showMessage(t('form_fields.load_error'), 'error');
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    load();
    axios.get(`${import.meta.env.VITE_API_URL}/dytaels`)
      .then(res => setDytaels(res.data || []))
      .catch(() => setDytaels([]));
  }, []);

  const addField = async () => {
    if (!draft.key.trim() || !draft.label.trim()) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/custom-fields`, {
        field_key: draft.key.trim(),
        field_label: draft.label.trim(),
        field_type: draft.type,
        required: draft.required,
        dytael_id: draft.dytael_id || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      setDraft({ key: '', label: '', type: 'text', required: false, dytael_id: '' });
      showMessage(t('form_fields.field_added'));
      load();
    } catch (err) {
      showMessage(t('form_fields.add_error'), 'error');
    }
  };

  const dytaelMap = {};
  dytaels.forEach(d => { dytaelMap[d.id] = d.name; });

  return (
    <div className="mx-4 md:mx-8 my-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-800">{t('form_fields.title')}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('form_fields.subtitle')}</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-5 py-3 text-sm flex items-center gap-2 ${
          messageType === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          {message}
        </div>
      )}

      {/* Add field form */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form_fields.new_field')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form_fields.identifier')}</label>
            <input
              type="text"
              placeholder={t('form_fields.identifier_placeholder')}
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form_fields.label')}</label>
            <input
              type="text"
              placeholder={t('form_fields.label_placeholder')}
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form_fields.type')}</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              className={inputClasses}
            >
              <option value="text">{t('form_fields.type_text')}</option>
              <option value="number">{t('form_fields.type_number')}</option>
              <option value="textarea">{t('form_fields.type_textarea')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form_fields.dytael')}</label>
            <select
              value={draft.dytael_id}
              onChange={(e) => setDraft({ ...draft, dytael_id: e.target.value })}
              className={inputClasses}
            >
              <option value="">{t('form_fields.global_all')}</option>
              {dytaels.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${draft.required ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
              {draft.required && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
            </div>
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
              className="sr-only"
            />
            <span className="text-sm text-gray-600">{t('form_fields.required')}</span>
          </label>
          <button
            onClick={addField}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* Existing fields */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('form_fields.existing_fields')}</span>
          <span className="text-xs text-gray-400 ml-2">{fields.length}</span>
        </div>
        {fields.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
            <p className="text-gray-400">{t('form_fields.no_fields')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fields.map((f) => (
              <div key={`${f.dytael_id || 'global'}-${f.field_key || f.key}`} className="px-6 py-4 flex items-center justify-between hover:bg-emerald-50/30 transition-colors">
                <div>
                  <div className="font-semibold text-gray-800">{f.field_label || f.label}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f.field_key || f.key}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{typeLabels[f.field_type || f.type] || f.field_type || f.type}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f.dytael_id ? (dytaelMap[f.dytael_id] || `DyTAEL #${f.dytael_id}`) : 'Global'}</span>
                    {f.required && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{t('form_fields.required')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
