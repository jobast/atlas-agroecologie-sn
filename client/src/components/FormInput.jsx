import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

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

export default function FormInput() {
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [dytael, setDytael] = useState('');
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

  const [socialMedia, setSocialMedia] = useState([]);
  const [socialLinks, setSocialLinks] = useState({});

  useEffect(() => {
    // charger champs dynamiques depuis l'API
    const params = dytael ? `?dytael=${encodeURIComponent(dytael)}` : '';
    axios.get(`${import.meta.env.VITE_API_URL}/custom-fields${params}`)
      .then(res => setCustomFields(res.data || []))
      .catch(() => setCustomFields([]));
  }, [dytael]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, photos: Array.from(files).slice(0, 5) });
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude.toFixed(6),
          lon: longitude.toFixed(6),
        }));
      },
      (error) => {
        alert("Impossible d'obtenir la position actuelle.");
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

  // On laisse passer même sans activité pour tests rapides

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
  } catch (error) {
    console.error("Erreur lors de la soumission :", error);
    alert('Erreur lors de l’envoi');
  }

  };

  const activityOptions = ['Production', 'Transformation', 'Commercialisation', 'Formation', 'Plaidoyer', 'Autre'];

  return (
    <div className="bg-fond min-h-screen py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white shadow p-8 rounded space-y-4">
        <h2 className="text-xl font-bold text-system mb-4">Nouvelle Initiative</h2>
        <p className="text-sm text-gray-600 italic mb-4">Les champs marqués d’un * sont obligatoires</p>

        <fieldset>
          <legend className="font-bold text-system mb-2">Informations générales</legend>
          <input
            name="initiative"
            placeholder="Nom de l’initiative *"
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <textarea
            name="description"
            placeholder="Description de l’initiative (max 500 caractères) *"
            value={formData.description}
            onChange={handleChange}
            maxLength={500}
            rows={4}
            className="w-full border rounded px-3 py-2 mb-2"
          />
        </fieldset>

        <fieldset>
          <legend className="font-bold text-system mb-2">Profil de l’initiative</legend>
          <label className="block font-semibold text-sm mb-1">Type d'acteur *</label>
          <select
            name="actor_type"
            value={formData.actor_type}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 mb-2"
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

          <input
            name="year"
            type="number"
            placeholder="Année de création *"
            value={formData.year}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <fieldset>
            <legend className="font-semibold text-sm mb-1">Activités :</legend>
            <div className="flex flex-wrap gap-3">
              {activityOptions.map((activity) => (
                <label key={activity} className="flex items-center space-x-2">
                  <input type="checkbox" name="activities" value={activity} onChange={handleChange} />
                  <span className="text-sm">{activity}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>

        <fieldset>
          <legend className="font-bold text-system mb-2">Localisation</legend>
          <div className="space-y-2 mb-2">
            <input name="village" placeholder="Village *" onChange={handleChange} className="w-full border rounded px-3 py-2 mb-2" />
            <input name="commune" placeholder="Commune" onChange={handleChange} className="w-full border rounded px-3 py-2 mb-2" />
            <div className="mt-4 mb-1 flex items-center justify-between">
              <label
                className="font-semibold text-sm"
                title="Vous pouvez saisir les coordonnées GPS directement, cliquer sur la carte, ou utiliser votre position actuelle."
              >
                Coordonnées (entrer ou cliquer sur la carte)
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="text-blue-600 text-sm underline hover:text-blue-800"
              >
                Utiliser ma position actuelle
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded px-4 py-3 mb-2">
              <p className="mb-1 font-semibold">Comment localiser l’initiative :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Saisir les coordonnées GPS manuellement (latitude et longitude)</li>
                <li>Cliquer sur le bouton <strong>"Utiliser ma position actuelle"</strong></li>
                <li>Cliquez directement sur la carte pour déposer un point</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <input name="lat" placeholder="Latitude" value={formData.lat}
                onChange={e => setFormData({ ...formData, lat: e.target.value })}
                className="border rounded px-3 py-2" />
              <input name="lon" placeholder="Longitude" value={formData.lon}
                onChange={e => setFormData({ ...formData, lon: e.target.value })}
                className="border rounded px-3 py-2" />
            </div>
            <MapContainer center={[parseFloat(formData.lat) || 14.5, parseFloat(formData.lon) || -17.5]}
              zoom={7} scrollWheelZoom={true} fullscreenControl={true}
              style={{ height: '300px', width: '100%' }}
              className="rounded border shadow mb-2"
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
              <SearchBox onPick={({ lat, lon }) => setFormData({ ...formData, lat, lon })} />
              <LocationPicker onPick={({ lat, lon }) => setFormData({ ...formData, lat, lon })} />
              {formData.lat && formData.lon && (
                <Marker position={[parseFloat(formData.lat), parseFloat(formData.lon)]} icon={markerIcon} />
              )}
            </MapContainer>
          </div>
          <input
            name="zone_intervention"
            placeholder="Zone d’intervention (si différente du lieu)"
            value={formData.zone_intervention}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </fieldset>

        <fieldset>
          <legend className="font-bold text-system mb-2">Contact de l’initiative</legend>
          <label className="flex items-center space-x-2 mb-2">
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
            />
            <span className="text-sm">Même que le déclarant</span>
          </label>
          <input
            name="contact_email"
            placeholder="Email"
            value={formData.contact_email}
            onChange={handleChange}
            disabled={sameAsDeclarant}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <input
            name="contact_phone"
            placeholder="Téléphone *"
            value={formData.contact_phone}
            onChange={handleChange}
            disabled={sameAsDeclarant}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <input
            name="person_name"
            placeholder="Nom du contact *"
            value={formData.person_name}
            onChange={handleChange}
            disabled={sameAsDeclarant}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <input name="website" placeholder="Site internet" onChange={handleChange} className="w-full border rounded px-3 py-2 mb-2" />

          <div className="mt-3">
            <label className="block text-sm font-semibold mb-1">Profil DyTAEL (pour champs additionnels)</label>
            <input
              type="text"
              placeholder="Ex: Mbour, Bignona..."
              value={dytael}
              onChange={(e) => setDytael(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="mt-4">
            <label className="block font-semibold text-sm mb-1">Réseaux sociaux :</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {['Facebook', 'Instagram', 'WhatsApp', 'YouTube', 'TikTok', 'LinkedIn', 'Autre'].map((platform) => (
                <label key={platform} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={socialMedia.includes(platform)}
                    onChange={() => handleSocialMediaToggle(platform)}
                  />
                  <span className="text-sm">{platform}</span>
                </label>
              ))}
            </div>

            {socialMedia.map((platform) => (
              <input
                key={platform}
                type="url"
                placeholder={`Lien vers ${platform}`}
                value={socialLinks[platform] || ''}
                onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
              />
            ))}
          </div>
        </fieldset>

        {customFields.length > 0 && (
          <fieldset>
            <legend className="font-bold text-system mb-2">Champs additionnels</legend>
            <p className="text-xs text-gray-500 mb-2">Définis dans l’admin (Formulaire).</p>
            <div className="space-y-3">
              {customFields.map((f) => (
                <div key={`${f.dytael || 'global'}-${f.field_key || f.key}`} className="space-y-1">
                  <label className="block text-sm font-semibold">
                    {f.field_label || f.label}
                    {f.required ? ' *' : ''}
                  </label>
                  { (f.field_type || f.type) === 'textarea' ? (
                    <textarea
                      value={customValues[f.field_key || f.key] || ''}
                      onChange={(e) => handleCustomChange(f.field_key || f.key, e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      rows={3}
                      required={f.required}
                    />
                  ) : (
                    <input
                      type={(f.field_type || f.type) === 'number' ? 'number' : 'text'}
                      value={customValues[f.field_key || f.key] || ''}
                      onChange={(e) => handleCustomChange(f.field_key || f.key, e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required={f.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="font-bold text-system mb-2">Photos</legend>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Ajouter jusqu'à 5 photos de l’initiative :</label>
            <input
              type="file"
              name="photos"
              onChange={handleChange}
              accept="image/*"
              multiple
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-bold text-system mb-2">Liens vidéos</legend>
          <div className="space-y-2">
            {videoLinks.map((link, index) => (
              <input
                key={index}
                type="url"
                value={link}
                placeholder={`Lien vidéo ${index + 1}`}
                onChange={(e) => handleVideoChange(index, e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            ))}
            {videoLinks.length < 5 && (
              <button
                type="button"
                onClick={addVideoField}
                className="text-sm text-blue-600 underline"
              >
                + Ajouter un lien vidéo
              </button>
            )}
          </div>
        </fieldset>

        <button type="submit" className="bg-laterite hover:bg-nature text-white px-4 py-2 rounded">
          Soumettre
        </button>
      </form>
    </div>
  );
}
