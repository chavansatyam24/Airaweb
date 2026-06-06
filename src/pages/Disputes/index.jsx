import { Delete, MoreVert } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { disputeApi } from '../../api/index';
import { useAuth } from '../../store/auth';
import { formatDate, relativeTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const TABS = [
  { key: 'raised', label: 'Raised', color: Colors.warning },
  { key: 'investigating', label: 'In Progress', color: Colors.info },
  { key: 'awaiting_client', label: 'Awaiting', color: Colors.gold },
  { key: 'resolved', label: 'Resolved', color: Colors.success },
  { key: 'rejected', label: 'Rejected', color: Colors.danger },
];

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

function clientLabel(d) {
  if (d.clientName) return d.clientName;
  if (d.clientId && typeof d.clientId === 'object' && d.clientId.name) return d.clientId.name;
  if (d.clientCode) return d.clientCode;
  return 'Unknown';
}

function clientTier(d) {
  if (d.clientTier) return d.clientTier;
  if (d.clientId && typeof d.clientId === 'object') return d.clientId.tier;
  return undefined;
}

function clientRouteId(d) {
  if (d.clientCode) return d.clientCode;
  if (d.clientId && typeof d.clientId === 'string') return d.clientId;
  if (d.clientId && typeof d.clientId === 'object') return d.clientId._id;
  return undefined;
}

export default function Disputes() {
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const [tab, setTab] = useState('raised');
  const [resolvingId, setResolvingId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDisputeId, setMenuDisputeId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const countsQ = useQuery({ queryKey: ['disputes', 'counts'], queryFn: () => disputeApi.counts() });
  const listQ = useQuery({ queryKey: ['disputes', 'list', tab], queryFn: () => disputeApi.list({ status: tab }) });

  const counts = countsQ.data;
  const items = listQ.data?.items ?? [];

  const tabsWithCounts = TABS.map(t => ({
    ...t,
    count: t.key === 'raised' ? counts?.raised ?? 0
      : t.key === 'investigating' ? counts?.investigating ?? 0
      : t.key === 'awaiting_client' ? counts?.awaitingClient ?? 0
      : t.key === 'resolved' ? counts?.resolved ?? 0
      : counts?.rejected ?? 0,
  }));

  const transition = async (id, status, resolution) => {
    const by = user?.name?.trim() || user?.username || 'unknown';
    try {
      setResolvingId(id);
      await disputeApi.updateStatus(id, { status, resolution, by });
      await Promise.all([listQ.refetch(), countsQ.refetch()]);
    } catch {
      setSnack({ open: true, msg: 'Could not update. Please try again.', severity: 'error' });
    } finally {
      setResolvingId(null);
    }
  };

  const deleteDispute = async (id) => {
    if (!window.confirm('Delete this dispute? This cannot be undone.')) return;
    try {
      await disputeApi.delete(id);
      await Promise.all([listQ.refetch(), countsQ.refetch()]);
      setSnack({ open: true, msg: 'Dispute deleted', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not delete.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>
          {counts?.total != null ? `${counts.total} DISPUTES` : 'DISPUTE BOARD'}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Disputes
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0, overflowX: 'auto' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              minHeight: 44,
              px: 1.5,
            },
            '& .MuiTabs-indicator': { bgcolor: Colors.gold },
          }}
        >
          {tabsWithCounts.map(t => (
            <Tab key={t.key} value={t.key} label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {t.label}
                <Box sx={{ bgcolor: t.color, px: '6px', py: '1px', borderRadius: 99 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO }}>{t.count}</Typography>
                </Box>
              </Box>
            } />
          ))}
        </Tabs>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {listQ.isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ color: Colors.navy, fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 400 }}>All clear</Typography>
          </Box>
        ) : (
          items.map(d => {
            const routeId = clientRouteId(d);
            const tier = clientTier(d);
            const slaBreached = d.slaBreached === true;
            const isOverdue = !!d.slaDueAt && new Date(d.slaDueAt) < new Date();

            return (
              <Paper key={d._id} elevation={0} sx={{
                mb: 1.5, p: 0,
                border: `1px solid ${slaBreached ? Colors.danger + '50' : Colors.border}`,
                borderLeft: `4px solid ${slaBreached ? Colors.danger : Colors.gold}`,
                borderRadius: '10px',
                overflow: 'hidden',
                bgcolor: '#fff',
              }}>
                {/* Card head */}
                <Box sx={{ px: 2, pt: 1.75, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                      {tier && <TierBadge tier={tier} size={22} />}
                        <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 400, fontFamily: SERIF, color: Colors.navy, lineHeight: 1.2 }}>
                          {clientLabel(d)}
                        </Typography>
                        {(d.clientWaName || d.customerNumber) && (
                          <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, fontFamily: MONO, letterSpacing: '0.04em' }}>
                            {d.clientWaName && d.clientWaName !== clientLabel(d) ? d.clientWaName : ''}{d.customerNumber ? (d.clientWaName && d.clientWaName !== clientLabel(d) ? ' · ' : '') + d.customerNumber : ''}
                          </Typography>
                        )}
                      </Box>
                      {slaBreached && (
                        <Box sx={{
                          bgcolor: Colors.danger + '15',
                          border: `1px solid ${Colors.danger}40`,
                          borderRadius: '99px',
                          px: '8px', py: '2px',
                        }}>
                          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.danger, fontFamily: MONO, letterSpacing: '0.08em' }}>
                            SLA BREACHED
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    {d.invoiceIds?.length > 0 && (
                      <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, fontFamily: MONO }}>
                        INV {d.invoiceIds.join(', ')}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" sx={{ mt: -0.5, mr: -0.5 }} onClick={e => { setMenuAnchor(e.currentTarget); setMenuDisputeId(d._id); }}>
                    <MoreVert fontSize="small" sx={{ color: Colors.textMuted }} />
                  </IconButton>
                </Box>

                {/* Complaint box */}
                <Box sx={{ mx: 2, mb: 1, bgcolor: Colors.cardAlt, p: 1.25, borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.12em', fontFamily: MONO, mb: 0.5 }}>
                    CLIENT'S COMPLAINT
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.5,
                    WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                  }}>
                    {d.description || d.extractedClaim || '—'}
                  </Typography>
                </Box>

                {/* Aira understood box */}
                <Box sx={{ mx: 2, mb: 1.5, bgcolor: Colors.cream, p: 1.25, borderRadius: '8px', borderLeft: `3px solid ${Colors.gold}` }}>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.12em', fontFamily: MONO, mb: 0.5 }}>
                    AIRA UNDERSTOOD
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.8125rem', color: Colors.navy, lineHeight: 1.5,
                    fontStyle: 'italic', fontFamily: SERIF,
                    WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                  }}>
                    {d.extractedClaim || d.description || '—'}
                  </Typography>
                </Box>

                {/* Foot: meta + SLA */}
                <Box sx={{ px: 2, pb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, fontFamily: MONO }}>
                    {relativeTime(d.createdAt)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: isOverdue ? Colors.danger : Colors.warning, fontFamily: MONO }}>
                    SLA {d.slaDueAt ? formatDate(d.slaDueAt) : '—'}
                  </Typography>
                </Box>

                {d.resolution && (
                  <Box sx={{ mx: 2, mb: 1, bgcolor: Colors.success + '12', p: 1, borderRadius: '6px' }}>
                    <Typography sx={{ fontSize: '0.75rem', color: Colors.textPrimary }}>{d.resolution}</Typography>
                  </Box>
                )}

                {/* Actions */}
                <Box sx={{ px: 2, pb: 1.75, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" disabled={!routeId}
                    onClick={() => routeId && navigate(`/client/${routeId}?conversationId=${d.sourceConversationId || ''}&clientName=${encodeURIComponent(clientLabel(d))}`)}
                    sx={{ flex: 1, minWidth: 70, py: 1, fontSize: '0.6875rem', fontFamily: MONO, borderColor: Colors.border, color: Colors.navy, borderRadius: '8px' }}>
                    THREAD
                  </Button>

                  {d.status === 'raised' && (
                    <>
                      <Button size="small" variant="contained" onClick={() => transition(d._id, 'rejected', 'rejected')} disabled={resolvingId === d._id}
                        sx={{ flex: 1, minWidth: 70, py: 1, fontSize: '0.6875rem', fontFamily: MONO, bgcolor: Colors.danger + '15', color: Colors.danger, border: `1px solid ${Colors.danger}40`, boxShadow: 'none', borderRadius: '8px', '&:hover': { bgcolor: Colors.danger + '25' } }}>
                        REJECT
                      </Button>
                      <Button size="small" variant="contained" onClick={() => transition(d._id, 'investigating')} disabled={resolvingId === d._id}
                        sx={{ flex: 1, minWidth: 70, py: 1, fontSize: '0.6875rem', fontFamily: MONO, bgcolor: Colors.info, borderRadius: '8px', '&:hover': { bgcolor: Colors.info + 'dd' } }}>
                        {resolvingId === d._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'INVESTIGATE'}
                      </Button>
                    </>
                  )}

                  {d.status === 'investigating' && (
                    <Button size="small" variant="contained" onClick={() => transition(d._id, 'resolved', 'resolved')} disabled={resolvingId === d._id}
                      sx={{ flex: 1, py: 1, fontSize: '0.6875rem', fontFamily: MONO, bgcolor: Colors.success, borderRadius: '8px', '&:hover': { bgcolor: Colors.success + 'dd' } }}>
                      {resolvingId === d._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'RESOLVE'}
                    </Button>
                  )}

                  {d.status === 'awaiting_client' && (
                    <>
                      <Button size="small" variant="contained" onClick={() => transition(d._id, 'investigating')} disabled={resolvingId === d._id}
                        sx={{ flex: 1, py: 1, fontSize: '0.6875rem', fontFamily: MONO, bgcolor: Colors.info, borderRadius: '8px' }}>
                        REOPEN
                      </Button>
                      <Button size="small" variant="contained" onClick={() => transition(d._id, 'resolved', 'resolved')} disabled={resolvingId === d._id}
                        sx={{ flex: 1, py: 1, fontSize: '0.6875rem', fontFamily: MONO, bgcolor: Colors.success, borderRadius: '8px' }}>
                        {resolvingId === d._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'RESOLVE'}
                      </Button>
                    </>
                  )}

                  {(d.status === 'resolved' || d.status === 'rejected') && (
                    <Box sx={{ flex: 1, py: 0.75, borderRadius: '8px', bgcolor: Colors.cardAlt, border: `1px solid ${Colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO }}>
                        {d.status === 'resolved' ? '✓ RESOLVED' : '✗ REJECTED'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuDisputeId(null); }}>
        <MenuItem onClick={() => { const id = menuDisputeId; setMenuAnchor(null); setMenuDisputeId(null); deleteDispute(id); }} sx={{ color: Colors.danger, gap: 1 }}>
          <Delete fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
