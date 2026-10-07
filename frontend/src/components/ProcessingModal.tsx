import React, { useEffect, useState } from 'react';
import { Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface ProcessingModalProps {
  meetingTitle: string;
  onFinished: () => void;
}

const STEPS = [
  'Finalizing composite audio & video recording...',
  'Transcribing speech & attributing speakers...',
  'Generating Executive TL;DR & key decisions...',
  'Extracting Action Items, assignees & due dates...',
  'Building synchronized chapters & smart scrubber...',
];

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ meetingTitle, onFinished }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => {
            onFinished();
          }, 800);
          return prev;
        }
      });
    }, 700);

    return () => clearInterval(timer);
  }, [onFinished]);

  return (
    <div className="modal-backdrop">
      <div className="processing-card">
        <div className="processing-spinner" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="#818cf8" />
          <h2 className="processing-title">CatchUp AI is Processing</h2>
        </div>

        <p className="processing-desc">
          Distilling "{meetingTitle}" into a full interactive catchup experience...
        </p>

        <div className="processing-steps-list">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              >
                <div className="step-dot">
                  {isDone ? (
                    <Check size={12} strokeWidth={3} />
                  ) : isActive ? (
                    <span style={{ fontSize: '0.7rem' }}>•</span>
                  ) : (
                    <span style={{ opacity: 0.4 }}>{idx + 1}</span>
                  )}
                </div>
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {currentStepIndex === STEPS.length - 1 && (
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--accent-emerald)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            <span>Ready! Opening CatchUp Hub...</span>
          </div>
        )}
      </div>
    </div>
  );
};
