# Atlas Agroecologie - GeoCollect v2

Atlas interactif des initiatives agroecologiques au Senegal.

- **URL**: https://atlas.creates.ngo
- **Repo**: github.com/jobast/atlas-agroecologie-sn
- **Branche prod**: `deploy-infomaniak`

## Stack

- **Client**: React 18 + Vite 5 + Tailwind CSS 4 + React-Leaflet 4 + Leaflet 1.9
- **Server**: Express.js + MySQL + JWT auth + Multer (uploads)
- **i18n**: i18next (FR + Wolof)
- **Node.js**: 24 (Infomaniak)

## Structure

```
client/
  src/
    components/    # ~35 React components (MapView, CartoModule, Sidebar, etc.)
    context/       # DytaelContext.jsx
    i18n/          # FR + Wolof locales
    utils/         # labels.js
    App.jsx
    main.jsx

server/
  routes/          # auth.js, data.js, users.js, customFields.js, dytaels.js
  middleware/      # authMiddleware.js, cors.js
  config/          # db.js
  utils/           # mailer.js
  migrations/      # SQL migrations (001-004) + CSV import scripts
  uploads/         # photos (gitignored)
  index.js         # Express entry point
  schema.sql       # Full DB schema reference
```

## Base de donnees

- **Type**: MySQL
- **Host**: 2h6995.myd.infomaniak.com
- **DB**: 2h6995_atlas_sn
- **Tables principales**: initiatives, initiative_locations, users, dytaels, custom_fields

## Deploiement (Infomaniak Node.js hosting)

### Voie automatisee (GitHub Actions)

Un workflow `.github/workflows/deploy.yml` se declenche sur chaque push de la
branche `deploy-infomaniak` et fait tout (pull + build + copie dist + restart)
par SSH. Voir [Setup CI](#setup-ci-une-fois) pour l'activation initiale.

Une fois le workflow actif :

1. Commit et push sur `deploy-infomaniak` -> deploiement automatique en ~1 min.
2. Suivre l'execution dans l'onglet "Actions" du repo GitHub.
3. Si migrations SQL : les passer **avant** le push (voir section migrations
   ci-dessous) - le workflow ne les joue pas.

### Voie manuelle (console SSH Infomaniak)

A utiliser si GitHub Actions est indisponible ou pour debugger.

1. Commit et push sur `deploy-infomaniak`.
2. Ouvrir la console Infomaniak (manager.infomaniak.com > Hosting > Node.js >
   atlas.creates.ngo > "Open the console") **ou** SSH direct sur le serveur.
3. Procedure complete :
   ```bash
   cd /srv/customer/sites/atlas.creates.ngo
   git status  # doit etre clean ; si non, git stash push -m "local prod changes"
   git pull origin deploy-infomaniak

   # Rebuild frontend (Vite) en mode production
   cd client
   npm install
   npm run build
   cd ..

   # Deployer les artefacts statiques a la racine servie
   cp -r client/dist/* .

   # Redemarrer le backend Node : bouton "Launch" dans le panel
   # OU manuellement : ps aux | grep node, kill -9 <PID>, puis
   # cd server && NODE_ENV=production node index.js
   ```
4. Test : ouvrir https://atlas.creates.ngo et verifier le changement.

### Migrations SQL

```bash
mysql -h 2h6995.myd.infomaniak.com -u 2h6995_atlas_use -p 2h6995_atlas_sn \
  < server/migrations/XXX.sql
```

### Setup CI (une fois)

Pour activer le workflow GitHub Actions, ajouter ces secrets dans
`Settings > Secrets and variables > Actions` du repo GitHub :

- `INFOMANIAK_SSH_HOST` : hote SSH (ex: `<account>.ssh.cluster<N>.hosting.infomaniak.com`).
- `INFOMANIAK_SSH_USER` : utilisateur SSH (ex: `uid253497` ou `client`).
- `INFOMANIAK_SSH_KEY` : cle privee SSH (contenu complet du fichier `~/.ssh/id_ed25519`).
- `INFOMANIAK_SSH_PORT` : port SSH (optionnel, defaut `22`).

Generer la cle si pas encore fait :
```bash
ssh-keygen -t ed25519 -f ~/.ssh/atlas_deploy -N ""
# Coller le contenu de ~/.ssh/atlas_deploy.pub dans le panel Infomaniak
# (SSH keys du compte) ou via : ssh-copy-id -i ~/.ssh/atlas_deploy.pub <user>@<host>
# Puis copier le contenu de ~/.ssh/atlas_deploy (cle privee) dans INFOMANIAK_SSH_KEY.
```

## Conventions

- Helmet actif avec `referrerPolicy: strict-origin-when-cross-origin` (requis pour les tuiles OSM)
- CSP desactive (`contentSecurityPolicy: false`) pour le SPA
- Routes API : `/api/auth`, `/api/data`, `/api/users`, `/api/custom-fields`, `/api/dytaels`
- Roles : viewer, editor, admin
- DyTAELs = regions geographiques (ex: Bignona, national)
- Initiatives ont un `status` (pending/approved) et un `dytael_id`
- Multi-localisation : table `initiative_locations` liee a `initiatives`
- Programmes : initiatives parent avec `parent_id` sur les sous-initiatives

## Dev local

```bash
# Terminal 1 - Server
cd server && npm install && npm run dev
# Terminal 2 - Client
cd client && npm install && npx vite --host
```

Le serveur tourne sur port 5050 (dev), le client Vite sur 5173.
