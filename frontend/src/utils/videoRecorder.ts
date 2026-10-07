// Video and Audio Recording engine for CatchUp AI
export class MeetingRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private isRecording = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');
  }

  // Start recording the meeting composite (canvas + mixed audio)
  public async startRecording(
    localStream: MediaStream | null,
    speakerName: string,
    meetingTitle: string
  ): Promise<void> {
    this.recordedChunks = [];
    this.isRecording = true;

    // Initialize AudioContext
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.audioDestination = this.audioContext.createMediaStreamDestination();

      if (localStream && localStream.getAudioTracks().length > 0) {
        const source = this.audioContext.createMediaStreamSource(localStream);
        source.connect(this.audioDestination);
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }

    // Start drawing dynamic meeting scene on canvas
    this.drawLoop(localStream, speakerName, meetingTitle);

    // Capture stream from canvas
    const canvasStream = this.canvas.captureStream(30);

    // Combine canvas video + mixed audio tracks
    const combinedTracks = [...canvasStream.getVideoTracks()];
    if (this.audioDestination) {
      this.audioDestination.stream.getAudioTracks().forEach((track) => combinedTracks.push(track));
    } else if (localStream && localStream.getAudioTracks().length > 0) {
      localStream.getAudioTracks().forEach((track) => combinedTracks.push(track));
    }

    const combinedStream = new MediaStream(combinedTracks);

    // Supported mimeTypes
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(1000); // 1-second chunks
      console.log('Meeting recording started automatically');
    } catch (err) {
      console.error('Failed to create MediaRecorder:', err);
    }
  }

  // Stop recording and return the final video Blob
  public async stopRecording(): Promise<Blob | null> {
    this.isRecording = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          resolve(blob);
        } else {
          resolve(null);
        }
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Render composite frame
  private drawLoop(
    localStream: MediaStream | null,
    speakerName: string,
    meetingTitle: string
  ): void {
    if (!this.isRecording || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() / 1000;

    // Dark sleek gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#0e1424');
    bgGrad.addColorStop(1, '#161e36');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top Header Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, 70);

    // CatchUp AI Brand Pill
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 18, 140, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.stroke();

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CatchUp AI', 52, 40);

    // Recording Indicator
    const blink = Math.floor(time * 2) % 2 === 0;
    ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(195, 35, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('REC', 208, 40);

    // Meeting Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(meetingTitle, 260, 40);

    // Main Stage Area - Participant Video Card
    const cardW = 760;
    const cardH = 460;
    const cardX = (w - cardW) / 2;
    const cardY = 120;

    // Glowing Border
    ctx.save();
    ctx.shadowColor = 'rgba(99, 102, 241, 0.35)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Check if video element is streaming
    let drawnVideo = false;
    if (localStream && localStream.getVideoTracks().length > 0) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack.enabled) {
        // Find existing video element or create offscreen
        const videoElement = document.getElementById('local-video-element') as HTMLVideoElement;
        if (videoElement && videoElement.readyState >= 2) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(cardX + 4, cardY + 4, cardW - 8, cardH - 8, 16);
          ctx.clip();
          ctx.drawImage(videoElement, cardX + 4, cardY + 4, cardW - 8, cardH - 8);
          ctx.restore();
          drawnVideo = true;
        }
      }
    }

    if (!drawnVideo) {
      // Dynamic Speaker Visualizer
      const avatarRadius = 60;
      const avatarCenterX = cardX + cardW / 2;
      const avatarCenterY = cardY + cardH / 2 - 20;

      // Pulsing glow rings around avatar
      const pulse = Math.sin(time * 4) * 10;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 18 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 8 + pulse * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Avatar Circle
      const grad = ctx.createLinearGradient(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarCenterX + avatarRadius,
        avatarCenterY + avatarRadius
      );
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#a855f7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.fill();

      // Speaker Initial
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((speakerName || 'You')[0].toUpperCase(), avatarCenterX, avatarCenterY);

      // Audio waveform equalizer beneath avatar
      const waveY = avatarCenterY + avatarRadius + 45;
      const barCount = 16;
      const barWidth = 6;
      const spacing = 6;
      const totalWaveW = barCount * (barWidth + spacing);
      const waveStartX = avatarCenterX - totalWaveW / 2;

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.abs(Math.sin(time * 5 + i * 0.6)) * 26 + 6;
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.roundRect(
          waveStartX + i * (barWidth + spacing),
          waveY - barHeight / 2,
          barWidth,
          barHeight,
          3
        );
        ctx.fill();
      }

      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // Name badge at bottom left of card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cardX + 20, cardY + cardH - 55, 220, 36, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cardX + 38, cardY + cardH - 37, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(speakerName || 'You (Host)', cardX + 52, cardY + cardH - 32);

    // Bottom Watermark
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🔴 Automatically recorded & transcribed by CatchUp AI', cardX + 20, h - 35);

    this.animationFrameId = requestAnimationFrame(() =>
      this.drawLoop(localStream, speakerName, meetingTitle)
    );
  }
}
