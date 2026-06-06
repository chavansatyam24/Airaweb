import { create } from 'zustand';
import { permissionsApi } from '../api/index';

function getSubRight(data, subMenu) {
  if (!data) return undefined;
  for (const right of data.rights) {
    const sub = right.subRights.find(s => s.subMenu === subMenu);
    if (sub) return sub;
  }
  return undefined;
}

export const usePermissionsStore = create((set) => ({
  data: null,
  isLoading: false,
  ready: false,

  fetchPermissions: async () => {
    set({ isLoading: true });
    try {
      const res = await permissionsApi.fetch();
      set({ data: res.data ?? null, isLoading: false, ready: true });
    } catch {
      set({ isLoading: false, ready: true });
    }
  },

  clear: () => set({ data: null, isLoading: false, ready: false }),
}));

export const usePermissionsReady = () => usePermissionsStore(s => s.ready);
export const usePermissionsLoading = () => usePermissionsStore(s => s.isLoading);

export const useHasAppAccess = () =>
  usePermissionsStore(s => {
    if (!s.ready) return false;
    if (!s.data) return true;
    if (s.data.isAdmin) return true;
    const sub = getSubRight(s.data, 'Aira App Access');
    return sub?.enabled ?? false;
  });

export const useCanAccess = (subMenu) =>
  usePermissionsStore(s => {
    if (!s.ready) return false;  // still loading — hide until known
    if (!s.data) return true;    // fetch failed — allow (graceful degradation)
    if (s.data.isAdmin) return true;
    const sub = getSubRight(s.data, subMenu);
    return sub?.enabled ?? false;
  });

export const useHasPermission = (subMenu, key) =>
  usePermissionsStore(s => {
    if (!s.ready) return false;
    if (!s.data) return true;
    if (s.data.isAdmin) return true;
    const sub = getSubRight(s.data, subMenu);
    if (!sub?.enabled) return false;
    const perm = sub.permissions?.find(p => p.key === key);
    return perm?.allowed ?? false;
  });

export const useFirstAccessibleTab = () =>
  usePermissionsStore(s => {
    if (!s.data) return '/queue';
    const isAdmin = s.data.isAdmin;
    const can = (subMenu) => {
      if (isAdmin) return true;
      return getSubRight(s.data, subMenu)?.enabled ?? false;
    };
    if (can('Home')) return '/queue';
    if (can('Client')) return '/clients';
    if (can('Promise')) return '/promises';
    if (can('dispute')) return '/disputes';
    if (can('Unfix')) return '/unfix';
    return '/settings';
  });
