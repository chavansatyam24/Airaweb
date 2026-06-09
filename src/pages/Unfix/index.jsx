import {
  Alert,
  Box,
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

const SERIF = '"Fraunces", Georgia, serif';
const MONO = '"JetBrains Mono", monospace';

const SECTIONS = [
  { key: 'awaitingMode',    title: 'Awaiting Mode Choice',       color: Colors.warning, label: 'AWAITING'    },
  { key: 'negotiating',     title: 'In Negotiation',             color: Colors.info,    label: 'NEGOTIATING' },
  { key: 'rateLocked',      title: 'Rate Locked',                color: Colors.success, label: 'LOCKED'      },
  { key: 'accountsPending', title: 'Pending DN/CN · Accounts',   color: Colors.gold,    label: 'DN/CN'       },
];

function StatusPill({ label, color }) {
  return (
    <Box sx={{
      px: '8px', py: '3px', borderRadius: '99px', flexShrink: 0,
      bgcolor: color + '18', border: `1px solid ${color}50`,
    }}>
      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color, fontFamily: MONO, letterSpacing: '0.08em' }}>
        {label}
      </Typography>
    </Box>
  );
}

function SectionLabel({ title, color, count }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5, mb: 1 }}>
      <Box sx={{ width: 3, height: 13, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ flex: 1, fontSize: '0.6875rem', fontWeight: 700, color: Colors.navy, letterSpacing: '0.04em', fontFamily: MONO }}>
        {title}
      </Typography>
      <Box sx={{ px: '8px', py: '2px', borderRadius: '99px', bgcolor: color + '18', border: `1px solid ${color}40` }}>
        <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color, fontFamily: MONO }}>{count}</Typography>
      </Box>
    </Box>
  );
}

