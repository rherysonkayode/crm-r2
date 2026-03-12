// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Carregar tema do usuário ao iniciar
  useEffect(() => {
    loadUserTheme();
  }, [user]);

  // Aplicar tema ao HTML quando mudar
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const loadUserTheme = async () => {
    try {
      if (user) {
        // Buscar tema do usuário no banco
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();

        if (profile?.theme) {
          setThemeState(profile.theme as Theme);
        } else {
          // Se não tiver tema salvo, usar preferência do sistema
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setThemeState(systemPrefersDark ? 'dark' : 'light');
        }
      } else {
        // Usuário não logado: tentar do localStorage
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
          setThemeState(savedTheme);
        } else {
          // Detectar preferência do sistema
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setThemeState(systemPrefersDark ? 'dark' : 'light');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (newTheme: Theme) => {
    // Aplicar classe no HTML
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Salvar no localStorage como fallback
    localStorage.setItem('theme', newTheme);
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Salvar no banco se usuário estiver logado
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', user.id);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}