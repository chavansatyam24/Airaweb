import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { usePermissionsStore } from '../../store/permissions';
import { Colors } from '../../theme/index';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth(s => s.login);
  const fetchPermissions = usePermissionsStore(s => s.fetchPermissions);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are both required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
      await fetchPermissions();
      navigate('/queue', { replace: true });
    } catch (err) {
      const msg = err?.serverMessage ?? err?.response?.data?.message ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: Colors.navy,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
    }}>
      {/* Brand Block */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {/* Ornament */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'center' }}>
          <Box sx={{ flex: 1, maxWidth: 60, height: 1, bgcolor: Colors.gold + '60' }} />
          <Box sx={{ width: 6, height: 6, bgcolor: Colors.gold, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <Box sx={{ flex: 1, maxWidth: 60, height: 1, bgcolor: Colors.gold + '60' }} />
        </Box>
        <Typography sx={{ color: Colors.gold, fontSize: '0.625rem', letterSpacing: '0.35em', fontWeight: 600, mb: 1.5 }}>
          BINNY'S JEWELLERY
        </Typography>
        <Typography sx={{
          color: '#fff',
          fontSize: '4rem',
          fontWeight: 300,
          fontFamily: 'Georgia, serif',
          letterSpacing: '-2px',
          lineHeight: 1,
          mb: 0.5,
        }}>
          Aira
        </Typography>
        <Typography sx={{ color: Colors.goldLight, fontSize: '0.8125rem', fontStyle: 'italic', letterSpacing: '0.04em', mb: 2 }}>
          AR Collection Agent
        </Typography>
        <Box sx={{ width: 40, height: 1, bgcolor: Colors.gold, opacity: 0.5, mx: 'auto', mb: 1.5 }} />
        <Typography sx={{ color: Colors.textMuted, fontSize: '0.5625rem', letterSpacing: '0.25em', fontWeight: 500 }}>
          INTERNAL · STAFF ONLY
        </Typography>
      </Box>

      {/* Form Card */}
      <Paper
        component="form"
        onSubmit={handleLogin}
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 3,
          borderRadius: 3,
          border: `1px solid ${Colors.border}`,
        }}
      >
        <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, color: Colors.navy, mb: 3, letterSpacing: '-0.3px' }}>
          Sign in to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.625rem', color: Colors.textMuted, fontWeight: 700, letterSpacing: '0.2em', mb: 0.75 }}>
            USERNAME
          </Typography>
          <TextField
            fullWidth
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="your username"
            autoCapitalize="none"
            autoCorrect="off"
            inputProps={{ autoComplete: 'username' }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: Colors.cardAlt } }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.625rem', color: Colors.textMuted, fontWeight: 700, letterSpacing: '0.2em', mb: 0.75 }}>
            PASSWORD
          </Typography>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            inputProps={{ autoComplete: 'current-password' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end">
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: Colors.cardAlt } }}
          />
        </Box>

        <Box
          component="button"
          type="submit"
          disabled={submitting}
          sx={{
            width: '100%',
            py: 1.75,
            bgcolor: submitting ? Colors.navy + '99' : Colors.navy,
            color: '#fff',
            border: `1px solid ${Colors.gold}30`,
            borderRadius: 1.5,
            fontSize: '0.9375rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 0.9 },
          }}
        >
          {submitting ? <><CircularProgress size={16} sx={{ color: '#fff' }} /> Signing in…</> : 'Sign In'}
        </Box>
      </Paper>

      <Typography sx={{ color: Colors.textMuted + '80', fontSize: '0.625rem', mt: 3, letterSpacing: '0.04em' }}>
        © Binny's Jewellery · Confidential
      </Typography>
    </Box>
  );
}
