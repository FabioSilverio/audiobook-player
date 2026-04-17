import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Loader2, Key, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { TranscriptSegment } from '../hooks/useTranscription';

const API_KEY_STORAGE = 'openai_api_key';

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  transcribing: boolean;
  error: string | null;
  currentTime: number;
  onApiKeyChange: (key: string | null) => void;
}

export default function TranscriptPanel({
  segments,
  transcribing,
  error,
  currentTime,
  onApiKeyChange,
}: TranscriptPanelProps) {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) ?? '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem(API_KEY_STORAGE));
  const [collapsed, setCollapsed] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [screenshotting, setScreenshotting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find active segment
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );
  // Segments up to 30s ahead for context
  const visibleSegments = segments.filter(
    (s) => s.start >= Math.max(0, currentTime - 60) && s.start <= currentTime + 60
  );

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerHeight = container.clientHeight;
      container.scrollTo({
        top: elTop - containerHeight / 2 + elHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [activeSegment?.start]);

  function saveApiKey() {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
      onApiKeyChange(trimmed);
      setShowKeyInput(false);
    }
  }

  function clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    onApiKeyChange(null);
    setShowKeyInput(true);
  }

  async function takeScreenshot() {
    if (!panelRef.current) return;
    setScreenshotting(true);
    try {
      const canvas = await html2canvas(panelRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcricao_${Math.floor(currentTime)}s.png`;
      a.click();
    } catch (e) {
      console.error('Screenshot error:', e);
    } finally {
      setScreenshotting(false);
    }
  }

  function handleSelection() {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelectedText(sel.toString().trim());
    } else {
      setSelectedText('');
    }
  }

  return (
    <div className="flex flex-col bg-gray-900/80 border border-gray-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">Transcrição</span>
          {transcribing && (
            <span className="flex items-center gap-1 text-xs text-brand-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              transcrevendo...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selectedText && (
            <button
              onClick={takeScreenshot}
              disabled={screenshotting}
              title="Capturar seleção"
              className="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              Print
            </button>
          )}
          <button
            onClick={takeScreenshot}
            disabled={screenshotting}
            title="Print da transcrição"
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          >
            {screenshotting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setShowKeyInput((v) => !v)}
            title="Configurar API key"
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* API Key input */}
      {showKeyInput && !collapsed && (
        <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700/50">
          <p className="text-xs text-gray-400 mb-2">
            Cole sua <strong>OpenAI API key</strong> — fica só no seu browser, nunca enviada ao servidor.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              placeholder="sk-..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={saveApiKey}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
            >
              Salvar
            </button>
            {localStorage.getItem(API_KEY_STORAGE) && (
              <button
                onClick={clearApiKey}
                className="p-1.5 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transcript content */}
      {!collapsed && (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 min-h-0"
          style={{ maxHeight: '280px' }}
          onMouseUp={handleSelection}
          onTouchEnd={handleSelection}
        >
          <div ref={panelRef} className="select-text">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl p-3 mb-3">
                Erro: {error}
              </div>
            )}

            {!localStorage.getItem(API_KEY_STORAGE) ? (
              <p className="text-gray-500 text-sm text-center py-6">
                Configure sua API key da OpenAI acima para ativar a transcrição.
              </p>
            ) : segments.length === 0 && !transcribing ? (
              <p className="text-gray-500 text-sm text-center py-6">
                Aguardando reprodução para transcrever...
              </p>
            ) : (
              <div className="space-y-1">
                {visibleSegments.map((seg) => {
                  const isActive = seg === activeSegment;
                  return (
                    <span
                      key={seg.start}
                      ref={isActive ? activeRef : undefined}
                      className={`inline leading-relaxed text-sm transition-all duration-300 cursor-text ${
                        isActive
                          ? 'bg-brand-500/25 text-white rounded px-0.5'
                          : 'text-gray-400'
                      }`}
                    >
                      {seg.text}{' '}
                    </span>
                  );
                })}
                {transcribing && (
                  <span className="inline-flex items-center gap-1 text-brand-300 text-xs ml-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection hint */}
      {!collapsed && selectedText && (
        <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/40 flex items-center justify-between gap-2">
          <p className="text-xs text-yellow-300 truncate flex-1">
            "{selectedText.substring(0, 60)}{selectedText.length > 60 ? '…' : ''}"
          </p>
          <button
            onClick={takeScreenshot}
            disabled={screenshotting}
            className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            Salvar como imagem
          </button>
        </div>
      )}
    </div>
  );
}
