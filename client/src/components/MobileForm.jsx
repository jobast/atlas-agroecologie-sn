import React from 'react';
import { useTranslation } from 'react-i18next';
import FormInput from './FormInput';

export default function MobileForm() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-fond px-3 pb-12 pt-4">
      <div className="mx-auto w-full max-w-2xl rounded-lg bg-white p-4 shadow sm:p-6">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('form.mobile_version')}</p>
          <h1 className="text-2xl font-bold text-system">{t('form.new_initiative')}</h1>
          <p className="text-sm text-gray-600">
            {t('form.mobile_desc')}
          </p>
        </div>
        <FormInput variant="mobile" />
      </div>
    </div>
  );
}
