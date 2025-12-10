
#!/bin/bash
set -x  # Active le mode debug, affiche chaque commande exécutée

# Configuration
DB_NAME="geocollect_v2"
DB_USER="postgres"
INIT_FILE="$(dirname "$0")/init.sql"

echo "🧨 Suppression de la base existante (si elle existe)..."
dropdb -U $DB_USER --if-exists $DB_NAME

echo "🧱 Création de la nouvelle base..."
createdb -U $DB_USER $DB_NAME

echo "🗺️ Activation de l'extension PostGIS..."
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "📦 Exécution du script $INIT_FILE..."
psql -U $DB_USER -d $DB_NAME -f $INIT_FILE

echo "✅ Base $DB_NAME recréée avec succès !"