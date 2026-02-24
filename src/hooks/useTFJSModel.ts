import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

// The 43 sign phrases this model recognizes
const SIGN_LABELS: string[] = [
  "answer", "break", "change", "book", "agree",
  "careful", "again", "attendance", "chat", "congratulations",
  "home", "how are you", "happy birthday", "file", "email",
  "hungry", "keepsmile", "good morning", "join", "i need help",
  "meet", "practice", "mistake", "pass", "please",
  "open", "opinion", "pressure", "problem", "questions",
  "seat", "remember", "sick", "shift", "thirsty",
  "sun", "together", "this", "stop", "team",
  "where", "wait", "understand", "write",
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

      // Log model info
      console.log('TF.js Model loaded successfully');
      model.summary();
      const inputShape = model.inputs[0].shape;
      console.log('Input shape:', inputShape);
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

  const predict = useCallback(async (
    landmarks: { x: number; y: number; z: number }[]
  ): Promise<ModelPrediction | null> => {
    if (!modelRef.current || landmarks.length !== 21) return null;

    try {
      const model = modelRef.current;
      const inputShape = model.inputs[0].shape; // e.g. [null, 21, 3] or [null, 63]

      let inputTensor: tf.Tensor;

      // Flatten landmarks
      const flat = new Float32Array(63);
      landmarks.forEach((lm, i) => {
        flat[i * 3] = lm.x;
        flat[i * 3 + 1] = lm.y;
        flat[i * 3 + 2] = lm.z;
      });

      // Try to match the model's expected input shape
      if (inputShape.length === 3) {
        // [batch, 21, 3]
        inputTensor = tf.tensor3d([Array.from({ length: 21 }, (_, i) => [
          landmarks[i].x, landmarks[i].y, landmarks[i].z
        ])]);
      } else {
        // [batch, 63]
        inputTensor = tf.tensor2d([Array.from(flat)]);
      }

      const output = model.predict(inputTensor) as tf.Tensor;
      const probabilities = await output.data();

      // Cleanup tensors
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

      // Apply softmax if logits
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

  return { isModelLoaded, isLoading, error, loadModel, predict };
};
