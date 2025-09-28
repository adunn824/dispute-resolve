import { RuleCondition, RuleConditions, RULE_FIELDS } from "@shared/schema";

// Case data interface for rule evaluation
export interface CaseData {
  // Case basic fields
  details: string;
  loanId?: string | null;
  lenderName?: string | null;
  state: string;
  status: 'open' | 'in_progress' | 'resolved';
  hasRepresentative: boolean;
  representativeCompanyName?: string | null;
  representativePersonName?: string | null;
  representativeAddress?: string | null;
  representativeEmail?: string | null;
  representativePhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Customer fields (via join)
  customerName: string;
  customerState: string;
  
  // Category/Type fields (via join)
  categoryCode: string;
  categoryName: string;
  caseTypeName: string;
  
  // Resolution fields (if resolved)
  settlementAmount?: number | null;
  forgivenAmount?: number | null;
}

/**
 * Rule evaluation engine that processes rule conditions against case data
 */
export class RuleEvaluator {
  
  /**
   * Evaluates a set of rule conditions against case data
   */
  static evaluate(conditions: RuleConditions, caseData: CaseData): boolean {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return true; // Empty conditions always match (default rule)
    }

    const results = conditions.conditions.map(condition => 
      this.evaluateCondition(condition, caseData)
    );

