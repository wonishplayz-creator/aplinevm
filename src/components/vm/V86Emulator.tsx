import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    V86Starter: new (options: V86Options) => V86Instance;
  }
}

interface V86Options {
  wasm_path: string;
  memory_size: number;
  vga_memory_size: number;
  screen_container: HTMLElement;
  bios: { url: string };
  vga_bios: { url: string };
  cdrom?: { url: string };
  hda?: { url: string; async?: boolean };
  fda?: { url: string };
  bzimage?: { url: string };
  initrd?: { url: string };
  cmdline?: string;
  autostart: boolean;
  disable_keyboard?: boolean;
  disable_mouse?: boolean;
}

interface V86Instance {
  add_listener: (event: string, callback: (data: string) => void) => void;
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

export const V86Emulator = ({ onStatusChange, onReady }: V86EmulatorProps) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback((status: string) => {
    setLoadingStatus(status);
    onStatusChange?.(status);
  }, [onStatusChange]);

  useEffect(() => {
    let mounted = true;

    const loadV86 = async () => {
      try {
        updateStatus('Loading v86 emulator...');
        
        // Load v86 script from CDN
        if (!window.V86Starter) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/v86@latest/build/libv86.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load v86'));
            document.head.appendChild(script);
          });
        }

        if (!mounted || !screenRef.current) return;

        updateStatus('Starting virtual machine...');

        // Use a lightweight Linux image - Buildroot Linux
        const emulator = new window.V86Starter({
          wasm_path: 'https://cdn.jsdelivr.net/npm/v86@latest/build/v86.wasm',
          memory_size: 128 * 1024 * 1024, // 128MB RAM
          vga_memory_size: 8 * 1024 * 1024, // 8MB VRAM
          screen_container: screenRef.current,
          bios: {
            url: 'https://cdn.jsdelivr.net/npm/v86@latest/bios/seabios.bin',
          },
          vga_bios: {
            url: 'https://cdn.jsdelivr.net/npm/v86@latest/bios/vgabios.bin',
          },
          // Using the v86 demo Linux image (Buildroot)
          cdrom: {
            url: 'https://i.copy.sh/linux4.iso',
          },
          autostart: true,
        });

        emulatorRef.current = emulator;

        // Listen for serial output
        emulator.add_listener('serial0-output-byte', (byte: string) => {
          const char = String.fromCharCode(parseInt(byte as unknown as string));
          console.log(char);
        });

        // Wait a bit for boot
        setTimeout(() => {
          if (mounted) {
            setIsLoading(false);
            updateStatus('Running');
            onReady?.();
          }
        }, 2000);

      } catch (err) {
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
        emulatorRef.current.destroy();
      }
    };
  }, [updateStatus, onReady]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-vm-screen">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold">VM Error</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-vm-screen">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-vm-screen">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-vm-text border-t-transparent" />
          <p className="text-vm-text text-sm">{loadingStatus}</p>
          <p className="text-vm-text/60 mt-2 text-xs">
            Downloading Linux image (~20MB)...
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
