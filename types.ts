
export interface SpellingRule {
  id: string;
  code: string;
  description: string;
  user_id?: string;
}

export interface Word {
  id: string;
  text: string;
  ruleIds: string[];
  test_round_id: string;
  user_id?: string;
}

export interface Student {
  id: string;
  name: string;
  test_round_id: string;
  user_id?: string;
}

export interface TestRound {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

export interface AssessmentRecord {
  studentId: string;
  wordId: string;
  testRoundId: string;
  ruleResults: Record<string, boolean>;
  isAttempted: boolean;
  user_id?: string;
}

export type ViewType = 'setup' | 'scoring' | 'report';
