import { Box } from '@mui/material';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { Colors } from '../../theme/index';

export default function PageWrapper({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: Colors.bg }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
