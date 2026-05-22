import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// PWA install affordance. We never auto-prompt the user (that would be
// pushy for casual visitors). Instead:
//   - On Chrome-based browsers we listen for beforeinstallprompt, stash the
//     event, and expose a button that calls prompt() on click.
//   - On iOS Safari there's no programmatic prompt - we surface a "How to
//     install on iPhone" modal with the Share -> Add to Home Screen flow.
//   - When the app is already running standalone (display-mode: standalone)
//     we render nothing.
function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari custom property — set when launched from home-screen icon.
  if (window.navigator && window.navigator.standalone === true) return true;
  return false;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

// Apple only allows the install gesture in Safari. Chrome iOS, Firefox iOS,
// etc. are WebKit wrappers without install capability — clicking "Install"
// in them does nothing, so detect and route them to a "use Safari" hint.
function isChromeIos() {
  if (typeof navigator === 'undefined') return false;
  return /CriOS\//.test(navigator.userAgent || '');
}
function isNonSafariIos() {
  if (!isIos()) return false;
  const ua = navigator.userAgent || '';
  // Safari itself does NOT contain CriOS/FxiOS/EdgiOS.
  return /CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\//.test(ua);
}

export default function InstallButton({ className = '' }) {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHowto, setShowIosHowto] = useState(false);
  const [showChromeIosHint, setShowChromeIosHint] = useState(false);
  const standalone = isStandalone();
  const nonSafariIos = isNonSafariIos();

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault(); // suppress Chrome's automatic mini-infobar
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone) return null;

  const onClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch { /* ignore */ }
      setDeferredPrompt(null);
      return;
    }
    if (nonSafariIos) {
      setShowChromeIosHint(true);
      return;
    }
    if (isIos()) {
      setShowIosHowto(true);
    }
  };

  // If we have neither a deferred prompt nor an iOS environment, the browser
  // doesn't support install — hide the button entirely to avoid dead UI.
  if (!deferredPrompt && !isIos()) return null;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={className || 'inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {deferredPrompt
          ? t('install.button', { defaultValue: 'Installer l\'app' })
          : t('install.ios.button', { defaultValue: 'Installer sur iPhone' })}
      </button>

      {showChromeIosHint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowChromeIosHint(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {t('install.chromeIos.title', { defaultValue: 'Installation impossible dans ce navigateur' })}
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {t('install.chromeIos.body', {
                defaultValue: 'Sur iPhone, Apple n\'autorise l\'installation que dans Safari. Copiez l\'URL ci-dessous, puis collez-la dans Safari pour installer Atlas.',
              })}
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.origin + '/');
                  alert(t('webview.copied', { defaultValue: 'URL copiée !' }));
                } catch { /* ignore */ }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {t('webview.copy', { defaultValue: 'Copier l\'URL' })}
            </button>
            <button
              type="button"
              onClick={() => setShowChromeIosHint(false)}
              className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              {t('common.close', { defaultValue: 'Fermer' })}
            </button>
          </div>
        </div>
      )}

      {showIosHowto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowIosHowto(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {t('install.ios.title', { defaultValue: 'Installer sur iPhone' })}
            </h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>{t('install.ios.step1', { defaultValue: 'Tapez sur le bouton Partager en bas (carré avec une flèche).' })}</li>
              <li>{t('install.ios.step2', { defaultValue: 'Faites défiler et choisissez "Sur l\'écran d\'accueil".' })}</li>
              <li>{t('install.ios.step3', { defaultValue: 'Confirmez avec "Ajouter".' })}</li>
            </ol>
            <p className="text-xs text-gray-500 mt-4">
              {t('install.ios.note', { defaultValue: 'Ouvrez ce site dans Safari si vous voyez cette boîte dans une autre application.' })}
            </p>
            <button
              type="button"
              onClick={() => setShowIosHowto(false)}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              {t('common.close', { defaultValue: 'Fermer' })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
