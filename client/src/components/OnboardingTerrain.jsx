import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstallButton from './InstallButton';
import { detectWebView } from '../utils/useWebView';

// Bump the suffix when the onboarding flow changes meaningfully — every user
// will see the new version once.
export const ONBOARDING_FLAG = 'atlas:onboarded-v1';
export const ONBOARDING_REQUEST_EVENT = 'atlas:show-onboarding';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator && window.navigator.standalone === true) return true;
  return false;
}

// 4-screen wizard explaining the offline-first mode to field surveyors. Shown
// once after the first successful login (flag in localStorage), and always
// re-accessible from the burger menu (which dispatches a custom event).
export default function OnboardingTerrain() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const inWebView = detectWebView();
  const ios = isIos();
  const standalone = isStandalone();

  useEffect(() => {
    // Auto-open once after first login. We only mount it after we see a
    // user object (i.e. login completed) to avoid greeting anonymous
    // visitors on the landing page.
    const checkAuto = () => {
      try {
        const user = localStorage.getItem('user');
        const flagged = localStorage.getItem(ONBOARDING_FLAG);
        if (user && !flagged) {
          setStep(0);
          setOpen(true);
        }
      } catch { /* ignore */ }
    };
    checkAuto();
    const onAuthChange = () => checkAuto();
    const onExplicit = () => { setStep(0); setOpen(true); };
    window.addEventListener('auth-change', onAuthChange);
    window.addEventListener(ONBOARDING_REQUEST_EVENT, onExplicit);
    return () => {
      window.removeEventListener('auth-change', onAuthChange);
      window.removeEventListener(ONBOARDING_REQUEST_EVENT, onExplicit);
    };
  }, []);

  const close = (markSeen = true) => {
    if (markSeen) {
      try { localStorage.setItem(ONBOARDING_FLAG, '1'); } catch { /* ignore */ }
    }
    setOpen(false);
  };

  const testGeolocation = () => {
    if (!('geolocation' in navigator)) {
      alert(t('onboarding.geo.unsupported', { defaultValue: 'La géolocalisation n\'est pas disponible sur cet appareil.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => alert(t('onboarding.geo.ok', { defaultValue: 'Géolocalisation autorisée ✅' })),
      () => alert(t('onboarding.geo.denied', { defaultValue: 'Géolocalisation refusée. Vous pouvez l\'autoriser dans les paramètres du navigateur.' }))
    );
  };

  if (!open) return null;

  const totalSteps = 4;

  const screens = [
    // 0 — Welcome
    {
      title: t('onboarding.welcome.title', { defaultValue: 'Bienvenue dans Atlas' }),
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>{t('onboarding.welcome.p1', { defaultValue: 'Vos initiatives sont enregistrées même hors-ligne et envoyées automatiquement au retour de la connexion.' })}</p>
          <p>{t('onboarding.welcome.p2', { defaultValue: 'Ce guide rapide vous aide à configurer votre appareil pour le travail terrain.' })}</p>
        </div>
      ),
    },
    // 1 — Install
    {
      title: t('onboarding.install.title', { defaultValue: 'Installer l\'application' }),
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          {inWebView ? (
            <>
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t('onboarding.install.webview', {
                  defaultValue: 'Vous êtes dans une application intégrée (Facebook, Instagram, WhatsApp…). Ouvrez ce lien dans un vrai navigateur (Chrome, Safari) avant d\'installer.',
                })}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert(t('webview.copied', { defaultValue: 'URL copiée !' }));
                  } catch { /* ignore */ }
                }}
                className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1.5 rounded text-xs font-medium"
              >
                {t('webview.copy', { defaultValue: 'Copier l\'URL' })}
              </button>
            </>
          ) : standalone ? (
            <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {t('onboarding.install.alreadyInstalled', { defaultValue: 'Atlas est déjà installé sur cet appareil ✅' })}
            </p>
          ) : ios ? (
            <>
              <p>{t('onboarding.install.iosIntro', { defaultValue: 'Sur iPhone, l\'installation est manuelle :' })}</p>
              <ol className="list-decimal list-inside space-y-1.5 ml-2">
                <li>{t('install.ios.step1', { defaultValue: 'Tapez sur le bouton Partager en bas (carré avec une flèche).' })}</li>
                <li>{t('install.ios.step2', { defaultValue: 'Faites défiler et choisissez "Sur l\'écran d\'accueil".' })}</li>
                <li>{t('install.ios.step3', { defaultValue: 'Confirmez avec "Ajouter".' })}</li>
              </ol>
            </>
          ) : (
            <>
              <p>{t('onboarding.install.androidIntro', { defaultValue: 'Cliquez sur le bouton ci-dessous pour installer Atlas comme une application sur votre téléphone.' })}</p>
              <div className="pt-1">
                <InstallButton className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium" />
              </div>
              <p className="text-xs text-gray-500">
                {t('onboarding.install.androidNote', {
                  defaultValue: 'Si le bouton n\'apparaît pas, votre navigateur n\'est pas compatible — utilisez Chrome récent.',
                })}
              </p>
            </>
          )}
        </div>
      ),
    },
    // 2 — Geolocation
    {
      title: t('onboarding.geo.title', { defaultValue: 'Autoriser la géolocalisation' }),
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>{t('onboarding.geo.p1', { defaultValue: 'Atlas utilise votre position pour pré-remplir les coordonnées des initiatives que vous saisissez.' })}</p>
          <p>{t('onboarding.geo.p2', { defaultValue: 'Au prochain "Utiliser ma position", autorisez votre navigateur. Vous pouvez tester maintenant :' })}</p>
          <button
            type="button"
            onClick={testGeolocation}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {t('onboarding.geo.test', { defaultValue: 'Tester la géolocalisation' })}
          </button>
        </div>
      ),
    },
    // 3 — Offline mode
    {
      title: t('onboarding.offline.title', { defaultValue: 'Travailler hors-ligne' }),
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>{t('onboarding.offline.p1', { defaultValue: 'En zone sans réseau, vous pouvez quand même remplir et soumettre vos initiatives (photos comprises).' })}</p>
          <p>
            {t('onboarding.offline.p2', {
              defaultValue: 'Un bandeau orange "Hors-ligne" apparaît en haut, et un badge "N en attente" s\'affiche dans le menu pour suivre les envois en attente.',
            })}
          </p>
          <p>
            {t('onboarding.offline.p3', {
              defaultValue: 'Dès que la connexion revient, l\'envoi est automatique. Vous pouvez aussi forcer un envoi depuis "Mes envois en attente".',
            })}
          </p>
        </div>
      ),
    },
  ];

  const screen = screens[step];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => close(true)}>
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-700">
              {t('onboarding.stepLabel', { current: step + 1, total: totalSteps, defaultValue: 'Étape {{current}}/{{total}}' })}
            </span>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label={t('common.close', { defaultValue: 'Fermer' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{screen.title}</h2>
          <div className="mb-6">{screen.body}</div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {screens.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-emerald-600' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                {t('common.back', { defaultValue: 'Précédent' })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => close(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                {t('onboarding.skip', { defaultValue: 'Plus tard' })}
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                {t('common.next', { defaultValue: 'Suivant' })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => close(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                {t('onboarding.finish', { defaultValue: 'C\'est parti' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
