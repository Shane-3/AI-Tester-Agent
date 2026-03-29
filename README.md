# 🤖 AI Tester Agent — Context-Aware Autonomous Release Intelligence

> An AI-powered QA system that replaces manual testing with intelligent, autonomous agents. Understands requirements, analyzes code, generates tests, predicts risk, and gates deployments.

![Status](https://img.shields.io/badge/status-demo--ready-brightgreen)
![Tech](https://img.shields.io/badge/stack-Next.js%20%2B%20Express%20%2B%20AI-blue)
![Agents](https://img.shields.io/badge/agents-6%20autonomous-purple)

---

## 🎯 What It Does

| Agent | Role |
|-------|------|
| 📋 **Requirement Intelligence** | Extracts features, acceptance criteria, and edge cases from user stories |
| 🔍 **Code Analysis** | Detects impacted modules, dependency graphs, and risk areas from commits |
| 🧪 **Test Generation** | Generates functional, edge, API, and UI automation test cases |
| ⚡ **Regression Optimization** | Selects only relevant tests, reducing redundant execution |
| 📊 **Risk Prediction** | Calculates release risk score (0–100) with explainable factors |
| 🚦 **CI/CD Gatekeeper** | Blocks or approves deployment based on risk assessment |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Zustand |
| Backend | Node.js (Express), PostgreSQL (Prisma ORM) |
| AI Layer | OpenAI / LLM APIs (simulated for demo) |
| CI/CD | GitHub Actions with AI Risk Gate |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (optional — works in simulation mode without DB)

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server starts at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:3000`

---

## 📊 Dashboard Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Release risk score gauge, impacted modules, test metrics, AI recommendations |
| **Test Studio** | Browse, filter, edit, and download AI-generated test cases |
| **Insights** | "Why is this release risky?" — explainable AI analysis |
| **Timeline** | Step-by-step view of each agent's contribution |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze-requirements` | Analyze user stories |
| `POST` | `/api/analyze-commit` | Analyze git commits |
| `POST` | `/api/generate-tests` | Generate test cases |
| `POST` | `/api/predict-risk` | Predict release risk |
| `GET`  | `/api/dashboard-data` | Full dashboard data |
| `GET`  | `/api/health` | Health check |

---

## 🗄️ Database Schema

10 Prisma models: `User`, `Project`, `ProjectMember`, `UserStory`, `Commit`, `TestCase`, `TestRun`, `TestRunCase`, `Defect`, `RiskReport`

To set up the database:
```bash
cd backend
npx prisma db push        # Create tables
npx prisma generate       # Generate client
```

---

## ⚙️ CI/CD Pipeline

The GitHub Actions pipeline (`ci.yml`) includes:
1. **Lint & Type Check** — TypeScript + ESLint
2. **Backend Tests** — Health check verification
3. **Frontend Build** — Next.js production build
4. **Risk Gate** — AI agent evaluates release risk and blocks if too high
5. **Deploy** — Only runs on main branch after all gates pass

---

## 🧠 Simulation Mode

The app runs in **simulation mode** by default (no API keys needed). All AI agent responses are realistically simulated for demo purposes.

To use real AI: Set `OPENAI_API_KEY` in `backend/.env`.

---

## 📁 Project Structure

```
├── frontend/               # Next.js 14 App
│   ├── src/app/            # Pages (dashboard, test-studio, insights, timeline)
│   ├── src/components/     # Reusable components (Sidebar)
│   └── src/lib/            # Store (Zustand), API client
├── backend/                # Express API Server
│   ├── prisma/             # Database schema
│   ├── src/routes/         # API endpoints
│   └── src/services/       # AI simulation engine
├── .github/workflows/      # CI/CD pipeline
└── README.md
```

---

## 🎓 Built For

Hackathons, demos, and interviews — demonstrating how AI can replace manual QA and act as an intelligent release gatekeeper.

---

**Made with ❤️ by the AI Tester Agent Team**
