import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Clock, Paperclip, RefreshCw, Loader2, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

interface EmailIntakeCase {
  id: string;
  caseNumber: number;
  status: string;
  details: string;
  emailMetadata?: {
    from?: {
      name?: string;
      email: string;
    };
    to?: Array<{
      name?: string;
      email: string;
    }>;
    subject?: string;
    receivedDate?: string;
    messageId?: string;
    hasAttachments?: boolean;
    attachmentCount?: number;
    attachments?: Array<{
      name: string;
      size?: number;
      contentType?: string;
    }>;
    body?: string;
    bodyPreview?: string;
  };
  receivedAt?: string;
  firstViewedAt?: string;
  ageInHours: number;
  createdAt: string;
}

interface CaseOrigination {
  id: string;
  name: string;
  description?: string;
}

interface CaseType {
  id: string;
  name: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Lender {
  id: string;
  name: string;
  dba?: string | null;
}

const intakeSchema = z.object({
  caseOriginationId: z.string().min(1, "Case origination is required"),
  caseTypeId: z.string().min(1, "Case type is required"),
  categoryId: z.string().min(1, "Category is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().optional(),
  customerNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  loanId: z.string().optional(),
  lenderId: z.string().optional(),
  details: z.string().min(10, "Details must be at least 10 characters"),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

// Helper function to parse name into first and last name
function parseName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName || fullName.trim() === "") {
    return { firstName: "", lastName: "" };
  }
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function EmailCaseItem({ caseItem, onComplete }: { caseItem: EmailIntakeCase; onComplete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOriginationId, setSelectedOriginationId] = useState<string | null>(null);
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  const { toast } = useToast();

  // Parse the customer name and email from email metadata
  // emailMetadata.from is an object with { name?: string, email: string }
  const fromField = caseItem.emailMetadata?.from;
  const extractedName = fromField?.name || "";
  const extractedEmail = fromField?.email || "";
  
  const parsedName = parseName(extractedName);
  
  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      caseOriginationId: "",
      caseTypeId: "",
      categoryId: "",
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      email: extractedEmail,
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      customerNumber: "",
      accountNumber: "",
      loanId: "",
      lenderId: "",
      details: caseItem.emailMetadata?.body || caseItem.emailMetadata?.bodyPreview || caseItem.details || "",
    },
  });

  const { data: caseOriginations, isLoading: loadingOriginations } = useQuery<{ data: CaseOrigination[] }>({
    queryKey: ["/api/case-originations"],
    enabled: isExpanded,
  });

