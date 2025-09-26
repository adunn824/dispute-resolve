import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const caseSchema = z.object({
  caseTypeId: z.string().min(1, "Case type is required"),
  categoryId: z.string().min(1, "Category is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerState: z.string().min(2, "State is required"),
  loanId: z.string().optional(),
  details: z.string().min(10, "Details must be at least 10 characters"),
});

type CaseFormValues = z.infer<typeof caseSchema>;

// Interface for API data
interface CaseType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

interface Category {
  id: string;
  caseTypeId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

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
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch case types from API
  const { data: caseTypes, isLoading: loadingCaseTypes, error: caseTypesError } = useQuery<{data: CaseType[]}>({ 
    queryKey: ["/api/case-types"],
    queryFn: () => apiRequest("GET", "/api/case-types")
  });

  // Fetch categories filtered by selected case type
  const { data: categoriesData, isLoading: loadingCategories, error: categoriesError } = useQuery<{data: Category[]}>({ 
    queryKey: ["/api/categories", selectedCaseTypeId],
    queryFn: () => apiRequest("GET", `/api/categories?caseTypeId=${selectedCaseTypeId}`),
    enabled: !!selectedCaseTypeId,
  });

  const categories = categoriesData?.data || [];

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseTypeId: "",
      categoryId: "",
      customerName: "",
      customerState: "",
      loanId: "",
      details: "",
    },
  });

  // Case creation mutation
  const createCaseMutation = useMutation({
    mutationFn: (data: CaseFormValues) => apiRequest("POST", "/api/cases/create-intake", data),
    onSuccess: (response) => {
      toast({
        title: "Case Created",
        description: `Case ${response.data.id} has been created successfully.`,
      });
      form.reset();
      
      // Invalidate relevant queries to refresh dashboards
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      onSubmit(response.data);
    },
    onError: (error: any) => {
      console.error("Failed to create case:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CaseFormValues) => {
    createCaseMutation.mutate(data);
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
                name="caseTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCaseTypeId(value);
                        form.setValue("categoryId", "");
                      }}
                      disabled={loadingCaseTypes}
                      data-testid="select-case-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCaseTypes ? "Loading..." : "Select case type"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {caseTypesError ? (
                          <div className="p-2 text-sm text-destructive">Failed to load case types</div>
                        ) : caseTypes?.data?.length ? (
                          caseTypes.data.map((caseType) => (
                            <SelectItem key={caseType.id} value={caseType.id}>
                              {caseType.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">No case types available</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      disabled={!selectedCaseTypeId || loadingCategories} 
                      data-testid="select-category"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCaseTypeId ? "Select case type first" :
                            loadingCategories ? "Loading..." : "Select category"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesError ? (
                          <div className="p-2 text-sm text-destructive">Failed to load categories</div>
                        ) : categories.length ? (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">No categories available</div>
                        )}
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => form.reset()}
                disabled={createCaseMutation.isPending}
                data-testid="button-reset"
              >
                Reset
              </Button>
              <Button 
                type="submit" 
                disabled={createCaseMutation.isPending}
                data-testid="button-submit"
              >
                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}