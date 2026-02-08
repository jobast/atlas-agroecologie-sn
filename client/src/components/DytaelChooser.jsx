import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DytaelChooser() {
  const [dytaels, setDytaels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/dytaels`)
      .then(res => setDytaels(res.data || []))
      .catch(() => setDytaels([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-redirect logged-in user to their DyTAEL
  useEffect(() => {
    if (loading) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.dytael_slug) {
        navigate(`/${user.dytael_slug}/map`, { replace: true });
      }
    } catch (_) {}
  }, [loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto text-center mt-16 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Atlas des initiatives agroécologiques</h1>
        <p className="text-gray-600 mb-8">Choisissez votre espace territorial</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {dytaels.map(d => (
          <div
            key={d.id}
            onClick={() => navigate(`/${d.slug}`)}
            className="cursor-pointer bg-white shadow-md rounded-lg p-6 hover:shadow-lg hover:bg-emerald-50 transition border border-gray-100"
          >
            <h3 className="text-lg font-bold text-emerald-800 mb-2">DyTAEL {d.name}</h3>
            <p className="text-sm text-gray-600">{d.description || `Espace ${d.name}`}</p>
          </div>
        ))}

        <div
          onClick={() => navigate('/national')}
          className="cursor-pointer bg-white shadow-md rounded-lg p-6 hover:shadow-lg hover:bg-blue-50 transition border border-blue-100"
        >
          <h3 className="text-lg font-bold text-blue-800 mb-2">Vue nationale (DyTAES)</h3>
          <p className="text-sm text-gray-600">Toutes les initiatives du Sénégal</p>
        </div>
      </div>
    </div>
  );
}
