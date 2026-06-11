# Thriveni Rebuilt Center — Full Stack Web Application
## MERN Stack: MongoDB + Express + React + Node.js

---

## 📁 Project Structure
```
thriveni/
├── backend/          ← Node.js + Express API
│   ├── models/       ← MongoDB schemas
│   ├── routes/       ← API endpoints
│   ├── middleware/   ← JWT auth
│   ├── uploads/      ← Uploaded images
│   ├── server.js     ← Main server
│   └── .env          ← Environment variables
└── frontend/         ← React application
    └── src/
        ├── pages/    ← All pages
        ├── components/ ← Layout, shared components
        ├── context/  ← Auth context
        └── utils/    ← API helper
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+ (https://nodejs.org)
- MongoDB (https://www.mongodb.com/try/download/community) OR MongoDB Atlas (free cloud)
- Git (optional)

---

### Step 1 — Configure MongoDB
**Option A: Local MongoDB**
- Install MongoDB Community Edition
- It runs automatically on: `mongodb://localhost:27017`

**Option B: MongoDB Atlas (Free Cloud)**
1. Go to https://cloud.mongodb.com
2. Create free account → Create cluster
3. Get connection string, replace in `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/thriveni
   ```

---

### Step 2 — Setup Backend
```bash
cd thriveni/backend
npm install
```

Edit `.env` if needed:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/thriveni
JWT_SECRET=thriveni_rebuilt_secret_2026
```

Create uploads folder:
```bash
mkdir uploads
```

Start backend:
```bash
npm run dev
```

**Seed default users (run once):**
Open browser or Postman → POST: `http://localhost:5000/api/auth/seed`

Default credentials:
| Username | Password | Role |
|----------|----------|------|
| admin | thriveni@123 | Admin |
| manager | rebuilt@2026 | Manager |

---

### Step 3 — Setup Frontend
```bash
cd thriveni/frontend
npm install
npm start
```

App opens at: **http://localhost:3000**

---

### Step 4 — Build for Production
```bash
cd frontend
npm run build
```

Then copy `build/` folder to your server.

---

## 🌐 Pages
| Page | URL | Access |
|------|-----|--------|
| Login | /login | All |
| Dashboard | / | All |
| Job Tracker | /jobs | All |
| Equipment | /equipment | All |
| Dismantling | /dismantling | All |
| Work Details | /workdetails | All |
| Reports | /reports | All |
| User Management | /users | Admin only |

---

## 🔑 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/jobs | List jobs |
| POST | /api/jobs | Create job |
| PUT | /api/jobs/:id | Update job |
| DELETE | /api/jobs/:id | Delete job |
| GET | /api/equipment | List equipment |
| POST | /api/equipment | Add equipment |
| GET | /api/reports/summary | Dashboard stats |
| GET | /api/dismantling | Dismantling records |
| POST | /api/dismantling | Add with images |
| GET | /api/workdetails | Work details |
| POST | /api/workdetails | Add with images |
| GET | /api/users | List users (admin) |
| POST | /api/users | Create user (admin) |

---

## 🚢 Deployment (Free Options)

### Backend → Railway.app
1. Push to GitHub
2. Connect Railway → Deploy backend folder
3. Add environment variables in Railway dashboard

### Frontend → Vercel
1. Push frontend folder to GitHub
2. Connect Vercel → Deploy
3. Set `REACT_APP_API_URL` to your Railway backend URL

### Database → MongoDB Atlas (Free 512MB)
- Free forever for small projects

---

## 📞 Support
Built for Thriveni Rebuilt Center, Jamshedpur — 2026
