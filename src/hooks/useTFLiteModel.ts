import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tflite from '@tensorflow/tfjs-tflite';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

interface ClassMapping {
  [key: string]: string;
}

export const useTFLiteModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classMapping, setClassMapping] = useState<ClassMapping>({});
  
  const modelRef = useRef<tflite.TFLiteModel | null>(null);

  // Load class mapping from id_to_class.json
  const loadClassMapping = useCallback(async (mappingPath: string = '/models/id_to_class.json') => {
    try {
      const response = await fetch(mappingPath);
      if (!response.ok) {
        console.warn('id_to_class.json not found, using default labels');
        return {};
      }
      const mapping = await response.json();
      console.log('Loaded class mapping:', Object.keys(mapping).length, 'classes');
      return mapping;
    } catch (err) {
      console.warn('Failed to load class mapping:', err);
      return {};
    }
  }, []);

  // Load TFLite model
  const loadModel = useCallback(async (
    modelPath: string = '/models/sign_pose_model.tflite',
    mappingPath: string = '/models/id_to_class.json'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if model file exists
      const modelCheck = await fetch(modelPath, { method: 'HEAD' });
      if (!modelCheck.ok) {
        throw new Error(`TFLite model not found at ${modelPath}. Please upload sign_pose_model.tflite to public/models/`);
      }

      console.log('Loading TFLite model from:', modelPath);
      
      // Set WASM path for TFLite
      tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/');
      
      // Load the TFLite model
      const model = await tflite.loadTFLiteModel(modelPath);
      modelRef.current = model;
      
      // Load class mapping
      const mapping = await loadClassMapping(mappingPath);
      setClassMapping(mapping);
      
      console.log('TFLite model loaded successfully');
      console.log('Model inputs:', model.inputs);
      console.log('Model outputs:', model.outputs);
      
      setIsModelLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load TFLite model: ${errorMessage}`);
      console.error('Error loading TFLite model:', errorMessage);
      setIsModelLoaded(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadClassMapping]);

  // Preprocess landmarks for model input
  const preprocessLandmarks = useCallback((landmarks: { x: number; y: number; z: number }[]): Float32Array => {
    // Flatten landmarks: 21 points * 3 coordinates = 63 features
    const features = new Float32Array(63);
    
    landmarks.forEach((landmark, i) => {
      features[i * 3] = landmark.x;
      features[i * 3 + 1] = landmark.y;
      features[i * 3 + 2] = landmark.z;
    });

    return features;
  }, []);

  // Run inference
  const predict = useCallback(async (
    landmarks: { x: number; y: number; z: number }[]
  ): Promise<ModelPrediction | null> => {
    if (!modelRef.current || landmarks.length !== 21) {
      return null;
    }

    try {
      const inputData = preprocessLandmarks(landmarks);
      
      // Create input tensor - try different shapes
      let outputTensor: tf.Tensor;
      
      try {
        // Try [1, 63] shape first (flattened)
        const inputTensor = tf.tensor2d(inputData, [1, 63]);
        outputTensor = modelRef.current.predict(inputTensor) as tf.Tensor;
        inputTensor.dispose();
      } catch {
        try {
          // Try [1, 21, 3] shape (structured)
          const inputTensor = tf.tensor3d(Array.from(inputData), [1, 21, 3]);
          outputTensor = modelRef.current.predict(inputTensor) as tf.Tensor;
          inputTensor.dispose();
        } catch {
          // Try [1, 1, 63] shape
          const inputTensor = tf.tensor3d(Array.from(inputData), [1, 1, 63]);
          outputTensor = modelRef.current.predict(inputTensor) as tf.Tensor;
          inputTensor.dispose();
        }
      }

      const output = await outputTensor.data() as Float32Array;
      outputTensor.dispose();

      if (!output || output.length === 0) {
        return null;
      }

      // Find max probability
      let maxIndex = 0;
      let maxProb = output[0];
      
      for (let i = 1; i < output.length; i++) {
        if (output[i] > maxProb) {
          maxProb = output[i];
          maxIndex = i;
        }
      }

      // Apply softmax if needed (output might be logits)
      let confidence = maxProb;
      if (maxProb > 1 || maxProb < 0) {
        const expValues = Array.from(output).map(v => Math.exp(v - maxProb));
        const sumExp = expValues.reduce((a, b) => a + b, 0);
        confidence = expValues[maxIndex] / sumExp;
      }

      // Get label from mapping or use index
      const sign = classMapping[String(maxIndex)] || `Sign ${maxIndex}`;

      return {
        sign,
        confidence: Math.min(confidence, 1.0),
      };
    } catch (err) {
      console.error('TFLite inference error:', err);
      return null;
    }
  }, [preprocessLandmarks, classMapping]);

  // Cleanup - TFLite models don't have a dispose method
  useEffect(() => {
    return () => {
      modelRef.current = null;
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
