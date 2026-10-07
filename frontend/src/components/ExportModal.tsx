import React, { useState } from 'react';
import type { Meeting } from '../types';
import { X, FileText, Download, Share2, Check, MessageSquare, Copy } from 'lucide-react';

interface ExportModalProps {
  meeting: Meeting;
  videoBlobUrl?: string | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ meeting, videoBlobUrl, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Generate Markdown summary
  const generateMarkdown = () => {
    let md = `# CatchUp AI Meeting Report: ${meeting.title}\n`;
    md += `**Date:** ${new Date(meeting.date).toLocaleDateString()} | **Duration:** ${meeting.durationFormatted}\n`;
    md += `**Attendees:** ${meeting.participants.map((p) => p.name).join(', ')}\n\n`;

    md += `## 🚀 Executive Summary (TL;DR)\n${meeting.summary?.executive || 'N/A'}\n\n`;

    md += `## 🎯 Key Decisions\n`;
    meeting.summary?.keyDecisions?.forEach((d) => {
      md += `- ${d}\n`;
    });
    md += '\n';

    md += `## 📌 Action Items\n`;
    meeting.actionItems?.forEach((a) => {
      md += `- [${a.completed ? 'x' : ' '}] **${a.task}** (Assignee: ${a.assignee}, Due: ${a.dueDate}, Priority: ${a.priority})\n`;
    });
    md += '\n';

    md += `## 📑 Smart Chapters\n`;
    meeting.chapters?.forEach((c) => {
      md += `### ${c.title} (${Math.floor(c.startTime / 60)}:${(c.startTime % 60).toString().padStart(2, '0')} - ${Math.floor(c.endTime / 60)}:${(c.endTime % 60).toString().padStart(2, '0')})\n`;
      md += `${c.summary}\n`;
      md += `> **Key Takeaway:** ${c.keyTakeaway}\n\n`;
    });

    return md;
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CatchUp_${meeting.title.replace(/\s+/g, '_')}_Minutes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Slack formatted message
  const handleCopySlack = () => {
    let text = `*CatchUp AI Brief: ${meeting.title}*\n`;
    text += `*TL;DR:* ${meeting.summary?.executive}\n\n`;
    text += `*Key Decisions:*\n`;
    meeting.summary?.keyDecisions?.forEach((d) => (text += `• ${d}\n`));
    text += `\n*Action Items:*\n`;
    meeting.actionItems?.forEach((a) => (text += `• ${a.task} (@${a.assignee} - ${a.dueDate})\n`));
    text += `\n🔗 *Full Recording & Interactive Transcript:* ${window.location.href}`;

    navigator.clipboard.writeText(text);
    setCopiedType('slack');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Copy Shareable link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Download Raw Recording Video
  const handleDownloadVideo = () => {
    if (videoBlobUrl) {
      const a = document.createElement('a');
      a.href = videoBlobUrl;
      a.download = `CatchUp_${meeting.title.replace(/\s+/g, '_')}_Recording.webm`;
      a.click();
    } else {
      alert('This seed meeting uses dynamic interactive canvas simulation.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="processing-card" style={{ maxWidth: '560px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={20} color="#818cf8" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Export & Share CatchUp</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Distribute meeting minutes, share action items to your team chat, or download the full recording.
        </p>

        <div className="export-options-list">
          {/* Slack format */}
          <button className="export-opt-btn" onClick={handleCopySlack}>
            <div className="opt-icon-wrap" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <MessageSquare size={20} />
            </div>
            <div className="opt-text" style={{ flex: 1 }}>
              <h4>Copy Slack / Teams Digest</h4>
              <p>Formatted text ready to paste into your channel</p>
            </div>
            {copiedType === 'slack' ? <Check size={18} color="#10b981" /> : <Copy size={16} />}
          </button>

          {/* Markdown Download */}
          <button className="export-opt-btn" onClick={handleDownloadMarkdown}>
            <div className="opt-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <FileText size={20} />
            </div>
            <div className="opt-text" style={{ flex: 1 }}>
              <h4>Download Meeting Minutes (.MD)</h4>
              <p>Complete executive summary, chapters, and task checklist</p>
            </div>
            <Download size={16} />
          </button>

          {/* Video Download */}
          <button className="export-opt-btn" onClick={handleDownloadVideo}>
            <div className="opt-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Download size={20} />
            </div>
            <div className="opt-text" style={{ flex: 1 }}>
              <h4>Download Video Recording (.WebM)</h4>
              <p>Full HD composite recording with multi-track audio</p>
            </div>
            <Download size={16} />
          </button>

          {/* Shareable Link */}
          <button className="export-opt-btn" onClick={handleCopyLink}>
            <div className="opt-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Share2 size={20} />
            </div>
            <div className="opt-text" style={{ flex: 1 }}>
              <h4>Copy CatchUp Hub Link</h4>
              <p>Anyone with this link can watch recording and read AI notes</p>
            </div>
            {copiedType === 'link' ? <Check size={18} color="#10b981" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
