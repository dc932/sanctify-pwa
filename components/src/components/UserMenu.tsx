import { useCallback, useEffect, useRef, useState } from 'react';
import { User, Settings, LogOut, ChevronDown, Sparkles, Share2, Check } from 'lucide-react';
import { supabase } from '@/supabase';
import SettingsModal, { type SettingsTab } from '@/components/settings/SettingsModal';

interface UserMenuProps {
  session: any;
  onLogout: () => void;
  isApprovedCreator: boolean;
  onOpenCreatorFlow: () => void;
}

export default function UserMenu({ session, onLogout, isApprovedCreator, onOpenCreatorFlow }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');

  const closeSettings = useCallback(() => setSettingsTab(null), []);
  const handleProfileSaved = useCallback((profile: { fullName: string; avatarUrl: string }) => {
    setFullName(profile.fullName);
    setAvatarUrl(profile.avatarUrl);
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo cargar el perfil:', error);
      }
      setFullName(data?.full_name || session.user.user_metadata?.full_name || '');
      setAvatarUrl(data?.avatar_url || session.user.user_metadata?.avatar_url || '');
    };

    loadProfile();
  }, [session]);

  const handleShareApp = async () => {
    const appUrl = window.location.origin;
    const shareData = {
      title: 'Sanctify',
      text: 'Descubre Sanctify, tu vida espiritual sonorizada.',
      url: appUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error al compartir:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error al copiar enlace', err);
      }
    }
  };

  const fullDisplayName = fullName || session?.user?.email?.split('@')[0] || 'Usuario';
  const shortFirstName = fullDisplayName.split(' ')[0].split('@')[0];

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullDisplayName} className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3CC8F5]/20 text-[#3CC8F5]">
            <User className="h-3 w-3" />
          </div>
        )}
        <span className="max-w-[70px] truncate">{shortFirstName}</span>
        <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />

          <div
            ref={menuRef}
            className="fixed right-4 top-16 z-[999] w-60 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151517] p-1.5 shadow-2xl animate-in fade-in zoom-in-95"
          >
            <div className="border-b border-zinc-200 dark:border-zinc-800/80 px-3 py-2.5 mb-1">
              <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">{fullDisplayName}</p>
              <p className="truncate text-[10px] text-zinc-500">{session?.user?.email}</p>
            </div>

            <div className="py-1 space-y-0.5">
              {isApprovedCreator ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreatorFlow();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#E0B95B] transition-colors hover:bg-[#E0B95B]/10 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  Creator Studio
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreatorFlow();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#3CC8F5] transition-colors hover:bg-[#3CC8F5]/10 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  Quiero ser Autor-Sanctify
                </button>
              )}

              <button
                onClick={() => {
                  handleShareApp();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-[#3CC8F5]" />}
                <span>{copied ? '¡Enlace copiado!' : 'Compartir aplicación'}</span>
              </button>

              <button
                onClick={() => openSettings('account')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <User className="h-4 w-4 text-[#3CC8F5]" />
                Cuenta y Perfil
              </button>

              <button
                onClick={() => openSettings('playback')}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <Settings className="h-4 w-4 text-[#3CC8F5]" />
                Ajustes
              </button>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-1 mt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-500 dark:text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {settingsTab && (
        <SettingsModal
          initialTab={settingsTab}
          session={session}
          fullName={fullName}
          avatarUrl={avatarUrl}
          onProfileSaved={handleProfileSaved}
          onLogout={onLogout}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
