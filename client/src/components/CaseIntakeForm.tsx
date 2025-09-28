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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const caseSchema = z.object({
  caseOriginationId: z.string().min(1, "Case origination is required"),
  caseTypeId: z.string().min(1, "Case type is required"),
  categoryId: z.string().min(1, "Category is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerState: z.string().min(2, "State is required"),
  loanId: z.string().optional(),
  lenderName: z.string().optional(),
  details: z.string().min(10, "Details must be at least 10 characters"),
  hasRepresentative: z.boolean().optional().default(false),
  representativeCompanyName: z.string().optional(),
  representativePersonName: z.string().optional(),
  representativeAddress: z.string().optional(),
  representativeEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  representativePhone: z.string().optional(),
}).refine((data) => {
  // If hasRepresentative is true, require all representative fields
  if (data.hasRepresentative) {
    return (
      data.representativeCompanyName &&
      data.representativeCompanyName.trim() !== "" &&
      data.representativePersonName &&
      data.representativePersonName.trim() !== "" &&
      data.representativeAddress &&
      data.representativeAddress.trim() !== "" &&
      data.representativeEmail &&
      data.representativeEmail.trim() !== "" &&
      data.representativePhone &&
      data.representativePhone.trim() !== ""
    );
  }
  return true;
}, {
  message: "All representative fields are required when customer is represented by POA or Attorney",
  path: ["hasRepresentative"], // This will show the error on the checkbox
});

type CaseFormValues = z.infer<typeof caseSchema>;

// Interface for API data
interface CaseOrigination {
  id: string;
  name: string;
  description?: string;
  externalKey?: string;
  isActive: boolean;
}

interface CaseType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  caseOriginationId?: string;
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
  const [selectedOriginationId, setSelectedOriginationId] = useState<string | null>(null);
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  const [hasRepresentative, setHasRepresentative] = useState(false);
  const { toast } = useToast();

  // Fetch case originations from API
  const { data: caseOriginations, isLoading: loadingOriginations, error: originationsError } = useQuery<{data: CaseOrigination[]}>({ 
    queryKey: ["/api/case-originations"],
    queryFn: () => apiRequest("GET", "/api/case-originations")
  });

  // Fetch case types filtered by selected origination
  const { data: caseTypes, isLoading: loadingCaseTypes, error: caseTypesError } = useQuery<{data: CaseType[]}>({ 
    queryKey: ["/api/case-types", selectedOriginationId],
    queryFn: () => apiRequest("GET", selectedOriginationId ? `/api/case-types?caseOriginationId=${selectedOriginationId}` : "/api/case-types"),
    enabled: !!selectedOriginationId,
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
      caseOriginationId: "",
      caseTypeId: "",
      categoryId: "",
      customerName: "",
      customerState: "",
      loanId: "",
      lenderName: "",
      details: "",
      hasRepresentative: false,
      representativeCompanyName: "",
      representativePersonName: "",
      representativeAddress: "",
      representativeEmail: "",
      representativePhone: "",
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
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="caseOriginationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Origination</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedOriginationId(value);
                        setSelectedCaseTypeId(null);
                        form.setValue("caseTypeId", "");
                        form.setValue("categoryId", "");
                      }}
                      disabled={loadingOriginations}
                      data-testid="select-case-origination"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingOriginations ? "Loading..." : "Select case origination"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {originationsError ? (
                          <div className="p-2 text-sm text-destructive">Failed to load case originations</div>
                        ) : caseOriginations?.data?.length ? (
                          caseOriginations.data.map((origination) => (
                            <SelectItem key={origination.id} value={origination.id}>
                              {origination.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">No case originations available</div>
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
                      disabled={!selectedOriginationId || loadingCaseTypes}
                      data-testid="select-case-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedOriginationId ? "Select case origination first" :
                            loadingCaseTypes ? "Loading..." : "Select case type"
                          } />
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

            <div className="grid grid-cols-2 gap-4">
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
                name="lenderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lender Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lender name" {...field} data-testid="input-lender-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* POA/Attorney Representation Section */}
            <div className="border-t pt-6">
              <FormField
                control={form.control}
                name="hasRepresentative"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setHasRepresentative(checked as boolean);
                          // Clear representative fields when unchecked
                          if (!checked) {
                            form.setValue("representativeCompanyName", "");
                            form.setValue("representativePersonName", "");
                            form.setValue("representativeAddress", "");
                            form.setValue("representativeEmail", "");
                            form.setValue("representativePhone", "");
                          }
                        }}
                        data-testid="checkbox-has-representative"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Is the customer being represented by a Power of Attorney (POA) or Attorney?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasRepresentative && (
                <div className="mt-6 space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Representative Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="representativeCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} data-testid="input-representative-company" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="representativePersonName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Person's Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter person's name" {...field} data-testid="input-representative-person" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="representativeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter complete address..."
                            className="min-h-[80px]"
                            {...field}
                            data-testid="textarea-representative-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="representativeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter email address" 
                              {...field} 
                              data-testid="input-representative-email" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="representativePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="Enter phone number" 
                              {...field} 
                              data-testid="input-representative-phone" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

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