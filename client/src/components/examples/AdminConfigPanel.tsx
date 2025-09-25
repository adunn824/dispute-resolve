import { AdminConfigPanel } from '../AdminConfigPanel';

export default function AdminConfigPanelExample() {
  return (
    <div className="p-4">
      <AdminConfigPanel 
        onPublishConfig={() => console.log('Config published')}
      />
    </div>
  );
}