#!/bin/bash

PORT=5050

# Vérifie si un processus utilise le port
PID=$(lsof -ti tcp:$PORT)

if [ -n "$PID" ]; then
  echo "🔧 Port $PORT déjà utilisé. On tue le processus $PID..."
  kill -9 $PID
  echo "✅ Port libéré."
else
  echo "✅ Port $PORT libre."
fi

echo "🚀 Lancement du serveur..."
npm start
