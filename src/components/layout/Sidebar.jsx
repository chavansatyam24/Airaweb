import {
  BarChart,
  ChatBubbleOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
  Groups,
  Logout,
  MenuBook,
  // MoreHoriz,
  SwapHoriz,
  Timer,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useCanAccess, usePermissionsStore } from '../../store/permissions';
import { Colors } from '../../theme/index';

const DRAWER_WIDTH = 220;
const MINI_WIDTH = 64;

const NAV_ITEMS = [
  { label: 'Queue', path: '/queue', icon: <Timer />, subMenu: 'Home' },
  { label: 'Clients', path: '/clients', icon: <Groups />, subMenu: 'Client' },
  { label: 'Promises', path: '/promises', icon: <CheckCircleOutlined />, subMenu: 'Promise' },
  { label: 'Disputes', path: '/disputes', icon: <ErrorOutlined />, subMenu: null },
  { label: 'Unfix', path: '/unfix', icon: <SwapHoriz />, subMenu: 'Unfix' },
  { label: 'Brain', path: '/brain', icon: <MenuBook />, subMenu: 'Brain' },
  { label: 'Chat', path: '/chat', icon: <ChatBubbleOutlined />, subMenu: 'Chat' },
  // { label: 'Report', path: '/report', icon: <BarChart />, subMenu: null },
  // { label: 'Settings', path: '/settings', icon: <MoreHoriz />, subMenu: null },
];

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const canAccess = useCanAccess(item.subMenu);
  if (item.subMenu && !canAccess) return null;

  const active = location.pathname === item.path || (item.path !== '/queue' && location.pathname.startsWith(item.path));

  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <Tooltip title={collapsed ? item.label : ''} placement="right">
        <ListItemButton
          onClick={() => navigate(item.path)}
          sx={{
            borderRadius: 2,
            mx: 0.75,
            px: collapsed ? 1.5 : 1.5,
            py: 1,
            minHeight: 44,
            justifyContent: collapsed ? 'center' : 'flex-start',
            backgroundColor: active ? Colors.gold + '18' : 'transparent',
            color: active ? Colors.gold : Colors.textOnDark + 'cc',
            '&:hover': { backgroundColor: active ? Colors.gold + '25' : 'rgba(255,255,255,0.08)' },
            transition: 'all 0.15s',
          }}
        >
          <ListItemIcon sx={{
            minWidth: collapsed ? 0 : 36,
            color: 'inherit',
            '& svg': { fontSize: 20 },
          }}>
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.8125rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: active ? '0.01em' : 0,
              }}
            />
          )}
          {active && !collapsed && (
            <Box sx={{ width: 3, height: 20, borderRadius: 2, bgcolor: Colors.gold, ml: 'auto' }} />
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
}

export default function Sidebar({ collapsed = false }) {
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);
  const clearPermissions = usePermissionsStore(s => s.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearPermissions();
    await logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? MINI_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? MINI_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: Colors.navy,
          borderRight: `1px solid rgba(255,255,255,0.08)`,
          transition: 'width 0.2s ease',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Brand */}
      <Box sx={{
        px: collapsed ? 1 : 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        minHeight: 64,
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px',
          background: `linear-gradient(135deg, ${Colors.gold}, ${Colors.goldLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 2px 8px rgba(184,134,11,0.35)',
        }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: Colors.navy, fontFamily: '"Fraunces", Georgia, serif', fontStyle: 'italic', lineHeight: 1 }}>A</Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 300, color: '#fff', fontFamily: '"Fraunces", Georgia, serif', letterSpacing: '-0.5px', lineHeight: 1, fontStyle: 'italic' }}>
              Aira
            </Typography>
            <Typography sx={{ fontSize: '0.4375rem', color: Colors.gold, letterSpacing: '0.2em', fontWeight: 700, lineHeight: 1.6, fontFamily: '"JetBrains Mono", monospace' }}>
              BINNY'S JEWELLERY
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} />)}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* User + logout */}
      <Box sx={{ p: 1 }}>
        {!collapsed && (
          <Box sx={{ px: 1, py: 1, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: Colors.gold, fontSize: '0.75rem', fontWeight: 700 }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username || 'User'}
              </Typography>
              {user?.role && (
                <Typography sx={{ fontSize: '0.5625rem', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>
                  {user.role}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        <Tooltip title={collapsed ? 'Logout' : ''} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              px: collapsed ? 1.5 : 1.5,
              py: 0.75,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: Colors.textMuted,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', color: Colors.danger },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: 'inherit', '& svg': { fontSize: 18 } }}>
              <Logout />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }} />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
}
