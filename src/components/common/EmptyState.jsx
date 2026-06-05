import { Box, Typography } from '@mui/material';
import { Colors } from '../../theme/index';

export default function EmptyState({ icon = '✓', title = 'Nothing here', subtitle = '' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
      <Typography sx={{ fontSize: '3rem', mb: 2 }}>{icon}</Typography>
      <Typography variant="h3" sx={{ color: Colors.navy, mb: 0.5 }}>{title}</Typography>
      {subtitle && <Typography variant="body1" sx={{ color: Colors.textSecondary, textAlign: 'center' }}>{subtitle}</Typography>}
    </Box>
  );
}
