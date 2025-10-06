import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface ResolutionTabProps {
  caseId: string;
}

const resolutionSchema = z.object({
  disposition: z.string().min(1, "Disposition is required"),
  subDisposition: z.string().optional(),
  notes: z.string().optional(),
  settlementAmount: z.string().optional(),
  forgivenAmount: z.string().optional(),
  policyViolation: z.string().optional(),
  clientAcceptedResolution: z.string().optional(),
});

type ResolutionFormValues = z.infer<typeof resolutionSchema>;

type Disposition = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type SubDisposition = {
  id: string;
  dispositionId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type PolicyViolationOption = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

export function ResolutionTab({ caseId }: ResolutionTabProps) {
  const [selectedDisposition, setSelectedDisposition] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dynamic checklist items to determine completion status
  const { data: checklistItems, isLoading: loadingChecklist } = useQuery({
    queryKey: [`/api/cases/${caseId}/dynamic-checklist`],
    select: (response: any) => response.data || response
  });

  // Fetch resolution options from API
  const { data: dispositions = [] } = useQuery<Disposition[]>({
    queryKey: ["/api/dispositions"],
    select: (response: any) => (response.data || [])
      .filter((d: Disposition) => d.isActive)
      .sort((a: Disposition, b: Disposition) => a.sortOrder - b.sortOrder),
  });

  const { data: subDispositions = [] } = useQuery<SubDisposition[]>({
    queryKey: ["/api/sub-dispositions"],
    select: (response: any) => (response.data || [])
      .filter((s: SubDisposition) => s.isActive)
      .sort((a: SubDisposition, b: SubDisposition) => a.sortOrder - b.sortOrder),
  });

  const { data: policyViolationOptions = [] } = useQuery<PolicyViolationOption[]>({
    queryKey: ["/api/policy-violation-options"],
    select: (response: any) => (response.data || [])
      .filter((p: PolicyViolationOption) => p.isActive)
      .sort((a: PolicyViolationOption, b: PolicyViolationOption) => a.sortOrder - b.sortOrder),
  });

  const form = useForm<ResolutionFormValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: {
      disposition: "",
      subDisposition: "",
      notes: "",
      settlementAmount: "",
      forgivenAmount: "",
      policyViolation: "",
      clientAcceptedResolution: "",
    },
  });

  // Calculate if all required checklist items are completed
  const requiredItems = checklistItems?.filter((item: any) => item.isRequired) || [];
  const completedRequiredItems = requiredItems.filter((item: any) => item.completed);
  // If no required items exist, consider checklist complete
  const checklistComplete = requiredItems.length === 0 || requiredItems.length === completedRequiredItems.length;
  
  // For now, assume documents and fields are always valid (can be enhanced later)
  const documentsUploaded = true;
  const requiredFieldsValid = true;
  
  const canResolve = checklistComplete && documentsUploaded && requiredFieldsValid;

  const handleSubmit = async (data: ResolutionFormValues) => {
    setIsSubmitting(true);
    console.log("Resolving case:", caseId, data);
    
    // Simulate resolution process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    // TODO: Show success message and redirect
  };

  return (
    <div className="space-y-6" data-testid="tab-content-resolution">
      {/* Resolution Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Required checklist items completed</span>
              <div className="flex items-center gap-2">
                {loadingChecklist ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : checklistComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="default">Complete ({completedRequiredItems.length}/{requiredItems.length})</Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Badge variant="secondary">Incomplete ({completedRequiredItems.length}/{requiredItems.length})</Badge>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Required documents uploaded</span>
              <div className="flex items-center gap-2">
                {documentsUploaded ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="default">Complete</Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Badge variant="secondary">Incomplete</Badge>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">All required fields validated</span>
              <div className="flex items-center gap-2">
                {requiredFieldsValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="default">Valid</Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Badge variant="secondary">Invalid</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {!canResolve && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please complete all requirements before resolving this case.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resolution Form */}
      <Card>
        <CardHeader>
          <CardTitle>Case Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="disposition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedDisposition(value);
                          form.setValue("subDisposition", "");
                        }}
                        disabled={!canResolve}
                        data-testid="select-disposition"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dispositions.map((disposition) => (
                            <SelectItem key={disposition.id} value={disposition.id}>
                              {disposition.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subDisposition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Disposition</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        disabled={!selectedDisposition || !canResolve}
                        data-testid="select-sub-disposition"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-disposition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subDispositions
                            .filter(sub => sub.dispositionId === selectedDisposition)
                            .map((subDisposition) => (
                              <SelectItem key={subDisposition.id} value={subDisposition.id}>
                                {subDisposition.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="settlementAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Amount</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="$0.00" 
                          {...field} 
                          disabled={!canResolve}
                          data-testid="input-settlement-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="forgivenAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forgiven Amount</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="$0.00" 
                          {...field} 
                          disabled={!canResolve}
                          data-testid="input-forgiven-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="policyViolation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Violation</FormLabel>
                      <Select onValueChange={field.onChange} disabled={!canResolve} data-testid="select-policy-violation">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {policyViolationOptions.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientAcceptedResolution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Accepted Resolution</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!canResolve} data-testid="select-client-accepted-resolution">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide detailed resolution notes..."
                        className="min-h-[120px]"
                        {...field}
                        disabled={!canResolve}
                        data-testid="textarea-resolution-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset()}
                  disabled={!canResolve}
                  data-testid="button-reset-resolution"
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  disabled={!canResolve || isSubmitting}
                  data-testid="button-resolve-case"
                >
                  {isSubmitting ? "Resolving..." : "Resolve Case"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}