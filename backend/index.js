import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MeetingModel } from './models/Meeting.js';
import { UserModel } from './models/User.js';
import { authenticateToken, optionalAuth, authorizeRoles } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/catchup_ai';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.FRONTEND_URL,            // e.g. https://catchup-ai.vercel.app
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);
    if (allowed.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // allow all during initial deploy; tighten after first deploy
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Ensure data folder exists for JSON fallback
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const meetingsFile = path.join(dataDir, 'meetings.json');
const usersFile = path.join(dataDir, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'catchup_ai_jwt_super_secret_key_2026_xyz';

// Local JSON File Helpers (Fallback when MongoDB is offline)
function getStoredMeetings() {
  try {
    if (fs.existsSync(meetingsFile)) {
      const data = fs.readFileSync(meetingsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading meetings JSON fallback:', err);
  }
  return [];
}

function saveStoredMeetings(meetings) {
  try {
    fs.writeFileSync(meetingsFile, JSON.stringify(meetings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing meetings JSON fallback:', err);
  }
}

function getStoredUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading users JSON fallback:', err);
  }
  return [];
}

function saveStoredUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users JSON fallback:', err);
  }
}

// Seed default users if empty (for seamless demoing)
async function seedDefaultUsers() {
  const defaultAccounts = [
    {
      name: 'Admin User',
      email: 'admin@catchup.ai',
      passwordPlain: 'admin123',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    },
    {
      name: 'Team Member',
      email: 'member@catchup.ai',
      passwordPlain: 'member123',
      role: 'member',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member',
    },
  ];

  // Seed JSON users
  let jsonUsers = getStoredUsers();
  if (jsonUsers.length === 0) {
    for (const acc of defaultAccounts) {
      const hashed = await bcrypt.hash(acc.passwordPlain, 10);
      jsonUsers.push({
        id: 'usr_' + acc.role + '_' + Date.now().toString(36),
        name: acc.name,
        email: acc.email,
        password: hashed,
        role: acc.role,
        avatar: acc.avatar,
        createdAt: new Date().toISOString(),
      });
    }
    saveStoredUsers(jsonUsers);
    console.log('[auth] Seeded demo users to JSON fallback');
  }

  // Seed MongoDB users if connected
  if (isMongoConnected) {
    try {
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        for (const acc of defaultAccounts) {
          const hashed = await bcrypt.hash(acc.passwordPlain, 10);
          await UserModel.create({
            name: acc.name,
            email: acc.email,
            password: hashed,
            role: acc.role,
            avatar: acc.avatar,
          });
        }
        console.log('[auth] Seeded demo users to MongoDB');
      }
    } catch (err) {
      console.error('[auth] Error seeding MongoDB users:', err);
    }
  }
}

// MongoDB Connection State
let isMongoConnected = false;

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isMongoConnected = true;
    console.log('[database] MongoDB connected');

    // Seed initial meetings to MongoDB if empty
    const count = await MeetingModel.countDocuments();
    if (count === 0) {
      const initialSeed = getStoredMeetings();
      if (initialSeed.length > 0) {
        await MeetingModel.insertMany(initialSeed);
      }
    }

    await seedDefaultUsers();
  } catch (err) {
    isMongoConnected = false;
    console.warn(`[database] MongoDB offline (${err.message}). Using local JSON storage.`);
  }
}

connectMongoDB();
seedDefaultUsers(); // ensure json users are also seeded

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('[MongoDB connected');
  seedDefaultUsers();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CatchUp AI Server',
    database: isMongoConnected ? 'MongoDB (Connected)' : 'Local JSON Database (Fallback)',
    mongoStatus: isMongoConnected ? 'connected' : 'disconnected',
    mongoUri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    timestamp: new Date().toISOString(),
  });
});

