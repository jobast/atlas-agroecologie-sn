import React from 'react';
import { Navigate } from 'react-router-dom';

export default function DytaesRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  const role = user.role === 'admin' ? 'dytael_admin' : user.role;
  // super_admin has DyTAES powers and above, so it passes through too.
  if (!['dytaes_admin', 'super_admin'].includes(role)) {
    return <Navigate to="/" />;
  }

  return children;
}
