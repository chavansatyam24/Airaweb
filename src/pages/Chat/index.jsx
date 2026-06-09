import { ArrowUpward, InfoOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { poojaChatApi } from '../../api/index';
import { useAuth, useIsAdmin } from '../../store/auth';
import { Colors } from '../../theme/index';
import { formatTime } from '../../utils/format';

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d === '...' ? '.' : d + '.'), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
      <Box sx={{
        bgcolor: '#fff', border: `1px solid ${Colors.border}`,
        borderRadius: '18px 18px 18px 4px',
        px: 2, py: 1.25, minWidth: 52,
      }}>
        <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: 4, lineHeight: 1.2 }}>
          {dots}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text, isUser) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  const textColor = isUser ? '#fff' : Colors.textPrimary;
  const mutedColor = isUser ? 'rgba(255,255,255,0.65)' : Colors.textMuted;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <Typography key={i} component="span" sx={{ fontWeight: 700, color: textColor }}>{part.slice(2, -2)}</Typography>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <Typography key={i} component="span" sx={{ fontWeight: 700, color: textColor }}>{part.slice(1, -1)}</Typography>;
    if (part.startsWith('_') && part.endsWith('_'))
      return <Typography key={i} component="span" sx={{ fontStyle: 'italic', color: mutedColor }}>{part.slice(1, -1)}</Typography>;
    return <Typography key={i} component="span">{part}</Typography>;
  });
}

function renderBody(text, isUser) {
  if (!text) return null;
  const LABEL_RE = /^\*[^*]+:\*/;
  const groups = [];
  for (const line of text.split('\n')) {
    const isLabel = LABEL_RE.test(line);
    const last = groups[groups.length - 1];
    if (isLabel) {
      if (last?.kind === 'labels') last.lines.push(line);
      else groups.push({ kind: 'labels', lines: [line] });
    } else {
      if (last?.kind === 'text') last.lines.push(line);
      else groups.push({ kind: 'text', lines: [line] });
    }
  }
  return (
    <Box>
      {groups.map((g, gi) =>
        g.kind === 'labels' ? (
          <Box key={gi} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', my: '1px' }}>
            {g.lines.map((line, li) => (
              <Box key={li} sx={{ display: 'contents' }}>
                {li > 0 && <Typography component="span" sx={{ color: Colors.textMuted, fontSize: '0.75rem' }}>·</Typography>}
                <Typography component="span" sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: isUser ? '#fff' : Colors.textPrimary }}>
                  {renderInline(line, isUser)}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography key={gi} sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: isUser ? '#fff' : Colors.textPrimary }}>
            {g.lines.map((line, li) => (
              <Box key={li} component="span">
                {li > 0 ? '\n' : ''}
                {renderInline(line, isUser)}
              </Box>
            ))}
          </Typography>
        )
      )}
    </Box>
  );
}

// ── Instruction panel (inside confirmation bubble) ────────────────────────────
const INSTRUCTION_TYPE_LABEL = {
  global_style: 'Global Style',
  client_rule: 'Client Rule',
  constitution_amendment: 'Constitution',
  query: 'Query',
};

