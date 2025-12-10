import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [registered, setRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
  e.preventDefault();

  setLoading(true);

  if (email !== confirmEmail) {
    setErrorMessage("Les adresses e-mail ne correspondent pas.");
    setLoading(false);
    return;
  }
  if (password !== confirmPassword) {
    setErrorMessage("Les mots de passe ne correspondent pas.");
    setLoading(false);
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setErrorMessage("L'adresse email n'est pas valide.");
    setLoading(false);
    return;
  }
  if (password.length < 8 || !/\d/.test(password)) {
    setErrorMessage("Le mot de passe doit contenir au moins 8 caractères et un chiffre.");
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
      organization
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
    setErrorMessage(msg || "Erreur inattendue. Veuillez réessayer plus tard.");
  } finally {
    setLoading(false);
  }
};

// -- confirmation after successful registration --
if (registered) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Inscription enregistrée</h2>
        <p className="mb-6">
          Un e-mail de confirmation vient de vous être envoyé.
          <br />
          Si vous ne le trouvez pas, regardez dans votre dossier&nbsp;spams.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
}

// -- default: registration form --
return (
  <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div className="max-w-md w-full bg-white p-8 rounded shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Créer un compte</h2>
      {errorMessage && (
        <div
          aria-live="polite"
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded"
        >
          {errorMessage}
        </div>
      )}
      <form onSubmit={handleRegister} className="space-y-4">
        {/* (form fields stay unchanged) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Prénom</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom de famille</label>
          <input
            type="text"
            value={surname}
            onChange={e => setSurname(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Organisation (optionnel)</label>
          <input
            type="text"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Téléphone</label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmer l’email</label>
          <input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
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
          {loading ? 'Inscription en cours…' : "S'inscrire"}
        </button>
      </form>
      <div className="mt-4 text-center text-sm">
        Déjà un compte ?{' '}
        <a href="/login" className="text-green-600 hover:underline">Se connecter</a>
      </div>
    </div>
  </div>
);
}
