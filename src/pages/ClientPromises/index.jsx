import { ArrowBack, Delete } from '@mui/icons-material';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { promiseApi } from '../../api/index';
import { formatDate, relativeTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const statusColor = { active: Colors.warning, honoured: Colors.success, broken: Colors.danger, partial: Colors.info };

export default function ClientPromises() {
  const { clientCode } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'active';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['promises', 'list', status, clientCode],
    queryFn: () => promiseApi.list({ status, clientCode }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => promiseApi.delete(id),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['promises', 'stats'] }); setSnack({ open: true, msg: 'Promise deleted', severity: 'success' }); },
    onError: () => setSnack({ open: true, msg: 'Could not delete', severity: 'error' }),
  });

  const items = data?.items ?? [];

  const handleDelete = (id) => {
    if (!window.confirm('Delete this promise?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}>{clientCode}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{status} promises · {items.length}</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ color: Colors.textMuted }}>No {status} promises for this client</Typography>
          </Box>
        ) : (
          items.map(item => (
            <Paper key={item._id} elevation={0} sx={{ mb: 1.5, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={item.status} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: (statusColor[item.status] || Colors.textMuted) + '18', color: statusColor[item.status] || Colors.textMuted, border: `1px solid ${(statusColor[item.status] || Colors.textMuted)}40` }} />
                  <Chip label={item.promiseType} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600, bgcolor: Colors.cardAlt, color: Colors.textSecondary }} />
                </Box>
                <IconButton size="small" sx={{ color: Colors.danger, mt: -0.5, mr: -0.5 }} onClick={() => handleDelete(item._id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
              {item.promiseText && (
                <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, mb: 1, lineHeight: 1.5 }}>{item.promiseText}</Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {item.expectedDate && (
                  <Box>
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em' }}>EXPECTED DATE</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, fontWeight: 600 }}>{formatDate(item.expectedDate)}</Typography>
                  </Box>
                )}
                {item.expectedAmount && (
                  <Box>
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em' }}>AMOUNT</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: Colors.navy, fontWeight: 700 }}>₹{item.expectedAmount}</Typography>
                  </Box>
                )}
                <Box sx={{ ml: 'auto' }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted }}>{relativeTime(item.createdAt)}</Typography>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
