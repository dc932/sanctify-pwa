import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loadingSession: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loadingSession: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    // Obtener la sesión actual al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // Escuchar cambios de autenticación en tiempo real (login, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loadingSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir la sesión en cualquier componente hijo fácilmente
export const useAuth = () => useContext(AuthContext);