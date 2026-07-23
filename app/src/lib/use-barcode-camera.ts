import { useRef, useState, useCallback, useEffect } from 'react';

/** Type declaration for the BarcodeDetector API (not in all browsers/types). */
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector: typeof BarcodeDetector;
  }
}

export type BarcodeScanState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'active' }
  | { status: 'detected'; value: string; format: string }
  | { status: 'error'; message: string }
  | { status: 'unsupported' };

export interface BarcodeCameraControls {
  /** Current state of the scanner */
  state: BarcodeScanState;
  /** Start the camera and begin scanning */
  start: () => Promise<void>;
  /** Stop the camera and reset state */
  stop: () => void;
  /** Retry after an error or detected value */
  reset: () => void;
  /** Ref for the <video> element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const SUPPORTED_FORMATS = [
  'qr_code',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'data_matrix',
  'pdf417',
  'aztec',
];

/**
 * Custom hook for camera-based barcode/QR scanning using the browser's
 * built-in BarcodeDetector API (Chromium only).
 *
 * Usage:
 *   const { state, start, stop, reset, videoRef } = useBarcodeCamera();
 *
 *   // Wire the videoRef to a <video> element, call start() to begin.
 *   // The state transitions: idle → starting → active → detected | error
 *   // Call reset() after a detection to scan again.
 */
export function useBarcodeCamera(): BarcodeCameraControls {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<InstanceType<typeof window.BarcodeDetector> | null>(null);
  const animFrameRef = useRef<number>(0);
  const scanningRef = useRef<boolean>(false);
  const [state, setState] = useState<BarcodeScanState>({ status: 'idle' });

  // Check BarcodeDetector availability once
  const isSupported = 'BarcodeDetector' in window;

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setState({ status: 'unsupported' });
      return;
    }

    setState({ status: 'starting' });

    try {
      // Request rear-facing camera if available
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Create detector with supported formats
      detectorRef.current = new window.BarcodeDetector({
        formats: SUPPORTED_FORMATS,
      });

      setState({ status: 'active' });
      scanningRef.current = true;

      // Detection loop
      const detect = async (): Promise<void> => {
        if (!scanningRef.current) return;
        if (!videoRef.current || !detectorRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (videoRef.current.readyState < 2) {
          // Video not ready yet, retry next frame
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0 && scanningRef.current) {
            const first = barcodes[0] as { rawValue: string; format: string };
            const value = first.rawValue?.trim();
            if (value && value.length > 0) {
              scanningRef.current = false;
              setState({
                status: 'detected',
                value,
                format: first.format ?? 'unknown',
              });
              stopCamera();
              return;
            }
          }
        } catch {
          // Detection errors are normal between frames, just continue
        }

        if (scanningRef.current) {
          animFrameRef.current = requestAnimationFrame(detect);
        }
      };

      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err: unknown) {
      stopCamera();
      const message =
        err instanceof DOMException
          ? err.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado'
            : err.name === 'NotFoundError'
              ? 'No se encontró una cámara'
              : err.message
          : err instanceof Error
            ? err.message
            : 'Error al iniciar la cámara';
      setState({ status: 'error', message });
    }
  }, [isSupported, stopCamera]);

  const reset = useCallback(() => {
    stopCamera();
    setState({ status: 'idle' });
  }, [stopCamera]);

  const stop = useCallback(() => {
    stopCamera();
    setState({ status: 'idle' });
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { state, start, stop, reset, videoRef };
}
