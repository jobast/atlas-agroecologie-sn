import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { useDytael } from '../context/DytaelContext';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPick({ lat, lon: lng });
    },
  });
  return null;
}

function SearchBox({ onPick }) {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      autoClose: true,
      retainZoomLevel: false,
    });

    map.addControl(searchControl);
    map.on('geosearch/showlocation', (e) => {
      onPick({ lat: e.location.y, lon: e.location.x });
    });

    return () => map.removeControl(searchControl);
  }, [map, onPick]);

  return null;
}

const inputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors';
const disabledInputClasses = 'w-full border border-gray-200 rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed';

export default function FormInput({ variant = 'default' }) {
  const isMobile = variant === 'mobile';
  const { currentDytael } = useDytael();
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [formData, setFormData] = useState({
    initiative: '',
    description: '',
    village: '',
    commune: '',
    zone_intervention: '',
    actor_type: '',
    year: '',
    activities: [],
    lat: '',
    lon: '',
    website: '',
    photos: [],
    contact_email: '',
    contact_phone: '',
    person_name: '',
    videos: [],
    social_media: [],
  });

  const [videoLinks, setVideoLinks] = useState(['']);
  const [sameAsDeclarant, setSameAsDeclarant] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [photoNotice, setPhotoNotice] = useState('');

  const [socialMedia, setSocialMedia] = useState([]);
  const [socialLinks, setSocialLinks] = useState({});
  const accuracyWarning = gpsAccuracy !== null && gpsAccuracy > 20;

  useEffect(() => {
    const params = currentDytael ? `?dytael_id=${currentDytael.id}` : '';
    axios.get(`${import.meta.env.VITE_API_URL}/custom-fields${params}`)
      .then(res => setCustomFields(res.data || []))
      .catch(() => setCustomFields([]));
  }, [currentDytael]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const picked = Array.from(files || []);
      const limited = picked.slice(0, MAX_PHOTOS);
      const filtered = limited.filter(f => f.size <= MAX_PHOTO_SIZE);
      let notice = '';
      if (picked.length > MAX_PHOTOS) {
        notice = `Maximum ${MAX_PHOTOS} photos – seules les premières ont été conservées.`;
      }
      const rejected = limited.length - filtered.length;
      if (rejected > 0) {
        notice = `${notice ? `${notice} ` : ''}${rejected} photo(s) dépassent 5 Mo et ont été ignorées.`;
      }
      setPhotoNotice(notice);
      setFormData({ ...formData, photos: filtered });
      return;
    } else if (type === 'checkbox') {
      const newActivities = e.target.checked
        ? [...formData.activities, value]
        : formData.activities.filter((a) => a !== value);
      setFormData({ ...formData, activities: newActivities });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleVideoChange = (index, value) => {
    const updated = [...videoLinks];
    updated[index] = value;
    setVideoLinks(updated);
    setFormData(prev => ({ ...prev, videos: updated }));
  };

  const addVideoField = () => {
    if (videoLinks.length < 5) {
      setVideoLinks([...videoLinks, '']);
    }
  };

  const handleSocialMediaToggle = (platform) => {
    if (socialMedia.includes(platform)) {
      const updated = socialMedia.filter(p => p !== platform);
      setSocialMedia(updated);
      const updatedLinks = { ...socialLinks };
      delete updatedLinks[platform];
      setSocialLinks(updatedLinks);
      setFormData(prev => ({ ...prev, social_media: updated.map(p => ({ platform: p, url: updatedLinks[p] || '' })) }));
    } else {
      const updated = [...socialMedia, platform];
      setSocialMedia(updated);
      setFormData(prev => ({ ...prev, social_media: [...updated.map(p => ({ platform: p, url: socialLinks[p] || '' }))] }));
    }
  };

  const handleSocialLinkChange = (platform, url) => {
    const updatedLinks = { ...socialLinks, [platform]: url };
    setSocialLinks(updatedLinks);
    setFormData(prev => ({
      ...prev,
      social_media: socialMedia.map(p => ({ platform: p, url: updatedLinks[p] || '' }))
    }));
  };

  const handleCustomChange = (key, value) => {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocationPick = ({ lat, lon }, accuracy = null) => {
    setFormData(prev => ({ ...prev, lat, lon }));
    setGpsAccuracy(typeof accuracy === 'number' ? accuracy : null);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        handleLocationPick(
          {
            lat: latitude.toFixed(6),
            lon: longitude.toFixed(6),
          },
          typeof accuracy === 'number' ? parseFloat(accuracy.toFixed(1)) : null
        );
      },
      (error) => {
        alert("Impossible d'obtenir la position actuelle.");
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

  const data = new FormData();

  for (const key in formData) {
    if (key === 'photos') {
      formData.photos.forEach((file) => data.append('photos', file));
    } else if (key === 'activities') {
      formData.activities.forEach((activity) => data.append('activities', activity));
    } else if (key === 'videos') {
      formData.videos.forEach((video) => data.append('videos', video));
    } else if (key === 'social_media') {
      data.append('social_media', JSON.stringify(formData.social_media));
    } else {
      data.append(key, formData[key]);
    }
  }

  data.append('geom', JSON.stringify({
    type: 'Point',
    coordinates: [parseFloat(formData.lon), parseFloat(formData.lat)],
  }));

  data.append('extra_fields', JSON.stringify(customValues));

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("Token manquant. Vous devez être connecté.");

    await axios.post(`${import.meta.env.VITE_API_URL}/data`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    alert('Initiative enregistrée (en attente de validation).');
    setFormData({
      initiative: '',
      description: '',
      village: '',
      commune: '',
      zone_intervention: '',
      actor_type: '',
      year: '',
      activities: [],
      lat: '',
      lon: '',
      website: '',
      photos: [],
      contact_email: '',
      contact_phone: '',
      person_name: '',
      videos: [],
      social_media: [],
    });
    setVideoLinks(['']);
    setSocialMedia([]);
    setSocialLinks({});
    setSameAsDeclarant(false);
    setCustomValues({});
    setGpsAccuracy(null);
    setPhotoNotice('');
  } catch (error) {
    console.error("Erreur lors de la soumission :", error);
    alert('Erreur lors de l\'envoi');
  }

  };

  const activityOptions = ['Production', 'Transformation', 'Commercialisation', 'Formation', 'Plaidoyer', 'Autre'];

  const activityColor = (a) => {
    const k = a.toLowerCase();
    if (k.includes('production')) return 'bg-green-50 text-green-700 border-green-200';
    if (k.includes('transformation')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (k.includes('commerc')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (k.includes('formation')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (k.includes('plaidoyer')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className={isMobile ? 'bg-gray-50 min-h-screen py-6 px-3' : 'bg-gray-50 min-h-screen py-8 px-4'}>
      <form onSubmit={handleSubmit} className={isMobile ? 'mx-auto w-full max-w-2xl space-y-6' : 'max-w-2xl mx-auto space-y-6'}>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <h2 className="text-lg font-bold text-gray-800">Nouvelle Initiative</h2>
          <p className="text-xs text-gray-400 mt-1">Les champs marqués d'un <span className="text-red-400">*</span> sont obligatoires</p>
        </div>

        {/* Informations générales */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Informations générales</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'initiative <span className="text-red-400">*</span></label>
              <input
                name="initiative"
                placeholder="Ex: Ferme agroécologique de Bignona"
                onChange={handleChange}
                value={formData.initiative}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-400">*</span></label>
              <textarea
                name="description"
                placeholder="Décrivez l'initiative en quelques lignes (max 500 caractères)"
                value={formData.description}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                className={inputClasses}
              />
              <div className="text-right mt-1">
                <span className={`text-xs ${formData.description.length > 450 ? 'text-amber-500' : 'text-gray-300'}`}>{formData.description.length}/500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profil */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Profil de l'initiative</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type d'acteur <span className="text-red-400">*</span></label>
              <select
                name="actor_type"
                value={formData.actor_type}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">-- Sélectionner --</option>
                <option value="groupement">Groupement</option>
                <option value="gouvernement">Gouvernement</option>
                <option value="ONG">ONG</option>
                <option value="recherche">Recherche</option>
                <option value="entreprise">Entreprise</option>
                <option value="informel">Informel</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Année de création <span className="text-red-400">*</span></label>
              <input
                name="year"
                type="number"
                placeholder="Ex: 2018"
                value={formData.year}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Activités</label>
              <div className="flex flex-wrap gap-2">
                {activityOptions.map((activity) => {
                  const checked = formData.activities.includes(activity);
                  return (
                    <label
                      key={activity}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border cursor-pointer transition-all duration-150 select-none ${
                        checked
                          ? activityColor(activity)
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="activities"
                        value={activity}
                        checked={checked}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      {checked && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      )}
                      {activity}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Localisation</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Village <span className="text-red-400">*</span></label>
                <input name="village" placeholder="Nom du village" value={formData.village} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commune</label>
                <input name="commune" placeholder="Nom de la commune" value={formData.commune} onChange={handleChange} className={inputClasses} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Coordonnées GPS</label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                  Ma position
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Saisissez les coordonnées manuellement, cliquez sur <strong>"Ma position"</strong>, ou cliquez directement sur la carte.
                </p>
              </div>

              {gpsAccuracy !== null && (
                <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                  accuracyWarning ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'
                }`}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <span>
                    Précision : <strong>{Math.round(gpsAccuracy)} m</strong> {accuracyWarning ? '(> 20 m – moins précis)' : '(bonne)'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                  <input name="lat" placeholder="Ex: 12.65" value={formData.lat}
                    onChange={e => handleLocationPick({ lat: e.target.value, lon: formData.lon }, null)}
                    className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                  <input name="lon" placeholder="Ex: -16.25" value={formData.lon}
                    onChange={e => handleLocationPick({ lat: formData.lat, lon: e.target.value }, null)}
                    className={inputClasses} />
                </div>
              </div>

              <MapContainer center={[parseFloat(formData.lat) || 14.5, parseFloat(formData.lon) || -17.5]}
                zoom={7} scrollWheelZoom={true} fullscreenControl={true}
                className="rounded-lg border border-gray-200 shadow-sm h-64 sm:h-80 w-full"
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Satellite">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Tiles © Esri"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap contributors"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                <SearchBox onPick={({ lat, lon }) => handleLocationPick({ lat, lon }, null)} />
                <LocationPicker onPick={({ lat, lon }) => handleLocationPick({ lat, lon }, null)} />
                {formData.lat && formData.lon && (
                  <Marker position={[parseFloat(formData.lat), parseFloat(formData.lon)]} icon={markerIcon} />
                )}
              </MapContainer>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone d'intervention</label>
              <input
                name="zone_intervention"
                placeholder="Si différente du lieu (ex: région de Ziguinchor)"
                value={formData.zone_intervention}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Contact</h3>

          <label className="inline-flex items-center gap-2.5 mb-5 cursor-pointer select-none">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${sameAsDeclarant ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
              {sameAsDeclarant && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
            </div>
            <input
              type="checkbox"
              checked={sameAsDeclarant}
              onChange={e => {
                const checked = e.target.checked;
                setSameAsDeclarant(checked);
                if (checked) {
                  const user = JSON.parse(localStorage.getItem('user')) || {};
                  setFormData(prev => ({
                    ...prev,
                    contact_email: user.email || '',
                    contact_phone: user.phone || '',
                    person_name: user.name || ''
                  }));
                }
              }}
              className="sr-only"
            />
            <span className="text-sm text-gray-600">Même contact que le déclarant</span>
          </label>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du contact <span className="text-red-400">*</span></label>
              <input
                name="person_name"
                placeholder="Prénom et nom"
                value={formData.person_name}
                onChange={handleChange}
                disabled={sameAsDeclarant}
                className={sameAsDeclarant ? disabledInputClasses : inputClasses}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone <span className="text-red-400">*</span></label>
                <input
                  name="contact_phone"
                  placeholder="+221 XX XXX XX XX"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  disabled={sameAsDeclarant}
                  className={sameAsDeclarant ? disabledInputClasses : inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  name="contact_email"
                  placeholder="email@exemple.com"
                  value={formData.contact_email}
                  onChange={handleChange}
                  disabled={sameAsDeclarant}
                  className={sameAsDeclarant ? disabledInputClasses : inputClasses}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site internet</label>
              <input name="website" placeholder="https://..." value={formData.website} onChange={handleChange} className={inputClasses} />
            </div>

            {currentDytael && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DyTAEL</label>
                <input
                  type="text"
                  value={currentDytael.name}
                  readOnly
                  className={disabledInputClasses}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Réseaux sociaux</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Facebook', 'Instagram', 'WhatsApp', 'YouTube', 'TikTok', 'LinkedIn', 'Autre'].map((platform) => {
                  const active = socialMedia.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handleSocialMediaToggle(platform)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                        active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
              {socialMedia.length > 0 && (
                <div className="space-y-3">
                  {socialMedia.map((platform) => (
                    <div key={platform}>
                      <label className="block text-xs text-gray-400 mb-1">{platform}</label>
                      <input
                        type="url"
                        placeholder={`Lien vers ${platform}`}
                        value={socialLinks[platform] || ''}
                        onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Champs additionnels */}
        {customFields.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Champs additionnels</h3>
            <p className="text-xs text-gray-400 mb-5">Définis par l'administrateur du DyTAEL.</p>
            <div className="space-y-4">
              {customFields.map((f) => (
                <div key={`${f.dytael || 'global'}-${f.field_key || f.key}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {f.field_label || f.label}
                    {f.required ? <span className="text-red-400"> *</span> : ''}
                  </label>
                  { (f.field_type || f.type) === 'textarea' ? (
                    <textarea
                      value={customValues[f.field_key || f.key] || ''}
                      onChange={(e) => handleCustomChange(f.field_key || f.key, e.target.value)}
                      className={inputClasses}
                      rows={3}
                      required={f.required}
                    />
                  ) : (
                    <input
                      type={(f.field_type || f.type) === 'number' ? 'number' : 'text'}
                      value={customValues[f.field_key || f.key] || ''}
                      onChange={(e) => handleCustomChange(f.field_key || f.key, e.target.value)}
                      className={inputClasses}
                      required={f.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Photos</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ajouter jusqu'à 5 photos</label>
            <div className="relative">
              <input
                type="file"
                name="photos"
                onChange={handleChange}
                accept="image/*"
                multiple
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer file:transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Formats acceptés : JPG, PNG. Max 5 Mo par photo.</p>
            {photoNotice && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {photoNotice}
              </div>
            )}
          </div>
        </div>

        {/* Vidéos */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Liens vidéos</h3>
          <div className="space-y-3">
            {videoLinks.map((link, index) => (
              <div key={index}>
                <label className="block text-xs text-gray-400 mb-1">Vidéo {index + 1}</label>
                <input
                  type="url"
                  value={link}
                  placeholder="https://youtube.com/..."
                  onChange={(e) => handleVideoChange(index, e.target.value)}
                  className={inputClasses}
                />
              </div>
            ))}
            {videoLinks.length < 5 && (
              <button
                type="button"
                onClick={addVideoField}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                Ajouter un lien vidéo
              </button>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 pb-8">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            Soumettre l'initiative
          </button>
        </div>
      </form>
    </div>
  );
}
