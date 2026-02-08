import React from 'react';
import { useParams } from 'react-router-dom';

export default function Footer() {
  const params = useParams();
  const slug = params.slug || null;

  let orgText = 'DyTAES National';
  if (slug && slug !== 'national') {
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    orgText = `DyTAEL ${name}`;
  }

  return (
    <footer className="hidden md:block bg-emerald-800 text-white text-sm py-3 px-4 text-center fixed bottom-0 left-0 right-0 z-40">
      <div className="font-medium">
        &copy; {orgText} – ARTS (Université de Berne / ENDA Pronat / IPAR) & Bey Diiwaan (CREATES)
      </div>
      <div className="text-white/90">
        Appui : DDC, FNS, LED
      </div>
    </footer>
  );
}
