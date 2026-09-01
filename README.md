# 🤖 AI Tester Agent — Context-Aware Autonomous Release Intelligence

> An AI-powered QA system that replaces manual testing with intelligent, autonomous agents. Understands requirements, analyzes code, generates tests, executes them across real-world tools, predicts risk, and gates deployments.

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![Tech](https://img.shields.io/badge/stack-Next.js%2016%20%2B%20Express%20%2B%20LangGraph-blue)
![Agents](https://img.shields.io/badge/agents-multi--agent%20architecture-purple)

-----

## 🎯 What It Does

| Agent/Feature | Role |
|-------|------|
| 📋 **Requirement Intelligence** | Extracts features, acceptance criteria, and edge cases from user stories. |
| 🔍 **Code Analysis** | Detects impacted modules, dependency graphs, and risk areas from commits. |
| 🧪 **Test Orchestration** | Dynamically generates and executes tests via **Selenium**, **Newman (API)**, and **OWASP ZAP**. |
| 🛠️ **Auto-Remediation** | Identifies failing code/tests and suggests or applies AI-driven code fixes. |
| 📊 **Risk Prediction** | Calculates a weighted release risk score (0–100) with explainable factors. |
| 🚦 **CI/CD Gatekeeper** | Evaluates release risk and automatically gates deployments via GitHub Actions. |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand |
| **Backend** | Node.js (Express), PostgreSQL (Prisma ORM) |
| **AI Layer** | Google Vertex AI, Gemini AI Studio, LangChain, LangGraph |
| **Test Runners**| Selenium WebDriver, Postman/Newman, OWASP ZAP (DAST) |
| **CI/CD** | GitHub Actions with AI Risk Gate |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (optional — works in simulation mode naturally)
- (Optional) Google AI Studio API Key or Vertex AI GCP Account for live AI.

### 1. Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env

# Start server
npm run dev
```

Server starts at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`

### 2. Frontend Setup

```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local

# Start dev server
npm run dev
```

App opens at `http://localhost:3000`

---

## 📊 Dashboard Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Release risk score gauge, impacted modules, sprint metrics, and AI recommendations. |
| **Test Studio** | Run live website crawls, execute tests across Selenium/ZAP/Newman, and review results. |
| **Code Fixes** | AI-driven debugging interface to analyze failing tests and apply auto-remediated patches. |
| **Insights** | "Why is this release risky?" — historical trends and explainable AI analysis. |
| **Timeline** | Step-by-step view of each autonomous agent's decision-making process. |
| **Ask** | Conversational interface (Agent Chat) for deep-diving into repository and test data. |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tests/run` | Triggers the autonomous testing pipeline (Selenium, Newman, ZAP) |
| `POST` | `/api/tests/agent/trigger` | Triggers the LangGraph multi-agent flow |
| `GET`  | `/api/dashboard` | Main dashboard analytics |
| `GET`  | `/api/metrics` | Retrieval of testing metrics and history |
| `POST` | `/api/code-fixes` | Generates AI patches for failures |
| `POST` | `/api/risk/evaluate`| Evaluates current deployment risk |
| `GET`  | `/api/health` | Service health check & AI mode status |

*(and more specialized routes for requirements, commits, projects, etc.)*

---

## 🗄️ Database Schema

Managed via Prisma ORM (`backend/prisma/schema.prisma`).

To set up the database:
```bash
cd backend
npx prisma db push        # Create tables
npx prisma generate       # Generate client
```

---

## ⚙️ CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) includes:
1. **Lint & Type Check** — TypeScript + ESLint
2. **Backend Tests** — Health check & dependency verification
3. **Frontend Build** — Next.js production build (`npx next build`)
4. **Risk Gate** — AI evaluates release risk and blocks if too high (`/api/risk/evaluate`)
5. **Deploy** — Only runs on the main branch after all gates pass

---

## 🧠 AI Engine Modes

The system operates based on your `.env` configuration:
1. **Simulation Mode**: Default mode without API keys. Uses realistically simulated AI responses and test execution times.
2. **Live Gemini/Vertex AI**: Set `GEMINI_API_KEY` or `VERTEX_PROJECT_ID` to use real LLMs (Gemini via Google Cloud or AI Studio) orchestrated with LangGraph.

---

## 📁 Project Structure

```text
├── frontend/               # Next.js 16 Web Application
│   ├── src/app/            # Pages (dashboard, test-studio, code-fixes, etc.)
│   ├── src/components/     # UI Components
│   └── src/lib/            # Zustand stores & API integration
├── backend/                # Node.js/Express API Server
│   ├── prisma/             # Database schema
│   ├── src/routes/         # Controller endpoints
│   └── src/services/       # LangGraph agents & test runners (Selenium/ZAP/Newman)
├── .github/workflows/      # CI/CD pipeline definition
└── README.md
```

---

## 📝 License

This project is licensed under the MIT License.
