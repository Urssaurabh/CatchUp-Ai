# CatchUp AI 🎥🧠

> **Smart Video Meetings & Automatic AI CatchUp Hub**  
> Every meeting is automatically recorded, transcribed, and summarized with interactive chapters, synced transcripts, and action items.

---

## 📁 Project Structure

```
CatchUp AI/
├── backend/                  # Node.js + Express + Socket.io Server
│   ├── data/
│   │   └── meetings.json     # Persistent JSON database for meetings
│   ├── index.js              # WebRTC signaling, REST API, & AI Q&A endpoint
│   └── package.json          # Backend dependencies (express, socket.io, cors)
│
├── frontend/                 # Vite + React 19 + TypeScript Client
│   ├── src/
│   │   ├── components/       # MeetingRoom, CatchUpHub, Dashboard, Navbar, etc.
│   │   ├── utils/            # storage.ts, videoRecorder.ts, aiSummarizer.ts
│   │   ├── types/            # TypeScript data interfaces
│   │   ├── App.tsx           # Application orchestrator
│   │   └── index.css         # Modern dark-mode design system (Vanilla CSS)
│   ├── index.html            # Entry HTML with Google Fonts
│   ├── vite.config.ts        # Vite config with proxy to backend port 5000
│   └── package.json          # Frontend dependencies (lucide, confetti, socket.io-client)
│
└── package.json              # Root orchestrator scripts
```

---

## 🚀 Running the Project

### 1. Run Both (Frontend & Backend Concurrently)
From the root directory:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebRTC Signaling**: [http://localhost:5000](http://localhost:5000)

### 2. Run Independently
- **Backend only**:
  ```bash
  npm run dev:backend
  # or: cd backend && npm run dev
  ```
- **Frontend only**:
  ```bash
  npm run dev:frontend
  # or: cd frontend && npm run dev
  ```

### 3. Install All Dependencies
```bash
npm run install:all
```
