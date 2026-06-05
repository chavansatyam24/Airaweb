import { Box } from '@mui/material';
import { Colors } from '../../theme/index';

const tierColor = {
  A: Colors.tierA,
  B: Colors.tierB,
  C: Colors.tierC,
};

export default function TierBadge({ tier, size = 22 }) {
  if (!tier) return null;
  const bg = tierColor[tier] ?? Colors.tierC;
  return (
    <Box sx={{
      width: size,
      height: size,
      borderRadius: '6px',
      bgcolor: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size <= 22 ? '0.6875rem' : '0.8125rem',
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: 0,
    }}>
      {tier}
    </Box>
  );
}
