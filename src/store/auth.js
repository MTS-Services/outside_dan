import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuth = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession({ user, token }) {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout() {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'rr-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) localStorage.setItem('token', state.token);
      },
    },
  ),
);
