import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const DytaelContext = createContext(null);

// Senegal-wide bounds
const SENEGAL_BOUNDS = [[12.0, -17.6], [16.7, -11.3]];

export function DytaelProvider({ children }) {
  const { slug } = useParams();
  const [dytaels, setDytaels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/dytaels`)
      .then(res => setDytaels(res.data || []))
      .catch(() => setDytaels([]))
      .finally(() => setLoading(false));
  }, []);

  const isNational = slug === 'national';
  const currentDytael = isNational ? null : dytaels.find(d => d.slug === slug) || null;

  const bounds = currentDytael
    ? [[currentDytael.bounds_sw_lat, currentDytael.bounds_sw_lon], [currentDytael.bounds_ne_lat, currentDytael.bounds_ne_lon]]
    : SENEGAL_BOUNDS;

  const defaultZoom = currentDytael?.default_zoom || (isNational ? 7 : 10);

  return (
    <DytaelContext.Provider value={{ dytaels, currentDytael, isNational, bounds, defaultZoom, slug, loading }}>
      {children}
    </DytaelContext.Provider>
  );
}

export function useDytael() {
  const ctx = useContext(DytaelContext);
  if (!ctx) throw new Error('useDytael must be used within DytaelProvider');
  return ctx;
}

export default DytaelContext;
