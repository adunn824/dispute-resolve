import { Dashboard } from '../Dashboard';

export default function DashboardExample() {
  return (
    <div className="p-4">
      <Dashboard
        userRole="agent"
        onCreateCase={() => console.log('Create case')}
        onViewCase={(id) => console.log('View case:', id)}
      />
    </div>
  );
}