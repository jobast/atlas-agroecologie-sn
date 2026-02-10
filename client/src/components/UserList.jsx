import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EditUser from './EditUser';

const roleConfig = {
  editor: { label: 'Éditeur', bg: 'bg-gray-50', text: 'text-gray-600' },
  dytael_admin: { label: 'Admin DyTAEL', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  admin: { label: 'Admin DyTAEL', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dytaes_admin: { label: 'Admin DyTAES', bg: 'bg-purple-50', text: 'text-purple-700' },
};

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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

  useEffect(() => { loadUsers(); }, []);

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
      if (editingUser?.id === id) setEditingUser(null);
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
    }
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return [u.email, u.name, u.surname, u.role, u.phone, u.dytael_name]
      .filter(Boolean).join(' ').toLowerCase().includes(term);
  });

  return (
    <div className="mx-4 md:mx-8 my-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Utilisateurs</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="border border-gray-200 rounded-lg pl-10 pr-8 py-2.5 text-sm bg-gray-100 placeholder-gray-400 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-colors"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 w-8"></th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Rôle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">DyTAEL</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Statut</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Inscription</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <p className="text-gray-400">Aucun utilisateur trouvé.</p>
                  </td>
                </tr>
              ) : filtered.map((u) => {
                const rc = roleConfig[u.role] || roleConfig.editor;
                const isExpanded = expandedId === u.id;
                return (
                  <React.Fragment key={u.id}>
                    <tr className={`hover:bg-emerald-50/40 transition-colors ${isExpanded ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-3 py-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : u.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div>
                          <div className="font-semibold text-gray-800">{u.name} {u.surname}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden md:table-cell">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${rc.bg} ${rc.text}`}>{rc.label}</span>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                        <span className="text-gray-600">{u.dytael_name || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 align-top hidden sm:table-cell">
                        {u.confirmed ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Confirmé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                        <span className="text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</span>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            title="Modifier"
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {!u.confirmed && (
                            <button
                              type="button"
                              onClick={() => validateUser(u.id)}
                              title="Valider"
                              className="w-7 h-7 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Supprimer l'utilisateur ${u.email} ?`)) deleteUser(u.id);
                            }}
                            title="Supprimer"
                            className="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="7" className="px-5 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                            <DetailItem label="Email" value={u.email} />
                            <DetailItem label="Prénom" value={u.name || '—'} />
                            <DetailItem label="Nom" value={u.surname || '—'} />
                            <DetailItem label="Téléphone" value={u.phone || '—'} />
                            <DetailItem label="Organisation" value={u.organization || '—'} />
                            <DetailItem label="Rôle" value={rc.label} />
                            <DetailItem label="DyTAEL" value={u.dytael_name || '—'} />
                            <DetailItem label="Inscription" value={u.created_at ? new Date(u.created_at).toLocaleString('fr-FR') : '—'} />
                            <DetailItem label="Dernier login" value={u.last_login ? new Date(u.last_login).toLocaleString('fr-FR') : '—'} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Modifier l'utilisateur</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              <EditUser user={editingUser} onUpdated={() => { setEditingUser(null); loadUsers(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-gray-700 text-sm">{value}</div>
    </div>
  );
}
