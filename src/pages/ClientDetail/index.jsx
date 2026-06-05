import { ArrowBack, Send, Sync } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { conversationApi, queueApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { formatINRLakhs, formatTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const STATUS_TICK = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '✗', queued: '…' };
const STATUS_LABEL = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  queued: 'Queued',
  awaiting_approval: 'Pending',
  held: 'Held',
};

function getBubbleStyle(item) {
  const ds = item.deliveryStatus;
  const isOut = item.direction === 'outbound';

  if (ds === 'awaiting_approval') {
    return {
      bgcolor: Colors.navyAlt,
      color: '#fff',
      border: `2px solid ${Colors.warning}80`,
      borderRadius: '18px 18px 4px 18px',
    };
  }
  if (ds === 'held') {
    return {
      bgcolor: Colors.navyAlt,
      color: '#fff',
      border: `2px solid ${Colors.warning}60`,
      borderRadius: '18px 18px 4px 18px',
    };
  }
  if (ds === 'failed') {
    return {
      bgcolor: Colors.danger + '10',
      color: Colors.textPrimary,
      border: `1.5px solid ${Colors.danger}40`,
      borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    };
  }
  if (!isOut) {
    return {
      bgcolor: '#fff',
      color: Colors.textPrimary,
      border: `1px solid ${Colors.border}`,
      borderRadius: '18px 18px 18px 4px',
    };
  }
  // Normal approved/sent outbound
  if (isOut) {
    return {
      bgcolor: '#005C4B',
      color: '#fff',
      border: 'none',
      borderRadius: '18px 18px 4px 18px',
    };
  }
}

