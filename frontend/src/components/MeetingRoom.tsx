import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Smile,
  MessageSquare,
  Users,
  Hand,
  PhoneOff,
  Sparkles,
  Copy,
  Check,
  X,
  Send,
  Volume2,
  Share2,
} from 'lucide-react';
import type { FloatingReaction, Message, TranscriptItem, User } from '../types';
import { MeetingRecorder } from '../utils/videoRecorder';
import { formatDuration, BACKEND_URL } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

interface MeetingRoomProps {
  meetingTitle: string;
  roomId: string;
  userName?: string;
  initialAudio?: boolean;
  initialVideo?: boolean;
  onEndMeeting: (recordedBlob: Blob | null, transcript: TranscriptItem[], durationSeconds: number, finalParticipants: User[]) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  meetingTitle,
  roomId,
  userName = 'You',
  initialAudio = true,
  initialVideo = true,
  onEndMeeting,
}) => {
  const { user } = useAuth();

  // Local Media State
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>(userName);

  // Stream & Peer refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MeetingRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const candidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Local user identity
  const [localUserId] = useState(() => user?.id || 'usr-' + Math.random().toString(36).substring(2, 8));

  // Participants State: ONLY REAL PARTICIPANTS (Starts with local user only)
  const [participants, setParticipants] = useState<User[]>([
    {
      id: localUserId,
      name: user?.name || userName,
      // Guests joining via share link get Participant role, authenticated users keep their role
      role: user?.role === 'admin'
        ? 'Host (Admin)'
        : user
        ? 'Host'
        : new URLSearchParams(window.location.search).get('room')
        ? 'Participant'
        : 'Host',
      avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || userName)}`,
      color: '#6366f1',
    },
  ]);

  // Duration Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Transcript & Subtitles (Only real speech)
  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      speaker: 'System',
      timestamp: 0,
      timeFormatted: '00:00',
      text: `Meeting "${meetingTitle}" started in room ${roomId}. Auto-recording active.`,
    },
  ]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('Listening... Speak into your microphone');
  const [subtitleSpeaker, setSubtitleSpeaker] = useState<string>('Live Captions');

  // Interactive Drawers
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'chat' | 'participants'>('none');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-sys-init',
      senderId: 'system',
      senderName: 'CatchUp AI',
      senderAvatar: '',
      text: `Welcome! Share the meeting link to have teammates join in real-time.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  // Speech Recognition ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Helper to drain queued ICE candidates once remote description is set
  const processQueuedCandidates = async (socketId: string, pc: RTCPeerConnection) => {
    const queue = candidateQueueRef.current.get(socketId);
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('Error processing queued ICE candidate:', err);
        }
      }
      candidateQueueRef.current.delete(socketId);
    }
  };

  // Setup Peer Connection for a specific remote socket
  const setupPeerConnection = (targetSocketId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal-ice', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote media track arrival
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamsRef.current.set(targetSocketId, remoteStream);
        setRemoteStreams(new Map(remoteStreamsRef.current));
      }
    };

    peerConnectionsRef.current.set(targetSocketId, pc);
    return pc;
  };

  // Create WebRTC Offer
  const createPeerOffer = async (targetSocketId: string, peerUser: User) => {
    const pc = setupPeerConnection(targetSocketId);

    setParticipants((prev) => {
      if (prev.some((p) => p.socketId === targetSocketId)) return prev;
      return [...prev, { ...peerUser, socketId: targetSocketId }];
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('signal-offer', {
          targetSocketId,
          offer,
          fromUser: {
            id: localUserId,
            name: user?.name || userName,
            role: user?.role === 'admin' ? 'Admin' : 'Participant',
            avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || userName)}`,
            socketId: socketRef.current.id,
          },
        });
      }
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  };

  // Handle Receive WebRTC Offer and reply with Answer
  const handleReceiveOffer = async (
    callerSocketId: string,
    offer: RTCSessionDescriptionInit,
    fromUser: User
  ) => {
    const pc = setupPeerConnection(callerSocketId);

    setParticipants((prev) => {
      if (prev.some((p) => p.socketId === callerSocketId)) return prev;
      return [...prev, { ...fromUser, socketId: callerSocketId }];
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processQueuedCandidates(callerSocketId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit('signal-answer', {
          targetSocketId: callerSocketId,
          answer,
        });
      }
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  };

  // Initialize Camera, Mic & Socket.io
  useEffect(() => {
    let isCancelled = false;

    async function initRoom() {
      // Connect to Socket.io
      // Connect to Socket.io (Render backend in production or fallback, Vite proxy in dev)
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      // Access Camera and Microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: initialVideo ? { width: 1280, height: 720 } : false,
          audio: true,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Apply initial muted/videoOff states
        if (!initialAudio) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        if (!initialVideo) {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize meeting recorder with local stream
        const recorder = new MeetingRecorder();
        recorderRef.current = recorder;
        await recorder.startRecording(stream, user?.name || userName, meetingTitle);
      } catch (err) {
        console.warn('Could not access physical camera/mic:', err);
        const recorder = new MeetingRecorder();
        recorderRef.current = recorder;
        await recorder.startRecording(null, user?.name || userName, meetingTitle);
      }

      // Join room with user profile
      // Determine role: if this user started the meeting (via handleStartMeeting), they are Host
      // If they joined via a shared link, they are Participant
      const isFromUrl = new URLSearchParams(window.location.search).get('room') === roomId;
      const isHostRole = user?.role === 'admin' ? 'Host (Admin)' : 'Host';
      // Guests who joined via shared link get Participant role
      const myRole = !user && isFromUrl ? 'Participant' : isHostRole;

      const userPayload = {
        id: localUserId,
        name: user?.name || userName,
        role: myRole,
        avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || userName)}`,
        color: '#6366f1',
      };

      socket.emit('join-room', {
        roomId,
        user: userPayload,
      });

      // When existing participants are received, offer connection to each
      socket.on('room-users', async (existingUsers: User[]) => {
        for (const peer of existingUsers) {
          if (!peer.socketId) continue;
          await createPeerOffer(peer.socketId, peer);
        }
      });

      // When a new real user joins the room
      socket.on('user-joined', (newUser: User) => {
        setParticipants((prev) => {
          if (prev.some((p) => p.socketId === newUser.socketId)) return prev;
          return [...prev, newUser];
        });

        setJoinNotification(`${newUser.name} joined the meeting`);
        setTimeout(() => setJoinNotification(null), 4000);

        setMessages((prev) => [
          ...prev,
          {
            id: `join-${Date.now()}`,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '',
            text: `${newUser.name} joined the call`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });

      // WebRTC Offer received
      socket.on('signal-offer', async ({ callerSocketId, offer, fromUser }) => {
        await handleReceiveOffer(callerSocketId, offer, fromUser);
      });

      // WebRTC Answer received
      socket.on('signal-answer', async ({ responderSocketId, answer }) => {
        const pc = peerConnectionsRef.current.get(responderSocketId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await processQueuedCandidates(responderSocketId, pc);
          } catch (e) {
            console.warn('Error setting remote description from answer:', e);
          }
        }
      });

      // ICE Candidate received
      socket.on('signal-ice', async ({ fromSocketId, candidate }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        } else {
          const queue = candidateQueueRef.current.get(fromSocketId) || [];
          queue.push(candidate);
          candidateQueueRef.current.set(fromSocketId, queue);
        }
      });

      // Real-time Chat
      socket.on('new-chat', (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });

      // Real-time Reactions
      socket.on('new-reaction', (reaction: FloatingReaction) => {
        setReactions((prev) => [...prev, reaction]);
        if (reaction.emoji === '🎉') {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        }
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 3500);
      });

      // Hand raise toggle
      socket.on('user-hand-toggle', ({ userId, isRaised }: { userId: string; isRaised: boolean }) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, isHandRaised: isRaised } : p))
        );
      });

      // Live transcript chunk from peer
      socket.on('live-transcript-chunk', (item: TranscriptItem) => {
        setTranscript((prev) => [...prev, item]);
        setSubtitleSpeaker(item.speaker);
        setCurrentSubtitle(item.text);
        setActiveSpeaker(item.speaker);
      });

      // User Left
      socket.on('user-left', ({ socketId, user: leavingUser }: { socketId: string; user?: User }) => {
        const pc = peerConnectionsRef.current.get(socketId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(socketId);
        }
        remoteStreamsRef.current.delete(socketId);
        setRemoteStreams(new Map(remoteStreamsRef.current));
        candidateQueueRef.current.delete(socketId);

        setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));

        const name = leavingUser?.name || 'A participant';
        setJoinNotification(`${name} left the meeting`);
        setTimeout(() => setJoinNotification(null), 4000);

        setMessages((prev) => [
          ...prev,
          {
            id: `leave-${Date.now()}`,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '',
            text: `${name} left the meeting`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });
    }

    initRoom();

    // Web Speech Recognition for Real Speech Captions
    try {
      const SpeechRecognition =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcriptText = result[0].transcript;

          setCurrentSubtitle(transcriptText);
          setSubtitleSpeaker(user?.name || userName);
          setActiveSpeaker(user?.name || userName);

          if (result.isFinal) {
            const nowSec = elapsedSeconds;
            const newItem: TranscriptItem = {
              speaker: user?.name || userName,
              timestamp: nowSec,
              timeFormatted: formatDuration(nowSec),
              text: transcriptText,
            };

            setTranscript((prev) => [...prev, newItem]);

            if (socketRef.current) {
              socketRef.current.emit('live-transcript-chunk', {
                roomId,
                chunk: newItem,
              });
            }
          }
        };

        recognition.onerror = () => {
          // ignore microphone error gracefully
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (e) {
      console.warn('Speech recognition not available:', e);
    }

    return () => {
      isCancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteStreamsRef.current.clear();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meetingTitle, roomId, userName, localUserId, user]);

  // Elapsed Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // toggle to opposite of current isMuted
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video
  const toggleVideo = async () => {
    if (!isVideoOff) {
      // Turn video OFF
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsVideoOff(true);
    } else {
      // Turn video ON
      if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        setIsVideoOff(false);
      } else {
        // Request camera track if not already present
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (localStreamRef.current && newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack);
            peerConnectionsRef.current.forEach((pc) => {
              pc.addTrack(newVideoTrack, localStreamRef.current!);
            });
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
          setIsVideoOff(false);
        } catch (err) {
          console.warn('Could not activate camera:', err);
        }
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        peerConnectionsRef.current.forEach((pc) => {
          const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender && stream.getVideoTracks()[0]) {
            videoSender.replaceTrack(stream.getVideoTracks()[0]);
          }
        });

        setIsScreenSharing(false);
      } catch (err) {
        console.warn('Revert error:', err);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        peerConnectionsRef.current.forEach((pc) => {
          const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender && screenStream.getVideoTracks()[0]) {
            videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        });

        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Toggle Hand Raise
  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);

    setParticipants((prev) =>
      prev.map((p) => (p.id === localUserId ? { ...p, isHandRaised: nextState } : p))
    );

    if (socketRef.current) {
      socketRef.current.emit('toggle-hand', {
        roomId,
        userId: localUserId,
        isRaised: nextState,
      });
    }
  };

  // Send Floating Emoji Reaction
  const sendReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: `reaction-${Date.now()}-${Math.random()}`,
      emoji,
      senderName: user?.name || userName,
      leftPercent: 30 + Math.random() * 40,
    };

    setReactions((prev) => [...prev, newReaction]);
    setShowReactionsMenu(false);

    if (emoji === '🎉') {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    }

    if (socketRef.current) {
      socketRef.current.emit('send-reaction', {
        roomId,
        reaction: newReaction,
      });
    }

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3500);
  };

  // Send Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: localUserId,
      senderName: user?.name || userName,
      senderAvatar: user?.avatar || '',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    if (socketRef.current) {
      socketRef.current.emit('send-chat', {
        roomId,
        message: newMsg,
      });
    }
  };

  // Copy Meeting Invite Link
  const handleCopyLink = () => {
    const realUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(realUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // End Call & Process CatchUp
  const handleEndCall = async () => {
    if (confirm('End meeting and generate CatchUp AI recording & summary?')) {
      let videoBlob: Blob | null = null;
      if (recorderRef.current) {
        try {
          videoBlob = await recorderRef.current.stopRecording();
        } catch (err) {
          console.error('Error stopping recorder:', err);
        }
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      // Pass the live participants list (real people who joined via link)
      onEndMeeting(videoBlob, transcript, elapsedSeconds, participants);
    }
  };

  const inviteUrl = `${window.location.origin}/?room=${roomId}`;

  return (
    <div className="meeting-room-wrapper">
      {/* Hidden local video element for canvas recording */}
      <video
        id="local-video-element"
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Floating Join/Leave Toast Notification */}
      {joinNotification && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInScale 0.2s ease-out',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span>{joinNotification}</span>
        </div>
      )}

      {/* Room Header */}
      <header className="room-header">
        <div className="room-header-left">
          <div className="rec-badge" title="CatchUp AI is continuously recording this session">
            <span className="rec-dot" />
            <span>REC {formatDuration(elapsedSeconds)}</span>
          </div>

          <div className="room-title-info">
            <span className="room-meeting-title">{meetingTitle}</span>
            <div className="room-id-pill" onClick={handleCopyLink} title="Click to copy invite link">
              <span>Room: {roomId}</span>
              {copiedLink ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span style={{ fontSize: '0.7rem', color: copiedLink ? '#10b981' : 'var(--primary-light)', marginLeft: '4px' }}>
                {copiedLink ? 'Copied link!' : 'Copy Link'}
              </span>
            </div>
          </div>
        </div>

        <div className="room-header-actions">
          {/* Share Link Header Button */}
          <button
            className="room-share-btn"
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
            <span className="room-btn-text">{copiedLink ? 'Link Copied!' : 'Share Invite Link'}</span>
          </button>

          <button
            className="btn-danger room-end-btn"
            onClick={handleEndCall}
          >
            <PhoneOff size={16} />
            <span className="room-btn-text">End Call</span>
          </button>
        </div>
      </header>

      {/* Main Room Body */}
      <div className="room-body">
        {/* Floating Reactions Overlay */}
        {reactions.map((r) => (
          <div
            key={r.id}
            className="floating-reaction"
            style={{ left: `${r.leftPercent}%` }}
          >
            {r.emoji}
          </div>
        ))}

        {/* Video Stage */}
        <main className="video-stage">
          {/* If Solo, show prominent waiting & invite banner */}
          {participants.length === 1 && (
            <div className="solo-invite-banner">
              <div className="solo-invite-text">
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  Waiting for other participants to join...
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Share this link with teammates to talk in real-time
                </div>
              </div>

              <div className="solo-invite-copy-box">
                <code style={{ fontSize: '0.75rem', color: '#c7d2fe' }}>{inviteUrl}</code>
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: copiedLink ? '#10b981' : '#6366f1',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          <div className={`stage-grid grid-${Math.min(participants.length, 4)}`}>
            {participants.map((p) => {
              const isLocal = p.id === localUserId;
              const isSpeaking = activeSpeaker === p.name;
              const remoteStream = p.socketId ? remoteStreams.get(p.socketId) : null;

              return (
                <div
                  key={p.id || p.socketId}
                  className={`participant-tile ${isSpeaking ? 'active-speaker' : ''}`}
                >
                  {isLocal && isScreenSharing ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        🖥️ You are sharing your screen
                      </span>
                    </div>
                  ) : isLocal && !isVideoOff && localStreamRef.current ? (
                    <video
                      autoPlay
                      playsInline
                      muted
                      className="tile-video"
                      ref={(el) => {
                        if (el && localStreamRef.current) {
                          el.srcObject = localStreamRef.current;
                        }
                      }}
                    />
                  ) : !isLocal && remoteStream ? (
                    /* Remote WebRTC Peer Video & Audio */
                    <>
                      <video
                        autoPlay
                        playsInline
                        className="tile-video"
                        ref={(el) => {
                          if (el && remoteStream) {
                            el.srcObject = remoteStream;
                          }
                        }}
                      />
                    </>
                  ) : (
                    /* Avatar Fallback */
                    <div className="tile-avatar-fallback">
                      <div className="avatar-halo">
                        {isSpeaking && <div className="speaking-pulse" />}
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          (p.name || 'User')[0]?.toUpperCase()
                        )}
                      </div>

                      {isSpeaking && (
                        <div className="soundwave-bars">
                          <span className="soundwave-bar" />
                          <span className="soundwave-bar" />
                          <span className="soundwave-bar" />
                          <span className="soundwave-bar" />
                          <span className="soundwave-bar" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hand Raised Icon */}
                  {p.isHandRaised && (
                    <div className="tile-hand-icon" title={`${p.name} raised hand`}>
                      <Hand size={14} />
                    </div>
                  )}

                  {/* Info Badge */}
                  <div className="tile-info-badge">
                    {isLocal ? (
                      isMuted ? <MicOff size={14} color="#f87171" /> : <Mic size={14} color="#10b981" />
                    ) : (
                      <Volume2 size={14} color="#818cf8" />
                    )}
                    <span>{p.name} {isLocal ? '(You)' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Subtitles / Live Captions */}
          <div className="live-subtitles-bar">
            <span className="live-subtitles-speaker">{subtitleSpeaker}:</span>
            <span style={{ fontStyle: 'italic' }}>"{currentSubtitle}"</span>
          </div>
        </main>

        {/* Side Drawers */}
        {activeDrawer === 'chat' && (
          <aside className="room-drawer">
            <div className="drawer-header">
              <h3>Live In-Call Chat</h3>
              <button className="drawer-close-btn" onClick={() => setActiveDrawer('none')}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-content">
              {messages.map((m) => (
                <div key={m.id} className="chat-msg">
                  <div className="chat-msg-header">
                    <span className="chat-author">{m.senderName}</span>
                    <span className="chat-time">{m.timestamp}</span>
                  </div>
                  <div className={`chat-bubble ${m.senderId === localUserId ? 'mine' : ''}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="drawer-footer">
              <form onSubmit={handleSendChat} className="chat-input-form">
                <input
                  type="text"
                  placeholder="Type a message to room..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </aside>
        )}

        {activeDrawer === 'participants' && (
          <aside className="room-drawer">
            <div className="drawer-header">
              <h3>Active Participants ({participants.length})</h3>
              <button className="drawer-close-btn" onClick={() => setActiveDrawer('none')}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-content">
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Invite Link:</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#c7d2fe',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    style={{
                      background: '#6366f1',
                      border: 'none',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {participants.map((p) => {
                const isLocal = p.id === localUserId;
                return (
                  <div key={p.id || p.socketId} className="participant-item">
                    <div
                      className="participant-avatar"
                      style={{
                        backgroundImage: p.avatar ? `url(${p.avatar})` : undefined,
                        backgroundSize: 'cover',
                      }}
                    >
                      {!p.avatar && (p.name[0]?.toUpperCase() || 'U')}
                    </div>
                    <div className="participant-details">
                      <div className="participant-name">
                        {p.name} {isLocal && '(You)'}
                      </div>
                      <div className="participant-role">{p.role || 'Participant'}</div>
                    </div>
                    {p.isHandRaised && <Hand size={14} color="#f59e0b" />}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Control Bar */}
      <footer className="room-control-bar">
        <div className="control-group">
          <button
            className={`control-btn ${isMuted ? 'danger' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            className={`control-btn ${isVideoOff ? 'danger' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Start Video' : 'Stop Video'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        </div>

        <div className="control-group">
          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Sparkles size={20} />
          </button>

          <button
            className={`control-btn ${isHandRaised ? 'active' : ''}`}
            onClick={toggleHandRaise}
            title="Raise Hand"
          >
            <Hand size={20} />
          </button>

          {/* Reactions trigger */}
          <div style={{ position: 'relative' }}>
            <button
              className={`control-btn ${showReactionsMenu ? 'active' : ''}`}
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              title="React"
            >
              <Smile size={20} />
            </button>

            {showReactionsMenu && (
              <div className="reactions-popover">
                {['👍', '❤️', '👏', '🎉', '🔥', '💡'].map((emoji) => (
                  <button
                    key={emoji}
                    className="reaction-item-btn"
                    onClick={() => sendReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="control-group">
          <button
            className={`control-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? 'none' : 'chat')}
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          <button
            className={`control-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? 'none' : 'participants')}
            title="Participants"
          >
            <Users size={20} />
            <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>{participants.length}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
