import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const caseSchema = z.object({
  caseType: z.enum(["Mail", "Complaint", "Dispute"]),
  category: z.string().min(1, "Category is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerState: z.string().min(2, "State is required"),
  loanId: z.string().optional(),
  details: z.string().min(10, "Details must be at least 10 characters"),
});

type CaseFormValues = z.infer<typeof caseSchema>;

const mockCategories = {
  Mail: ["Bankruptcy", "ACH Revoke", "E-Fax/Misc", "TrustPilot"],
  Complaint: ["CFPB", "BBB", "Cease & Desist", "Lawsuit", "Military", "Private Attorney"],
  Dispute: ["FactorTrust", "Viking POA", "PDS Dispute", "ID Theft Block"],
};

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

interface CaseIntakeFormProps {
  onSubmit: (data: CaseFormValues) => void;
}

export function CaseIntakeForm({ onSubmit }: CaseIntakeFormProps) {
  const [selectedCaseType, setSelectedCaseType] = useState<keyof typeof mockCategories | null>(null);
  const { toast } = useToast();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseType: undefined,
      category: "",
      customerName: "",
      customerState: "",
      loanId: "",
      details: "",
    },
  });

  const handleSubmit = (data: CaseFormValues) => {
    console.log("Case submitted:", data);
    toast({
      title: "Case Created",
      description: `${data.caseType} case for ${data.customerName} has been created successfully.`,
    });
    onSubmit(data);
  };

  return (
    <Card className="max-w-2xl mx-auto" data-testid="form-case-intake">
      <CardHeader>
        <CardTitle>New Case Intake</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="caseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCaseType(value as keyof typeof mockCategories);
                        form.setValue("category", "");
                      }}
                      data-testid="select-case-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select case type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mail">Mail</SelectItem>
                        <SelectItem value="Complaint">Complaint</SelectItem>
                        <SelectItem value="Dispute">Dispute</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} disabled={!selectedCaseType} data-testid="select-category">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedCaseType && mockCategories[selectedCaseType].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} data-testid="select-state">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="loanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter loan ID if applicable" {...field} data-testid="input-loan-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide detailed information about the case..."
                      className="min-h-[120px]"
                      {...field}
                      data-testid="textarea-details"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => form.reset()} data-testid="button-reset">
                Reset
              </Button>
              <Button type="submit" data-testid="button-submit">
                Create Case
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}