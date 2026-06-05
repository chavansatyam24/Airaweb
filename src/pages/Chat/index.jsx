import { Send } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { poojaChatApi } from '../../api/index';
import { useAuth } from '../../store/auth';
import { Colors } from '../../theme/index';
import { formatTime } from '../../utils/format';

const CHAT_USER_ID = '6a0437e6f077bc2cdd2ac3ba';

export default function Chat() {
  const user = useAuth(s => s.user);
  const userId = user?.id || CHAT_USER_ID;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
          TRAIN AIRA
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Chat with Pooja
        </Typography>
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
            const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt).toDateString() : null;
            const thisDate = new Date(msg.createdAt).toDateString();
            return (
              <Box key={msg._id}>
                {prevDate !== thisDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 1.5 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography sx={{ mx: 2, fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.08em', fontFamily: '"JetBrains Mono", monospace' }}>
                      {new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                  {!isUser && (
                    <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, mb: 0.25, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>POOJA</Typography>
                  )}
                  <Box sx={{
                    maxWidth: '75%',
                    bgcolor: isUser ? Colors.navy : '#fff',
                    color: isUser ? '#fff' : Colors.textPrimary,
                    border: isUser ? 'none' : `1px solid ${Colors.border}`,
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    px: 2, py: 1.25,
                    ...(msg.cardType === 'confirmation' ? { border: `1.5px solid ${Colors.gold}60`, bgcolor: Colors.gold + '08' } : {}),
                  }}>
                    {msg.cardType === 'confirmation' && (
                      <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.1em', mb: 0.5 }}>CONFIRMATION REQUEST</Typography>
                    )}
                    <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'inherit' }}>{msg.body}</Typography>
                    <Typography sx={{ fontSize: '0.5625rem', color: isUser ? 'rgba(255,255,255,0.5)' : Colors.textMuted, mt: 0.5, textAlign: 'right' }}>
                      {formatTime(msg.createdAt)}
                    </Typography>
                  </Box>
                  {msg.cardType === 'confirmation' && msg.confirmationStatus === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
                      <Button size="small" variant="outlined" onClick={() => confirm(msg._id, false)}
                        sx={{ height: 24, fontSize: '0.625rem', borderColor: Colors.danger, color: Colors.danger }}>
                        Reject
                      </Button>
                      <Button size="small" variant="contained" onClick={() => confirm(msg._id, true)}
                        sx={{ height: 24, fontSize: '0.625rem', bgcolor: Colors.success }}>
                        Approve
                      </Button>
                    </Box>
                  )}
                  {msg.cardType === 'confirmation' && msg.confirmationStatus && msg.confirmationStatus !== 'pending' && (
                    <Chip label={msg.confirmationStatus === 'approved' ? '✓ Approved' : '✗ Rejected'} size="small"
                      sx={{ mt: 0.5, height: 20, fontSize: '0.5625rem', bgcolor: msg.confirmationStatus === 'approved' ? Colors.success + '18' : Colors.danger + '18', color: msg.confirmationStatus === 'approved' ? Colors.success : Colors.danger }} />
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
          sx={{ bgcolor: Colors.navy, color: '#fff', '&:hover': { bgcolor: Colors.navyLight }, '&.Mui-disabled': { bgcolor: Colors.border }, flexShrink: 0 }}>
          {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send fontSize="small" />}
        </IconButton>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
