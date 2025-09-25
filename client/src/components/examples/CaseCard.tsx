import { CaseCard } from '../CaseCard';

export default function CaseCardExample() {
  return (
    <div className="p-4 max-w-md">
      <CaseCard
        id="CASE-001"
        caseType="Complaint"
        category="CFPB"
        priority="Critical"
        status="open"
        customerName="John Smith"
        createdAt={new Date(Date.now() - 2 * 60 * 60 * 1000)}
        details="Customer complaint regarding unauthorized charges on their account. They claim they never authorized the payment and are requesting a full refund."
        slaDeadline={new Date(Date.now() + 22 * 60 * 60 * 1000)}
        onViewCase={(id) => console.log('View case:', id)}
      />
    </div>
  );
}