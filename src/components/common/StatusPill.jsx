import { Chip } from '@mui/material';

export default function StatusPill({ label, color = '#888', bg }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.625rem',
        fontWeight: 700,
        backgroundColor: bg || color + '18',
        color: color,
        border: `1px solid ${color}40`,
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  );
}
