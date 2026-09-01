# ⚡ InsightAI — Autonomous AI-Powered Data Intelligence & Analytics Platform

<div align="center">

![InsightAI Banner](https://img.shields.io/badge/InsightAI-Data%20Intelligence%20Engine-6366f1?style=for-the-badge&logo=sparkles&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-black?style=for-the-badge&logo=ollama&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<p align="center">
  <strong>Transform raw datasets into actionable executive insights, automated predictive ML models, and boardroom-ready PDF reports in seconds.</strong>
</p>

[🌐 Live Demo](https://insightai-62rs.onrender.com) • [✨ Features](#-key-features) • [🚀 Quickstart](#-quickstart-guide) • [🛠️ Architecture](#-system-architecture) • [📖 Documentation](#-api-endpoints)

</div>

---

## 📌 Overview

**InsightAI** is an end-to-end, enterprise-grade AI analytics platform designed to automate the entire data science lifecycle:
1. **Automated Ingestion & Cleaning:** Upload CSV or Excel files for instant schema detection, outlier removal, missing-value imputation, and statistical normalization.
2. **Interactive Visual Dashboard:** Dynamic correlation heatmaps, numerical distribution bar charts, and category breakdowns powered by Plotly & Chart.js.
3. **Automated Machine Learning (AutoML):** Train, evaluate, and compare Classification (Random Forest, Logistic Regression), Regression (Linear, Ridge, Lasso), and Clustering (K-Means) algorithms with 1-click artifact export (`.pkl`).
4. **Retrieval-Augmented Generation (RAG) AI Analyst:** Chat with your structured data in natural language powered by local Ollama LLMs (`llama3`, `qwen`, `mistral`).
5. **Autonomous Report Generation:** Compile statistical summaries, charts, and AI interpretations into downloadable executive PDF reports.

---

## ✨ Key Features

- **🛡️ Multi-Engine Authentication:** MongoDB Atlas cloud database with automatic, transparent fallback to local SQLite.
- **⚡ Zero-Friction User Onboarding:** Live animated OTP verification modal with instant Auto-Fill and email dispatcher.
- **🧹 Autonomous Data Cleaning Engine:** Automatic deduplication, intelligent type coercion, skewness correction, and outlier filtering.
- **📊 360° Data Visualizer:** Auto-generated interactive histograms, correlation matrices, box plots, and scatter charts.
- **🤖 Autonomous ML Workbench:** Automatic train/test split, hyperparameter tuning, confusion matrix generation, feature importance ranking, and downloadable serialized models (`.pkl`).
- **💬 Conversational RAG Chat:** Ask questions like *"Which region had the highest margin drop in Q3?"* and get instant data-backed answers with citations.
- **📄 Executive PDF Reporting:** Automated report compilation with dynamic charts, key metric summaries, and executive bullet points.

---

## 🏗️ System Architecture

```
insightai/
├── backend/
│   ├── app.py                      # FastAPI Application Root & Static Asset Mount
│   ├── config.py                   # Pydantic Settings & Environment Parsing
│   ├── database/
│   │   ├── mongo_users.py          # MongoDB Atlas Engine & Fallback Logic
│   │   └── session.py              # SQLite Fallback & Schema Migration
│   ├── models/                     # Pydantic & SQLAlchemy Schemas
│   ├── routes/
│   │   ├── auth.py                 # JWT Authentication & OTP Handlers
│   │   ├── upload.py               # Dataset Ingestion & Validation
│   │   ├── dashboard.py            # Aggregations & Visualizations
│   │   ├── ml.py                   # AutoML Training & Model Export
│   │   ├── chat.py                 # RAG AI Analyst Engine
│   │   └── report.py               # PDF Compilation Service
│   └── services/                   # Data Processing, Cleaning & ML Utilities
├── frontend/
│   ├── src/
│   │   ├── AuthPage.tsx            # Login, Signup & OTP Pop-Up Screen
│   │   ├── DashboardPage.tsx       # Analytics Studio & AutoML Hub
│   │   ├── api.ts                  # Axios Client & Interceptors
│   │   └── styles.css              # Glassmorphic Custom Design System
│   └── vite.config.ts              # Vite Bundler & Reverse Proxy
├── Dockerfile                      # Production Multi-Stage Container
└── README.md
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Plotly.js, Lucide Icons, Vanilla CSS Design System |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic, Scikit-Learn, Pandas, NumPy, ReportLab |
| **Databases** | MongoDB Atlas (Production) / SQLite3 (Local Dev & Auto-Fallback) |
| **AI / LLM** | Ollama (Llama 3 / Qwen / Mistral), Nomic Embed Text, LangChain RAG |
| **Deployment** | Docker Multi-Stage Build, Render Cloud |

---

## 🚀 Quickstart Guide (Run Locally)

Follow these 3 simple steps to run InsightAI on your local machine:

### 1️⃣ Prerequisites
Ensure you have the following installed:
- **Node.js 18+** & `npm` &rarr; [Download Node.js](https://nodejs.org/)
- **Python 3.10+** &rarr; [Download Python](https://python.org/)
- **Ollama** *(Optional, for local AI chat)* &rarr; [Download Ollama](https://ollama.ai/)
  ```bash
  # Pull the default models
  ollama pull llama3
  ollama pull nomic-embed-text
  ```

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/codeCraft-Ritik/InsightAI.git
cd InsightAI
```

---

### 3️⃣ Setup & Run Backend

Open a terminal in the root directory:

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# Windows (Command Prompt / PowerShell):
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env

# Start the FastAPI backend server
python -m uvicorn app:app --reload --port 8000
```
> The Backend API will be live at: **`http://localhost:8000`**  
> Interactive Swagger API Docs: **`http://localhost:8000/docs`**

---

### 4️⃣ Setup & Run Frontend

Open a **second terminal** window:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite Development Server
npm run dev
```
> Open your browser and navigate to: **`http://localhost:5173`** 🎉

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the `backend/` directory using the template below:

```env
# ── Core App Settings ──
APP_NAME=InsightAI - AI-Powered Data Analyst
SECRET_KEY=generate-a-secure-random-64-character-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Database Configuration ──
# (Leave MONGODB_URI empty to automatically use local SQLite)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/insightai
MONGODB_DATABASE=insightai
ALLOW_MONGO_FALLBACK=true

# ── AI / Ollama Settings ──
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# ── Email / OTP Configuration ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_USE_TLS=true

# ── File Limits ──
MAX_UPLOAD_MB=25
RAG_TOP_K=5
```

---

## 🐳 Running with Docker

You can run the entire full-stack application inside a single Docker container:

```bash
# Build Docker Image
docker build -t insightai .

# Run Container on Port 8000
docker run -p 8000:8000 --env-file backend/.env insightai
```
> Open **`http://localhost:8000`** in your browser.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user & generate verification code |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit OTP & receive JWT token |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token |
| `POST` | `/api/upload` | Upload & ingest CSV / Excel datasets |
| `GET` | `/api/dashboard/stats` | Retrieve real-time statistical distributions |
| `POST` | `/api/ml/train` | Execute AutoML pipeline (Classification / Regression / Clustering) |
| `GET` | `/api/ml/download/{id}` | Export trained serialized model (`.pkl`) |
| `POST` | `/api/chat` | Query dataset using Conversational RAG |
| `POST` | `/api/report/generate` | Compile and download executive PDF report |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit Your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/codeCraft-Ritik">Ritik Kumar</a> &bull; InsightAI Autonomous Intelligence Engine</sub>
</div>
