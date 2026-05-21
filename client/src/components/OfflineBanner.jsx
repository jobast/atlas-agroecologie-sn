import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../utils/useOnlineStatus';

// Compact bar shown at the top of the app whenever the browser believes it's
// offline. Stays out of the way (small height, amber) so it doesn't crowd
// the screen on mobile — the goal is just to set expectations: things still
// work, but writes are queued.
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2"
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 1l22 22"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <span>
        {t('offline.banner', {
          defaultValue: 'Vous êtes hors ligne. Vos modifications seront envoyées au retour de la connexion.',
        })}
      </span>
    </div>
  );
}
