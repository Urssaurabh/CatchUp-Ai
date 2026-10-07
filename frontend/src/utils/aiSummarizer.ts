import type { ActionItem, Analytics, Chapter, MeetingSummary, TranscriptItem, User } from '../types';

export interface SummarizerOutput {
  summary: MeetingSummary;
  chapters: Chapter[];
  actionItems: ActionItem[];
  analytics: Analytics;
}

// Generate realistic AI summary, chapters, action items and analytics from meeting transcript
export function generateAiMeetingCatchUp(
  meetingTitle: string,
  durationSeconds: number,
  participants: User[],
  transcript: TranscriptItem[]
): SummarizerOutput {
  const participantNames = participants.map((p) => p.name);
  const words = transcript.map((t) => t.text).join(' ');
  const wordCount = Math.max(words.split(/\s+/).filter(Boolean).length, 45);

  // Group transcript into 3-4 chronological chapters
  const numChapters = durationSeconds > 300 ? 4 : durationSeconds > 90 ? 3 : 2;
  const chapterDuration = Math.max(Math.floor(durationSeconds / numChapters), 10);

  const chapters: Chapter[] = [];
  const defaultChapterTitles = [
    'Kickoff & Agenda Overview',
    'Core Architecture & Feature Review',
    'Action Plan & Execution Timeline',
    'Wrap-up & Key Decisions',
  ];

  for (let i = 0; i < numChapters; i++) {
    const startTime = i * chapterDuration;
    const endTime = i === numChapters - 1 ? durationSeconds : (i + 1) * chapterDuration;

    // Filter transcript in this segment
    const segmentTranscript = transcript.filter(
      (t) => t.timestamp >= startTime && t.timestamp <= endTime
    );
    const segmentText = segmentTranscript.map((t) => t.text).join(' ');

    let summaryText = '';
    let takeawayText = '';

    if (i === 0) {
      summaryText = `${participants[0]?.name || 'The host'} opened the session for "${meetingTitle}", outlining objectives and aligning the team on priority deliverables.`;
      takeawayText = 'Clear alignment established across all active attendees.';
    } else if (i === 1) {
      summaryText = segmentText.length > 30
        ? `The team discussed: "${segmentText.slice(0, 110)}..."`
        : `Deep dive into implementation details, resolving open questions regarding performance and user experience.`;
      takeawayText = 'Key technical approach approved without blocking dependencies.';
    } else if (i === 2) {
      summaryText = `Discussion shifted to milestones, assignees, and target rollout schedule for the upcoming release.`;
      takeawayText = 'Timeline locked with designated owners for each milestone.';
    } else {
      summaryText = `Final review of outstanding questions, confirmation of follow-up tasks, and meeting adjournment.`;
      takeawayText = 'Action items recorded into CatchUp AI repository.';
    }

    chapters.push({
      id: `chap-${i + 1}`,
      title: defaultChapterTitles[i] || `Phase ${i + 1}: Discussion`,
      startTime,
      endTime,
      summary: summaryText,
      keyTakeaway: takeawayText,
    });
  }

  // Extract or synthesize Action Items
  const actionItems: ActionItem[] = [
    {
      id: `act-${Date.now()}-1`,
      task: `Review CatchUp AI recording and share summary with stakeholders`,
      assignee: participants[0]?.name || 'Meeting Host',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      completed: false,
    },
    {
      id: `act-${Date.now()}-2`,
      task: `Finalize implementation tasks based on the discussed architecture`,
      assignee: participants[1]?.name || participants[0]?.name || 'Lead Engineer',
      priority: 'Urgent',
      dueDate: new Date(Date.now() + 86400000 * 4).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      completed: false,
    },
    {
      id: `act-${Date.now()}-3`,
      task: `Schedule follow-up review for the upcoming milestone check-in`,
      assignee: participants[2]?.name || participants[0]?.name || 'Product Manager',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 86400000 * 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      completed: true,
    },
  ];

  // Synthesize Executive Summary
  const summary: MeetingSummary = {
    executive: `In this session on "${meetingTitle}", ${participantNames.join(', ')} converged on core deliverables. The conversation highlighted seamless automated recording, instant transcript generation, and real-time smart chaptering. The participants agreed that zero-friction asynchronous catchup transforms team velocity.`,
    keyDecisions: [
      `Approved the proposed workflow for "${meetingTitle}" with full team consensus.`,
      `Agreed that automatic recording and AI smart chapters will be the standard for all upcoming meetings.`,
      `Assigned immediate ownership of follow-up action items with target review dates.`,
    ],
    topicsDiscussed: [
      'Project milestones and delivery dates',
      'Zero-friction meeting recording & transcript accuracy',
      'Asynchronous team communication best practices',
      'Action item ownership & accountability',
    ],
  };

  // Compute Speaker Analytics
  const speakerWordCounts: Record<string, number> = {};
  participantNames.forEach((n) => (speakerWordCounts[n] = 0));

  transcript.forEach((item) => {
    const count = item.text.split(/\s+/).length;
    speakerWordCounts[item.speaker] = (speakerWordCounts[item.speaker] || 0) + count;
  });

  const totalWords = Object.values(speakerWordCounts).reduce((a, b) => a + b, 0) || 1;
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const speakerPercentages = participantNames.map((name, idx) => {
    const rawCount = speakerWordCounts[name] || Math.max(Math.floor(totalWords / participantNames.length), 10);
    const pct = Math.round((rawCount / totalWords) * 100);
    return {
      name,
      percentage: pct || Math.floor(100 / participantNames.length),
      color: colors[idx % colors.length],
    };
  });

  // Normalize percentages to sum to 100
  const sumPct = speakerPercentages.reduce((acc, s) => acc + s.percentage, 0);
  if (sumPct !== 100 && speakerPercentages.length > 0) {
    speakerPercentages[0].percentage += 100 - sumPct;
  }

  const analytics: Analytics = {
    speakerPercentages,
    sentiment: 'Highly Collaborative & Engaging',
    engagementScore: 92,
    totalWordsSpoken: wordCount,
    pace: 'Optimal (135 words/min)',
  };

  return { summary, chapters, actionItems, analytics };
}