function InstructionPanel({ msg }) {
  const d = msg.instructionDetails;
  if (!d) return null;
  return (
    <Box sx={{ mt: 1.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '10px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {msg.instructionType && (
          <Box sx={{
            px: '7px', py: '3px', borderRadius: '99px',
            bgcolor: msg.instructionType === 'constitution_amendment' ? '#E8EAF6' : Colors.gold + '25',
          }}>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.05em', textTransform: 'uppercase', color: msg.instructionType === 'constitution_amendment' ? '#3949AB' : Colors.gold }}>
              {INSTRUCTION_TYPE_LABEL[msg.instructionType] ?? msg.instructionType}
            </Typography>
          </Box>
        )}
        {d.refNumber && <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: Colors.navy }}>{d.refNumber}</Typography>}
        {d.clientName && <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary }}>· {d.clientName}</Typography>}
      </Box>

      {/* Instruction text */}
      {(d.ruleText ?? d.instructionText) && (
        <Typography sx={{ fontSize: '0.8125rem', color: Colors.textPrimary, lineHeight: 1.45 }}>
          {d.ruleText ?? d.instructionText}
        </Typography>
      )}

      {/* Interpretation */}
      {d.interpretation && (
        <Box sx={{ bgcolor: '#F3F4FF', borderRadius: '6px', p: 1.25 }}>
          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.08em', color: '#3949AB', mb: 0.5 }}>INTERPRETATION</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#3949AB', lineHeight: 1.45, fontStyle: 'italic' }}>{d.interpretation}</Typography>
        </Box>
      )}

      {/* Diff */}
      {(d.diff ?? d.constitutionDiff) && (
        <Box sx={{ bgcolor: '#FFF8E1', borderRadius: '6px', borderLeft: `3px solid ${Colors.gold}`, p: 1.25 }}>
          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.08em', color: Colors.gold, mb: 0.5 }}>CHANGE</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: Colors.textPrimary, lineHeight: 1.45, fontFamily: MONO }}>{d.diff ?? d.constitutionDiff}</Typography>
        </Box>
      )}

      {/* Tags */}
      {d.tags?.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {d.tags.map(tag => (
            <Box key={tag} sx={{ bgcolor: Colors.border, px: '7px', py: '2px', borderRadius: '99px' }}>
              <Typography sx={{ fontSize: '0.5625rem', color: Colors.textSecondary, fontWeight: 500 }}>{tag}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onConfirm }) {
  const isUser = msg.sender === 'user';
  const isConfirmation = msg.cardType === 'confirmation';
  const isSystemInfo = msg.cardType === 'system_info';
  const isPending = isConfirmation && msg.confirmationStatus === 'pending';
  const isConfirmed = msg.confirmationStatus === 'confirmed';
  const isRejected = msg.confirmationStatus === 'rejected';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', mb: 1.5 }}>
      {!isUser && (
        <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, mb: 0.25, letterSpacing: '0.12em', fontFamily: MONO }}>
          AIRA{isConfirmation ? ' · CONFIRMATION' : ''}
        </Typography>
      )}
      <Box sx={{
        maxWidth: '82%',
        bgcolor: isUser ? '#005C4B' : isConfirmation ? '#FFF8E7' : isSystemInfo ? Colors.success + '15' : '#fff',
        border: isUser ? 'none'
          : isConfirmation ? `2px solid ${Colors.gold}`
          : isSystemInfo ? `1px solid ${Colors.success}40`
          : `1px solid ${Colors.border}`,
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        px: 2, py: 1.25,
        overflow: 'hidden',
      }}>
        {renderBody(msg.body ?? '', isUser)}

        {/* Instruction details panel for confirmation cards */}
        {isConfirmation && <InstructionPanel msg={msg} />}

        {/* Confirm / Reject actions */}
        {isPending && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button size="small" variant="outlined" onClick={() => onConfirm(msg._id, false)}
              sx={{ flex: 1, height: 32, fontSize: '0.8125rem', fontWeight: 700, borderColor: Colors.danger, color: Colors.danger, borderRadius: '8px' }}>
              No, try again
            </Button>
            <Button size="small" variant="contained" onClick={() => onConfirm(msg._id, true)}
              sx={{ flex: 1, height: 32, fontSize: '0.8125rem', fontWeight: 700, bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'dd' }, borderRadius: '8px' }}>
              Yes, apply
            </Button>
          </Box>
        )}

        {/* Status badge after action */}
        {(isConfirmed || isRejected) && (
          <Box sx={{ mt: 1, px: '8px', py: '4px', borderRadius: '6px', display: 'inline-flex', bgcolor: isConfirmed ? Colors.success + '15' : Colors.danger + '15', alignSelf: 'flex-start' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, fontFamily: MONO, color: isConfirmed ? Colors.success : Colors.danger }}>
              {isConfirmed ? '✓ APPLIED' : '✗ REJECTED'}
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: '0.5rem', color: isUser ? 'rgba(255,255,255,0.5)' : Colors.textMuted, mt: 0.75, textAlign: 'right' }}>
          {formatTime(msg.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Active instructions drawer ────────────────────────────────────────────────
function ActiveInstructionsDrawer({ open, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pooja-instructions'],
    queryFn: () => poojaChatApi.instructions({ limit: 50 }),
    enabled: open,
  });
  const instructions = data?.items ?? data?.instructions ?? [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 320, bgcolor: Colors.bg } }}>
      <Box sx={{ bgcolor: Colors.navy, px: 2, py: 1.5 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.15em', mb: 0.25 }}>ACTIVE INSTRUCTIONS</Typography>
        <Typography sx={{ color: '#fff', fontSize: '1rem', fontFamily: SERIF }}>Aira's Rules</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress size={24} sx={{ color: Colors.gold }} /></Box>
        ) : instructions.length === 0 ? (
          <Typography sx={{ color: Colors.textMuted, fontSize: '0.875rem', textAlign: 'center', pt: 4 }}>No active instructions</Typography>
        ) : (
          instructions.map((ins, idx) => (
            <Box key={ins._id || idx} sx={{ mb: 1, p: 1.5, bgcolor: '#fff', borderRadius: '10px', border: `1px solid ${Colors.border}` }}>
              {ins.refNumber && (
                <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, fontFamily: MONO, mb: 0.25 }}>{ins.refNumber}</Typography>
              )}
              <Typography sx={{ fontSize: '0.8125rem', color: Colors.navy, lineHeight: 1.5 }}>
                {ins.instructionText || ins.text || '—'}
              </Typography>
              {ins.clientName && (
                <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, mt: 0.5 }}>For: {ins.clientName}</Typography>
              )}
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CHAT_USER_ID = '6a0437e6f077bc2cdd2ac3ba';

