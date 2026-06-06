import { InfoOutlined, Send } from '@mui/icons-material';
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
import { useAuth } from '../../store/auth';
import { Colors } from '../../theme/index';
import { formatTime } from '../../utils/format';

const CHAT_USER_ID = '6a0437e6f077bc2cdd2ac3ba';
const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

function ConfirmationCard({ msg, onConfirm }) {
  const isPending = msg.confirmationStatus === 'pending' || !msg.confirmationStatus;
  const isApproved = msg.confirmationStatus === 'approved';

  return (
    <Box sx={{
      maxWidth: '82%',
      bgcolor: '#fff',
      border: `1.5px solid ${isPending ? Colors.gold + '80' : isApproved ? Colors.success + '60' : Colors.danger + '60'}`,
      borderRadius: '18px 18px 18px 4px',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75, bgcolor: Colors.gold + '10', borderBottom: `1px solid ${Colors.gold}30` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Box sx={{ px: '8px', py: '2px', borderRadius: '99px', bgcolor: Colors.gold }}>
            <Typography sx={{ fontSize: '0.4375rem', fontWeight: 700, color: Colors.navy, fontFamily: MONO, letterSpacing: '0.08em' }}>
              {(msg.confirmationType || msg.cardType || 'CONFIRMATION').toUpperCase().replace(/_/g, ' ')}
            </Typography>
          </Box>
          {msg.refNumber && (
            <Typography sx={{ fontSize: '0.5rem', color: Colors.textMuted, fontFamily: MONO }}>
              #{msg.refNumber}
            </Typography>
          )}
          {msg.appliedToDraftsCount > 0 && (
            <Typography sx={{ fontSize: '0.5rem', color: Colors.textMuted, fontFamily: MONO }}>
              Applied {msg.appliedToDraftsCount}×
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1.25 }}>
        {/* Body */}
        {msg.body && (
          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: Colors.textPrimary, mb: msg.ruleText || msg.interpretation || msg.diff ? 1 : 0 }}>
            {msg.body}
          </Typography>
        )}

        {/* Rule text */}
        {msg.ruleText && (
          <Box sx={{ bgcolor: Colors.cardAlt, p: 1.25, borderRadius: '6px', borderLeft: `3px solid ${Colors.gold}`, mb: 1 }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, fontFamily: MONO, letterSpacing: '0.1em', mb: 0.5 }}>RULE</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: Colors.navy, lineHeight: 1.45 }}>{msg.ruleText}</Typography>
          </Box>
        )}

        {/* Interpretation */}
        {msg.interpretation && (
          <Box sx={{ bgcolor: Colors.cream, p: 1.25, borderRadius: '6px', mb: 1 }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: '#664d03', fontFamily: MONO, letterSpacing: '0.1em', mb: 0.5 }}>INTERPRETATION</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#664d03', lineHeight: 1.45, fontStyle: 'italic' }}>{msg.interpretation}</Typography>
          </Box>
        )}

        {/* Diff box */}
        {(msg.originalText || msg.editedText || msg.diff) && (
          <Box sx={{ bgcolor: Colors.gold + '12', border: `1px solid ${Colors.gold}30`, borderRadius: '6px', p: 1.25, mb: 1 }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, fontFamily: MONO, letterSpacing: '0.1em', mb: 0.75 }}>CHANGE</Typography>
            {msg.originalText && (
              <Typography sx={{ fontSize: '0.6875rem', color: Colors.danger, textDecoration: 'line-through', opacity: 0.7, mb: 0.5 }} style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {msg.originalText}
              </Typography>
            )}
            {msg.editedText && (
              <Typography sx={{ fontSize: '0.6875rem', color: Colors.success, fontWeight: 600 }} style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {msg.editedText}
              </Typography>
            )}
            {msg.diff && !msg.originalText && !msg.editedText && (
              <Typography sx={{ fontSize: '0.6875rem', color: Colors.textPrimary }}>{msg.diff}</Typography>
            )}
          </Box>
        )}

        {/* Tags */}
        {msg.tags?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 1 }}>
            {msg.tags.slice(0, 5).map(t => (
              <Box key={t} sx={{ px: '8px', py: '2px', borderRadius: '6px', bgcolor: Colors.cardAlt, border: `1px solid ${Colors.borderLight}` }}>
                <Typography sx={{ fontSize: '0.4375rem', color: Colors.textSecondary, fontWeight: 600, fontFamily: MONO }}>{t}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Timestamp */}
        <Typography sx={{ fontSize: '0.5rem', color: Colors.textMuted, textAlign: 'right', mb: isPending ? 1 : 0 }}>
          {formatTime(msg.createdAt)}
        </Typography>

        {/* Actions */}
        {isPending && (
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button size="small" variant="outlined" onClick={() => onConfirm(msg._id, false)}
              sx={{ flex: 1, height: 28, fontSize: '0.625rem', fontFamily: MONO, borderColor: Colors.danger, color: Colors.danger }}>
              Reject
            </Button>
            <Button size="small" variant="contained" onClick={() => onConfirm(msg._id, true)}
              sx={{ flex: 1, height: 28, fontSize: '0.625rem', fontFamily: MONO, bgcolor: Colors.success, '&:hover': { bgcolor: Colors.success + 'e0' } }}>
              Approve
            </Button>
          </Box>
        )}

        {!isPending && msg.confirmationStatus && (
          <Chip
            label={isApproved ? '✓ Approved' : '✗ Rejected'}
            size="small"
            sx={{ height: 20, fontSize: '0.5625rem', bgcolor: isApproved ? Colors.success + '18' : Colors.danger + '18', color: isApproved ? Colors.success : Colors.danger }}
          />
        )}
      </Box>
    </Box>
  );
}

