import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DytaelProvider, useDytael } from '../context/DytaelContext';
import Navbar from './Navbar';
import Footer from './Footer';

function DytaelLayoutInner() {
  const { currentDytael, isNational, slug, loading } = useDytael();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isNational && !currentDytael) {
      // Invalid slug, redirect to chooser
      navigate('/', { replace: true });
    }
  }, [loading, isNational, currentDytael, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!isNational && !currentDytael) {
    return null; // will redirect
  }

  return (
    <div className="pb-10 pt-14">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}

export default function DytaelLayout() {
  return (
    <DytaelProvider>
      <DytaelLayoutInner />
    </DytaelProvider>
  );
}
