import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, PlayCircle, Database, PlusCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TestCase {
  id?: string;
  customerName: string;
  customerState: string;
  details: string;
  loanId?: string;
  lenderName?: string;
  state: string;
  status: 'open' | 'in_progress' | 'resolved';
  hasRepresentative: boolean;
  representativeCompanyName?: string;
  categoryCode: string;
  categoryName: string;
  caseTypeName: string;
  ageInDays?: number;
  settlementAmount?: number;
  forgivenAmount?: number;
}

interface RuleTestResult {
  ruleId: string;
  ruleName: string;
  ruleType: 'priority' | 'tag';
  matched: boolean;
  matchedConditions: number;
  totalConditions: number;
  conditionResults: Array<{
    field: string;
    operator: string;
    value: any;
    actualValue: any;
    matched: boolean;
    reason?: string;
  }>;
  resultValue?: string; // priority level or tag name
}

interface RuleTesterProps {
  ruleType: 'priority' | 'tag';
  categoryId?: string;
}

export function RuleTester({ ruleType, categoryId }: RuleTesterProps) {
  const [activeTab, setActiveTab] = useState("existing");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [mockCaseData, setMockCaseData] = useState<Partial<TestCase>>({
    customerName: "John Doe",
    customerState: "CA",
    details: "Test case for rule evaluation",
    state: "CA",
    status: "open",
    hasRepresentative: false,
    categoryCode: "COMP_SVC",
    categoryName: "Service Complaint",
    caseTypeName: "Complaint",
    ageInDays: 5
  });
  const [testResults, setTestResults] = useState<RuleTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch existing cases for testing
  const { data: existingCases = [] } = useQuery({
    queryKey: ["/api/cases", { detailed: true, limit: 50 }],
    select: (response: any) => response.data || [],
  });

  // Fetch rules to test
  const rulesEndpoint = ruleType === 'priority' ? '/api/priority-rules' : '/api/tag-rules';
  const { data: rules = [] } = useQuery({
    queryKey: [rulesEndpoint, categoryId],
    select: (response: any) => response.data || [],
  });

  // Run rule test
  const runRuleTest = async () => {
    if (!selectedCaseId && activeTab === "existing") {
      toast({ title: "Error", description: "Please select a case to test", variant: "destructive" });
      return;
    }

    if (activeTab === "mock" && (!mockCaseData.details || mockCaseData.details.length < 10)) {
      toast({ title: "Error", description: "Please provide valid mock case data", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let testCaseData: TestCase;
      
      if (activeTab === "existing") {
        const selectedCase = existingCases.find(c => c.id === selectedCaseId);
        if (!selectedCase) {
          throw new Error("Selected case not found");
        }
        
        testCaseData = {
          id: selectedCase.id,
          customerName: selectedCase.customerName,
          customerState: selectedCase.customerState || selectedCase.state,
          details: selectedCase.details,
          loanId: selectedCase.loanId,
          lenderName: selectedCase.lenderName,
          state: selectedCase.state,
          status: selectedCase.status,
          hasRepresentative: selectedCase.hasRepresentative || false,
          representativeCompanyName: selectedCase.representativeCompanyName,
          categoryCode: selectedCase.categoryCode,
          categoryName: selectedCase.categoryName,
          caseTypeName: selectedCase.caseTypeName,
          ageInDays: Math.floor((Date.now() - new Date(selectedCase.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          settlementAmount: selectedCase.settlementAmount,
          forgivenAmount: selectedCase.forgivenAmount
        };
      } else {
        testCaseData = mockCaseData as TestCase;
        // Calculate age in days if not provided
        if (!testCaseData.ageInDays) {
          testCaseData.ageInDays = Math.floor(Math.random() * 30) + 1; // Random 1-30 days for mock data
        }
      }

      // Test rules against the case data
      const response = await apiRequest('/api/rules/test', {
        method: 'POST',
        body: JSON.stringify({
          caseData: testCaseData,
          ruleType,
          categoryId
        })
      });

      setTestResults(response.results || []);
      toast({ title: "Success", description: `Tested ${rules.length} ${ruleType} rules` });
    } catch (error) {
      console.error("Rule test error:", error);
      toast({ title: "Error", description: "Failed to test rules", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical": return "destructive";
      case "high": return "secondary";
      case "medium": return "outline";
      case "low": return "default";
      default: return "outline";
    }
  };

  // Format condition result
  const formatConditionResult = (condition: any) => {
    const { field, operator, value, actualValue, matched, reason } = condition;
    return (
      <div className="flex items-center gap-2 text-sm">
        {matched ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="font-mono">
          {field} {operator} {typeof value === 'object' ? JSON.stringify(value) : value}
        </span>
        <span className="text-muted-foreground">
          (actual: {typeof actualValue === 'object' ? JSON.stringify(actualValue) : actualValue || 'null'})
        </span>
        {reason && <span className="text-xs text-red-600">- {reason}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rule Tester</h3>
          <p className="text-sm text-muted-foreground">
            Test {ruleType} rules against existing or mock case data
          </p>
        </div>
        <Button
          onClick={runRuleTest}
          disabled={isLoading}
          data-testid="button-run-rule-test"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isLoading ? "Testing..." : "Run Test"}
        </Button>
      </div>

      {/* Test Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Case Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" data-testid="tab-existing-cases">
                <Database className="w-4 h-4 mr-2" />
                Existing Cases
              </TabsTrigger>
              <TabsTrigger value="mock" data-testid="tab-mock-case">
                <PlusCircle className="w-4 h-4 mr-2" />
                Mock Case
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div>
                <Label>Select Case to Test</Label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger data-testid="select-existing-case">
                    <SelectValue placeholder="Choose a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCases.map((caseItem: any) => (
                      <SelectItem key={caseItem.id} value={caseItem.id}>
                        <div className="flex flex-col">
                          <span>{caseItem.customerName} - {caseItem.caseTypeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {caseItem.categoryName} • {caseItem.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCaseId && existingCases.find(c => c.id === selectedCaseId) && (
                <Alert>
                  <AlertDescription>
                    <strong>Selected Case:</strong> {existingCases.find(c => c.id === selectedCaseId)?.details?.substring(0, 100)}...
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="mock" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={mockCaseData.customerName || ""}
                    onChange={(e) => setMockCaseData(prev => ({ ...prev, customerName: e.target.value }))}
                    data-testid="input-mock-customer-name"
                  />
                </div>
                <div>
                  <Label>Customer State</Label>
                  <Input
                    value={mockCaseData.customerState || ""}
                    onChange={(e) => setMockCaseData(prev => ({ ...prev, customerState: e.target.value }))}
                    data-testid="input-mock-customer-state"
                  />
                </div>
                <div>
                  <Label>Case Status</Label>
                  <Select
                    value={mockCaseData.status || "open"}
                    onValueChange={(value: any) => setMockCaseData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="select-mock-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Age (Days)</Label>
                  <Input
                    type="number"
                    value={mockCaseData.ageInDays || ""}
                    onChange={(e) => setMockCaseData(prev => ({ ...prev, ageInDays: parseInt(e.target.value) || 0 }))}
                    data-testid="input-mock-age-days"
                  />
                </div>
              </div>
              
              <div>
                <Label>Case Details</Label>
                <Textarea
                  value={mockCaseData.details || ""}
                  onChange={(e) => setMockCaseData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Enter case details for testing..."
                  className="min-h-20"
                  data-testid="textarea-mock-details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loan ID (Optional)</Label>
                  <Input
                    value={mockCaseData.loanId || ""}
                    onChange={(e) => setMockCaseData(prev => ({ ...prev, loanId: e.target.value }))}
                    data-testid="input-mock-loan-id"
                  />
                </div>
                <div>
                  <Label>Lender Name (Optional)</Label>
                  <Input
                    value={mockCaseData.lenderName || ""}
                    onChange={(e) => setMockCaseData(prev => ({ ...prev, lenderName: e.target.value }))}
                    data-testid="input-mock-lender-name"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Results</CardTitle>
            <p className="text-sm text-muted-foreground">
              Results for {testResults.length} {ruleType} rule{testResults.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result) => (
                <Card key={result.ruleId} className={`${result.matched ? 'border-green-200' : 'border-gray-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.matched ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h4 className="font-medium">{result.ruleName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.matchedConditions}/{result.totalConditions} conditions matched
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.matched && result.resultValue && (
                          <Badge 
                            variant={ruleType === 'priority' ? getPriorityColor(result.resultValue) : 'default'}
                          >
                            {ruleType === 'priority' ? result.resultValue : `Tag: ${result.resultValue}`}
                          </Badge>
                        )}
                        <Badge variant={result.matched ? 'default' : 'secondary'}>
                          {result.matched ? 'Match' : 'No Match'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.conditionResults.map((condition, index) => (
                        <div key={index}>
                          {formatConditionResult(condition)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 && (
        <Alert>
          <AlertDescription>
            No {ruleType} rules found. Create some rules first to test them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}