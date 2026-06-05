import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { unfixApi } from '../../api/index';
import { formatINR } from '../../utils/format';
import { Colors } from '../../theme/index';

const SECTION_CONFIG = [
  { key: 'counterPending', label: 'CEO Approval Needed', color: Colors.danger },
  { key: 'awaitingMode', label: 'Awaiting Mode', color: Colors.textMuted },
  { key: 'negotiating', label: 'Negotiating', color: Colors.info },
  { key: 'rateLocked', label: 'Rate Locked', color: Colors.success },
  { key: 'accountsPending', label: 'Accounts Pending', color: Colors.warning },
  { key: 'closed', label: 'Closed', color: Colors.textMuted },
];

export default function Unfix() {
  const navigate = useNavigate();
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const boardQ = useQuery({ queryKey: ['unfix-board'], queryFn: () => unfixApi.board(), staleTime: 0 });
  const ratesQ = useQuery({ queryKey: ['live-rates'], queryFn: () => unfixApi.liveRates(), refetchInterval: 5 * 60 * 1000 });

  const board = boardQ.data ?? {};
  const liveRates = ratesQ.data;

  const totalActive =
    (board.awaitingMode?.length ?? 0) +
    (board.negotiating?.length ?? 0) +
    (board.counterPending?.length ?? 0) +
    (board.rateLocked?.length ?? 0) +
    (board.accountsPending?.length ?? 0);

  const ceoCount = board.counterPending?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
            {totalActive > 0 ? `${totalActive} ACTIVE` : 'UNFIX SETTLEMENTS'}
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Rate Negotiations
          </Typography>
        </Box>
        {ceoCount > 0 && (
          <Chip label={`⚠ ${ceoCount} CEO`} size="small" sx={{ bgcolor: Colors.danger + '20', color: Colors.danger, border: `1px solid ${Colors.danger}50`, fontWeight: 700 }} />
        )}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {boardQ.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : (
          <>
            {/* Live rate ticker */}
            {liveRates?.maxRate && (
              <Paper elevation={0} sx={{ mb: 2, p: 1.5, border: `1px solid ${Colors.gold}40`, bgcolor: Colors.gold + '08', display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>LIVE GOLD RATE</Typography>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 400, color: Colors.navy, fontFamily: '"Fraunces", Georgia, serif' }}>₹{formatINR(liveRates.maxRate)}<Typography component="span" sx={{ fontSize: '0.75rem', color: Colors.textSecondary, fontWeight: 400, fontFamily: '"Inter", sans-serif' }}>/10g</Typography></Typography>
                </Box>
                {liveRates.minRate && liveRates.minRate !== liveRates.maxRate && (
                  <Box>
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>RANGE</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: Colors.textPrimary }}>
                      ₹{formatINR(liveRates.minRate)} – ₹{formatINR(liveRates.maxRate)}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {SECTION_CONFIG.map(section => {
              const sectionItems = board[section.key] ?? [];
              if (sectionItems.length === 0) return null;
              return (
                <Box key={section.key} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>{section.label}</Typography>
                    <Box sx={{ bgcolor: section.color, borderRadius: 99, px: '6px', py: '1px' }}>
                      <Typography sx={{ color: '#fff', fontSize: '0.5625rem', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{sectionItems.length}</Typography>
                    </Box>
                  </Box>
                  {sectionItems.map(item => (
                    <Paper
                      key={item._id}
                      elevation={0}
                      onClick={() => navigate(`/settlement/${item._id}`)}
                      sx={{
                        mb: 1, p: 2, border: `1px solid ${section.key === 'counterPending' ? Colors.danger + '50' : Colors.border}`,
                        borderLeft: `4px solid ${section.color}`, borderRadius: 2, cursor: 'pointer',
                        '&:hover': { bgcolor: Colors.bg },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 400, color: Colors.navy, fontFamily: '"Fraunces", Georgia, serif' }}>
                            {item.clientId?.name || item.clientName || 'Client'}
                          </Typography>
                          {item.clientTier && <TierBadge tier={item.clientTier} />}
                          {item.needsCEOApproval && <Chip label="CEO" size="small" sx={{ height: 18, fontSize: '0.5625rem', bgcolor: Colors.danger + '18', color: Colors.danger, fontWeight: 700 }} />}
                        </Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: Colors.gold }}>
                          {item.totalGrams}g
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, fontWeight: 700, letterSpacing: '0.08em' }}>BILLING RATE</Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: Colors.textPrimary }}>₹{formatINR(item.billingDateRate)}/10g</Typography>
                        </Box>
                        {item.finalRatePer10g && (
                          <Box>
                            <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, fontWeight: 700, letterSpacing: '0.08em' }}>FINAL RATE</Typography>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: Colors.success }}>₹{formatINR(item.finalRatePer10g)}/10g</Typography>
                          </Box>
                        )}
                        {item.invoiceNumbers?.length > 0 && (
                          <Box>
                            <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, fontWeight: 700, letterSpacing: '0.08em' }}>INVOICE</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: Colors.textSecondary }}>{item.invoiceNumbers.join(', ')}</Typography>
                          </Box>
                        )}
                      </Box>

                      {item.rateProposals?.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {item.rateProposals.slice(-2).map((p, i) => (
                            <Chip key={i} label={`${p.proposedBy}: ₹${formatINR(p.ratePer10g)}/10g`} size="small"
                              sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 600, bgcolor: Colors.cardAlt }} />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              );
            })}

            {totalActive === 0 && Object.keys(board).every(k => !board[k]?.length) && (
              <Box sx={{ textAlign: 'center', pt: 10 }}>
                <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>✓</Typography>
                <Typography variant="h3" sx={{ color: Colors.navy }}>No active settlements</Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
