

# GeoCollect v2

**GeoCollect** is an interactive mapping and data management application designed for collecting, validating, and visualizing agroecological initiatives. It features user authentication, role-based access, a rich Leaflet map interface, and a responsive form for structured data input.

---

## 🌍 Features

### 🔒 User Management
- Secure login & registration
- Role-based access (`viewer`, `editor`, `admin`)
- Users can submit and edit their own initiatives
- Admin dashboard for validating or rejecting entries

### 📝 Data Entry Form
- Grouped into sections (General Info, Localization, Contacts, Media, etc.)
- Support for GPS capture, manual coordinates, and map click
- Rich field validation (required fields, format control)
- Dynamic fields for videos and social media
- Option to auto-fill contact info when same as declarant

### 🗺️ Interactive Map
- Leaflet map with custom SVG icons
- Sidebar with:
  - 🔎 Search (by initiative, village, etc.)
  - 🎯 Filters (by activity, commune, actor type)
  - 🧭 Legend
- Toggle between base maps (satellite / street)
- Fixed zoom on Bignona department

### 🧑‍💻 Admin Dashboard
- View, validate, reject or request deletion of submitted initiatives
- Access all fields in detail
- Ability to edit or inspect entries

---

## 🛠️ Installation

```bash
git clone https://github.com/your-repo/GeoCollect_v2.git
cd GeoCollect_v2
```

### 1. Setup PostgreSQL with PostGIS

Ensure PostgreSQL is running and has PostGIS installed.

To reset and recreate the database:

```bash
bash db/reset_db.sh
```

This will:
- Drop `geocollect_v2` if it exists
- Create a fresh database with PostGIS
- Run the schema in `db/init.sql`

### 2. Setup Server (Backend)

```bash
cd server
npm install
# configure l'environnement
cp .env.example .env   # ajuste DB/SMTP/JWT/FRONTEND_URL
# créer la base MySQL (ex: geocollect) puis appliquer schema.sql :
# mysql -u root -p geocollect < schema.sql
# (si la colonne extra_fields a été ajoutée, relancer ce script ou exécuter ALTER TABLE)
```

### 3. Setup Client (Frontend)

```bash
cd ../client
npm install
# configure l'URL de l'API
cp .env.example .env.local  # ajuste si besoin (prod/staging)
```

### 4. Start Development Environment

From the project root:

```bash
bash start-geocollect.sh
```

This will:
- Kill ports 5050 and 5177 if needed
- Launch the backend (port 5050)
- Launch the frontend with Vite (port 5177)

### 🔐 Reset password (backend)
- `POST /api/auth/request-reset` avec `email`
- `GET /api/auth/reset/:token` pour vérifier le token
- `POST /api/auth/reset/:token` avec `password` pour mettre à jour

---

## 🔑 Creating an Admin User

To hash a password:

```bash
node
> const bcrypt = require('bcrypt');
> bcrypt.hash('YourPassword', 10).then(console.log);
```

Then insert the hashed password into the DB:

```sql
INSERT INTO users (email, password, role)
VALUES ('admin@example.com', '<HASHED_PASSWORD>', 'admin');
```

---

## 🧪 API Endpoints

- `POST /api/auth/register` – Register user
- `POST /api/auth/login` – Login user
- `GET /api/data` – Get all approved initiatives
- `POST /api/data` – Submit new initiative
- `PATCH /api/data/:id` – Edit initiative
- `POST /api/data/:id/request-delete` – Request deletion
- `GET /api/users` – List users (admin only)

---

## ✅ Roadmap

- [x] Dynamic form fields
- [x] Search + filter + legend
- [x] Interactive admin dashboard
- [x] Validation workflow
- [ ] Responsive design for mobile
- [ ] CSV & GeoJSON export
- [ ] Import from KoboCollect (optional)

---

## 📁 Project Structure

```
GeoCollect_v2/
├── client/           # React frontend (Vite)
├── server/           # Express backend
├── db/               # SQL schema + reset script
├── scripts/          # Utility scripts (e.g. hash generation)
├── start-geocollect.sh
└── README.md
```
dytael.bignona@gmail.com
Bignona2025
