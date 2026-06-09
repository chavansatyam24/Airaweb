import { ArrowBack, ArrowForward, Delete, FilterAlt, MoreVert } from '@mui/icons-material';
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
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { promiseApi } from '../../api/index';
import { formatDate, formatINR } from '../../utils/format';
import { Colors, Shadows } from '../../theme/index';

const SORT_OPTIONS = [
  { val: 'createdAt_asc', label: 'Created At (asc)' },
  { val: 'createdAt_desc', label: 'Created At (desc)' },
  { val: 'expectedDate_asc', label: 'Expected Date (asc)' },
  { val: 'expectedDate_desc', label: 'Expected Date (desc)' },
];

const SERIF = '"Fraunces", Georgia, serif';
const MONO = '"JetBrains Mono", monospace';

function MetaLabel({ children }) {
  return (
    <Typography sx={{
      fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em',
      color: Colors.textMuted, mb: 0.25, textAlign: 'center', fontFamily: MONO,
    }}>
      {children}
    </Typography>
  );
}

function MetaVal({ children }) {
  return (
    <Typography sx={{
      fontSize: '0.9375rem', fontWeight: 700, color: Colors.textPrimary,
      fontFamily: SERIF, textAlign: 'center', lineHeight: 1.2,
    }}>
      {children}
    </Typography>
  );
}

