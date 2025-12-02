import { useState, useCallback, useRef, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useSpeech } from '@/hooks/useSpeech';
import { CameraView } from '@/components/CameraView';
import { PredictionCard } from '@/components/PredictionCard';
import { TranscriptPanel, TranscriptEntry } from '@/components/TranscriptPanel';
import { ControlPanel } from '@/components/ControlPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Hand } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const [currentPrediction, setCurrentPrediction] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock prediction system (replace with actual model inference)
  useEffect(() => {
    if (detectedHands.length > 0 && isStreaming) {
      // This is a mock - replace with actual model inference
      const mockSigns = ['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Sorry'];
      const randomSign = mockSigns[Math.floor(Math.random() * mockSigns.length)];
      const randomConfidence = 0.6 + Math.random() * 0.4; // 60-100%

      setCurrentPrediction(randomSign);
      setCurrentConfidence(randomConfidence);

      // Auto-speak prediction after a short delay
      const speakTimeout = setTimeout(() => {
        speak(randomSign);
      }, 500);

      // Add to transcript
      const addToTranscript = setTimeout(() => {
        const entry: TranscriptEntry = {
          id: Date.now().toString(),
          text: randomSign,
          confidence: randomConfidence,
          timestamp: new Date(),
        };
        setTranscriptEntries((prev) => [...prev, entry]);
      }, 1000);

      return () => {
        clearTimeout(speakTimeout);
        clearTimeout(addToTranscript);
      };
    } else {
      setCurrentPrediction(null);
      setCurrentConfidence(0);
    }
  }, [detectedHands, isStreaming]);

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
    setCurrentPrediction(null);
    setCurrentConfidence(0);
    toast({
      title: 'Detection Stopped',
      description: 'Hand tracking has been stopped',
    });
  }, [stopCamera, toast]);

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

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera View - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
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
            onStart={handleStart}
            onStop={handleStop}
            onToggleMute={toggleMute}
            onFullscreen={handleFullscreen}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <PredictionCard prediction={currentPrediction} confidence={currentConfidence} />
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
      />
    </div>
  );
};

export default Index;
