import React, { useState } from 'react';
import axios from 'axios';

export default function RequestReset() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/request-reset`, { email });
      setStatus('Si ce compte existe, un email a été envoyé.');
    } catch (_) {
      setStatus('Si ce compte existe, un email a été envoyé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">Mot de passe oublié</h2>
        <p className="text-sm text-gray-600 mb-4">
          Saisissez votre email, un lien de réinitialisation vous sera envoyé.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
        {status && (
          <div className="mt-4 text-sm text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
