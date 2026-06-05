import { Box, Typography } from '@mui/material';
import { Colors } from '../../theme/index';

export default function MetricBox({ label, value, sublabel, color = Colors.navy }) {
  return (
    <Box sx={{
      flex: 1,
      bgcolor: '#fff',
      border: `1px solid ${Colors.border}`,
      borderRadius: 2,
      p: 1.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.25,
    }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color, letterSpacing: '-0.5px' }}>
        {value}
      </Typography>
      {sublabel && (
        <Typography sx={{ fontSize: '0.6875rem', color: Colors.textSecondary }}>{sublabel}</Typography>
      )}
    </Box>
  );
}
