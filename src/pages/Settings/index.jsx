import {
  ChatBubbleOutlined,
  ChevronRight,
  ColorLens,
  Logout,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Switch,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/index';
import { useAuth } from '../../store/auth';
import { useIsAdmin } from '../../store/auth';
import { Colors } from '../../theme/index';

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);
  const isAdmin = useIsAdmin();
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [togglingApproval, setTogglingApproval] = useState(false);

  const configQ = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.config(),
    enabled: isAdmin,
  });

  const approvalEnabled = configQ.data?.approvalMode?.enabled ?? true;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleApproval = async () => {
    try {
      setTogglingApproval(true);
      await adminApi.toggleApproval(!approvalEnabled, user?.username || 'unknown');
      await configQ.refetch();
      setSnack({ open: true, msg: `Approval mode ${!approvalEnabled ? 'enabled' : 'disabled'}`, severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Could not toggle approval mode', severity: 'error' });
    } finally {
      setTogglingApproval(false);
    }
  };

  const MenuItem = ({ icon, label, sublabel, onClick, rightEl }) => (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', px: 2, py: 1.5, cursor: onClick ? 'pointer' : 'default', gap: 1.5,
        '&:hover': { bgcolor: onClick ? Colors.bg : 'transparent' },
        transition: 'background 0.1s',
      }}
    >
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: Colors.navy }}>{label}</Typography>
        {sublabel && <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary }}>{sublabel}</Typography>}
      </Box>
      {rightEl || (onClick && <ChevronRight sx={{ fontSize: 18, color: Colors.textMuted }} />)}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
          @{user?.username}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Settings
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: Colors.bg }}>
        {/* Profile */}
        <Paper elevation={0} sx={{ m: 2, border: `1px solid ${Colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: Colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography sx={{ color: Colors.navy, fontSize: '1.25rem', fontWeight: 700 }}>{user?.username?.[0]?.toUpperCase() || 'U'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: Colors.navy }}>{user?.username}</Typography>
              {user?.role && <Typography sx={{ fontSize: '0.6875rem', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</Typography>}
            </Box>
          </Box>
        </Paper>

        {/* Features */}
        <Paper elevation={0} sx={{ mx: 2, mb: 2, border: `1px solid ${Colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>FEATURES</Typography>
          <MenuItem icon={<ChatBubbleOutlined sx={{ color: Colors.navy, fontSize: 18 }} />} label="Chat with Pooja" sublabel="Train Aira's knowledge" onClick={() => navigate('/chat')} />
          <Divider sx={{ ml: 7 }} />
          <MenuItem icon={<ColorLens sx={{ color: Colors.navy, fontSize: 18 }} />} label="Style Review" sublabel="Review and approve patterns" onClick={() => navigate('/style-review')} />
        </Paper>

        {/* Admin */}
        {isAdmin && (
          <Paper elevation={0} sx={{ mx: 2, mb: 2, border: `1px solid ${Colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
            <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: '0.5625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>ADMIN</Typography>
            <MenuItem
              icon={<SettingsIcon sx={{ color: Colors.navy, fontSize: 18 }} />}
              label="Approval Mode"
              sublabel={approvalEnabled ? 'Messages require approval' : 'Auto-send enabled'}
              rightEl={
                configQ.isLoading ? <CircularProgress size={18} sx={{ color: Colors.textMuted }} /> : (
                  <Switch
                    checked={approvalEnabled}
                    onChange={toggleApproval}
                    disabled={togglingApproval}
                    size="small"
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: Colors.navy }, '& .Mui-checked .MuiSwitch-thumb': { bgcolor: Colors.success } }}
                    onClick={e => e.stopPropagation()}
                  />
                )
              }
            />
          </Paper>
        )}

        {/* Logout */}
        <Paper elevation={0} sx={{ mx: 2, mb: 2, border: `1px solid ${Colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box
            onClick={handleLogout}
            sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, cursor: 'pointer', gap: 1.5, '&:hover': { bgcolor: Colors.danger + '08' } }}
          >
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: Colors.danger + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logout sx={{ color: Colors.danger, fontSize: 18 }} />
            </Box>
            <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: Colors.danger }}>Sign Out</Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: Colors.textMuted, fontSize: '0.6875rem', pb: 3 }}>
          Aira · Binny's Jewellery · Internal
        </Typography>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
