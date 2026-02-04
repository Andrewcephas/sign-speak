import { Play, Square, Volume2, VolumeX, Maximize, Settings, Video, Download, CloudUpload, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface ControlPanelProps {
  isStreaming: boolean;
  isMuted: boolean;
  isRecording: boolean;
  hasRecording: boolean;
  isUploading?: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onOpenSettings: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  onUploadRecording?: () => void;
}

export const ControlPanel = ({
  isStreaming,
  isMuted,
  isRecording,
  hasRecording,
  isUploading = false,
  onStart,
  onStop,
  onToggleMute,
  onFullscreen,
  onOpenSettings,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  onUploadRecording,
}: ControlPanelProps) => {
  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg">
      {!isStreaming ? (
        <Button
          onClick={onStart}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Detection
        </Button>
      ) : (
        <Button
          onClick={onStop}
          size="lg"
          variant="destructive"
        >
          <Square className="w-5 h-5 mr-2" />
          Stop Detection
        </Button>
      )}

      <div className="w-px h-8 bg-border/50" />

      <Button
        onClick={onToggleMute}
        variant="secondary"
        size="icon"
        disabled={!isStreaming}
        className={isMuted ? 'text-destructive' : 'text-foreground'}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </Button>

      <Button
        onClick={onFullscreen}
        variant="secondary"
        size="icon"
        disabled={!isStreaming}
      >
        <Maximize className="w-5 h-5" />
      </Button>

      <Button
        onClick={onOpenSettings}
        variant="secondary"
        size="icon"
      >
        <Settings className="w-5 h-5" />
      </Button>

      <div className="w-px h-8 bg-border/50" />

      {!isRecording ? (
        <Button
          onClick={onStartRecording}
          variant="secondary"
          size="icon"
          disabled={!isStreaming}
          className="relative"
        >
          <Video className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          onClick={onStopRecording}
          variant="destructive"
          size="icon"
          className="animate-pulse-glow"
        >
          <Square className="w-5 h-5 fill-current" />
        </Button>
      )}

      {hasRecording && (
        <>
          <Button
            onClick={onDownloadRecording}
            variant="secondary"
            size="icon"
            title="Download locally"
          >
            <Download className="w-5 h-5" />
          </Button>
          
          {onUploadRecording && (
            <Button
              onClick={onUploadRecording}
              variant="secondary"
              size="icon"
              disabled={isUploading}
              className="text-primary hover:text-primary/90"
              title="Save to cloud"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CloudUpload className="w-5 h-5" />
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
