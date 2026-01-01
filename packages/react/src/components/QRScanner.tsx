/**
 * QR Code scanner component
 */

import React, { useRef, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import type { ComponentBaseProps } from '../types/index.js';
import { defaultTheme } from '../utils/theme.js';

export interface QRScannerProps extends ComponentBaseProps {
  /** Callback when QR code is scanned */
  onScan: (data: string) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Camera facing mode */
  facingMode?: 'user' | 'environment';
  /** Scanner width */
  width?: number;
  /** Scanner height */
  height?: number;
  /** Show scan frame */
  showFrame?: boolean;
}

const Container = styled.div`
  position: relative;
  display: inline-block;
  background-color: ${defaultTheme.colors.background.secondary};
  border-radius: ${defaultTheme.borderRadius.md};
  overflow: hidden;
`;

const Video = styled.video`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Canvas = styled.canvas`
  display: none;
`;

const ScanFrame = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 2px solid ${defaultTheme.colors.primary};
  border-radius: ${defaultTheme.borderRadius.md};
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border: 3px solid ${defaultTheme.colors.primary};
  }

  &::before {
    top: -2px;
    left: -2px;
    border-right: none;
    border-bottom: none;
  }

  &::after {
    bottom: -2px;
    right: -2px;
    border-left: none;
    border-top: none;
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: ${defaultTheme.spacing.md};
  background-color: ${defaultTheme.colors.error};
  color: ${defaultTheme.colors.text.inverse};
  border-radius: ${defaultTheme.borderRadius.md};
  text-align: center;
  max-width: 80%;
`;

const StatusText = styled.div`
  position: absolute;
  bottom: ${defaultTheme.spacing.md};
  left: 50%;
  transform: translateX(-50%);
  padding: ${defaultTheme.spacing.sm} ${defaultTheme.spacing.md};
  background-color: rgba(0, 0, 0, 0.7);
  color: ${defaultTheme.colors.text.inverse};
  border-radius: ${defaultTheme.borderRadius.full};
  font-size: ${defaultTheme.fontSize.sm};
`;

/**
 * QR Code scanner component using browser camera
 *
 * Note: This is a simplified implementation. For production use,
 * consider using a library like html5-qrcode or react-qr-reader
 *
 * @example
 * ```tsx
 * <QRScanner
 *   onScan={(data) => console.log('Scanned:', data)}
 *   onError={(error) => console.error('Scan error:', error)}
 *   width={400}
 *   height={400}
 *   showFrame
 * />
 * ```
 */
export function QRScanner({
  onScan,
  onError,
  facingMode = 'environment',
  width = 400,
  height = 400,
  showFrame = true,
  className,
  style,
}: QRScannerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<Error | null>(null);
  const [scanning, setScanning] = useState(true);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: width },
            height: { ideal: height },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Start scanning
        scanIntervalRef.current = setInterval(() => {
          scanQRCode();
        }, 500);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to access camera');
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    }

    function scanQRCode() {
      if (!videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Note: In a real implementation, you would use a QR code detection library here
      // such as jsQR or qr-scanner to decode the image data
      // This is a placeholder that would need actual QR decoding logic

      // Example (requires jsQR library):
      // import jsQR from 'jsqr';
      // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      // if (code) {
      //   onScan(code.data);
      //   setScanning(false);
      // }
    }

    startCamera();

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, width, height, onScan, onError]);

  return (
    <Container
      className={className}
      style={{ width, height, ...style }}
    >
      <Video ref={videoRef} />
      <Canvas ref={canvasRef} />
      {showFrame && scanning && <ScanFrame />}
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
      {scanning && !error && (
        <StatusText>Position QR code within frame</StatusText>
      )}
    </Container>
  );
}
