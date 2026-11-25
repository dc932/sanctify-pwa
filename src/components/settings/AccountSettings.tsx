import { useState } from 'react';
import { KeyRound, LogOut, Monitor, Save, Loader2, User } from 'lucide-react';
import { supabase } from '@/supabase';

interface AccountSettingsProps {
  session: any;
  fullName: string;
  avatarUrl: string;
  onProfileSaved: (profile: { fullName: string; avatarUrl: string }) => void;
  onLogout: () => void;
}

type Feedback = { type: 'success' | 'error'; text: string } | null;

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#3CC8F5] transition-colors';

function FeedbackText({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role="status"
      className={`text-center text-xs font-medium animate-in fade-in ${
        feedback.type === 'success' ? 'text-[#3CC8F5]' : 'text-red-400'
      }`}
    >
      {feedback.text}
    </p>
  );
}

export default function AccountSettings({
  session,
  fullName,
  avatarUrl,
  onProfileSaved,
  onLogout,
}: AccountSettingsProps) {
  const [nameDraft, setNameDraft] = useState(fullName);
  const [avatarDraft, setAvatarDraft] = useState(avatarUrl);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = nameDraft.trim();
    const trimmedAvatar = avatarDraft.trim();

    if (trimmedAvatar && !/^https?:\/\//.test(trimmedAvatar)) {
      setProfileFeedback({ type: 'error', text: 'La foto debe ser un enlace que empiece por https://' });
      return;
    }

    setProfileBusy(true);
    setProfileFeedback(null);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: trimmedName,
      avatar_url: trimmedAvatar,
      updated_at: new Date().toISOString(),
    });
    setProfileBusy(false);

    if (error) {
      console.error('Error al guardar el perfil:', error);
      setProfileFeedback({ type: 'error', text: 'No pudimos guardar tu perfil. Inténtalo de nuevo.' });
      return;
    }

    onProfileSaved({ fullName: trimmedName, avatarUrl: trimmedAvatar });
    setProfileFeedback({ type: 'success', text: '¡Perfil guardado correctamente!' });
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordBusy(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);

    if (error) {
      console.error('Error al cambiar la contraseña:', error);
      setPasswordFeedback({ type: 'error', text: 'No pudimos cambiar la contraseña. Inténtalo de nuevo.' });
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ type: 'success', text: 'Contraseña actualizada con éxito.' });
  };

  const handleSignOutEverywhere = async () => {
    setSignOutBusy(true);
    setSignOutError('');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setSignOutBusy(false);

    if (error) {
      console.error('Error al cerrar las sesiones:', error);
      setSignOutError('No pudimos cerrar las sesiones. Inténtalo de nuevo.');
      return;
    }
    onLogout();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Sección de Perfil */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Perfil de usuario</h3>

        {/* Previsualización del Avatar */}
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            {avatarDraft ? (
              <img 
                src={avatarDraft} 
                alt="Avatar" 
                className="h-full w-full object-cover" 
                onError={(e) => {
                  // Fallback visual si el enlace de imagen falla
                  (e.target as HTMLElement).style.display = 'none';
                }} 
              />
            ) : (
              <User className="h-6 w-6 text-zinc-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{nameDraft || 'Sin nombre'}</p>
            <p className="text-[11px] text-zinc-500 truncate">{session?.user?.email}</p>
          </div>
        </div>

        <div>
          <label htmlFor="settings-name" className="block text-xs font-medium text-zinc-400">
            Nombre completo
          </label>
          <input
            id="settings-name"
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Tu nombre"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="settings-avatar" className="block text-xs font-medium text-zinc-400">
            Enlace de tu foto de perfil (URL)
          </label>
          <input
            id="settings-avatar"
            type="url"
            value={avatarDraft}
            onChange={(e) => setAvatarDraft(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="settings-email" className="block text-xs font-medium text-zinc-400">
            Correo electrónico (no editable)
          </label>
          <input
            id="settings-email"
            type="text"
            value={session?.user?.email || ''}
            disabled
            className="mt-1 w-full cursor-not-allowed rounded-xl border border-zinc-800/50 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-500"
          />
        </div>

        <FeedbackText feedback={profileFeedback} />

        <button
          type="submit"
          disabled={profileBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3CC8F5] py-3 text-xs font-bold text-black transition-all hover:bg-[#32b2dc] hover:scale-[1.01] disabled:opacity-50 cursor-pointer shadow-md shadow-[#3CC8F5]/10"
        >
          {profileBusy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando perfil...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Guardar perfil
            </>
          )}
        </button>
      </form>

      {/* Sección de Contraseña */}
      <form onSubmit={handleChangePassword} className="space-y-4 border-t border-zinc-800 pt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <KeyRound className="h-3.5 w-3.5 text-[#3CC8F5]" />
          Cambiar contraseña
        </h3>

        <div>
          <label htmlFor="settings-new-password" className="block text-xs font-medium text-zinc-400">
            Nueva contraseña
          </label>
          <input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="settings-confirm-password" className="block text-xs font-medium text-zinc-400">
            Repite la nueva contraseña
          </label>
          <input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
            className={inputClass}
          />
        </div>

        <FeedbackText feedback={passwordFeedback} />

        <button
          type="submit"
          disabled={passwordBusy || !newPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3 text-xs font-bold text-white transition-all hover:border-[#3CC8F5] hover:text-[#3CC8F5] disabled:opacity-50 cursor-pointer"
        >
          {passwordBusy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3CC8F5]" /> Actualizando...
            </>
          ) : (
            'Actualizar contraseña'
          )}
        </button>
      </form>

      {/* Sección de Sesiones */}
      <div className="space-y-3 border-t border-zinc-800 pt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Monitor className="h-3.5 w-3.5" />
          Sesiones activas
        </h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Cierra tu sesión en este dispositivo y en todos los demás equipos donde hayas iniciado sesión en Sanctify.
        </p>
        {signOutError && <p role="status" className="text-xs font-medium text-red-400">{signOutError}</p>}
        <button
          type="button"
          onClick={handleSignOutEverywhere}
          disabled={signOutBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
        >
          {signOutBusy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cerrando sesiones...
            </>
          ) : (
            <>
              <LogOut className="h-3.5 w-3.5" /> Cerrar sesión en todos los dispositivos
            </>
          )}
        </button>
      </div>
    </div>
  );
}