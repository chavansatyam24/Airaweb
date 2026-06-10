import { ArrowBack } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Switch,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { adminApi, clientApi } from '../../api/index';
import { useAuth, useCanWrite } from '../../store/auth';
import { formatINRLakhs } from '../../utils/format';
import { Colors } from '../../theme/index';

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

function ControlRow({ title, subtitle, right }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.75, gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: Colors.navy }}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.75rem', color: Colors.textSecondary, mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{right}</Box>
    </Box>
  );
}

export default function ClientOverrides() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const canWrite = useCanWrite();
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientApi.get(id),
    enabled: !!id,
  });
  const client = data?.client;

  const showSnack = (msg, severity = 'error') => setSnack({ open: true, msg, severity });

  const togglePause = async (val) => {
    if (!canWrite || busy) return;
    setBusy(true);
    try {
      await clientApi.pause(client._id, { paused: val, reason: val ? 'Manual override' : undefined, by: user?.email || 'unknown' });
      await refetch();
      qc.invalidateQueries({ queryKey: ['clients'] });
      showSnack(val ? 'Aira paused for this client' : 'Aira resumed', 'success');
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async (val) => {
    if (!canWrite || busy) return;
    setBusy(true);
    try {
      await clientApi.block(client._id, { flag: val, reason: val ? 'CEO manual block' : 'CEO manual release', by: user?.email || 'unknown' });
      await refetch();
      qc.invalidateQueries({ queryKey: ['clients'] });
      showSnack(val ? 'Order block applied' : 'Order block removed', 'success');
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const toggleScreenshot = async (val) => {
    if (!canWrite || busy) return;
    setBusy(true);
    try {
      await clientApi.setScreenshotPref(client._id, { prefersScreenshots: val, by: user?.email || 'unknown' });
      await refetch();
      showSnack(val ? 'Screenshot preference enabled' : 'Screenshot preference disabled', 'success');
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const setTier = async (newTier) => {
    if (!canWrite || busy) return;
    setBusy(true);
    try {
      await clientApi.setTier(client._id, { tier: newTier, by: user?.email || 'unknown' });
      await refetch();
      qc.invalidateQueries({ queryKey: ['clients'] });
      showSnack(`Tier set to ${newTier}`, 'success');
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not update tier');
    } finally {
      setBusy(false);
    }
  };

  const generateTemplate = async () => {
    if (!canWrite || generating) return;
    if (!window.confirm(`Generate WhatsApp template for ${client.name} with latest dues data?`)) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const clientCode = client.clientCode || id;
      const res = await adminApi.generateTemplate(clientCode);
      setGenResult(res);
      showSnack('Template generated successfully', 'success');
    } catch (err) {
      showSnack(err?.response?.data?.message || err?.message || 'Failed to generate template');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading || !client) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton>
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>Client Controls</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress sx={{ color: Colors.gold }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 400, fontFamily: SERIF }} noWrap>
              {client.name}
            </Typography>
            {client.tier && <TierBadge tier={client.tier} />}
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.15em', fontFamily: MONO }}>
            CLIENT CONTROLS
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => navigate(`/client/${id}?clientName=${encodeURIComponent(client.name || '')}`)}
          sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO, border: `1px solid ${Colors.gold}50`, borderRadius: '6px', px: 1, height: 24 }}
        >
          THREAD →
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: Colors.bg, p: 2 }}>
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>

          {/* Pause */}
          <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '12px', mb: 1.5, overflow: 'hidden' }}>
            <ControlRow
              title="Pause Aira"
              subtitle="Stop all reminders for this client"
              right={
                <Switch
                  checked={!!client.isPaused}
                  onChange={e => togglePause(e.target.checked)}
                  disabled={!canWrite || busy}
                  sx={{ '& .MuiSwitch-track': { bgcolor: Colors.border }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: Colors.warning + ' !important' } }}
                />
              }
            />
            {client.isPaused && client.pauseReason && (
              <Box sx={{ px: 2, pb: 1.25, mt: -0.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: Colors.warning, fontStyle: 'italic' }}>
                  Reason: {client.pauseReason}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Order Block */}
          <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '12px', mb: 1.5, overflow: 'hidden' }}>
            <ControlRow
              title="Order Block"
              subtitle="Block new orders at Gati ERP"
              right={
                <Switch
                  checked={!!client.isOrderBlocked}
                  onChange={e => toggleBlock(e.target.checked)}
                  disabled={!canWrite || busy}
                  sx={{ '& .Mui-checked + .MuiSwitch-track': { bgcolor: Colors.danger + ' !important' } }}
                />
              }
            />
          </Paper>

          {/* Screenshot preference */}
          <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '12px', mb: 1.5, overflow: 'hidden' }}>
            <ControlRow
              title="Auto-attach Screenshots"
              subtitle="Send rate proof with every Unfix proposal"
              right={
                <Switch
                  checked={!!client.prefersScreenshots}
                  onChange={e => toggleScreenshot(e.target.checked)}
                  disabled={!canWrite || busy}
                  sx={{ '& .Mui-checked + .MuiSwitch-track': { bgcolor: Colors.gold + ' !important' } }}
                />
              }
            />
          </Paper>

          {/* Tier selector */}
          <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '12px', mb: 1.5, overflow: 'hidden', p: 2 }}>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: Colors.navy, mb: 0.5 }}>Tier</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: Colors.textSecondary, mb: 1.5 }}>Override automatic classification</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['A', 'B', 'C'].map(t => {
                const tierColors = { A: Colors.success, B: Colors.gold, C: Colors.danger };
                const isActive = client.tier === t;
                return (
                  <Box
                    key={t}
                    onClick={() => !isActive && setTier(t)}
                    sx={{
                      flex: 1, p: 1.5, borderRadius: '10px', textAlign: 'center', cursor: isActive ? 'default' : 'pointer',
                      border: `2px solid ${isActive ? tierColors[t] : Colors.border}`,
                      bgcolor: isActive ? tierColors[t] + '12' : '#fff',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: !isActive && !busy ? Colors.bg : undefined },
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                      <TierBadge tier={t} />
                    </Box>
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: isActive ? tierColors[t] : Colors.textMuted, fontFamily: MONO }}>
                      TIER {t}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* Generate Template */}
          <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '12px', mb: 1.5, overflow: 'hidden', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: Colors.navy, mb: 0.25 }}>
                  Generate Template Message
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: Colors.textSecondary }}>
                  Create WhatsApp template message with latest dues data. Data reflects today's balances.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={generateTemplate}
                disabled={generating || !canWrite}
                sx={{ bgcolor: Colors.navy, '&:hover': { bgcolor: Colors.navyAlt }, flexShrink: 0, height: 34, fontWeight: 700, fontSize: '0.75rem' }}
              >
                {generating ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Generate'}
              </Button>
            </Box>

            {genResult && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${Colors.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{
                    px: '8px', py: '3px', borderRadius: '6px',
                    bgcolor: genResult.result === 'created' ? Colors.success + '15' : Colors.info + '15',
                    border: `1px solid ${genResult.result === 'created' ? Colors.success : Colors.info}40`,
                  }}>
                    <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: MONO, color: genResult.result === 'created' ? Colors.success : Colors.info }}>
                      {(genResult.result || '').toUpperCase()}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: Colors.navy }}>
                    {genResult.templateName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { label: 'OUTSTANDING', value: formatINRLakhs(genResult.overdueamt) },
                    { label: 'OVERDUE DAYS', value: `${genResult.overduedays}d` },
                    { label: 'INVOICES', value: genResult.invoiceCount ?? '—' },
                    ...(genResult.unfixGold > 0 ? [{ label: 'UNFIX GOLD', value: formatINRLakhs(genResult.unfixGold), highlight: true }] : []),
                  ].map(m => (
                    <Box key={m.label}>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: m.highlight ? Colors.gold : Colors.textMuted, letterSpacing: '0.1em', fontFamily: MONO }}>{m.label}</Typography>
                      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: m.highlight ? Colors.gold : Colors.navy, fontFamily: SERIF }}>{m.value}</Typography>
                    </Box>
                  ))}
                </Box>
                {genResult.convId && (
                  <Button
                    size="small"
                    onClick={() => navigate(`/client/${id}?conversationId=${genResult.convId}`)}
                    sx={{ mt: 1.5, height: 30, fontSize: '0.625rem', fontWeight: 700, fontFamily: MONO, color: Colors.gold, border: `1px solid ${Colors.gold}50`, borderRadius: '6px', px: 1.5 }}
                  >
                    VIEW IN CHAT →
                  </Button>
                )}
              </Box>
            )}
          </Paper>

        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
