import { Check, Close, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { knowledgeApi } from '../../api/index';
import { useAuth } from '../../store/auth';
import { relativeTime } from '../../utils/format';
import { Colors } from '../../theme/index';

export default function StyleReview() {
  const user = useAuth(s => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const loaderRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['knowledge', 'pattern', 'pending_review', debouncedSearch],
    queryFn: ({ pageParam = 1 }) => knowledgeApi.list({ type: 'pattern', status: 'pending_review', search: debouncedSearch || undefined, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap(p => p.items ?? p.data ?? []) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? items.length;

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApprove = async (id) => {
    try {
      setApprovingId(id);
      const editedText = editingId === id ? editDraft : undefined;
      await knowledgeApi.approvePattern(id, editedText);
      setEditingId(null);
      setEditDraft('');
      await refetch();
      setSnack({ open: true, msg: 'Pattern approved', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not approve', severity: 'error' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setRejectingId(id);
      await knowledgeApi.rejectPattern(id);
      await refetch();
      setSnack({ open: true, msg: 'Pattern rejected', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not reject', severity: 'error' });
    } finally {
      setRejectingId(null);
    }
  };

  const bulkApprove = async () => {
    if (!window.confirm(`Approve all ${items.length} pending patterns?`)) return;
    try {
      setBulkApproving(true);
      await knowledgeApi.bulkApprove(items.map(i => i._id), user?.id);
      await refetch();
      setSnack({ open: true, msg: `Approved ${items.length} patterns`, severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Bulk approve failed', severity: 'error' });
    } finally {
      setBulkApproving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}>Style Review</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{total} patterns pending review</Typography>
      </Box>

      <Box sx={{ bgcolor: Colors.bg, px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, borderBottom: `1px solid ${Colors.border}` }}>
        <TextField
          size="small" placeholder="Search patterns…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 16, color: Colors.textMuted, mr: 0.5 }} /> }}
          sx={{ flex: 1, maxWidth: 280, '& .MuiOutlinedInput-root': { bgcolor: '#fff', height: 32 } }}
        />
        {items.length > 0 && (
          <Button size="small" variant="contained" onClick={bulkApprove} disabled={bulkApproving}
            sx={{ bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' }, height: 32, ml: 'auto' }}>
            {bulkApproving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : `Approve All (${items.length})`}
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>✓</Typography>
            <Typography variant="h3" sx={{ color: Colors.navy }}>All clear</Typography>
            <Typography sx={{ color: Colors.textSecondary, mt: 0.5 }}>No patterns pending review</Typography>
          </Box>
        ) : (
          <>
            {items.map(item => (
              <Paper key={item._id} elevation={0} sx={{ mb: 1.5, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    {item.clientCode && <Chip label={item.clientCode} size="small" sx={{ height: 18, fontSize: '0.5625rem', bgcolor: Colors.cardAlt }} />}
                    {item.channel && <Chip label={item.channel} size="small" sx={{ height: 18, fontSize: '0.5625rem', bgcolor: Colors.info + '18', color: Colors.info }} />}
                  </Box>
                  <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted }}>{relativeTime(item.createdAt)}</Typography>
                </Box>

                {editingId === item._id ? (
                  <TextField
                    fullWidth multiline minRows={3}
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    size="small"
                    sx={{ mb: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.875rem' } }}
                  />
                ) : (
                  <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 1, fontFamily: 'Georgia, serif' }}>
                    {item.pattern || item.text || item.content || '—'}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    if (editingId === item._id) { setEditingId(null); setEditDraft(''); }
                    else { setEditingId(item._id); setEditDraft(item.pattern || item.text || item.content || ''); }
                  }} sx={{ borderColor: Colors.border, color: Colors.navy, flex: 1, fontSize: '0.75rem' }}>
                    {editingId === item._id ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => handleReject(item._id)} disabled={rejectingId === item._id}
                    sx={{ borderColor: Colors.danger, color: Colors.danger, flex: 1, fontSize: '0.75rem' }}>
                    {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
                  </Button>
                  <Button size="small" variant="contained" onClick={() => handleApprove(item._id)} disabled={approvingId === item._id}
                    startIcon={approvingId !== item._id && <Check sx={{ fontSize: 14 }} />}
                    sx={{ bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' }, flex: 2, fontSize: '0.75rem' }}>
                    {approvingId === item._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : editingId === item._id ? 'Save & Approve' : 'Approve'}
                  </Button>
                </Box>
              </Paper>
            ))}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
            </div>
          </>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
