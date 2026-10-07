import React, { useState } from 'react';
import type { Meeting } from '../types';
import {
  Video,
  Sparkles,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  Play,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Trash2,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  meetings: Meeting[];
  onStartMeeting: (title?: string) => void;
  onSelectMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  meetings,
  onStartMeeting,
  onSelectMeeting,
  onDeleteMeeting,
}) => {
  const { user, isAuthenticated, isAdmin, openAuthModal } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [roomCode, setRoomCode] = useState('');

  // Collect all unique tags
  const allTags = ['All', ...Array.from(new Set(meetings.flatMap((m) => m.tags || [])))];

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.participants.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      meeting.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag === 'All' || meeting.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      onStartMeeting(`Room ${roomCode.trim()}`);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pill">
          <Sparkles size={14} />
          <span>Zero-Friction Intelligent Meetings</span>
        </div>

        <h1 className="hero-title">
          Every meeting automatically recorded. <br />
          <span className="hero-gradient">Catch up on what you missed in 2 minutes.</span>
        </h1>

        <p className="hero-description">
          Host high-definition video calls with instant automated recording. CatchUp AI transcribes,
          structures smart chapters, logs key decisions, and tracks action items so your team never
          needs manual meeting minutes again.
        </p>

        <div className="hero-actions">
          <button
            className="btn-primary"
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}
            onClick={() => onStartMeeting(user ? `${user.name}'s Meeting` : 'Instant Video Meeting')}
          >
            <Video size={20} />
            <span>Start Instant Meeting</span>
          </button>

          <form onSubmit={handleJoinWithCode} className="room-input-group">
            <input
              type="text"
              placeholder="Enter room code..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="room-input"
            />
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <span>Join</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>

        {/* Dynamic Metric Counters */}
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon" style={{ color: '#818cf8' }}>
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-number">42.5 hrs</div>
              <div className="stat-label">Saved by Catching Up</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon" style={{ color: '#10b981' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="stat-number">148 Tasks</div>
              <div className="stat-label">Action Items Extracted</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon" style={{ color: '#ec4899' }}>
              <BrainCircuit size={22} />
            </div>
            <div>
              <div className="stat-number">100%</div>
              <div className="stat-label">Zero-Click Auto Recording</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon" style={{ color: '#f59e0b' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="stat-number">94%</div>
              <div className="stat-label">Information Retention</div>
            </div>
          </div>
        </div>
      </section>

      {/* Meeting Feed Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="feed-header">
          <div className="section-title-wrap">
            <h2>CatchUp Library & Recordings</h2>
            <p>Scrub through recordings, read AI briefs, or query meetings with conversational AI.</p>
          </div>

          <div className="feed-controls">
            <div className="search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search meetings, topics, attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tag Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                background: selectedTag === tag ? 'rgba(99, 102, 241, 0.25)' : undefined,
                borderColor: selectedTag === tag ? 'var(--primary)' : undefined,
                color: selectedTag === tag ? '#fff' : undefined,
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Video size={48} color="#6366f1" style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No recordings found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {searchQuery
                ? 'No meetings match your search query.'
                : 'Start a new meeting to generate your first automatic recording and AI brief.'}
            </p>
            <button className="btn-primary" onClick={() => onStartMeeting('Initial Kickoff Sync')}>
              <Video size={16} />
              <span>Start First Meeting</span>
            </button>
          </div>
        ) : (
          <div className="meetings-grid">
            {filteredMeetings.map((meeting) => {
              const completedTasks = meeting.actionItems?.filter((a) => a.completed).length || 0;
              const totalTasks = meeting.actionItems?.length || 0;

              return (
                <div
                  key={meeting.id}
                  className="meeting-card"
                  onClick={() => onSelectMeeting(meeting)}
                >
                  {/* Thumbnail Banner */}
                  <div className="card-thumbnail-wrap">
                    <div className="card-canvas-preview">
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: 'rgba(99, 102, 241, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                        }}
                      >
                        <Play size={24} color="#fff" style={{ marginLeft: '3px' }} />
                      </div>
                    </div>

                    <div className="card-overlay-badge">
                      <Sparkles size={12} color="#818cf8" />
                      <span>CatchUp Ready</span>
                    </div>

                    <div className="card-duration-badge">
                      {meeting.durationFormatted || '18:42'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="card-body">
                    {(() => {
                      const isOwner =
                        isAuthenticated &&
                        ((meeting.creatorId && user?.id === meeting.creatorId) ||
                          (meeting.creatorEmail && user?.email && user.email.toLowerCase() === meeting.creatorEmail.toLowerCase()) ||
                          (meeting.host?.name && user?.name && user.name.toLowerCase() === meeting.host.name.toLowerCase()));
                      const canDelete = isAdmin || isOwner;

                      return (
                        <div className="card-date-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} />
                              {new Date(meeting.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>

                            {isOwner && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(99, 102, 241, 0.2)',
                                  color: '#a5b4fc',
                                  border: '1px solid rgba(99, 102, 241, 0.35)',
                                  fontWeight: 600,
                                }}
                              >
                                Host (You)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAuthenticated) {
                                if (confirm('Authentication required to delete recordings. Would you like to sign in?')) {
                                  openAuthModal('login');
                                }
                                return;
                              }

                              if (!canDelete) {
                                alert(
                                  `Access Denied: You do not have permission to delete this meeting. Only an Admin or the host (${meeting.host?.name || 'Creator'}) can delete it.`
                                );
                                return;
                              }

                              if (confirm(`Delete recording "${meeting.title}"?`)) {
                                onDeleteMeeting(meeting.id);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: canDelete ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.2)',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              transition: 'all 0.2s',
                            }}
                            title={
                              !isAuthenticated
                                ? 'Sign in to delete'
                                : canDelete
                                ? 'Delete recording'
                                : 'Permission required (Admin or Host only)'
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })()}

                    <h3 className="card-title">{meeting.title}</h3>

                    <p className="card-summary-snippet">
                      {meeting.summary?.executive ||
                        'Comprehensive meeting recording automatically distilled with smart chapters, transcript, and key takeaways.'}
                    </p>

                    {/* Tags */}
                    {meeting.tags && meeting.tags.length > 0 && (
                      <div className="card-tags">
                        {meeting.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag-pill">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="card-footer">
                      <div className="avatars-stack" title={`${meeting.participants?.length || 1} attendees`}>
                        {meeting.participants?.slice(0, 4).map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="avatar-stack-item"
                            title={p.name}
                            style={{
                              backgroundImage: p.avatar ? `url(${p.avatar})` : undefined,
                              backgroundSize: 'cover',
                            }}
                          >
                            {!p.avatar && p.name[0]}
                          </div>
                        ))}
                      </div>

                      <div className="action-items-count-pill">
                        <CheckCircle2 size={13} />
                        <span>
                          {completedTasks}/{totalTasks} Action Items
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
