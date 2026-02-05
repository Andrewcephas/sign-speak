import { X, Camera, Mic, Smartphone, Brain, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  onOpenIPCamera: () => void;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelError: string | null;
  onLoadModel: () => void;
  useRealModel: boolean;
  onToggleModelMode: (useReal: boolean) => void;
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
  onOpenIPCamera,
  isModelLoaded,
  isModelLoading,
  modelError,
  onLoadModel,
  useRealModel,
  onToggleModelMode,
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
              <Select value={selectedCamera || undefined} onValueChange={onCameraChange}>
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {cameras
                    .filter((camera) => camera.deviceId && camera.deviceId.trim() !== '')
                    .map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose which camera to use for sign detection
              </p>
              
              <Button 
                variant="outline" 
                className="w-full mt-2 border-primary/50 hover:bg-primary/10"
                onClick={onOpenIPCamera}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Connect Phone Camera (WiFi/IP)
              </Button>
            </div>

            <div className="h-px bg-border/50" />

            {/* Model Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Brain className="w-5 h-5 text-primary" />
                Sign Language Model
              </Label>
              
              <div className="flex gap-2">
                <Button
                  variant={!useRealModel ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleModelMode(false)}
                  className="flex-1"
                >
                  Demo Mode
                </Button>
                <Button
                  variant={useRealModel ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleModelMode(true)}
                  className="flex-1"
                >
                  Real Model
                </Button>
              </div>

              {useRealModel && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={onLoadModel}
                    disabled={isModelLoading || isModelLoaded}
                  >
                    {isModelLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Model...
                      </>
                    ) : isModelLoaded ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                        Model Loaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Load ONNX Model
                      </>
                    )}
                  </Button>
                  
                  {modelError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      {modelError}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                     Place <code className="bg-secondary px-1 rounded">sign_language_model.onnx</code> (and if exported with external weights also <code className="bg-secondary px-1 rounded">sign_language_model.onnx.data</code>) in <code className="bg-secondary px-1 rounded">public/models/</code>
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-border/50" />

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Mic className="w-5 h-5 text-primary" />
                Text-to-Speech Voice
              </Label>
              <Select
                value={selectedVoice?.voiceURI || undefined}
                onValueChange={onVoiceChange}
              >
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {voices
                    .filter((voice) => voice.voiceURI && voice.voiceURI.trim() !== '')
                    .map((voice) => (
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
              <h3 className="font-semibold text-foreground mb-2">PyTorch → ONNX Conversion</h3>
              <p className="text-sm text-muted-foreground mb-2">
                 Convert your <code className="bg-secondary px-1 rounded">sign_language_model.pth</code> to ONNX format:
              </p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`import torch
model.load_state_dict(
  torch.load('sign_language_model.pth')
)
torch.onnx.export(
  model, dummy_input,
  'sign_language_model.onnx',
  external_data=False
)`}
              </pre>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
