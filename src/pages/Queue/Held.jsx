import { ArrowBack, Close } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { Colors } from '../../theme/index';

export default function Held() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();
  const [rejectingId, setRejectingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals-held'],
    queryFn: () => queueApi.held({ page: 1, limit: 50 }),
  });
  const items = data?.items ?? [];

  const reject = async (id) => {
    if (!window.confirm('Reject this message?')) return;
    try {
      setRejectingId(id);
      await queueApi.reject(id, { reason: 'rejected by reviewer', by: user?.email || user?.username || 'unknown' });
      refetch();
    } catch {
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}>Held Messages</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{items.length} messages</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>✓</Typography>
            <Typography variant="h3" sx={{ color: Colors.navy }}>No held messages</Typography>
          </Box>
        ) : (
          items.map(item => (
            <Paper key={item._id} elevation={0} sx={{ mb: 1.5, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: Colors.navy }}>
                  {item.clientName || item.clientCode}
                </Typography>
                {item.deliveryError && (
                  <Chip label={item.deliveryError} size="small" sx={{ fontSize: '0.5625rem', bgcolor: Colors.warning + '18', color: Colors.warning, border: `1px solid ${Colors.warning}40`, maxWidth: 200 }} />
                )}
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 1.5, whiteSpace: 'pre-wrap' }} style={{ WebkitLineClamp: 4, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {item.body}
              </Typography>
              {canWrite && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => reject(item._id)} disabled={rejectingId === item._id}
                    sx={{ flex: 1, borderColor: Colors.danger, color: Colors.danger }}>
                    {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
                  </Button>
                </Box>
              )}
            </Paper>
          ))
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
