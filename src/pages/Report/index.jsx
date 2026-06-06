import { ArrowBack, ArrowForward, CalendarMonth, Today } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TierBadge from '../../components/common/TierBadge';
import { dashboardApi } from '../../api/index';
import { formatDate, formatDateLong, formatINR, formatINRLakhs } from '../../utils/format';
import { Colors } from '../../theme/index';

const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Fraunces", Georgia, serif';

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function SectionLabel({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, mt: 2.5 }}>
      <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.2em', fontFamily: MONO }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: 1, bgcolor: Colors.gold + '30' }} />
    </Box>
  );
}

function MoneyCard({ opening, collected, closing }) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${Colors.gold}40`, bgcolor: Colors.gold + '06', borderRadius: '14px', p: 2, mb: 0 }}>
      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.gold, letterSpacing: '0.2em', fontFamily: MONO, mb: 1.5 }}>
        OUTSTANDING POSITION
      </Typography>
      <Box sx={{ display: 'flex' }}>
        {[
          { label: 'Opening', value: formatINRLakhs(opening), color: Colors.textPrimary },
          { label: 'Collected', value: formatINRLakhs(collected), color: Colors.success },
          { label: 'Closing', value: formatINRLakhs(closing), color: Colors.navy },
        ].map((m, i) => (
          <Box key={m.label} sx={{ flex: 1, borderLeft: i > 0 ? `1px solid ${Colors.gold}30` : 'none', pl: i > 0 ? 2 : 0 }}>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 600, color: Colors.textMuted, fontFamily: MONO, mb: 0.25 }}>
              {m.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: m.color, fontFamily: SERIF, letterSpacing: '-0.5px' }}>
              {m.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function TouchpointGrid({ tp }) {
  const cells = [
    { icon: '💬', label: 'WA Sent', value: tp?.whatsappSent ?? 0, color: Colors.success },
    { icon: '↩️', label: 'Replies', value: tp?.whatsappReplies ?? 0, color: Colors.info },
    { icon: '📧', label: 'Emails', value: tp?.emailSent ?? 0, color: Colors.gold },
    { icon: '📞', label: 'Calls', value: tp?.callsMade ?? 0, color: Colors.navy },
  ];
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex' }}>
        {cells.map((c, i) => (
          <Box key={c.label} sx={{
            flex: 1,
            p: 1.5,
            textAlign: 'center',
            borderLeft: i > 0 ? `1px solid ${Colors.border}` : 'none',
          }}>
            <Typography sx={{ fontSize: '1.125rem', lineHeight: 1.2, mb: 0.5 }}>{c.icon}</Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: c.color, fontFamily: SERIF, lineHeight: 1 }}>
              {c.value}
            </Typography>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, letterSpacing: '0.08em', mt: 0.5 }}>
              {c.label.toUpperCase()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function StatCard({ items }) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '14px', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex' }}>
        {items.map((item, i) => (
          <Box key={item.label} sx={{ flex: 1, p: 1.5, borderLeft: i > 0 ? `1px solid ${Colors.border}` : 'none' }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, letterSpacing: '0.08em', mb: 0.5 }}>
              {item.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: item.color || Colors.navy, fontFamily: SERIF, letterSpacing: '-0.5px' }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function FlagBlock({ icon, title, items, color }) {
  if (!items?.length) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontSize: '1rem' }}>{icon}</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color, fontFamily: MONO }}>{title}</Typography>
        <Box sx={{ bgcolor: color, borderRadius: 99, px: '6px', py: '1px' }}>
          <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 700, fontFamily: MONO }}>{items.length}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {items.map((item, i) => {
          const name = typeof item === 'string' ? item : (item.clientName || item.name || item);
          const tier = typeof item === 'object' ? item.tier : undefined;
          return (
            <Box key={i} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.5, borderRadius: '8px',
              bgcolor: color + '12', border: `1px solid ${color}40`,
            }}>
              {tier && <TierBadge tier={tier} size={14} />}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: Colors.textPrimary }}>{name}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Simple inline calendar picker
function DatePicker({ value, onChange, onClose }) {
  const today = toDateStr(new Date());
  const [viewDate, setViewDate] = useState(new Date(value + 'T00:00:00'));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (toDateStr(next) <= today) setViewDate(next);
  };

  const monthLabel = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const isNextDisabled = month === new Date().getMonth() && year === new Date().getFullYear();

  return (
    <Box sx={{ p: 2, minWidth: 280 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={prevMonth}><ArrowBack fontSize="small" /></IconButton>
        <Typography sx={{ fontWeight: 700, color: Colors.navy, fontSize: '0.9375rem' }}>{monthLabel}</Typography>
        <IconButton size="small" onClick={nextMonth} disabled={isNextDisabled}><ArrowForward fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25, mb: 0.5 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Typography key={i} sx={{ textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, py: 0.25 }}>{d}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
        {cells.map((d, i) => {
          if (!d) return <Box key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          return (
            <Box
              key={i}
              onClick={() => { if (!isFuture) { onChange(dateStr); onClose(); } }}
              sx={{
                textAlign: 'center', py: 0.75, borderRadius: '6px', cursor: isFuture ? 'not-allowed' : 'pointer',
                bgcolor: isSelected ? Colors.navy : isToday ? Colors.gold + '20' : 'transparent',
                '&:hover': { bgcolor: isFuture ? 'transparent' : (isSelected ? Colors.navy : Colors.bg) },
              }}
            >
              <Typography sx={{
                fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 400,
                color: isFuture ? Colors.textMuted : (isSelected ? '#fff' : isToday ? Colors.gold : Colors.textPrimary),
              }}>{d}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function Report() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [sortBy, setSortBy] = useState('totalOverdue');
  const [showCalendar, setShowCalendar] = useState(false);

  const today = toDateStr(new Date());
  const isToday = selectedDate === today;

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const next = toDateStr(d);
    if (next > today) return;
    setSelectedDate(next);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: () => dashboardApi.latestReport(selectedDate),
    staleTime: 5 * 60 * 1000,
  });

  const r = data?.report;

  const sortedClients = r?.overdueClients
    ? [...r.overdueClients].sort((a, b) => {
        if (sortBy === 'totalOverdue') return (b.totalOverdue ?? 0) - (a.totalOverdue ?? 0);
        if (sortBy === 'oldest') return (b.oldestOverdueDays ?? 0) - (a.oldestOverdueDays ?? 0);
        return (b.weightedAvgOverdueDays ?? 0) - (a.weightedAvgOverdueDays ?? 0);
      })
    : [];

  const allFlagsEmpty =
    !r?.flags?.silentSevenPlus?.length &&
    !r?.flags?.promiseBrokenTwice?.length &&
    !r?.flags?.twoXOverdue?.length &&
    !r?.flags?.needCeoAction?.length &&
    !r?.flags?.tierChanges?.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: Colors.navy, px: 3, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: MONO, mb: 0.25 }}>
          AR DAILY REPORT
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ color: '#fff', fontSize: '1.375rem', fontWeight: 400, fontFamily: SERIF, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            {r ? formatDateLong(r.reportDate) : (isLoading ? 'Loading…' : selectedDate)}
          </Typography>
          {/* Date navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" sx={{ color: Colors.gold }} onClick={() => shiftDate(-1)}>
              <ArrowBack sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: Colors.gold }} onClick={() => setShowCalendar(true)}>
              <CalendarMonth sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: isToday ? Colors.textMuted : Colors.gold }} onClick={() => shiftDate(1)} disabled={isToday}>
              <ArrowForward sx={{ fontSize: 16 }} />
            </IconButton>
            {!isToday && (
              <Button size="small" onClick={() => setSelectedDate(today)}
                sx={{ color: Colors.gold, fontSize: '0.5625rem', fontWeight: 700, fontFamily: MONO, letterSpacing: '0.1em', minWidth: 0, px: 0.75, height: 24, border: `1px solid ${Colors.gold}40`, borderRadius: '6px' }}>
                TODAY
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: Colors.bg }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: Colors.gold }} />
          </Box>
        ) : !r ? (
          <Box sx={{ textAlign: 'center', pt: 10 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>📭</Typography>
            <Typography sx={{ color: Colors.navy, fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 400, mb: 0.5 }}>
              No report for this date
            </Typography>
            <Typography sx={{ color: Colors.textSecondary, fontSize: '0.8125rem' }}>
              Report may not have been generated yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 860, mx: 'auto' }}>
            {/* Outstanding position */}
            <MoneyCard opening={r.openingDues} collected={r.collectedToday} closing={r.closingDues} />

            {/* Touchpoints */}
            <SectionLabel>TOUCHPOINTS</SectionLabel>
            <TouchpointGrid tp={r.touchpoints} />

            {/* Promises */}
            <SectionLabel>PROMISES</SectionLabel>
            <StatCard items={[
              { label: 'New Today', value: r.promises?.newToday ?? 0 },
              { label: 'Expected Amount', value: formatINRLakhs(r.promises?.expectedAmount ?? 0), color: Colors.success },
              { label: 'Broken Today', value: r.promises?.brokenToday ?? 0, color: r.promises?.brokenToday ? Colors.danger : Colors.textMuted },
            ]} />

            {/* Disputes */}
            <SectionLabel>DISPUTES</SectionLabel>
            <StatCard items={[
              { label: 'Raised Today', value: r.disputes?.raisedToday ?? 0, color: r.disputes?.raisedToday ? Colors.warning : Colors.textMuted },
              { label: 'Resolved Today', value: r.disputes?.resolvedToday ?? 0, color: r.disputes?.resolvedToday ? Colors.success : Colors.textMuted },
              { label: 'Pending', value: r.disputes?.pending ?? 0, color: r.disputes?.pending ? Colors.danger : Colors.textMuted },
            ]} />

            {/* Client-wise overdue table */}
            <SectionLabel>CLIENT-WISE OVERDUE</SectionLabel>

            {/* Sort tabs */}
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
              {[{ k: 'totalOverdue', label: 'Total ₹' }, { k: 'oldest', label: 'Oldest Days' }, { k: 'weighted', label: 'Wtd Avg' }].map(t => (
                <Box key={t.k} onClick={() => setSortBy(t.k)}
                  sx={{
                    px: 1.25, py: 0.5, borderRadius: '8px', cursor: 'pointer',
                    bgcolor: sortBy === t.k ? Colors.navy : '#fff',
                    border: `1px solid ${sortBy === t.k ? Colors.navy : Colors.border}`,
                  }}>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: sortBy === t.k ? '#fff' : Colors.textSecondary, fontFamily: MONO }}>
                    {t.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '14px', overflow: 'hidden', mb: 0 }}>
              {/* Table header */}
              <Box sx={{ display: 'flex', bgcolor: Colors.cardAlt, px: 1.5, py: 0.75, borderBottom: `1px solid ${Colors.border}` }}>
                <Typography sx={{ width: 28, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO }}>#</Typography>
                <Typography sx={{ flex: 1, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO }}>CLIENT</Typography>
                <Typography sx={{ width: 80, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, textAlign: 'right' }}>OVERDUE</Typography>
                <Typography sx={{ width: 40, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, textAlign: 'right' }}>OLD</Typography>
                <Typography sx={{ width: 40, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, textAlign: 'right' }}>WTD</Typography>
                <Typography sx={{ width: 32, fontSize: '0.5rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO, textAlign: 'right' }}>INV</Typography>
              </Box>
              {sortedClients.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: Colors.textMuted, fontSize: '0.875rem' }}>No overdue clients</Typography>
                </Box>
              ) : sortedClients.map((c, i) => (
                <Box
                  key={c._id || c.clientId || i}
                  onClick={() => navigate(`/client/${c.clientCode}?clientName=${encodeURIComponent(c.clientName || '')}`)}
                  sx={{
                    display: 'flex', alignItems: 'center', px: 1.5, py: 1,
                    borderBottom: i < sortedClients.length - 1 ? `1px solid ${Colors.borderLight}` : 'none',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: Colors.bg },
                    transition: 'background 0.1s',
                  }}
                >
                  <Typography sx={{ width: 28, fontSize: '0.6875rem', fontWeight: 700, color: Colors.textMuted, fontFamily: MONO }}>{i + 1}</Typography>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: Colors.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.clientName}
                    </Typography>
                    {c.tier && <TierBadge tier={c.tier} size={16} />}
                  </Box>
                  <Typography sx={{ width: 80, fontSize: '0.8125rem', fontWeight: 700, color: Colors.danger, fontFamily: SERIF, textAlign: 'right' }}>
                    ₹{formatINR(c.totalOverdue)}
                  </Typography>
                  <Typography sx={{
                    width: 40, fontSize: '0.75rem', fontWeight: 600, textAlign: 'right',
                    color: (c.oldestOverdueDays ?? 0) >= 60 ? Colors.danger : Colors.textSecondary,
                  }}>
                    {c.oldestOverdueDays ?? 0}d
                  </Typography>
                  <Typography sx={{ width: 40, fontSize: '0.75rem', color: Colors.textSecondary, textAlign: 'right' }}>
                    {Math.round(c.weightedAvgOverdueDays ?? 0)}d
                  </Typography>
                  <Typography sx={{ width: 32, fontSize: '0.75rem', color: Colors.textMuted, textAlign: 'right' }}>
                    {c.invoiceCount ?? '—'}
                  </Typography>
                </Box>
              ))}
            </Paper>

            {/* Flags */}
            <SectionLabel>FLAGS</SectionLabel>
            {allFlagsEmpty ? (
              <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '14px', p: 2.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>✅</Typography>
                <Typography sx={{ color: Colors.navy, fontFamily: SERIF, fontWeight: 400, fontSize: '0.9375rem', mb: 0.25 }}>No flags today</Typography>
                <Typography sx={{ color: Colors.textSecondary, fontSize: '0.75rem' }}>All clients within normal thresholds</Typography>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ border: `1px solid ${Colors.border}`, borderRadius: '14px', p: 2 }}>
                <FlagBlock icon="🔇" title="Silent 7+ days" items={r.flags?.silentSevenPlus} color={Colors.warning} />
                <FlagBlock icon="⚠️" title="Promise broken 2×+" items={r.flags?.promiseBrokenTwice} color={Colors.danger} />
                <FlagBlock icon="📈" title="2× Overdue" items={r.flags?.twoXOverdue} color={Colors.danger} />
                <FlagBlock icon="👔" title="Needs CEO Action" items={r.flags?.needCeoAction} color={Colors.info} />
                <FlagBlock icon="🔄" title="Tier Changes" items={r.flags?.tierChanges} color={Colors.gold} />
              </Paper>
            )}

            <Box sx={{ height: 32 }} />
          </Box>
        )}
      </Box>

      {/* Calendar dialog */}
      <Dialog open={showCalendar} onClose={() => setShowCalendar(false)} maxWidth="xs">
        <DialogContent sx={{ p: 0 }}>
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            onClose={() => setShowCalendar(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
