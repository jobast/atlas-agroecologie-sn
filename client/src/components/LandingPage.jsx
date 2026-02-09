import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDytael } from '../context/DytaelContext';

const TopoBackground = () => (
  <div
    className="fixed inset-0 opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: 'url(/topo-bg.jpg)',
      backgroundSize: '800px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
    }}
  />
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { currentDytael, isNational } = useDytael();
  const token = localStorage.getItem('token');
  let user = null;
  let isAdmin = false;
  let isAuthenticated = false;

  try {
    if (token) {
      user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id && user.role) {
        isAuthenticated = true;
        isAdmin = ['admin', 'dytael_admin', 'dytaes_admin'].includes(user.role);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  } catch (err) {
    console.warn("Erreur parsing user :", err);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  const p = (path) => `/${slug}${path}`;

  const handleAddInitiative = () => {
    navigate(isAuthenticated ? p('/submit') : '/login');
  };

  const handleEditInitiative = () => {
    navigate(isAuthenticated ? p('/my-initiatives') : '/login');
  };

  const titleSuffix = isNational
    ? 'Sénégal'
    : (currentDytael?.name || slug);

  const descriptionText = isNational
    ? "Identifier, visualiser et valoriser les acteurs et initiatives agroécologiques au niveau national."
    : `Identifier, visualiser et valoriser les acteurs et initiatives agroécologiques du département de ${titleSuffix}.`;

  const actions = [
    {
      label: 'Explorer la carte',
      description: 'Visualiser les initiatives sur le territoire',
      onClick: () => navigate(p('/map')),
      accent: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      ),
    },
    {
      label: 'Voir le tableau',
      description: 'Consulter les données en liste',
      onClick: () => navigate(p('/table')),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
    },
    {
      label: 'Ajouter une initiative',
      description: isAuthenticated ? 'Soumettre une nouvelle initiative' : 'Connectez-vous pour soumettre',
      onClick: handleAddInitiative,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: 'Mes initiatives',
      description: isAuthenticated ? 'Modifier ou suivre vos soumissions' : 'Connectez-vous pour accéder',
      onClick: handleEditInitiative,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col relative overflow-hidden text-emerald-900">
      <TopoBackground />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        {/* Hero */}
        <div className="text-center mb-12 max-w-lg">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-xs font-medium text-emerald-700 tracking-wide">
              {isNational ? 'DyTAES National' : `DyTAEL ${titleSuffix}`}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-stone-800 tracking-tight mb-3">
            {isNational ? 'Atlas Agroécologique' : titleSuffix}
          </h1>
          <div className="w-12 h-px bg-emerald-600/40 mx-auto mb-4" />
          <p className="text-stone-400 font-light leading-relaxed text-sm">
            {descriptionText}
          </p>
        </div>

        {/* Main actions */}
        <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`group text-left rounded-xl px-5 py-4 transition-all duration-200 ${
                action.accent
                  ? 'bg-emerald-700 hover:bg-emerald-600 shadow-sm hover:shadow-md'
                  : 'bg-white border border-stone-200/80 hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 transition-colors ${action.accent ? 'text-emerald-200' : 'text-stone-400 group-hover:text-emerald-600'}`}>
                  {action.icon}
                </div>
                <div>
                  <div className={`text-sm font-medium transition-colors ${action.accent ? 'text-white' : 'text-stone-700 group-hover:text-emerald-800'}`}>
                    {action.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${action.accent ? 'text-emerald-200/70' : 'text-stone-400'}`}>
                    {action.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Auth link */}
        {!isAuthenticated && (
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-stone-400 hover:text-emerald-700 transition-colors"
          >
            Se connecter
          </button>
        )}

        {/* Admin section */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-stone-200/60 w-full max-w-lg">
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-3 text-center">Administration</p>
            <div className="flex justify-center gap-2">
              {[
                { label: 'Données', path: p('/admin'), icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
                { label: 'Utilisateurs', path: p('/users'), icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
                { label: 'Formulaire', path: p('/form-fields'), icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
