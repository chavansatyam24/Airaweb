import { Box, CircularProgress } from '@mui/material';
import { Navigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { useAuth } from '../store/auth';
import { Colors } from '../theme/index';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuth(s => s.isAuthenticated);
  const isLoading = useAuth(s => s.isLoading);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: Colors.bg }}>
        <CircularProgress sx={{ color: Colors.gold }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <PageWrapper>{children}</PageWrapper>;
}
