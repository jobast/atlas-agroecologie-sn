import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    setMenuOpen(false);
    navigate('/');
  };

  const go = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  const navButton = (to, label, className = '') => (
    <button
      onClick={() => go(to)}
      className={`text-sm text-white hover:text-emerald-100 transition-colors ${className}`}
    >
      {label}
    </button>
  );

  return (
    <nav className="bg-emerald-800 text-white shadow p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="font-bold text-white hover:text-emerald-100 transition-colors truncate">
          <span className="hidden sm:inline text-xl">Atlas des initiatives agroécologiques</span>
          <span className="sm:hidden text-base">Atlas Agroécologie</span>
        </Link>
        <div className="hidden md:flex items-center gap-4 ml-4">
          {navButton('/map', 'Carte')}
          {navButton('/table', 'Tableau')}
          {token && navButton('/my-initiatives', 'Mes initiatives')}
          {token && navButton('/submit', 'Soumettre')}
          {isAdmin && navButton('/admin', 'Gérer les données')}
          {isAdmin && navButton('/users', 'Gérer les utilisateurs')}
          {isAdmin && navButton('/form-fields', 'Formulaire')}
        </div>
      </div>
      <div className="hidden md:flex items-center gap-3">
        {!token ? (
          <>
            <button
              onClick={() => go('/register')}
              className="text-sm underline text-white hover:text-emerald-100 transition-colors"
            >
              S'inscrire
            </button>
            <button
              onClick={() => go('/login')}
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

      <div className="md:hidden flex items-center gap-2">
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="px-3 py-2 rounded border border-white/20 bg-white/10 hover:bg-white/15"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-emerald-800 text-white shadow-lg border-t border-white/10 p-4 space-y-3">
            <div className="flex flex-col gap-3">
              {navButton('/map', 'Carte', 'text-left')}
              {navButton('/table', 'Tableau', 'text-left')}
              {token && navButton('/my-initiatives', 'Mes initiatives', 'text-left')}
              {token && navButton('/submit', 'Soumettre', 'text-left')}
              {isAdmin && navButton('/admin', 'Gérer les données', 'text-left')}
              {isAdmin && navButton('/users', 'Gérer les utilisateurs', 'text-left')}
              {isAdmin && navButton('/form-fields', 'Formulaire', 'text-left')}
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
              {!token ? (
                <>
                  <button
                    onClick={() => go('/register')}
                    className="text-sm underline text-white hover:text-emerald-100 transition-colors text-left"
                  >
                    S'inscrire
                  </button>
                  <button
                    onClick={() => go('/login')}
                    className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-2 rounded border border-white/20 transition-colors text-left"
                  >
                    Connexion
                  </button>
                </>
              ) : (
                <>
                  {userEmail && <span className="text-sm text-white/90 truncate">Connecté : {userEmail}</span>}
                  <button
                    onClick={logout}
                    className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-2 rounded border border-white/20 transition-colors text-left"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
