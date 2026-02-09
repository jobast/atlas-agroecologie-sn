import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const slug = params.slug || null;
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
        console.error("Erreur de parsing du role utilisateur :", e);
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
    const handleAuthChange = () => syncAuthFromStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [location.pathname]);

  const isAdmin = ['admin', 'dytael_admin', 'dytaes_admin'].includes(userRole);
  const isDytaesAdmin = userRole === 'dytaes_admin';

  const p = (path) => slug ? `/${slug}${path}` : path;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
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

  const isActive = (path) => location.pathname === path;

  // Context subtitle
  let subtitle = 'Sénégal';
  if (slug && slug !== 'national') {
    subtitle = slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  // Nav items
  const mainNav = [
    { to: p('/map'), label: 'Carte' },
    { to: p('/table'), label: 'Tableau' },
  ];
  const userNav = token ? [
    { to: p('/submit'), label: 'Soumettre' },
    { to: p('/my-initiatives'), label: 'Mes initiatives' },
  ] : [];
  const adminNav = isAdmin ? [
    { to: p('/admin'), label: 'Données' },
    { to: p('/users'), label: 'Utilisateurs' },
    { to: p('/form-fields'), label: 'Formulaire' },
    ...(isDytaesAdmin ? [{ to: '/national/dytaels', label: 'DyTAELs' }] : []),
  ] : [];

  const allNav = [...mainNav, ...userNav];

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: brand + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <svg className="w-5 h-5 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div className="leading-tight">
              <div className="font-medium text-stone-800 text-sm tracking-tight">Atlas Agroécologie</div>
              {subtitle && (
                <div className="text-[11px] font-light text-stone-400 tracking-wide">{subtitle}</div>
              )}
            </div>
          </Link>
        </div>

        {/* Center: main nav (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {allNav.map(item => (
            <button
              key={item.to}
              onClick={() => go(item.to)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(item.to)
                  ? 'text-emerald-800 bg-emerald-50 font-medium'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
          {adminNav.length > 0 && (
            <>
              <span className="w-px h-4 bg-stone-200 mx-1" />
              {adminNav.map(item => (
                <button
                  key={item.to}
                  onClick={() => go(item.to)}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    isActive(item.to)
                      ? 'text-emerald-800 bg-emerald-50 font-medium'
                      : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Right: auth (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {!token ? (
            <>
              <button
                onClick={() => go('/login')}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => go('/register')}
                className="text-sm text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/60 transition-colors"
              >
                S'inscrire
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 truncate max-w-[160px]">{userEmail}</span>
              <button
                onClick={logout}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ top: '3.5rem' }}>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative bg-white border-b border-stone-200 shadow-lg p-4 space-y-1">
            {allNav.map(item => (
              <button
                key={item.to}
                onClick={() => go(item.to)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.to)
                    ? 'text-emerald-800 bg-emerald-50 font-medium'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            {adminNav.length > 0 && (
              <>
                <div className="pt-2 mt-2 border-t border-stone-100">
                  <span className="px-3 text-[10px] uppercase tracking-wider text-stone-400">Administration</span>
                </div>
                {adminNav.map(item => (
                  <button
                    key={item.to}
                    onClick={() => go(item.to)}
                    className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive(item.to)
                        ? 'text-emerald-800 bg-emerald-50 font-medium'
                        : 'text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
            <div className="pt-3 mt-2 border-t border-stone-100">
              {!token ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => go('/login')}
                    className="flex-1 text-sm text-stone-600 py-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => go('/register')}
                    className="flex-1 text-sm text-emerald-700 bg-emerald-50 py-2.5 rounded-lg border border-emerald-200/60 transition-colors"
                  >
                    S'inscrire
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs text-stone-400 truncate">{userEmail}</span>
                  <button
                    onClick={logout}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
