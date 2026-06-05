import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index';
import { useAuth } from './store/auth';
import { usePermissionsStore } from './store/permissions';
import theme from './theme/index';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate({ children }) {
  const loadFromStorage = useAuth(s => s.loadFromStorage);
  const isAuthenticated = useAuth(s => s.isAuthenticated);
  const fetchPermissions = usePermissionsStore(s => s.fetchPermissions);
  const clearPermissions = usePermissionsStore(s => s.clear);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPermissions();
    } else {
      clearPermissions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => {
      useAuth.getState().logout();
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
