import { Clock, PlayCircle, CheckCircle2, AlertTriangle, Ban } from 'lucide-react';

// Every session card carries one of ~10 raw statuses (draft, upcoming, in_progress,
// "in progress", completed, pending, not_completed, absent, excused, ...). Users
// should only ever see the FOUR session-status words from the flow spec:
//   Upcoming · In Progress · Completed · Pending
// This is the one place that mapping lives; StatusBadge (and anything needing the
// matching color/icon) reads from here.
export const STATUS_GROUPS = {
  upcoming: {
    statuses: ['draft', 'upcoming'],
    label: 'Upcoming',
    bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6',
    Icon: Clock,
  },
  inProgress: {
    statuses: ['in_progress', 'in progress'],
    label: 'In Progress',
    bg: '#EEF2FF', color: '#4F46E5', dot: '#6366F1',
    Icon: PlayCircle,
  },
  completed: {
    statuses: ['completed'],
    label: 'Completed',
    bg: '#F0FDF4', color: '#16A34A', dot: '#22C55E',
    Icon: CheckCircle2,
  },
  // "Pending" = missed or not completed. It's actionable (the Pending Queue),
  // not terminal - amber, not red. Absent/excused fall here too as a safety net,
  // though those are really attendance statuses shown separately.
  pending: {
    statuses: ['pending', 'not_completed', 'absent', 'excused'],
    label: 'Pending',
    bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B',
    Icon: AlertTriangle,
  },
  // "Empty" = a soft-deleted slot kept only as a tombstone so the session
  // sequence doesn't drift. Not a real card - it's refilled via custom generate.
  empty: {
    statuses: ['empty'],
    label: 'Removed',
    bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF',
    Icon: Ban,
  },
};

const LOOKUP = Object.values(STATUS_GROUPS).reduce((map, group) => {
  group.statuses.forEach(s => { map[s] = group; });
  return map;
}, {});

export function getStatusGroup(rawStatus) {
  const key = String(rawStatus || '').toLowerCase().trim();
  return LOOKUP[key] || STATUS_GROUPS.upcoming;
}
