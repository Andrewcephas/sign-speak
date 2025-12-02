import { useState, useRef, useCallback } from 'react';

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async (videoElement: HTMLVideoElement | null, canvasElement: HTMLCanvasElement | null) => {
    if (!videoElement || !canvasElement) {
      throw new Error('Video or canvas element not available');
    }

    try {
      // Get video stream
      const videoStream = videoElement.srcObject as MediaStream;
      if (!videoStream) {
        throw new Error('No video stream available');
      }

      // Create a new canvas to combine video and overlay
      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = canvasElement.width;
      recordCanvas.height = canvasElement.height;
      const ctx = recordCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Capture canvas stream with overlay
      const canvasStream = recordCanvas.captureStream(30);
      
      // Draw video and overlay continuously
      const drawFrame = () => {
        if (!isRecording) return;
        
        // Draw video frame
        ctx.drawImage(videoElement, 0, 0, recordCanvas.width, recordCanvas.height);
        
        // Draw overlay from the hand tracking canvas
        ctx.drawImage(canvasElement, 0, 0);
        
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // Get audio if available (for future enhancement)
      const audioTracks = videoStream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }

      streamRef.current = canvasStream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  const downloadRecording = useCallback(() => {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign-to-speech-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Clear recorded chunks after download
    setRecordedChunks([]);
  }, [recordedChunks]);

  const clearRecording = useCallback(() => {
    setRecordedChunks([]);
  }, []);

  return {
    isRecording,
    hasRecording: recordedChunks.length > 0,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  };
};
