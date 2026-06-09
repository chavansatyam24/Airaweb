import { Analytics, Apps, Check, Delete, FilterList, List, School } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { brainApi, knowledgeApi, poojaChatApi } from '../../api/index';
import { relativeTime } from '../../utils/format';
import { Colors } from '../../theme/index';

const OUTER_TABS = [
  { k: 'knowledge', label: 'Knowledge Base' },
  { k: 'constitution', label: 'Constitution' },
  { k: 'expert', label: 'Expert Knowledge' },
];

const TYPE_CHIPS = [
  { k: undefined,     label: 'All',          icon: 'apps' },
  { k: 'lesson',      label: 'Lessons',       icon: 'school' },
  { k: 'instruction', label: 'Instructions',  icon: 'list' },
  { k: 'pattern',     label: 'Patterns',      icon: 'analytics' },
];

const STATUS_FILTERS_PATTERN = [
  { k: undefined,        label: 'Any status' },
  { k: 'pending_review', label: 'Awaiting Approval' },
  { k: 'approved',       label: 'Approved' },
  { k: 'rejected',       label: 'Rejected' },
];

const STATUS_FILTERS_INSTRUCTION = [
  { k: undefined,        label: 'Any status' },
  { k: 'pending_review', label: 'Awaiting Approval' },
  { k: 'approved',       label: 'Approved' },
  { k: 'rejected',       label: 'Rejected' },
  { k: 'draft',          label: 'Draft' },
];

const MAGNITUDE_COLOR = {
  minor: Colors.info,
  moderate: Colors.warning,
  major: Colors.danger,
};

const INSTRUCTION_STATUS_COLOR = {
  active: Colors.success,
  approved: Colors.success,
  pending_review: Colors.warning,
  draft: Colors.textMuted,
  rejected: Colors.danger,
  resolved: Colors.textMuted,
};

