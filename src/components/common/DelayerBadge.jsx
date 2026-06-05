import { Chip } from '@mui/material';
import { Colors } from '../../theme/index';

const tagConfig = {
  prompt: { bg: Colors.success + '18', color: Colors.success, border: Colors.success + '50', label: 'Prompt' },
  mild: { bg: Colors.warning + '18', color: Colors.warning, border: Colors.warning + '50', label: 'Mild' },
  heavy: { bg: Colors.danger + '18', color: Colors.danger, border: Colors.danger + '50', label: 'Heavy' },
  unknown: { bg: Colors.textMuted + '18', color: Colors.textMuted, border: Colors.textMuted + '50', label: 'Unknown' },
};

export default function DelayerBadge({ tag }) {
  if (!tag) return null;
  const cfg = tagConfig[tag] || tagConfig.unknown;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.625rem',
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  );
}
