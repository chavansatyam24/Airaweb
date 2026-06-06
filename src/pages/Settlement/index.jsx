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
import { useNavigate, useParams } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { unfixApi } from '../../api/index';
import { useAuth, useIsAdmin } from '../../store/auth';
import { formatINR } from '../../utils/format';
import { Colors } from '../../theme/index';

export default function Settlement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth(s => s.user);
  const isAdmin = useIsAdmin();
  const [finalRate, setFinalRate] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unfix-settlement', id],
    queryFn: () => unfixApi.get(id),
    enabled: !!id,
  });

  const item = data?.item;

  const showSnack = (msg, severity = 'error') => setSnack({ open: true, msg, severity });

  const handleApprove = async () => {
    const rate = Number(finalRate);
    if (!rate || rate < 50000 || rate > 200000) {
      showSnack('Rate must be between ₹50,000 and ₹2,00,000 per 10g');
      return;
    }
    try {
      setApproving(true);
      await unfixApi.ceoApprove(id, { finalRate: rate, by: user?.username || 'unknown' });
      await refetch();
      qc.invalidateQueries({ queryKey: ['unfix-board'] });
      showSnack('Rate approved successfully', 'success');
      setFinalRate('');
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not approve rate');
    } finally {
      setApproving(false);
    }
  };

  const handleClose = async () => {
    if (!closeReason.trim()) { showSnack('Please provide a reason for closing'); return; }
    try {
      setClosing(true);
      await unfixApi.close(id, { by: user?.username || 'unknown', reason: closeReason.trim() });
      qc.invalidateQueries({ queryKey: ['unfix-board'] });
      navigate(-1);
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Could not close settlement');
    } finally {
      setClosing(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress sx={{ color: Colors.gold }} />
      </Box>
    );
  }

  if (!item) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton>
          <Typography sx={{ color: '#fff', fontWeight: 700 }}>Settlement</Typography>
        </Box>
        <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Settlement not found.</Typography></Box>
      </Box>
    );
  }

  const midpointRate = item.rateProposals?.length >= 2
    ? Math.round((item.rateProposals[item.rateProposals.length - 1].ratePer10g + item.rateProposals[item.rateProposals.length - 2].ratePer10g) / 2)
    : null;

  const clientCode = item.clientId?.clientCode || item.clientCode;
  const clientName = item.clientId?.name || 'Client';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}>
            {clientName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            {item.totalGrams}g · {item.invoiceNumbers?.join(', ')}
          </Typography>
        </Box>
        {/* View Thread */}
        {clientCode && (
          <Button
            size="small"
            onClick={() => navigate(`/client/${clientCode}?clientName=${encodeURIComponent(clientName)}`)}
            sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', border: `1px solid ${Colors.gold}50`, borderRadius: '6px', px: 1, height: 24, flexShrink: 0 }}
          >
            THREAD →
          </Button>
        )}
        {item.needsCEOApproval && (
          <Chip label="CEO APPROVAL" size="small" sx={{ bgcolor: Colors.danger + '20', color: Colors.danger, fontWeight: 700, border: `1px solid ${Colors.danger}50` }} />
        )}
      </Box>

      {/* Alert reason banner */}
      {item.alertReason && (
        <Box sx={{ bgcolor: Colors.warning + '18', borderBottom: `1px solid ${Colors.warning}30`, px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', color: Colors.warning, fontWeight: 600, flex: 1 }}>
            ⚠ {item.alertReason}
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {/* Overview card */}
        <Paper elevation={0} sx={{ mb: 2, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: Colors.navy }}>
              {clientName}
            </Typography>
            {item.clientTier && <TierBadge tier={item.clientTier} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { label: 'TOTAL GOLD', value: `${item.totalGrams}g` },
              { label: 'BILLING RATE', value: `₹${formatINR(item.billingDateRate)}/10g` },
              { label: 'BILLING AMT', value: `₹${formatINR(item.billingDateAmount)}` },
              item.billedReference && { label: 'BILLED REF', value: item.billedReference },
              item.finalRatePer10g && { label: 'FINAL RATE', value: `₹${formatINR(item.finalRatePer10g)}/10g`, color: Colors.success },
              item.finalAmount && { label: 'FINAL AMT', value: `₹${formatINR(item.finalAmount)}`, color: Colors.success },
            ].filter(Boolean).map(m => (
              <Box key={m.label}>
                <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em' }}>{m.label}</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: m.color || Colors.textPrimary }}>{m.value}</Typography>
              </Box>
            ))}
          </Box>
          {item.noteRequired && item.noteRequired !== 'none' && (
            <Chip label={item.noteRequired === 'debit_note' ? 'Debit Note Required' : 'Credit Note Required'} size="small"
              sx={{ mt: 1.5, bgcolor: Colors.info + '18', color: Colors.info, border: `1px solid ${Colors.info}50`, fontWeight: 700, fontSize: '0.6875rem' }} />
          )}
        </Paper>

        {/* Rate proposals */}
        {item.rateProposals?.length > 0 && (
          <Paper elevation={0} sx={{ mb: 2, p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', mb: 1.5 }}>RATE PROPOSALS</Typography>
            {item.rateProposals.map((p, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: idx < item.rateProposals.length - 1 ? `1px solid ${Colors.borderLight}` : 'none' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: Colors.textPrimary }}>{p.proposedBy}</Typography>
                  {p.notes && <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary }}>{p.notes}</Typography>}
                </Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: Colors.navy }}>₹{formatINR(p.ratePer10g)}/10g</Typography>
              </Box>
            ))}
            {midpointRate && (
              <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px dashed ${Colors.gold}60`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: Colors.gold, fontWeight: 700 }}>Midpoint</Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: Colors.gold }}>₹{formatINR(midpointRate)}/10g</Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* CEO Approval */}
        {item.needsCEOApproval && !item.finalRatePer10g && isAdmin && (
          <Paper elevation={0} sx={{ mb: 2, p: 2, border: `2px solid ${Colors.gold}40`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.1em', mb: 1.5 }}>CEO RATE APPROVAL</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: Colors.textSecondary, mb: 1.5 }}>
              Enter final rate per 10g (₹50,000 – ₹2,00,000). Midpoint suggestion: {midpointRate ? `₹${formatINR(midpointRate)}` : 'N/A'}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                size="small" type="number"
                placeholder="Final rate per 10g"
                value={finalRate}
                onChange={e => setFinalRate(e.target.value)}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              />
              <Button variant="contained" onClick={handleApprove} disabled={approving}
                sx={{ bgcolor: Colors.gold, '&:hover': { bgcolor: Colors.goldLight }, whiteSpace: 'nowrap' }}>
                {approving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Approve Rate'}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Close settlement */}
        {!item.finalRatePer10g && (
          <Paper elevation={0} sx={{ p: 2, border: `1px solid ${Colors.border}`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', mb: 1.5 }}>CLOSE SETTLEMENT</Typography>
            <TextField
              fullWidth size="small" multiline minRows={2}
              placeholder="Reason for closing…"
              value={closeReason}
              onChange={e => setCloseReason(e.target.value)}
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
            <Button fullWidth variant="outlined" onClick={handleClose} disabled={closing}
              sx={{ borderColor: Colors.border, color: Colors.textSecondary }}>
              {closing ? <CircularProgress size={16} sx={{ color: Colors.textSecondary }} /> : 'Close Settlement'}
            </Button>
          </Paper>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
