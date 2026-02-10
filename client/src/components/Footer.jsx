import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug || null;

  let orgText = t('footer.dytaes_national');
  if (slug && slug !== 'national') {
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    orgText = t('footer.dytael_name', { name });
  }

  return (
    <footer className="hidden md:block bg-white/90 backdrop-blur-md shadow-[0_-2px_8px_0_rgba(0,0,0,0.08)] text-stone-400 text-xs py-2.5 px-4 text-center fixed bottom-0 left-0 right-0 z-40">
      <span>{orgText} — ARTS (Univ. de Berne / ENDA Pronat / IPAR) &amp; Bey Diiwaan (CREATES)</span>
      <span className="mx-2 text-stone-300">·</span>
      <span>{t('footer.support')}</span>
    </footer>
  );
}
