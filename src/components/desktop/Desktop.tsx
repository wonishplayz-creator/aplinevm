import { useState } from 'react';
import { Terminal, FileText, Folder, Settings } from 'lucide-react';
import VMWindow from '../vm/VMWindow';
import Taskbar from './Taskbar';

interface DesktopIcon {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

export const Desktop = () => {
  const [isVMOpen, setIsVMOpen] = useState(false);
  const [isVMMinimized, setIsVMMinimized] = useState(false);

  const desktopIcons: DesktopIcon[] = [
    {
      id: 'vm',
      icon: <Terminal className="h-8 w-8" />,
      label: 'Linux VM',
      action: () => {
        setIsVMOpen(true);
        setIsVMMinimized(false);
      },
    },
    {
      id: 'files',
      icon: <Folder className="h-8 w-8" />,
      label: 'Files',
      action: () => {},
    },
    {
      id: 'readme',
      icon: <FileText className="h-8 w-8" />,
      label: 'README',
      action: () => {},
    },
    {
      id: 'settings',
      icon: <Settings className="h-8 w-8" />,
      label: 'Settings',
      action: () => {},
    },
  ];

  const handleOpenVM = () => {
    setIsVMOpen(true);
    setIsVMMinimized(false);
  };

  const handleCloseVM = () => {
    setIsVMOpen(false);
    setIsVMMinimized(false);
  };

  const handleMinimizeVM = () => {
    setIsVMMinimized(true);
  };

  const handleVMTaskbarClick = () => {
    setIsVMMinimized(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-desktop">
      {/* Wallpaper gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />

      {/* Desktop icons */}
      <div className="relative z-10 flex flex-col flex-wrap gap-2 p-4 pb-16">
        {desktopIcons.map((item) => (
          <button
            key={item.id}
            onDoubleClick={item.action}
            className="group flex w-20 flex-col items-center gap-1 rounded-lg p-2 text-foreground transition-colors hover:bg-accent/50 focus:bg-accent/50 focus:outline-none"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-card/80 shadow-sm transition-transform group-hover:scale-105">
              {item.icon}
            </div>
            <span className="text-xs font-medium text-center leading-tight drop-shadow-sm">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* VM Window */}
      {isVMOpen && !isVMMinimized && (
        <VMWindow onClose={handleCloseVM} onMinimize={handleMinimizeVM} />
      )}

      {/* Taskbar */}
      <Taskbar
        onOpenVM={handleOpenVM}
        isVMOpen={isVMOpen}
        onVMClick={handleVMTaskbarClick}
      />
    </div>
  );
};

export default Desktop;
