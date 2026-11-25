export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
