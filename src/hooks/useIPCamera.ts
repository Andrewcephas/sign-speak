import { useState, useRef, useCallback } from 'react';

export interface IPCameraConfig {
  url: string;
  name: string;
}

export const useIPCamera = () => {
  const [ipCameraUrl, setIpCameraUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Connect to IP camera stream (MJPEG or similar)
  const connectIPCamera = useCallback(async (url: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    try {
      // Test if the URL is accessible
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          setError('Connection timeout. Please check the URL and ensure the camera is on the same network.');
          setIsConnecting(false);
          resolve(false);
        }, 10000);

        testImg.onload = () => {
          clearTimeout(timeout);
          setIpCameraUrl(url);
          setIsConnected(true);
          setIsConnecting(false);
          resolve(true);
        };

        testImg.onerror = () => {
          clearTimeout(timeout);
          setError('Failed to connect. Check URL format and network access.');
          setIsConnecting(false);
          resolve(false);
        };

        testImg.src = url;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      return false;
    }
  }, []);

  // Disconnect IP camera
  const disconnectIPCamera = useCallback(() => {
    setIpCameraUrl('');
    setIsConnected(false);
    setError(null);
  }, []);

  // Get common IP camera URL patterns
  const getIPCameraHelp = useCallback(() => {
    return {
      apps: [
        {
          name: 'IP Webcam (Android)',
          urlPattern: 'http://<phone-ip>:8080/video',
          instructions: 'Install IP Webcam from Play Store, start server, use the URL shown',
        },
        {
          name: 'DroidCam (Android/iOS)',
          urlPattern: 'http://<phone-ip>:4747/video',
          instructions: 'Install DroidCam, connect phone and PC to same WiFi, use IP shown in app',
        },
        {
          name: 'iVCam (iOS)',
          urlPattern: 'http://<phone-ip>:8080/video',
          instructions: 'Install iVCam on phone and PC, connect via same network',
        },
        {
          name: 'Camo (iOS/Android)',
          urlPattern: 'Uses USB/WiFi virtual webcam',
          instructions: 'Will appear as a regular webcam device',
        },
      ],
      tips: [
        'Ensure phone and computer are on the same WiFi network',
        'Disable mobile data on phone for stable connection',
        'Check firewall settings if connection fails',
        'For Bluetooth: Use apps that create virtual webcams (no direct Bluetooth camera support in browsers)',
      ],
    };
  }, []);

  return {
    ipCameraUrl,
    isConnected,
    isConnecting,
    error,
    connectIPCamera,
    disconnectIPCamera,
    getIPCameraHelp,
    imgRef,
  };
};
