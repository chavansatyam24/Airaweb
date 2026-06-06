import { ChevronRight, Search, SwapVert } from '@mui/icons-material';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { clientDueReportApi } from '../../api/index';
import { formatINR } from '../../utils/format';
import { Colors } from '../../theme/index';

const FILTER_OPTIONS = [
  { k: 'all', label: 'All' },
  { k: 'A', label: 'Tier A' },
  { k: 'B', label: 'Tier B' },
  { k: 'C', label: 'Tier C' },
  { k: 'blocked', label: 'Blocked' },
  { k: 'paused', label: 'Paused' },
];

const SORT_OPTIONS = [
  { val: 'balance_desc', label: 'Balance: High → Low' },
  { val: 'balance_asc', label: 'Balance: Low → High' },
  { val: 'clientName_asc', label: 'Name: A → Z' },
  { val: 'clientName_desc', label: 'Name: Z → A' },
];

const PAGE_SIZE = 15;

function StatusPill({ label, variant }) {
  const styles = {
    blocked: { bg: '#FCE8E8', color: Colors.danger },
    paused: { bg: '#FFF3CD', color: Colors.warning },
    promise: { bg: '#E3F1FB', color: Colors.info },
    default: { bg: Colors.creamAlt, color: Colors.textSecondary },
  };
  const s = styles[variant] || styles.default;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 1, py: '2px', borderRadius: '99px',
      bgcolor: s.bg, color: s.color,
      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em',
      flexShrink: 0,
    }}>
      {label}
    </Box>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('balance_desc');
  const [sortAnchor, setSortAnchor] = useState(null);
  const loaderRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['clients', 'topOverdue', debouncedSearch, filter, sort],
    queryFn: ({ pageParam }) => clientDueReportApi.topOverDueReport(PAGE_SIZE, pageParam, debouncedSearch || undefined, filter, sort),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.totalNumberOfClients ?? lastPage.count ?? 0;
      const loaded = allPages.reduce((acc, p) => acc + (p.clients?.length ?? 0), 0);
      if (total > 0 && loaded >= total) return undefined;
      if ((lastPage.clients?.length ?? 0) < PAGE_SIZE) return undefined;
      return allPages.length + 1;
    },
  });

  const all = data?.pages.flatMap(p => p.clients) ?? [];
  const totalClients = useMemo(() => {
    const first = data?.pages[0];
    if (!first) return 0;
    return first.totalNumberOfClients ?? first.count ?? all.length;
  }, [data?.pages, all.length]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
              {isLoading ? 'LOADING…' : `${totalClients} CLIENTS`}
            </Typography>
            <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Clients
            </Typography>
          </Box>
          <Tooltip title="Sort">
            <IconButton
              size="small"
              onClick={e => setSortAnchor(e.currentTarget)}
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                color: sort !== 'balance_desc' ? Colors.gold : 'rgba(255,255,255,0.75)',
                bgcolor: sortAnchor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${sort !== 'balance_desc' ? Colors.gold + '60' : 'rgba(255,255,255,0.2)'}`,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)' },
              }}
            >
              <SwapVert sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 0.75,
                minWidth: 210,
                border: `1px solid ${Colors.border}`,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                '& .MuiList-root': { py: 0.75 },
              },
            }}
          >
            <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.15em', fontFamily: '"JetBrains Mono", monospace' }}>
              SORT BY
            </Typography>
            {SORT_OPTIONS.map(o => (
              <MenuItem
                key={o.val}
                onClick={() => { setSort(o.val); setSortAnchor(null); }}
                sx={{
                  mx: 0.75, borderRadius: '8px',
                  py: 0.875, px: 1.5,
                  fontSize: '0.8125rem',
                  fontWeight: sort === o.val ? 700 : 400,
                  color: sort === o.val ? Colors.navy : Colors.textPrimary,
                  bgcolor: sort === o.val ? Colors.gold + '15' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.1s',
                  '&:hover': { bgcolor: sort === o.val ? Colors.gold + '25' : Colors.bg },
                }}
              >
                {o.label}
                {sort === o.val && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: Colors.gold, ml: 1, flexShrink: 0 }} />
                )}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ bgcolor: Colors.navyAlt, px: 2, py: 1, flexShrink: 0 }}>
        <TextField
          fullWidth size="small"
          placeholder="Search by name, phone or code…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', mr: 0.75 }} /> }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              '& input': { color: '#fff', fontSize: '0.8125rem', '&::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 } },
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
              '&.Mui-focused fieldset': { borderColor: Colors.gold },
            },
          }}
        />
      </Box>

      {/* Filter chips */}
      <Box sx={{ bgcolor: '#fff', px: 2, py: 1, display: 'flex', gap: 0.75, overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${Colors.borderLight}` }}>
        {FILTER_OPTIONS.map(c => (
          <Chip
            key={c.k}
            label={c.label}
            size="small"
            onClick={() => setFilter(c.k)}
            sx={{
              cursor: 'pointer', flexShrink: 0,
              height: 26, fontSize: '0.6875rem', fontWeight: 700,
              bgcolor: filter === c.k ? Colors.navy : Colors.cardAlt,
              color: filter === c.k ? '#fff' : Colors.textSecondary,
              border: `1px solid ${filter === c.k ? Colors.navy : Colors.border}`,
              borderRadius: '99px',
              '&:hover': { bgcolor: filter === c.k ? Colors.navyAlt : Colors.bg },
            }}
          />
        ))}
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#fff' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : all.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10, px: 3 }}>
            <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>
              {debouncedSearch ? `No clients match "${debouncedSearch}".` : 'No overdue clients.'}
            </Typography>
          </Box>
        ) : (
          <>
            {all.map((item) => {
              const phone = item.phone || item.customerNumber || item.phoneNumber;
              return (
                <Box
                  key={item.clientCode}
                  onClick={() => navigate(`/client/${item.clientCode}?clientName=${encodeURIComponent(item.clientName || '')}`)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2, py: 1.5,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${Colors.borderLight}`,
                    bgcolor: '#fff',
                    transition: 'background 0.1s',
                    '&:hover': { bgcolor: Colors.bg },
                  }}
                >
                  <TierBadge tier={item.clientTier || item.tier} size={26} />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: Colors.navy, lineHeight: 1.3 }} noWrap>
                      {item.clientName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, mt: 0.25 }}>
                      {item.numberOfBills ?? item.invoiceCount ?? '—'} inv
                      {item.oldestBillPendingDays ? ` · oldest ${item.oldestBillPendingDays}d` : ''}
                      {item.totalBalance ? ` · ₹${formatINR(item.totalBalance)}` : ''}
                      {phone ? ` · ${phone}` : ''}
                    </Typography>
                  </Box>

                  {item.status === 'blocked' && <StatusPill label="BLOCKED" variant="blocked" />}
                  {item.status === 'paused' && <StatusPill label="PAUSED" variant="paused" />}
                  {item.hasActivePromise && <StatusPill label="PROMISE" variant="promise" />}

                  <ChevronRight sx={{ fontSize: 18, color: Colors.textMuted, flexShrink: 0 }} />
                </Box>
              );
            })}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
            </div>
          </>
        )}
      </Box>
    </Box>
  );
}