// Answer conversational questions about the meeting
export function askMeetingQuestion(
  question: string,
  summary: MeetingSummary,
  chapters: Chapter[],
  actionItems: ActionItem[],
  transcript: TranscriptItem[]
): string {
  const q = question.toLowerCase();

  if (q.includes('decision') || q.includes('decide') || q.includes('conclude')) {
    return `Here are the key decisions from this meeting:\n\n${summary.keyDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
  }

  if (q.includes('action') || q.includes('task') || q.includes('todo') || q.includes('assign')) {
    return `Action items recorded:\n\n${actionItems.map((a) => `• [${a.priority}] ${a.task} → ${a.assignee} (Due: ${a.dueDate})`).join('\n')}`;
  }

  if (q.includes('summary') || q.includes('tldr') || q.includes('brief') || q.includes('about')) {
    return `Executive Summary:\n\n${summary.executive}`;
  }

  if (q.includes('chapter') || q.includes('topic') || q.includes('agenda')) {
    return `The meeting covered ${chapters.length} key chapters:\n\n${chapters.map((c) => `• ${c.title} (${Math.floor(c.startTime / 60)}m - ${Math.floor(c.endTime / 60)}m): ${c.summary}`).join('\n')}`;
  }

  // Search in transcript text
  const matches = transcript.filter((t) => t.text.toLowerCase().includes(q));
  if (matches.length > 0) {
    const topMatches = matches.slice(0, 3);
    return `Found in the meeting transcript:\n\n${topMatches.map((m) => `[${m.timeFormatted}] ${m.speaker}: "${m.text}"`).join('\n\n')}`;
  }

  return `Based on the recording analysis: The meeting focused on "${summary.topicsDiscussed.slice(0, 3).join(', ')}". Overall sentiment was rated as productive, with immediate follow-ups assigned across the team.`;
}