function PromiseCard({ item, onDelete }) {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const isSpecific = item.promiseType === 'specific';
  const tier = item.clientTier || item.clientId?.tier;
  const clientName = item.clientName || item.clientCode;

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleDelete = () => {
    handleMenuClose();
    onDelete(item._id);
  };

  const handleViewThread = () => {
    if (!item.clientCode) return;
    const path = `/client/${item.clientCode}`;
    const params = item.sourceConversationId ? `?conversationId=${item.sourceConversationId}` : '';
    navigate(path + params);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${Colors.border}`,
        borderRadius: '14px',
        bgcolor: '#fff',
        overflow: 'hidden',
        boxShadow: Shadows.sm,
      }}
    >
      {/* HEAD */}
      <Box sx={{
        px: 2, pt: 2, pb: 1.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0, mr: 1 }}>
          <Typography
            sx={{
              fontSize: '1.0625rem', fontWeight: 700, color: Colors.textPrimary,
              fontFamily: SERIF, lineHeight: 1.3, flex: 1,
            }}
            noWrap
          >
            {clientName}
          </Typography>
          {tier && <TierBadge tier={tier} size={24} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Box sx={{
            px: '10px', py: '5px', borderRadius: '999px', flexShrink: 0,
            bgcolor: isSpecific ? '#E8F4EA' : '#FFF4E5',
          }}>
            <Typography sx={{
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
              color: isSpecific ? '#1B5E20' : '#9A6B12', fontFamily: MONO,
            }}>
              {isSpecific ? 'SPECIFIC' : 'VAGUE'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            sx={{ color: Colors.textMuted, p: '3px' }}
            onClick={handleMenuOpen}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* META ROW — full bleed */}
      <Box sx={{
        display: 'flex',
        borderTop: `1px solid ${Colors.border}`,
        borderBottom: `1px solid ${Colors.border}`,
        py: 1.5,
        mb: 1.5,
      }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1 }}>
          <MetaLabel>EXPECTED</MetaLabel>
          <MetaVal>{formatDate(item.expectedDate) || '—'}</MetaVal>
        </Box>
        <Box sx={{ width: '1px', bgcolor: Colors.border, alignSelf: 'stretch', flexShrink: 0 }} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1 }}>
          <MetaLabel>AMOUNT</MetaLabel>
          <MetaVal>
            {(item.expectedAmount ?? 0) > 0 ? `₹${formatINR(item.expectedAmount)}` : '—'}
          </MetaVal>
        </Box>
        <Box sx={{ width: '1px', bgcolor: Colors.border, alignSelf: 'stretch', flexShrink: 0 }} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1 }}>
          <MetaLabel>MADE ON</MetaLabel>
          <MetaVal>{formatDate(item.createdAt) || '—'}</MetaVal>
        </Box>
      </Box>

      {/* QUOTE */}
      {item.promiseText && (
        <Box sx={{
          mx: 2, mb: 1.5,
          bgcolor: Colors.creamAlt,
          py: 1.5, px: 1.75,
          borderRadius: '8px',
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderLeft: `4px solid ${Colors.gold}`,
        }}>
          <Typography sx={{
            fontSize: '0.875rem', lineHeight: 1.5,
            color: Colors.textPrimary,
            fontStyle: 'italic',
            fontFamily: SERIF,
          }}>
            &ldquo;{item.promiseText}&rdquo;
          </Typography>
        </Box>
      )}

      {/* FOOTER */}
      <Box sx={{
        px: 2, pb: 2, pt: item.promiseText ? 0 : 0.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <Box>
          <Typography sx={{
            fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em',
            color: Colors.textMuted, mb: 0.25, fontFamily: MONO,
          }}>
            CREATED AT
          </Typography>
          <Typography sx={{
            fontSize: '0.875rem', fontWeight: 700,
            color: Colors.textPrimary, fontFamily: SERIF,
          }}>
            {formatDate(item.createdAt)}
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={handleViewThread}
          disabled={!item.clientCode}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            background: 'none', border: 'none', p: 0,
            cursor: item.clientCode ? 'pointer' : 'default',
            color: item.clientCode ? Colors.gold : Colors.textMuted,
            '&:hover': item.clientCode ? { opacity: 0.7 } : {},
          }}
        >
          <Typography sx={{
            fontSize: '0.875rem', fontWeight: 400, letterSpacing: '0.03em',
            color: 'inherit', fontFamily: MONO,
          }}>
            VIEW THREAD
          </Typography>
          <ArrowForward sx={{ fontSize: 12 }} />
        </Box>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: '8px', border: `1px solid ${Colors.border}`, minWidth: 130 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={handleDelete}
          sx={{ gap: 1, fontSize: '0.8125rem', fontWeight: 600, color: Colors.danger, py: 1 }}
        >
          <Delete sx={{ fontSize: 16 }} />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
}

export default function ClientPromises() {
  const { clientCode } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'active';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sort, setSort] = useState('createdAt_desc');
  const [sortAnchor, setSortAnchor] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promises', 'list', status, clientCode, sort],
    queryFn: () => promiseApi.list({ status, clientCode, sort }),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => promiseApi.delete(id),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['promises', 'stats'] });
      setSnack({ open: true, msg: 'Promise deleted', severity: 'success' });
    },
    onError: () => setSnack({ open: true, msg: 'Could not delete', severity: 'error' }),
  });

  const items = data?.items ?? [];

  const displayName = items.length > 0
    ? (items[0].clientName || items[0].clientCode || clientCode)
    : clientCode;

  const handleDelete = (id) => {
    if (!window.confirm('Delete this promise?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        bgcolor: Colors.navy, px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
      }}>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}>
            {displayName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6875rem', letterSpacing: '0.1em', fontFamily: MONO }}>
            {status.toUpperCase()} PROMISES{items.length > 0 ? ` · ${items.length}` : ''}
          </Typography>
        </Box>
        {/* Sort button */}
        <Button
          size="small"
          onClick={e => setSortAnchor(e.currentTarget)}
          startIcon={<FilterAlt sx={{ fontSize: 15 }} />}
          sx={{
            height: 32, px: 1.5, borderRadius: '8px', gap: 0.5,
            color: sort !== 'createdAt_desc' ? Colors.gold : 'rgba(255,255,255,0.75)',
            bgcolor: sortAnchor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${sort !== 'createdAt_desc' ? Colors.gold + '60' : 'rgba(255,255,255,0.2)'}`,
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: 0.3, textTransform: 'none',
            minWidth: 0, transition: 'all 0.15s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)' },
          }}
        >
          Sort
        </Button>
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
          <Typography sx={{
            px: 2, pt: 1, pb: 0.5,
            fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted,
            letterSpacing: '0.15em', fontFamily: MONO,
          }}>
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

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ color: Colors.textMuted, fontFamily: SERIF, fontSize: '1rem' }}>
              No {status} promises for this client
            </Typography>
          </Box>
        ) : (
          items.map(item => (
            <PromiseCard key={item._id} item={item} onDelete={handleDelete} />
          ))
        )}
        <Box sx={{ height: 40 }} />
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
