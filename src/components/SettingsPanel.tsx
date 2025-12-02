import { X, Camera, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card } from './ui/card';
import { CameraDevice } from '@/hooks/useCamera';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraDevice[];
  selectedCamera: string;
  onCameraChange: (deviceId: string) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voiceURI: string) => void;
}

export const SettingsPanel = ({
  isOpen,
  onClose,
  cameras,
  selectedCamera,
  onCameraChange,
  voices,
  selectedVoice,
  onVoiceChange,
}: SettingsPanelProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <Card className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border/50 z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Camera className="w-5 h-5 text-primary" />
                Camera Device
              </Label>
              <Select value={selectedCamera} onValueChange={onCameraChange}>
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose which camera to use for sign detection
              </p>
            </div>

            <div className="h-px bg-border/50" />

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Mic className="w-5 h-5 text-primary" />
                Text-to-Speech Voice
              </Label>
              <Select
                value={selectedVoice?.voiceURI || ''}
                onValueChange={onVoiceChange}
              >
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select the voice for speaking predictions
              </p>
            </div>

            <div className="h-px bg-border/50" />

            <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Model Integration</h3>
              <p className="text-sm text-muted-foreground">
                To integrate your custom sign language model, you'll need to add the model
                file and update the prediction logic. The system currently shows mock
                predictions for demonstration.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
