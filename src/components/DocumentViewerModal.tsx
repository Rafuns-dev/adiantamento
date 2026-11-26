import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText, Download, ExternalLink, CheckCircle2, Image as ImageIcon, FileCode2 } from 'lucide-react';
import { dataUrlToBlob, decodeTextFromDataUrl, downloadFile } from '../utils/fileHelpers';
import { useApp } from '../context/AppContext';
import { STORAGE_REF_PREFIX } from '../services/firebaseService';

interface SecondaryAttachment {
  label: string;
  fileName: string;
  fileData?: string;
}

interface DocumentViewerModalProps {
  title: string;
  fileName?: string;
  fileData?: string;
  fileType?: 'pdf' | 'xml' | 'image' | 'generic';
  secondaryAttachment?: SecondaryAttachment;
  details?: Array<{ label: string; value: string }>;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  title,
  fileName = 'documento_anexo.pdf',
  fileData,
  fileType,
  secondaryAttachment,
  details = [],
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');

  const { resolveAuthenticatedStorageUrl } = useApp();

  const currentFileName = activeTab === 'secondary' && secondaryAttachment ? secondaryAttachment.fileName : fileName;
  const rawFileData = activeTab === 'secondary' && secondaryAttachment ? secondaryAttachment.fileData : fileData;

  // Anexos de solicitações ficam no Firebase Storage e são guardados como "storage:<caminho>".
  const isStorageRef = !!rawFileData && rawFileData.startsWith(STORAGE_REF_PREFIX);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [remoteXmlText, setRemoteXmlText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedUrl(null);
    setResolveFailed(false);
    setRemoteXmlText(null);
    if (rawFileData && rawFileData.startsWith(STORAGE_REF_PREFIX)) {
      resolveAuthenticatedStorageUrl(rawFileData.slice(STORAGE_REF_PREFIX.length)).then((url) => {
        if (cancelled) return;
        if (url) setResolvedUrl(url);
        else setResolveFailed(true);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFileData]);

  const currentFileData = isStorageRef ? resolvedUrl ?? undefined : rawFileData;

  const detectedType = useMemo<'pdf' | 'xml' | 'image' | 'generic'>(() => {
    if (activeTab === 'primary' && fileType) return fileType;
    const lower = (currentFileName || '').toLowerCase();
    if (currentFileData?.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) {
      return 'image';
    }
    if (currentFileData?.startsWith('data:application/pdf') || lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      currentFileData?.startsWith('data:text/xml') ||
      currentFileData?.startsWith('data:application/xml') ||
      lower.endsWith('.xml')
    ) {
      return 'xml';
    }
    return 'generic';
  }, [activeTab, fileType, currentFileName, currentFileData]);

  const blobUrl = useMemo(() => {
    if (!currentFileData) return null;
    if (currentFileData.startsWith('data:')) {
      const blob = dataUrlToBlob(currentFileData);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    }
    return currentFileData;
  }, [currentFileData]);

  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  useEffect(() => {
    if (detectedType !== 'xml' || !isStorageRef || !resolvedUrl) return;
    let cancelled = false;
    fetch(resolvedUrl)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRemoteXmlText(text);
      })
      .catch(() => {
        // sem acesso ao conteúdo (CORS): o botão de baixar continua funcionando
      });
    return () => {
      cancelled = true;
    };
  }, [detectedType, isStorageRef, resolvedUrl]);

  const xmlText = useMemo(() => {
    if (detectedType !== 'xml' || !currentFileData) return null;
    if (currentFileData.startsWith('data:')) return decodeTextFromDataUrl(currentFileData);
    return remoteXmlText;
  }, [detectedType, currentFileData, remoteXmlText]);

  const handleDownload = () => {
    if (isStorageRef) {
      if (resolvedUrl) window.open(resolvedUrl, '_blank', 'noopener');
      return;
    }
    const detailsText = details.map(d => `${d.label}: ${d.value}`).join('\n');
    downloadFile(
      currentFileName,
      currentFileData,
      `AMETA SERVIÇOS - ${title}\nArquivo: ${currentFileName}\n\n${detailsText}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              {detectedType === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : detectedType === 'xml' ? (
                <FileCode2 className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm truncate">{title}</h3>
              <p className="text-xs text-slate-400 font-mono truncate">{currentFileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attachment Tabs if secondary XML/file exists */}
        {secondaryAttachment && (
          <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('primary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'primary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Arquivo Principal ({fileName})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('secondary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'secondary'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {secondaryAttachment.label} ({secondaryAttachment.fileName})
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {details.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {details.map((item, idx) => (
                <div key={idx}>
                  <span className="text-slate-500 block text-[11px]">{item.label}</span>
                  <span className="font-bold text-slate-900 break-words">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Real File Preview */}
          {isStorageRef && !currentFileData ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-10 text-center text-xs text-slate-600">
              {resolveFailed
                ? 'Não foi possível abrir este arquivo no Firebase Storage (verifique as permissões e tente novamente).'
                : 'Carregando arquivo...'}
            </div>
          ) : currentFileData ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 flex flex-col items-center justify-center">
              {detectedType === 'image' && (
                <img
                  src={currentFileData}
                  alt={currentFileName}
                  className="max-w-full max-h-[55vh] rounded-xl object-contain bg-white shadow-xs"
                />
              )}

              {detectedType === 'pdf' && blobUrl && (
                <div className="w-full space-y-2">
                  <iframe
                    src={blobUrl}
                    title={currentFileName}
                    className="w-full h-[55vh] rounded-xl border border-slate-200 bg-white"
                  />
                  <div className="flex justify-end">
                    <a
                      href={blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir PDF em nova aba</span>
                    </a>
                  </div>
                </div>
              )}

              {detectedType === 'xml' && (
                <pre className="w-full max-h-[55vh] overflow-auto bg-slate-900 text-teal-300 p-4 rounded-xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {xmlText || 'Arquivo XML anexado.'}
                </pre>
              )}

              {detectedType === 'generic' && (
                <div className="py-10 text-center space-y-2">
                  <FileText className="w-12 h-12 text-teal-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">{currentFileName}</p>
                  <p className="text-xs text-slate-500">
                    Arquivo anexado com sucesso. Clique em "Baixar Arquivo Original" para abrir no seu computador.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Authentic Document Preview for Demo Mock Data (when no binary was uploaded) */
            <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/aistudio/images_feb6fbd0.png"
                    alt="AMETA Serviços"
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">AMETA SERVIÇOS DE TELECOMUNICAÇÕES</h4>
                    <p className="text-[11px] text-slate-500">Documento de Demonstração • {currentFileName}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Registrado
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Espelho do Documento ({title})
                </p>
                {details.map((d, i) => (
                  <div key={i} className="flex justify-between border-b border-slate-200/70 pb-1 last:border-0">
                    <span className="text-slate-500">{d.label}:</span>
                    <span className="font-semibold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                * Registro de demonstração pré-carregado. Novos anexos enviados por upload exibem a imagem/PDF real aqui.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Arquivo Original</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