// ---------------- AUTHENTICATION & AUTHORIZATION ROUTES ----------------

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role === 'admin' ? 'admin' : 'member';

    // Check duplicate in Mongo or JSON
    let existingUser = null;
    if (isMongoConnected) {
      try {
        existingUser = await UserModel.findOne({ email: cleanEmail });
      } catch (err) {
        console.error('Error checking duplicate user in Mongo:', err);
      }
    }
    if (!existingUser) {
      const storedUsers = getStoredUsers();
      existingUser = storedUsers.find((u) => u.email === cleanEmail);
    }

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    const userData = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: assignedRole,
      avatar,
      createdAt: new Date().toISOString(),
    };

    // Save to JSON fallback
    const storedUsers = getStoredUsers();
    storedUsers.push(userData);
    saveStoredUsers(storedUsers);

    // Save to MongoDB if connected
    if (isMongoConnected) {
      try {
        const mongoUser = new UserModel({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          avatar: userData.avatar,
        });
        const saved = await mongoUser.save();
        userData.id = saved._id.toString();
      } catch (err) {
        console.error('Error saving user to MongoDB:', err);
      }
    }

    const token = jwt.sign(
      { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
      },
      message: 'Account registered successfully!',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let foundUser = null;

    if (isMongoConnected) {
      try {
        const mongoUser = await UserModel.findOne({ email: cleanEmail }).lean();
        if (mongoUser) {
          foundUser = { ...mongoUser, id: mongoUser._id.toString() };
        }
      } catch (err) {
        console.error('Error finding user in MongoDB:', err);
      }
    }

    if (!foundUser) {
      const storedUsers = getStoredUsers();
      foundUser = storedUsers.find((u) => u.email === cleanEmail);
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: foundUser.id || foundUser._id, email: foundUser.email, name: foundUser.name, role: foundUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: foundUser.id || foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        avatar: foundUser.avatar,
      },
      message: 'Logged in successfully!',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current logged-in user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let userProfile = null;
    if (isMongoConnected) {
      try {
        const u = await UserModel.findById(req.user.id).select('-password').lean();
        if (u) userProfile = { ...u, id: u._id.toString() };
      } catch (err) {
        // fallback
      }
    }

    if (!userProfile) {
      const users = getStoredUsers();
      const u = users.find((x) => x.email === req.user.email);
      if (u) {
        const { password, ...safe } = u;
        userProfile = safe;
      }
    }

    res.json({
      user: userProfile || req.user,
    });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// ---------------- MEETINGS API ROUTES ----------------

// GET all meetings
app.get('/api/meetings', async (req, res) => {
  if (isMongoConnected) {
    try {
      const meetings = await MeetingModel.find().sort({ createdAt: -1 }).lean();
      return res.json(meetings);
    } catch (err) {
      console.error('MongoDB read error, falling back to JSON:', err);
    }
  }
  const meetings = getStoredMeetings();
  res.json(meetings);
});

// GET single meeting by ID
app.get('/api/meetings/:id', async (req, res) => {
  if (isMongoConnected) {
    try {
      const meeting = await MeetingModel.findOne({ id: req.params.id }).lean();
      if (meeting) return res.json(meeting);
    } catch (err) {
      console.error('MongoDB find error, falling back to JSON:', err);
    }
  }

  const meetings = getStoredMeetings();
  const meeting = meetings.find((m) => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  res.json(meeting);
});

// POST save meeting (associates creator if logged in)
app.post('/api/meetings', optionalAuth, async (req, res) => {
  const newMeeting = req.body;
  if (!newMeeting || !newMeeting.id) {
    return res.status(400).json({ error: 'Invalid meeting data' });
  }

  // If user is authenticated, associate creator info
  if (req.user) {
    newMeeting.creatorId = req.user.id;
    newMeeting.creatorEmail = req.user.email;
    if (newMeeting.host) {
      newMeeting.host.id = req.user.id;
      newMeeting.host.name = req.user.name;
      newMeeting.host.role = req.user.role === 'admin' ? 'Host (Admin)' : 'Host';
      if (req.user.avatar) newMeeting.host.avatar = req.user.avatar;
    }
  }

  // Always update JSON backup
  const meetings = getStoredMeetings();
  const index = meetings.findIndex((m) => m.id === newMeeting.id);
  if (index >= 0) {
    // Preserve existing creator if re-saving
    if (!newMeeting.creatorId && meetings[index].creatorId) {
      newMeeting.creatorId = meetings[index].creatorId;
      newMeeting.creatorEmail = meetings[index].creatorEmail;
    }
    meetings[index] = newMeeting;
  } else {
    meetings.unshift(newMeeting);
  }
  saveStoredMeetings(meetings);

  // If MongoDB is connected, save or upsert to MongoDB
  if (isMongoConnected) {
    try {
      await MeetingModel.findOneAndUpdate(
        { id: newMeeting.id },
        newMeeting,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('Error saving meeting to MongoDB:', err);
    }
  }

  res.status(201).json(newMeeting);
});

// DELETE meeting - Protected with authorization (Admin or Meeting Creator)
app.delete('/api/meetings/:id', authenticateToken, async (req, res) => {
  let targetMeeting = null;

  if (isMongoConnected) {
    try {
      targetMeeting = await MeetingModel.findOne({ id: req.params.id }).lean();
    } catch (err) {
      console.error('MongoDB find error during delete check:', err);
    }
  }

  if (!targetMeeting) {
    const meetings = getStoredMeetings();
    targetMeeting = meetings.find((m) => m.id === req.params.id);
  }

  if (!targetMeeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  // Role & Ownership Authorization Check:
  // Admin can delete any meeting.
  // Member can only delete meetings they created or hosted.
  const isAdmin = req.user.role === 'admin';
  const isCreator =
    (targetMeeting.creatorId && targetMeeting.creatorId === req.user.id) ||
    (targetMeeting.creatorEmail && targetMeeting.creatorEmail.toLowerCase() === req.user.email.toLowerCase()) ||
    (targetMeeting.host && targetMeeting.host.id === req.user.id) ||
    (targetMeeting.host && targetMeeting.host.name && targetMeeting.host.name.toLowerCase() === req.user.name.toLowerCase());

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      error: `Access Denied: You do not have permission to delete this meeting. Only an Admin or the creator (${targetMeeting.host?.name || 'Creator'}) can delete it.`,
    });
  }

  // Perform deletion from JSON
  let meetings = getStoredMeetings();
  meetings = meetings.filter((m) => m.id !== req.params.id);
  saveStoredMeetings(meetings);

  // Perform deletion from MongoDB
  if (isMongoConnected) {
    try {
      await MeetingModel.deleteOne({ id: req.params.id });
    } catch (err) {
      console.error('Error deleting from MongoDB:', err);
    }
  }

  res.json({
    success: true,
    id: req.params.id,
    message: `Meeting deleted successfully by ${req.user.role === 'admin' ? 'Admin' : 'Creator'}.`,
  });
});

// AI Q&A Assistant endpoint
app.post('/api/ai/ask', (req, res) => {
  const { question, summary } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const qLower = question.toLowerCase();
  let answer = '';

  if (qLower.includes('decision') || qLower.includes('decide') || qLower.includes('agreed')) {
    answer = summary?.keyDecisions?.length
      ? `The team reached the following key decisions:\n• ${summary.keyDecisions.join('\n• ')}`
      : 'During the meeting, the team agreed to move forward with the proposed roadmap, prioritize user recording quality, and finalize the Q4 targets by end of week.';
  } else if (qLower.includes('action') || qLower.includes('task') || qLower.includes('todo') || qLower.includes('next steps')) {
    if (summary?.actionItems?.length) {
      const items = summary.actionItems.map((a) => `• ${a.task} (Assigned to: ${a.assignee || 'Team'}, Due: ${a.dueDate || 'Soon'})`).join('\n');
      answer = `Here are the key action items recorded from the meeting:\n${items}`;
    } else {
      answer = 'Action items include: Alex will prepare the WebRTC architecture benchmark, Sarah will circulate the revised PRD, and Maya will set up the end-to-end regression suite.';
    }
  } else if (qLower.includes('timeline') || qLower.includes('launch') || qLower.includes('date') || qLower.includes('when')) {
    answer = 'The team is targeting the beta rollout for mid-next month, with user acceptance testing starting next Tuesday.';
  } else if (qLower.includes('who') || qLower.includes('attend') || qLower.includes('present')) {
    answer = `Participants recorded in this session: ${summary?.participants?.map((p) => p.name).join(', ') || 'Sarah Chen, Alex Rivera, Priya Sharma, and You'}.`;
  } else {
    answer = `Based on the discussion: The team focused on ensuring every meeting is automatically captured with zero friction. Participants emphasized that automated smart chapters and instant search are game-changers for asynchronous remote collaboration.`;
  }

  res.json({ answer, timestamp: new Date().toISOString() });
});

// In-memory active room tracking for WebRTC Signaling
const rooms = new Map(); // roomId -> Map(socketId -> userData)

// GET room status & participant count
app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const roomUsers = rooms.get(roomId);
  res.json({
    roomId,
    active: !!roomUsers && roomUsers.size > 0,
    participantCount: roomUsers ? roomUsers.size : 0,
    participants: roomUsers
      ? Array.from(roomUsers.values()).map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
        }))
      : [],
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const roomUsers = rooms.get(roomId);
    const userInfo = { socketId: socket.id, ...user };
    roomUsers.set(socket.id, userInfo);

    console.log(`[Socket] ${user.name} (${socket.id}) joined room ${roomId}. Total: ${roomUsers.size}`);

    const existingParticipants = Array.from(roomUsers.values()).filter((u) => u.socketId !== socket.id);
    socket.emit('room-users', existingParticipants);
    socket.to(roomId).emit('user-joined', userInfo);
    io.to(roomId).emit('participant-count', roomUsers.size);
  });

  // WebRTC Signaling
  socket.on('signal-offer', ({ targetSocketId, offer, fromUser }) => {
    io.to(targetSocketId).emit('signal-offer', {
      callerSocketId: socket.id,
      offer,
      fromUser,
    });
  });

  socket.on('signal-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('signal-answer', {
      responderSocketId: socket.id,
      answer,
    });
  });

  socket.on('signal-ice', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('signal-ice', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // Real-time chat & reactions
  socket.on('send-chat', ({ roomId, message }) => {
    io.to(roomId).emit('new-chat', message);
  });

  socket.on('send-reaction', ({ roomId, reaction }) => {
    io.to(roomId).emit('new-reaction', reaction);
  });

  socket.on('toggle-hand', ({ roomId, userId, isRaised }) => {
    io.to(roomId).emit('user-hand-toggle', { userId, isRaised });
  });

  socket.on('live-transcript-chunk', ({ roomId, chunk }) => {
    socket.to(roomId).emit('live-transcript-chunk', chunk);
  });

  // Disconnect handling
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId);
        const leavingUser = roomUsers.get(socket.id);
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('user-left', { socketId: socket.id, user: leavingUser });
          io.to(roomId).emit('participant-count', roomUsers.size);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
