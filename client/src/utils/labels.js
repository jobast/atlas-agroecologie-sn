import i18n from '../i18n';

export const formatActorLabel = (value) => {
  if (!value) return '—';
  const t = i18n.t;
  const lower = value.toLowerCase().replace(/_/g, ' ').trim();
  if (lower.startsWith('entreprise')) return t('actors.entreprise');
  if (lower.startsWith('groupement') || lower.includes('gie') || lower.includes('coopérative')) return t('actors.groupement');
  if (lower.includes('ong') || lower.includes('association')) return t('actors.ong');
  if (lower.includes('gouvern') || lower.includes('état') || lower.includes('public')) return t('actors.gouvernement');
  if (lower.includes('recherche') || lower.includes('université')) return t('actors.recherche');
  if (lower.includes('informel')) return t('actors.informel');
  if (lower.includes('civile')) return t('actors.societe_civile');
  if (lower === 'other' || lower === 'autre') return t('actors.autre');
  const clean = value.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export const formatActivityLabel = (value) => {
  if (!value || typeof value !== 'string') return '';
  const lower = value.toLowerCase();
  if (lower === 'other') return i18n.t('activities.autres');
  const clean = value.replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export const statusConfig = () => ({
  pending: { label: i18n.t('status.pending'), bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  approved: { label: i18n.t('status.approved'), bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-400' },
  rejected: { label: i18n.t('status.rejected'), bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
  delete_requested: { label: i18n.t('status.delete_requested'), bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
});
