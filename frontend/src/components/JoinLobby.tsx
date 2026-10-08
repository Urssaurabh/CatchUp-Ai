import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, ArrowRight, X, Users, Sparkles, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/storage';

interface JoinLobbyProps {
  roomId: string;
  onJoin: (name: string, initialAudio: boolean, initialVideo: boolean) => void;
  onCancel: () => void;
}

export const JoinLobby: React.FC<JoinLobbyProps> = ({ roomId, onJoin, onCancel }) => {
  const { user, isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || localStorage.getItem('catchup_user_name') || '');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [roomInfo, setRoomInfo] = useState<{ active: boolean; participantCount: number; participants: any[] } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Update name if user logs in
  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user]);

  // Fetch room status
  useEffect(() => {
    let isMounted = true;
    async function checkRoom() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setRoomInfo(data);
        }
      } catch {
        // ignore
      }
    }
    checkRoom();
    const interval = setInterval(checkRoom, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomId]);

  // Request preview camera & microphone stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera preview not available:', err);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (previewStream) {
      previewStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = displayName.trim() || user?.name || 'Guest ' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('catchup_user_name', finalName);

    // Stop preview stream before entering meeting room so MeetingRoom can acquire cleanly
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }

    onJoin(finalName, !isMuted, !isVideoOff);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          background: 'linear-gradient(145deg, rgba(23, 27, 44, 0.95), rgba(13, 16, 27, 0.98))',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 1fr)',
        }}
      >
        {/* Left: Camera Preview Box */}
        <div
          style={{
            padding: '1.75rem',
            background: 'rgba(10, 12, 20, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Video size={16} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Audio & Video Preview</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Check your camera before joining</span>
              </div>
            </div>

            {/* Video Box */}
            <div
              style={{
                width: '100%',
                height: '240px',
                borderRadius: '12px',
                background: '#090d16',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // mirror effect
                  display: isVideoOff ? 'none' : 'block',
                }}
              />

              {isVideoOff && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      color: '#a5b4fc',
                      fontWeight: 700,
                      fontSize: '1.5rem',
                    }}
                  >
                    {(displayName || 'U')[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Camera is off</span>
                </div>
              )}

              {/* Controls bar inside preview */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  display: 'flex',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={toggleMic}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isMuted ? '#ef4444' : 'rgba(15, 23, 42, 0.75)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  type="button"
                  onClick={toggleVideo}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isVideoOff ? '#ef4444' : 'rgba(15, 23, 42, 0.75)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}
                  title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                >
                  {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
            <Sparkles size={13} color="#818cf8" />
            <span>Automatic AI recording & live captions will start when you join</span>
          </div>
        </div>

        {/* Right: Join Form & Room Details */}
        <div style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    marginBottom: '6px',
                  }}
                >
                  ● Active Meeting
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#fff' }}>Ready to join?</h2>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Room: <strong style={{ color: '#c7d2fe' }}>{roomId}</strong></span>
              </div>

              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Room Attendees Counter */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Users size={16} color="#818cf8" />
              <div style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                {roomInfo && roomInfo.participantCount > 0 ? (
                  <span>
                    <strong>{roomInfo.participantCount}</strong> person currently in this call:{' '}
                    {roomInfo.participants.map((p: any) => p.name).join(', ')}
                  </span>
                ) : (
                  <span>No one else is currently in call. You will be the first!</span>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Your Display Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '9px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {isAuthenticated && user && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.75rem', color: '#818cf8' }}>
                    <Shield size={12} />
                    <span>Logged in as {user.name} ({user.role})</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                <span>Join Meeting Now</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Return to CatchUp Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
