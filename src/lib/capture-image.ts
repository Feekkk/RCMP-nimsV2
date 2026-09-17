export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1600;

export let lastVideoDeviceId = '';

export function setLastVideoDeviceId(deviceId: string) {
  lastVideoDeviceId = deviceId;
}

export function videoConstraints(deviceId: string): MediaTrackConstraints {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) return { ...size, deviceId: { exact: deviceId } };
  return { ...size, facingMode: { ideal: 'environment' } };
}

export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput' && device.deviceId);
}

export async function fileToJpegBase64(file: Blob): Promise<string> {
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

export async function snapshotToBlob(video: HTMLVideoElement): Promise<Blob> {
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
