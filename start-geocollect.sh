#!/bin/bash

# ---------------------------------------------
#  Sécurité : vérifier que l'on est à la racine
# ---------------------------------------------
if [ ! -d "./server" ] || [ ! -d "./client" ]; then
  echo "❌ ERREUR : Ce script doit être lancé depuis la racine du projet GeoCollect_v2."
  echo "👉 cd ~/GeoCollect_v2 && ./start-geocollect.sh"
  exit 1
fi

# ---------------------------------------------
# Ports backend + ports possibles de Vite
# ---------------------------------------------
PORT_BACKEND=5050
PORTS_FRONTEND=(5173 5174 5175 5176 5177)

DIR_BACKEND="./server"
DIR_FRONTEND="./client"

# Fonction kill port
kill_port() {
  PID=$(lsof -ti tcp:$1)
  if [ -n "$PID" ]; then
    echo "🔧 Port $1 occupé → kill PID $PID..."
    kill -9 $PID
  fi
}

echo "🚧 Nettoyage des ports..."

# Backend
kill_port $PORT_BACKEND

# Frontend (tous les ports possibles)
for p in "${PORTS_FRONTEND[@]}"; do
  kill_port $p
done

echo "✅ Tous les ports nettoyés."

# ---------------------------------------------
# Lancement Backend
# ---------------------------------------------
echo "🚀 Lancement du backend..."
cd "$DIR_BACKEND"
npm start &
BACK_PID=$!

# ---------------------------------------------
# Lancement Frontend
# ---------------------------------------------
echo "🚀 Lancement du frontend Vite..."
cd ../"$DIR_FRONTEND"
npm run dev &
FRONT_PID=$!

echo
echo "🎉 Tout est lancé."
echo "   Backend PID: $BACK_PID"
echo "   Frontend PID: $FRONT_PID"
echo "   Pour tout arrêter:"
echo "     kill -9 $BACK_PID $FRONT_PID"