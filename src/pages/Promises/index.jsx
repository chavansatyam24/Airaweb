import { ChevronRight } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { promiseApi } from '../../api/index';
import { Colors } from '../../theme/index';

const TAB_META = [
  { k: 'active', label: 'Active', color: Colors.warning },
  { k: 'honoured', label: 'Honoured', color: Colors.success },
  { k: 'broken', label: 'Broken', color: Colors.danger },
];

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

export default function Promises() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');

  const statsQ = useQuery({ queryKey: ['promises', 'stats'], queryFn: () => promiseApi.stats() });
  const clientsQ = useQuery({ queryKey: ['promises', 'clients', tab], queryFn: () => promiseApi.clients({ status: tab }) });

  const stats = statsQ.data;
  const clients = clientsQ.data?.clients ?? [];
  const loading = clientsQ.isPending;

  const tabsWithCounts = TAB_META.map(t => ({
    ...t,
    count: t.k === 'active' ? stats?.active ?? 0 : t.k === 'honoured' ? stats?.honoured ?? 0 : stats?.broken ?? 0,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>
          {stats != null ? `${stats.total} COMMITMENTS` : 'PROMISE BOARD'}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Promises
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              minHeight: 44,
            },
            '& .MuiTabs-indicator': { bgcolor: Colors.gold },
          }}
        >
          {tabsWithCounts.map(t => (
            <Tab key={t.k} value={t.k} label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {t.label}
                <Box sx={{ bgcolor: t.color, px: '6px', py: '1px', borderRadius: 99, minWidth: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO }}>{t.count}</Typography>
                </Box>
              </Box>
            } />
          ))}
        </Tabs>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : clients.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ color: Colors.textMuted, fontFamily: SERIF, fontSize: '1rem' }}>No {tab} promises</Typography>
          </Box>
        ) : (
          clients.map(c => (
            <Paper
              key={c.clientCode}
              onClick={() => navigate(`/promises/${c.clientCode}?status=${tab}`)}
              elevation={0}
              sx={{
                display: 'flex', alignItems: 'center',
                px: 2, py: 1.5, mb: 1, cursor: 'pointer',
                border: `1px solid ${Colors.border}`,
                borderRadius: '10px',
                bgcolor: '#fff',
                gap: 1.5,
                '&:hover': { bgcolor: Colors.bg },
              }}
            >
              <TierBadge tier={c.clientTier} size={26} />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 400, fontFamily: SERIF, color: Colors.navy, lineHeight: 1.2 }} noWrap>
                  {c.clientName}
                </Typography>
                {c.phone && (
                  <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, fontFamily: MONO, mt: 0.25 }}>
                    +{c.phone}
                  </Typography>
                )}
              </Box>

              <Box sx={{
                bgcolor: Colors.gold + '15',
                borderRadius: '99px',
                px: '10px', py: '4px',
                border: `1px solid ${Colors.gold}40`,
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: Colors.gold, fontFamily: MONO }}>{c.promiseCount}</Typography>
              </Box>

              <ChevronRight sx={{ fontSize: 16, color: Colors.textMuted, flexShrink: 0 }} />
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
}
