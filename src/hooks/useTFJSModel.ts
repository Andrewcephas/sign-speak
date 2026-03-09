import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

// The 44 sign phrases this model recognizes (must match training order)
const SIGN_LABELS: string[] = [
  "again", "agree", "answer", "attendance", "book",
  "break", "careful", "change", "chat", "congratulations",
  "email", "file", "good morning", "happy birthday", "home",
  "how are you", "hungry", "i need help", "join", "keepsmile",
  "meet", "mistake", "open", "opinion", "pass",
  "please", "practice", "pressure", "problem", "questions",
  "remember", "seat", "shift", "sick", "stop",
  "sun", "team", "thirsty", "this", "together",
  "understand", "wait", "where", "write",
];

export const useTFJSModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<tf.LayersModel | null>(null);

  const loadModel = useCallback(async (modelPath: string = '/models/model.json') => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading TF.js LayersModel from:', modelPath);
      const model = await tf.loadLayersModel(modelPath);
      modelRef.current = model;

      console.log('TF.js Model loaded successfully');
      model.summary();
      console.log('Input shape:', model.inputs[0].shape);
      console.log('Output shape:', model.outputs[0].shape);
      console.log('Labels count:', SIGN_LABELS.length);

      setIsModelLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load TF.js model: ${msg}`);
      console.error('Error loading TF.js model:', msg);
      setIsModelLoaded(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Predict from a video/canvas element by capturing a frame,
   * resizing to 128x128, and running through the CNN.
   */
  const predictFromFrame = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement
  ): Promise<ModelPrediction | null> => {
    if (!modelRef.current) return null;

    try {
      const model = modelRef.current;

      // Capture frame, resize to 128x128, normalize to [0,1]
      const inputTensor = tf.tidy(() => {
        const frame = tf.browser.fromPixels(source);
        const resized = tf.image.resizeBilinear(frame, [128, 128]);
        const normalized = resized.div(255.0);
        return normalized.expandDims(0); // [1, 128, 128, 3]
      });

      const output = model.predict(inputTensor) as tf.Tensor;
      const probabilities = await output.data();

      // Cleanup
      inputTensor.dispose();
      output.dispose();

      // Find best class
      let maxIdx = 0;
      let maxProb = probabilities[0];
      for (let i = 1; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIdx = i;
        }
      }

      // Apply softmax if raw logits
      let confidence = maxProb;
      if (maxProb > 1 || maxProb < 0) {
        const shifted = Array.from(probabilities).map(v => Math.exp(v - maxProb));
        const sum = shifted.reduce((a, b) => a + b, 0);
        confidence = shifted[maxIdx] / sum;
      }

      const label = maxIdx < SIGN_LABELS.length ? SIGN_LABELS[maxIdx] : `Sign ${maxIdx}`;

      return {
        sign: label,
        confidence: Math.min(confidence, 1.0),
      };
    } catch (err) {
      console.error('TF.js inference error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  return { isModelLoaded, isLoading, error, loadModel, predictFromFrame };
};
