import { useState, useRef, useCallback, useEffect } from 'react';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

interface ClassMapping {
  [key: string]: string;
}

// Load TFLite runtime from CDN (avoids bundling massive WASM deps)
const loadTFLiteRuntime = async (): Promise<void> => {
  if ((window as any).__tfliteReady) return;

  const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });

  // Load TensorFlow.js core + tflite from CDN
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.9.0/dist/tf.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js');

  (window as any).__tfliteReady = true;
};

export const useTFLiteModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classMapping, setClassMapping] = useState<ClassMapping>({});

  const modelRef = useRef<any>(null);

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
      // Check if model file exists
      const modelCheck = await fetch(modelPath, { method: 'HEAD' });
      if (!modelCheck.ok) {
        throw new Error(`TFLite model not found at ${modelPath}. Please upload sign_pose_model.tflite to public/models/`);
      }

      console.log('Loading TFLite runtime from CDN...');
      await loadTFLiteRuntime();

      const win = window as any;
      const tflite = win.tflite;

      if (!tflite || !tflite.loadTFLiteModel) {
        throw new Error('TFLite runtime failed to load from CDN');
      }

      // Set WASM path
      tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/');

      console.log('Loading TFLite model from:', modelPath);
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

  const predict = useCallback(async (
    landmarks: { x: number; y: number; z: number }[]
  ): Promise<ModelPrediction | null> => {
    if (!modelRef.current || landmarks.length !== 21) {
      return null;
    }

    try {
      const tf = (window as any).tf;
      if (!tf) return null;

      // Flatten landmarks: 21 points * 3 coordinates = 63 features
      const features = new Float32Array(63);
      landmarks.forEach((landmark, i) => {
        features[i * 3] = landmark.x;
        features[i * 3 + 1] = landmark.y;
        features[i * 3 + 2] = landmark.z;
      });

      let outputTensor: any;

      try {
        const inputTensor = tf.tensor2d(features, [1, 63]);
        outputTensor = modelRef.current.predict(inputTensor);
        inputTensor.dispose();
      } catch {
        try {
          const inputTensor = tf.tensor3d(Array.from(features), [1, 21, 3]);
          outputTensor = modelRef.current.predict(inputTensor);
          inputTensor.dispose();
        } catch {
          const inputTensor = tf.tensor3d(Array.from(features), [1, 1, 63]);
          outputTensor = modelRef.current.predict(inputTensor);
          inputTensor.dispose();
        }
      }

      const output = await outputTensor.data();
      outputTensor.dispose();

      if (!output || output.length === 0) {
        return null;
      }

      let maxIndex = 0;
      let maxProb = output[0];

      for (let i = 1; i < output.length; i++) {
        if (output[i] > maxProb) {
          maxProb = output[i];
          maxIndex = i;
        }
      }

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
      console.error('TFLite inference error:', err);
      return null;
    }
  }, [classMapping]);

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
