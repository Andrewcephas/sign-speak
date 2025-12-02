import { useState, useCallback, useRef, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useSpeech } from '@/hooks/useSpeech';
import { useRecording } from '@/hooks/useRecording';
import { useDemoModel } from '@/hooks/useDemoModel';
import { CameraView } from '@/components/CameraView';
import { PredictionCard } from '@/components/PredictionCard';
import { TranscriptPanel, TranscriptEntry } from '@/components/TranscriptPanel';
import { ControlPanel } from '@/components/ControlPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AnimatedBackground } from '@/components/AnimatedBackground';
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

  const {
    isRecording,
    hasRecording,
    startRecording,
    stopRecording,
    downloadRecording,
  } = useRecording();

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use demo model for predictions
  const demoPrediction = useDemoModel(isStreaming, detectedHands.length > 0);

  // Auto-speak predictions and add to transcript
  useEffect(() => {
    if (demoPrediction) {
      // Speak the prediction
      speak(demoPrediction.sign);

      // Add to transcript
      const entry: TranscriptEntry = {
        id: Date.now().toString(),
        text: demoPrediction.sign,
        confidence: demoPrediction.confidence,
        timestamp: new Date(),
      };
      setTranscriptEntries((prev) => [...prev, entry]);
    }
  }, [demoPrediction, speak]);

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
              isRecording={isRecording}
              hasRecording={hasRecording}
              onStart={handleStart}
              onStop={handleStop}
              onToggleMute={toggleMute}
              onFullscreen={handleFullscreen}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onDownloadRecording={handleDownloadRecording}
            />

            <PredictionCard 
              prediction={demoPrediction?.sign || null} 
              confidence={demoPrediction?.confidence || 0} 
            />
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
    </>
  );
};

export default Index;
