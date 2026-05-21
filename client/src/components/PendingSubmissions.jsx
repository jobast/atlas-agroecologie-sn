import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { list, remove, update, QUEUE_CHANGED_EVENT } from '../db/offlineQueue';
import { replayNow } from '../utils/replayQueue';

function StatusChip({ status, t }) {
  const map = {
    'pending': { cls: 'bg-amber-100 text-amber-800', label: t('offline.statusPending', { defaultValue: 'En attente' }) },
    'sending': { cls: 'bg-blue-100 text-blue-800', label: t('offline.statusSending', { defaultValue: 'En cours d\'envoi…' }) },
    'failed-auth': { cls: 'bg-red-100 text-red-800', label: t('offline.statusAuth', { defaultValue: 'Session expirée — reconnectez-vous' }) },
    'failed-other': { cls: 'bg-orange-100 text-orange-800', label: t('offline.statusFailed', { defaultValue: 'Échec — sera retenté' }) },
  };
  const meta = map[status] || { cls: 'bg-gray-100 text-gray-700', label: status };
  return <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>;
}

export default function PendingSubmissions() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({});

  const reload = useCallback(async () => {
    const rows = await list();
    setItems(rows.sort((a, b) => a.createdAt - b.createdAt));
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener(QUEUE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, onChange);
  }, [reload]);

  const onRetry = async (record) => {
    setBusy(b => ({ ...b, [record.id]: true }));
    try {
      await update(record.id, { status: 'sending', lastError: null });
      const outcome = await replayNow(record);
      if (outcome?.ok) {
        await remove(record.id);
      } else if (outcome?.authError) {
        await update(record.id, { status: 'failed-auth', lastError: outcome.error || '' });
      } else {
        await update(record.id, { status: 'failed-other', lastError: outcome?.error || '' });
      }
    } finally {
      setBusy(b => ({ ...b, [record.id]: false }));
    }
  };

  const onDelete = async (record) => {
    if (!window.confirm(t('offline.confirmDelete', { defaultValue: 'Supprimer cet envoi en attente ? Action irréversible.' }))) return;
    await remove(record.id);
  };

  return (
    <div className="mx-4 md:mx-8 my-6 max-w-3xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-800">
          {t('offline.pendingTitle', { defaultValue: 'Mes envois en attente' })}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {t('offline.pendingHelp', { defaultValue: 'Ces initiatives sont enregistrées sur cet appareil et seront envoyées automatiquement au retour de la connexion. Vous pouvez aussi forcer le renvoi ou supprimer un envoi.' })}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-gray-400 text-sm">
            {t('offline.empty', { defaultValue: 'Aucun envoi en attente. Tout est synchronisé.' })}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {items.map(it => {
            const title = it.payload?.initiative || t('offline.untitled', { defaultValue: '(sans titre)' });
            const date = new Date(it.createdAt).toLocaleString('fr-FR');
            const photoCount = (it.photos || []).length;
            return (
              <div key={it.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 truncate">{title}</span>
                      <StatusChip status={it.status} t={t} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {date}
                      {photoCount > 0 && ` · ${photoCount} ${t('offline.photos', { count: photoCount, defaultValue: 'photo(s)' })}`}
                      {it.slug && ` · ${it.slug}`}
                      {it.attempts > 0 && ` · ${t('offline.attempts', { count: it.attempts, defaultValue: '{{count}} tentative(s)' })}`}
                    </div>
                    {it.lastError && (
                      <div className="text-xs text-red-600 mt-1 break-words">{it.lastError}</div>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRetry(it)}
                      disabled={busy[it.id] || it.status === 'sending'}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded"
                    >
                      {busy[it.id]
                        ? t('offline.retrying', { defaultValue: 'Envoi…' })
                        : t('offline.retry', { defaultValue: 'Renvoyer' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(it)}
                      className="text-xs bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded"
                    >
                      {t('offline.delete', { defaultValue: 'Supprimer' })}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
