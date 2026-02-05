import { useState, useCallback, useRef, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useSpeech } from '@/hooks/useSpeech';
import { useRecording } from '@/hooks/useRecording';
import { useDemoModel } from '@/hooks/useDemoModel';
import { useONNXModel } from '@/hooks/useONNXModel';
import { useIPCamera } from '@/hooks/useIPCamera';
import { CameraView } from '@/components/CameraView';
import { PredictionCard } from '@/components/PredictionCard';
import { TranscriptPanel, TranscriptEntry } from '@/components/TranscriptPanel';
import { ControlPanel } from '@/components/ControlPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { IPCameraModal } from '@/components/IPCameraModal';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { VideoUploadPanel } from '@/components/VideoUploadPanel';
import { Hand, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { toast } = useToast();
  const {
    devices,
    selectedDevice,
    isStreaming,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
  } = useCamera();

  const {
    speak,
    toggleMute,
    changeVoice,
    isMuted,
    voices,
    selectedVoice,
  } = useSpeech();

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const { detectedHands } = useHandTracking(videoRef.current, canvasElement, isStreaming);

  const {
    isRecording,
    hasRecording,
    isUploading,
    startRecording,
    stopRecording,
    downloadRecording,
    uploadRecording,
    fetchRecordings,
  } = useRecording();

  // Fetch recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // ONNX Model
  const {
    isModelLoaded,
    isLoading: isModelLoading,
    error: modelError,
    loadModel,
    predict,
  } = useONNXModel();

  // IP Camera
  const {
    isConnected: isIPCameraConnected,
    isConnecting: isIPCameraConnecting,
    error: ipCameraError,
    connectIPCamera,
    disconnectIPCamera,
  } = useIPCamera();

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIPCameraModalOpen, setIsIPCameraModalOpen] = useState(false);
  const [useRealModel, setUseRealModel] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const containerRef = useRef<HTMLDivElement>(null);

  // Use demo model for predictions (when not using real model)
  const demoPrediction = useDemoModel(isStreaming && !useRealModel, detectedHands.length > 0);

  // Real model prediction state
  const [realPrediction, setRealPrediction] = useState<{ sign: string; confidence: number } | null>(null);

  // Run real model inference when hands are detected
  useEffect(() => {
    if (!useRealModel || !isModelLoaded || !isStreaming || detectedHands.length === 0) {
      setRealPrediction(null);
      return;
    }

    const runInference = async () => {
      // Get landmarks from first detected hand
      const landmarks = detectedHands[0]?.landmarks;
      if (landmarks && landmarks.length === 21) {
        const result = await predict(landmarks);
        if (result) {
          setRealPrediction(result);
        }
      }
    };

    const interval = setInterval(runInference, 500); // Run inference every 500ms
    return () => clearInterval(interval);
  }, [useRealModel, isModelLoaded, isStreaming, detectedHands, predict]);

  // Current prediction (demo or real)
  const currentPrediction = useRealModel ? realPrediction : demoPrediction;

  // Auto-speak predictions and add to transcript
  useEffect(() => {
    if (currentPrediction) {
      // Speak the prediction
      speak(currentPrediction.sign);

      // Add to transcript
      const entry: TranscriptEntry = {
        id: Date.now().toString(),
        text: currentPrediction.sign,
        confidence: currentPrediction.confidence,
        timestamp: new Date(),
      };
      setTranscriptEntries((prev) => [...prev, entry]);
    }
  }, [currentPrediction, speak]);

  // Handler for video upload predictions
  const handleVideoPrediction = useCallback((sign: string, confidence: number) => {
    speak(sign);
    const entry: TranscriptEntry = {
      id: Date.now().toString(),
      text: sign,
      confidence: confidence,
      timestamp: new Date(),
    };
    setTranscriptEntries((prev) => [...prev, entry]);
  }, [speak]);

  const handleLoadModel = useCallback(async () => {
    try {
      await loadModel();
      toast({
        title: 'Model Loaded',
        description: 'ONNX model is ready for inference',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Model Error',
        description: message || 'Failed to load the ONNX model',
        variant: 'destructive',
      });
    }
  }, [loadModel, toast]);

  const handleStart = useCallback(async () => {
    try {
      await startCamera();
      toast({
        title: 'Detection Started',
        description: 'Hand tracking is now active',
      });
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Failed to start camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [startCamera, toast]);

  const handleStop = useCallback(() => {
    stopCamera();
    if (isRecording) {
      stopRecording();
    }
    toast({
      title: 'Detection Stopped',
      description: 'Hand tracking has been stopped',
    });
  }, [stopCamera, isRecording, stopRecording, toast]);

  const handleClearTranscript = useCallback(() => {
    setTranscriptEntries([]);
    toast({
      title: 'Transcript Cleared',
      description: 'All entries have been removed',
    });
  }, [toast]);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording(videoRef.current, canvasElement);
      toast({
        title: 'Recording Started',
        description: 'Session recording is now active',
      });
    } catch (error) {
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording',
        variant: 'destructive',
      });
    }
  }, [startRecording, videoRef, canvasElement, toast]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    toast({
      title: 'Recording Stopped',
      description: 'Session recording has been saved',
    });
  }, [stopRecording, toast]);

  const handleDownloadRecording = useCallback(() => {
    downloadRecording();
    toast({
      title: 'Download Started',
      description: 'Your recording is being downloaded',
    });
  }, [downloadRecording, toast]);

  const handleUploadRecording = useCallback(async () => {
    await uploadRecording();
  }, [uploadRecording]);

  return (
    <>
      <AnimatedBackground />
      <div ref={containerRef} className="relative min-h-screen bg-background text-foreground p-4 md:p-6 z-10">
        {/* Header */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hand className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Sign-to-Speech Interpreter
              </h1>
              <p className="text-muted-foreground">Real-time hand gesture recognition and translation</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scale-in">
          {/* Camera/Video View - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  Live Camera
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4">
                <div className="aspect-video">
                  <CameraView
                    videoRef={videoRef}
                    isStreaming={isStreaming}
                    onCanvasRef={setCanvasElement}
                  />
                </div>

                <ControlPanel
                  isStreaming={isStreaming}
                  isMuted={isMuted}
                  isRecording={isRecording}
                  hasRecording={hasRecording}
                  isUploading={isUploading}
                  onStart={handleStart}
                  onStop={handleStop}
                  onToggleMute={toggleMute}
                  onFullscreen={handleFullscreen}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  onDownloadRecording={handleDownloadRecording}
                  onUploadRecording={handleUploadRecording}
                />

                <PredictionCard 
                  prediction={currentPrediction?.sign || null} 
                  confidence={currentPrediction?.confidence || 0} 
                />
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <VideoUploadPanel
                  onPrediction={handleVideoPrediction}
                  predict={predict}
                  isModelLoaded={isModelLoaded}
                />

                <PredictionCard 
                  prediction={currentPrediction?.sign || null} 
                  confidence={currentPrediction?.confidence || 0} 
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Transcript Panel */}
          <div className="h-[600px] lg:h-auto">
            <TranscriptPanel entries={transcriptEntries} onClear={handleClearTranscript} />
          </div>
        </div>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          cameras={devices}
          selectedCamera={selectedDevice}
          onCameraChange={switchCamera}
          voices={voices}
          selectedVoice={selectedVoice}
          onVoiceChange={changeVoice}
          onOpenIPCamera={() => setIsIPCameraModalOpen(true)}
          isModelLoaded={isModelLoaded}
          isModelLoading={isModelLoading}
          modelError={modelError}
          onLoadModel={handleLoadModel}
          useRealModel={useRealModel}
          onToggleModelMode={setUseRealModel}
        />

        {/* IP Camera Modal */}
        <IPCameraModal
          isOpen={isIPCameraModalOpen}
          onClose={() => setIsIPCameraModalOpen(false)}
          onConnect={connectIPCamera}
          isConnecting={isIPCameraConnecting}
          error={ipCameraError}
        />
      </div>
    </>
  );
};

export default Index;
