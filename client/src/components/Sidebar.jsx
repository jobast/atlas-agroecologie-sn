import React from 'react';

const formatLabel = (value) => {
  if (!value) return 'Non renseigné';
  if (typeof value !== 'string') return String(value);
  const replaced = value.replace(/_/g, ' ');
  return replaced.charAt(0).toUpperCase() + replaced.slice(1);
};

export default function Sidebar({ stats, variant = 'overlay' }) {
  const actorEntries = stats?.actors ? Object.entries(stats.actors) : [];
  const actorTotal = actorEntries.reduce((sum, [, v]) => sum + v, 0);
  const actorSegments = actorEntries.map(([k, v]) => ({
    label: formatLabel(k),
    value: v
  }));

  let cumulative = 0;
  const pieSegments = actorSegments.map(seg => {
    const start = cumulative;
    const pct = actorTotal ? (seg.value / actorTotal) * 100 : 0;
    cumulative += pct;
    return { ...seg, start, pct };
  });

  const isEmbedded = variant === 'embedded';

  return (
    <div className={isEmbedded ? 'w-full' : 'absolute right-0 top-0 w-full md:w-96 h-full z-50'}>
      <div className={`relative bg-emerald-50 w-full shadow-xl border-emerald-100 flex flex-col overflow-hidden ${isEmbedded ? 'rounded-xl border' : 'h-full border-l animate-[slide-in_0.2s_ease-out]'}`}>
        <div className="p-4 border-b border-emerald-200 flex items-center justify-between">
          <h3 className="font-bold text-lg">Vue d’ensemble</h3>
        </div>
        <div className={`p-4 space-y-4 text-sm ${isEmbedded ? '' : 'flex-1'}`}>
            <div className="space-y-3">
              <div className="text-gray-700 text-lg font-semibold">Statistiques rapides</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 border rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Initiatives</div>
                  <div className="text-xl font-bold">{stats?.total ?? 0}</div>
                </div>
              </div>
              {stats?.actors && (
                <div className="pt-2 border-t border-emerald-100 mt-2">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Type d’acteurs</div>
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 42 42" className="w-24 h-24">
                      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      {pieSegments.map((seg, idx) => (
                        <circle
                          key={seg.label}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          strokeWidth="6"
                          stroke={['#22c55e','#f97316','#3b82f6','#8b5cf6','#facc15','#0ea5e9','#14b8a6','#f43f5e','#a855f7','#94a3b8'][idx % 10]}
                          strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                          strokeDashoffset={-seg.start}
                        />
                      ))}
                    </svg>
                    <ul className="text-sm space-y-1">
                      {pieSegments.map((seg, idx) => (
                        <li key={seg.label} className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: ['#22c55e','#f97316','#3b82f6','#8b5cf6','#facc15','#0ea5e9','#14b8a6','#f43f5e','#a855f7','#94a3b8'][idx % 10] }}
                          />
                          <span className="flex-1">{seg.label}</span>
                          <span className="font-semibold">{seg.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {stats?.activities && (
                <div className="pt-4 border-t border-emerald-100 mt-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Activités</div>
                  <ul className="text-sm space-y-1">
                    {Object.entries(stats.activities).map(([k,v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{formatLabel(k)}</span>
                        <span className="font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  );
}
