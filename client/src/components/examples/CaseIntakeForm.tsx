import { CaseIntakeForm } from '../CaseIntakeForm';
import { Toaster } from "@/components/ui/toaster";

export default function CaseIntakeFormExample() {
  return (
    <div className="p-4">
      <CaseIntakeForm 
        onSubmit={(data) => console.log('Form submitted:', data)}
      />
      <Toaster />
    </div>
  );
}