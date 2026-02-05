import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

export interface ModelPrediction {
  sign: string;
  confidence: number;
}

// Sign labels - update these to match your model's output classes
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
  const inputShapeRef = useRef<readonly number[] | null>(null);

  const buildExternalDataConfig = useCallback((modelPath: string) => {
    // Common convention when using ONNX external data: model file is `X.onnx` and data file is `X.onnx.data`.
    const modelFileName = modelPath.split('/').pop() || 'model.onnx';
    const externalDataFileName = `${modelFileName}.data`; // => sign_language_model.onnx.data
    const externalDataUrl = `${modelPath}.data`; // => /models/sign_language_model.onnx.data

    // NOTE: Some exporters store the external data path with or without "./". Provide both.
    return {
      externalDataUrl,
      externalData: [
        { path: externalDataFileName, data: externalDataUrl },
        { path: `./${externalDataFileName}`, data: externalDataUrl },
      ],
    };
  }, []);

  const isExternalDataError = (message: string) =>
    /external data file/i.test(message) || /MountedFiles/i.test(message);

  // Load the ONNX model
  const loadModel = useCallback(async (modelPath: string = '/models/sign_language_model.onnx') => {
    setIsLoading(true);
    setError(null);

    try {
      // Configure ONNX Runtime for maximum compatibility
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      
       // Use CDN for WASM files - matching the installed package version (1.23.2)
       ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';

      console.log('ONNX Runtime configured, loading model from:', modelPath);

       // Create inference session with WASM backend only.
       // IMPORTANT: onnxruntime-web does NOT reliably auto-load external data (.onnx.data) from URL.
       // If the model was exported with external weights, we must pass `externalData` explicitly.
       let session: ort.InferenceSession;
       try {
         session = await ort.InferenceSession.create(modelPath, {
           executionProviders: ['wasm'],
           graphOptimizationLevel: 'disabled',
         });
       } catch (e) {
         const msg = e instanceof Error ? e.message : String(e);
         if (!isExternalDataError(msg)) {
           throw e;
         }

         const { externalData, externalDataUrl } = buildExternalDataConfig(modelPath);

         // Best-effort sanity check (non-fatal except for definitive 404/403).
         try {
           const head = await fetch(externalDataUrl, { method: 'HEAD' });
           if (head.status === 404 || head.status === 403) {
             throw new Error(`External weights file is not reachable (HTTP ${head.status}) at ${externalDataUrl}`);
           }
         } catch (fetchErr) {
           const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
           if (/HTTP\s*404|HTTP\s*403/.test(fetchMsg)) {
             throw new Error(
               `Model requires external weights, but the weights file is missing or blocked: ${fetchMsg}. ` +
                 `Ensure "/public/models/${modelPath.split('/').pop()}.data" exists and is reachable at "${externalDataUrl}".`,
             );
           }
           console.warn('Could not verify external weights via HEAD; continuing anyway:', fetchErr);
         }

         // Retry with externalData explicitly provided.
         // (The API supports this option even though older type defs may not include it.)
         session = await ort.InferenceSession.create(modelPath, {
           executionProviders: ['wasm'],
           graphOptimizationLevel: 'disabled',
           externalData,
         } as any);
       }

      sessionRef.current = session;
      
      // Log model info for debugging
      console.log('ONNX Model loaded successfully');
      console.log('Input names:', session.inputNames);
      console.log('Output names:', session.outputNames);
      
      // Get input shape from model metadata
      const inputMeta = session.inputNames[0];
      const inputInfo = session.inputNames.length > 0 ? inputMeta : null;
      console.log('Input metadata:', inputInfo);
      
      // Try to extract expected input shape
      // For transformer models, often [batch, seq_len, features] or [batch, features]
      inputShapeRef.current = null; // Will be determined dynamically
      
      setIsModelLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load model: ${errorMessage}`);
       console.error('Error loading ONNX model:', errorMessage);
      setIsModelLoaded(false);

      // Let callers (UI) show an accurate toast instead of always reporting success.
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [buildExternalDataConfig]);

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
      
      // Get the input name from the model
      const inputName = sessionRef.current.inputNames[0];
      
      // Try different input shapes based on common model architectures
      // Shape 1: [batch, seq_len, features] = [1, 21, 3] - For transformer/sequence models
      // Shape 2: [batch, features] = [1, 63] - For MLP/dense models
      
      let inputTensor: ort.Tensor;
      let feeds: Record<string, ort.Tensor>;
      
      // First try [1, 21, 3] for transformer models
      try {
        const reshapedData = new Float32Array(63);
        landmarks.forEach((landmark, i) => {
          reshapedData[i * 3] = landmark.x;
          reshapedData[i * 3 + 1] = landmark.y;
          reshapedData[i * 3 + 2] = landmark.z;
        });
        
        inputTensor = new ort.Tensor('float32', reshapedData, [1, 21, 3]);
        feeds = { [inputName]: inputTensor };
        
        const results = await sessionRef.current.run(feeds);
        return processResults(results, sessionRef.current.outputNames[0]);
      } catch (shapeError) {
        console.log('Shape [1, 21, 3] failed, trying [1, 63]...');
      }
      
      // Try [1, 63] for flattened input
      try {
        inputTensor = new ort.Tensor('float32', inputData, [1, 63]);
        feeds = { [inputName]: inputTensor };
        
        const results = await sessionRef.current.run(feeds);
        return processResults(results, sessionRef.current.outputNames[0]);
      } catch (shapeError2) {
        console.log('Shape [1, 63] failed, trying [1, 1, 63]...');
      }
      
      // Try [1, 1, 63] as sequence of one frame
      try {
        inputTensor = new ort.Tensor('float32', inputData, [1, 1, 63]);
        feeds = { [inputName]: inputTensor };
        
        const results = await sessionRef.current.run(feeds);
        return processResults(results, sessionRef.current.outputNames[0]);
      } catch (shapeError3) {
        console.error('All input shapes failed');
        return null;
      }
      
    } catch (err) {
      console.error('Inference error:', err);
      return null;
    }
  }, [preprocessLandmarks]);

  // Process model results
  const processResults = (results: ort.InferenceSession.OnnxValueMapType, outputName: string): ModelPrediction | null => {
    const output = results[outputName];
    if (!output) return null;
    
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

    // Apply softmax normalization if output seems like logits
    let confidence = maxProb;
    if (maxProb > 1 || maxProb < 0) {
      // Output is logits, apply softmax
      const expValues = Array.from(probabilities).map(v => Math.exp(v - maxProb));
      const sumExp = expValues.reduce((a, b) => a + b, 0);
      confidence = expValues[maxIndex] / sumExp;
    }

    return {
      sign: SIGN_LABELS[maxIndex] || `Sign ${maxIndex}`,
      confidence: Math.min(confidence, 1.0),
    };
  };

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
