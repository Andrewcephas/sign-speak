import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecordingMetadata {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  duration_seconds: number | null;
  created_at: string;
  url: string;
}

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [savedRecordings, setSavedRecordings] = useState<RecordingMetadata[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  // Fetch saved recordings from Cloud
  const fetchRecordings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        return;
      }

      // Add public URLs to recordings
      const recordingsWithUrls = (data || []).map((recording) => {
        const { data: urlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(recording.storage_path);
        
        return {
          ...recording,
          url: urlData.publicUrl,
        };
      });

      setSavedRecordings(recordingsWithUrls);
    } catch (err) {
      console.error('Error fetching recordings:', err);
    }
  }, []);

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
      let animationId: number;
      const drawFrame = () => {
        // Draw video frame
        ctx.drawImage(videoElement, 0, 0, recordCanvas.width, recordCanvas.height);
        
        // Draw overlay from the hand tracking canvas
        ctx.drawImage(canvasElement, 0, 0);
        
        animationId = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // Get audio if available
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
        cancelAnimationFrame(animationId);
        setRecordedChunks(chunks);
      };

      mediaRecorderRef.current = mediaRecorder;
      recordStartTimeRef.current = Date.now();
      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  // Upload recording to Cloud storage
  const uploadRecording = useCallback(async (): Promise<RecordingMetadata | null> => {
    if (recordedChunks.length === 0) {
      toast.error('No recording to upload');
      return null;
    }

    setIsUploading(true);

    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const filename = `sign-to-speech-${Date.now()}.webm`;
      const storagePath = `${filename}`;
      
      // Calculate duration
      const durationSeconds = Math.round((Date.now() - recordStartTimeRef.current) / 1000);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(storagePath, blob, {
          contentType: 'video/webm',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(storagePath);

      // Save metadata to database
      const { data: recordingData, error: dbError } = await supabase
        .from('recordings')
        .insert({
          filename,
          storage_path: storagePath,
          file_size: blob.size,
          duration_seconds: durationSeconds,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      const newRecording: RecordingMetadata = {
        ...recordingData,
        url: urlData.publicUrl,
      };

      setSavedRecordings(prev => [newRecording, ...prev]);
      setRecordedChunks([]);
      toast.success('Recording saved to cloud!');
      
      return newRecording;
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast.error('Failed to upload recording');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [recordedChunks]);

  // Download recording locally
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
  }, [recordedChunks]);

  // Delete a recording from Cloud
  const deleteRecording = useCallback(async (recording: RecordingMetadata) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('recordings')
        .remove([recording.storage_path]);

      if (storageError) {
        throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recording.id);

      if (dbError) {
        throw dbError;
      }

      setSavedRecordings(prev => prev.filter(r => r.id !== recording.id));
      toast.success('Recording deleted');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedChunks([]);
  }, []);

  return {
    isRecording,
    hasRecording: recordedChunks.length > 0,
    isUploading,
    savedRecordings,
    startRecording,
    stopRecording,
    downloadRecording,
    uploadRecording,
    deleteRecording,
    clearRecording,
    fetchRecordings,
  };
};
