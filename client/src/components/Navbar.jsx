import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.role);
        setUserEmail(parsed.email);
        if (!localStorage.getItem('token') || !parsed.role || !parsed.email) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUserRole(null);
          setUserEmail(null);
        }
      } catch (e) {
        console.error("Erreur de parsing du rôle utilisateur :", e);
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="bg-system text-white px-6 py-4 flex justify-between items-center shadow">
      <div className="flex space-x-6 text-sm font-semibold">
        <Link to="/" className="hover:text-laterite">Page d'accueil</Link>
        <Link to="/map" className="hover:text-laterite">Carte interactive</Link>

        {token && (
          <>
            <Link to="/submit" className="hover:text-laterite">Soumettre</Link>
            <Link to="/my-initiatives" className="hover:text-laterite">Mes initiatives</Link>
            {userRole === 'admin' && (
              <>
                <Link to="/admin" className="hover:text-laterite">Gérer les données</Link>
                <Link to="/users" className="hover:text-laterite">Utilisateurs</Link>
                <Link to="/form-fields" className="hover:text-laterite">Formulaire</Link>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {!token ? (
          <>
            <Link to="/register" className="text-sm underline hover:text-laterite">
              S'inscrire
            </Link>
            <Link to="/login" className="bg-nature hover:bg-laterite text-white px-3 py-1 rounded text-sm">
              Connexion
            </Link>
          </>
        ) : (
          <>
            {userEmail && (
              <span className="text-sm text-white mr-2">Connecté en tant que : {userEmail}</span>
            )}
            <button onClick={logout} className="bg-laterite hover:bg-nature text-white px-3 py-1 rounded text-sm">
              Déconnexion
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
