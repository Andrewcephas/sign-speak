import { useState, useRef, useCallback, useEffect } from 'react';
import { loadLiteRt, loadAndCompile, Tensor, type CompiledModel } from '@litertjs/core';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

interface ClassMapping {
  [key: string]: string;
}

let runtimeLoaded = false;
let runtimeLoading: Promise<void> | null = null;

const ensureRuntimeLoaded = (): Promise<void> => {
  if (runtimeLoaded) return Promise.resolve();
  if (runtimeLoading) return runtimeLoading;

  runtimeLoading = (async () => {
    console.log('Loading LiteRT.js WASM runtime from CDN...');
    // Use jsDelivr CDN to serve the WASM files
    await loadLiteRt('https://cdn.jsdelivr.net/npm/@litertjs/core@2.0.0/wasm/');
    runtimeLoaded = true;
    console.log('LiteRT.js runtime loaded successfully');
  })();

  return runtimeLoading;
};

export const useTFLiteModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classMapping, setClassMapping] = useState<ClassMapping>({});

  const modelRef = useRef<CompiledModel | null>(null);

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

  const loadModel = useCallback(async (
    modelPath: string = '/models/sign_pose_model.tflite',
    mappingPath: string = '/models/id_to_class.json'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const modelCheck = await fetch(modelPath, { method: 'HEAD' });
      if (!modelCheck.ok) {
        throw new Error(`TFLite model not found at ${modelPath}. Please upload sign_pose_model.tflite to public/models/`);
      }

      await ensureRuntimeLoaded();

      console.log('Loading TFLite model from:', modelPath);
      const model = await loadAndCompile(modelPath, { accelerator: 'wasm' });
      modelRef.current = model;

      const mapping = await loadClassMapping(mappingPath);
      setClassMapping(mapping);

      // Log model info
      const inputDetails = model.getInputDetails();
      const outputDetails = model.getOutputDetails();
      console.log('LiteRT model loaded successfully');
      console.log('Inputs:', inputDetails.map(d => ({ name: d.name, shape: Array.from(d.shape), dtype: d.dtype })));
      console.log('Outputs:', outputDetails.map(d => ({ name: d.name, shape: Array.from(d.shape), dtype: d.dtype })));

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

  const predict = useCallback(async (
    landmarks: { x: number; y: number; z: number }[]
  ): Promise<ModelPrediction | null> => {
    if (!modelRef.current || landmarks.length !== 21) {
      return null;
    }

    try {
      const features = new Float32Array(63);
      landmarks.forEach((landmark, i) => {
        features[i * 3] = landmark.x;
        features[i * 3 + 1] = landmark.y;
        features[i * 3 + 2] = landmark.z;
      });

      // Determine correct input shape from model
      const inputDetails = modelRef.current.getInputDetails();
      const inputShape = inputDetails[0]?.shape ? Array.from(inputDetails[0].shape) : [1, 63];
      console.log('Using input shape:', inputShape);

      const inputTensor = new Tensor(features, inputShape);
      const outputs = await modelRef.current.run(inputTensor);
      inputTensor.delete();

      const outputTensor = outputs[0];
      const output = outputTensor.toTypedArray();
      outputTensor.delete();

      if (!output || output.length === 0) return null;

      let maxIndex = 0;
      let maxProb = output[0];
      for (let i = 1; i < output.length; i++) {
        if (output[i] > maxProb) {
          maxProb = output[i];
          maxIndex = i;
        }
      }

      // Apply softmax if output isn't already probabilities
      let confidence = maxProb;
      if (maxProb > 1 || maxProb < 0) {
        const expValues = Array.from(output as Float32Array).map((v: number) => Math.exp(v - maxProb));
        const sumExp = expValues.reduce((a: number, b: number) => a + b, 0);
        confidence = expValues[maxIndex] / sumExp;
      }

      const sign = classMapping[String(maxIndex)] || `Sign ${maxIndex}`;

      return {
        sign,
        confidence: Math.min(confidence, 1.0),
      };
    } catch (err) {
      console.error('LiteRT inference error:', err);
      return null;
    }
  }, [classMapping]);

  useEffect(() => {
    return () => {
      if (modelRef.current && !modelRef.current.deleted) {
        modelRef.current.delete();
      }
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
