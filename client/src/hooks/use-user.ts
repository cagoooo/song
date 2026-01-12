import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signIn, signOut, onAuthChange, type AppUser } from '@/lib/auth';

type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (userData: { username: string; password: string }): Promise<RequestResult> => {
    try {
      // Firebase Auth 使用 email，這裡將 username 作為 email 使用
      // 如果 username 不含 @，則附加 @admin.local
      const email = userData.username.includes('@')
        ? userData.username
        : `${userData.username}@admin.local`;

      await signIn(email, userData.password);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message || '登入失敗' };
    }
  }, [queryClient]);

  const logout = useCallback(async (): Promise<RequestResult> => {
    try {
      await signOut();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message || '登出失敗' };
    }
  }, [queryClient]);

  return {
    user,
    isLoading,
    error,
    login,
    logout,
  };
}
