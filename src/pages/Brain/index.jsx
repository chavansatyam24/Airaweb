import { Check, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { knowledgeApi } from '../../api/index';
import { relativeTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const TYPE_TABS = [
  { k: 'pattern', label: 'Patterns' },
  { k: 'lesson', label: 'Lessons' },
  { k: 'instruction', label: 'Instructions' },
];

const STATUS_FILTERS = [
  { k: undefined, label: 'All' },
  { k: 'pending_review', label: 'Pending Review' },
  { k: 'approved', label: 'Approved' },
  { k: 'rejected', label: 'Rejected' },
];

export default function Brain() {
  const [typeTab, setTypeTab] = useState('pattern');
  const [status, setStatus] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const loaderRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['knowledge', typeTab, status, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => knowledgeApi.list({
      type: typeTab,
      status: status || undefined,
      search: debouncedSearch || undefined,
      page: pageParam,
      limit: 20,
    }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) return lastPage.pagination.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap(p => p.items ?? p.data ?? []) ?? [];

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
      setSnack({ open: true, msg: 'Approved', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not approve', severity: 'error' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id, reason) => {
    try {
      setRejectingId(id);
      await knowledgeApi.rejectPattern(id, reason);
      await refetch();
      setSnack({ open: true, msg: 'Rejected', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not reject', severity: 'error' });
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
          KNOWLEDGE BASE
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Brain
        </Typography>
      </Box>

      {/* Type tabs */}
      <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
        <Tabs value={typeTab} onChange={(_, v) => setTypeTab(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em', minHeight: 44 }, '& .MuiTabs-indicator': { bgcolor: Colors.gold } }}>
          {TYPE_TABS.map(t => <Tab key={t.k} value={t.k} label={t.label} />)}
        </Tabs>
      </Box>

      {/* Filters */}
      <Box sx={{ bgcolor: Colors.bg, px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
        <TextField
          size="small" placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 16, color: Colors.textMuted, mr: 0.5 }} /> }}
          sx={{ width: 220, '& .MuiOutlinedInput-root': { bgcolor: '#fff', height: 32 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <Chip key={String(f.k)} label={f.label} size="small" onClick={() => setStatus(f.k)}
              sx={{ cursor: 'pointer', height: 26, fontSize: '0.6875rem', fontWeight: 600,
                bgcolor: status === f.k ? Colors.navy : '#fff',
                color: status === f.k ? '#fff' : Colors.textSecondary,
                border: `1px solid ${status === f.k ? Colors.navy : Colors.border}` }} />
          ))}
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ color: Colors.textMuted }}>No {typeTab}s found</Typography>
          </Box>
        ) : (
          <>
            {items.map(item => (
              <Paper key={item._id} elevation={0} sx={{ mb: 1.5, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip label={item.status || item.type} size="small" sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 700,
                      bgcolor: item.status === 'approved' ? Colors.success + '18' : item.status === 'rejected' ? Colors.danger + '18' : Colors.warning + '18',
                      color: item.status === 'approved' ? Colors.success : item.status === 'rejected' ? Colors.danger : Colors.warning }} />
                    {item.clientCode && <Chip label={item.clientCode} size="small" sx={{ height: 18, fontSize: '0.5625rem', bgcolor: Colors.cardAlt }} />}
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
                  <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 1, whiteSpace: 'pre-wrap' }}>
                    {item.pattern || item.text || item.content || item.body || '—'}
                  </Typography>
                )}

                {item.status === 'pending_review' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => {
                      if (editingId === item._id) { setEditingId(null); setEditDraft(''); }
                      else { setEditingId(item._id); setEditDraft(item.pattern || item.text || item.content || ''); }
                    }}
                      sx={{ borderColor: Colors.border, color: Colors.navy, fontSize: '0.75rem', flex: 1 }}>
                      {editingId === item._id ? 'Cancel Edit' : 'Edit'}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => handleReject(item._id)} disabled={rejectingId === item._id}
                      sx={{ borderColor: Colors.danger, color: Colors.danger, fontSize: '0.75rem', flex: 1 }}>
                      {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
                    </Button>
                    <Button size="small" variant="contained" onClick={() => handleApprove(item._id)} disabled={approvingId === item._id}
                      startIcon={<Check sx={{ fontSize: 14 }} />}
                      sx={{ bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' }, fontSize: '0.75rem', flex: 1 }}>
                      {approvingId === item._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : editingId === item._id ? 'Save & Approve' : 'Approve'}
                    </Button>
                  </Box>
                )}
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
