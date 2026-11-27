# ADR-012: Governance self-assessment and risk mainstreaming (Integration)

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Migration: `20261127060000_phase4_6_governance_plans_exercises.sql` (first part)

## Context

Integration should "embed risk priorities in governance, plans, budgets and institutions". The sources: the Gawad KALASAG LDRRMCO Assessment Toolkit CY 2026 (OCD Memo 763 s. 2026), the NDRRMP 2020-2030 results framework, the HLURB/DHSUD supplemental guidelines on mainstreaming CC/DRR in the CLUP (CDRA), and RA 10121 s. 11-12, 21.

## Decision

1. **Reference data from the sources**: the 32 scored toolkit indicators with their means of verification and rating guides (provincial and city/municipal where the toolkit differs), section weights (Structure 0.25, Competency 0.35, Management systems 0.15, Enabling policies 0.05, Knowledge management 0.10, Partnership 0.10), and the 50 NDRRMP outputs under 23 outcomes.
2. **Self-assessment** (`G-###`, one per organisation and year): each indicator scored 0-3 with evidence and a gap note; the six minimum requirements answered; the weighted mean and band (Gold ≥ 2.5, Silver ≥ 2.0, Bronze ≥ 1.5, Partially compliant ≥ 0.5) computed as the toolkit does, only when all 32 are rated. A DRRM officer finalises it. The app points to evidence DDRiVE-M already holds (for example 3.1 → evaluated exercises).
3. **Mainstreaming register** (`M-###`): a priority risk, the instrument it enters (LDRRMP, contingency plan, CLUP, zoning ordinance, CDP, PDPFP, LDIP, AIP, LCCAP, ordinance, executive order, PSCP, other), the decision area, technical findings, implications and policy intervention (the CDRA chain), status `proposed → included → adopted`. Adoption needs a DRRM officer and the resolution or ordinance number; adopted entries cannot change.
4. **Budget lines** can name their NDRRMP output (ADR-009).

## Consequences

- The self-assessment is a preparation aid. The official Gawad KALASAG assessment is done by the validation teams; DDRiVE-M does not award a recognition.
- Coverage view `ddrive_risk_integration` shows which priority risks are not yet in an adopted instrument or not funded.
- Tests: `supabase/tests/98_phase4_6_governance_plans_exercises.sql` (79 checks, including a weighted mean of 2.40 → Silver).
