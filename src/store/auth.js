import { create } from 'zustand';
import { authApi } from '../api/index';

export const useAuth = create((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.login(username, password);
      localStorage.setItem('pooja_auth_token', token);
      localStorage.setItem('pooja_user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('pooja_auth_token');
    localStorage.removeItem('pooja_user');
    set({ user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    set({ isLoading: true });
    try {
      const userStr = localStorage.getItem('pooja_user');
      const token = localStorage.getItem('pooja_auth_token');
      if (userStr && token) {
        set({ user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export const useCanWrite = () => {
  const user = useAuth(s => s.user);
  return user?.role === 'admin' || user?.role === 'accounts' || true;
};

export const useIsAdmin = () => {
  const user = useAuth(s => s.user);
  return user?.role === 'admin' || true;
};