  const { data: caseTypes, isLoading: loadingCaseTypes } = useQuery<{ data: CaseType[] }>({
    queryKey: ["/api/case-types", selectedOriginationId],
    queryFn: () => apiRequest("GET", selectedOriginationId ? `/api/case-types?caseOriginationId=${selectedOriginationId}` : "/api/case-types"),
    enabled: isExpanded && !!selectedOriginationId,
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery<{ data: Category[] }>({
    queryKey: ["/api/categories", selectedCaseTypeId],
    queryFn: () => apiRequest("GET", `/api/categories?caseTypeId=${selectedCaseTypeId}`),
    enabled: isExpanded && !!selectedCaseTypeId,
  });

  const { data: lendersData } = useQuery<{ data: Lender[] }>({
    queryKey: ["/api/lenders"],
    enabled: isExpanded,
  });

  const completeMutation = useMutation({
    mutationFn: (data: IntakeFormData) =>
      apiRequest("POST", `/api/cases/${caseItem.id}/complete-intake`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email intake completed successfully",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete intake",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IntakeFormData) => {
    completeMutation.mutate(data);
  };

  const getAgeColor = (ageInHours: number) => {
    if (ageInHours < 1) return "text-green-600 dark:text-green-400";
    if (ageInHours < 4) return "text-yellow-600 dark:text-yellow-400";
    if (ageInHours < 24) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatAge = (ageInHours: number) => {
    if (ageInHours < 1) return "< 1h";
    if (ageInHours < 24) return `${ageInHours}h`;
    const days = Math.floor(ageInHours / 24);
    const hours = ageInHours % 24;
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold">#{caseItem.caseNumber}</span>
              <Badge variant="outline" className="font-medium">
                {caseItem.emailMetadata?.subject || "No Subject"}
              </Badge>
              <div className={`flex items-center gap-1 text-sm font-semibold ${getAgeColor(caseItem.ageInHours)}`}>
                <Clock className="w-4 h-4" />
                {formatAge(caseItem.ageInHours)}
              </div>
              {caseItem.emailMetadata?.hasAttachments && (
                <Badge variant="secondary">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {caseItem.emailMetadata.attachmentCount || 1} attachment{(caseItem.emailMetadata.attachmentCount || 1) > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="text-sm space-y-1">
              <div className="flex gap-2">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">
                  {caseItem.emailMetadata?.from 
                    ? (caseItem.emailMetadata.from.name || caseItem.emailMetadata.from.email)
                    : "Unknown"}
                </span>
              </div>
              {caseItem.emailMetadata?.to && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {Array.isArray(caseItem.emailMetadata.to) 
                      ? caseItem.emailMetadata.to.map(t => t.name || t.email).join(', ')
                      : "Unknown"}
                  </span>
                </div>
              )}
            </div>

            {!isExpanded && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {caseItem.emailMetadata?.bodyPreview || caseItem.details}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-expand-case-${caseItem.caseNumber}`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Process
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-2">Email Content</h4>
            <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {caseItem.emailMetadata?.body || caseItem.emailMetadata?.bodyPreview || caseItem.details}
            </div>
          </div>

          {caseItem.emailMetadata?.attachments && caseItem.emailMetadata.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({caseItem.emailMetadata.attachments.length})
              </h4>
              <div className="space-y-2">
                {caseItem.emailMetadata.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-muted/50 rounded-md p-3 text-sm"
                    data-testid={`attachment-${index}`}
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" data-testid={`attachment-name-${index}`}>
                        {attachment.name}
                      </div>
                      {attachment.size && (
                        <div className="text-xs text-muted-foreground">
                          {(attachment.size / 1024).toFixed(1)} KB
                          {attachment.contentType && ` • ${attachment.contentType}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-4">Complete Case Intake</h4>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        data-testid={`select-origination-${caseItem.caseNumber}`}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingOriginations ? "Loading..." : "Select case origination"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {caseOriginations?.data?.map((origination) => (
                            <SelectItem key={origination.id} value={origination.id}>
                              {origination.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          data-testid={`select-type-${caseItem.caseNumber}`}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedOriginationId ? "Select origination first" :
                                loadingCaseTypes ? "Loading..." : "Select case type"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {caseTypes?.data?.map((caseType) => (
                              <SelectItem key={caseType.id} value={caseType.id}>
                                {caseType.name}
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
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          disabled={!selectedCaseTypeId || loadingCategories}
                          data-testid={`select-category-${caseItem.caseNumber}`}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedCaseTypeId ? "Select type first" :
                                loadingCategories ? "Loading..." : "Select category"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesData?.data?.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Customer Information Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-4">Customer Information</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter first name" {...field} data-testid={`input-first-name-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter last name" {...field} data-testid={`input-last-name-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email address" {...field} data-testid={`input-email-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="Enter phone number" {...field} data-testid={`input-phone-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter customer ID" {...field} data-testid={`input-customer-number-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account number" {...field} data-testid={`input-account-number-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 pt-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Address</h5>
                      
                      <FormField
                        control={form.control}
                        name="address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} data-testid={`input-address1-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt, suite, etc. (optional)" {...field} data-testid={`input-address2-${caseItem.caseNumber}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter city" {...field} data-testid={`input-city-${caseItem.caseNumber}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <Select onValueChange={field.onChange} data-testid={`select-state-${caseItem.caseNumber}`}>
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

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter ZIP" {...field} data-testid={`input-zip-code-${caseItem.caseNumber}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan Information Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-4">Loan Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="loanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loan ID (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter loan ID" {...field} data-testid={`input-loan-${caseItem.caseNumber}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lenderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lender (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid={`select-lender-${caseItem.caseNumber}`}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lendersData?.data?.map((lender) => (
                                <SelectItem key={lender.id} value={lender.id}>
                                  {lender.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter case details"
                          className="min-h-[100px]"
                          {...field}
                          data-testid={`textarea-details-${caseItem.caseNumber}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExpanded(false)}
                    data-testid={`button-cancel-${caseItem.caseNumber}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={completeMutation.isPending}
                    data-testid={`button-complete-${caseItem.caseNumber}`}
                  >
                    {completeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Complete Intake
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function EmailIntakePage() {
  const { toast } = useToast();

  const { data: intakeCasesData, isLoading, refetch } = useQuery<{ data: EmailIntakeCase[] }>({
    queryKey: ["/api/cases/email-intake"],
    refetchInterval: 30000,
  });

  const intakeCases = intakeCasesData?.data || [];

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/cases/email-intake"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Intake Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and process incoming emails
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-intake"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{intakeCases.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {intakeCases.filter(c => c.ageInHours >= 24).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Over 24 hours old
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {intakeCases.length > 0
                ? `${Math.round(intakeCases.reduce((acc, c) => acc + c.ageInHours, 0) / intakeCases.length)}h`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current backlog
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading email intake queue...</span>
        </div>
      ) : intakeCases.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-2">No pending emails</h3>
            <p className="text-sm text-muted-foreground">
              All email intake cases have been processed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {intakeCases.map((caseItem) => (
            <EmailCaseItem
              key={caseItem.id}
              caseItem={caseItem}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
