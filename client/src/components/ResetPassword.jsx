import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/auth/reset/${token}`)
      .then(() => setValid(true))
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset/${token}`, { password });
      setStatus('Mot de passe mis à jour. Redirection…');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setStatus('Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) return <p className="text-center mt-10">Vérification du lien…</p>;
  if (valid === false) return <p className="text-center mt-10 text-red-600">Lien invalide ou expiré.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">Nouveau mot de passe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirmer"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
        </form>
        {status && (
          <div className="mt-4 text-sm text-center text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
