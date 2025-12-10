import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EditUser from './EditUser';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  // Fonction pour charger les utilisateurs
  const loadUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des utilisateurs", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const validateUser = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/users/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.map(u => u.id === id ? { ...u, confirmed: true } : u));
    } catch (err) {
      console.error("Erreur de validation", err);
    }
  };

  const deleteUser = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Utilisateurs</h2>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Nom</th>
              <th className="border px-4 py-2">Prénom</th>
              <th className="border px-4 py-2">Rôle</th>
              <th className="border px-4 py-2">Confirmé</th>
              <th className="border px-4 py-2">Téléphone</th>
              <th className="border px-4 py-2">Inscription</th>
              <th className="border px-4 py-2">Dernier login</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="border px-4 py-2">{u.email}</td>
                <td className="border px-4 py-2">{u.name}</td>
                <td className="border px-4 py-2">{u.surname}</td>
                <td className="border px-4 py-2">{u.role}</td>
                <td className="border px-4 py-2">{u.confirmed === true ? "Oui" : "Non"}</td>
                <td className="border px-4 py-2">{u.phone || '–'}</td>
                <td className="border px-4 py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '–'}</td>
                <td className="border px-4 py-2">{u.last_login ? new Date(u.last_login).toLocaleDateString() : '–'}</td>
                <td className="border px-4 py-2 space-x-2">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Modifier
                  </button>
                  {!u.confirmed && (
                    <button onClick={() => validateUser(u.id)} className="text-sm bg-green-500 text-white px-2 py-1 rounded">
                      Valider
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (editingUser?.id === u.id) setEditingUser(null);
                      setTimeout(() => {
                        const confirmed = window.confirm("Confirmer la suppression de cet utilisateur ?");
                        if (confirmed) deleteUser(u.id);
                      }, 100); // pour éviter suppression immédiate si EditUser est ouvert
                    }}
                    className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <EditUser user={editingUser} onUpdated={() => {
            setEditingUser(null);
            loadUsers();
          }} />
        </div>
      )}
    </div>
  );
}
