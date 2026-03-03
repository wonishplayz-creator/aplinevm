import { useEffect, useRef, useState, useCallback } from 'react';
import v86WasmUrl from 'v86/build/v86.wasm?url';

interface V86Options {
  wasm_path?: string;
  memory_size: number;
  vga_memory_size: number;
  screen_container: HTMLElement;
  bios: { url: string };
  vga_bios: { url: string };
  cdrom?: { url: string };
  hda?: { url: string; async?: boolean; size?: number };
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROXY_BASE = `${SUPABASE_URL}/functions/v1/vm-image-proxy`;

const BIOS_URL = `${PROXY_BASE}?image=bios`;
const VGA_BIOS_URL = `${PROXY_BASE}?image=vgabios`;
const LINUX_IMAGE_URL = `${PROXY_BASE}?image=alpine`;

export const V86Emulator = () => {
  const screenRef = useRef<HTMLDivElement>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Auto-focus the screen container so keyboard input works immediately
  const focusScreen = useCallback(() => {
    const canvas = screenRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
    } else {
      screenRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let V86Constructor: new (options: V86Options) => V86Instance;

    const loadV86 = async () => {
      try {
        setLoadingStatus('Loading v86 emulator...');
        setLoadingProgress(10);

        const v86Module = await import('v86');
        V86Constructor = v86Module.V86 || v86Module.default;

        if (!V86Constructor) {
          throw new Error('Could not find V86 constructor in module');
        }

        if (!mounted || !screenRef.current) return;

        setLoadingStatus('Initializing VM...');
        setLoadingProgress(30);

        const screenContainer = screenRef.current;
        screenContainer.innerHTML = '';

        const screenDiv = document.createElement('div');
        screenDiv.style.width = '100%';
        screenDiv.style.height = '100%';
        screenContainer.appendChild(screenDiv);

        setLoadingStatus('Starting Linux VM...');
        setLoadingProgress(50);

        const wasmPath = v86WasmUrl;

        const emulator = new V86Constructor({
          wasm_path: wasmPath,
          memory_size: 256 * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          screen_container: screenContainer,
          bios: { url: BIOS_URL },
          vga_bios: { url: VGA_BIOS_URL },
          cdrom: { url: LINUX_IMAGE_URL },
          autostart: true,
        });

        emulatorRef.current = emulator;

        emulator.add_listener('emulator-ready', () => {
          console.log('V86 Emulator ready');
          setLoadingProgress(80);
          setLoadingStatus('Booting...');
        });

        emulator.add_listener('screen-set-mode', () => {
          if (mounted) {
            setLoadingProgress(100);
            setIsLoading(false);
            setLoadingStatus('Running');
            // Focus the canvas for keyboard input
            setTimeout(focusScreen, 100);
          }
        });

        // Fallback: hide loading after timeout
        setTimeout(() => {
          if (mounted && isLoading) {
            setIsLoading(false);
            setLoadingStatus('Running');
            setTimeout(focusScreen, 100);
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
  }, [focusScreen]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-500">VM Error</p>
          <p className="mt-2 text-sm text-red-400">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Try refreshing the page or check your network connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black" onClick={focusScreen}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <p className="text-green-500 text-sm font-medium">{loadingStatus}</p>
          <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-gray-500 mt-4 max-w-xs text-center text-xs">
            Downloading and booting Linux... This may take 30-60 seconds.
          </p>
        </div>
      )}
      <div
        ref={screenRef}
        tabIndex={0}
        className="h-full w-full outline-none [&>div]:h-full [&>div]:w-full [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-contain [&_canvas]:outline-none"
        style={{
          display: isLoading ? 'none' : 'block',
          imageRendering: 'pixelated',
          cursor: 'default',
        }}
      />
    </div>
  );
};

export default V86Emulator;
