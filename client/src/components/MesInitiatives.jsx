import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import axios from "axios";

export default function MesInitiatives() {
  const { t } = useTranslation();
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${import.meta.env.VITE_API_URL}/data/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setInitiatives(sorted);
      })
      .catch((err) => console.error("Erreur chargement initiatives:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t('my_initiatives.confirm_delete'))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/data/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInitiatives((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
      if (err.response?.status === 403) {
        alert(t('my_initiatives.delete_forbidden'));
      } else {
        alert(t('my_initiatives.delete_failed'));
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('my_initiatives.title')}</h1>

      <button
        onClick={() => navigate(`/${slug}/submit`)}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
      >
        + {t('my_initiatives.new_initiative')}
      </button>

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : initiatives.length === 0 ? (
        <p>{t('my_initiatives.no_initiatives')}</p>
      ) : (
        <ul className="space-y-4">
          {initiatives.map((item) => (
            <li key={item.id} className="border p-4 rounded shadow bg-white">
              <h2 className="text-xl font-semibold">{item.initiative}</h2>
              <p className="text-gray-600">
                {item.commune || t('my_initiatives.unknown_location')} —{" "}
                {new Date(item.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-700 mt-2">{item.description}</p>
              <div className="flex gap-2 mt-3">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                  onClick={() => navigate(`/${slug}/edit/${item.id}`)}
                >
                  {t('common.edit')}
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
