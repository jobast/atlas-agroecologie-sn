import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "./EditUser.css";

export default function EditUser({ user, onUpdated }) {
  // Contrôle d'accès basé sur le rôle utilisateur
  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser || currentUser.role !== 'admin') {
    return <p className="text-center text-red-600 font-semibold">Accès réservé aux administrateurs.</p>;
  }

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteUser = async () => {
    if (!showDeleteConfirm) {
      console.warn("Suppression bloquée : confirmation non affichée");
      return;
    }
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdated();
    } catch (err) {
      alert("Erreur lors de la suppression.");
      console.error("Erreur suppression :", err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };
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
      setEditing(false);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'utilisateur :", err);
    }
  };

  if (!editing) {
    return (
      <>
        <div className="border p-4 rounded mb-4 shadow">
          <p><strong>{user.email}</strong></p>
          <p>{user.name} {user.surname}</p>
          <p>Téléphone : {user.phone}</p>
          <p>Organisation : {user.organization}</p>
          <p>Rôle : {user.role}</p>
          <p>Validé : {user.confirmed ? 'Oui' : 'Non'}</p>
          <button type="button" onClick={() => setEditing(true)} className="bg-blue-600 text-white px-3 py-1 rounded mt-2">Modifier</button>
          <button type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-3 py-1 rounded mt-2 ml-2"
          >
            Supprimer
          </button>
        </div>
        {showDeleteConfirm && (
          <>
            <div
              className="modal-backdrop"
              onClick={() => setShowDeleteConfirm(false)}
            ></div>

            <div className="modal">
              <h2>Confirmer la suppression</h2>
              <p>
                Êtes‑vous sûr de vouloir supprimer l’utilisateur <strong>{user.email}</strong> ?
                <br />
                Cette action est <strong>irréversible</strong>.
              </p>

              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded mr-2"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={deleteUser}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="border p-4 rounded mb-4 shadow">
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      />
      <input
        type="text"
        name="name"
        placeholder="Prénom"
        value={form.name}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      />
      <input
        type="text"
        name="surname"
        placeholder="Nom"
        value={form.surname}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      />
      <input
        type="text"
        name="phone"
        placeholder="Téléphone"
        value={form.phone}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      />
      <input
        type="text"
        name="organization"
        placeholder="Organisation"
        value={form.organization}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      />
      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="block w-full mb-2 border px-2 py-1"
      >
        <option value="admin">Admin</option>
        <option value="contributor">Contributor</option>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
      </select>
      <label className="block mb-2">
        <input
          type="checkbox"
          name="confirmed"
          checked={form.confirmed}
          onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
          className="mr-2"
        />
        Compte confirmé
      </label>
      <div className="flex space-x-2 mt-2">
        <button type="button" onClick={handleSave} className="bg-green-600 text-white px-3 py-1 rounded">Enregistrer</button>
        <button type="button" onClick={() => setEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded">Annuler</button>
      </div>
    </div>
  );
  
}