    // Apply logic operator
    if (conditions.logic === 'OR') {
      return results.some(result => result);
    } else {
      return results.every(result => result);
    }
  }

  /**
   * Evaluates a single condition against case data
   */
  private static evaluateCondition(condition: RuleCondition, caseData: CaseData): boolean {
    const fieldValue = this.getFieldValue(condition.field, caseData);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return this.compareEquals(fieldValue, conditionValue);

      case 'contains':
        return this.compareContains(fieldValue, conditionValue, condition.caseSensitive);

      case 'startsWith':
        return this.compareStartsWith(fieldValue, conditionValue, condition.caseSensitive);

      case 'endsWith':
        return this.compareEndsWith(fieldValue, conditionValue, condition.caseSensitive);

      case 'greaterThan':
        return this.compareGreaterThan(fieldValue, conditionValue);

      case 'lessThan':
        return this.compareLessThan(fieldValue, conditionValue);

      case 'in':
        return this.compareIn(fieldValue, conditionValue);

      case 'notIn':
        return !this.compareIn(fieldValue, conditionValue);

      case 'exists':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

      case 'notExists':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';

      case 'regex':
        return this.compareRegex(fieldValue, conditionValue, condition.caseSensitive);

      case 'ageInDays':
        return this.compareAgeInDays(condition.field, caseData, conditionValue);

      default:
        console.warn(`Unknown rule operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Gets the value of a field from case data
   */
  private static getFieldValue(field: string, caseData: CaseData): any {
    // Handle calculated fields
    if (field === 'ageInDays') {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - caseData.createdAt.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Handle standard fields using dot notation for nested access
    const keys = field.split('.');
    let value: any = caseData;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  // Comparison operators
  private static compareEquals(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) return false;
    return fieldValue === conditionValue;
  }

  private static compareContains(fieldValue: any, conditionValue: any, caseSensitive = false): boolean {
    if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
    const field = caseSensitive ? fieldValue : fieldValue.toLowerCase();
    const condition = caseSensitive ? conditionValue : conditionValue.toLowerCase();
    return field.includes(condition);
  }

  private static compareStartsWith(fieldValue: any, conditionValue: any, caseSensitive = false): boolean {
    if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
    const field = caseSensitive ? fieldValue : fieldValue.toLowerCase();
    const condition = caseSensitive ? conditionValue : conditionValue.toLowerCase();
    return field.startsWith(condition);
  }

  private static compareEndsWith(fieldValue: any, conditionValue: any, caseSensitive = false): boolean {
    if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
    const field = caseSensitive ? fieldValue : fieldValue.toLowerCase();
    const condition = caseSensitive ? conditionValue : conditionValue.toLowerCase();
    return field.endsWith(condition);
  }

  private static compareGreaterThan(fieldValue: any, conditionValue: any): boolean {
    const numField = Number(fieldValue);
    const numCondition = Number(conditionValue);
    if (isNaN(numField) || isNaN(numCondition)) return false;
    return numField > numCondition;
  }

  private static compareLessThan(fieldValue: any, conditionValue: any): boolean {
    const numField = Number(fieldValue);
    const numCondition = Number(conditionValue);
    if (isNaN(numField) || isNaN(numCondition)) return false;
    return numField < numCondition;
  }

  private static compareIn(fieldValue: any, conditionValue: any): boolean {
    if (!Array.isArray(conditionValue)) return false;
    return conditionValue.includes(fieldValue);
  }

  private static compareRegex(fieldValue: any, conditionValue: any, caseSensitive = false): boolean {
    if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(conditionValue, flags);
      return regex.test(fieldValue);
    } catch (error) {
      console.warn('Invalid regex pattern:', conditionValue, error);
      return false;
    }
  }

  private static compareAgeInDays(field: string, caseData: CaseData, conditionValue: any): boolean {
    // This is handled by getFieldValue and then processed by comparison operators
    return false; // This should not be called directly
  }

  /**
   * Validates rule conditions for syntax and field availability
   */
  static validateConditions(conditions: RuleConditions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!conditions.conditions) {
      errors.push('Conditions array is required');
      return { valid: false, errors };
    }

    if (!['AND', 'OR'].includes(conditions.logic)) {
      errors.push('Logic must be either AND or OR');
    }

    for (let i = 0; i < conditions.conditions.length; i++) {
      const condition = conditions.conditions[i];
      
      // Validate field exists
      if (!condition.field) {
        errors.push(`Condition ${i + 1}: Field is required`);
        continue;
      }

      // Check if field is in available fields (except calculated fields)
      if (condition.field !== 'ageInDays' && !RULE_FIELDS[condition.field as keyof typeof RULE_FIELDS]) {
        errors.push(`Condition ${i + 1}: Unknown field '${condition.field}'`);
      }

      // Validate operator
      const validOperators = ['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'notIn', 'exists', 'notExists', 'regex', 'ageInDays'];
      if (!validOperators.includes(condition.operator)) {
        errors.push(`Condition ${i + 1}: Invalid operator '${condition.operator}'`);
      }

      // Validate value for operators that require it
      const valueRequiredOperators = ['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'notIn', 'regex'];
      if (valueRequiredOperators.includes(condition.operator) && condition.value === undefined) {
        errors.push(`Condition ${i + 1}: Value is required for operator '${condition.operator}'`);
      }

      // Validate array values for 'in' and 'notIn'
      if (['in', 'notIn'].includes(condition.operator) && !Array.isArray(condition.value)) {
        errors.push(`Condition ${i + 1}: Value must be an array for operator '${condition.operator}'`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Creates a default rule condition for testing
   */
  static createDefaultConditions(): RuleConditions {
    return {
      logic: 'AND',
      conditions: []
    };
  }
}

/**
 * Finds the highest priority rule that matches the case data
 */
export function findMatchingPriorityRule(rules: Array<{ id: string, priority: string, conditions: any }>, caseData: CaseData): string | null {
  const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
  
  let matchingRules = rules
    .filter(rule => {
      try {
        return RuleEvaluator.evaluate(rule.conditions as RuleConditions, caseData);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
        return false;
      }
    })
    .sort((a, b) => (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0));

  return matchingRules.length > 0 ? matchingRules[0].id : null;
}

/**
 * Finds all tag rules that match the case data
 */
export function findMatchingTagRules(rules: Array<{ id: string, tag: string, tags: string[], conditions: any }>, caseData: CaseData): string[] {
  const matchingTags: string[] = [];
  
  for (const rule of rules) {
    try {
      if (RuleEvaluator.evaluate(rule.conditions as RuleConditions, caseData)) {
        // Add individual tag
        if (rule.tag) {
          matchingTags.push(rule.tag);
        }
        // Add array of tags
        if (rule.tags && Array.isArray(rule.tags)) {
          matchingTags.push(...rule.tags);
        }
      }
    } catch (error) {
      console.error(`Error evaluating tag rule ${rule.id}:`, error);
    }
  }

  // Return unique tags
  return Array.from(new Set(matchingTags));
}