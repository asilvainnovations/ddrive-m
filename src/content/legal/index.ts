import { privacy } from './privacy';
import { terms } from './terms';
import { cookies } from './cookies';
import { accessibility } from './accessibility';
import { aiEthics } from './ai-ethics';
import type { Policy } from './types';

export const POLICIES: Policy[] = [privacy, terms, cookies, accessibility, aiEthics];
export const policyBySlug = (slug: string | undefined): Policy | undefined => POLICIES.find((p) => p.slug === slug);
export { LEGAL_FACTS } from './facts';
