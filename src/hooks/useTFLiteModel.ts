import { useState, useRef, useCallback, useEffect } from 'react';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

interface ClassMapping {
  [key: string]: string;
}

// Use alpha.10 with proper WASM init to support newer model ops (CAST v5, etc.)
const TFLITE_VERSION = '0.0.1-alpha.10';
const TFJS_VERSION = '4.22.0';

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
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });

let runtimeLoading: Promise<void> | null = null;

const loadTFLiteRuntime = (): Promise<void> => {
  if ((window as any).tflite?.loadTFLiteModel) {
    return Promise.resolve();
  }
  if (runtimeLoading) return runtimeLoading;

  runtimeLoading = (async () => {
    // Load tfjs core first, then tflite (order matters)
    await loadScript(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${TFJS_VERSION}/dist/tf.min.js`);
    
    // Set WASM path BEFORE loading tflite to prevent _malloc errors
    const win = window as any;
    if (win.tflite?.setWasmPath) {
      win.tflite.setWasmPath(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@${TFLITE_VERSION}/dist/`);
    }
    
    await loadScript(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@${TFLITE_VERSION}/dist/tf-tflite.min.js`);

    // Set WASM path again AFTER tflite script loaded (in case it wasn't available before)
    if (win.tflite?.setWasmPath) {
      win.tflite.setWasmPath(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@${TFLITE_VERSION}/dist/`);
    }
  })();

  return runtimeLoading;
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
      const modelCheck = await fetch(modelPath, { method: 'HEAD' });
      if (!modelCheck.ok) {
        throw new Error(`TFLite model not found at ${modelPath}. Please upload sign_pose_model.tflite to public/models/`);
      }

      console.log('Loading TFLite runtime from CDN (v' + TFLITE_VERSION + ')...');
      await loadTFLiteRuntime();

      const win = window as any;
      if (!win.tflite?.loadTFLiteModel) {
        throw new Error('TFLite runtime failed to initialize. Try refreshing the page.');
      }

      console.log('Loading TFLite model from:', modelPath);
      const model = await win.tflite.loadTFLiteModel(modelPath);
      modelRef.current = model;

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

      if (!output || output.length === 0) return null;

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
