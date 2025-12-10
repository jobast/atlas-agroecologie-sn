import React, { useState } from 'react';
import axios from 'axios';

const TestRegister = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResponse(null);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
        email,
        password,
        name: "Test",
        surname: "Test",
        phone: "1234567890",
        organization: "TestOrg"
      });
      setResponse(res.data);
    } catch (err) {
      console.error("Erreur d'inscription :", err);
      setError(err.response ? err.response.data : err.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Test Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br />
        <button type="submit">S'inscrire</button>
      </form>

      {response && (
        <div style={{ color: 'green', marginTop: '1rem' }}>
          ✅ Succès : {JSON.stringify(response)}
        </div>
      )}
      {error && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          ❌ Erreur : {JSON.stringify(error)}
        </div>
      )}
    </div>
  );
};

export default TestRegister;
