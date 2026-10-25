import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, AlertCircle, RotateCcw, Upload, Loader2, Sun, Glasses, Smartphone } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

/**
 * Live selfie capture for KYC (client round 3, item 4).
 *
 * Why it was broken: the old component attached the camera stream to
 * `videoRef.current` *before* the <video> element was rendered (it only
 * mounted on the next step), so the preview stayed blank, the "selfie" was a
 * 0x0 image, the result was a Math.random() score, and nothing was uploaded.
 *
 * Now: the stream is attached in an effect once the <video> is mounted, the
 * user sees a live mirrored preview, takes a photo, checks it, and the photo
 * is uploaded as the `selfie` KYC document for the reviewer. Every camera
 * failure has a clear message, and phones can fall back to the native camera.
 */

export interface LivenessResult {
  selfieUrl: string;
  livenessScore: number;
  detectedFace: boolean;
  timestamp: Date;
  metadata: {
    deviceType: string;
    imageQuality: number;
    lightingConditions: 'good' | 'fair' | 'poor';
  };
}

interface LivenessVerificationProps {
  /** Upload the captured selfie. Rejecting keeps the photo so the user can retry. */
  onCaptured: (file: File) => Promise<void>;
  /** A selfie already stored on the server (shown instead of the intro). */
  existingSelfieUrl?: string | null;
  className?: string;
}

type Phase = 'intro' | 'requesting' | 'live' | 'captured' | 'uploading' | 'done';
type CameraError = 'permission' | 'notFound' | 'inUse' | 'insecure' | 'unsupported' | 'generic' | 'noFrame' | 'uploadFailed';

const COUNTDOWN_SECONDS = 3;

const mapCameraError = (err: any): CameraError => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'notFound';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'inUse';
    default:
      return 'generic';
  }
};

export const LivenessVerification: React.FC<LivenessVerificationProps> = ({
  onCaptured,
  existingSelfieUrl,
  className,
}) => {
  const { t } = useTranslation('kyc');
  const [phase, setPhase] = useState<Phase>(existingSelfieUrl ? 'done' : 'intro');
  const [error, setError] = useState<CameraError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Attach the stream once the <video> exists (it only mounts in the 'live' phase).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const play = () => {
      video.play().catch(() => {
        /* autoplay is allowed for muted inline video; ignore transient errors */
      });
    };
    video.onloadedmetadata = play;
    play();
    return () => {
      video.onloadedmetadata = null;
    };
  }, [stream, phase]);

  // Release the camera and timers when leaving the page.
  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const startCamera = useCallback(async () => {
    setError(null);
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      return;
    }
    setPhase('requesting');
    try {
      let media: MediaStream;
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (first: any) {
        // Some devices reject the ideal constraints — retry with any camera.
        if (first?.name !== 'OverconstrainedError') throw first;
        media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setStream(media);
      setPhase('live');
    } catch (err) {
      setError(mapCameraError(err));
      setPhase('intro');
    }
  }, []);

  const acceptFile = useCallback((file: File) => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setCapturedFile(file);
    setPhase('captured');
  }, []);

  const grabFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('noFrame');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('generic');
      return;
    }
    // The preview is mirrored for comfort; the stored photo is the true image.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('noFrame');
          return;
        }
        stopCamera();
        acceptFile(new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }, [stopCamera, acceptFile]);

  const startCountdown = useCallback(() => {
    setError(null);
    let remaining = COUNTDOWN_SECONDS;
    setCountdown(remaining);
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        grabFrame();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [grabFrame]);

  const cancelLive = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
    stopCamera();
    setPhase(existingSelfieUrl ? 'done' : 'intro');
  }, [existingSelfieUrl, stopCamera]);

  const retake = useCallback(() => {
    setCapturedFile(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(async () => {
    if (!capturedFile) return;
    setError(null);
    setPhase('uploading');
    try {
      await onCaptured(capturedFile);
      setPhase('done');
    } catch {
      setError('uploadFailed');
      setPhase('captured');
    }
  }, [capturedFile, onCaptured]);

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      stopCamera();
      acceptFile(file);
    }
  };

  const fallback = (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 text-center">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('camera.fallbackTitle')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('camera.fallbackDesc')}</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-4 h-4 me-2" />
        {t('camera.fallbackButton')}
      </Button>
    </div>
  );

  return (
    <div className={cn('w-full max-w-lg mx-auto space-y-5', className)}>
      {/* Native camera / gallery fallback (opens the front camera on phones). */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={onFileChosen}
      />

      {error && (
        <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{t(`camera.errors.${error}`)}</p>
        </div>
      )}

      {(phase === 'intro' || phase === 'requesting') && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{t('camera.introTitle')}</h3>
          </div>
          <ul className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            {[
              { icon: Sun, text: t('camera.tip1') },
              { icon: Glasses, text: t('camera.tip2') },
              { icon: Smartphone, text: t('camera.tip3') },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
          {phase === 'requesting' ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('camera.requesting')}
            </div>
          ) : (
            <Button variant="primary" size="lg" className="w-full" onClick={startCamera}>
              <Camera className="w-5 h-5 me-2" />
              {error ? t('camera.retry') : t('camera.start')}
            </Button>
          )}
          {fallback}
        </div>
      )}

      {phase === 'live' && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('camera.liveTitle')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('camera.liveHint')}</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
            {/* Face guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[62%] h-[70%] rounded-[50%] border-4 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute top-3 start-3 flex items-center gap-1.5 bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('camera.live')}
            </div>
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}
          </div>
          {countdown !== null && (
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {t('camera.countdown', { seconds: countdown })}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={cancelLive}>
              {t('camera.cancel')}
            </Button>
            <Button variant="primary" className="flex-1" onClick={startCountdown} disabled={countdown !== null}>
              <Camera className="w-4 h-4 me-2" />
              {t('camera.capture')}
            </Button>
          </div>
        </div>
      )}

      {(phase === 'captured' || phase === 'uploading') && previewUrl && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('camera.capturedTitle')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('camera.capturedHint')}</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img src={previewUrl} alt={t('docTypes.selfie')} className="absolute inset-0 w-full h-full object-cover" />
            {phase === 'uploading' && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">{t('camera.uploading')}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={retake} disabled={phase === 'uploading'}>
              <RotateCcw className="w-4 h-4 me-2" />
              {t('camera.retake')}
            </Button>
            <Button variant="primary" className="flex-1" onClick={confirmPhoto} disabled={phase === 'uploading'}>
              <Check className="w-4 h-4 me-2" />
              {t('camera.usePhoto')}
            </Button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 text-center">
          <div className="relative mx-auto w-40 aspect-[3/4] rounded-xl overflow-hidden border-2 border-emerald-300 dark:border-emerald-700 bg-slate-100 dark:bg-slate-800">
            {(previewUrl || existingSelfieUrl) && (
              <img
                src={previewUrl || existingSelfieUrl || ''}
                alt={t('docTypes.selfie')}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <span className="absolute bottom-2 end-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('camera.uploadedTitle')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('camera.uploadedHint')}</p>
          </div>
          <Button variant="ghost" onClick={retake}>
            <RotateCcw className="w-4 h-4 me-2" />
            {t('camera.retake')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LivenessVerification;
