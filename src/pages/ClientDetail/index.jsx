import { ArrowBack, Close, Edit, PlayCircle, Send, Settings, Sync } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clientApi, conversationApi, queueApi } from '../../api/index';
import { BASE_URL } from '../../api/http';
import { useAuth, useCanWrite } from '../../store/auth';
import { formatINRLakhs, formatTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

const STATUS_TICK = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '✗', queued: '…' };
const STATUS_LABEL = {
  sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed',
  queued: 'Queued', awaiting_approval: 'Pending', held: 'Held',
};

const BODY_PLACEHOLDER = /^\[(image|document|video|audio|attachment)\]$/i;

function proxyMediaUrl(url) {
  if (url && url.includes('data-storage.doubletick.io')) {
    return `${BASE_URL}/api/media-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function renderBold(text) {
  if (!text) return null;
  const parts = text.split(/(\*{1,2}[^*]+\*{1,2})/g);
  return parts.map((part, i) => {
    const inner = part.replace(/^\*{1,2}|\*{1,2}$/g, '');
    return part.startsWith('*') && part.endsWith('*') && inner.length > 0
      ? <strong key={i}>{inner}</strong>
      : part;
  });
}

function fetchAuthBlob(url) {
  const proxied = proxyMediaUrl(url);
  const token = localStorage.getItem('pooja_auth_token');
  return fetch(proxied, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(res => { if (!res.ok) throw new Error('fetch failed'); return res.blob(); });
}

function downloadAuthFile(url, filename) {
  fetchAuthBlob(url)
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    })
    .catch(console.error);
}

function AuthImage({ src, onLightbox, isDark }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    fetchAuthBlob(src)
      .then(blob => {
        if (!alive) return;
        setBlobUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => { if (alive) { setFailed(true); setLoading(false); } });
    return () => { alive = false; };
  }, [src]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  if (loading) {
    return (
      <Box sx={{ width: 180, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0', borderRadius: 1.5, mb: 0.5 }}>
        <CircularProgress size={18} sx={{ color: isDark ? Colors.goldLight : Colors.gold }} />
      </Box>
    );
  }

  if (failed || !blobUrl) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#f0f0f0', borderRadius: '6px', px: 1, py: 0.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : Colors.textMuted }}>🖼 Image unavailable</Typography>
      </Box>
    );
  }

  return (
    <Box onClick={() => onLightbox(blobUrl)} sx={{ cursor: 'zoom-in', borderRadius: 1.5, overflow: 'hidden', maxWidth: 240, mb: 0.5 }}>
      <img src={blobUrl} alt="attachment" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
    </Box>
  );
}

function AuthVideo({ src }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleOpen = () => {
    setModalOpen(true);
    if (!blobUrl && !failed) {
      setLoading(true);
      fetchAuthBlob(src)
        .then(blob => { setBlobUrl(URL.createObjectURL(blob)); setLoading(false); })
        .catch(() => { setFailed(true); setLoading(false); });
    }
  };

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{ width: 200, height: 130, borderRadius: 1.5, bgcolor: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', mb: 0.5, '&:hover': { opacity: 0.85 } }}
      >
        <PlayCircle sx={{ fontSize: 48, color: '#fff' }} />
        <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>Video</Typography>
      </Box>

      {modalOpen && (
        <Box
          onClick={() => setModalOpen(false)}
          sx={{ position: 'fixed', inset: 0, bgcolor: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconButton onClick={() => setModalOpen(false)} sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', zIndex: 1 }}>
            <Close sx={{ fontSize: 28 }} />
          </IconButton>
          {loading && <CircularProgress sx={{ color: Colors.gold }} />}
          {failed && <Typography sx={{ color: '#fff' }}>Video unavailable</Typography>}
          {blobUrl && (
            <video
              src={blobUrl}
              controls
              autoPlay
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90%', maxHeight: '85%' }}
            />
          )}
        </Box>
      )}
    </>
  );
}

function getBubbleStyle(item) {
  const ds = item.deliveryStatus;
  const isOut = item.direction === 'outbound';
  if (ds === 'awaiting_approval') return { bgcolor: Colors.navyAlt, color: '#fff', border: `2px solid ${Colors.warning}80`, borderRadius: '18px 18px 4px 18px' };
  if (ds === 'held') return { bgcolor: Colors.navyAlt, color: '#fff', border: `2px solid ${Colors.warning}60`, borderRadius: '18px 18px 4px 18px' };
  if (ds === 'failed') return { bgcolor: Colors.danger + '10', color: Colors.textPrimary, border: `1.5px solid ${Colors.danger}40`, borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px' };
  if (!isOut) return { bgcolor: '#fff', color: Colors.textPrimary, border: `1px solid ${Colors.border}`, borderRadius: '18px 18px 18px 4px' };
  return { bgcolor: '#005C4B', color: '#fff', border: 'none', borderRadius: '18px 18px 4px 18px' };
}

function MsgBubble({ item, canWrite, approvingId, rejectingId, editingId, editDraft, savingId, onApprove, onReject, onStartEdit, onCancelEdit, onDraftChange, onSaveEdit, onSetLightbox }) {
  const isOutbound = item.direction === 'outbound';
  const ds = item.deliveryStatus;
  const isPending = ds === 'awaiting_approval' || ds === 'held';
  const isAwaiting = ds === 'awaiting_approval';
  const isHeld = ds === 'held';
  const isFailed = ds === 'failed';
  const isEditing = editingId === item._id;
  const hasTemplate = !!item.metadata?.templateName;
  const style = getBubbleStyle(item);
  // resolve image url: from attachments array OR metadata.imageUrl fallback
  const resolvedImageUrl = item.attachments?.find(a => a.type === 'image' && a.url)?.url
    || (BODY_PLACEHOLDER.test(item.body?.trim() || '') ? item.metadata?.imageUrl : null);
  const isDark = style.bgcolor === Colors.navyAlt || style.bgcolor === '#005C4B';
  const metaColor = isDark ? 'rgba(255,255,255,0.5)' : Colors.textMuted;
  const statusColor = ds === 'read' ? Colors.success : ds === 'delivered' ? Colors.info : ds === 'failed' ? Colors.danger : ds === 'awaiting_approval' || ds === 'held' ? Colors.warning : Colors.textMuted;
  const senderName = isOutbound ? (item.sentByName || 'AIRA') : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isOutbound ? 'flex-end' : 'flex-start', mb: 1.25, px: 1 }}>
      <Box sx={{ maxWidth: '80%', px: 2, py: 1.25, ...style }}>
        {/* Sender name (outbound only) */}
        {isOutbound && senderName && (
          <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.goldLight, letterSpacing: '0.05em', fontFamily: MONO, mb: 0.5 }}>
            {senderName}
          </Typography>
        )}

        {/* Status badge */}
        {(isPending || isFailed) && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 0.75, bgcolor: isPending ? Colors.warning + '20' : Colors.danger + '18', borderRadius: '99px', px: '8px', py: '2px' }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', fontFamily: MONO, color: isPending ? Colors.warning : Colors.danger }}>
              {ds === 'held' ? '⏸ HELD' : isFailed ? '✗ FAILED' : '⏳ PENDING APPROVAL'}
            </Typography>
          </Box>
        )}

        {/* Attachments — above body */}
        {!isEditing && (
          <Box sx={{ mb: item.body && !BODY_PLACEHOLDER.test(item.body.trim()) ? 0.75 : 0 }}>
            {/* Resolved image (from attachments or metadata.imageUrl) */}
            {resolvedImageUrl && (
              <AuthImage src={resolvedImageUrl} onLightbox={onSetLightbox} isDark={isDark} />
            )}
            {/* Non-image attachments — video inline, others downloadable */}
            {item.attachments?.filter(a => a.type !== 'image').map((a, idx) => (
              a.type === 'video' && a.url ? (
                <AuthVideo key={idx} src={a.url} />
              ) : (
                <Box
                  key={idx}
                  onClick={() => a.url && downloadAuthFile(a.url, a.filename)}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#f0f0f0', borderRadius: '6px', px: 1, py: 0.5, mb: 0.5, cursor: a.url ? 'pointer' : 'default', '&:hover': a.url ? { opacity: 0.8 } : {} }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: isDark ? '#fff' : Colors.textPrimary }}>
                    📎 {a.filename || a.type} {a.url ? '↓' : ''}
                  </Typography>
                </Box>
              )
            ))}
          </Box>
        )}

        {/* Body — suppress [image]/[document] placeholders */}
        {isEditing ? (
          <TextField
            fullWidth multiline minRows={3} size="small" autoFocus
            value={editDraft}
            onChange={e => onDraftChange(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.12)', fontSize: '0.875rem', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } }, '& textarea': { color: '#fff' } }}
          />
        ) : (
          item.body && !BODY_PLACEHOLDER.test(item.body.trim()) && (
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'inherit' }}>
              {renderBold(item.body)}
            </Typography>
          )
        )}

        {/* Intent tag (inbound only) */}
        {item.intent && item.intent.toLowerCase() !== 'unknown' && !isOutbound && (
          <Box sx={{ display: 'inline-flex', mt: 0.5, bgcolor: Colors.gold + '15', borderRadius: '3px', px: '6px', py: '2px' }}>
            <Typography sx={{ fontSize: '0.4375rem', fontWeight: 400, color: Colors.gold, letterSpacing: '0.03em' }}>
              {item.intent.replace(/_/g, ' ').toUpperCase()}
            </Typography>
          </Box>
        )}

        {/* Footer: time + delivery status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
          <Typography sx={{ fontSize: '0.5rem', color: metaColor, fontFamily: MONO }}>
            {formatTime(item.sentAt || item.createdAt)}
          </Typography>
          {isOutbound && ds && STATUS_LABEL[ds] && (
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: statusColor, fontFamily: MONO }}>
              {STATUS_TICK[ds] ? `${STATUS_TICK[ds]} ${STATUS_LABEL[ds]}` : STATUS_LABEL[ds]}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Held delivery error reason */}
      {isHeld && item.deliveryError && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, alignSelf: 'flex-end', maxWidth: '80%', bgcolor: Colors.warning + '15', border: `1px solid ${Colors.warning}40`, borderLeft: `3px solid ${Colors.warning}`, borderRadius: '0 6px 6px 0', px: 1.25, py: 0.75, mt: 0.4 }}>
          <Typography sx={{ fontSize: '0.6875rem', color: Colors.warning, fontWeight: 500, lineHeight: 1.4 }}>
            {item.deliveryError}
          </Typography>
        </Box>
      )}

      {/* Action buttons */}
      {isPending && canWrite && (
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
          {isEditing ? (
            <>
              <IconButton size="small" onClick={onCancelEdit} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '8px', width: 26, height: 26 }}>
                <Close sx={{ fontSize: 13, color: Colors.textMuted }} />
              </IconButton>
              <Button size="small" variant="contained" onClick={() => onSaveEdit(item._id)} disabled={savingId === item._id}
                sx={{ height: 26, fontSize: '0.625rem', fontFamily: MONO, bgcolor: Colors.gold, px: 1.5, borderRadius: '8px', '&:hover': { bgcolor: Colors.goldLight } }}>
                {savingId === item._id ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'SAVE'}
              </Button>
            </>
          ) : (
            <>
              <Button size="small" variant="outlined" onClick={() => onReject(item._id)} disabled={rejectingId === item._id}
                sx={{ height: 26, fontSize: '0.625rem', fontFamily: MONO, borderColor: Colors.danger, color: Colors.danger, px: 1.25, borderRadius: '8px' }}>
                {rejectingId === item._id ? <CircularProgress size={12} sx={{ color: Colors.danger }} /> : 'REJECT'}
              </Button>
              {!hasTemplate && (
                <Button size="small" variant="outlined" startIcon={<Edit sx={{ fontSize: 11 }} />}
                  onClick={() => onStartEdit(item._id, item.body || '')}
                  sx={{ height: 26, fontSize: '0.625rem', fontFamily: MONO, borderColor: Colors.gold, color: Colors.gold, px: 1.25, borderRadius: '8px', '&:hover': { borderColor: Colors.goldLight, color: Colors.goldLight, bgcolor: Colors.gold + '12' } }}>
                  EDIT
                </Button>
              )}
              {isAwaiting && (
                <Button size="small" variant="contained" onClick={() => onApprove(item._id)} disabled={approvingId === item._id}
                  sx={{ height: 26, fontSize: '0.625rem', fontFamily: MONO, bgcolor: Colors.success, px: 1.25, borderRadius: '8px', '&:hover': { bgcolor: Colors.success + 'e0' } }}>
                  {approvingId === item._id ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'APPROVE & SEND'}
                </Button>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const clientName = searchParams.get('clientName') || id;
  const anchorConvId = searchParams.get('conversationId');
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();

  const [chatItems, setChatItems] = useState([]);
  const [firstId, setFirstId] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingBottom, setLoadingBottom] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [directMsg, setDirectMsg] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState(null);
  const [canSync, setCanSync] = useState(true);
  const [takeOver, setTakeOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const chatEndRef = useRef(null);
  const didInitialScroll = useRef(false);

  const overviewQ = useQuery({
    queryKey: ['client-overview', id],
    queryFn: () => conversationApi.clientOverview(id),
    enabled: !!id,
  });
  const overview = overviewQ.data;

  const loadInitial = async () => {
    if (!id) return;
    setInitialLoading(true);
    try {
      const res = await conversationApi.clientChats({
        clientCode: id,
        ...(anchorConvId ? { conversationId: anchorConvId } : {}),
        limit: 20,
      });
      setChatItems(res.items || []);
      setFirstId(res.firstId);
      setLastId(res.lastId);
      setHasPrev(res.hasPrev);
      setHasNext(res.hasNext ?? false);
      setSyncHint(res.syncHint ?? null);
      setCanSync(res.canSync ?? true);
    } catch {
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => { loadInitial(); }, [id]);

  useEffect(() => {
    if (!initialLoading && !didInitialScroll.current && chatItems.length > 0) {
      didInitialScroll.current = true;
      chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [initialLoading, chatItems.length]);

  const loadOlder = async () => {
    if (!hasPrev || loadingTop || !firstId) return;
    setLoadingTop(true);
    try {
      const res = await conversationApi.clientChats({ clientCode: id, before: firstId, limit: 20 });
      setChatItems(prev => [...(res.items || []), ...prev]);
      setFirstId(res.firstId);
      setHasPrev(res.hasPrev);
    } catch {
    } finally {
      setLoadingTop(false);
    }
  };

  const loadNewer = async () => {
    if (!hasNext || loadingBottom || !lastId) return;
    setLoadingBottom(true);
    try {
      const res = await conversationApi.clientChats({ clientCode: id, after: lastId, limit: 20 });
      setChatItems(prev => [...prev, ...(res.items || [])]);
      setLastId(res.lastId);
      setHasNext(res.hasNext ?? false);
    } catch {
    } finally {
      setLoadingBottom(false);
    }
  };

  const handleSync = async () => {
    if (!canSync) return;
    setSyncing(true);
    try {
      const res = await conversationApi.clientChats({ clientCode: id, sync: true, limit: 20 });
      setChatItems(res.items || []);
      setFirstId(res.firstId);
      setLastId(res.lastId);
      setHasPrev(res.hasPrev);
      setHasNext(res.hasNext ?? false);
      setSyncHint(res.syncHint ?? null);
      setCanSync(res.canSync ?? true);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  const sendDirect = async () => {
    if (!directMsg.trim()) return;
    try {
      setSendingDirect(true);
      await clientApi.sendMessage(id, { phone: overview?.customerNumber, body: directMsg.trim() });
      setDirectMsg('');
      await loadInitial();
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not send', severity: 'error' });
    } finally {
      setSendingDirect(false);
    }
  };

  const approve = async (msgId) => {
    try {
      setApprovingId(msgId);
      await queueApi.approve(msgId, { by: user?.email || user?.username || 'unknown', userId: user?.id, userName: user?.name, userRole: user?.role });
      await loadInitial();
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not approve', severity: 'error' });
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (msgId) => {
    if (!window.confirm('Reject this message?')) return;
    try {
      setRejectingId(msgId);
      await queueApi.reject(msgId, { reason: 'rejected by reviewer', by: user?.email || user?.username || 'unknown' });
      await loadInitial();
    } catch {
    } finally {
      setRejectingId(null);
    }
  };

  const saveEdit = async (msgId) => {
    if (!editDraft.trim()) return;
    try {
      setSavingId(msgId);
      await queueApi.updateBody(msgId, { body: editDraft.trim(), by: user?.email || user?.username || 'unknown' });
      setEditingId(null);
      setEditDraft('');
      await loadInitial();
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not save', severity: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const waName = overview?.clientWaName;
  const phone = overview?.customerNumber;
  const weightedAvg = overview?.weightedAvgOverdueDays;
  const outstanding = overview?.outstanding;
  const oldestDays = overview?.oldestBill?.pendingDays ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: Colors.gold + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ color: Colors.gold, fontWeight: 700, fontSize: '1rem', fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1 }}>
            {clientName?.[0]?.toUpperCase() || '?'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 400, fontFamily: SERIF }} noWrap>
            {clientName}
          </Typography>
          {(waName || phone) && (
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.5625rem', fontFamily: MONO }} noWrap>
              {waName && waName !== clientName ? waName : ''}
              {phone ? (waName && waName !== clientName ? ' · ' : '') + phone : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
          <Tooltip title={takeOver ? 'Manual mode active' : 'AI active — click to take over'}>
            <Box
              onClick={() => setTakeOver(v => !v)}
              sx={{
                px: 1, py: 0.25, borderRadius: '6px', cursor: 'pointer',
                bgcolor: takeOver ? Colors.danger + '25' : Colors.success + '20',
                border: `1px solid ${takeOver ? Colors.danger + '50' : Colors.success + '40'}`,
              }}
            >
              <Typography sx={{ fontSize: '0.4375rem', fontWeight: 700, fontFamily: MONO, color: takeOver ? Colors.danger : Colors.success, letterSpacing: '0.08em' }}>
                {takeOver ? 'MANUAL' : 'AI'}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Client controls">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => navigate(`/client/${id}/overrides?clientName=${encodeURIComponent(clientName || '')}`)}>
              <Settings sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={canSync ? 'Sync messages' : 'Sync unavailable'}>
            <span>
              <IconButton size="small" sx={{ color: '#fff' }} onClick={handleSync} disabled={syncing || !canSync}>
                {syncing ? <CircularProgress size={16} sx={{ color: Colors.gold }} /> : <Sync fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Metric strip ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 2, pb: 1.25, display: 'flex', gap: 1, flexShrink: 0 }}>
        {[
          { label: 'OUTSTANDING', val: outstanding != null ? formatINRLakhs(outstanding) : '—', loading: overviewQ.isLoading },
          { label: 'OLDEST',      val: oldestDays ? `${oldestDays}d` : '—',                   loading: overviewQ.isLoading },
          { label: 'WTD AVG',     val: weightedAvg ? `${Math.round(weightedAvg)}d` : '—',     loading: overviewQ.isLoading },
          { label: 'BEHAVIOUR',   val: '—',                                                     loading: false },
        ].map(m => (
          <Box key={m.label} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '0.5px solid rgba(184,134,11,0.15)', px: 1, py: 0.75 }}>
            <Typography sx={{ color: Colors.gold, fontSize: '0.4375rem', fontWeight: 500, letterSpacing: '0.08em', fontFamily: MONO, mb: 0.3 }} noWrap>
              {m.label}
            </Typography>
            {m.loading ? (
              <Box sx={{ width: 40, height: 14, borderRadius: '3px', bgcolor: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontFamily: SERIF, lineHeight: 1 }} noWrap>
                {m.val}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* ── Sync hint banner ── */}
      {syncHint && canSync && (
        <Box sx={{ bgcolor: Colors.gold + '20', borderBottom: `1px solid ${Colors.gold}50`, px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Sync sx={{ fontSize: 14, color: Colors.navy }} />
          <Typography sx={{ fontSize: '0.75rem', color: Colors.navy, fontWeight: 600, flex: 1 }}>{syncHint}</Typography>
          <Button size="small" onClick={handleSync} disabled={syncing}
            sx={{ fontSize: '0.625rem', fontWeight: 700, color: Colors.navy, border: `1px solid ${Colors.gold}80`, borderRadius: '6px', height: 22, px: 1, minWidth: 0 }}>
            Sync now
          </Button>
        </Box>
      )}
      {syncHint && !canSync && (
        <Box sx={{ bgcolor: Colors.warning + '15', borderBottom: `1px solid ${Colors.warning}40`, px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', color: Colors.warning, fontWeight: 600, flex: 1 }}>{syncHint}</Typography>
        </Box>
      )}

      {/* ── Chat ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#ECE5DD', py: 1 }}>
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : (
          <>
            {hasPrev && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" variant="outlined" onClick={loadOlder} disabled={loadingTop}
                  sx={{ borderColor: Colors.border, color: Colors.textSecondary, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.8)' }}>
                  {loadingTop ? <CircularProgress size={14} sx={{ color: Colors.textSecondary }} /> : 'Load older messages'}
                </Button>
              </Box>
            )}
            {chatItems.map((item, idx) => {
              const prevDate = idx > 0 ? new Date(chatItems[idx - 1].sentAt || chatItems[idx - 1].createdAt).toDateString() : null;
              const thisDate = new Date(item.sentAt || item.createdAt).toDateString();
              return (
                <Box key={item._id}>
                  {prevDate !== thisDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', my: 1, px: 2 }}>
                      <Divider sx={{ flex: 1 }} />
                      <Typography sx={{ mx: 1.5, fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em', bgcolor: 'rgba(255,255,255,0.7)', px: 1, borderRadius: '4px' }}>
                        {new Date(item.sentAt || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                    </Box>
                  )}
                  <MsgBubble
                    item={item}
                    canWrite={canWrite}
                    approvingId={approvingId}
                    rejectingId={rejectingId}
                    editingId={editingId}
                    editDraft={editDraft}
                    savingId={savingId}
                    onApprove={approve}
                    onReject={reject}
                    onStartEdit={(id, body) => { setEditingId(id); setEditDraft(body); }}
                    onCancelEdit={() => { setEditingId(null); setEditDraft(''); }}
                    onDraftChange={setEditDraft}
                    onSaveEdit={saveEdit}
                    onSetLightbox={setLightboxUrl}
                  />
                </Box>
              );
            })}
            {hasNext && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" variant="outlined" onClick={loadNewer} disabled={loadingBottom}
                  sx={{ borderColor: Colors.border, color: Colors.textSecondary, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.8)' }}>
                  {loadingBottom ? <CircularProgress size={14} sx={{ color: Colors.textSecondary }} /> : 'Load newer messages'}
                </Button>
              </Box>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </Box>

      {/* ── Footer: AI mode or take-over input ── */}
      {takeOver ? (
        <Box sx={{ bgcolor: '#fff', borderTop: `1px solid ${Colors.border}`, px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
          <IconButton size="small" sx={{ color: Colors.textMuted, flexShrink: 0 }} onClick={() => { setTakeOver(false); setDirectMsg(''); }}>
            <Close fontSize="small" />
          </IconButton>
          <TextField
            fullWidth multiline maxRows={4} size="small" autoFocus
            placeholder="Type a message to send directly…"
            value={directMsg}
            onChange={e => setDirectMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirect(); } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: Colors.bg } }}
          />
          <IconButton
            onClick={sendDirect}
            disabled={!directMsg.trim() || sendingDirect}
            sx={{ bgcolor: Colors.navy, color: '#fff', '&:hover': { bgcolor: Colors.navyAlt ?? Colors.navy }, '&.Mui-disabled': { bgcolor: Colors.border }, flexShrink: 0 }}
          >
            {sendingDirect ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send fontSize="small" />}
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            🤖 Pooja is handling autonomously
          </Typography>
          {canWrite && (
            <Box
              onClick={() => setTakeOver(true)}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
            >
              <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em' }}>
                TAKE OVER
              </Typography>
              <Typography sx={{ color: Colors.gold, fontSize: '0.75rem' }}>→</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <Box onClick={() => setLightboxUrl(null)}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
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
