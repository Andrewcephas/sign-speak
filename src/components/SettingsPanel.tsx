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

export type ModelFormat = 'demo' | 'onnx' | 'tflite' | 'tfjs';

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
  // ONNX model state
  isOnnxModelLoaded: boolean;
  isOnnxModelLoading: boolean;
  onnxModelError: string | null;
  onLoadOnnxModel: () => void;
  // TFLite model state
  isTfliteModelLoaded: boolean;
  isTfliteModelLoading: boolean;
  tfliteModelError: string | null;
  onLoadTfliteModel: () => void;
  // TF.js model state
  isTfjsModelLoaded: boolean;
  isTfjsModelLoading: boolean;
  tfjsModelError: string | null;
  onLoadTfjsModel: () => void;
  // Model selection
  selectedModelFormat: ModelFormat;
  onModelFormatChange: (format: ModelFormat) => void;
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
  isOnnxModelLoaded,
  isOnnxModelLoading,
  onnxModelError,
  onLoadOnnxModel,
  isTfliteModelLoaded,
  isTfliteModelLoading,
  tfliteModelError,
  onLoadTfliteModel,
  isTfjsModelLoaded,
  isTfjsModelLoading,
  tfjsModelError,
  onLoadTfjsModel,
  selectedModelFormat,
  onModelFormatChange,
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
                  variant={selectedModelFormat === 'demo' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModelFormatChange('demo')}
                  className="flex-1"
                >
                  Demo
                </Button>
                <Button
                  variant={selectedModelFormat === 'onnx' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModelFormatChange('onnx')}
                  className="flex-1"
                >
                  ONNX
                </Button>
                <Button
                  variant={selectedModelFormat === 'tflite' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModelFormatChange('tflite')}
                  className="flex-1"
                >
                  TFLite
                </Button>
                <Button
                  variant={selectedModelFormat === 'tfjs' ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModelFormatChange('tfjs')}
                  className="flex-1"
                >
                  TF.js
                </Button>
              </div>

              {/* ONNX Model Controls */}
              {selectedModelFormat === 'onnx' && (
                <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={onLoadOnnxModel}
                    disabled={isOnnxModelLoading || isOnnxModelLoaded}
                  >
                    {isOnnxModelLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading ONNX...
                      </>
                    ) : isOnnxModelLoaded ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                        ONNX Model Loaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Load ONNX Model
                      </>
                    )}
                  </Button>
                  
                  {onnxModelError && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{onnxModelError}</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Place <code className="bg-secondary px-1 rounded">sign_language_model.onnx</code> in <code className="bg-secondary px-1 rounded">public/models/</code>
                  </p>
                </div>
              )}

              {/* TFLite Model Controls */}
              {selectedModelFormat === 'tflite' && (
                <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={onLoadTfliteModel}
                    disabled={isTfliteModelLoading || isTfliteModelLoaded}
                  >
                    {isTfliteModelLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading TFLite...
                      </>
                    ) : isTfliteModelLoaded ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                        TFLite Model Loaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Load TFLite Model
                      </>
                    )}
                  </Button>
                  
                  {tfliteModelError && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{tfliteModelError}</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Place <code className="bg-secondary px-1 rounded">sign_pose_model.tflite</code> and <code className="bg-secondary px-1 rounded">id_to_class.json</code> in <code className="bg-secondary px-1 rounded">public/models/</code>
                  </p>
                </div>
              )}

              {/* TF.js Model Controls */}
              {selectedModelFormat === 'tfjs' && (
                <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={onLoadTfjsModel}
                    disabled={isTfjsModelLoading || isTfjsModelLoaded}
                  >
                    {isTfjsModelLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading TF.js Model...
                      </>
                    ) : isTfjsModelLoaded ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                        TF.js Model Loaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Load TF.js Model
                      </>
                    )}
                  </Button>
                  
                  {tfjsModelError && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{tfjsModelError}</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Place <code className="bg-secondary px-1 rounded">model.json</code> and <code className="bg-secondary px-1 rounded">group1-shard*.bin</code> files in <code className="bg-secondary px-1 rounded">public/models/</code>
                  </p>
                </div>
              )}

              {selectedModelFormat === 'demo' && (
                <p className="text-xs text-muted-foreground p-3 bg-secondary/30 rounded-lg">
                  Demo mode simulates predictions without a real model. Use ONNX, TFLite, or TF.js for actual sign recognition.
                </p>
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
              <h3 className="font-semibold text-foreground mb-2">Model Files</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Upload your model files to <code className="bg-secondary px-1 rounded">public/models/</code>:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>ONNX:</strong> sign_language_model.onnx (+ .data if external)</li>
                <li>• <strong>TFLite:</strong> sign_pose_model.tflite + id_to_class.json</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
