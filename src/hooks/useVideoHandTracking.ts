import { useRef, useEffect, useState, useCallback } from 'react';
import { HandLandmarks } from './useHandTracking';

// Load MediaPipe scripts dynamically from CDN
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadMediaPipe = async () => {
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
};

// Hand connections for drawing
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

/**
 * Hand tracking hook designed for uploaded video elements.
 * Unlike useHandTracking, this does NOT use MediaPipe's Camera utility.
 * Instead, it manually sends video frames via requestAnimationFrame.
 */
export const useVideoHandTracking = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
  isActive: boolean
) => {
  const [detectedHands, setDetectedHands] = useState<HandLandmarks[]>([]);
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Process a single frame
  const processFrame = useCallback(async () => {
    if (!videoElement || !handsRef.current || videoElement.paused || videoElement.ended) {
      return;
    }

    try {
      // Only send if video has valid dimensions
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        await handsRef.current.send({ image: videoElement });
      }
    } catch (err) {
      // Silently ignore frame errors
    }

    // Schedule next frame
    if (!videoElement.paused && !videoElement.ended) {
      rafRef.current = requestAnimationFrame(processFrame);
    }
  }, [videoElement]);

  useEffect(() => {
    if (!videoElement || !canvasElement || !isActive) {
      // Stop processing
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDetectedHands([]);
      return;
    }

    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        await loadMediaPipe();
        if (!isMounted) return;

        const win = window as any;

        if (!handsRef.current) {
          const hands = new win.Hands({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          hands.onResults((results: any) => {
            if (!canvasElement) return;
            const ctx = canvasElement.getContext('2d');
            if (!ctx) return;

            ctx.save();
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            if (results.multiHandLandmarks && results.multiHandedness) {
              const hands: HandLandmarks[] = [];
              results.multiHandLandmarks.forEach((landmarks: any, idx: number) => {
                const handedness = results.multiHandedness[idx].label as 'Left' | 'Right';
                hands.push({
                  landmarks: landmarks.map((l: any) => ({ x: l.x, y: l.y, z: l.z })),
                  handedness,
                });

                // Draw connections
                const color = handedness === 'Left' ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 255, 0.8)';
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.lineWidth = 3;
                HAND_CONNECTIONS.forEach(([s, e]) => {
                  ctx.beginPath();
                  ctx.moveTo(landmarks[s].x * canvasElement.width, landmarks[s].y * canvasElement.height);
                  ctx.lineTo(landmarks[e].x * canvasElement.width, landmarks[e].y * canvasElement.height);
                  ctx.stroke();
                });

                // Draw landmarks
                landmarks.forEach((lm: any, i: number) => {
                  ctx.beginPath();
                  const r = [0, 4, 8, 12, 16, 20].includes(i) ? 8 : 5;
                  ctx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, r, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                });
              });
              setDetectedHands(hands);
            } else {
              setDetectedHands([]);
            }
            ctx.restore();
          });

          handsRef.current = hands;
        }

        isInitializedRef.current = true;

        // Start processing frames when video plays
        const onPlay = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(processFrame);
        };
        const onPause = () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        };

        videoElement.addEventListener('play', onPlay);
        videoElement.addEventListener('pause', onPause);
        videoElement.addEventListener('ended', onPause);

        // If already playing, start immediately
        if (!videoElement.paused) {
          onPlay();
        }

        return () => {
          videoElement.removeEventListener('play', onPlay);
          videoElement.removeEventListener('pause', onPause);
          videoElement.removeEventListener('ended', onPause);
        };
      } catch (error) {
        console.error('Failed to initialize MediaPipe for video:', error);
      }
    };

    const cleanup = initMediaPipe();

    return () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cleanup?.then(fn => fn?.());
    };
  }, [videoElement, canvasElement, isActive, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, []);

  return { detectedHands };
};
