import { Play, Square, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface ControlPanelProps {
  isStreaming: boolean;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onOpenSettings: () => void;
}

export const ControlPanel = ({
  isStreaming,
  isMuted,
  onStart,
  onStop,
  onToggleMute,
  onFullscreen,
  onOpenSettings,
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
    </div>
  );
};
