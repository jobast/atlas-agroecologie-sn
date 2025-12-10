import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let user = null;
  let isAdmin = false;
  let isAuthenticated = false;

  try {
    if (token) {
      user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id && user.role) {
        isAuthenticated = true;
        isAdmin = user.role === 'admin';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  } catch (err) {
    console.warn("❗ Erreur parsing user :", err);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  const handleAddInitiative = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/submit');
    }
  };

  const handleEditInitiative = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/my-initiatives');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">GeoCollect</h1>
      </nav>

      <div className="max-w-3xl mx-auto text-center mt-12 px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Bienvenue !</h2>
        <p className="text-gray-700">
          Cet outil de cartographie permet d’identifier, visualiser et valoriser les acteurs et initiatives
          agroécologiques du département de Bignona. Il a été conçu par la DYTAEL de Bignona.
        </p>
      </div>

      <div className="max-w-4xl mx-auto py-16 px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div onClick={() => navigate('/map')} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-blue-50 transition">
          <svg className="mx-auto mb-2 w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.553-1.948L9 2m0 18l6-3m-6 3V2m6 15l5.447-2.724A2 2 0 0021 15.382V5.618a2 2 0 00-1.553-1.948L15 2m0 18V2" />
          </svg>
          <p className="font-medium">Voir la carte</p>
        </div>

        <div onClick={handleAddInitiative} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-green-50 transition">
          <svg className="mx-auto mb-2 w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <p className="font-medium">Ajouter une initiative</p>
        </div>

        <div onClick={handleEditInitiative} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-orange-50 transition">
          <svg className="mx-auto mb-2 w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M16 3l5 5L10 19H5v-5L16 3z" />
          </svg>
          <p className="font-medium">Modifier une initiative</p>
        </div>

        {!isAuthenticated && (
          <div onClick={() => navigate('/login')} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-purple-50 transition">
            <svg className="mx-auto mb-2 w-8 h-8 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4m13-4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Se connecter</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div onClick={() => navigate('/admin')} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-red-50 transition">
              <svg className="mx-auto mb-2 w-8 h-8 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <p className="font-medium">Gérer les données</p>
            </div>

            <div onClick={() => navigate('/users')} className="cursor-pointer bg-white shadow p-6 rounded hover:bg-pink-50 transition">
              <svg className="mx-auto mb-2 w-8 h-8 text-pink-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M7 20H2v-2a4 4 0 014-4h1m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="font-medium">Gérer les utilisateurs</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}