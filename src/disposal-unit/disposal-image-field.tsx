import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImageUp, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { DisposalUploadBatch } from '@shared/lib/disposal-schema';
import { uploadDisposalImageFn } from '@backend/server/assets/assets.functions';

const MAX_EDGE = 1600;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

let lastVideoDeviceId = '';

function videoConstraints(deviceId: string): MediaTrackConstraints {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) return { ...size, deviceId: { exact: deviceId } };
  return { ...size, facingMode: { ideal: 'environment' } };
}

async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput' && device.deviceId);
}

async function fileToJpegBase64(file: Blob): Promise<string> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('This image is too large. Choose a smaller photo.');
  }
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    const scale = Math.min(MAX_EDGE / width, MAX_EDGE / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('This image could not be processed.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('This image could not be encoded.'))),
      'image/jpeg',
      0.82,
    );
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function snapshotToBlob(video: HTMLVideoElement): Promise<Blob> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('The camera is not ready yet. Wait a moment and try again.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This photo could not be captured.');
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('This photo could not be captured.'))),
      'image/jpeg',
      0.92,
    );
  });
}

export function DisposalImageField({
  label,
  value,
  onChange,
  slot,
  assetId,
  batch,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  slot: 'whole' | 'serial';
  assetId: string;
  batch: DisposalUploadBatch | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    if (!cameraOpen) {
      setCameras([]);
      setCameraReady(false);
      return;
    }
    if (!videoEl) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('This browser cannot open the camera.');
      setCameraOpen(false);
      return;
    }

    let cancelled = false;
    const streamHolder: { current: MediaStream | null } = { current: null };
    setCameraReady(false);
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: videoConstraints(deviceId) })
      .then(async (nextStream) => {
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamHolder.current = nextStream;
        videoEl.srcObject = nextStream;
        await videoEl.play();
        if (cancelled) return;
        setCameraReady(true);
        const list = await listVideoInputs();
        if (cancelled) return;
        setCameras(list);
        const activeId = nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? '';
        if (activeId && list.some((cam) => cam.deviceId === activeId) && deviceId !== activeId) {
          lastVideoDeviceId = activeId;
          setDeviceId(activeId);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (deviceId) {
          lastVideoDeviceId = '';
          setDeviceId('');
          toast.error('That camera is unavailable. Switching to another camera.');
          return;
        }
        toast.error('Allow camera access when the browser asks, then try again.');
        setCameraOpen(false);
      });

    return () => {
      cancelled = true;
      setCameraReady(false);
      streamHolder.current?.getTracks().forEach((track) => track.stop());
      videoEl.srcObject = null;
    };
  }, [cameraOpen, videoEl, deviceId]);

  useEffect(() => {
    if (!cameraOpen || !navigator.mediaDevices) return;
    const refresh = () => {
      void listVideoInputs().then(setCameras);
    };
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [cameraOpen]);

  const uploadBlob = async (file: Blob) => {
    if (!batch) {
      throw new Error('The upload folder is not ready yet. Refresh and try again.');
    }
    const dataBase64 = await fileToJpegBase64(file);
    const result = await uploadDisposalImageFn({
      data: {
        mimeType: 'image/jpeg',
        dataBase64,
        year: batch.year,
        batch: batch.batch,
        slot,
        assetId,
      },
    });
    onChange(result.path);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a photo file.');
      return;
    }
    setUploading(true);
    try {
      await uploadBlob(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not upload this image');
    } finally {
      setUploading(false);
    }
  };

  const handleCapture = async () => {
    const video = videoEl;
    if (!video) return;
    setUploading(true);
    try {
      const blob = await snapshotToBlob(video);
      await uploadBlob(blob);
      setCameraOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not capture this photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {value ? (
        <div className="relative overflow-hidden rounded-[8px] border border-border bg-muted/30">
          <img src={value.startsWith('/') ? value : `/${value}`} alt={label} className="h-36 w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-[8px]"
            onClick={() => onChange('')}
            disabled={uploading}
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-36 w-full flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-border bg-muted/20 text-xs text-muted-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
          disabled={uploading || !batch}
          onClick={() => {
            setDeviceId(lastVideoDeviceId);
            setCameraOpen(true);
          }}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              No photo yet
            </>
          )}
        </button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-[8px]"
        disabled={uploading || !batch}
        onClick={() => fileRef.current?.click()}
      >
        <ImageUp className="h-3.5 w-3.5" />
        Upload
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFiles(e)}
      />

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Take photo</DialogTitle>
            <DialogDescription>
              Allow camera access, then capture {label.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {cameras.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor={`camera-device-${slot}`} className="text-sm">
                  Camera
                </Label>
                <select
                  id={`camera-device-${slot}`}
                  className="flex h-9 w-full rounded-[8px] border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={deviceId}
                  onChange={(event) => {
                    lastVideoDeviceId = event.target.value;
                    setDeviceId(event.target.value);
                  }}
                >
                  {cameras.map((cam, index) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="overflow-hidden rounded-[10px] bg-black">
              <video
                ref={setVideoEl}
                className="aspect-video h-64 w-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => setCameraOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-1.5 rounded-[8px]"
              disabled={uploading || !cameraReady}
              onClick={() => void handleCapture()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Saving…' : 'Capture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
