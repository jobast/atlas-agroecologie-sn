import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

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

export default function DytaelChooser() {
  const [dytaels, setDytaels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Read the user's home DyTAEL (if any) so we can highlight it on the chooser.
  // We deliberately don't auto-redirect: a user rattaché to a DyTAEL still has
  // the right to consult the rest of the network (write rights are enforced
  // server-side regardless of which DyTAEL is being viewed).
  let homeDytaelSlug = null;
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    homeDytaelSlug = user?.dytael_slug || null;
  } catch (_) {}

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/dytaels`)
      .then(res => setDytaels(res.data || []))
      .catch(() => setDytaels([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col relative overflow-hidden text-emerald-900">
      <TopoBackground />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-14 max-w-xl">
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-xs font-medium text-emerald-700 tracking-wide">{t('landing.senegal')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-stone-800 tracking-tight mb-3">
            {t('chooser.atlas_title')}
          </h1>
          <p className="text-sm text-stone-400 font-light leading-relaxed max-w-sm mx-auto">
            {t('chooser.subtitle')}
          </p>
        </div>

        {/* National card - full width above */}
        <div className="w-full max-w-2xl mb-4">
          <button
            onClick={() => navigate('/national')}
            className="w-full text-left group bg-teal-800 rounded-2xl px-6 py-6 hover:bg-teal-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <span className="text-xs font-medium text-teal-300 uppercase tracking-wider">DyTAES</span>
                </div>
                <h3 className="text-xl font-medium text-white">{t('chooser.national_view')}</h3>
                <p className="text-sm text-teal-200/70 mt-1">{t('chooser.national_desc')}</p>
              </div>
              <svg className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>
        </div>

        {/* DyTAEL cards - grid below */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dytaels.map(d => {
            const isHome = homeDytaelSlug === d.slug;
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/${d.slug}`)}
                className={`text-left group rounded-xl px-5 py-5 border transition-all duration-200 ${
                  isHome
                    ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 hover:shadow-sm ring-1 ring-emerald-200'
                    : 'bg-white border-stone-200/80 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <svg className={`w-3.5 h-3.5 transition-colors ${isHome ? 'text-emerald-500' : 'text-stone-300 group-hover:text-emerald-500'}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isHome ? 'text-emerald-600' : 'text-stone-400'}`}>DyTAEL</span>
                      {isHome && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                          {t('chooser.your_dytael')}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-medium transition-colors ${isHome ? 'text-emerald-900' : 'text-stone-800 group-hover:text-emerald-800'}`}>
                      {d.name}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isHome ? 'text-emerald-700/70' : 'text-stone-400'}`}>{d.description || t('chooser.territorial_space')}</p>
                  </div>
                  <svg className={`w-4 h-4 transition-all ${isHome ? 'text-emerald-500' : 'text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
