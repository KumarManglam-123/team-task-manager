# ⚡ FlowTask — Team Task Manager

A production-grade full-stack team task management application built with **React**, **Node.js/Express**, and **MongoDB**.

> Built as a full-stack assignment demonstrating: authentication, role-based access control, real-time dashboard, Kanban board, REST API design, and deployment.

---

## 🖼️ Features

| Feature | Details |
|---|---|
| **Auth** | JWT-based signup/login with bcrypt password hashing |
| **Projects** | Create, manage, archive projects with custom colors |
| **Role System** | Admin (full control) / Member (view + update own tasks) |
| **Tasks** | Create, assign, update status, filter, comment |
| **Kanban Board** | Drag-free visual columns: To Do / In Progress / Done |
| **List View** | Sortable table with inline actions |
| **Dashboard** | Charts: task distribution, priority breakdown, team workload |
| **Member Mgmt** | Add/remove members, change roles |
| **Overdue Tracking** | Automatic detection and highlighting |

---

## 🏗️ Tech Stack

**Frontend:** React 18, Vite, TailwindCSS, React Query, Recharts, React Router v6, Axios

**Backend:** Node.js, Express, MongoDB + Mongoose, JWT, bcryptjs, express-validator

**DevOps:** Docker, Docker Compose, Nginx (SPA + API proxy), Railway-ready

---

## 🚀 Quick Start (3 Methods)

### Method 1: Docker Compose (Recommended — Easiest)

**Requirements:** Docker Desktop installed

```bash
# 1. Clone / unzip the project
cd flowtask

# 2. Run everything with one command
docker compose up --build

# 3. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api/health
```

That's it! MongoDB, backend, and frontend all start automatically.

---

### Method 2: Local Development (Without Docker)

**Requirements:** Node.js 18+, MongoDB (local or Atlas)

#### Step 1 — Start MongoDB
Either install MongoDB locally or get a free cloud URI from [MongoDB Atlas](https://cloud.mongodb.com).

#### Step 2 — Setup Backend
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env and set your MONGO_URI

npm run dev
# Backend runs on http://localhost:5000
```

#### Step 3 — Setup Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

#### .env file (backend/.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/flowtask
JWT_SECRET=your_super_secret_key_here_change_this
JWT_EXPIRE=7d
NODE_ENV=development
```

---

### Method 3: Run Both With One Command (Root)
```bash
# From project root
npm install
npm run install:all
npm run dev
```

---

## ☁️ Deployment on Railway

### Backend Deployment

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repository → choose the `backend` folder (or set root to `/backend`)
4. Add a **MongoDB** service in Railway (or use MongoDB Atlas)
5. Set environment variables in Railway dashboard:
   ```
   MONGO_URI=<your_mongodb_uri>
   JWT_SECRET=<strong_random_secret>
   JWT_EXPIRE=7d
   NODE_ENV=production
   CLIENT_URL=<your_frontend_url>
   ```
6. Railway auto-detects Node.js and deploys

### Frontend Deployment

**Option A: Vercel (Recommended for Frontend)**
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```
Set environment variable: `VITE_API_URL=https://your-backend.railway.app/api`

**Option B: Railway (Frontend)**
1. Add another service → deploy `frontend` folder
2. Set build command: `npm run build`
3. Set start command: `npx serve dist -p $PORT`

**Option C: Netlify**
```bash
cd frontend
npm run build
# Drag and drop dist/ to netlify.com
```

---

## 📁 Project Structure

```
flowtask/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── roles.js           # Project role checks
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt)
│   │   ├── Project.js         # Project + members schema
│   │   └── Task.js            # Task + comments schema
│   ├── routes/
│   │   ├── auth.js            # Signup, login, profile
│   │   ├── projects.js        # CRUD + member management
│   │   ├── tasks.js           # CRUD + comments
│   │   ├── dashboard.js       # Analytics endpoints
│   │   └── users.js           # User search
│   ├── server.js              # Express app entry
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx     # Sidebar navigation
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── DashboardPage.jsx  # Charts + stats
│   │   │   ├── ProjectsPage.jsx   # Project list + create
│   │   │   ├── ProjectDetailPage.jsx  # Members + workload
│   │   │   └── TasksPage.jsx      # Kanban + list view
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## 🔒 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects` | ✓ | Any member |
| POST | `/api/projects` | ✓ | Creates as Admin |
| GET | `/api/projects/:id` | ✓ | Member+ |
| PUT | `/api/projects/:id` | ✓ | Admin |
| DELETE | `/api/projects/:id` | ✓ | Admin |
| POST | `/api/projects/:id/members` | ✓ | Admin |
| DELETE | `/api/projects/:id/members/:uid` | ✓ | Admin |

### Tasks
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/tasks?project=id` | ✓ | Members see own; Admins see all |
| POST | `/api/tasks` | ✓ | Admin only |
| PUT | `/api/tasks/:id` | ✓ | Admin: all fields; Member: status only |
| DELETE | `/api/tasks/:id` | ✓ | Admin only |
| POST | `/api/tasks/:id/comments` | ✓ | Any member |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Global user stats |
| GET | `/api/dashboard/project/:id` | Per-project analytics |

---

## 🎯 Role-Based Access

| Action | Admin | Member |
|--------|-------|--------|
| Create tasks | ✅ | ❌ |
| Edit any task | ✅ | ❌ |
| Update task status | ✅ | Own tasks only |
| Delete tasks | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| View all tasks in project | ✅ | Own assigned only |
| Comment on tasks | ✅ | ✅ |

---

## 🔑 Environment Variables Reference

### Backend
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret for signing tokens |
| `JWT_EXPIRE` | No | 7d | Token expiry |
| `NODE_ENV` | No | development | Environment |
| `CLIENT_URL` | No | * | CORS allowed origin |

---

## 🛠️ Development Commands

```bash
# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev

# Both together (from root)
npm run dev

# Build frontend for production
cd frontend && npm run build

# Docker full stack
docker compose up --build

# Docker in background
docker compose up -d --build

# Stop Docker
docker compose down

# Reset Docker + data
docker compose down -v
```

---

## 🧪 Testing the App

1. Create an account → you'll be the **Admin** of your projects
2. Create a project from the Projects page
3. Add tasks with priorities and due dates
4. Invite a team member by their email
5. Check the Dashboard for live stats and charts
6. Use Kanban board to move tasks across columns

---

*Built with ❤️ for the Full-Stack Assignment*
