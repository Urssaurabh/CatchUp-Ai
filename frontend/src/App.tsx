import { useState, useEffect } from 'react';
import type { Meeting, TranscriptItem, User } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { MeetingRoom } from './components/MeetingRoom';
import { CatchUpHub } from './components/CatchUpHub';
import { ProcessingModal } from './components/ProcessingModal';
import { GuideModal } from './components/GuideModal';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { fetchMeetings, saveMeeting, deleteMeeting, saveVideoBlob, formatDuration } from './utils/storage';
import { generateAiMeetingCatchUp } from './utils/aiSummarizer';
import { Video, ArrowRight } from 'lucide-react';

export function App() {
  const { user, token } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'meeting' | 'catchup'>('dashboard');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Active Meeting state
  const [activeMeetingTitle, setActiveMeetingTitle] = useState('Team CatchUp Sync');
  const [activeRoomId, setActiveRoomId] = useState('');
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('catchup_user_name') || 'Guest ' + Math.floor(1000 + Math.random() * 9000);
  });

  // Join prompt modal state (when user opens a ?room= link)
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [joinNameInput, setJoinNameInput] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingMeetingData, setPendingMeetingData] = useState<{
    meeting: Meeting;
    blob: Blob | null;
  } | null>(null);

  // Guide modal state
  const [showGuide, setShowGuide] = useState(false);

  // Initial load: parse URL parameters and fetch meetings from backend
  useEffect(() => {
    async function init() {
      const data = await fetchMeetings();
      setMeetings(data);

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const catchupParam = params.get('catchup');

      if (roomParam) {
        // If user is already logged in, join directly; otherwise show name prompt
        if (user) {
          setActiveRoomId(roomParam.trim());
          setActiveMeetingTitle(`Room ${roomParam.trim()}`);
          setCurrentView('meeting');
          window.history.pushState(null, '', `?room=${roomParam.trim()}`);
        } else {
          setPendingJoinRoomId(roomParam.trim());
        }
      } else if (catchupParam) {
        const found = data.find((m) => m.id === catchupParam.trim());
        if (found) {
          setSelectedMeeting(found);
          setCurrentView('catchup');
        }
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle starting a new meeting (as Host)
  const handleStartMeeting = (title?: string) => {
    const randomCode =
      Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);

    setActiveRoomId(randomCode);
    setActiveMeetingTitle(
      title || `Live Sync (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
    );
    setCurrentView('meeting');

    // Sync real URL for easy sharing
    window.history.pushState(null, '', `?room=${randomCode}`);
  };

  // Handle joining via URL or Room Code modal
  const handleConfirmJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingJoinRoomId) return;

    const finalName = joinNameInput.trim() || (user?.name) || userName || 'Guest';
    setUserName(finalName);
    localStorage.setItem('catchup_user_name', finalName);

    setActiveRoomId(pendingJoinRoomId);
    setActiveMeetingTitle(`Room ${pendingJoinRoomId}`);
    setPendingJoinRoomId(null);
    setCurrentView('meeting');

    window.history.pushState(null, '', `?room=${pendingJoinRoomId}`);
  };

  // Handle ending a live meeting — receives finalParticipants from MeetingRoom (real socket users)
  const handleEndMeeting = async (
    recordedBlob: Blob | null,
    transcript: TranscriptItem[],
    durationSeconds: number,
    finalParticipants: User[]
  ) => {
    const effectiveName = user?.name || userName;
    const hostUser: User = {
      id: user?.id || 'usr_' + Date.now().toString(36),
      name: effectiveName,
      email: user?.email,
      role: user ? (user.role === 'admin' ? 'Host (Admin)' : 'Host') : 'Host',
      avatar:
        user?.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(effectiveName)}`,
      color: '#6366f1',
    };

    // Use the real participants that joined via the link
    const participants: User[] =
      finalParticipants && finalParticipants.length > 0 ? finalParticipants : [hostUser];

    const aiOutput = generateAiMeetingCatchUp(
      activeMeetingTitle,
      Math.max(durationSeconds, 20),
      participants,
      transcript
    );

    const newMeetingId = `meeting-${Date.now()}`;
    const newMeeting: Meeting = {
      id: newMeetingId,
      title: activeMeetingTitle,
      date: new Date().toISOString(),
      durationSeconds: Math.max(durationSeconds, 20),
      durationFormatted: formatDuration(Math.max(durationSeconds, 20)),
      host: hostUser,
      creatorId: user?.id,
      creatorEmail: user?.email,
      participants,
      tags: ['Live Sync', 'Auto Recorded', 'AI Summarized'],
      summary: aiOutput.summary,
      chapters: aiOutput.chapters,
      actionItems: aiOutput.actionItems,
      transcript: transcript.filter((t) => t.speaker !== 'System'),
      analytics: aiOutput.analytics,
      hasCustomVideo: !!recordedBlob,
    };

    setPendingMeetingData({ meeting: newMeeting, blob: recordedBlob });
    setIsProcessing(true);
  };

  // Callback when ProcessingModal finishes
  const handleProcessingFinished = async () => {
    if (pendingMeetingData) {
      const { meeting, blob } = pendingMeetingData;

      if (blob) {
        await saveVideoBlob(meeting.id, blob);
      }

      await saveMeeting(meeting, token);
      setMeetings((prev) => [meeting, ...prev]);

      setSelectedMeeting(meeting);
      setPendingMeetingData(null);
      setIsProcessing(false);
      setCurrentView('catchup');

      window.history.pushState(null, '', `?catchup=${meeting.id}`);
    }
  };

  // Select meeting from list
  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setCurrentView('catchup');
    window.history.pushState(null, '', `?catchup=${meeting.id}`);
  };

  // Delete meeting with Authorization
  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId, token);
      const updated = meetings.filter((m) => m.id !== meetingId);
      setMeetings(updated);
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
        setCurrentView('dashboard');
        window.history.pushState(null, '', window.location.pathname);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Failed to delete meeting');
    }
  };

  // Update meeting
  const handleUpdateMeeting = async (updated: Meeting) => {
    setSelectedMeeting(updated);
    const updatedList = meetings.map((m) => (m.id === updated.id ? updated : m));
    setMeetings(updatedList);
    await saveMeeting(updated, token);
  };

  return (
    <div className="app-container">
      {/* Hide navbar during live meeting room for full immersion */}
      {currentView !== 'meeting' && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            if (view === 'dashboard') {
              setSelectedMeeting(null);
              window.history.pushState(null, '', window.location.pathname);
            }
          }}
          onStartMeeting={() => handleStartMeeting('Instant CatchUp Session')}
          onOpenHelp={() => setShowGuide(true)}
        />
      )}

      {/* Main Content Area */}
      {currentView === 'dashboard' && (
        <Dashboard
          meetings={meetings}
          onStartMeeting={(title) => handleStartMeeting(title)}
          onSelectMeeting={handleSelectMeeting}
          onDeleteMeeting={handleDeleteMeeting}
        />
      )}

      {currentView === 'meeting' && (
        <MeetingRoom
          meetingTitle={activeMeetingTitle}
          roomId={activeRoomId}
          userName={user?.name || userName}
          onEndMeeting={handleEndMeeting}
        />
      )}

      {currentView === 'catchup' && selectedMeeting && (
        <CatchUpHub
          meeting={selectedMeeting}
          onBack={() => {
            setSelectedMeeting(null);
            setCurrentView('dashboard');
            window.history.pushState(null, '', window.location.pathname);
          }}
          onUpdateMeeting={handleUpdateMeeting}
        />
      )}

      {/* Processing Animation Modal */}
      {isProcessing && (
        <ProcessingModal
          meetingTitle={activeMeetingTitle}
          onFinished={handleProcessingFinished}
        />
      )}

      {/* Join Meeting via Shared URL Modal */}
      {pendingJoinRoomId && (
        <div className="modal-backdrop">
          <div className="processing-card" style={{ maxWidth: '440px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div className="brand-icon-wrapper" style={{ width: '36px', height: '36px' }}>
                <Video size={18} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Join Video Meeting</h3>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              You've been invited to join room:{' '}
              <strong style={{ color: '#fff' }}>{pendingJoinRoomId}</strong>. Enter your name to
              connect via real-time video.
            </p>

            <form
              onSubmit={handleConfirmJoin}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}
            >
              <input
                type="text"
                autoFocus
                placeholder={user ? user.name : 'Enter your name (e.g. Alex, Maya)...'}
                value={joinNameInput}
                onChange={(e) => setJoinNameInput(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  color: '#fff',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setPendingJoinRoomId(null);
                    window.history.pushState(null, '', window.location.pathname);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="btn-primary">
                  <span>Join Call</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Authentication & Authorization Modal */}
      <AuthModal />
    </div>
  );
}

export default App;