function InstructionPanel({ open, onClose }) {
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
        <Typography sx={{ color: '#fff', fontSize: '1rem', fontFamily: SERIF }}>Pooja's Rules</Typography>
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

export default function Chat() {
  const user = useAuth(s => s.user);
  const userId = user?.id || CHAT_USER_ID;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });
  const chatEndRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pooja-chat', userId],
    queryFn: () => poojaChatApi.messages(userId, 100),
    refetchInterval: 10000,
  });
  const messages = data?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMsg = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    try {
      await poojaChatApi.send(text, userId);
      await refetch();
    } catch (err) {
      setSnack({ open: true, msg: err?.response?.data?.message || 'Could not send', severity: 'error' });
    } finally {
      setSending(false);
    }
  };

  const confirm = async (msgId, approved) => {
    try {
      await poojaChatApi.confirm(msgId, userId, approved);
      await refetch();
      qc.invalidateQueries({ queryKey: ['pooja-chat'] });
    } catch {
      setSnack({ open: true, msg: 'Could not confirm', severity: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>
            TRAIN AIRA
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Chat with Pooja
          </Typography>
        </Box>
        <Tooltip title="View active instructions">
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => setShowInstructions(true)}>
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: Colors.bg, py: 1.5, px: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: Colors.gold }} /></Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography sx={{ color: Colors.textMuted, fontSize: '0.875rem' }}>Start a conversation with Pooja</Typography>
          </Box>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const isConfirmation = msg.cardType === 'confirmation';
            const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt).toDateString() : null;
            const thisDate = new Date(msg.createdAt).toDateString();
            return (
              <Box key={msg._id}>
                {prevDate !== thisDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 1.5 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography sx={{ mx: 2, fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em', fontFamily: MONO }}>
                      {new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                  {!isUser && (
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, mb: 0.25, letterSpacing: '0.12em', fontFamily: MONO }}>POOJA</Typography>
                  )}
                  {isConfirmation && !isUser ? (
                    <ConfirmationCard msg={msg} onConfirm={confirm} />
                  ) : (
                    <Box sx={{
                      maxWidth: '75%',
                      bgcolor: isUser ? Colors.navy : '#fff',
                      color: isUser ? '#fff' : Colors.textPrimary,
                      border: isUser ? 'none' : `1px solid ${Colors.border}`,
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      px: 2, py: 1.25,
                    }}>
                      <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'inherit' }}>{msg.body}</Typography>
                      <Typography sx={{ fontSize: '0.5625rem', color: isUser ? 'rgba(255,255,255,0.5)' : Colors.textMuted, mt: 0.5, textAlign: 'right' }}>
                        {formatTime(msg.createdAt)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ bgcolor: '#fff', borderTop: `1px solid ${Colors.border}`, px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
        <TextField
          fullWidth multiline maxRows={4} size="small"
          placeholder="Message Pooja…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: Colors.bg } }}
        />
        <IconButton onClick={sendMsg} disabled={!input.trim() || sending}
          sx={{ bgcolor: Colors.navy, color: '#fff', '&:hover': { bgcolor: Colors.navyAlt ?? Colors.navy }, '&.Mui-disabled': { bgcolor: Colors.border }, flexShrink: 0 }}>
          {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send fontSize="small" />}
        </IconButton>
      </Box>

      <InstructionPanel open={showInstructions} onClose={() => setShowInstructions(false)} />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
