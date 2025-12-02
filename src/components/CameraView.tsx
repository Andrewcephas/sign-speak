import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

export const CameraView = ({ videoRef, isStreaming, onCanvasRef }: CameraViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      onCanvasRef(canvasRef.current);
    }
  }, [onCanvasRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && isStreaming) {
      const updateCanvasSize = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };

      video.addEventListener('loadedmetadata', updateCanvasSize);
      
      return () => {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
      };
    }
  }, [videoRef, isStreaming]);

  return (
    <div className="relative w-full h-full bg-secondary rounded-lg overflow-hidden shadow-card">
      {!isStreaming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Camera className="w-16 h-16 opacity-50" />
          <p className="text-lg">Camera not active</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      
      {isStreaming && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive/90 backdrop-blur-sm rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}
    </div>
  );
};
