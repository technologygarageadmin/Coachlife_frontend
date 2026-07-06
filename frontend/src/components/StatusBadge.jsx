import { getStatusGroup } from '../utils/statusGroups';

const SIZES = {
  sm: { padding: '2px 8px', fontSize: '10px', iconSize: 10, gap: '3px' },
  md: { padding: '3px 10px', fontSize: '12px', iconSize: 12, gap: '5px' },
  lg: { padding: '5px 14px', fontSize: '13px', iconSize: 14, gap: '6px' },
};

// The one place a raw status string (draft/upcoming/in_progress/completed/
// pending/absent/excused/not_completed/...) should ever get rendered - always
// collapsed to the 4-word vocabulary from change.md §5. See utils/statusGroups
// for the mapping itself (shared with anything that needs the matching color).
export default function StatusBadge({ status, size = 'md', style = {} }) {
  const group = getStatusGroup(status);
  const { Icon } = group;
  const s = SIZES[size] || SIZES.md;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.padding, borderRadius: '999px',
      fontSize: s.fontSize, fontWeight: 700,
      background: group.bg, color: group.color,
      border: `1px solid ${group.color}22`,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      <Icon size={s.iconSize} />
      {group.label}
    </span>
  );
}
