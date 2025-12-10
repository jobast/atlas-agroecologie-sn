import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const token = localStorage.getItem('token');

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const normalized = res.data.map((i) => ({
          ...i,
          activities: parseMaybeJson(i.activities, []),
          social_media: parseMaybeJson(i.social_media, []),
          videos: parseMaybeJson(i.videos, []),
          extra_fields: parseMaybeJson(i.extra_fields, null),
        }));
        setItems(normalized);
      } catch (err) {
        console.error('Erreur chargement données', err);
        if (err.response?.status === 403) {
          setError("Accès réservé à l'administration.");
        } else {
          setError("Impossible de charger les données.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateStatusLocally = (ids, status) => {
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, status } : i)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const handleValidate = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          axios.put(`${import.meta.env.VITE_API_URL}/data/${id}/validate`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      updateStatusLocally(ids, 'approved');
    } catch (err) {
      console.error('Erreur validation', err);
      setError("Validation impossible pour le moment.");
    }
  };

  const handleReject = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          axios.put(`${import.meta.env.VITE_API_URL}/data/${id}/reject`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      updateStatusLocally(ids, 'rejected');
    } catch (err) {
      console.error('Erreur rejet', err);
      setError("Rejet impossible pour le moment.");
    }
  };

  const filtered = useMemo(() => {
    let arr = [...items];
    if (filterStatus !== 'all') {
      arr = arr.filter((i) => i.status === filterStatus);
    }
    if (sortBy === 'newest') {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'name') {
      arr.sort((a, b) => (a.initiative || '').localeCompare(b.initiative || ''));
    }
    return arr;
  }, [items, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const base = { total: items.length, pending: 0, approved: 0, rejected: 0, delete_requested: 0 };
    const activityCount = {};
    items.forEach((i) => {
      base[i.status] = (base[i.status] || 0) + 1;
      (i.activities || []).forEach((a) => {
        const key = typeof a === 'string' ? a : JSON.stringify(a);
        activityCount[key] = (activityCount[key] || 0) + 1;
      });
    });
    return { ...base, activityCount };
  }, [items]);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded p-3 bg-white shadow">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-bold">{stats.total}</div>
        </div>
        <div className="border rounded p-3 bg-white shadow">
          <div className="text-xs text-gray-500">En attente</div>
          <div className="text-xl font-bold text-orange-600">{stats.pending || 0}</div>
        </div>
        <div className="border rounded p-3 bg-white shadow">
          <div className="text-xs text-gray-500">Validées</div>
          <div className="text-xl font-bold text-green-600">{stats.approved || 0}</div>
        </div>
        <div className="border rounded p-3 bg-white shadow">
          <div className="text-xs text-gray-500">Rejetées</div>
          <div className="text-xl font-bold text-red-600">{stats.rejected || 0}</div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Statut :
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Validées</option>
            <option value="rejected">Rejetées</option>
            <option value="delete_requested">Suppression demandée</option>
          </select>
        </label>
        <label className="text-sm">
          Tri :
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
          >
            <option value="newest">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="name">Nom</option>
          </select>
        </label>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleValidate(selectedIds)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              Valider ({selectedIds.length})
            </button>
            <button
              onClick={() => handleReject(selectedIds)}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              Rejeter ({selectedIds.length})
            </button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500">Aucune initiative.</p>
        ) : (
          filtered.map((i) => (
            <div key={i.id} className="border rounded p-3 bg-white shadow-sm flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(i.id)}
                  onChange={() => toggleSelect(i.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong>{i.initiative || 'Sans nom'}</strong>
                    <span className="text-xs uppercase px-2 py-1 rounded bg-gray-100">
                      {i.status || 'pending'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {(i.village || i.commune || 'Lieu inconnu')} • {i.actor_type || 'Type nc'} • {i.year || 'Année nc'}
                  </div>
                  {i.activities && i.activities.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Activités : {i.activities.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleValidate([i.id])}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => handleReject([i.id])}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => setDetailItem(i)}
                    className="bg-gray-200 px-3 py-1 rounded text-sm"
                  >
                    Détail
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {detailItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg max-w-2xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setDetailItem(null)}
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-2">{detailItem.initiative}</h3>
            <div className="text-sm space-y-1">
              <div><strong>Statut :</strong> {detailItem.status}</div>
              <div><strong>Description :</strong> {detailItem.description || '—'}</div>
              <div><strong>Localisation :</strong> {detailItem.village} {detailItem.commune ? `(${detailItem.commune})` : ''}</div>
              <div><strong>Zone intervention :</strong> {detailItem.zone_intervention || '—'}</div>
              <div><strong>Type d’acteur :</strong> {detailItem.actor_type || '—'}</div>
              <div><strong>Année :</strong> {detailItem.year || '—'}</div>
              <div><strong>Activités :</strong> {(detailItem.activities || []).join(', ') || '—'}</div>
              <div><strong>Contacts :</strong> {detailItem.person_name || '—'} · {detailItem.contact_phone || '—'} · {detailItem.contact_email || '—'}</div>
              <div><strong>Site web :</strong> {detailItem.website || '—'}</div>
              <div><strong>Réseaux sociaux :</strong> {detailItem.social_media?.length ? detailItem.social_media.map((s) => `${s.platform || ''} ${s.url || ''}`).join(', ') : '—'}</div>
              <div><strong>Vidéos :</strong> {detailItem.videos?.length ? detailItem.videos.join(', ') : '—'}</div>
              <div><strong>Coordonnées :</strong> {detailItem.lat}, {detailItem.lon}</div>
              <div><strong>Créé le :</strong> {detailItem.created_at ? new Date(detailItem.created_at).toLocaleString() : '—'}</div>
              <div><strong>ID utilisateur :</strong> {detailItem.user_id || '—'}</div>
              {detailItem.photos && detailItem.photos.length > 0 && (
                <div>
                  <strong>Photos :</strong>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {detailItem.photos.map((p, idx) => (
                      <a key={idx} href={p} target="_blank" rel="noopener noreferrer">
                        <img src={p} alt="photo" className="w-16 h-16 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <strong>Champs supplémentaires :</strong>{' '}
                {detailItem.extra_fields
                  ? Object.entries(typeof detailItem.extra_fields === 'string' ? JSON.parse(detailItem.extra_fields) : detailItem.extra_fields)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                  : '—'}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to={`/edit/${detailItem.id}`}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                ✏️ Modifier
              </Link>
              <button
                onClick={() => { setDetailItem(null); handleValidate([detailItem.id]); }}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Valider
              </button>
              <button
                onClick={() => { setDetailItem(null); handleReject([detailItem.id]); }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
