import { ChevronRight, SwapVert } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientDueReportApi } from '../../api/index';
import { formatINR } from '../../utils/format';
import { Colors } from '../../theme/index';

const SERIF = '"Fraunces", Georgia, serif';
const MONO = '"JetBrains Mono", monospace';

const FILTER_OPTIONS = [
  { k: 'all',     label: 'All' },
  { k: 'A',       label: 'Tier A' },
  { k: 'B',       label: 'Tier B' },
  { k: 'C',       label: 'Tier C' },
  { k: 'blocked', label: '🚫 Blocked' },
  { k: 'paused',  label: '⏸ Paused' },
];

const SORT_OPTIONS = [
  { val: 'balance_desc',    label: 'Balance (High to Low)',  sub: 'Highest overdue first' },
  { val: 'balance_asc',     label: 'Balance (Low to High)',  sub: 'Lowest overdue first' },
  { val: 'clientName_asc',  label: 'Client Name (A → Z)',    sub: 'Alphabetical ascending' },
  { val: 'clientName_desc', label: 'Client Name (Z → A)',    sub: 'Alphabetical descending' },
];

const PAGE_SIZE = 15;

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

  const listSub = useMemo(() => {
    if (totalClients === 0 && !isLoading) return 'No matches';
    if (all.length === 0) return isLoading ? 'Loading…' : `${totalClients} total`;
    if (all.length >= totalClients) return `${totalClients} client${totalClients === 1 ? '' : 's'}`;
    return `${all.length} of ${totalClients}`;
  }, [all.length, totalClients, isLoading]);

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

      {/* ── Header ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 2.5, py: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 500, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            Clients
          </Typography>
          <Typography sx={{ color: '#aab1c0', fontSize: '0.75rem', mt: 0.25 }}>
            {listSub}
          </Typography>
        </Box>
        <Box
          onClick={e => setSortAnchor(e.currentTarget)}
          sx={{
            p: '6px', borderRadius: '8px', cursor: 'pointer',
            color: sort !== 'balance_desc' ? Colors.gold : 'rgba(255,255,255,0.75)',
            bgcolor: sortAnchor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${sort !== 'balance_desc' ? Colors.gold + '60' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex', alignItems: 'center',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <SwapVert sx={{ fontSize: 20 }} />
        </Box>
        <Menu
          anchorEl={sortAnchor}
          open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 0.75, minWidth: 240,
              border: `1px solid ${Colors.border}`,
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              overflow: 'hidden',
              '& .MuiList-root': { py: 0.75 },
            },
          }}
        >
          <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.2em', fontFamily: MONO }}>
            SORT BY
          </Typography>
          {SORT_OPTIONS.map(o => (
            <MenuItem
              key={o.val}
              onClick={() => { setSort(o.val); setSortAnchor(null); }}
              sx={{
                mx: 0.75, borderRadius: '8px',
                py: 1, px: 1.5,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                bgcolor: sort === o.val ? Colors.gold + '12' : 'transparent',
                transition: 'all 0.1s',
                '&:hover': { bgcolor: sort === o.val ? Colors.gold + '20' : Colors.bg },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <Typography sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: sort === o.val ? 700 : 500, color: sort === o.val ? Colors.navy : Colors.textPrimary }}>
                  {o.label}
                </Typography>
                {sort === o.val && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: Colors.gold, flexShrink: 0 }} />}
              </Box>
              <Typography sx={{ fontSize: '0.625rem', color: Colors.textMuted, mt: 0.15 }}>{o.sub}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* ── Search ── */}
      <Box sx={{ bgcolor: Colors.bg, px: 2, py: 1.25, flexShrink: 0 }}>
        <TextField
          fullWidth size="small"
          placeholder="Search name or client code…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#fff', borderRadius: '8px', fontSize: '0.875rem',
              '& fieldset': { borderColor: Colors.border },
              '&:hover fieldset': { borderColor: Colors.textMuted },
              '&.Mui-focused fieldset': { borderColor: Colors.gold },
            },
          }}
        />
      </Box>

      {/* ── Filter chips ── */}
      <Box sx={{
        bgcolor: Colors.bg, px: 2, py: 0.75,
        display: 'flex', gap: 0.75, overflowX: 'auto', flexShrink: 0,
        borderBottom: `1px solid ${Colors.borderLight}`,
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {FILTER_OPTIONS.map(c => {
          const active = filter === c.k;
          return (
            <Box
              key={c.k}
              onClick={() => setFilter(c.k)}
              sx={{
                px: '12px', py: '6px', borderRadius: '99px',
                bgcolor: active ? Colors.navy : '#fff',
                border: `1px solid ${active ? Colors.navy : Colors.border}`,
                cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: active ? Colors.navyAlt : Colors.bg },
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: active ? 700 : 500, color: active ? '#fff' : Colors.textPrimary, lineHeight: 1 }}>
                {c.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── List ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : all.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10, px: 3 }}>
            <Typography sx={{ color: Colors.textSecondary, fontSize: '0.875rem' }}>
              {debouncedSearch ? `No clients match "${debouncedSearch}".` : 'No overdue clients in this report.'}
            </Typography>
          </Box>
        ) : (
          <>
            {all.map((item) => (
              <Box
                key={item.clientCode}
                onClick={() => navigate(`/client/${item.clientCode}?clientName=${encodeURIComponent(item.clientName || '')}`)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25,
                  bgcolor: '#fff',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${Colors.borderLight}`,
                  transition: 'background 0.1s',
                  '&:hover': { bgcolor: Colors.bg },
                  ml: 0,
                }}
              >
                {/* Circle avatar */}
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  bgcolor: Colors.cream, border: `2px solid ${Colors.gold}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{ color: Colors.gold, fontWeight: 700, fontFamily: SERIF, fontSize: '1.0625rem', lineHeight: 1 }}>
                    {item.clientName?.[0] || '?'}
                  </Typography>
                </Box>

                {/* Name + meta */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: Colors.navy, fontFamily: SERIF, lineHeight: 1.3 }} noWrap>
                    {item.clientName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary, mt: 0.25 }}>
                    {item.oldestBillPendingDays ? `${item.oldestBillPendingDays}d oldest` : '—'}
                  </Typography>
                </Box>

                {/* Amount right column */}
                <Box sx={{ alignItems: 'flex-end', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <Typography sx={{
                    fontSize: '1rem', fontWeight: 700, fontFamily: SERIF, letterSpacing: '-0.5px',
                    color: item.totalBalance > 0 ? Colors.danger : Colors.textPrimary,
                    lineHeight: 1.2,
                  }}>
                    ₹{formatINR(item.totalBalance || 0)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, letterSpacing: '0.15em', mt: 0.25 }}>
                    OVERDUE
                  </Typography>
                </Box>

                <ChevronRight sx={{ fontSize: 18, color: Colors.textMuted, flexShrink: 0 }} />
              </Box>
            ))}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
            </div>
          </>
        )}
      </Box>

    </Box>
  );
}
