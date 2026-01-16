import { useState } from 'react';
import { Smartphone, Wifi, Info, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface IPCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (url: string) => Promise<boolean>;
  isConnecting: boolean;
  error: string | null;
}

const IP_CAMERA_APPS = [
  {
    name: 'IP Webcam (Android)',
    urlPattern: 'http://<phone-ip>:8080/video',
    instructions: [
      'Install "IP Webcam" from Google Play Store',
      'Open the app and tap "Start server"',
      'Note the IP address shown (e.g., 192.168.1.100:8080)',
      'Enter the URL below: http://192.168.1.100:8080/video',
    ],
  },
  {
    name: 'DroidCam (Android/iOS)',
    urlPattern: 'http://<phone-ip>:4747/video',
    instructions: [
      'Install "DroidCam" on your phone',
      'Connect phone and PC to the same WiFi network',
      'Open the app and note the IP address',
      'Enter: http://<ip>:4747/video',
    ],
  },
  {
    name: 'iVCam / EpocCam (iOS)',
    urlPattern: 'Virtual Webcam',
    instructions: [
      'Install the app on your iPhone/iPad',
      'Install the desktop client on your computer',
      'Connect via USB or WiFi',
      'The camera will appear in the regular camera list',
    ],
  },
  {
    name: 'Camo (iOS/Android)',
    urlPattern: 'Virtual Webcam',
    instructions: [
      'Install Camo on your phone and computer',
      'Connect via USB for best quality',
      'The camera will appear as a regular webcam device',
    ],
  },
];

export const IPCameraModal = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  error,
}: IPCameraModalProps) => {
  const [url, setUrl] = useState('');

  const handleConnect = async () => {
    if (!url.trim()) return;
    const success = await onConnect(url.trim());
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Connect Phone Camera
          </DialogTitle>
          <DialogDescription>
            Use your phone as a wireless camera via IP streaming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip-url">Camera Stream URL</Label>
            <div className="flex gap-2">
              <Input
                id="ip-url"
                placeholder="http://192.168.1.100:8080/video"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-secondary border-border/50"
              />
              <Button
                onClick={handleConnect}
                disabled={!url.trim() || isConnecting}
                className="bg-primary hover:bg-primary/90"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <Card className="p-3 bg-info/10 border-info/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-info mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About Bluetooth Cameras</p>
                <p>
                  Browsers don't support direct Bluetooth camera connections. 
                  Use one of the apps below to stream your phone camera over WiFi, 
                  or connect via USB using apps like Camo or DroidCam.
                </p>
              </div>
            </div>
          </Card>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="apps" className="border-border/50">
              <AccordionTrigger className="text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Recommended Apps & Setup
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {IP_CAMERA_APPS.map((app) => (
                    <div key={app.name} className="p-3 bg-secondary/50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">{app.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        URL: <code className="bg-background px-1 rounded">{app.urlPattern}</code>
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                        {app.instructions.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
