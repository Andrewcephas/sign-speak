import { useState, useEffect, useCallback, useRef } from 'react';

export interface Prediction {
  sign: string;
  confidence: number;
}

const DEMO_SIGNS = [
  { sign: 'Hello', confidence: 0.95 },
  { sign: 'Thank You', confidence: 0.92 },
  { sign: 'Yes', confidence: 0.88 },
  { sign: 'No', confidence: 0.85 },
  { sign: 'Please', confidence: 0.91 },
  { sign: 'Sorry', confidence: 0.87 },
  { sign: 'Help', confidence: 0.93 },
  { sign: 'Good Morning', confidence: 0.89 },
  { sign: 'How Are You', confidence: 0.86 },
  { sign: 'Goodbye', confidence: 0.94 },
];

export const useDemoModel = (isActive: boolean, hasHands: boolean) => {
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  const cyclePredictions = useCallback(() => {
    if (!isActive || !hasHands) {
      setCurrentPrediction(null);
      return;
    }

    const prediction = DEMO_SIGNS[indexRef.current];
    setCurrentPrediction(prediction);
    
    indexRef.current = (indexRef.current + 1) % DEMO_SIGNS.length;
  }, [isActive, hasHands]);

  useEffect(() => {
    if (isActive && hasHands) {
      // Start with first prediction immediately
      cyclePredictions();
      
      // Then cycle every 3 seconds
      intervalRef.current = setInterval(cyclePredictions, 3000);
    } else {
      setCurrentPrediction(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, hasHands, cyclePredictions]);

  return currentPrediction;
};
