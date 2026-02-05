import { useEffect, useRef, useState, useCallback } from 'react';
// Import WASM from node_modules
import v86WasmUrl from 'v86/build/v86.wasm?url';

// v86 types
interface V86Options {
  wasm_path?: string;
  wasm_fn?: (options: { env: Record<string, unknown> }) => Promise<WebAssembly.Instance>;
  memory_size: number;
  vga_memory_size: number;
  screen_container: HTMLElement;
  bios: { url: string };
  vga_bios: { url: string };
  cdrom?: { url: string };
  hda?: { url: string; async?: boolean; size?: number };
  fda?: { url: string };
  bzimage?: { url: string };
  initrd?: { url: string };
  cmdline?: string;
  autostart: boolean;
  disable_keyboard?: boolean;
  disable_mouse?: boolean;
  network_relay_url?: string;
}

interface V86Instance {
  add_listener: (event: string, callback: (data: unknown) => void) => void;
  serial0_send: (data: string) => void;
  keyboard_send_scancodes: (codes: number[]) => void;
  destroy: () => void;
  stop: () => void;
  restart: () => void;
  run: () => void;
  is_running: () => boolean;
}

interface V86EmulatorProps {
  onStatusChange?: (status: string) => void;
  onReady?: () => void;
}

// Use our edge function proxy for CORS-free access to v86 resources
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROXY_BASE = `${SUPABASE_URL}/functions/v1/vm-image-proxy`;

const BIOS_URL = `${PROXY_BASE}?image=bios`;
const VGA_BIOS_URL = `${PROXY_BASE}?image=vgabios`;
const WASM_URL = `${PROXY_BASE}?image=wasm`;
const LINUX_IMAGE_URL = `${PROXY_BASE}?image=linux`;

export const V86Emulator = ({ onStatusChange, onReady }: V86EmulatorProps) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const updateStatus = useCallback((status: string) => {
    setLoadingStatus(status);
    onStatusChange?.(status);
  }, [onStatusChange]);

  useEffect(() => {
    let mounted = true;
    let V86Constructor: new (options: V86Options) => V86Instance;

    const loadV86 = async () => {
      try {
        updateStatus('Loading v86 emulator...');
        setLoadingProgress(10);

        // Dynamically import v86 from the npm package
        const v86Module = await import('v86');
        // The module exports V86 as both default and named export
        V86Constructor = v86Module.V86 || v86Module.default;

        if (!V86Constructor) {
          console.error('V86 module exports:', Object.keys(v86Module));
          throw new Error('Could not find V86 constructor in module');
        }

        if (!mounted || !screenRef.current) return;

        updateStatus('Initializing VM...');
        setLoadingProgress(30);

        // Create the screen container structure that v86 expects
        const screenContainer = screenRef.current;
        
        // Clear any existing content
        screenContainer.innerHTML = '';
        
        // Create the required child div for the canvas
        const screenDiv = document.createElement('div');
        screenDiv.style.width = '100%';
        screenDiv.style.height = '100%';
        screenContainer.appendChild(screenDiv);

        updateStatus('Starting Linux VM...');
        setLoadingProgress(50);

        // Use WASM from bundled node_modules or proxy
        // Try bundled first, fall back to proxy
        const wasmPath = v86WasmUrl || WASM_URL;

        const emulator = new V86Constructor({
          wasm_path: wasmPath,
          memory_size: 128 * 1024 * 1024, // 128MB RAM
          vga_memory_size: 8 * 1024 * 1024, // 8MB VRAM
          screen_container: screenContainer,
          bios: { url: BIOS_URL },
          vga_bios: { url: VGA_BIOS_URL },
          cdrom: { url: LINUX_IMAGE_URL },
          autostart: true,
        });

        emulatorRef.current = emulator;

        // Listen for emulator ready event
        emulator.add_listener('emulator-ready', () => {
          console.log('V86 Emulator ready');
          setLoadingProgress(80);
          updateStatus('Booting...');
        });

        // Listen for screen updates to know when OS is running
        emulator.add_listener('screen-set-mode', () => {
          if (mounted) {
            setLoadingProgress(100);
            setIsLoading(false);
            updateStatus('Running');
            onReady?.();
          }
        });

        // Fallback: Hide loading after timeout
        setTimeout(() => {
          if (mounted && isLoading) {
            setIsLoading(false);
            updateStatus('Running');
            onReady?.();
          }
        }, 30000);

      } catch (err) {
        console.error('V86 Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to start VM');
          setIsLoading(false);
        }
      }
    };

    loadV86();

    return () => {
      mounted = false;
      if (emulatorRef.current) {
        try {
          emulatorRef.current.stop();
        } catch (e) {
          console.warn('Error stopping emulator:', e);
        }
      }
    };
  }, [updateStatus, onReady]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-vm-screen p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">VM Error</p>
          <p className="mt-2 text-sm text-destructive/80">{error}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Try refreshing the page or check your network connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-vm-screen">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-vm-screen">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-vm-text border-t-transparent" />
          <p className="text-vm-text text-sm font-medium">{loadingStatus}</p>
          <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-muted">
            <div 
              className="h-full bg-vm-text transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-vm-text/60 mt-4 max-w-xs text-center text-xs">
            Downloading and booting Linux... This may take 30-60 seconds depending on your connection.
          </p>
        </div>
      )}
      <div
        ref={screenRef}
        className="h-full w-full [&>div]:h-full [&>div]:w-full [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-contain"
        style={{ 
          display: isLoading ? 'none' : 'block',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
};

export default V86Emulator;
