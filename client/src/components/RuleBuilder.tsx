import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { RULE_FIELDS } from "@shared/schema";

// Available operators for each field type
const OPERATORS_BY_TYPE = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'regex', label: 'Matches regex' },
    { value: 'exists', label: 'Is not empty' },
    { value: 'notExists', label: 'Is empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'exists', label: 'Is not empty' },
    { value: 'notExists', label: 'Is empty' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals' }
  ],
  enum: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'Is one of' },
    { value: 'notIn', label: 'Is not one of' }
  ],
  reference: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'Is one of' },
    { value: 'notIn', label: 'Is not one of' }
  ]
};

export interface RuleCondition {
  field: string;
  operator: string;
  value?: any;
}

interface RuleBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
  className?: string;
  allowedFields?: string[]; // Optional filter for which fields to show
}

export function RuleBuilder({ conditions, onChange, className, allowedFields }: RuleBuilderProps) {
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  
  // Filter RULE_FIELDS based on allowedFields prop
  const availableFields = allowedFields 
    ? Object.fromEntries(
        Object.entries(RULE_FIELDS).filter(([key]) => allowedFields.includes(key))
      )
    : RULE_FIELDS;

  // Fetch reference data for all reference fields
  const referenceFields = Object.entries(availableFields).filter(
    ([_, field]: [string, any]) => field.type === 'reference'
  );

  // Create queries for each reference field
  const referenceQueries = referenceFields.map(([fieldKey, field]: [string, any]) => {
    return useQuery({
      queryKey: [field.endpoint],
      select: (response: any) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      },
      staleTime: 60000, // Cache for 1 minute
    });
  });

  // Build a map of field key to options
  const referenceOptions: Record<string, any[]> = {};
  referenceFields.forEach(([fieldKey, _]: [string, any], index: number) => {
    referenceOptions[fieldKey] = referenceQueries[index].data || [];
  });

  // Add a new condition
  const addCondition = () => {
    // Use first available field as default
    const firstFieldKey = Object.keys(availableFields)[0] || 'details';
    const firstFieldType = availableFields[firstFieldKey as keyof typeof availableFields]?.type;
    const defaultOperators = OPERATORS_BY_TYPE[firstFieldType as keyof typeof OPERATORS_BY_TYPE] || [];
    
    const newCondition: RuleCondition = {
      field: firstFieldKey,
      operator: defaultOperators[0]?.value || 'contains',
      value: ''
    };
    onChange([...conditions, newCondition]);
  };

  // Remove a condition
  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions);
  };

  // Update a specific condition
  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    
    // If field changed, reset operator and value to appropriate defaults
    if (updates.field) {
      const fieldType = availableFields[updates.field as keyof typeof availableFields]?.type;
      const availableOperators = OPERATORS_BY_TYPE[fieldType as keyof typeof OPERATORS_BY_TYPE] || [];
      newConditions[index].operator = availableOperators[0]?.value || 'equals';
      newConditions[index].value = fieldType === 'boolean' ? false : '';
    }
    
    // If operator changed and it's exists/notExists, clear the value
    if (updates.operator && (updates.operator === 'exists' || updates.operator === 'notExists')) {
      newConditions[index].value = undefined;
    }
    
    onChange(newConditions);
  };

  // Get available operators for a field
  const getAvailableOperators = (fieldName: string) => {
    const fieldType = availableFields[fieldName as keyof typeof availableFields]?.type;
    return OPERATORS_BY_TYPE[fieldType as keyof typeof OPERATORS_BY_TYPE] || [];
  };

  // Check if operator requires a value
  const operatorRequiresValue = (operator: string) => {
    return !['exists', 'notExists'].includes(operator);
  };

  // Render value input based on field type and operator
  const renderValueInput = (condition: RuleCondition, index: number) => {
    const fieldDef = availableFields[condition.field as keyof typeof availableFields];
    const requiresValue = operatorRequiresValue(condition.operator);
    
    if (!requiresValue) {
      return <span className="text-sm text-muted-foreground italic">No value needed</span>;
    }

    if (!fieldDef) {
      return <Input 
        value={condition.value || ''} 
        onChange={(e) => updateCondition(index, { value: e.target.value })}
        placeholder="Enter value..."
        data-testid={`input-condition-value-${index}`}
      />;
    }

    switch (fieldDef.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={condition.value === true}
              onCheckedChange={(checked) => updateCondition(index, { value: checked })}
              data-testid={`switch-condition-value-${index}`}
            />
            <span className="text-sm">{condition.value ? 'True' : 'False'}</span>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || e.target.value })}
            placeholder="Enter number..."
            data-testid={`input-condition-value-${index}`}
          />
        );

      case 'reference':
        const refOptions = referenceOptions[condition.field] || [];
        const refFieldDef: any = fieldDef;
        const labelField = refFieldDef.labelField || 'name';
        const valueField = refFieldDef.valueField || 'name';

        if (condition.operator === 'in' || condition.operator === 'notIn') {
          // Multiple selection for in/notIn operators
          const selectedValues = Array.isArray(condition.value) ? condition.value : [];
          return (
            <div className="space-y-2">
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map((val: string, valIndex: number) => (
                    <Badge key={valIndex} variant="secondary" className="text-xs">
                      {val}
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = selectedValues.filter((_: any, i: number) => i !== valIndex);
                          updateCondition(index, { value: newValues });
                        }}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-ref-value-${index}-${valIndex}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Select
                value=""
                onValueChange={(value) => {
                  if (!selectedValues.includes(value)) {
                    updateCondition(index, { value: [...selectedValues, value] });
                  }
                }}
              >
                <SelectTrigger data-testid={`select-condition-value-${index}`}>
                  <SelectValue placeholder="Select options..." />
                </SelectTrigger>
                <SelectContent>
                  {refOptions.map((option: any) => (
                    <SelectItem key={option.id || option[valueField]} value={option[valueField]}>
                      {option[labelField]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else {
          // Single selection for equals
          return (
            <Select
              value={condition.value || ''}
              onValueChange={(value) => updateCondition(index, { value })}
            >
              <SelectTrigger data-testid={`select-condition-value-${index}`}>
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {refOptions.map((option: any) => (
                  <SelectItem key={option.id || option[valueField]} value={option[valueField]}>
                    {option[labelField]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

      case 'enum':
        if (condition.operator === 'in' || condition.operator === 'notIn') {
          // Multiple selection for in/notIn operators
          const selectedValues = Array.isArray(condition.value) ? condition.value : [];
          return (
            <div className="space-y-2">
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map((val: string, valIndex: number) => (
                    <Badge key={valIndex} variant="secondary" className="text-xs">
                      {val}
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = selectedValues.filter((_: any, i: number) => i !== valIndex);
                          updateCondition(index, { value: newValues });
                        }}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-enum-value-${index}-${valIndex}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Select
                value=""
                onValueChange={(value) => {
                  if (!selectedValues.includes(value)) {
                    updateCondition(index, { value: [...selectedValues, value] });
                  }
                }}
              >
                <SelectTrigger data-testid={`select-condition-value-${index}`}>
                  <SelectValue placeholder="Select options..." />
                </SelectTrigger>
                <SelectContent>
                  {fieldDef.options?.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else {
          // Single selection for equals
          return (
            <Select
              value={condition.value || ''}
              onValueChange={(value) => updateCondition(index, { value })}
            >
              <SelectTrigger data-testid={`select-condition-value-${index}`}>
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {fieldDef.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

      default: // text
        return (
          <Input
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder="Enter value..."
            data-testid={`input-condition-value-${index}`}
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Rule Conditions</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            data-testid="button-toggle-json-preview"
          >
            {showJsonPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showJsonPreview ? 'Hide JSON' : 'Show JSON'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
            data-testid="button-add-condition"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Condition
          </Button>
        </div>
      </div>

      {conditions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">No conditions defined</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCondition}
                data-testid="button-add-first-condition"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Your First Condition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={index}>
            <div className="bg-card border rounded-md p-3">
              <div className="grid grid-cols-1 md:grid-cols-[2fr,1.5fr,2fr,auto] gap-3 items-end">
                {/* Field Selection */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Field</Label>
                  <Select
                    value={condition.field}
                    onValueChange={(value) => updateCondition(index, { field: value })}
                  >
                    <SelectTrigger data-testid={`select-condition-field-${index}`} className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableFields).map(([key, field]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{field.label}</span>
                            <span className="text-xs text-muted-foreground">{field.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Operator</Label>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) => updateCondition(index, { operator: value })}
                  >
                    <SelectTrigger data-testid={`select-condition-operator-${index}`} className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableOperators(condition.field).map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Input */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Value</Label>
                  {renderValueInput(condition, index)}
                </div>

                {/* Actions */}
                <div className="flex items-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length === 1}
                    data-testid={`button-remove-condition-${index}`}
                    className="h-9 w-9"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {index < conditions.length - 1 && (
              <div className="flex items-center justify-center py-2">
                <Badge variant="outline" className="text-xs font-medium">AND</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {showJsonPreview && conditions.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">JSON Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(conditions, null, 2)}
              readOnly
              className="font-mono text-xs"
              rows={Math.min(conditions.length * 4 + 2, 12)}
              data-testid="textarea-json-preview"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This JSON will be stored in the database and used for rule evaluation.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}