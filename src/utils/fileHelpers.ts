export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return /\.pdf$/i.test(file.name);
}

export function isXmlFile(file: File): boolean {
  if (file.type === 'application/xml' || file.type === 'text/xml') return true;
  return /\.xml$/i.test(file.name);
}

/**
 * Redimensiona e comprime imagens (fotos de celular/câmera) para JPEG leve (~100-250 KB),
 * mantendo ótima legibilidade para notas fiscais e comprovantes e garantindo upload rápido.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1400,
  quality = 0.78
): Promise<{ dataUrl: string; file: File }> {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (typeof document === 'undefined') {
    return { dataUrl: rawDataUrl, file };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (!width || !height) {
          resolve({ dataUrl: rawDataUrl, file });
          return;
        }
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: rawDataUrl, file });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const blob = dataUrlToBlob(jpegDataUrl);
        if (!blob) {
          resolve({ dataUrl: rawDataUrl, file });
          return;
        }

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
        const compressedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
        if (compressedFile.size >= file.size && (file.type === 'image/jpeg' || file.type === 'image/png')) {
          resolve({ dataUrl: rawDataUrl, file });
          return;
        }
        resolve({ dataUrl: jpegDataUrl, file: compressedFile });
      } catch {
        resolve({ dataUrl: rawDataUrl, file });
      }
    };
    img.onerror = () => resolve({ dataUrl: rawDataUrl, file });
    img.src = rawDataUrl;
  });
}

export async function prepareUploadFile(
  file: File,
  maxDimension = 1400,
  quality = 0.78
): Promise<{ dataUrl: string; file: File }> {
  if (isImageFile(file)) {
    return compressImageToDataUrl(file, maxDimension, quality);
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { dataUrl, file };
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!header || !base64) return null;
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function decodeTextFromDataUrl(dataUrl: string): string | null {
  try {
    const [, base64] = dataUrl.split(',');
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return null;
  }
}

export function downloadFile(fileName: string, fileData?: string, fallbackText?: string) {
  let blobUrl: string | null = null;
  let href = '';

  if (fileData) {
    const blob = dataUrlToBlob(fileData);
    if (blob) {
      blobUrl = URL.createObjectURL(blob);
      href = blobUrl;
    } else {
      href = fileData;
    }
  } else {
    const content = fallbackText || `Documento AMETA Serviços\nArquivo: ${fileName}\nGerado em: ${new Date().toLocaleString('pt-BR')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    blobUrl = URL.createObjectURL(blob);
    href = blobUrl;
  }

  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (blobUrl) {
    setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
  }
}
