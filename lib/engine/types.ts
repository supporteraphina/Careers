// Form definition schema for funnel JSON files in content/roles/.
// The runner (runner.ts) is pure and safety-critical: a wrong jump can
// silently disqualify a good applicant. Change types and runner together,
// and keep runner.test.ts exhaustive.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'single_choice'
  | 'multi_choice'
  | 'linear_scale'
  | 'legal_gate';

export interface Field {
  /** Answer key. Unique across the whole form; used for piping tokens. */
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Choices for single_choice / multi_choice / legal_gate. */
  options?: string[];
  /** Bounds for linear_scale and number. */
  min?: number;
  max?: number;
}

export type ConditionOp =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'includes'
  | 'not_includes';

export interface Condition {
  fieldId: string;
  op: ConditionOp;
  value: string | number;
}

export interface LogicRule {
  if: Condition;
  goTo: string;
}

export type PageKind = 'intro' | 'question' | 'interstitial' | 'ending';

export interface FormPage {
  id: string;
  kind: PageKind;
  /** Supports piping tokens like {first_name}. */
  title: string;
  /** Supports piping tokens. */
  description?: string;
  /** Question fields. Empty for intro / interstitial / ending pages. */
  fields?: Field[];
  /** Evaluated in order on page submit; first match wins over `next`. */
  logic?: LogicRule[];
  /** Default next page id. Falls back to array order when absent. */
  next?: string;
  /** Continue-button label override (e.g. "Apply Now", "I Agree"). */
  cta?: string;
  /**
   * Internal flag on ending pages only. 'dq' endings must read
   * indistinguishable from 'standard' ones on screen.
   */
  endingTone?: 'standard' | 'dq';
}

export interface FormDefinition {
  /** URL slug under /apply/. */
  slug: string;
  /** Display role name. */
  role: string;
  version: number;
  pages: FormPage[];
}

export type AnswerValue = string | number | string[];
export type Answers = Record<string, AnswerValue>;
