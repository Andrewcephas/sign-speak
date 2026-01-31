import { useState, useRef, useCallback } from 'react';

export interface VideoUploadState {
  isProcessing: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  videoUrl: string | null;
}

export const useVideoUpload = () => {
  const [state, setState] = useState<VideoUploadState>({
    isProcessing: false,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    videoUrl: null,
  });
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const uploadVideo = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('video/')) {
        reject(new Error('Please upload a video file'));
        return;
      }

      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, videoUrl: url, isProcessing: false }));
      resolve(url);
    });
  }, []);

  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    
    if (video) {
      video.onloadedmetadata = () => {
        setState(prev => ({ ...prev, duration: video.duration }));
      };
      
      video.ontimeupdate = () => {
        setState(prev => ({ ...prev, currentTime: video.currentTime }));
      };
      
      video.onplay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      };
      
      video.onpause = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };
      
      video.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };
    }
  }, []);

  const playVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const seekVideo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const clearVideo = useCallback(() => {
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }
    setState({
      isProcessing: false,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      videoUrl: null,
    });
  }, [state.videoUrl]);

  const getVideoElement = useCallback(() => videoRef.current, []);

  return {
    ...state,
    uploadVideo,
    setVideoRef,
    playVideo,
    pauseVideo,
    seekVideo,
    clearVideo,
    getVideoElement,
  };
};
