// Structure of a policy page. Content lives in one file per policy; PolicyPage renders it.
export type Block =
  | { p: string }
  | { ul: string[] }
  | { table: { head: string[]; rows: string[][]; caption?: string } }
  | { note: string };

export interface PolicySection {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Policy {
  slug: 'privacy' | 'terms' | 'cookies' | 'accessibility' | 'ai-ethics';
  title: string;
  /** One line for the policies index. */
  summary: string;
  /** Short reading of the policy, shown at the top. */
  keyPoints: string[];
  effective: string; // ISO date
  updated: string; // ISO date
  sections: PolicySection[];
  signoff?: { name: string; role: string };
}
