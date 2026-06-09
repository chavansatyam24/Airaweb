import { ArrowBack, Timer } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { queueApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { Colors } from '../../theme/index';

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

export default function Held() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();
  const [editingId, setEditingId] = useState(null);
  const [draftBody, setDraftBody] = useState('');
  const [editorReason, setEditorReason] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const loaderRef = useRef(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['approvals-held'],
    queryFn: ({ pageParam = 1 }) => queueApi.held({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  const items = useMemo(() => {
    const all = data?.pages.flatMap(p => p.items) ?? [];
    const seen = new Set();
    return all.filter(item => { if (seen.has(item._id)) return false; seen.add(item._id); return true; });
  }, [data?.pages]);

  const total = data?.pages[0]?.pagination?.total ?? items.length;

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const invalidate = () => {
    qc.resetQueries({ queryKey: ['approvals-held'] });
    qc.invalidateQueries({ queryKey: ['approval-queue'] });
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this message? It will not be sent to the client.')) return;
    try {
      setRejectingId(id);
      await queueApi.reject(id, { reason: 'rejected by reviewer', by: user?.email || user?.username || 'unknown' });
      invalidate();
    } catch {
    } finally {
      setRejectingId(null);
    }
  };

  const cancelEdit = () => { setEditingId(null); setDraftBody(''); setEditorReason(''); };

  const saveEdit = async (id) => {
    if (!draftBody.trim()) return;
    try {
      setSavingId(id);
      await queueApi.updateBody(id, { body: draftBody.trim(), by: user?.email || user?.username || 'unknown' });
      cancelEdit();
      invalidate();
      setSnack({ open: true, msg: 'Message updated', severity: 'success' });
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not save', severity: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Held Messages
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.18em', fontFamily: MONO, mt: 0.25 }}>
            DELIVERY DELAYED
          </Typography>
        </Box>
        {total > 0 && (
          <Box sx={{ bgcolor: Colors.warning + '25', borderRadius: '99px', border: `1px solid ${Colors.warning}50`, px: 1.25, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Timer sx={{ fontSize: 12, color: Colors.warning }} />
            <Typography sx={{ color: Colors.warning, fontSize: '0.75rem', fontWeight: 700, fontFamily: MONO }}>
              {total}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── List ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>✓</Typography>
            <Typography variant="h2" sx={{ color: Colors.navy, mb: 0.5 }}>No held messages</Typography>
            <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>All messages delivered on schedule</Typography>
          </Box>
        ) : (
          <>
            {items.map(item => {
              const isEditing = editingId === item._id;
              return (
                <Paper key={item._id} elevation={0} sx={{ mb: '14px', p: 2, bgcolor: '#fff', border: `1px solid ${Colors.border}`, borderRadius: '14px' }}>

                  {/* ── Head: name + tier + view thread ── */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 500, color: Colors.navy, letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                          {item.clientName || item.clientCode || 'Client'}
                        </Typography>
                        {item.clientTier && <TierBadge tier={item.clientTier} size={18} />}
                      </Box>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: Colors.textMuted, letterSpacing: '0.05em', mt: 0.35 }}>
                        {item.channel || 'whatsapp'} · held
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() => navigate(`/client/${item.clientCode}?conversationId=${item._id}&clientName=${encodeURIComponent(item.clientName || '')}`)}
                      sx={{ height: 22, fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, fontFamily: MONO, letterSpacing: '0.04em', p: '2px 8px', minWidth: 0, border: `1px solid ${Colors.gold}50`, borderRadius: '6px', flexShrink: 0 }}
                    >
                      VIEW THREAD
                    </Button>
                  </Box>

                  {/* ── Delivery error banner ── */}
                  {item.deliveryError && (
                    <Box sx={{ bgcolor: Colors.warning + '12', borderLeft: `3px solid ${Colors.warning}`, borderRadius: '0 8px 8px 0', px: '14px', py: '8px', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timer sx={{ fontSize: 13, color: Colors.warning, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.75rem', color: Colors.warning, fontWeight: 600, lineHeight: 1.4 }}>
                        {item.deliveryError}
                      </Typography>
                    </Box>
                  )}

                  {/* ── Aira will send ── */}
                  <Box sx={{ bgcolor: Colors.cardAlt, borderLeft: '3px solid', borderColor: Colors.gold, borderRadius: '0 8px 8px 0', px: '14px', py: '12px', mb: 1.5 }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.15em', mb: 0.75 }}>
                      AIRA WILL SEND
                    </Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth multiline minRows={3}
                        value={draftBody}
                        onChange={e => setDraftBody(e.target.value)}
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.8125rem' } }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {item.body}
                      </Typography>
                    )}
                  </Box>

                  {/* ── Actions ── */}
                  {canWrite && (
                    isEditing ? (
                      <Stack gap={1.5}>
                        <TextField
                          fullWidth size="small"
                          placeholder="Reason for edit (optional)"
                          value={editorReason}
                          onChange={e => setEditorReason(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.8125rem' } }}
                        />
                        <Box sx={{ display: 'flex', gap: '6px' }}>
                          <Button fullWidth variant="outlined" onClick={cancelEdit}
                            sx={{ flex: 1, py: 1, borderColor: Colors.border, color: Colors.textSecondary, fontSize: '0.75rem', fontWeight: 600 }}>
                            Cancel
                          </Button>
                          <Button fullWidth variant="contained" onClick={() => saveEdit(item._id)} disabled={savingId === item._id}
                            sx={{ flex: 2, py: 1, bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight }, fontSize: '0.75rem', fontWeight: 700 }}>
                            {savingId === item._id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save Edit'}
                          </Button>
                        </Box>
                      </Stack>
                    ) : (
                      <Box sx={{ display: 'flex', gap: '6px' }}>
                        <Button fullWidth variant="outlined" onClick={() => reject(item._id)} disabled={rejectingId === item._id}
                          sx={{ flex: 1, borderColor: Colors.danger, color: Colors.danger, fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px' }}>
                          {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
                        </Button>
                        {!item.metadata?.templateName && (
                          <Button fullWidth variant="outlined"
                            onClick={() => { setEditingId(item._id); setDraftBody(item.body || ''); setEditorReason(''); }}
                            sx={{ flex: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px' }}>
                            Edit
                          </Button>
                        )}
                      </Box>
                    )
                  )}
                </Paper>
              );
            })}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
            </div>
          </>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
