import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ConfirmEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/auth/confirm/${token}`)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return <p className="text-center mt-20">Validation&nbsp;…</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-md text-center">
        {status === 'ok' ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-green-600">Adresse confirmée !</h2>
            <p className="mb-6">Votre e-mail est vérifié. Vous pouvez maintenant vous connecter.</p>
            <Link
              to="/login"
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            >
              Se connecter
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Lien invalide</h2>
            <p className="mb-6">Le lien est expiré ou déjà utilisé.</p>
            <Link
              to="/"
              className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
            >
              Retour à l’accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