function SettlementRow({ item, color, label, isLast, onClick }) {
  const lastProposal = item.rateProposals?.[item.rateProposals.length - 1];
  const tier = item.clientId?.tier || item.clientTier;
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : `1px solid ${Colors.border}`,
        '&:hover': { bgcolor: Colors.bg },
        transition: 'background 0.1s',
      }}
    >
      {/* Color stripe */}
      <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: color, flexShrink: 0 }} />

      {/* Main content */}
      <Box sx={{ flex: 1, py: 1.25, px: 1.5, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.3 }}>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 400, color: Colors.navy, fontFamily: SERIF, lineHeight: 1.2 }} noWrap>
            {item.clientId?.name || item.clientName || 'Client'}
          </Typography>
          {tier && <TierBadge tier={tier} size={18} />}
          {item.clientId?.prefersScreenshots && <Typography sx={{ fontSize: '0.6875rem', lineHeight: 1 }}>🖼</Typography>}
        </Box>
        <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary, fontFamily: MONO, letterSpacing: '0.02em' }}>
          {item.totalGrams}g
          {item.invoiceNumbers?.[0] ? ` · INV ${item.invoiceNumbers[0]}` : ''}
          {item.finalAmount ? ` · ₹${formatINR(item.finalAmount)}` : ''}
        </Typography>
      </Box>

      {/* Last rate proposal chip */}
      {lastProposal && (
        <Box sx={{
          textAlign: 'center', bgcolor: Colors.bg, borderRadius: '6px',
          px: 1, py: 0.625, border: `1px solid ${Colors.border}`,
          flexShrink: 0, mr: 1,
        }}>
          <Typography sx={{ fontSize: '0.4375rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, letterSpacing: '0.06em', display: 'block', mb: 0.25 }}>
            LAST
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: Colors.navy, fontFamily: MONO, lineHeight: 1 }}>
            ₹{formatINR(lastProposal.ratePer10g)}
            <Typography component="span" sx={{ fontSize: '0.5rem', color: Colors.textMuted, fontFamily: MONO }}>/10g</Typography>
          </Typography>
        </Box>
      )}

      {/* Status pill */}
      <Box sx={{ flexShrink: 0, pr: 1.5 }}>
        <StatusPill label={label} color={color} />
      </Box>
    </Box>
  );
}

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

      {/* ── Header ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>
            UNFIX SETTLEMENTS
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Rate Negotiations
          </Typography>
          {totalActive > 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.6875rem', mt: 0.25, fontFamily: MONO }}>
              {totalActive} active
            </Typography>
          )}
        </Box>
        {ceoCount > 0 && (
          <Box sx={{ bgcolor: Colors.danger + '25', borderRadius: '99px', border: `1px solid ${Colors.danger}50`, px: 1.25, py: 0.625 }}>
            <Typography sx={{ color: Colors.danger, fontSize: '0.6875rem', fontWeight: 700, fontFamily: MONO }}>
              ⚠ {ceoCount} CEO
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Body ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {boardQ.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : (
          <>
            {/* Live rate ticker — dark navy card matching mobile */}
            {liveRates?.maxRate && (
              <Paper elevation={0} sx={{
                mb: 2, p: 1.5,
                bgcolor: Colors.navy,
                border: `1px solid ${Colors.gold}40`,
                borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: Colors.gold,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', fontFamily: MONO }}>Au</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.12em', fontFamily: MONO }}>
                    LIVE · MAX RATE
                  </Typography>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', fontFamily: MONO, lineHeight: 1.2 }}>
                    ₹{formatINR(liveRates.maxRate)}
                    <Typography component="span" sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>/10g</Typography>
                  </Typography>
                </Box>
                {liveRates.maxSource && (
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}>
                    {liveRates.maxSource.split(' ')[0]}
                  </Typography>
                )}
              </Paper>
            )}

            {/* ── CEO Action Required — pinned ── */}
            {ceoCount > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ flex: 1, fontSize: '0.6875rem', fontWeight: 700, color: Colors.danger, letterSpacing: '0.06em', fontFamily: MONO }}>
                    ⚠ CEO ACTION REQUIRED
                  </Typography>
                  <Box sx={{ px: '8px', py: '2px', borderRadius: '99px', bgcolor: Colors.danger + '18', border: `1px solid ${Colors.danger}40` }}>
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.danger, fontFamily: MONO }}>{ceoCount}</Typography>
                  </Box>
                </Box>

                {board.counterPending.map(s => (
                  <Paper key={s._id} elevation={0} sx={{
                    mb: 1.5,
                    border: `1px solid ${Colors.danger}40`,
                    borderLeft: `4px solid ${Colors.danger}`,
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <Box sx={{ p: 2, pb: 1.25 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, mr: 1 }}>
                          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 400, color: Colors.navy, fontFamily: SERIF }}>
                            {s.clientId?.name || s.clientName}
                          </Typography>
                          {(s.clientId?.tier || s.clientTier) && (
                            <TierBadge tier={s.clientId?.tier || s.clientTier} size={18} />
                          )}
                        </Box>
                        <StatusPill label="FLAGGED" color={Colors.danger} />
                      </Box>
                      <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary, fontFamily: MONO }}>
                        {s.totalGrams}g{s.invoiceNumbers?.length ? ` · INV ${s.invoiceNumbers.join(', ')}` : ''}
                      </Typography>
                    </Box>

                    {s.ceoApprovalReason && (
                      <Box sx={{ mx: 2, mb: 1.25, bgcolor: '#FBE9E7', borderRadius: 1, px: 1.5, py: 1 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#8B1A1A', lineHeight: 1.5 }}>
                          {s.ceoApprovalReason}
                        </Typography>
                      </Box>
                    )}

                    <Box
                      onClick={() => navigate(`/settlement/${s._id}`)}
                      sx={{
                        mx: 2, mb: 2, bgcolor: Colors.danger, borderRadius: '8px', py: 1.125,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'opacity 0.15s',
                        '&:hover': { opacity: 0.88 },
                      }}
                    >
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8125rem', fontFamily: MONO }}>
                        Review &amp; Decide →
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </>
            )}

            {/* ── Regular sections ── */}
            {SECTIONS.map(section => {
              const items = board[section.key] ?? [];
              if (!items.length) return null;
              return (
                <Box key={section.key}>
                  <SectionLabel title={section.title} color={section.color} count={items.length} />
                  <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
                    {items.map((s, i) => (
                      <SettlementRow
                        key={s._id}
                        item={s}
                        color={section.color}
                        label={section.label}
                        isLast={i === items.length - 1}
                        onClick={() => navigate(`/settlement/${s._id}`)}
                      />
                    ))}
                  </Paper>
                </Box>
              );
            })}

            {/* Empty state */}
            {totalActive === 0 && !boardQ.isLoading && (
              <Box sx={{ textAlign: 'center', pt: 10 }}>
                <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🏅</Typography>
                <Typography variant="h3" sx={{ color: Colors.navy, mb: 0.5 }}>All settled</Typography>
                <Typography sx={{ color: Colors.textMuted, fontSize: '0.875rem' }}>No active rate negotiations</Typography>
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
