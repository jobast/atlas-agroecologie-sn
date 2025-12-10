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

export default function Sidebar({ item, onClose, onFocusMap, stats }) {
  const mainAct = item && item.activities && item.activities[0] ? item.activities[0] : '';
  return (
    <div className="absolute right-0 top-0 w-full md:w-96 h-full z-50">
      <div className="relative bg-white w-full h-full shadow-xl animate-[slide-in_0.2s_ease-out] overflow-y-auto border-l">
        {item ? (
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colorForActivity(mainAct)}`} />
              <h3 className="font-bold text-lg">{item.initiative}</h3>
            </div>
            <button onClick={onClose} className="text-gray-600">✕</button>
          </div>
        ) : (
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg">Vue d’ensemble</h3>
          </div>
        )}
        <div className="p-4 space-y-3 text-sm">
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
              <div className="text-gray-700">Statistiques rapides</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 border rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Initiatives</div>
                  <div className="text-xl font-bold">{stats?.total ?? 0}</div>
                </div>
              </div>
              {stats?.actors && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Par type d’acteur</div>
                  <ul className="text-sm space-y-1">
                    {Object.entries(stats.actors).map(([k,v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{k}</span>
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
