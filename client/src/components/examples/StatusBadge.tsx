import { StatusBadge } from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="p-4 flex gap-2">
      <StatusBadge status="open" />
      <StatusBadge status="pending" />
      <StatusBadge status="resolved" />
      <StatusBadge status="closed" />
    </div>
  );
}