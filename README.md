# 🚀 InsightAI — Autonomous Data Intelligence & Machine Learning Platform

InsightAI is a modern, enterprise-grade full-stack data analytics and machine learning workspace. Upload any CSV, Excel, or JSON dataset to autonomously clean missing values, isolate outliers, generate interactive 2D/3D charts, train real scikit-learn models, download `.pkl` model artifacts, query data in natural language via local **Ollama AI**, and export boardroom-ready PDF and Excel statistical reports.

---

## ⚡ Prerequisites

To run InsightAI on your computer, ensure you have the following installed:

1. **Python 3.10+** — [Download Python](https://www.python.org/downloads/)
2. **Node.js 18+** & **npm** — [Download Node.js](https://nodejs.org/)
3. **Ollama** *(Required for AI Chat & RAG Intelligence)* — [Download Ollama](https://ollama.com/)

---

## 🤖 1. Setup Ollama (Local AI Engine)

InsightAI uses **Ollama** running locally on your PC (`http://localhost:11434`) for high-privacy, local AI data analysis:

1. Install and launch **Ollama** on your computer.
2. Open your terminal and pull the models:
   ```bash
   # Pull the Chat LLM
   ollama pull llama3

   # Pull the Embedding model for RAG vector search
   ollama pull nomic-embed-text
   ```

*(Ollama runs in the background at `http://localhost:11434` automatically).*

---

## 🐍 2. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell / Command Prompt)
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   python -m uvicorn app:app --reload
   ```
   *The backend will be live at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).*

---

## ⚛️ 3. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The dashboard will be live at `http://localhost:5173`.*

---

## 🌟 Key Features

- **🛡️ Secure Authentication:** JWT token authentication, bcrypt password hashing, and 6-digit OTP password reset.
- **🧹 Autonomous Data Cleaning:** Automatic median/mode imputation, row deduplication, and IQR outlier isolation.
- **📊 Interactive Chart Studio:** Dynamic 2D/3D Plotly visualizer (Scatter, Bar, Histogram, Box plot, Correlation Heatmap) with zoom, pan, and PNG export.
- **🤖 Real Machine Learning Studio:**
  - **Auto-Infer & Task Routing:** Classification, Regression, and Unsupervised KMeans/DBSCAN Clustering.
  - **Live Pipeline Ring:** Real-time circular progress indicator, phase steps, and elapsed timer.
  - **Download Trained Models:** Saves real scikit-learn `.pkl` pipelines via `joblib` for instant deployment.
- **💬 Natural Language Data Chat:** Chat with your data using local **Ollama** embeddings and ChromaDB vector search.
- **📑 Boardroom PDF & Excel Exports:** Generate executive PDF intelligence briefs and multi-tab statistical audit workbooks.

---

## 🐳 Docker Deployment (Optional)

Run the entire application in a single self-contained container:
```bash
docker compose up -d --build
```
Access the application at `http://localhost:8000`.

---

## 📜 License
MIT License &bull; Created for high-performance autonomous data analytics.
