import React, { useState } from 'react';

// Charte Sahel / CREATES : vert nature, beige sable, bleu eau, rouge latérite, turquoise
const ACTOR_COLORS = ['#059669','#c2956b','#0891b2','#b5451b','#14b8a6','#4d7c0f','#d4a853','#1d4ed8','#92400e','#10b981'];

const formatLabel = (value) => {
  if (!value) return 'Non renseigné';
  if (typeof value !== 'string') return String(value);
  const lower = value.toLowerCase();
  if (lower.includes('civile')) return 'Socité civile';
  if (lower.startsWith('entreprise')) return 'Entreprise';
  if (lower === 'other' || lower === 'autre') return 'Autre';
  const replaced = value.replace(/_/g, ' ');
  return replaced.charAt(0).toUpperCase() + replaced.slice(1);
};

function groupSmall(entries, threshold = 10) {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const main = [];
  const small = [];
  sorted.forEach(([k, v]) => {
    if (v >= threshold) main.push([k, v]);
    else small.push([k, v]);
  });
  return { main, small };
}

export default function Sidebar({ stats, variant = 'overlay' }) {
  const [hoveredActor, setHoveredActor] = useState(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);

  // Actors — sorted descending, NO grouping
  const actorEntries = stats?.actors
    ? [...Object.entries(stats.actors)].sort((a, b) => b[1] - a[1])
    : [];
  const actorTotal = actorEntries.reduce((sum, [, v]) => sum + v, 0);

  const actorSegments = actorEntries.map(([k, v]) => ({
    key: k,
    label: formatLabel(k),
    value: v
  }));

  let cumulative = 0;
  const pieSegments = actorSegments.map((seg, idx) => {
    const start = cumulative;
    const pct = actorTotal ? (seg.value / actorTotal) * 100 : 0;
    cumulative += pct;
    return { ...seg, start, pct, color: ACTOR_COLORS[idx % ACTOR_COLORS.length] };
  });

  // Activities — sorted descending, grouped < 10
  const activityEntries = stats?.activities ? Object.entries(stats.activities) : [];
  const { main: activityMain, small: activitySmall } = groupSmall(activityEntries);
  const activitySmallTotal = activitySmall.reduce((sum, [, v]) => sum + v, 0);

  const isEmbedded = variant === 'embedded';

  return (
    <div className={isEmbedded ? 'w-full' : 'absolute right-0 top-0 w-full md:w-96 h-full z-50'}>
      <div className={`relative bg-white w-full shadow-xl border-gray-200 flex flex-col overflow-hidden ${isEmbedded ? 'rounded-xl border' : 'h-full border-l animate-[slide-in_0.2s_ease-out]'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-800">Vue d'ensemble</h3>
        </div>
        <div className={`p-4 space-y-4 text-sm ${isEmbedded ? '' : 'flex-1 overflow-y-auto'}`}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 border border-gray-100 rounded-lg bg-emerald-50">
                  <div className="text-xs text-gray-500">Initiatives</div>
                  <div className="text-xl font-bold text-emerald-700">{stats?.total ?? 0}</div>
                </div>
              </div>

              {/* Actors — interactive donut */}
              {stats?.actors && (
                <div className="pt-3 border-t border-gray-100 mt-2">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Type d'acteurs</div>
                  <div className="flex justify-center mb-3">
                    <svg viewBox="0 0 42 42" className="w-36 h-36">
                      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="9" />
                      {pieSegments.map((seg) => (
                        <circle
                          key={seg.key}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          strokeWidth={hoveredActor === seg.key ? 11 : 9}
                          stroke={seg.color}
                          strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                          strokeDashoffset={-seg.start}
                          opacity={hoveredActor && hoveredActor !== seg.key ? 0.35 : 1}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredActor(seg.key)}
                          onMouseLeave={() => setHoveredActor(null)}
                        />
                      ))}
                      {/* Center label */}
                      {hoveredActor ? (
                        <>
                          <text x="21" y="19.5" textAnchor="middle" className="fill-gray-800 text-[4px] font-bold">
                            {pieSegments.find(s => s.key === hoveredActor)?.value}
                          </text>
                          <text x="21" y="24" textAnchor="middle" className="fill-gray-400 text-[2.5px]">
                            {Math.round(pieSegments.find(s => s.key === hoveredActor)?.pct || 0)}%
                          </text>
                        </>
                      ) : (
                        <>
                          <text x="21" y="19.5" textAnchor="middle" className="fill-gray-800 text-[4px] font-bold">
                            {actorTotal}
                          </text>
                          <text x="21" y="24" textAnchor="middle" className="fill-gray-400 text-[2.5px]">
                            total
                          </text>
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                    {pieSegments.map((seg) => (
                      <span
                        key={seg.key}
                        className={`inline-flex items-center gap-1.5 text-xs cursor-pointer rounded-full px-2 py-0.5 transition-all duration-150 ${hoveredActor === seg.key ? 'bg-gray-100 font-semibold' : 'text-gray-600'}`}
                        onMouseEnter={() => setHoveredActor(seg.key)}
                        onMouseLeave={() => setHoveredActor(null)}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.label} <span className="font-semibold tabular-nums">{seg.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities */}
              {stats?.activities && (
                <div className="pt-4 border-t border-gray-100 mt-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Activités</div>
                  <ul className="text-sm space-y-1">
                    {activityMain.map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{formatLabel(k)}</span>
                        <span className="font-semibold tabular-nums">{v}</span>
                      </li>
                    ))}
                    {activitySmall.length > 0 && (
                      <li>
                        <button
                          type="button"
                          onClick={() => setShowActivityDetails(!showActivityDetails)}
                          className="w-full flex justify-between items-center hover:bg-gray-50 rounded py-0.5"
                        >
                          <span className="flex items-center gap-1 text-gray-500">
                            <svg className={`w-3 h-3 transition-transform ${showActivityDetails ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            Autre
                          </span>
                          <span className="font-semibold tabular-nums">{activitySmallTotal}</span>
                        </button>
                        {showActivityDetails && (
                          <ul className="ml-4 mt-1 text-xs space-y-1 text-gray-500">
                            {activitySmall.map(([k, v]) => (
                              <li key={k} className="flex justify-between">
                                <span>{formatLabel(k)}</span>
                                <span className="font-medium text-gray-600 tabular-nums">{v}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  );
}
