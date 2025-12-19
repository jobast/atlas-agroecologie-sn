import React from 'react';

const colorForActivity = (a) => {
  if (!a) return 'bg-gray-400';
  const key = a.toLowerCase();
  if (key.includes('production')) return 'bg-green-500';
  if (key.includes('transformation')) return 'bg-orange-500';
  if (key.includes('formation')) return 'bg-blue-500';
  if (key.includes('gouver')) return 'bg-purple-500';
  if (key.includes('commerce')) return 'bg-yellow-400';
  return 'bg-gray-400';
};

const formatLabel = (value) => {
  if (!value) return 'Non renseigné';
  if (typeof value !== 'string') return String(value);
  const replaced = value.replace(/_/g, ' ');
  return replaced.charAt(0).toUpperCase() + replaced.slice(1);
};

export default function Sidebar({ item, onClose, onFocusMap, stats }) {
  const mainAct = item && item.activities && item.activities[0] ? item.activities[0] : '';
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

  return (
    <div className="absolute right-0 top-0 w-full md:w-96 h-full z-50">
      <div className="relative bg-emerald-50 w-full h-full shadow-xl animate-[slide-in_0.2s_ease-out] overflow-y-auto border-l border-emerald-100">
        {item ? (
          <div className="p-4 border-b border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colorForActivity(mainAct)}`} />
              <h3 className="font-bold text-lg">{item.initiative}</h3>
            </div>
            <button onClick={onClose} className="text-gray-600">✕</button>
          </div>
        ) : (
          <div className="p-4 border-b border-emerald-200 flex items-center justify-between">
            <h3 className="font-bold text-lg">Vue d’ensemble</h3>
          </div>
        )}
        <div className="p-4 space-y-4 text-sm">
          {item ? (
            <>
              <div className="text-gray-700">{item.description || 'Aucune description'}</div>
              <div className="space-y-1">
                <div><strong>Localisation :</strong> {item.village || '—'} {item.commune ? `(${item.commune})` : ''}</div>
                <div><strong>Zone d’intervention :</strong> {item.zone_intervention || '—'}</div>
                <div><strong>Type d’acteur :</strong> {item.actor_type || '—'}</div>
                <div><strong>Année :</strong> {item.year || '—'}</div>
                <div><strong>Activités :</strong> {(item.activities || []).join(', ') || '—'}</div>
                <div><strong>Contacts :</strong> {item.person_name || '—'} · {item.contact_phone || '—'} · {item.contact_email || '—'}</div>
              </div>

              {item.extra_fields && Object.keys(item.extra_fields).length > 0 && (
                <div>
                  <strong>Champs supplémentaires :</strong>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {Object.entries(item.extra_fields).map(([k, v]) => (
                      <li key={k}>{k}: {String(v)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {item.photos && item.photos.length > 0 && (
                <div>
                  <strong>Photos :</strong>
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {item.photos.map((p, idx) => (
                      <a key={idx} href={p} target="_blank" rel="noopener noreferrer">
                        <img src={p} alt="photo" className="w-24 h-24 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onFocusMap}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Voir sur la carte
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  Fermer
                </button>
              </div>
            </>
          ) : (
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
          )}

        </div>
      </div>
    </div>
  );
}
