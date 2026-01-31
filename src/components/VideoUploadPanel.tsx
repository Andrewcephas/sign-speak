import { useRef, useCallback, useEffect, useState } from 'react';
import { Upload, Play, Pause, X, FileVideo, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useHandTracking } from '@/hooks/useHandTracking';

interface VideoUploadPanelProps {
  onPrediction: (sign: string, confidence: number) => void;
  predict: (landmarks: { x: number; y: number; z: number }[]) => Promise<{ sign: string; confidence: number } | null>;
  isModelLoaded: boolean;
}

export const VideoUploadPanel = ({ onPrediction, predict, isModelLoaded }: VideoUploadPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  
  const {
    videoUrl,
    isPlaying,
    currentTime,
    duration,
    uploadVideo,
    setVideoRef,
    playVideo,
    pauseVideo,
    seekVideo,
    clearVideo,
    getVideoElement,
  } = useVideoUpload();

  // Hand tracking for uploaded video
  const { detectedHands } = useHandTracking(
    videoElementRef.current,
    canvasElement,
    isPlaying && !!videoUrl
  );

  // Run predictions when hands are detected
  useEffect(() => {
    if (!isPlaying || !isModelLoaded || detectedHands.length === 0) return;

    const runPrediction = async () => {
      const landmarks = detectedHands[0]?.landmarks;
      if (landmarks && landmarks.length === 21) {
        const result = await predict(landmarks);
        if (result && result.confidence > 0.5) {
          onPrediction(result.sign, result.confidence);
        }
      }
    };

    const interval = setInterval(runPrediction, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isModelLoaded, detectedHands, predict, onPrediction]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await uploadVideo(file);
      } catch (error) {
        console.error('Error uploading video:', error);
      }
    }
  }, [uploadVideo]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      try {
        await uploadVideo(file);
      } catch (error) {
        console.error('Error uploading video:', error);
      }
    }
  }, [uploadVideo]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoElementRef.current) {
      setVideoRef(videoElementRef.current);
    }
  }, [videoUrl, setVideoRef]);

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasElement(canvasRef.current);
    }
  }, [videoUrl]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileVideo className="w-5 h-5 text-primary" />
          Video Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!videoUrl ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Drop a sign language video here or click to upload
            </p>
            <p className="text-sm text-muted-foreground/70">
              Supported formats: MP4, WebM, MOV
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Player with Canvas Overlay */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoElementRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              
              {/* Hand detection indicator */}
              {detectedHands.length > 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 text-white text-xs rounded-full animate-pulse">
                  {detectedHands.length} hand{detectedHands.length > 1 ? 's' : ''} detected
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={([value]) => seekVideo(value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => seekVideo(0)}
                variant="secondary"
                size="icon"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={isPlaying ? pauseVideo : playVideo}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Play & Interpret
                  </>
                )}
              </Button>
              
              <Button
                onClick={clearVideo}
                variant="destructive"
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!isModelLoaded && (
              <p className="text-sm text-amber-500 text-center">
                ⚠️ Load the ONNX model in Settings to enable interpretation
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
