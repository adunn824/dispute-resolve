import { PriorityBadge } from '../PriorityBadge';

export default function PriorityBadgeExample() {
  return (
    <div className="p-4 flex gap-2">
      <PriorityBadge priority="Critical" />
      <PriorityBadge priority="High" />
      <PriorityBadge priority="Medium" />
      <PriorityBadge priority="Low" />
      <PriorityBadge priority="BK24" />
      <PriorityBadge priority="BK48" />
    </div>
  );
}