import { CaseDetailView } from '../CaseDetailView';

export default function CaseDetailViewExample() {
  return (
    <div className="p-4">
      <CaseDetailView
        caseId="CASE-001"
        onBack={() => console.log('Navigate back')}
      />
    </div>
  );
}