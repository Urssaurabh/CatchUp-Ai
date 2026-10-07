export interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
  socketId?: string;
  color?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatar: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isAi?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  summary: string;
  keyTakeaway: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  dueDate: string;
  completed: boolean;
}

export interface TranscriptItem {
  speaker: string;
  avatar?: string;
  timestamp: number; // seconds
  timeFormatted: string;
  text: string;
}

export interface MeetingSummary {
  executive: string;
  keyDecisions: string[];
  topicsDiscussed: string[];
}

export interface SpeakerStat {
  name: string;
  percentage: number;
  color: string;
}

export interface Analytics {
  speakerPercentages: SpeakerStat[];
  sentiment: string;
  engagementScore: number;
  totalWordsSpoken: number;
  pace: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  durationSeconds: number;
  durationFormatted: string;
  host: User;
  creatorId?: string;
  creatorEmail?: string;
  participants: User[];
  tags: string[];
  summary: MeetingSummary;
  chapters: Chapter[];
  actionItems: ActionItem[];
  transcript: TranscriptItem[];
  analytics: Analytics;
  videoUrl?: string;
  hasCustomVideo?: boolean;
}
