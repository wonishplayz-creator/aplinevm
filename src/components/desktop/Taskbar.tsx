import { Monitor, Terminal, Folder, Settings, Wifi, Battery, Volume2 } from 'lucide-react';

interface TaskbarProps {
  onOpenVM: () => void;
  isVMOpen: boolean;
  onVMClick: () => void;
}

export const Taskbar = ({ onOpenVM, isVMOpen, onVMClick }: TaskbarProps) => {
  const currentTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const currentDate = new Date().toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-t border-border bg-card/95 px-2 backdrop-blur-md">
      {/* Start / Apps */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenVM}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          title="Launch Linux VM"
        >
          <Terminal className="h-5 w-5 text-primary" />
        </button>
        
        <div className="mx-2 h-6 w-px bg-border" />
        
        {/* Open windows */}
        {isVMOpen && (
          <button
            onClick={onVMClick}
            className="flex h-9 items-center gap-2 rounded-md bg-accent px-3 transition-colors hover:bg-accent/80"
          >
            <span className="text-xs">🐧</span>
            <span className="text-sm text-foreground">Linux VM</span>
          </button>
        )}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-3 pr-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wifi className="h-4 w-4" />
          <Volume2 className="h-4 w-4" />
          <Battery className="h-4 w-4" />
        </div>
        <div className="mx-2 h-6 w-px bg-border" />
        <div className="flex flex-col items-end text-xs text-foreground">
          <span>{currentTime}</span>
          <span className="text-muted-foreground">{currentDate}</span>
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
