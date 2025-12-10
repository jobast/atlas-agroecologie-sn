import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function EditInitiative() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== 'admin') {
        setUnauthorized(true);
      }
    } else {
      setUnauthorized(true);
    }
  }, []);

  const [form, setForm] = useState(null);
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
    })
    .catch((err) => console.error("Erreur chargement initiative:", err))
    .finally(() => setLoading(false));
}, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  // 🧠 Nettoyer les activités : transformer la chaîne en tableau
  const preparedForm = {
    ...form,
    activities: form.activities
      ? form.activities.split(",").map((a) => a.trim())
      : []
  };

  const token = localStorage.getItem('token');

  axios
    .put(`${import.meta.env.VITE_API_URL}/data/${id}`, preparedForm, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(() => {
      alert("Initiative modifiée avec succès");
      navigate("/my-initiatives");
    })
    .catch((err) => {
      console.error("Erreur modification:", err);
      alert("Erreur lors de la mise à jour");
    });
};

  if (unauthorized) return <p>⛔ Accès réservé aux administrateurs.</p>;
  if (loading) return <p>Chargement...</p>;
  if (!form) return <p>Erreur chargement</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modifier l'initiative</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Nom de l'initiative</label>
          <input
            type="text"
            name="initiative"
            value={form.initiative || ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label>Commune</label>
          <input
            type="text"
            name="commune"
            value={form.commune || ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
  <label>Village</label>
  <input type="text" name="village" value={form.village || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Zone d'intervention</label>
  <input type="text" name="zone_intervention" value={form.zone_intervention || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Type d'acteur</label>
  <input type="text" name="actor_type" value={form.actor_type || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Année</label>
  <input type="number" name="year" value={form.year || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Activités</label>
  <input type="text" name="activities" value={form.activities || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Latitude</label>
  <input type="number" name="lat" step="any" value={form.lat || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Longitude</label>
  <input type="number" name="lon" step="any" value={form.lon || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Email de contact</label>
  <input type="email" name="contact_email" value={form.contact_email || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Téléphone</label>
  <input type="text" name="contact_phone" value={form.contact_phone || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Nom du contact</label>
  <input type="text" name="person_name" value={form.person_name || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Site web</label>
  <input type="text" name="website" value={form.website || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Réseaux sociaux</label>
  <input type="text" name="social_media" value={form.social_media || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
<div>
  <label>Liens vidéos</label>
  <input type="text" name="videos" value={form.videos || ""} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
</div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
