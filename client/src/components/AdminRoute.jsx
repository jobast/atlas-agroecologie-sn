import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  const adminRoles = ['admin', 'dytael_admin', 'dytaes_admin', 'super_admin'];
  if (!adminRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }

  return children;
}
