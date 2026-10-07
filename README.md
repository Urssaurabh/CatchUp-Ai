# CatchUp AI 🎥🤖

> **Real-time Video Meetings with Automatic AI Summaries**

CatchUp AI is a full-stack video meeting platform that **automatically records, transcribes, and summarizes** every meeting. No manual notes needed — just start a meeting, talk, end it, and get a complete AI-powered brief instantly.

---

## ✨ What It Does

| Feature | Description |
|--------|-------------|
| 🎥 **HD Video Calls** | Real-time video/audio using WebRTC (peer-to-peer) |
| 📡 **Instant Room Sharing** | Share a link — teammates join in one click, no signup needed |
| 🎙️ **Live Transcription** | Real-time speech-to-text captions during the call |
| 🤖 **AI Meeting Summary** | Auto-generated executive summary, smart chapters & key decisions |
| ✅ **Action Items** | Extracts tasks automatically from your conversation |
| 💬 **In-Call Chat** | Real-time group chat during the meeting |
| 👋 **Reactions & Hand Raise** | Emoji reactions + hand raise with live sync |
| 🔐 **Auth & Roles** | Admin / Member roles with JWT authentication |
| 💾 **Auto Save** | Meetings saved to MongoDB + local JSON fallback |

---

## 🚀 Quick Start

### Step 1 — Clone & Install
```bash
git clone https://github.com/Urssaurabh/CatchUp-Ai.git
cd CatchUp-Ai
npm run install:all
```

### Step 2 — Setup Environment
Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
```
> 💡 You can use [MongoDB Atlas](https://www.mongodb.com/atlas) for a free cloud database.  
> See `backend/.env.example` for reference.

### Step 3 — Run the App
```bash
npm run dev
```
- **Frontend** → [http://localhost:5173](http://localhost:5173)
- **Backend API** → [http://localhost:5000](http://localhost:5000)

---

## 🔑 Default Login Accounts

These accounts are auto-created on first run:

| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | `admin@catchup.ai` | `admin123` |
| 👤 Member | `member@catchup.ai` | `member123` |

> Admin can delete any meeting. Members can only delete their own.

---

## 📖 How to Use

### Host a Meeting
1. Sign in as **Admin** or any user
2. Click **"Start Instant Meeting"** on the dashboard
3. A unique room link is generated → **copy & share it** with teammates
4. Talk, collaborate, use chat/reactions/hand-raise
5. Click **"End Call"** → AI summary is instantly generated ✅

### Join a Meeting
1. Open the shared link (e.g. `http://localhost:5173/?room=ab12-cd34`)
2. Enter your name → click **"Join Call"**
3. You appear live in the host's participant list in real-time

---

## 🏗️ Project Structure

```
CatchUp AI/
├── backend/
│   ├── data/               # JSON fallback storage (meetings & users)
│   ├── middleware/
│   │   └── auth.js         # JWT auth middleware
│   ├── models/
│   │   ├── Meeting.js      # MongoDB meeting schema
│   │   └── User.js         # MongoDB user schema
│   ├── index.js            # Express server, REST API, Socket.IO, WebRTC signaling
│   └── .env.example        # Environment variables reference
│
├── frontend/
│   └── src/
│       ├── components/     # MeetingRoom, Dashboard, Navbar, AuthModal, CatchUpHub...
│       ├── context/        # AuthContext (JWT login state)
│       ├── utils/          # storage, videoRecorder, aiSummarizer
│       ├── types/          # TypeScript interfaces
│       ├── App.tsx         # Main app & routing logic
│       └── index.css       # Dark-mode design system
│
└── package.json            # Root scripts to run everything together
```

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite (dev server, port 5173)
- Vanilla CSS (dark glassmorphism design)
- Socket.IO Client (real-time events)
- WebRTC (peer-to-peer video/audio)
- Web Speech API (live captions)

**Backend**
- Node.js + Express
- Socket.IO (WebRTC signaling, chat, reactions)
- MongoDB + Mongoose (primary database)
- JSON file fallback (works without MongoDB too)
- JWT (authentication) + bcrypt (password hashing)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get logged-in user profile |
| GET | `/api/meetings` | List all meetings |
| POST | `/api/meetings` | Save a new meeting |
| DELETE | `/api/meetings/:id` | Delete a meeting (auth required) |
| GET | `/api/rooms/:roomId` | Get live room participant count |
| GET | `/api/health` | Server health check |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a meeting room |
| `user-joined` | Server → Client | New participant joined |
| `user-left` | Server → Client | Participant left |
| `signal-offer/answer/ice` | Peer → Peer | WebRTC handshake |
| `send-chat` | Client → Room | Send a chat message |
| `send-reaction` | Client → Room | Send emoji reaction |
| `toggle-hand` | Client → Room | Raise/lower hand |
| `live-transcript-chunk` | Client → Room | Broadcast live speech |

---

## 📄 License

MIT — free to use and build upon.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/Urssaurabh">Saurabh Chaubey</a>
</div>