// ── Doc Tab (Constitution / Expert Knowledge) ─────────────────────────────────
function DocTab({ queryKey, fetchFn, title, subtitle, amendNote }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
  });

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return (
        <Typography key={i} sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.125rem', fontWeight: 600, color: Colors.navy, mt: i === 0 ? 0 : 2.5, mb: 0.75 }}>
          {line.slice(2)}
        </Typography>
      );
      if (line.startsWith('## ')) return (
        <Typography key={i} sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '0.9375rem', fontWeight: 600, color: Colors.navy, mt: 2, mb: 0.5 }}>
          {line.slice(3)}
        </Typography>
      );
      if (line.startsWith('### ')) return (
        <Typography key={i} sx={{ fontSize: '0.8125rem', fontWeight: 700, color: Colors.textPrimary, mt: 1.5, mb: 0.5 }}>
          {line.slice(4)}
        </Typography>
      );
      if (line.startsWith('- ') || line.startsWith('* ')) return (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, pl: 1 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: Colors.gold, lineHeight: 1.6, flexShrink: 0 }}>•</Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.6 }}>{line.slice(2)}</Typography>
        </Box>
      );
      if (line.trim() === '' || line.startsWith('---')) return <Box key={i} sx={{ height: 8 }} />;
      if (line.startsWith('**') && line.endsWith('**')) return (
        <Typography key={i} sx={{ fontSize: '0.8125rem', fontWeight: 700, color: Colors.textPrimary, lineHeight: 1.6, mb: 0.25 }}>
          {line.slice(2, -2)}
        </Typography>
      );
      return (
        <Typography key={i} sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 0.25 }}>
          {line}
        </Typography>
      );
    });
  };

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress sx={{ color: Colors.gold }} />
        </Box>
      ) : isError ? (
        <Box sx={{ textAlign: 'center', pt: 8 }}>
          <Typography sx={{ color: Colors.danger, fontSize: '0.875rem' }}>Could not load content</Typography>
        </Box>
      ) : (
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${Colors.border}`, borderRadius: '14px', mb: 2 }}>
            <Typography sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: Colors.navy, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: Colors.textSecondary, mb: 2.5, lineHeight: 1.5 }}>
              {subtitle}
            </Typography>
            <Box sx={{ borderTop: `1px solid ${Colors.border}`, pt: 2 }}>
              {renderMarkdown(data?.content)}
            </Box>
          </Paper>
          {amendNote && (
            <Box sx={{ bgcolor: Colors.cream, border: `1px solid ${Colors.gold}30`, borderRadius: '10px', p: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#664d03', lineHeight: 1.5 }}>
                💡 {amendNote}
              </Typography>
            </Box>
          )}
          <Box sx={{ height: 40 }} />
        </Box>
      )}
    </Box>
  );
}

// ── Pattern Card ──────────────────────────────────────────────────────────────
function PatternCard({ item, editingId, editDraft, approvingId, rejectingId, onEdit, onCancelEdit, onDraftChange, onApprove, onReject }) {
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const [optimisticPattern, setOptimisticPattern] = useState(null);
  const isEditing = editingId === item._id;
  const effectiveStatus = optimisticStatus ?? (item.status === 'pending' ? 'pending_review' : item.status);
  const isPending = effectiveStatus === 'pending_review';
  const isApproved = effectiveStatus === 'approved';
  const isRejected = effectiveStatus === 'rejected';
  const displayPattern = optimisticPattern ?? item.pattern;

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${Colors.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Scope + client + confidence + time */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'inline-flex', px: '8px', py: '3px', borderRadius: '6px', bgcolor: item.scope === 'client' ? Colors.info : Colors.gold }}>
            <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: '"JetBrains Mono", monospace' }}>
              {item.scope === 'client' ? 'CLIENT' : 'GLOBAL'}
            </Typography>
          </Box>
          {(item.clientName || item.clientCode) && (
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: Colors.textPrimary }}>
              {item.clientName || item.clientCode}
            </Typography>
          )}
          {item.confidence != null && (
            <Box sx={{ bgcolor: Colors.cardAlt, px: '6px', py: '2px', borderRadius: '6px' }}>
              <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.textSecondary, fontFamily: '"JetBrains Mono", monospace' }}>
                {Math.round(item.confidence * 100)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, flexShrink: 0, ml: 1 }}>
          {relativeTime(item.createdAt)}
        </Typography>
      </Box>

      {/* Category + occurrence */}
      {(item.category || item.occurrenceCount > 1) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          {item.category && (
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em' }}>
              #{item.category}
            </Typography>
          )}
          {item.occurrenceCount > 1 && (
            <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}>
              Seen {item.occurrenceCount}×
            </Typography>
          )}
        </Box>
      )}

      {/* Pattern text or edit input */}
      {isEditing ? (
        <TextField fullWidth multiline minRows={3} value={editDraft} onChange={e => onDraftChange(e.target.value)} size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.875rem', '& fieldset': { borderColor: Colors.gold, borderWidth: 2 }, '&:hover fieldset': { borderColor: Colors.gold }, '&.Mui-focused fieldset': { borderColor: Colors.gold } } }} />
      ) : (
        <Typography sx={{ fontSize: '0.875rem', color: Colors.textPrimary, lineHeight: 1.6, mb: 1.5 }}>
          {displayPattern || '—'}
        </Typography>
      )}

      {/* Example from Real Pooja */}
      {item.example?.snippet && (
        <Box sx={{ bgcolor: Colors.cardAlt, p: 1.5, borderRadius: '6px', mb: 1.5, borderLeft: `3px solid ${Colors.gold}` }}>
          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', fontFamily: '"JetBrains Mono", monospace', mb: 0.75 }}>
            EXAMPLE FROM REAL POOJA
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: Colors.textPrimary, fontStyle: 'italic' }}>
            "{item.example.snippet}"
          </Typography>
        </Box>
      )}

      {/* Status banner */}
      {(isApproved || isRejected) && (
        <Box sx={{ p: 1.5, borderRadius: '6px', mb: 1, bgcolor: isApproved ? Colors.success + '15' : Colors.danger + '15' }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: '"JetBrains Mono", monospace', color: isApproved ? Colors.success : Colors.danger }}>
            {isApproved
              ? `✓ APPROVED · APPLIED TO ${item.appliedToDraftsCount || 0} DRAFTS`
              : `✗ REJECTED${item.rejectionReason ? ': ' + item.rejectionReason : ''}`}
          </Typography>
        </Box>
      )}

      {/* Actions */}
      {isPending && (
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1.5 }}>
          <Button variant="outlined"
            onClick={() => { setOptimisticStatus('rejected'); onReject(item._id); }}
            disabled={rejectingId === item._id}
            sx={{ borderColor: Colors.danger, color: Colors.danger, fontSize: '0.8125rem', fontWeight: 700, height: 40, flex: 1, borderRadius: '8px' }}>
            {rejectingId === item._id ? <CircularProgress size={16} sx={{ color: Colors.danger }} /> : 'Reject'}
          </Button>
          <Button variant="outlined" onClick={() => isEditing ? onCancelEdit() : onEdit(item._id, displayPattern || '')}
            sx={{ borderColor: Colors.gold, color: Colors.gold, fontSize: '0.8125rem', fontWeight: 700, height: 40, flex: 1, borderRadius: '8px' }}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button variant="contained"
            onClick={() => { setOptimisticStatus('approved'); if (isEditing) setOptimisticPattern(editDraft); onApprove(item._id); }}
            disabled={approvingId === item._id}
            startIcon={<Check sx={{ fontSize: 15 }} />}
            sx={{ bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' }, fontSize: '0.8125rem', fontWeight: 700, height: 40, flex: 1, borderRadius: '8px' }}>
            {approvingId === item._id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : isEditing ? 'Save & Approve' : 'Approve'}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

// ── Lesson Card ───────────────────────────────────────────────────────────────
function LessonCard({ item }) {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => brainApi.deleteLesson(item._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  });

  const handleDelete = () => {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    deleteMutation.mutate();
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${Colors.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Head: extracted pattern + magnitude badge + delete */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: Colors.navy, lineHeight: 1.5, flex: 1 }}>
          {item.extractedPattern || item.pattern || item._displayText || '—'}
        </Typography>
        {item.editMagnitude && (
          <Box sx={{ display: 'inline-flex', px: '8px', py: '3px', borderRadius: '99px', flexShrink: 0, bgcolor: MAGNITUDE_COLOR[item.editMagnitude] || Colors.textMuted }}>
            <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: '"JetBrains Mono", monospace' }}>
              {item.editMagnitude.toUpperCase()}
            </Typography>
          </Box>
        )}
        <Box component="span" onClick={handleDelete} sx={{ cursor: 'pointer', color: deleteMutation.isPending ? Colors.textMuted : Colors.danger, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {deleteMutation.isPending ? <CircularProgress size={14} sx={{ color: Colors.textMuted }} /> : <Delete sx={{ fontSize: 16 }} />}
        </Box>
      </Box>

      {/* Meta: taught by + time */}
      <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary, mb: 1.5 }}>
        {item.teacherName ? `Taught by ${item.teacherName} · ` : ''}{relativeTime(item.createdAt)}
      </Typography>

      {/* Tags */}
      {item.tags?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 1.5 }}>
          {item.tags.slice(0, 6).map(t => (
            <Box key={t} sx={{ bgcolor: Colors.cardAlt, px: '8px', py: '3px', borderRadius: '6px', border: `1px solid ${Colors.borderLight}` }}>
              <Typography sx={{ fontSize: '0.5625rem', color: Colors.textSecondary, fontWeight: 500 }}>{t}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Before / After diff */}
      {(item.originalMessage || item.editedMessage) && (
        <Box sx={{ bgcolor: Colors.cardAlt, p: 1.5, borderRadius: '6px', mb: 1.5 }}>
          {item.originalMessage && (
            <>
              <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', fontFamily: '"JetBrains Mono", monospace', mb: 0.5 }}>
                BEFORE (AIRA)
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: Colors.danger, fontStyle: 'italic', textDecoration: 'line-through', opacity: 0.7, mb: 1 }}
                style={{ WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {item.originalMessage}
              </Typography>
            </>
          )}
          {item.editedMessage && (
            <>
              <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', fontFamily: '"JetBrains Mono", monospace', mb: 0.5 }}>
                AFTER (EDITED)
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: Colors.success, fontWeight: 600 }}
                style={{ WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {item.editedMessage}
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* Editor reason */}
      {item.editorReason && (
        <Box sx={{ bgcolor: Colors.cream, p: 1.5, borderRadius: '6px', mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#664d03' }}>
            💡 {item.editorReason}
          </Typography>
        </Box>
      )}

      {/* Applied count */}
      <Typography sx={{ fontSize: '0.625rem', color: Colors.textMuted, fontStyle: 'italic', mt: 'auto' }}>
        Applied to {item.appliedToDraftsCount || 0} future drafts
      </Typography>
    </Paper>
  );
}

// ── Instruction Card ──────────────────────────────────────────────────────────
function InstructionCard({ item }) {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => poojaChatApi.deleteInstruction(item._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  });

  const handleDelete = () => {
    if (!window.confirm('Delete this instruction? This cannot be undone.')) return;
    deleteMutation.mutate();
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${Colors.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Head: text + status badge + delete */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: Colors.navy, lineHeight: 1.5, flex: 1 }}>
          {item.refNumber ? `${item.refNumber} · ` : ''}{item.instructionText || item.text || item._displayText || '—'}
        </Typography>
        {item.status && (
          <Box sx={{ display: 'inline-flex', px: '8px', py: '3px', borderRadius: '99px', flexShrink: 0, bgcolor: INSTRUCTION_STATUS_COLOR[item.status] || Colors.textMuted }}>
            <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: '"JetBrains Mono", monospace' }}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Typography>
          </Box>
        )}
        <Box component="span" onClick={handleDelete} sx={{ cursor: 'pointer', color: deleteMutation.isPending ? Colors.textMuted : Colors.danger, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {deleteMutation.isPending ? <CircularProgress size={14} sx={{ color: Colors.textMuted }} /> : <Delete sx={{ fontSize: 16 }} />}
        </Box>
      </Box>

      {/* Meta */}
      <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary, mb: 1.5 }}>
        {item.clientName ? `For ${item.clientName} · ` : ''}{item.authorName ? `Set by ${item.authorName} · ` : ''}{relativeTime(item.confirmedAt || item.createdAt)}
      </Typography>

      {/* Tags */}
      {item.tags?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 1.5 }}>
          {item.tags.slice(0, 6).map(t => (
            <Box key={t} sx={{ bgcolor: Colors.cardAlt, px: '8px', py: '3px', borderRadius: '6px', border: `1px solid ${Colors.borderLight}` }}>
              <Typography sx={{ fontSize: '0.5625rem', color: Colors.textSecondary, fontWeight: 500 }}>{t}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Applied count */}
      <Typography sx={{ fontSize: '0.625rem', color: Colors.textMuted, fontStyle: 'italic', mt: 'auto' }}>
        Applied to {item.appliedToDraftsCount || 0} drafts so far
      </Typography>
    </Paper>
  );
}

// ── Main Brain Page ───────────────────────────────────────────────────────────
export default function Brain() {
  const [outerTab, setOuterTab] = useState('knowledge');
  const [typeFilter, setTypeFilter] = useState(undefined);
  const [status, setStatus] = useState('pending_review');
  const statusFilters = typeFilter === 'instruction' ? STATUS_FILTERS_INSTRUCTION : STATUS_FILTERS_PATTERN;
  const showStatusFilter = typeFilter === 'pattern';
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const loaderRef = useRef(null);
  const isKnowledge = outerTab === 'knowledge';

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['knowledge', typeFilter, status],
    queryFn: ({ pageParam = 1 }) => knowledgeApi.list({
      type: typeFilter,
      status: status || undefined,
      page: pageParam,
      limit: 20,
    }),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: isKnowledge,
  });

  const items = data?.pages.flatMap(p => p.items ?? p.data ?? []) ?? [];
  const counts = data?.pages[0]?.counts ?? {};

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApprove = async (id) => {
    try {
      setApprovingId(id);
      const editedText = editingId === id ? editDraft : undefined;
      await knowledgeApi.approvePattern(id, editedText);
      setEditingId(null);
      setEditDraft('');
      await refetch();
      setSnack({ open: true, msg: 'Approved', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not approve', severity: 'error' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setRejectingId(id);
      await knowledgeApi.rejectPattern(id);
      await refetch();
      setSnack({ open: true, msg: 'Rejected', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not reject', severity: 'error' });
    } finally {
      setRejectingId(null);
    }
  };

  const handleTypeChip = (k) => {
    setTypeFilter(k);
    if (k === 'lesson') setStatus(undefined);
  };

  const renderCard = (item) => {
    const type = item.type || typeFilter;
    if (type === 'lesson') return <LessonCard key={item._id} item={item} />;
    if (type === 'instruction') return <InstructionCard key={item._id} item={item} />;
    return (
      <PatternCard
        key={item._id}
        item={item}
        editingId={editingId}
        editDraft={editDraft}
        approvingId={approvingId}
        rejectingId={rejectingId}
        onEdit={(id, text) => { setEditingId(id); setEditDraft(text); }}
        onCancelEdit={() => { setEditingId(null); setEditDraft(''); }}
        onDraftChange={setEditDraft}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
            AIRA'S BRAIN
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            How Aira Learns and Reasons
          </Typography>
        </Box>
        {isKnowledge && (
          <>
            {showStatusFilter && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: status ? Colors.gold + '25' : 'rgba(255,255,255,0.1)', borderRadius: '8px', px: 1, height: 32, border: `1px solid ${status ? Colors.gold + '60' : 'rgba(255,255,255,0.2)'}` }}>
                <FilterList sx={{ fontSize: 14, color: status ? Colors.gold : 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                <Select
                  value={status ?? 'all'}
                  onChange={e => setStatus(e.target.value === 'all' ? undefined : e.target.value)}
                  size="small"
                  variant="standard"
                  disableUnderline
                  sx={{
                    color: status ? Colors.gold : '#fff', fontSize: '0.75rem', fontWeight: 600,
                    fontFamily: '"JetBrains Mono", monospace',
                    minWidth: 120,
                    '& .MuiSelect-icon': { color: status ? Colors.gold : 'rgba(255,255,255,0.7)', fontSize: 18 },
                    '& .MuiSelect-select': { py: 0, pr: '20px !important', background: 'none' },
                  }}
                >
                  {statusFilters.map(f => (
                    <MenuItem key={String(f.k)} value={f.k ?? 'all'} sx={{ fontSize: '0.8125rem' }}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Outer tabs: Knowledge Base | Constitution | Expert Knowledge */}
      <Box sx={{ bgcolor: '#fff', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
        <Tabs
          value={outerTab}
          onChange={(_, v) => setOuterTab(v)}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em', minHeight: 44 },
            '& .MuiTabs-indicator': { bgcolor: Colors.gold },
          }}
        >
          {OUTER_TABS.map(t => <Tab key={t.k} value={t.k} label={t.label} />)}
        </Tabs>
      </Box>

      {/* Knowledge Base sub-filters */}
      {isKnowledge && (
        <Box sx={{ bgcolor: Colors.bg, px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
          {/* Type chips: All | Patterns | Lessons | Instructions */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {TYPE_CHIPS.map(c => {
              const active = typeFilter === c.k;
              const count = c.k ? counts[c.k] : undefined;
              const IconComp = { apps: Apps, school: School, list: List, analytics: Analytics }[c.icon];
              return (
                <Box
                  key={String(c.k)}
                  onClick={() => handleTypeChip(c.k)}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    px: '12px', py: '7px', borderRadius: '8px',
                    cursor: 'pointer', height: 32,
                    bgcolor: active ? Colors.navy : '#fff',
                    color: active ? '#fff' : Colors.textSecondary,
                    border: `1px solid ${active ? Colors.navy : Colors.border}`,
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: active ? Colors.navyAlt : Colors.navy + '0f', borderColor: Colors.navy, color: active ? '#fff' : Colors.navy },
                  }}
                >
                  {IconComp && <IconComp sx={{ fontSize: 13, color: 'inherit' }} />}
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'inherit', lineHeight: 1 }}>
                    {c.label}{count != null ? ` (${count})` : ''}
                  </Typography>
                </Box>
              );
            })}
          </Box>

        </Box>
      )}

      {/* Constitution */}
      {outerTab === 'constitution' && (
        <DocTab
          queryKey="brain-constitution"
          fetchFn={brainApi.constitution}
          title="Financial Constitution"
          subtitle="The non-negotiable rules Pooja must follow on every action. Only Sneh can amend."
          amendNote="To amend, chat with Pooja: 'Pooja, update the constitution: ...' — Sneh must confirm."
        />
      )}

      {/* Expert Knowledge */}
      {outerTab === 'expert' && (
        <DocTab
          queryKey="brain-expert"
          fetchFn={brainApi.expertKnowledge}
          title="Expert Knowledge"
          subtitle="Indian CA + CFO + debt collector + jewellery domain knowledge. Pooja uses this to reason like a senior professional."
          amendNote="To add a knowledge point, chat with Pooja: 'Pooja, add a knowledge point: ...'"
        />
      )}

      {/* Knowledge list */}
      {isKnowledge && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
              <CircularProgress sx={{ color: Colors.gold }} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ textAlign: 'center', pt: 10 }}>
              <Typography sx={{ color: Colors.textMuted, fontSize: '0.875rem' }}>
                No {typeFilter ? typeFilter + 's' : 'items'} found
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '20px' }}>
                {items.map(item => renderCard(item))}
              </Box>
              <Box ref={loaderRef} sx={{ gridColumn: '1 / -1', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isFetchingNextPage && <CircularProgress size={20} sx={{ color: Colors.gold }} />}
              </Box>
            </>
          )}
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
