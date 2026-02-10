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

const activityBarColor = (value) => {
  if (!value) return '#94a3b8';
  const key = value.toLowerCase();
  if (key.includes('production')) return '#22c55e';
  if (key.includes('transformation')) return '#f97316';
  if (key.includes('formation')) return '#3b82f6';
  if (key.includes('gouver')) return '#8b5cf6';
  if (key.includes('commerce')) return '#facc15';
  return '#94a3b8';
};

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
  const activityMax = activityMain.length > 0 ? activityMain[0][1] : 1;

  const isEmbedded = variant === 'embedded';

  return (
    <div className={isEmbedded ? 'w-full' : 'absolute right-0 top-0 w-full md:w-96 h-full z-50'}>
      <div className={`relative bg-white w-full shadow-xl border-gray-200 flex flex-col overflow-hidden ${isEmbedded ? 'rounded-xl border' : 'h-full border-l animate-[slide-in_0.2s_ease-out]'}`}>
        <div className={`${isEmbedded ? '' : 'flex-1 overflow-y-auto'}`}>
          {/* Counter */}
          <div className="px-5 pt-5 pb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-700 tabular-nums">{stats?.total ?? 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Initiatives</div>
            </div>
          </div>

          {/* Actors — interactive donut */}
          {stats?.actors && (
            <div className="px-5 py-4 border-t border-gray-100">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-4">Type d'acteurs</h4>
              <div className="flex justify-center mb-4">
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

          {/* Activities with mini bars */}
          {stats?.activities && (
            <div className="px-5 py-4 border-t border-gray-100">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">Activités</h4>
              <div className="space-y-2.5">
                {activityMain.map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-gray-700">{formatLabel(k)}</span>
                      <span className="text-sm font-semibold tabular-nums text-gray-800">{v}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(v / activityMax) * 100}%`,
                          backgroundColor: activityBarColor(k)
                        }}
                      />
                    </div>
                  </div>
                ))}
                {activitySmall.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowActivityDetails(!showActivityDetails)}
                      className="w-full flex justify-between items-center hover:bg-gray-50 rounded-lg py-1 -mx-1 px-1 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showActivityDetails ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        Autre
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-gray-800">{activitySmallTotal}</span>
                    </button>
                    {showActivityDetails && (
                      <div className="ml-5 mt-2 space-y-1.5">
                        {activitySmall.map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs text-gray-400">
                            <span>{formatLabel(k)}</span>
                            <span className="font-medium text-gray-500 tabular-nums">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
