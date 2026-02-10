import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [dytaelId, setDytaelId] = useState('');
  const [dytaels, setDytaels] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/dytaels`)
      .then(res => setDytaels(res.data || []))
      .catch(() => setDytaels([]));
  }, []);

  const handleRegister = async (e) => {
  e.preventDefault();

  setLoading(true);

  if (email !== confirmEmail) {
    setErrorMessage(t('auth.email_mismatch'));
    setLoading(false);
    return;
  }
  if (password !== confirmPassword) {
    setErrorMessage(t('auth.password_mismatch'));
    setLoading(false);
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setErrorMessage(t('auth.email_invalid'));
    setLoading(false);
    return;
  }
  if (password.length < 8 || !/\d/.test(password)) {
    setErrorMessage(t('auth.password_rules'));
    setLoading(false);
    return;
  }
  setErrorMessage('');

  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
      email,
      password,
      name,
      surname,
      phone,
      organization,
      dytael_id: dytaelId
    });
    setRegistered(true);
  
  } catch (error) {
    console.error("❌ Erreur d'inscription :", error);

    if (error.response) {
      console.error("📬 Détails du serveur :", error.response.data);
    } else {
      console.error("⚠️ Aucune réponse serveur.");
    }

    const msg = error.response?.data?.error || error.response?.data?.message;
    setErrorMessage(msg || t('auth.register_error'));
  } finally {
    setLoading(false);
  }
};

// -- confirmation after successful registration --
if (registered) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">{t('auth.registration_done')}</h2>
        <p className="mb-6">
          {t('auth.registration_email_sent')}
          <br />
          {t('auth.check_spam')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
        >
          {t('auth.back_home')}
        </button>
      </div>
    </div>
  );
}

// -- default: registration form --
return (
  <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div className="max-w-md w-full bg-white p-8 rounded shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">{t('auth.register_title')}</h2>
      {errorMessage && (
        <div
          aria-live="polite"
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded"
        >
          {errorMessage}
        </div>
      )}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.dytael_label')}</label>
          <select
            value={dytaelId}
            onChange={e => setDytaelId(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">{t('auth.select_dytael')}</option>
            {dytaels.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.first_name')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.last_name')}</label>
          <input
            type="text"
            value={surname}
            onChange={e => setSurname(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.organization_optional')}</label>
          <input
            type="text"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.phone')}</label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.confirm_email')}</label>
          <input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('auth.confirm_password')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? t('auth.registering') : t('auth.register_button')}
        </button>
      </form>
      <div className="mt-4 text-center text-sm">
        {t('auth.already_account')}{' '}
        <a href="/login" className="text-green-600 hover:underline">{t('auth.login_button')}</a>
      </div>
    </div>
  </div>
);
}
