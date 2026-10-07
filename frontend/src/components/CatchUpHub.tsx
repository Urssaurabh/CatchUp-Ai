import React, { useState, useRef, useEffect } from 'react';
import type { Meeting } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Search,
  Send,
  BarChart3,
  FileText,
  Bookmark,
  Share2,
  ArrowLeft,
  Tag,
  Zap,
} from 'lucide-react';
import { formatDuration, getVideoBlob } from '../utils/storage';
import { askMeetingQuestion } from '../utils/aiSummarizer';
import { ExportModal } from './ExportModal';

interface CatchUpHubProps {
  meeting: Meeting;
  onBack: () => void;
  onUpdateMeeting: (updated: Meeting) => void;
}

export const CatchUpHub: React.FC<CatchUpHubProps> = ({
  meeting,
  onBack,
  onUpdateMeeting,
}) => {
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(meeting.durationSeconds || 600);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'summary' | 'chapters' | 'transcript' | 'actionItems' | 'qna' | 'analytics'
  >('summary');

  // Interactive Transcript Search
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // Ask AI Q&A State
  const [qnaInput, setQnaInput] = useState('');
  const [qnaHistory, setQnaHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello! I'm your CatchUp AI Copilot for "${meeting.title}". You can ask me anything about the discussion, decisions, action items, or what specific attendees said.`,
    },
  ]);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load video from IndexedDB if available
  useEffect(() => {
    let active = true;
    async function loadBlob() {
      const blob = await getVideoBlob(meeting.id);
      if (blob && active) {
        const url = URL.createObjectURL(blob);
        setVideoBlobUrl(url);
      }
    }
    loadBlob();
    return () => {
      active = false;
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    };
  }, [meeting.id]);

  // Handle Canvas Dynamic Simulation if no local video file
  useEffect(() => {
    if (videoBlobUrl) return; // real video exists

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localCurrentTime = currentTime;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = Date.now() / 1000;

      // Dark background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090e1a');
      grad.addColorStop(1, '#162038');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Find active speaker from transcript at this timestamp
      const activeLine = [...meeting.transcript]
        .reverse()
        .find((item) => item.timestamp <= localCurrentTime);
      const speakerName = activeLine?.speaker || meeting.host.name;

      // Draw Avatar
      const cx = w / 2;
      const cy = h / 2 - 20;
      const radius = 64;

      if (isPlaying) {
        // Pulse ring
        const pulse = Math.sin(t * 6) * 8;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 12 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      const avatarGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      avatarGrad.addColorStop(0, '#6366f1');
      avatarGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = avatarGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(speakerName[0].toUpperCase(), cx, cy);

      // Equalizer bars
      const barCount = 18;
      const barW = 5;
      const gap = 5;
      const totalW = barCount * (barW + gap);
      const startX = cx - totalW / 2;
      const waveY = cy + radius + 40;

      for (let i = 0; i < barCount; i++) {
        const height = isPlaying ? Math.abs(Math.sin(t * 8 + i * 0.5)) * 24 + 4 : 4;
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.roundRect(startX + i * (barW + gap), waveY - height / 2, barW, height, 2);
        ctx.fill();
      }

      // Speaker Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(speakerName, cx, waveY + 36);

      // Active line caption
      if (activeLine) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'italic 13px "Plus Jakarta Sans", sans-serif';
        const displayTxt = activeLine.text.length > 70 ? activeLine.text.slice(0, 70) + '...' : activeLine.text;
        ctx.fillText(`"${displayTxt}"`, cx, waveY + 62);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoBlobUrl, isPlaying, currentTime, meeting]);

  // Video Timer ticking if canvas simulation
  useEffect(() => {
    if (videoBlobUrl || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return prev + 1 * playbackRate;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [videoBlobUrl, isPlaying, playbackRate, duration]);

  // Seek helper
  const seekTo = (seconds: number) => {
    const target = Math.max(0, Math.min(seconds, duration));
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (videoBlobUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Toggle Action Item Checkbox
  const toggleActionItem = (itemId: string) => {
    const updatedItems = meeting.actionItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const updatedMeeting = { ...meeting, actionItems: updatedItems };
    onUpdateMeeting(updatedMeeting);
  };

  // Ask AI Q&A Form
  const handleAskQuestion = (q?: string) => {
    const query = q || qnaInput;
    if (!query.trim()) return;

    const userEntry = { sender: 'user' as const, text: query.trim() };
    const answerText = askMeetingQuestion(
      query.trim(),
      meeting.summary,
      meeting.chapters,
      meeting.actionItems,
      meeting.transcript
    );
    const aiEntry = { sender: 'ai' as const, text: answerText };

    setQnaHistory((prev) => [...prev, userEntry, aiEntry]);
    setQnaInput('');
  };

  // Filtered transcript
  const filteredTranscript = meeting.transcript.filter(
    (t) =>
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  return (
    <div className="catchup-hub-container">
      {/* Top Header */}
      <header className="catchup-top-header">
        <div className="header-meta-group">
          <button className="back-link" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to CatchUp Library</span>
          </button>

          <div className="catchup-heading-row">
            <h1 className="catchup-title">{meeting.title}</h1>
            <div className="catchup-pill-badge">
              <Sparkles size={14} />
              <span>CatchUp AI Distilled</span>
            </div>
          </div>

          <div className="catchup-sub-meta">
            <span>
              <Calendar size={14} />
              {new Date(meeting.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>
              <Clock size={14} />
              {meeting.durationFormatted || formatDuration(duration)}
            </span>
            <span>
              <Users size={14} />
              {meeting.participants.length} Attendees
            </span>
          </div>
        </div>

        <div className="catchup-actions-row">
          <button className="btn-secondary" onClick={() => setShowExportModal(true)}>
            <Share2 size={16} />
            <span>Export & Share</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => {
              const text = `*CatchUp AI Brief: ${meeting.title}*\n${meeting.summary?.executive}`;
              navigator.clipboard.writeText(text);
              alert('Copied executive summary to clipboard!');
            }}
          >
            <CheckCircle2 size={16} />
            <span>Copy Brief</span>
          </button>
        </div>
      </header>

      {/* Split Layout: Video Scrubber on Left, AI Tabs on Right */}
      <div className="catchup-split-layout">
        {/* Left Column: Synchronized Video Player */}
        <section className="player-column">
          <div className="video-player-card">
            <div className="video-screen-wrapper">
              {videoBlobUrl ? (
                <video
                  ref={videoRef}
                  src={videoBlobUrl}
                  className="video-screen"
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || 600)}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>

            {/* Custom Scrubber Controls */}
            <div className="player-controls-strip">
              {/* Progress Bar with Chapter Pins */}
              <div
                className="progress-bar-container"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  seekTo(pos * duration);
                }}
              >
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />

                {/* Chapter Pins along bar */}
                {meeting.chapters?.map((c) => {
                  const pct = (c.startTime / duration) * 100;
                  return (
                    <div
                      key={c.id}
                      className="chapter-marker-pin"
                      style={{ left: `${pct}%` }}
                      title={`${c.title} (${formatDuration(c.startTime)})`}
                    />
                  );
                })}
              </div>

              {/* Controls Row */}
              <div className="player-controls-row">
                <div className="controls-left">
                  <button className="play-pause-btn" onClick={togglePlay}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                  </button>

                  <button
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => seekTo(currentTime - 10)}
                    title="Rewind 10s"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => seekTo(currentTime + 10)}
                    title="Forward 10s"
                  >
                    <RotateCw size={16} />
                  </button>

                  <span className="player-time-display">
                    {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                  </span>
                </div>

                <div className="controls-right">
                  <button
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  <select
                    className="speed-select"
                    value={playbackRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setPlaybackRate(val);
                      if (videoRef.current) videoRef.current.playbackRate = val;
                    }}
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Chapter Jump Pills */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              JUMP TO CHAPTER:
            </div>
            <div className="player-chapter-pills">
              {meeting.chapters?.map((c) => {
                const isCurrent = currentTime >= c.startTime && currentTime <= c.endTime;
                return (
                  <button
                    key={c.id}
                    className={`player-chapter-pill ${isCurrent ? 'active' : ''}`}
                    onClick={() => seekTo(c.startTime)}
                  >
                    <span>{c.title}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.7rem', marginLeft: '4px' }}>
                      {formatDuration(c.startTime)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: AI CatchUp Tabbed Interface */}
        <section className="catchup-panel">
          <nav className="panel-tabs-bar">
            <button
              className={`panel-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <FileText size={16} />
              <span>Summary</span>
            </button>

            <button
              className={`panel-tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
              onClick={() => setActiveTab('chapters')}
            >
              <Bookmark size={16} />
              <span>Chapters ({meeting.chapters?.length || 0})</span>
            </button>

            <button
              className={`panel-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
              onClick={() => setActiveTab('transcript')}
            >
              <Search size={16} />
              <span>Transcript</span>
            </button>

            <button
              className={`panel-tab-btn ${activeTab === 'actionItems' ? 'active' : ''}`}
              onClick={() => setActiveTab('actionItems')}
            >
              <CheckCircle2 size={16} />
              <span>Actions ({meeting.actionItems?.length || 0})</span>
            </button>

            <button
              className={`panel-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
              onClick={() => setActiveTab('qna')}
            >
              <Sparkles size={16} color="#818cf8" />
              <span>Ask AI</span>
            </button>

            <button
              className={`panel-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 size={16} />
              <span>Stats</span>
            </button>
          </nav>

          {/* Tab 1: Executive Summary */}
          {activeTab === 'summary' && (
            <div className="panel-tab-content summary-block">
              <div className="tldr-box">
                <div className="tldr-box-header">
                  <Zap size={14} />
                  <span>30-Second Executive TL;DR</span>
                </div>
                <p className="tldr-text">{meeting.summary?.executive}</p>
              </div>

              <div className="decisions-section">
                <h4>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Key Decisions Agreed Upon</span>
                </h4>
                {meeting.summary?.keyDecisions?.map((dec, i) => (
                  <div key={i} className="decision-item">
                    <span className="decision-icon">✓</span>
                    <span>{dec}</span>
                  </div>
                ))}
              </div>

              <div className="topics-section">
                <h4>
                  <Tag size={16} color="#818cf8" />
                  <span>Core Discussion Themes</span>
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {meeting.summary?.topicsDiscussed?.map((topic, i) => (
                    <span key={i} className="tag-pill" style={{ padding: '0.35rem 0.75rem' }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Smart Chapters */}
          {activeTab === 'chapters' && (
            <div className="panel-tab-content chapters-list">
              {meeting.chapters?.map((chap) => {
                const isActive = currentTime >= chap.startTime && currentTime <= chap.endTime;
                return (
                  <div
                    key={chap.id}
                    className={`chapter-card ${isActive ? 'active' : ''}`}
                    onClick={() => seekTo(chap.startTime)}
                  >
                    <div className="chapter-header">
                      <div className="chapter-title-wrap">
                        <span>{chap.title}</span>
                      </div>
                      <span className="chapter-time-badge">
                        {formatDuration(chap.startTime)} - {formatDuration(chap.endTime)}
                      </span>
                    </div>

                    <p className="chapter-summary-text">{chap.summary}</p>

                    <div className="chapter-takeaway">
                      <Sparkles size={12} />
                      <span>Takeaway: {chap.keyTakeaway}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: Interactive Searchable Transcript */}
          {activeTab === 'transcript' && (
            <div className="panel-tab-content transcript-wrapper">
              <div className="transcript-search-bar">
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search transcript by keyword or speaker..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                />
              </div>

              <div className="transcript-list">
                {filteredTranscript.map((t, idx) => {
                  const isCurrent = Math.abs(currentTime - t.timestamp) < 5;
                  return (
                    <div
                      key={idx}
                      className={`transcript-entry ${isCurrent ? 'active-playing' : ''}`}
                      onClick={() => seekTo(t.timestamp)}
                      title="Click to jump video to this moment"
                    >
                      <div className="transcript-avatar">
                        {t.avatar ? (
                          <img
                            src={t.avatar}
                            alt={t.speaker}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          t.speaker[0]
                        )}
                      </div>

                      <div className="transcript-body">
                        <div className="transcript-meta">
                          <span className="transcript-speaker">{t.speaker}</span>
                          <span className="transcript-timestamp">{t.timeFormatted}</span>
                        </div>
                        <p className="transcript-text">{t.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: Action Items */}
          {activeTab === 'actionItems' && (
            <div className="panel-tab-content actions-list">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {meeting.actionItems?.filter((a) => a.completed).length} of {meeting.actionItems?.length} tasks finished
                </span>

                <button
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => {
                    const text = meeting.actionItems.map((a) => `• [${a.completed ? 'x' : ' '}] ${a.task} (@${a.assignee})`).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Copied action items to clipboard!');
                  }}
                >
                  <span>Copy Tasks</span>
                </button>
              </div>

              {meeting.actionItems?.map((act) => (
                <div key={act.id} className="action-card">
                  <input
                    type="checkbox"
                    checked={act.completed}
                    onChange={() => toggleActionItem(act.id)}
                    className="action-checkbox"
                  />

                  <div className="action-details">
                    <div className={`action-task-title ${act.completed ? 'completed' : ''}`}>
                      {act.task}
                    </div>

                    <div className="action-tags-row">
                      <span className="assignee-badge">
                        <Users size={12} />
                        <span>@{act.assignee}</span>
                      </span>

                      <span className={`priority-badge priority-${act.priority}`}>
                        {act.priority}
                      </span>

                      <span className="due-date">Due: {act.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 5: Ask CatchUp AI */}
          {activeTab === 'qna' && (
            <div className="panel-tab-content qna-container">
              <div className="qna-suggestions">
                {[
                  'What were the key decisions?',
                  'Summarize action items',
                  'What was the launch timeline?',
                  'Who was the most active speaker?',
                ].map((s) => (
                  <button key={s} className="suggestion-chip" onClick={() => handleAskQuestion(s)}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="qna-messages">
                {qnaHistory.map((m, idx) => (
                  <div key={idx} className="qna-item">
                    {m.sender === 'user' ? (
                      <div className="qna-user-bubble">{m.text}</div>
                    ) : (
                      <div className="qna-ai-bubble">{m.text}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="qna-input-box">
                <input
                  type="text"
                  placeholder="Ask any question about this meeting..."
                  value={qnaInput}
                  onChange={(e) => setQnaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button className="btn-primary" onClick={() => handleAskQuestion()}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 6: Analytics */}
          {activeTab === 'analytics' && (
            <div className="panel-tab-content analytics-grid">
              <div className="analytics-stat-cards">
                <div className="metric-card">
                  <span className="metric-value">{meeting.analytics?.engagementScore || 92}%</span>
                  <span className="metric-label">Engagement Score</span>
                </div>

                <div className="metric-card">
                  <span className="metric-value">{meeting.analytics?.totalWordsSpoken || 2450}</span>
                  <span className="metric-label">Words Spoken</span>
                </div>

                <div className="metric-card">
                  <span className="metric-value">{meeting.analytics?.pace || '135 wpm'}</span>
                  <span className="metric-label">Meeting Cadence</span>
                </div>
              </div>

              <div className="speaker-distribution-section">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Talk-Time Distribution
                </h4>

                {meeting.analytics?.speakerPercentages?.map((sp, idx) => (
                  <div key={idx} className="speaker-bar-row">
                    <div className="speaker-bar-labels">
                      <span style={{ fontWeight: 600 }}>{sp.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{sp.percentage}%</span>
                    </div>
                    <div className="speaker-bar-track">
                      <div
                        className="speaker-bar-fill"
                        style={{ width: `${sp.percentage}%`, background: sp.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.35rem' }}>
                  Overall Sentiment: {meeting.analytics?.sentiment || 'Highly Collaborative & Productive'}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  The conversation exhibited high engagement, balanced turn-taking, and decisive consensus
                  with zero unresolved conflict blocks.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          meeting={meeting}
          videoBlobUrl={videoBlobUrl}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
