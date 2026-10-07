import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    durationFormatted: { type: String, default: '00:00' },
    host: {
      id: String,
      name: String,
      role: String,
      avatar: String,
    },
    creatorId: { type: String, default: '' },
    creatorEmail: { type: String, default: '' },
    participants: [
      {
        id: String,
        name: String,
        role: String,
        avatar: String,
        color: String,
      },
    ],
    tags: [String],
    summary: {
      executive: String,
      keyDecisions: [String],
      topicsDiscussed: [String],
    },
    chapters: [
      {
        id: String,
        title: String,
        startTime: Number,
        endTime: Number,
        summary: String,
        keyTakeaway: String,
      },
    ],
    actionItems: [
      {
        id: String,
        task: String,
        assignee: String,
        priority: String,
        dueDate: String,
        completed: { type: Boolean, default: false },
      },
    ],
    transcript: [
      {
        speaker: String,
        avatar: String,
        timestamp: Number,
        timeFormatted: String,
        text: String,
      },
    ],
    analytics: {
      speakerPercentages: [
        {
          name: String,
          percentage: Number,
          color: String,
        },
      ],
      sentiment: String,
      engagementScore: Number,
      totalWordsSpoken: Number,
      pace: String,
    },
    hasCustomVideo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const MeetingModel = mongoose.model('Meeting', MeetingSchema);
