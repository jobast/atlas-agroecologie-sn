import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useDytael } from '../context/DytaelContext';
import { getTokenStatus } from '../utils/auth';
import { enqueue as enqueueSubmission } from '../db/offlineQueue';

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
  const { t } = useTranslation();
  const isMobile = variant === 'mobile';
  const { currentDytael } = useDytael();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentIdFromUrl = searchParams.get('parent_id');
  const [parentName, setParentName] = useState('');
  const [entryType, setEntryType] = useState(parentIdFromUrl ? 'initiative' : ''); // '', 'initiative', 'programme'
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
    location_type: 'point',
    website: '',
    photos: [],
    contact_email: '',
    contact_phone: '',
    person_name: '',
    videos: [],
    social_media: [],
    bailleurs: '',
    organisation: '',
    point_contact: '',
    duree: '',
  });

  const [locations, setLocations] = useState([
    { label: '', lat: '', lon: '', village: '', commune: '', is_primary: false }
  ]);
  const [editingLocIndex, setEditingLocIndex] = useState(null); // null = modal closed

  const [videoLinks, setVideoLinks] = useState(['']);
  const [sameAsDeclarant, setSameAsDeclarant] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [photoNotice, setPhotoNotice] = useState('');

  const [socialMedia, setSocialMedia] = useState([]);
  const [socialLinks, setSocialLinks] = useState({});
  const accuracyWarning = gpsAccuracy !== null && gpsAccuracy > 20;

  const [formErrors, setFormErrors] = useState([]);
  const errorBannerRef = useRef(null);

  // Auth state + draft persistence (so a user mid-form is never left stranded
  // when their JWT is missing/expired - their answers stay on this device).
  const [authStatus, setAuthStatus] = useState(() => getTokenStatus());
  const [draftRestored, setDraftRestored] = useState(false);
  const hydratedRef = useRef(false);
  const draftKey = `atlas:formDraft:${slug || 'default'}:${parentIdFromUrl || 'none'}`;

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setDraftRestored(false);
  };

  useEffect(() => {
    const params = currentDytael ? `?dytael_id=${currentDytael.id}` : '';
    axios.get(`${import.meta.env.VITE_API_URL}/custom-fields${params}`)
      .then(res => setCustomFields(res.data || []))
      .catch(() => setCustomFields([]));
  }, [currentDytael]);

  // Restore any saved draft on mount (photos are not persisted - File objects
  // can't be serialised - so users have to reselect images after a reload).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.formData && typeof d.formData === 'object') {
          setFormData(prev => ({ ...prev, ...d.formData, photos: [] }));
        }
        if (Array.isArray(d.locations) && d.locations.length > 0) setLocations(d.locations);
        if (d.customValues && typeof d.customValues === 'object') setCustomValues(d.customValues);
        if (Array.isArray(d.socialMedia)) setSocialMedia(d.socialMedia);
        if (d.socialLinks && typeof d.socialLinks === 'object') setSocialLinks(d.socialLinks);
        if (Array.isArray(d.videoLinks) && d.videoLinks.length > 0) setVideoLinks(d.videoLinks);
        if (typeof d.entryType === 'string' && !parentIdFromUrl) setEntryType(d.entryType);
        if (typeof d.sameAsDeclarant === 'boolean') setSameAsDeclarant(d.sameAsDeclarant);
        setDraftRestored(true);
      }
    } catch { /* corrupt draft - ignore */ }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Save draft whenever the persisted slice changes (after initial hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const { photos: _photos, ...serializable } = formData;
    const trim = (v) => (typeof v === 'string' ? v.trim() : v);
    const hasUserInput =
      trim(formData.initiative) ||
      trim(formData.description) ||
      trim(formData.village) ||
      trim(formData.commune) ||
      trim(formData.actor_type) ||
      trim(formData.year) ||
      trim(formData.contact_email) ||
      trim(formData.contact_phone) ||
      trim(formData.person_name) ||
      trim(formData.website) ||
      (Array.isArray(formData.activities) && formData.activities.length > 0) ||
      (Array.isArray(formData.videos) && formData.videos.some(v => trim(v))) ||
      (locations || []).some(loc => trim(loc.label) || trim(loc.village) || trim(loc.commune) || trim(loc.lat) || trim(loc.lon)) ||
      Object.values(customValues || {}).some(v => trim(v)) ||
      (socialMedia || []).length > 0;
    if (!hasUserInput) {
      // Nothing worth saving - clear any stale draft so the restored banner
      // doesn't show next time on a clean form.
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      return;
    }
    const payload = {
      formData: serializable,
      locations,
      customValues,
      socialMedia,
      socialLinks,
      videoLinks,
      entryType,
      sameAsDeclarant,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch { /* quota or unavailable - ignore */ }
  }, [formData, locations, customValues, socialMedia, socialLinks, videoLinks, entryType, sameAsDeclarant, draftKey]);

  // Re-evaluate token freshness on mount, window focus, and cross-tab changes
  // (e.g. user logged in via another tab - banner should disappear).
  useEffect(() => {
    const recheck = () => setAuthStatus(getTokenStatus());
    recheck();
    const onFocus = () => recheck();
    const onStorage = (e) => { if (!e || e.key === 'token') recheck(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const goToLogin = () => {
    navigate('/login', { state: { reason: 'submit-initiative' } });
  };

  // Load parent programme name when parent_id is in URL
  useEffect(() => {
    if (!parentIdFromUrl) return;
    axios.get(`${import.meta.env.VITE_API_URL}/data/${parentIdFromUrl}`)
      .then(res => setParentName(res.data?.initiative || ''))
      .catch(() => setParentName(''));
  }, [parentIdFromUrl]);

  const handleChange = (e) => {
    // Cheap re-check on each interaction so an expiring token surfaces a
    // banner before the user wastes time filling out the rest of the form.
    if (authStatus === 'valid') {
      const fresh = getTokenStatus();
      if (fresh !== 'valid') setAuthStatus(fresh);
    }
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const picked = Array.from(files || []);
      const limited = picked.slice(0, MAX_PHOTOS);
      const filtered = limited.filter(f => f.size <= MAX_PHOTO_SIZE);
      let notice = '';
      if (picked.length > MAX_PHOTOS) {
        notice = t('form.photo_limit', { max: MAX_PHOTOS });
      }
      const rejected = limited.length - filtered.length;
      if (rejected > 0) {
        notice = `${notice ? `${notice} ` : ''}${t('form.photo_oversize', { count: rejected })}`;
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
    if (formData.location_type === 'multi' && editingLocIndex !== null) {
      // Update the location being edited in the modal
      setLocations(prev => prev.map((loc, idx) =>
        idx === editingLocIndex ? { ...loc, lat, lon } : loc
      ));
    } else {
      setFormData(prev => ({ ...prev, lat, lon }));
    }
    setGpsAccuracy(typeof accuracy === 'number' ? accuracy : null);
  };

  const handleLocFieldChange = (index, field, value) => {
    setLocations(prev => prev.map((loc, idx) =>
      idx === index ? { ...loc, [field]: value } : loc
    ));
  };

  const addLocation = () => {
    if (locations.length < 10) {
      const newIdx = locations.length;
      setLocations(prev => [...prev, { label: '', lat: '', lon: '', village: '', commune: '', is_primary: false }]);
      setEditingLocIndex(newIdx); // Open modal immediately for the new location
    }
  };

  const removeLocation = (index) => {
    if (locations.length <= 1) return;
    const updated = locations.filter((_, idx) => idx !== index);
    setLocations(updated);
    setEditingLocIndex(null);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('form.geolocation_unsupported'));
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
        alert(t('form.geolocation_error'));
      }
    );
  };

  const validateForm = () => {
    const errors = [];
    const isProgramme = entryType === 'programme';
    const isSubInitiative = !!parentIdFromUrl;
    const trim = (v) => (typeof v === 'string' ? v.trim() : v);

    // Common fields
    if (!trim(formData.initiative)) {
      errors.push(isProgramme ? t('form.programme_name') : t('form.initiative_name'));
    }
    if (!trim(formData.description)) {
      errors.push(t('form.description'));
    }

    if (!isProgramme) {
      if (!trim(formData.actor_type)) errors.push(t('form.actor_type'));

      // Year: required and must be a valid number in range
      const yearStr = trim(formData.year);
      const currentYear = new Date().getFullYear();
      if (!yearStr) {
        errors.push(t('form.year'));
      } else {
        const yearInt = parseInt(yearStr, 10);
        if (Number.isNaN(yearInt) || yearInt < 1900 || yearInt > currentYear) {
          errors.push(t('form.validation.year_invalid', { max: currentYear }));
        }
      }

      if (!trim(formData.person_name)) errors.push(t('form.contact_name'));
      if (!trim(formData.contact_phone)) errors.push(t('form.phone'));

      // Location validation depends on mode
      if (formData.location_type === 'point') {
        if (!trim(formData.village)) errors.push(t('form.village'));
        const latNum = parseFloat(formData.lat);
        const lonNum = parseFloat(formData.lon);
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
          errors.push(t('form.validation.gps_required'));
        } else if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
          errors.push(t('form.validation.gps_invalid'));
        }
      } else if (formData.location_type === 'multi') {
        const valid = locations.some(loc => {
          const lt = parseFloat(loc.lat);
          const ln = parseFloat(loc.lon);
          return !Number.isNaN(lt) && !Number.isNaN(ln) && lt >= -90 && lt <= 90 && ln >= -180 && ln <= 180;
        });
        if (!valid) errors.push(t('form.validation.location_at_least_one'));
      } else if (formData.location_type === 'zone') {
        if (!trim(formData.commune)) errors.push(t('form.commune'));
      }
    }

    // Custom required fields
    customFields.forEach((f) => {
      if (!f.required) return;
      const key = f.field_key || f.key;
      if (!trim(customValues[key])) {
        errors.push(f.field_label || f.label || key);
      }
    });

    // Photo size check (defensive: handleChange already filters but file inputs can be set programmatically)
    if (formData.photos.some(file => file && file.size > MAX_PHOTO_SIZE)) {
      errors.push(t('form.validation.photo_too_large'));
    }

    return errors;
  };

  // Build a plain-object payload + a separated list of photo Files. The same
  // shape feeds both the immediate POST (turned into FormData below) and the
  // offline queue record (photos stored as Blobs in IndexedDB, payload kept
  // serialisable via JSON.stringify).
  const buildSerializablePayload = () => {
    let effectiveLat = formData.lat;
    let effectiveLon = formData.lon;
    let effectiveVillage = formData.village;
    let effectiveCommune = formData.commune;

    if (formData.location_type === 'multi' && locations.length > 0) {
      const primary = locations.find(l => l.is_primary) || locations[0];
      effectiveLat = primary.lat;
      effectiveLon = primary.lon;
      effectiveVillage = primary.village || formData.village;
      effectiveCommune = primary.commune || formData.commune;
    }

    const payload = {};
    for (const key in formData) {
      if (key === 'photos') continue;
      if (key === 'social_media') {
        payload[key] = JSON.stringify(formData.social_media);
      } else if (key === 'lat') {
        payload[key] = effectiveLat;
      } else if (key === 'lon') {
        payload[key] = effectiveLon;
      } else if (key === 'village') {
        payload[key] = effectiveVillage;
      } else if (key === 'commune') {
        payload[key] = effectiveCommune;
      } else {
        payload[key] = formData[key];
      }
    }

    if (formData.location_type === 'multi') {
      payload.locations = JSON.stringify(locations);
    } else if (formData.location_type === 'point') {
      payload.locations = JSON.stringify([{
        label: 'Localisation principale',
        lat: effectiveLat,
        lon: effectiveLon,
        village: effectiveVillage,
        commune: effectiveCommune,
        is_primary: true,
      }]);
    }

    payload.geom = JSON.stringify({
      type: 'Point',
      coordinates: [parseFloat(effectiveLon), parseFloat(effectiveLat)],
    });

    payload.extra_fields = JSON.stringify(customValues);

    if (parentIdFromUrl) payload.parent_id = parentIdFromUrl;
    if (currentDytael?.id) payload.dytael_id = currentDytael.id;
    if (entryType === 'programme') payload.location_type = 'zone';

    return { payload, photos: formData.photos || [] };
  };

  const payloadToFormData = (payload, photos) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        value.forEach(v => data.append(key, v));
      } else if (value !== undefined && value !== null) {
        data.append(key, value);
      }
    }
    photos.forEach(file => data.append('photos', file));
    return data;
  };

  const resetFormState = () => {
    setFormData({
      initiative: '', description: '', village: '', commune: '', zone_intervention: '',
      actor_type: '', year: '', activities: [], lat: '', lon: '', location_type: 'point',
      website: '', photos: [], contact_email: '', contact_phone: '', person_name: '',
      videos: [], social_media: [],
    });
    setLocations([{ label: '', lat: '', lon: '', village: '', commune: '', is_primary: true }]);
    setEditingLocIndex(null);
    setVideoLinks(['']);
    setSocialMedia([]);
    setSocialLinks({});
    setSameAsDeclarant(false);
    setCustomValues({});
    setGpsAccuracy(null);
    setPhotoNotice('');
  };

  // Queue the current form for later transmission. Called when offline or
  // when the POST throws a network-level error (no HTTP response).
  const queueOffline = async () => {
    const { payload, photos } = buildSerializablePayload();
    // Convert File -> serialisable {name, type, blob} so IDB stores cleanly.
    const photoRecords = await Promise.all(
      photos.map(async (f) => ({
        name: f.name,
        type: f.type || 'image/jpeg',
        blob: f.slice(0, f.size, f.type || 'image/jpeg'),
      }))
    );
    await enqueueSubmission({
      dytaelId: currentDytael?.id || null,
      slug: slug || null,
      parentId: parentIdFromUrl || null,
      payload,
      photos: photoRecords,
    });
    // Best-effort Background Sync registration; Chrome Android will drain
    // even when the tab is closed. iOS Safari ignores this silently.
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.sync) await reg.sync.register('submit-queue');
      }
    } catch { /* not supported, that's fine */ }
    clearDraft();
    resetFormState();
    alert(t('offline.savedLocally', {
      defaultValue: 'Initiative enregistrée localement. Elle sera envoyée automatiquement au retour de la connexion.'
    }));
    navigate(`/${slug || 'national'}/mes-envois-en-attente`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setFormErrors(validationErrors);
      // Scroll the error banner into view on next tick
      setTimeout(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return;
    }
    setFormErrors([]);

  // Offline up front: don't even try the network, go straight to the queue.
  // The user's data + photos persist in IndexedDB and replay on reconnection.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      await queueOffline();
    } catch (e) {
      console.error('Offline enqueue failed:', e);
      setFormErrors([t('offline.enqueueError', { defaultValue: 'Impossible d\'enregistrer localement (stockage saturé ?).' })]);
    }
    return;
  }

  const { payload, photos } = buildSerializablePayload();
  const data = payloadToFormData(payload, photos);

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error(t('form.token_missing'));

    const response = await axios.post(`${import.meta.env.VITE_API_URL}/data`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const createdId = response.data?.id;

    clearDraft();

    // If creating a programme, redirect to programme view
    if (entryType === 'programme' && createdId) {
      alert(t('form.programme_saved'));
      navigate(`/${slug}/programme/${createdId}`);
      return;
    }

    // If creating a sub-initiative, redirect back to parent programme
    if (parentIdFromUrl) {
      alert(t('form.sub_initiative_saved'));
      navigate(`/${slug}/programme/${parentIdFromUrl}`);
      return;
    }

    alert(t('form.initiative_saved'));
    resetFormState();
  } catch (error) {
    console.error("Erreur lors de la soumission :", error);
    // Network blip (no HTTP response at all) → fall back to offline queue
    // rather than asking the user to retype everything. Keeps mobile users
    // safe from spotty connections that drop mid-upload.
    if (!error.response && error.code !== 'ERR_BAD_REQUEST' && error.message !== t('form.token_missing')) {
      try {
        await queueOffline();
        return;
      } catch (qe) {
        console.error('Offline enqueue fallback failed:', qe);
        // fall through to normal error handling
      }
    }
    let message;
    const status = error.response?.status;
    const serverMsg = error.response?.data?.error;
    if (serverMsg) {
      // Server returned a structured error (validation, year/lat/lon, etc.)
      message = serverMsg;
    } else if (status === 401 || status === 403) {
      message = t('form.validation.session_expired');
      // Surface the banner too so the login CTA is visible alongside the error.
      setAuthStatus(getTokenStatus() === 'missing' ? 'missing' : 'expired');
    } else if (status >= 500) {
      message = t('form.validation.server_error');
    } else if (!error.response && error.message && error.message !== 'Network Error') {
      // Local thrown error (e.g. token missing)
      message = error.message;
    } else if (!error.response) {
      message = t('form.validation.network_error');
    } else {
      message = t('common.submit_error');
    }
    setFormErrors([message]);
    setTimeout(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
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

  const activityLabel = (activity) => {
    const key = activity.toLowerCase();
    return t(`activities.${key === 'commercialisation' ? 'commercialisation' : key}`, activity);
  };

  return (
    <div className={isMobile ? 'bg-gray-50 min-h-screen py-6 px-3' : 'bg-gray-50 min-h-screen py-8 px-4'}>
      <form onSubmit={handleSubmit} className={isMobile ? 'mx-auto w-full max-w-2xl space-y-6' : 'max-w-2xl mx-auto space-y-6'}>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <h2 className="text-lg font-bold text-gray-800">
            {parentIdFromUrl ? t('form.new_initiative_sub') : entryType === 'programme' ? t('form.new_programme') : t('form.new_initiative')}
          </h2>
          <p className="text-xs text-gray-400 mt-1">{t('common.required_fields_text', { defaultValue: "Les champs marqués d'un * sont obligatoires" }).split('*')[0]}<span className="text-red-400">*</span>{t('common.required_fields_text').split('*')[1]}</p>
        </div>

        {/* Validation / submission error banner */}
        {formErrors.length > 0 && (
          <div
            ref={errorBannerRef}
            role="alert"
            className="bg-red-50 border border-red-200 rounded-xl px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-red-800 mb-1">
                  {formErrors.length === 1 ? t('common.error') : t('form.validation.title')}
                </div>
                {formErrors.length === 1 ? (
                  <div className="text-sm text-red-700">{formErrors[0]}</div>
                ) : (
                  <ul className="text-sm text-red-700 list-disc pl-5 space-y-0.5">
                    {formErrors.map((err, i) => (<li key={i}>{err}</li>))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFormErrors([])}
                className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Auth-required banner: shown when no token or expired token, so the
            user is warned BEFORE filling 10 minutes of fields and at submit time. */}
        {authStatus !== 'valid' && (
          <div
            role="status"
            className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-amber-900 mb-1">
                  {t('form.auth_required_title')}
                </div>
                <div className="text-sm text-amber-800">
                  {authStatus === 'expired'
                    ? t('form.auth_required_expired')
                    : t('form.auth_required_missing')}
                </div>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  {t('form.auth_login_now')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draft restored notice */}
        {draftRestored && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-start gap-3"
          >
            <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7"/>
              <polyline points="21 4 21 10 15 10"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-emerald-800">{t('form.draft_restored')}</div>
            </div>
            <button
              type="button"
              onClick={() => { clearDraft(); window.location.reload(); }}
              className="shrink-0 text-xs text-emerald-700 hover:text-emerald-900 underline"
            >
              {t('form.draft_clear')}
            </button>
          </div>
        )}

        {/* Parent banner when creating a sub-initiative */}
        {parentIdFromUrl && parentName && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <div>
              <div className="text-sm font-medium text-emerald-800">{t('form.parent_programme')}</div>
              <div className="text-sm text-emerald-700 font-semibold">{parentName}</div>
            </div>
          </div>
        )}

        {/* Entry type selector (initiative vs programme) - only shown when not a sub-initiative */}
        {!parentIdFromUrl && !entryType && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('form.what_to_register')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryType('initiative')}
                className="text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
              >
                <div className="text-sm font-semibold text-gray-800">{t('form.an_initiative')}</div>
                <div className="text-xs text-gray-500 mt-1">{t('form.initiative_desc')}</div>
                <div className="text-xs text-gray-400 mt-1.5 italic">{t('form.initiative_example')}</div>
              </button>
              <button
                type="button"
                onClick={() => setEntryType('programme')}
                className="text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
              >
                <div className="text-sm font-semibold text-gray-800">{t('form.a_programme')}</div>
                <div className="text-xs text-gray-500 mt-1">{t('form.programme_desc')}</div>
                <div className="text-xs text-gray-400 mt-1.5 italic">{t('form.programme_example')}</div>
              </button>
            </div>
          </div>
        )}

        {/* Show selected entry type with change option */}
        {!parentIdFromUrl && entryType && (
          <div className={`rounded-xl border px-5 py-3 flex items-center justify-between ${
            entryType === 'programme'
              ? 'bg-purple-50 border-purple-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                entryType === 'programme'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {entryType === 'programme' ? t('form.programme_label') : t('form.initiative_label')}
              </span>
              <span className="text-sm text-gray-600">
                {entryType === 'programme'
                  ? t('form.add_after_submit')
                  : t('form.standalone_initiative')
                }
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEntryType('')}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              {t('common.change')}
            </button>
          </div>
        )}

        {/* ====== PROGRAMME FORM (simplified) ====== */}
        {entryType === 'programme' && <>
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.programme_info')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.programme_name')} <span className="text-red-400">*</span></label>
              <input
                name="initiative"
                placeholder={t('form.programme_name_placeholder')}
                onChange={handleChange}
                value={formData.initiative}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.description')} <span className="text-red-400">*</span></label>
              <textarea
                name="description"
                placeholder={t('form.programme_desc_placeholder')}
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

        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.programme_details')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.organisation')}</label>
              <input
                name="organisation"
                placeholder={t('form.organisation_placeholder')}
                value={formData.organisation}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.bailleurs')}</label>
              <textarea
                name="bailleurs"
                placeholder={t('form.bailleurs_placeholder')}
                value={formData.bailleurs}
                onChange={handleChange}
                rows={3}
                className={inputClasses}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.point_contact')}</label>
                <input
                  name="point_contact"
                  placeholder={t('form.point_contact_placeholder')}
                  value={formData.point_contact}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.duration')}</label>
                <input
                  name="duree"
                  placeholder={t('form.duration_placeholder')}
                  value={formData.duree}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.year')}</label>
              <input
                name="year"
                type="number"
                placeholder={t('form.year_placeholder', { defaultValue: 'Ex: 2023' })}
                value={formData.year}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.location')}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.commune')}</label>
                <input name="commune" placeholder={t('form.commune_placeholder')} value={formData.commune} onChange={handleChange} className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.zone_intervention')}</label>
                <input name="zone_intervention" placeholder={t('form.zone_intervention_placeholder', { defaultValue: 'Ex: Région de Ziguinchor' })} value={formData.zone_intervention} onChange={handleChange} className={inputClasses} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 pb-8">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            {t('form.create_programme')}
          </button>
        </div>
        </>}

        {/* ====== INITIATIVE FORM (full) ====== */}
        {(entryType === 'initiative' || parentIdFromUrl) && <>
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.general_info')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.initiative_name')} <span className="text-red-400">*</span></label>
              <input
                name="initiative"
                placeholder={t('form.initiative_name_placeholder')}
                onChange={handleChange}
                value={formData.initiative}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.description')} <span className="text-red-400">*</span></label>
              <textarea
                name="description"
                placeholder={t('form.description_placeholder')}
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.profile')}</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.actor_type')} <span className="text-red-400">*</span></label>
              <select
                name="actor_type"
                value={formData.actor_type}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">{t('form.select_option')}</option>
                <option value="groupement">{t('actors.groupement')}</option>
                <option value="gouvernement">{t('actors.gouvernement')}</option>
                <option value="ONG">{t('actors.ong')}</option>
                <option value="recherche">{t('actors.recherche')}</option>
                <option value="entreprise">{t('actors.entreprise')}</option>
                <option value="informel">{t('actors.informel')}</option>
                <option value="autre">{t('actors.autre')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.year')} <span className="text-red-400">*</span></label>
              <input
                name="year"
                type="number"
                placeholder={t('form.year_placeholder')}
                value={formData.year}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('form.activities_label')}</label>
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
                      {activityLabel(activity)}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.location')}</h3>
          <div className="space-y-4">

            {/* Location type selector */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'point', label: t('form.location_precise'), desc: t('form.location_precise_desc') },
                { value: 'multi', label: t('form.location_multi'), desc: t('form.location_multi_desc') },
                { value: 'zone', label: t('form.location_zone'), desc: t('form.location_zone_desc') },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location_type: opt.value }))}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg border text-left transition-all ${
                    formData.location_type === opt.value
                      ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium ${formData.location_type === opt.value ? 'text-emerald-700' : 'text-gray-700'}`}>{opt.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* === MODE POINT (default) === */}
            {formData.location_type === 'point' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.village')} <span className="text-red-400">*</span></label>
                    <input name="village" placeholder={t('form.village_placeholder')} value={formData.village} onChange={handleChange} className={inputClasses} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.commune')}</label>
                    <input name="commune" placeholder={t('form.commune_placeholder')} value={formData.commune} onChange={handleChange} className={inputClasses} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">{t('form.gps_coordinates')}</label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                      {t('form.my_position')}
                    </button>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">
                    <p className="text-xs text-emerald-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('form.gps_help') }} />
                  </div>

                  {gpsAccuracy !== null && (
                    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                      accuracyWarning ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                      <span dangerouslySetInnerHTML={{ __html: `${t('form.accuracy', { value: Math.round(gpsAccuracy) })} ${accuracyWarning ? t('form.accuracy_bad') : t('form.accuracy_good')}` }} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('form.latitude')}</label>
                      <input name="lat" placeholder={t('form.latitude_placeholder')} value={formData.lat}
                        onChange={e => handleLocationPick({ lat: e.target.value, lon: formData.lon }, null)}
                        className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('form.longitude')}</label>
                      <input name="lon" placeholder={t('form.longitude_placeholder')} value={formData.lon}
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
              </>
            )}

            {/* === MODE MULTI === */}
            {formData.location_type === 'multi' && (
              <>
                {/* Summary list of locations */}
                <div className="space-y-2">
                  {locations.map((loc, idx) => {
                    const hasCoords = loc.lat && loc.lon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasCoords ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {loc.label || t('form.location_n', { n: idx + 1 })}
                            {loc.is_primary && (
                              <span className="ml-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{t('form.primary_location').toLowerCase()}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {loc.commune || loc.village || t('form.no_address')}
                            {hasCoords && <span className="ml-1.5 text-emerald-500">({parseFloat(loc.lat).toFixed(4)}, {parseFloat(loc.lon).toFixed(4)})</span>}
                            {!hasCoords && <span className="ml-1.5 text-amber-500">{t('form.no_coordinates')}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingLocIndex(idx)}
                          className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation(idx)}
                            className="shrink-0 text-xs text-red-400 hover:text-red-600 px-1.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {locations.length < 10 && (
                  <button
                    type="button"
                    onClick={addLocation}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    {t('form.add_location')}
                  </button>
                )}

                {/* Recap map showing all placed points */}
                {locations.some(l => l.lat && l.lon) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.location_preview')}</label>
                    <MapContainer center={[14.5, -17.5]}
                      zoom={7} scrollWheelZoom={false}
                      className="rounded-lg border border-gray-200 shadow-sm h-48 w-full"
                    >
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles © Esri"
                      />
                      {locations.map((loc, idx) => {
                        const lt = parseFloat(loc.lat);
                        const ln = parseFloat(loc.lon);
                        if (Number.isNaN(lt) || Number.isNaN(ln)) return null;
                        return (
                          <Marker key={idx} position={[lt, ln]} icon={markerIcon}>
                            <Popup>
                              <span className="text-sm font-medium">{loc.label || t('form.location_n', { n: idx + 1 })}</span>
                              {loc.commune && <span className="text-xs text-gray-400 block">{loc.commune}</span>}
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                )}

                {/* === LOCATION EDIT MODAL === */}
                {editingLocIndex !== null && locations[editingLocIndex] && (
                  <div className="fixed inset-0 z-[1000]">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setEditingLocIndex(null)} />
                    <div className="absolute inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                      {/* Modal header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800">
                          {locations[editingLocIndex].label || t('form.location_n', { n: editingLocIndex + 1 })}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingLocIndex(null)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>

                      {/* Modal body */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t('form.location_name')}</label>
                          <input
                            placeholder={t('form.location_name_placeholder')}
                            value={locations[editingLocIndex].label}
                            onChange={e => handleLocFieldChange(editingLocIndex, 'label', e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('form.village')}</label>
                            <input
                              placeholder={t('form.village_placeholder')}
                              value={locations[editingLocIndex].village}
                              onChange={e => handleLocFieldChange(editingLocIndex, 'village', e.target.value)}
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('form.commune')}</label>
                            <input
                              placeholder={t('form.commune_placeholder')}
                              value={locations[editingLocIndex].commune}
                              onChange={e => handleLocFieldChange(editingLocIndex, 'commune', e.target.value)}
                              className={inputClasses}
                            />
                          </div>
                        </div>

                        {/* Lieu principal checkbox */}
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${locations[editingLocIndex].is_primary ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
                            {locations[editingLocIndex].is_primary && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                          </div>
                          <input
                            type="checkbox"
                            checked={!!locations[editingLocIndex].is_primary}
                            onChange={e => {
                              const checked = e.target.checked;
                              setLocations(prev => prev.map((loc, idx) => ({
                                ...loc,
                                is_primary: idx === editingLocIndex ? checked : (checked ? false : loc.is_primary)
                              })));
                            }}
                            className="sr-only"
                          />
                          <span className="text-sm text-gray-600">{t('form.primary_location')}</span>
                        </label>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-400">{t('form.gps_coordinates')}</label>
                            <button
                              type="button"
                              onClick={getCurrentLocation}
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                              {t('form.my_position')}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">{t('form.latitude')}</label>
                              <input
                                placeholder={t('form.latitude_placeholder')}
                                value={locations[editingLocIndex].lat}
                                onChange={e => handleLocFieldChange(editingLocIndex, 'lat', e.target.value)}
                                className={inputClasses}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">{t('form.longitude')}</label>
                              <input
                                placeholder={t('form.longitude_placeholder')}
                                value={locations[editingLocIndex].lon}
                                onChange={e => handleLocFieldChange(editingLocIndex, 'lon', e.target.value)}
                                className={inputClasses}
                              />
                            </div>
                          </div>

                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
                            <p className="text-xs text-emerald-800">{t('form.gps_modal_help')}</p>
                          </div>

                          <MapContainer
                            center={[
                              parseFloat(locations[editingLocIndex].lat) || 14.5,
                              parseFloat(locations[editingLocIndex].lon) || -17.5
                            ]}
                            zoom={7} scrollWheelZoom={true}
                            className="rounded-lg border border-gray-200 shadow-sm h-56 w-full"
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
                            {(() => {
                              const lt = parseFloat(locations[editingLocIndex].lat);
                              const ln = parseFloat(locations[editingLocIndex].lon);
                              if (Number.isNaN(lt) || Number.isNaN(ln)) return null;
                              return <Marker position={[lt, ln]} icon={markerIcon} />;
                            })()}
                          </MapContainer>
                        </div>
                      </div>

                      {/* Modal footer */}
                      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation(editingLocIndex)}
                            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            {t('form.delete_location')}
                          </button>
                        )}
                        <div className="ml-auto">
                          <button
                            type="button"
                            onClick={() => setEditingLocIndex(null)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            {t('common.validate')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* === MODE ZONE === */}
            {formData.location_type === 'zone' && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {t('form.zone_info')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.village')}</label>
                    <input name="village" placeholder={t('form.village_placeholder')} value={formData.village} onChange={handleChange} className={inputClasses} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.commune')} <span className="text-red-400">*</span></label>
                    <input name="commune" placeholder={t('form.commune_placeholder')} value={formData.commune} onChange={handleChange} className={inputClasses} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.zone_intervention')}</label>
              <input
                name="zone_intervention"
                placeholder={t('form.zone_intervention_placeholder')}
                value={formData.zone_intervention}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.contact')}</h3>

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
            <span className="text-sm text-gray-600">{t('form.same_as_declarant')}</span>
          </label>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.contact_name')} <span className="text-red-400">*</span></label>
              <input
                name="person_name"
                placeholder={t('form.contact_name_placeholder')}
                value={formData.person_name}
                onChange={handleChange}
                disabled={sameAsDeclarant}
                className={sameAsDeclarant ? disabledInputClasses : inputClasses}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.phone')} <span className="text-red-400">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.email_label')}</label>
                <input
                  name="contact_email"
                  placeholder={t('form.email_placeholder')}
                  value={formData.contact_email}
                  onChange={handleChange}
                  disabled={sameAsDeclarant}
                  className={sameAsDeclarant ? disabledInputClasses : inputClasses}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.website')}</label>
              <input name="website" placeholder={t('form.website_placeholder')} value={formData.website} onChange={handleChange} className={inputClasses} />
            </div>

            {currentDytael && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.dytael')}</label>
                <input
                  type="text"
                  value={currentDytael.name}
                  readOnly
                  className={disabledInputClasses}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('form.social_media')}</label>
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
                        placeholder={t('form.social_link_placeholder', { platform })}
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
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('form.additional_fields')}</h3>
            <p className="text-xs text-gray-400 mb-5">{t('form.additional_fields_desc')}</p>
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.photos')}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.add_photos')}</label>
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
            <p className="text-xs text-gray-400 mt-2">{t('form.photo_formats')}</p>
            {photoNotice && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {photoNotice}
              </div>
            )}
          </div>
        </div>

        {/* Videos */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{t('form.video_links')}</h3>
          <div className="space-y-3">
            {videoLinks.map((link, index) => (
              <div key={index}>
                <label className="block text-xs text-gray-400 mb-1">{t('form.video_n', { n: index + 1 })}</label>
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
                {t('form.add_video')}
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
            {parentIdFromUrl ? t('form.add_to_programme') : t('form.submit_initiative')}
          </button>
        </div>
        </>}
      </form>
    </div>
  );
}
