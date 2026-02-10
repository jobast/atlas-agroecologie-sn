import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const inputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors';

export default function EditInitiative() {
  const { t } = useTranslation();
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (!['admin', 'dytael_admin', 'dytaes_admin'].includes(parsedUser.role)) {
        setUnauthorized(true);
      }
    } else {
      setUnauthorized(true);
    }
  }, []);

  const [form, setForm] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${import.meta.env.VITE_API_URL}/data/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data;
        data.activities = Array.isArray(data.activities)
          ? data.activities.join(", ")
          : data.activities;
        setForm(data);
        // Load locations
        if (data.locations && data.locations.length > 0) {
          setLocations(data.locations.map(l => ({
            label: l.label || '',
            lat: l.lat ?? '',
            lon: l.lon ?? '',
            village: l.village || '',
            commune: l.commune || '',
            is_primary: !!l.is_primary
          })));
        } else if (data.lat && data.lon) {
          setLocations([{
            label: 'Localisation principale',
            lat: data.lat,
            lon: data.lon,
            village: data.village || '',
            commune: data.commune || '',
            is_primary: true
          }]);
        }
      })
      .catch((err) => console.error("Erreur chargement initiative:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocFieldChange = (index, field, value) => {
    setLocations(prev => prev.map((loc, idx) =>
      idx === index ? { ...loc, [field]: value } : loc
    ));
  };

  const addLocation = () => {
    if (locations.length < 10) {
      setLocations(prev => [...prev, { label: '', lat: '', lon: '', village: '', commune: '', is_primary: false }]);
    }
  };

  const removeLocation = (index) => {
    if (locations.length <= 1) return;
    const updated = locations.filter((_, idx) => idx !== index);
    setLocations(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const preparedForm = {
      ...form,
      activities: form.activities
        ? form.activities.split(",").map((a) => a.trim())
        : [],
      locations: locations,
      location_type: form.location_type || 'point'
    };

    const token = localStorage.getItem('token');

    axios
      .put(`${import.meta.env.VITE_API_URL}/data/${id}`, preparedForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        alert(t('edit.success'));
        navigate(`/${slug}/my-initiatives`);
      })
      .catch((err) => {
        console.error("Erreur modification:", err);
        alert(t('edit.error'));
      });
  };

  if (unauthorized) return <p className="p-6 text-red-600">{t('edit.access_denied')}</p>;
  if (loading) return <p className="p-6 text-gray-400">{t('common.loading')}</p>;
  if (!form) return <p className="p-6 text-red-500">{t('edit.load_error')}</p>;

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <h1 className="text-lg font-bold text-gray-800">{t('edit.title')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General info */}
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('edit.general_info')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.initiative_name')}</label>
              <input type="text" name="initiative" value={form.initiative || ""} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.description')}</label>
              <textarea name="description" value={form.description || ""} onChange={handleChange} className={inputClasses} rows={4} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.actor_type')}</label>
                <input type="text" name="actor_type" value={form.actor_type || ""} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.year')}</label>
                <input type="number" name="year" value={form.year || ""} onChange={handleChange} className={inputClasses} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.activities')}</label>
              <input type="text" name="activities" value={form.activities || ""} onChange={handleChange} className={inputClasses} placeholder={t('form.activities_placeholder')} />
            </div>
          </div>

          {/* Programme fields - shown if this initiative has programme-specific data or children */}
          {(form.children?.length > 0 || form.bailleurs || form.organisation || form.point_contact || form.duree) && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-6 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('edit.programme_details')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.organisation')}</label>
                <input type="text" name="organisation" value={form.organisation || ""} onChange={handleChange} className={inputClasses} placeholder={t('edit.organisation_placeholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.bailleurs')}</label>
                <textarea name="bailleurs" value={form.bailleurs || ""} onChange={handleChange} className={inputClasses} rows={3} placeholder={t('edit.bailleurs_placeholder')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.point_contact')}</label>
                  <input type="text" name="point_contact" value={form.point_contact || ""} onChange={handleChange} className={inputClasses} placeholder={t('edit.point_contact_placeholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.duration')}</label>
                  <input type="text" name="duree" value={form.duree || ""} onChange={handleChange} className={inputClasses} placeholder={t('edit.duration_placeholder')} />
                </div>
              </div>
            </div>
          )}

          {/* Localisation */}
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('edit.location')}</h3>

            {/* Location type selector */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'point', label: t('edit.location_precise') },
                { value: 'multi', label: t('edit.location_multi') },
                { value: 'zone', label: t('edit.location_zone') },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, location_type: opt.value }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.location_type === opt.value
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Zone mode */}
            {form.location_type === 'zone' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-800">{t('edit.zone_info')}</p>
              </div>
            )}

            {/* Point mode - simple lat/lon */}
            {(form.location_type === 'point' || !form.location_type) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.village')}</label>
                  <input type="text" name="village" value={form.village || ""} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.commune')}</label>
                  <input type="text" name="commune" value={form.commune || ""} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.latitude')}</label>
                  <input type="number" name="lat" step="any" value={form.lat || ""} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.longitude')}</label>
                  <input type="number" name="lon" step="any" value={form.lon || ""} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            )}

            {/* Multi mode - locations editor */}
            {form.location_type === 'multi' && (
              <div className="space-y-3">
                {locations.map((loc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {idx === 0 ? t('edit.primary_location') : t('edit.location_n', { n: idx + 1 })}
                      </span>
                      {locations.length > 1 && (
                        <button type="button" onClick={() => removeLocation(idx)} className="text-red-400 hover:text-red-600 text-xs font-medium">
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('edit.location_name')}</label>
                      <input value={loc.label} onChange={e => handleLocFieldChange(idx, 'label', e.target.value)} className={inputClasses} placeholder={t('form.location_name_placeholder', { defaultValue: 'Ex: Siège Bignona' })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('edit.village')}</label>
                        <input value={loc.village} onChange={e => handleLocFieldChange(idx, 'village', e.target.value)} className={inputClasses} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('edit.commune')}</label>
                        <input value={loc.commune} onChange={e => handleLocFieldChange(idx, 'commune', e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('edit.latitude')}</label>
                        <input type="number" step="any" value={loc.lat} onChange={e => handleLocFieldChange(idx, 'lat', e.target.value)} className={inputClasses} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('edit.longitude')}</label>
                        <input type="number" step="any" value={loc.lon} onChange={e => handleLocFieldChange(idx, 'lon', e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                  </div>
                ))}
                {locations.length < 10 && (
                  <button type="button" onClick={addLocation} className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    {t('edit.add_location')}
                  </button>
                )}
              </div>
            )}

            {/* Zone fields */}
            {form.location_type === 'zone' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.village')}</label>
                  <input type="text" name="village" value={form.village || ""} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.commune')}</label>
                  <input type="text" name="commune" value={form.commune || ""} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.zone_intervention')}</label>
              <input type="text" name="zone_intervention" value={form.zone_intervention || ""} onChange={handleChange} className={inputClasses} />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('edit.contact')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.contact_name')}</label>
              <input type="text" name="person_name" value={form.person_name || ""} onChange={handleChange} className={inputClasses} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.phone')}</label>
                <input type="text" name="contact_phone" value={form.contact_phone || ""} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.email')}</label>
                <input type="email" name="contact_email" value={form.contact_email || ""} onChange={handleChange} className={inputClasses} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.website')}</label>
              <input type="text" name="website" value={form.website || ""} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.social_media')}</label>
              <input type="text" name="social_media" value={form.social_media || ""} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('edit.video_links')}</label>
              <input type="text" name="videos" value={form.videos || ""} onChange={handleChange} className={inputClasses} />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 pb-8">
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm transition-colors text-sm">
              {t('edit.save_changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
