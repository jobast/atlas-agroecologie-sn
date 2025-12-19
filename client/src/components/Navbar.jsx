import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const syncAuthFromStorage = () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (!storedToken || !parsed.role || !parsed.email) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUserRole(null);
          setUserEmail(null);
          return;
        }
        setUserRole(parsed.role);
        setUserEmail(parsed.email);
        setToken(storedToken);
      } catch (e) {
        console.error("Erreur de parsing du rôle utilisateur :", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUserRole(null);
        setUserEmail(null);
      }
    } else {
      setToken(null);
      setUserRole(null);
      setUserEmail(null);
    }
  };

  useEffect(() => {
    syncAuthFromStorage();
    const handleStorage = () => syncAuthFromStorage();
    const handleFocus = () => syncAuthFromStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const isAdmin = userRole === 'admin';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUserRole(null);
    setUserEmail(null);
    navigate('/');
  };

  const navButton = (to, label) => (
    <button
      onClick={() => navigate(to)}
      className="text-sm text-white hover:text-emerald-100 transition-colors"
    >
      {label}
    </button>
  );

  return (
    <nav className="bg-emerald-800 text-white shadow p-4 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-bold text-white hover:text-emerald-100 transition-colors mr-6">
          Atlas des initiatives agroécologiques
        </Link>
        {navButton('/map', 'Carte')}
        {token && navButton('/my-initiatives', 'Mes initiatives')}
        {token && navButton('/submit', 'Soumettre')}
        {isAdmin && navButton('/admin', 'Gérer les données')}
        {isAdmin && navButton('/users', 'Gérer les utilisateurs')}
        {isAdmin && navButton('/form-fields', 'Formulaire')}
      </div>
      <div className="flex items-center gap-3">
        {!token ? (
          <>
            <button
              onClick={() => navigate('/register')}
              className="text-sm underline text-white hover:text-emerald-100 transition-colors"
            >
              S'inscrire
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1 rounded border border-white/20 transition-colors"
            >
              Connexion
            </button>
          </>
        ) : (
          <>
            {userEmail && <span className="text-sm text-white/90">Connecté : {userEmail}</span>}
            <button
              onClick={logout}
              className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1 rounded border border-white/20 transition-colors"
            >
              Déconnexion
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
