import { useRef, useEffect, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  handedness: 'Left' | 'Right';
}

export const useHandTracking = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
  isActive: boolean
) => {
  const [detectedHands, setDetectedHands] = useState<HandLandmarks[]>([]);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!videoElement || !canvasElement || !isActive) {
      return;
    }

    // Initialize MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: Results) => {
      const canvasCtx = canvasElement.getContext('2d');
      if (!canvasCtx) return;

      // Clear canvas
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Draw hand landmarks
      if (results.multiHandLandmarks && results.multiHandedness) {
        const hands: HandLandmarks[] = [];

        results.multiHandLandmarks.forEach((landmarks, idx) => {
          const handedness = results.multiHandedness[idx].label as 'Left' | 'Right';
          
          hands.push({
            landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z })),
            handedness,
          });

          // Draw connections
          drawConnectors(canvasCtx, landmarks, canvasElement.width, canvasElement.height);
          
          // Draw landmarks
          drawLandmarks(canvasCtx, landmarks, canvasElement.width, canvasElement.height, handedness);
        });

        setDetectedHands(hands);
      } else {
        setDetectedHands([]);
      }

      canvasCtx.restore();
    });

    handsRef.current = hands;

    // Initialize camera
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: videoElement });
        }
      },
      width: 1280,
      height: 720,
    });

    camera.start();
    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [videoElement, canvasElement, isActive]);

  return { detectedHands };
};

// Helper function to draw connections
const drawConnectors = (
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number
) => {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17], // Palm
  ];

  ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  connections.forEach(([start, end]) => {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];
    
    ctx.beginPath();
    ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
    ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
    ctx.stroke();
  });
};

// Helper function to draw landmarks
const drawLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number,
  handedness: 'Left' | 'Right'
) => {
  const color = handedness === 'Left' ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 255, 0.8)';
  
  landmarks.forEach((landmark, idx) => {
    ctx.beginPath();
    ctx.arc(
      landmark.x * width,
      landmark.y * height,
      idx === 0 || idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20 ? 8 : 5,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
};
