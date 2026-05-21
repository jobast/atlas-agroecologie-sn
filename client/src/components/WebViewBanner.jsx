import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebView } from '../utils/useWebView';

// In-app browsers (Facebook, Instagram, WhatsApp, etc.) generally disable
// service workers and IndexedDB, which means the offline submission queue
// silently breaks. Detect that case once and tell the user to open the link
// in a real browser before they start filling things in. Persistent (no
// dismiss) on purpose - a contributor who skips this will lose data later.
export default function WebViewBanner() {
  const inWebView = useWebView();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  if (!inWebView) return null;

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked - user can long-press the URL */ }
  };

  return (
    <div
      role="alert"
      className="w-full bg-yellow-50 border-b border-yellow-300 text-yellow-900 px-4 py-3 text-sm"
    >
      <div className="flex items-start gap-3 max-w-3xl mx-auto">
        <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">
            {t('webview.title', { defaultValue: 'Ouvrez ce lien dans votre navigateur' })}
          </div>
          <div className="mt-1">
            {t('webview.message', {
              defaultValue: 'Atlas Agroécologie a besoin d\'un vrai navigateur (Chrome, Safari) pour fonctionner hors-ligne et installer l\'application. L\'app actuelle ne pourra pas enregistrer vos soumissions si le réseau coupe.',
            })}
          </div>
          <button
            type="button"
            onClick={copy}
            className="mt-2 inline-flex items-center gap-1.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1.5 rounded text-xs font-medium transition-colors"
          >
            {copied
              ? t('webview.copied', { defaultValue: 'URL copiée !' })
              : t('webview.copy', { defaultValue: 'Copier l\'URL' })}
          </button>
        </div>
      </div>
    </div>
  );
}
