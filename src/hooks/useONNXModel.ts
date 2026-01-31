import { useState, useEffect, useRef, useCallback } from 'react';
// Use WASM-only build to avoid WebGL/WebGPU backend negotiation issues.
import * as ort from 'onnxruntime-web/wasm';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

// Sign labels - update these to match your model's output classes
// Sign labels - these should match your model's output classes
// Update this array to match the exact labels your model was trained on
const SIGN_LABELS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  'Hello', 'Thank You', 'Yes', 'No', 'Please',
  'Sorry', 'Help', 'I Love You', 'Goodbye',
];

export const useONNXModel = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<ort.InferenceSession | null>(null);

  // Load the ONNX model
  const loadModel = useCallback(async (modelPath: string = '/models/sign_language_model.onnx') => {
    setIsLoading(true);
    setError(null);

    try {
      // IMPORTANT:
      // Your preview environment can block remote *module* loads (dynamic import), which ORT uses for its runtime .mjs.
      // So we serve the runtime .mjs from this app (/ort/...) and only fetch the .wasm binary from the CDN.
      // This fixes: "no available backend found" + "Failed to fetch dynamically imported module ...ort-wasm-*.mjs".

      const localBase = new URL('/ort/', window.location.href).toString();
      const cdnBase = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';

      const runtimeCandidates: Array<{ mjs: string; wasm: string }> = [
        {
          mjs: `${localBase}ort-wasm-simd-threaded.jsep.mjs`,
          wasm: `${cdnBase}ort-wasm-simd-threaded.jsep.wasm`,
        },
        {
          mjs: `${localBase}ort-wasm-simd-threaded.mjs`,
          wasm: `${cdnBase}ort-wasm-simd-threaded.wasm`,
        },
      ];

      // Force single-threaded mode (no worker thread) for maximum compatibility.
      ort.env.wasm.numThreads = 1;

      // Ensure execution happens on main thread (default false, but we set explicitly).
      ort.env.wasm.proxy = false;

      let lastErr: unknown = null;
      let session: ort.InferenceSession | null = null;
      for (const candidate of runtimeCandidates) {
        try {
          ort.env.wasm.wasmPaths = candidate;
          session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'basic',
          });
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!session) {
        throw lastErr instanceof Error ? lastErr : new Error('Failed to initialize ONNX Runtime WASM backend');
      }

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
