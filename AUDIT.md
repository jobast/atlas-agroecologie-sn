Audit de conformité – GeoCollect v2
===================================

Référence : `Cahier_des_charges_GeoCollect.docx` (plateforme web de cartographie participative : inscription, soumission d’initiatives géolocalisées, administration).

Synthèse rapide
---------------
- Stack conforme sur le papier (React/Vite + Express + MySQL) mais implémentation hétérogène (scripts Postgres non utilisés, schémas divergents).
- Parcours de soumission et carte interactive présents côté front ; l’API crée et liste des initiatives, envoie un email de confirmation et d’alerte.
- Plusieurs chaînons manquants : persistance des fichiers, contrôle d’accès admin, endpoints attendus par le front, exports/statistiques, géométrie normalisée, sécurité et CORS durcis.

Fonctionnalités implémentées
----------------------------
- **Frontend React/Vite** : structure de pages (`App.jsx`) avec navigation, Landing page, formulaire de soumission riche (coordonnées manuelles, clic carte, géoloc, activités, vidéos, réseaux sociaux, upload multi-photos), carte Leaflet avec basemaps (OSM/Esri), icônes dynamiques, recherche et filtres par activité, routes protégées par token en localStorage.
- **Soumission d’initiatives (API)** : `POST /api/data` protège par JWT, insertion base avec statut `pending`, alertes email admin (`sendNewSubmissionAlert`).
- **Consultation des initiatives** : `GET /api/data` (option `status`), `GET /api/data/:id`, `GET /api/data/mine` filtré par utilisateur connecté, `PUT /api/data/:id` pour mise à jour.
- **Validation basique** : `PUT /api/data/:id/validate` bascule le statut en `approved`.
- **Authentification** : `POST /api/auth/register` (bcrypt, rôle `editor`), email de confirmation envoyé via Nodemailer, `GET /api/auth/confirm/:token`, `POST /api/auth/login` (JWT 1h, rafraîchit `last_login`).
- **Interface d’admin allégée** : tableau des initiatives (toutes/en attente/demandes de suppression supposées), liens vers édition, vue synthétique ; gestion des utilisateurs (liste, édition, validation, suppression) côté UI.

Fonctionnalités partiellement implémentées
------------------------------------------
- **Chaînage front/back auth** : le front pointe sur `/auth/*` alors que l’API expose `/api/auth/*` ; l’inscription envoie des valeurs codées en dur (nom/prénom/téléphone) malgré les champs du formulaire.
- **Contrôle d’accès** : middleware JWT présent mais non appliqué sur les routes sensibles (`GET /api/data`, `/api/users`, `/api/data/:id/validate` sans rôle admin). Pas de différenciation réelle des rôles.
- **Suppression / workflow** : le front appelle `/data/:id` (DELETE) et `/data/:id/cancel-delete` qui n’existent pas ; seule une mise en statut `delete_requested` est exposée.
- **Uploads** : Multer reçoit les fichiers mais ils ne sont pas stockés (seuls les noms sont insérés en base) ; aucun service de fichiers ou de liens publics.
- **Géodonnées** : stockage simple lat/lon ; champ GeoJSON construit côté front mais ignoré côté API ; pas de type spatial ni validation.
- **Admin console** : pas de statistiques, pas d’export CSV/GeoJSON, pas de rejet/retour d’initiative, pas de filtrage avancé ; les filtres acteur/commune ne sont pas appliqués dans `MapView`.
- **Base de données** : pool MySQL utilisé par le serveur mais schéma MySQL (`server/schema.sql`) ne correspond pas aux champs manipulés dans les routes (ex. `initiatives` ne contient pas `zone_intervention`, `activities`, `status`, `contact_*`). Scripts `db/init.sql` ciblent PostgreSQL/PostGIS et divergent (autres tables, types ARRAY/JSONB).
- **Sécurité & déploiement** : CORS en mode `*` en dev et liste permissive, pas de HTTPS/SSL, pas de rate limiting ni de protection des uploads ; configuration Infomaniak/production non présente.
- **Emails** : confirmation de compte et alerte nouvelle soumission gérés ; pas de reset password ou d’email de validation/rejet d’initiative.

Fonctionnalités manquantes vs cahier des charges
-----------------------------------------------
- **Workflow complet d’administration** : rejet/retour d’initiatives, suppression effective ou réintégration des demandes de suppression, vérification stricte du rôle admin.
- **Statistiques** : agrégations par région/type/année sur le tableau de bord.
- **Exports** : CSV et GeoJSON pour les initiatives validées.
- **Gestion des médias** : stockage/récupération sécurisée des images/vidéos (chemins publics ou bucket), contrôle de taille/type, suppression associée.
- **Modélisation BD conforme** : tables distinctes pour photos/vidéos/réseaux sociaux/sessions, champ géométrie ou GeoJSON, migrations versionnées.
- **Compatibilité front/back** : alignement des chemins d’API (`/api/...`), des payloads (`activities`/`social_media`), et des noms de champs DB.
- **Déploiement & sécurité** : configuration HTTPS/SSL, CORS strict entre domaines, durcissement des environnements, documentation du déploiement Infomaniak/backend Node + base MySQL.
- **Parcours utilisateur étendu** : réinitialisation de mot de passe, gestion de session/refresh token, expirations configurables.

Écarts techniques notables
--------------------------
- Double définition de base : MySQL dans le code (mysql2) vs scripts PostgreSQL/PostGIS dans `db/`; schéma non aligné avec les routes et le front.
- Endpoints front attendus absents (`DELETE /data/:id`, `/data/:id/cancel-delete`), ce qui bloque la suppression et l’administration.
- Données d’inscription codées en dur et chemins d’API divergents (`/auth/*` vs `/api/auth/*`) rendant l’inscription/login inopérants sans correction.
- CORS permissif et routes admin non protégées exposent les données utilisateurs et initiatives.

Recommandations immédiates
--------------------------
- Aligner les chemins d’API front/back (`VITE_API_URL` incluant `/api`), passer les champs du formulaire d’inscription au backend.
- Protéger toutes les routes d’administration par JWT + rôle admin ; fermer CORS au domaine attendu.
- Implémenter le stockage réel des fichiers (dossier public ou bucket) et ajouter les colonnes manquantes (`photos`, `status`, `activities`, `zone_intervention`, contacts) côté base.
- Ajouter les endpoints manquants (delete/cancel, rejet) et les exports/statistiques prévus.
- Choisir une base cible (MySQL comme prévu dans le cahier des charges) et fournir des migrations cohérentes avec les routes et le front.
