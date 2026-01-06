import React from 'react';

export default function Footer() {
  return (
    <footer className="hidden md:block bg-emerald-800 text-white text-sm py-3 px-4 text-center fixed bottom-0 left-0 right-0 z-40">
      <div className="font-medium">
        © DyTAEL Bignona – ARTS (Université de Berne / ENDA Pronat / IPAR) & Bey Diiwaan (CREATES)
      </div>
      <div className="text-white/90">
        Appui : DDC, FNS, LED
      </div>
    </footer>
  );
}
