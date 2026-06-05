import {
  CheckCircle,
  Close,
  Edit,
  Refresh,
  Search,
  SwapVert,
  Timer,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { adminApi, conversationApi, queueApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { Colors } from '../../theme/index';

const SORT_OPTIONS = [
  { val: 'createdAt_desc', label: 'Newest first' },
  { val: 'createdAt_asc', label: 'Oldest first' },
  { val: 'balance_desc', label: 'Balance: High → Low' },
  { val: 'balance_asc', label: 'Balance: Low → High' },
  { val: 'gold_desc', label: 'Gold: High → Low' },
  { val: 'gold_asc', label: 'Gold: Low → High' },
];

export default function Queue() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [goldFilter, setGoldFilter] = useState(undefined);
  const [editingId, setEditingId] = useState(null);
  const [draftBody, setDraftBody] = useState('');
  const [editorReason, setEditorReason] = useState('');
  const [savingBodyId, setSavingBodyId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [showApproveAll, setShowApproveAll] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenAll, setShowRegenAll] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const [regeneratingConvId, setRegeneratingConvId] = useState(null);
  const [showRegenSingle, setShowRegenSingle] = useState(false);
  const [pendingRegenConvId, setPendingRegenConvId] = useState(null);
  const [editingAmount, setEditingAmount] = useState(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [savingAmountId, setSavingAmountId] = useState(null);
  const loaderRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, refetch, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['approval-queue', debouncedSearch, sort, goldFilter],
    queryFn: ({ pageParam = 1 }) =>
      queueApi.awaitingApproval({ page: pageParam, limit: 20, search: debouncedSearch || undefined, sort, filter: goldFilter }),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
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

  const showSnack = (msg, severity = 'error') => setSnack({ open: true, msg, severity });

  const approve = async (id, reason) => {
    try {
      setApprovingId(id);
      await queueApi.approve(id, {
        by: user?.email || user?.username || 'unknown',
        userId: user?.id,
        userName: user?.name,
        userRole: user?.role,
        ...(reason?.trim() ? { editorReason: reason.trim() } : {}),
      });
      qc.resetQueries({ queryKey: ['approval-queue'] });
    } catch (err) {
      showSnack(err?.response?.data?.message || err?.message || 'Could not approve message');
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (id) => {
    if (!window.confirm('Reject this message? It will not be sent to the client.')) return;
    try {
      setRejectingId(id);
      await queueApi.reject(id, { reason: 'rejected by reviewer', by: user?.email || user?.username || 'unknown' });
      qc.resetQueries({ queryKey: ['approval-queue'] });
    } catch {
    } finally {
      setRejectingId(null);
    }
  };

  const saveBody = async (id) => {
    try {
      setSavingBodyId(id);
      await queueApi.updateBody(id, { body: draftBody, by: user?.email || user?.username || 'unknown' });
      await qc.resetQueries({ queryKey: ['approval-queue'] });
      cancelEdit();
    } catch (err) {
      showSnack(err?.message || 'Could not update body');
    } finally {
      setSavingBodyId(null);
    }
  };

  const saveAndSend = async (id) => {
    try {
      setSavingBodyId(id);
      await queueApi.updateBody(id, { body: draftBody, by: user?.email || user?.username || 'unknown' });
      await approve(id, editorReason);
      cancelEdit();
    } catch (err) {
      showSnack(err?.message || 'Could not save and send');
    } finally {
      setSavingBodyId(null);
    }
  };

  const saveAmount = async (id, idx) => {
    const text = draftAmount.trim();
    if (!text) { showSnack('Value cannot be empty.'); return; }
    try {
      setSavingAmountId(id);
      await conversationApi.editAmount(id, { placeholder: idx, text });
      await qc.resetQueries({ queryKey: ['approval-queue'] });
      setEditingAmount(null);
      setDraftAmount('');
    } catch (err) {
      showSnack(err?.response?.data?.message || err?.message || 'Could not update placeholder');
    } finally {
      setSavingAmountId(null);
    }
  };

  const cancelEdit = () => { setEditingId(null); setDraftBody(''); setEditorReason(''); };

  const confirmApproveAll = async () => {
    setApprovingAll(true);
    try {
      for (const i of items) {
        try {
          await queueApi.approve(i._id, { by: user?.email || user?.username || 'unknown', userId: user?.id, userName: user?.name, userRole: user?.role });
        } catch {}
      }
      qc.resetQueries({ queryKey: ['approval-queue'] });
    } finally {
      setApprovingAll(false);
      setShowApproveAll(false);
    }
  };

  const doRegenerateAll = async () => {
    setShowRegenAll(false);
    try {
      setRegenerating(true);
      await adminApi.regeneratePendingReminders();
      await refetch();
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (!isTimeout) showSnack(err?.response?.data?.message || 'Could not regenerate');
      else setTimeout(() => refetch(), 5000);
    } finally {
      setRegenerating(false);
    }
  };

  const doRegenerateSingle = async (convId) => {
    setShowRegenSingle(false);
    setPendingRegenConvId(null);
    try {
      setRegeneratingConvId(convId);
      const res = await adminApi.regenerateReminder(convId);
      const updated = res?.conversation;
      if (updated?._id) {
        const cacheKey = ['approval-queue', debouncedSearch, sort, goldFilter];
        qc.setQueryData(cacheKey, (old) => {
          if (!old?.pages) { refetch(); return old; }
          let matched = false;
          const next = { ...old, pages: old.pages.map(page => ({ ...page, items: page.items.map(item => { if (item._id === updated._id) { matched = true; return { ...item, ...updated }; } return item; }) })) };
          if (!matched) refetch();
          return next;
        });
      } else {
        await refetch();
      }
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (isTimeout) setTimeout(() => refetch(), 10000);
      else showSnack(err?.response?.data?.message || 'Could not regenerate');
    } finally {
      setRegeneratingConvId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
            {total} PENDING MESSAGES
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Approval Queue
          </Typography>
        </Box>
        <Tooltip title="Held messages">
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate('/held')}>
            <Timer fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Regenerate all">
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setShowRegenAll(true)} disabled={regenerating}>
            {regenerating ? <CircularProgress size={16} sx={{ color: Colors.gold }} /> : <Refresh fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, px: 1, height: 32, border: '1px solid rgba(255,255,255,0.2)' }}>
          <SwapVert sx={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
          <Select
            value={sort}
            onChange={e => setSort(e.target.value)}
            size="small"
            variant="standard"
            disableUnderline
            sx={{
              color: '#fff', fontSize: '0.75rem', minWidth: 110,
              '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.7)', fontSize: 18 },
              '& .MuiSelect-select': { py: 0, pr: '20px !important', background: 'none' },
            }}
          >
            {SORT_OPTIONS.map(o => <MenuItem key={o.val} value={o.val} sx={{ fontSize: '0.8125rem' }}>{o.label}</MenuItem>)}
          </Select>
        </Box>
      </Box>

      {/* Search row */}
      <Box sx={{ bgcolor: Colors.navyAlt, px: 2, py: 1, flexShrink: 0 }}>
        <TextField
          fullWidth size="small"
          placeholder="Search by client or message…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }} /></InputAdornment> }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '8px', height: 34,
              '& input': { color: '#fff', fontSize: '0.8125rem', '&::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 } },
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
              '&.Mui-focused fieldset': { borderColor: Colors.gold },
            },
          }}
        />
      </Box>

      {/* Filter + approve-all row */}
      <Box sx={{ bgcolor: Colors.cream, borderBottom: `1px solid ${Colors.border}`, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 0.75, flex: 1 }}>
          {[{ key: undefined, label: 'All' }, { key: 'unfix', label: 'Unfix Gold' }, { key: 'fixed', label: 'Fixed' }].map(opt => (
            <Chip
              key={String(opt.key)}
              label={opt.label}
              size="small"
              onClick={() => setGoldFilter(opt.key)}
              sx={{
                cursor: 'pointer', height: 26, fontSize: '0.6875rem', fontWeight: 700,
                bgcolor: goldFilter === opt.key ? Colors.navy : '#fff',
                color: goldFilter === opt.key ? '#fff' : Colors.textSecondary,
                border: `1px solid ${goldFilter === opt.key ? Colors.navy : Colors.border}`,
                borderRadius: '99px',
              }}
            />
          ))}
        </Box>
        {items.length > 0 && canWrite && (
          <Button size="small" variant="contained" onClick={() => setShowApproveAll(true)}
            sx={{ bgcolor: Colors.navy, '&:hover': { bgcolor: Colors.navyAlt }, height: 28, fontSize: '0.6875rem', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', borderRadius: '6px', flexShrink: 0 }}>
            Approve All · {items.length}
          </Button>
        )}
      </Box>

      {regenerating && (
        <Box sx={{ bgcolor: Colors.gold + '18', borderBottom: `1px solid ${Colors.gold}30`, px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <CircularProgress size={14} sx={{ color: Colors.gold }} />
          <Typography sx={{ fontSize: '0.75rem', color: Colors.gold, fontWeight: 600 }}>Regenerating reminders… may take 1–2 min</Typography>
        </Box>
      )}

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.navy }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>✓</Typography>
            <Typography variant="h2" sx={{ color: Colors.navy, mb: 0.5 }}>All clear</Typography>
            <Typography sx={{ color: Colors.textSecondary }}>No messages waiting for approval</Typography>
          </Box>
        ) : (
          <>
            {items.map(item => (
              <ApprovalCard
                key={item._id}
                item={item}
                canWrite={canWrite}
                safeScroll={false}
                editingId={editingId}
                draftBody={draftBody}
                editorReason={editorReason}
                savingBodyId={savingBodyId}
                approvingId={approvingId}
                rejectingId={rejectingId}
                editingAmount={editingAmount}
                draftAmount={draftAmount}
                savingAmountId={savingAmountId}
                regeneratingConvId={regeneratingConvId}
                user={user}
                onStartEdit={(id, body) => { setEditingId(id); setDraftBody(body || ''); }}
                onCancelEdit={cancelEdit}
                onDraftChange={setDraftBody}
                onReasonChange={setEditorReason}
                onSaveBody={saveBody}
                onSaveAndSend={saveAndSend}
                onApprove={approve}
                onReject={reject}
                onSetLightbox={setLightboxUrl}
                onViewThread={(id, clientCode, clientName) => navigate(`/client/${clientCode}?conversationId=${id}&clientName=${encodeURIComponent(clientName || '')}`)}
                onRegenSingle={(convId) => { setPendingRegenConvId(convId); setShowRegenSingle(true); }}
                onEditAmount={(id, idx) => { setEditingAmount({ id, idx }); setDraftAmount(''); }}
                onCancelAmount={() => { setEditingAmount(null); setDraftAmount(''); }}
                onDraftAmountChange={setDraftAmount}
                onSaveAmount={saveAmount}
              />
            ))}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
            </div>
          </>
        )}
      </Box>

      {/* Approve All Dialog */}
      <Dialog open={showApproveAll} onClose={() => !approvingAll && setShowApproveAll(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
          <CheckCircle sx={{ fontSize: 48, color: Colors.success, mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 1 }}>Approve All {items.length}?</Typography>
          <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>
            {items.length} pending messages will be sent to clients immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => setShowApproveAll(false)} disabled={approvingAll}>Cancel</Button>
          <Button fullWidth variant="contained" onClick={confirmApproveAll} disabled={approvingAll}
            sx={{ bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' } }}>
            {approvingAll ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Approve All'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regen All Dialog */}
      <Dialog open={showRegenAll} onClose={() => !regenerating && setShowRegenAll(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Regenerate All Reminders?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>
            Re-syncs all data of Template messages. Takes 1–2 min.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setShowRegenAll(false)}>Cancel</Button>
          <Button variant="contained" onClick={doRegenerateAll}
            sx={{ bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight } }}>
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regen Single Dialog */}
      <Dialog open={showRegenSingle} onClose={() => { setShowRegenSingle(false); setPendingRegenConvId(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Regenerate Reminder?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>
            Re-sync this message with latest invoice and overdue data.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => { setShowRegenSingle(false); setPendingRegenConvId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={() => pendingRegenConvId && doRegenerateSingle(pendingRegenConvId)}
            sx={{ bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight } }}>
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox */}
      {lightboxUrl && (
        <Box
          onClick={() => setLightboxUrl(null)}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img src={lightboxUrl} alt="attachment" style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: 8 }} />
          <IconButton sx={{ position: 'absolute', top: 16, right: 16, color: '#fff' }} onClick={() => setLightboxUrl(null)}>
            <Close />
          </IconButton>
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

function ApprovalCard({
  item, canWrite, safeScroll, editingId, draftBody, editorReason, savingBodyId,
  approvingId, rejectingId, editingAmount, draftAmount, savingAmountId, regeneratingConvId,
  onStartEdit, onCancelEdit, onDraftChange, onReasonChange, onSaveBody, onSaveAndSend,
  onApprove, onReject, onSetLightbox, onViewThread, onRegenSingle,
  onEditAmount, onCancelAmount, onDraftAmountChange, onSaveAmount,
}) {
  const isEditing = editingId === item._id;

  return (
    <Paper elevation={0} sx={{ mb: '14px', p: 2, bgcolor: '#fff', border: `1px solid ${Colors.border}`, borderRadius: '14px' }}>

      {/* ── Head: tier + name + amount ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 0, flex: 1, mr: 1 }}>
          <TierBadge tier={item.clientTier} size={22} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '0.9375rem', fontWeight: 500, color: Colors.navy, letterSpacing: '-0.2px', lineHeight: 1.3 }} noWrap>
              {item.clientName || item.clientCode || 'Client'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem', color: Colors.textMuted, letterSpacing: '0.05em' }}>
                {item.triggerType?.toUpperCase() || 'MESSAGE'}
              </Typography>
              {item.hasUnfixGold ? (
                <Box sx={{ display: 'inline-flex', px: '6px', py: '2px', borderRadius: '99px', bgcolor: Colors.gold + '18', border: `1px solid ${Colors.gold}50` }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.06em' }}>UNFIX GOLD</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'inline-flex', px: '6px', py: '2px', borderRadius: '99px', bgcolor: Colors.success + '12', border: `1px solid ${Colors.success}40` }}>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', fontWeight: 700, color: Colors.success, letterSpacing: '0.06em' }}>FIXED</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          {item.totalBalance > 0 && (
            <>
              <Typography sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.125rem', fontWeight: 600, color: Colors.danger, letterSpacing: '-0.3px', lineHeight: 1 }}>
                ₹{Math.round(item.totalBalance / 100000).toLocaleString('en-IN')}L
              </Typography>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: Colors.textMuted, letterSpacing: '0.1em', mt: 0.25 }}>OVERDUE</Typography>
            </>
          )}
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 0.75 }}>
            <Button size="small" onClick={() => onViewThread(item._id, item.clientCode, item.clientName)}
              sx={{ height: 22, fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em', p: '2px 8px', minWidth: 0, border: `1px solid ${Colors.gold}50`, borderRadius: '6px' }}>
              THREAD →
            </Button>
            {item.metadata?.templateName && (
              regeneratingConvId === item._id
                ? <CircularProgress size={14} sx={{ color: Colors.gold }} />
                : <Tooltip title="Regenerate">
                    <IconButton size="small" sx={{ border: `1px solid ${Colors.border}`, borderRadius: '6px', p: '2px', width: 22, height: 22 }} onClick={() => onRegenSingle(item._id)}>
                      <Refresh sx={{ fontSize: 12, color: Colors.textMuted }} />
                    </IconButton>
                  </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Client said ── */}
      {item.lastClientMessage?.body && (
        <Box sx={{ bgcolor: Colors.cream, borderLeft: '3px solid', borderColor: Colors.textMuted, borderRadius: '0 8px 8px 0', px: '14px', py: '10px', mb: 1 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.15em', mb: 0.75 }}>CLIENT SAID</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: Colors.textSecondary, lineHeight: 1.55, fontStyle: 'italic' }} style={{ WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
            {item.lastClientMessage.body}
          </Typography>
        </Box>
      )}

      {/* ── Aira will send ── */}
      <Box sx={{ bgcolor: Colors.cardAlt, borderLeft: '3px solid', borderColor: Colors.gold, borderRadius: '0 8px 8px 0', px: '14px', py: '12px', mb: 1.5 }}>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.15em', mb: 0.75 }}>AIRA WILL SEND</Typography>
        {isEditing ? (
          <TextField fullWidth multiline minRows={3} value={draftBody} onChange={e => onDraftChange(e.target.value)} size="small"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.8125rem' } }} />
        ) : (
          <Typography sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
        )}
        {item.attachments?.filter(a => a.type === 'image' && a.url).map((a, idx) => (
          <Box key={idx} onClick={() => onSetLightbox(a.url)} sx={{ mt: 1, borderRadius: 1.5, overflow: 'hidden', cursor: 'zoom-in', maxWidth: 280 }}>
            <img src={a.url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
          </Box>
        ))}
      </Box>

      {/* ── Placeholder editors ── */}
      {(() => {
        const placeholders = item.metadata?.templateData?.body?.placeholders;
        if (!Array.isArray(placeholders) || placeholders.length === 0 || !canWrite) return null;
        const templateFields = item.templateFields ?? item.metadata?.templateData?.variableValues ?? {};
        const valueToKey = {};
        Object.entries(templateFields).forEach(([k, v]) => { if (!valueToKey[String(v)]) valueToKey[String(v)] = k; });
        return placeholders.map((current, idx) => {
          const isEditingAmt = editingAmount?.id === item._id && editingAmount?.idx === idx;
          const isSaving = savingAmountId === item._id;
          const fieldName = valueToKey[current] ?? null;
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', bgcolor: Colors.gold + '10', border: `1px solid ${Colors.gold}30`, borderRadius: 1, p: 1, mb: 0.75, gap: 1, position: 'relative' }}>
              <Typography sx={{ position: 'absolute', top: -8, left: 8, fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, fontFamily: '"JetBrains Mono", monospace', bgcolor: Colors.cardAlt, px: '4px', borderRadius: '2px' }}>
                {fieldName ?? `#${idx + 1}`}
              </Typography>
              {isEditingAmt ? (
                <>
                  <TextField size="small" value={draftAmount} onChange={e => onDraftAmountChange(e.target.value)} autoFocus sx={{ flex: 1 }} />
                  <IconButton size="small" onClick={onCancelAmount}><Close fontSize="small" /></IconButton>
                  <Button size="small" variant="contained" onClick={() => onSaveAmount(item._id, idx)} disabled={isSaving}
                    sx={{ bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight }, height: 28 }}>
                    {isSaving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Update'}
                  </Button>
                </>
              ) : (
                <>
                  <Typography sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: Colors.navy }} noWrap>{current}</Typography>
                  <Button size="small" startIcon={<Edit sx={{ fontSize: 12 }} />} onClick={() => onEditAmount(item._id, idx)}
                    sx={{ height: 22, fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, border: `1px solid ${Colors.gold}60`, borderRadius: 99, px: 1 }}>
                    Edit
                  </Button>
                </>
              )}
            </Box>
          );
        });
      })()}

      {/* ── Actions ── */}
      {canWrite && (
        <Box>
          {isEditing ? (
            <Stack gap={1}>
              <TextField fullWidth size="small" placeholder="Reason for edit (optional)"
                value={editorReason} onChange={e => onReasonChange(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.8125rem' } }} />
              <Box sx={{ display: 'flex', gap: '6px' }}>
                <Button fullWidth variant="outlined" onClick={onCancelEdit}
                  sx={{ flex: 1, borderColor: Colors.border, color: Colors.textSecondary, fontSize: '0.75rem', fontWeight: 600 }}>Cancel</Button>
                <Button fullWidth variant="contained" onClick={() => onSaveAndSend(item._id)} disabled={savingBodyId === item._id}
                  sx={{ flex: 2, bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight }, fontSize: '0.75rem', fontWeight: 700 }}>
                  {savingBodyId === item._id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save & Send'}
                </Button>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', gap: '6px' }}>
              <Button fullWidth variant="outlined" onClick={() => onReject(item._id)} disabled={rejectingId === item._id}
                sx={{ flex: 1, borderColor: Colors.danger, color: Colors.danger, fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px' }}>
                {rejectingId === item._id ? <CircularProgress size={14} sx={{ color: Colors.danger }} /> : 'Reject'}
              </Button>
              {!item.metadata?.templateName && (
                <Button fullWidth variant="outlined" startIcon={<Edit sx={{ fontSize: 13 }} />}
                  onClick={() => onStartEdit(item._id, item.body)}
                  sx={{ flex: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px' }}>
                  Edit
                </Button>
              )}
              <Button fullWidth variant="contained" onClick={() => onApprove(item._id)} disabled={approvingId === item._id}
                sx={{ flex: 1, bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'ee' }, fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px' }}>
                {approvingId === item._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Approve & Send'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
