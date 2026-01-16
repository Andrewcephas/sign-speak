import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

// Sign labels - update these to match your model's output classes
const SIGN_LABELS = [
  'Hello',
  'Thank You',
  'Yes',
  'No',
  'Please',
  'Sorry',
  'Help',
  'Good Morning',
  'How Are You',
  'Goodbye',
  'I Love You',
  'Nice to Meet You',
  'What',
  'Where',
  'When',
  'Why',
  'Who',
  'How',
  'Good',
  'Bad',
];

export const useONNXModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<ort.InferenceSession | null>(null);

  // Load the ONNX model
  const loadModel = useCallback(async (modelPath: string = '/models/sign_model_best.onnx') => {
    setIsLoading(true);
    setError(null);

    try {
      // Configure ONNX Runtime
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';
      
      // Create inference session
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['webgl', 'wasm'],
        graphOptimizationLevel: 'all',
      });

      sessionRef.current = session;
      setIsModelLoaded(true);
      console.log('ONNX Model loaded successfully');
      console.log('Input names:', session.inputNames);
      console.log('Output names:', session.outputNames);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model';
      setError(errorMessage);
      console.error('Error loading ONNX model:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Preprocess hand landmarks for model input
  const preprocessLandmarks = useCallback((landmarks: { x: number; y: number; z: number }[]): Float32Array => {
    // Flatten landmarks to a 1D array [x1, y1, z1, x2, y2, z2, ...]
    // 21 landmarks * 3 coordinates = 63 features
    const features = new Float32Array(63);
    
    landmarks.forEach((landmark, i) => {
      features[i * 3] = landmark.x;
      features[i * 3 + 1] = landmark.y;
      features[i * 3 + 2] = landmark.z;
    });

    return features;
  }, []);

  // Run inference on hand landmarks
  const predict = useCallback(async (
    landmarks: { x: number; y: number; z: number }[]
  ): Promise<ModelPrediction | null> => {
    if (!sessionRef.current || landmarks.length !== 21) {
      return null;
    }

    try {
      // Preprocess input
      const inputData = preprocessLandmarks(landmarks);
      
      // Create input tensor - adjust shape based on your model
      // Common shapes: [1, 63] for flattened landmarks or [1, 21, 3] for 2D
      const inputTensor = new ort.Tensor('float32', inputData, [1, 63]);

      // Get input name from the model
      const inputName = sessionRef.current.inputNames[0];
      const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

      // Run inference
      const results = await sessionRef.current.run(feeds);
      
      // Get output - adjust based on your model's output name
      const outputName = sessionRef.current.outputNames[0];
      const output = results[outputName];
      const probabilities = output.data as Float32Array;

      // Find the class with highest probability
      let maxIndex = 0;
      let maxProb = probabilities[0];
      
      for (let i = 1; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIndex = i;
        }
      }

      // Apply softmax if needed (if output is logits, not probabilities)
      const confidence = Math.min(maxProb, 1.0);

      return {
        sign: SIGN_LABELS[maxIndex] || `Sign ${maxIndex}`,
        confidence: confidence,
      };
    } catch (err) {
      console.error('Inference error:', err);
      return null;
    }
  }, [preprocessLandmarks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.release();
      }
    };
  }, []);

  return {
    isModelLoaded,
    isLoading,
    error,
    loadModel,
    predict,
  };
};
