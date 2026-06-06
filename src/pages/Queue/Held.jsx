import { ArrowBack } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { Colors } from '../../theme/index';

const PAGE_SIZE = 20;

export default function Held() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals-held', page],
    queryFn: () => queueApi.held({ page, limit: PAGE_SIZE }),
  });
  const items = data?.items ?? [];
  const total = data?.pagination?.total ?? items.length;
  const hasMore = items.length === PAGE_SIZE;

  const reject = async (id) => {
    if (!window.confirm('Reject this message?')) return;
    try {
      setRejectingId(id);
      await queueApi.reject(id, { reason: 'rejected by reviewer', by: user?.email || user?.username || 'unknown' });
      setEditingId(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
    } catch {
    } finally {
      setRejectingId(null);
    }
  };

  const saveEdit = async (id) => {
    if (!editDraft.trim()) return;
    try {
      setSavingId(id);
      await queueApi.updateBody(id, { body: editDraft.trim(), by: user?.email || user?.username || 'unknown' });
      setEditingId(null);
      setEditDraft('');
      refetch();
      setSnack({ open: true, msg: 'Message updated', severity: 'success' });
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not save', severity: 'error' });
    } finally {
      setSavingId(null);
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
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            {total > 0 ? `${total} messages` : `${items.length} messages`}
          </Typography>
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
          <>
            {items.map(item => {
              const isEditing = editingId === item._id;
              return (
                <Paper key={item._id} elevation={0} sx={{ mb: 1.5, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: Colors.navy }}>
                      {item.clientName || item.clientCode}
                    </Typography>
                    {item.deliveryError && (
                      <Chip label={item.deliveryError} size="small" sx={{ fontSize: '0.5625rem', bgcolor: Colors.warning + '18', color: Colors.warning, border: `1px solid ${Colors.warning}40`, maxWidth: 200 }} />
                    )}
                  </Box>

                  {isEditing ? (
                    <TextField
                      fullWidth multiline minRows={3}
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      size="small"
                      sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.875rem' } }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 1.5, whiteSpace: 'pre-wrap' }}
                      style={{ WebkitLineClamp: 4, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                      {item.body}
                    </Typography>
                  )}

                  {canWrite && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {isEditing ? (
                        <>
                          <Button size="small" variant="outlined" onClick={() => { setEditingId(null); setEditDraft(''); }}
                            sx={{ flex: 1, borderColor: Colors.border, color: Colors.textSecondary }}>
                            Cancel
                          </Button>
                          <Button size="small" variant="contained" onClick={() => saveEdit(item._id)} disabled={savingId === item._id}
                            sx={{ flex: 2, bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight } }}>
                            {savingId === item._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Save Edit'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="small" variant="outlined" onClick={() => { setEditingId(item._id); setEditDraft(item.body || ''); }}
                            sx={{ flex: 1, borderColor: Colors.border, color: Colors.textSecondary }}>
                            Edit
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => reject(item._id)} disabled={rejectingId === item._id}
                            sx={{ flex: 1, borderColor: Colors.danger, color: Colors.danger }}>
                            {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
                          </Button>
                        </>
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })}

            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Button variant="outlined" onClick={() => setPage(p => p + 1)}
                  sx={{ borderColor: Colors.border, color: Colors.textSecondary }}>
                  Load more
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
