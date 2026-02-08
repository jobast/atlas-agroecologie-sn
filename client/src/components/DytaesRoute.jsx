import React from 'react';
import { Navigate } from 'react-router-dom';

export default function DytaesRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  const role = user.role === 'admin' ? 'dytael_admin' : user.role;
  if (role !== 'dytaes_admin') {
    return <Navigate to="/" />;
  }

  return children;
}
