import React from 'react';
import { X, Video, BrainCircuit, CheckCircle2, Bookmark } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="processing-card" style={{ maxWidth: '640px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon-wrapper" style={{ width: '32px', height: '32px' }}>
              <Video size={18} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>How CatchUp AI Works</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          CatchUp AI reimagines video meetings for remote and asynchronous teams. Every call is recorded
          automatically, generating structured knowledge so anyone who missed the live meeting can catch up
          in minutes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="opt-icon-wrap" style={{ flexShrink: 0, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Video size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                1. Zero-Click Continuous Recording
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                No awkward bot accounts or remembering to click record. As soon as a meeting starts, the composite
                canvas and multi-track audio are captured directly in the browser and stored into local IndexedDB.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="opt-icon-wrap" style={{ flexShrink: 0, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <BrainCircuit size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                2. Live Captions & Real-Time Notes
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Web Speech API streams live subtitles as attendees speak. CatchUp AI draft notes update dynamically in
                the side drawer throughout the conversation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="opt-icon-wrap" style={{ flexShrink: 0, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Bookmark size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                3. Smart Chapters & Click-to-Seek Scrubber
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Meetings are divided into topic chapters with timeline pins. Clicking any chapter or transcript line
                immediately jumps the video to that exact second.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="opt-icon-wrap" style={{ flexShrink: 0, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                4. Action Items & Meeting Copilot
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Action items are assigned with priority tags and due dates. Chat conversationally with the recording
                using the built-in "Ask CatchUp AI" assistant.
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: '1.75rem', justifyContent: 'center' }}
          onClick={onClose}
        >
          <span>Got it, let's explore!</span>
        </button>
      </div>
    </div>
  );
};
