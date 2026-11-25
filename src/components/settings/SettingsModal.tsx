import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, SlidersHorizontal, Bell, Palette } from 'lucide-react';
import AccountSettings from '@/components/settings/AccountSettings';
import PlaybackSettings from '@/components/settings/PlaybackSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';

export type SettingsTab = 'account' | 'playback' | 'notifications' | 'appearance';

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Cuenta', icon: User },
  { id: 'playback', label: 'Reproducción', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
];

interface SettingsModalProps {
  initialTab: SettingsTab;
  session: any;
  fullName: string;
  avatarUrl: string;
  onProfileSaved: (profile: { fullName: string; avatarUrl: string }) => void;
  onLogout: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  initialTab,
  session,
  fullName,
  avatarUrl,
  onProfileSaved,
  onLogout,
  onClose,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#121214] text-white shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabecera de la Modal */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6 shrink-0">
          <h2 className="text-base font-bold tracking-tight">Ajustes</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar ajustes"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pestañas de navegación adaptadas */}
        <div role="tablist" className="flex gap-1.5 overflow-x-auto border-b border-zinc-800 px-4 py-2 sm:px-6 shrink-0 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                title={label}
                className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isActive ? 'bg-[#3CC8F5] text-black shadow' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido dinámico con desplazamiento independiente */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === 'account' && (
            <AccountSettings
              session={session}
              fullName={fullName}
              avatarUrl={avatarUrl}
              onProfileSaved={onProfileSaved}
              onLogout={onLogout}
            />
          )}
          {activeTab === 'playback' && <PlaybackSettings />}
          {activeTab === 'notifications' && <NotificationSettings session={session} />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>,
    document.body
  );
}