export default function Chat() {
  const isAdmin = useIsAdmin();
  const user = useAuth(s => s.user);
  const userId = user?.id || CHAT_USER_ID;
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [optimisticMsg, setOptimisticMsg] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const chatEndRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pooja-chat', userId],
    queryFn: () => poojaChatApi.messages(userId, 100),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30000,
  });
  const messages = data?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const sendMsg = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setOptimisticMsg({ body: text, time: formatTime(new Date()) });
    setSending(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    try {
      await poojaChatApi.send(text, userId);
      await refetch();
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not send', severity: 'error' });
      setInput(text);
    } finally {
      setSending(false);
      setOptimisticMsg(null);
    }
  };

  const confirm = async (msgId, approved) => {
    try {
      await poojaChatApi.confirm(msgId, userId, approved);
      await refetch();
      qc.invalidateQueries({ queryKey: ['knowledge'] });
      qc.invalidateQueries({ queryKey: ['brain-constitution'] });
    } catch {
      setSnack({ open: true, msg: 'Could not confirm', severity: 'error' });
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>TRAIN AIRA</Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, lineHeight: 1.1 }}>Chat with Aira</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: Colors.bg, px: 4, gap: 1.5 }}>
          <Typography sx={{ fontSize: '3.75rem', lineHeight: 1 }}>🔒</Typography>
          <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: Colors.navy, fontFamily: SERIF }}>Admin Only</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: Colors.textSecondary, textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
            Only Sneh can chat with Aira in this phase. Phase 2 will open this up to other teachers.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <Box sx={{ bgcolor: Colors.navy, px: 2.5, py: 1.25, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Gold avatar */}
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%', bgcolor: Colors.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Typography sx={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1 }}>A</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: '1.0625rem', fontWeight: 700, lineHeight: 1.2 }}>Aira</Typography>
          <Typography sx={{ color: Colors.success, fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.3 }}>AR Agent · Online</Typography>
        </Box>
        <Tooltip title="View active instructions">
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }} onClick={() => setShowInstructions(true)}>
            <InfoOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Messages ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: Colors.bg, py: 1.5, px: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : messages.length === 0 && !optimisticMsg && !sending ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', gap: 1 }}>
            <Typography sx={{ fontSize: '3.125rem', lineHeight: 1 }}>👋</Typography>
            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, color: Colors.navy, fontFamily: SERIF, textAlign: 'center', mt: 0.5 }}>
              Hi {firstName}, talk to me anytime.
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: Colors.textSecondary, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
              Train my style, set rules for specific clients, or ask me anything about the AR system.
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt).toDateString() : null;
              const thisDate = new Date(msg.createdAt).toDateString();
              return (
                <Box key={msg._id}>
                  {prevDate !== thisDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', my: 1.5 }}>
                      <Divider sx={{ flex: 1 }} />
                      <Typography sx={{ mx: 2, fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em', fontFamily: MONO }}>
                        {new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                    </Box>
                  )}
                  <MessageBubble msg={msg} onConfirm={confirm} />
                </Box>
              );
            })}

            {/* Optimistic user message */}
            {optimisticMsg && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mb: 1.5 }}>
                <Box sx={{ maxWidth: '82%', bgcolor: '#005C4B', borderRadius: '18px 18px 4px 18px', px: 2, py: 1.25 }}>
                  <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#fff', whiteSpace: 'pre-wrap' }}>{optimisticMsg.body}</Typography>
                  <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', mt: 0.75, textAlign: 'right' }}>{optimisticMsg.time}</Typography>
                </Box>
              </Box>
            )}

            {/* Typing indicator */}
            {sending && <TypingIndicator />}
          </>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* ── Input bar ── */}
      <Box sx={{ bgcolor: '#F0F0F0', borderTop: `1px solid ${Colors.border}`, px: 1.5, py: 1, display: 'flex', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
        <TextField
          fullWidth multiline maxRows={5} size="small"
          placeholder="Tell Aira what to do or ask anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#fff', borderRadius: '20px', fontSize: '0.875rem',
              '& fieldset': { borderColor: Colors.border },
            },
          }}
        />
        <Box
          onClick={(!input.trim() || sending) ? undefined : sendMsg}
          sx={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            bgcolor: input.trim() && !sending ? Colors.gold : Colors.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !sending ? 'pointer' : 'default',
            transition: 'background 0.15s',
            boxShadow: input.trim() && !sending ? '0 2px 8px rgba(184,134,11,0.35)' : 'none',
          }}
        >
          {sending
            ? <CircularProgress size={18} sx={{ color: '#fff' }} />
            : <ArrowUpward sx={{ fontSize: 20, color: '#fff' }} />
          }
        </Box>
      </Box>

      <ActiveInstructionsDrawer open={showInstructions} onClose={() => setShowInstructions(false)} />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