function MsgBubble({ item, canWrite, approvingId, rejectingId, onApprove, onReject, onSetLightbox }) {
  const isOutbound = item.direction === 'outbound';
  const ds = item.deliveryStatus;
  const isPending = ds === 'awaiting_approval' || ds === 'held';
  const isFailed = ds === 'failed';
  const style = getBubbleStyle(item);
  const isDark = style.bgcolor === Colors.navy;

  const metaColor = (isDark || isPending) ? 'rgba(255,255,255,0.5)' : Colors.textMuted;
  const statusColor = ds === 'read' ? Colors.success : ds === 'delivered' ? Colors.info : ds === 'failed' ? Colors.danger : ds === 'awaiting_approval' || ds === 'held' ? Colors.warning : Colors.textMuted;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isOutbound ? 'flex-end' : 'flex-start', mb: 1.25, px: 1 }}>
      <Box sx={{ maxWidth: '80%', px: 2, py: 1.25, ...style }}>

        {/* Status badge — pending/held/failed only */}
        {(isPending || isFailed) && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 0.75, bgcolor: isPending ? Colors.warning + '20' : Colors.danger + '18', borderRadius: '99px', px: '8px', py: '2px' }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace', color: isPending ? Colors.warning : Colors.danger }}>
              {ds === 'held' ? '⏸ HELD' : isFailed ? '✗ FAILED' : '⏳ PENDING APPROVAL'}
            </Typography>
          </Box>
        )}

        {/* Channel tag */}
        {item.channel === 'whatsapp' && (
          <Typography sx={{ fontSize: '0.5rem', color: isDark ? 'rgba(255,255,255,0.5)' : Colors.textMuted, mb: 0.25, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em' }}>
            WHATSAPP
          </Typography>
        )}

        {/* Body */}
        {item.body && (
          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'inherit' }}>{item.body}</Typography>
        )}

        {/* Images */}
        {item.attachments?.filter(a => a.type === 'image' && a.url).map((a, idx) => (
          <Box key={idx} onClick={() => onSetLightbox(a.url)} sx={{ mt: 0.75, cursor: 'zoom-in', borderRadius: 1.5, overflow: 'hidden', maxWidth: 240 }}>
            <img src={a.url} alt="attachment" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
          </Box>
        ))}

        {/* Timestamp + delivery status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
          <Typography sx={{ fontSize: '0.5rem', color: metaColor, fontFamily: '"JetBrains Mono", monospace' }}>
            {formatTime(item.sentAt || item.createdAt)}
          </Typography>
          {isOutbound && ds && STATUS_LABEL[ds] && (
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: statusColor, fontFamily: '"JetBrains Mono", monospace' }}>
              {STATUS_TICK[ds] ? `${STATUS_TICK[ds]} ${STATUS_LABEL[ds]}` : STATUS_LABEL[ds]}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Approve/Reject actions */}
      {isPending && canWrite && (
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
          <Button size="small" variant="outlined" onClick={() => onReject(item._id)} disabled={rejectingId === item._id}
            sx={{ height: 26, fontSize: '0.625rem', fontFamily: '"JetBrains Mono", monospace', borderColor: Colors.danger, color: Colors.danger, px: 1.25, borderRadius: '8px' }}>
            {rejectingId === item._id ? <CircularProgress size={12} sx={{ color: Colors.danger }} /> : 'REJECT'}
          </Button>
          <Button size="small" variant="contained" onClick={() => onApprove(item._id)} disabled={approvingId === item._id}
            sx={{ height: 26, fontSize: '0.625rem', fontFamily: '"JetBrains Mono", monospace', bgcolor: Colors.success, px: 1.25, borderRadius: '8px', '&:hover': { bgcolor: Colors.success + 'e0' } }}>
            {approvingId === item._id ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'APPROVE'}
          </Button>
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
  const [hasPrev, setHasPrev] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [directMsg, setDirectMsg] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
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
      const res = await conversationApi.clientChats({ clientCode: id, ...(anchorConvId ? { conversationId: anchorConvId } : {}), limit: 20 });
      setChatItems(res.items || []);
      setFirstId(res.firstId);
      setHasPrev(res.hasPrev);
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await conversationApi.clientChats({ clientCode: id, sync: true, limit: 20 });
      setChatItems(res.items || []);
      setFirstId(res.firstId);
      setHasPrev(res.hasPrev);
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
      await conversationApi.sendDirect({ clientCode: id, message: directMsg.trim(), by: user?.username || 'unknown' });
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: Colors.gold + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ color: Colors.gold, fontWeight: 700, fontSize: '1rem', fontFamily: '"Fraunces", Georgia, serif', fontStyle: 'italic', lineHeight: 1 }}>
            {clientName?.[0]?.toUpperCase() || '?'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif' }} noWrap>{clientName}</Typography>
          {overview && (
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6875rem', fontFamily: '"JetBrains Mono", monospace' }}>
              {overview.outstanding != null ? `₹${formatINRLakhs(overview.outstanding)} outstanding` : ''}
              {overview.oldestBill?.pendingDays ? ` · ${overview.oldestBill.pendingDays}d oldest` : ''}
            </Typography>
          )}
        </Box>
        <Tooltip title="Sync messages">
          <IconButton size="small" sx={{ color: '#fff' }} onClick={handleSync} disabled={syncing}>
            {syncing ? <CircularProgress size={16} sx={{ color: Colors.gold }} /> : <Sync fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Chat */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#ECE5DD', py: 1 }}>
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : (
          <>
            {hasPrev && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" variant="outlined" onClick={loadOlder} disabled={loadingTop}
                  sx={{ borderColor: Colors.border, color: Colors.textSecondary, fontSize: '0.75rem' }}>
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
                      <Typography sx={{ mx: 1.5, fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em' }}>
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
                    onApprove={approve}
                    onReject={reject}
                    onSetLightbox={setLightboxUrl}
                  />
                </Box>
              );
            })}
            <div ref={chatEndRef} />
          </>
        )}
      </Box>

      {/* Input */}
      {canWrite && (
        <Box sx={{ bgcolor: '#fff', borderTop: `1px solid ${Colors.border}`, px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Send a direct message…"
            value={directMsg}
            onChange={e => setDirectMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirect(); } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: Colors.bg } }}
          />
          <IconButton
            onClick={sendDirect}
            disabled={!directMsg.trim() || sendingDirect}
            sx={{ bgcolor: Colors.navy, color: '#fff', '&:hover': { bgcolor: Colors.navyLight }, '&.Mui-disabled': { bgcolor: Colors.border }, flexShrink: 0 }}
          >
            {sendingDirect ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send fontSize="small" />}
          </IconButton>
        </Box>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <Box onClick={() => setLightboxUrl(null)}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightboxUrl} alt="attachment" style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: 8 }} />
          <IconButton sx={{ position: 'absolute', top: 16, right: 16, color: '#fff' }} onClick={() => setLightboxUrl(null)}>
            <ArrowBack />
          </IconButton>
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

function Tooltip({ children, title }) {
  return title ? (
    <Box title={title} sx={{ display: 'inline-flex' }}>{children}</Box>
  ) : children;
}
