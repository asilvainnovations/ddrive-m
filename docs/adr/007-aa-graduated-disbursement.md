# ADR-007: Graduated disbursement for anticipatory action (IRR of RA 12287)

- Status: Accepted for controlled testing; legal and finance sign-off pending
- Date: 2026-11-27
- Requirements: AA-02, AA-03; control C-05; acceptance test AT-016
- Supersedes: the "graduation of disbursements is not encoded yet" consequence of ADR-003

## Context

ADR-003 encoded the RA 12287 case workflow but left the disbursement graduation to the implementing rules, which were not yet available. The Implementing Rules and Regulations of RA 12287 were signed on 14 September 2026 by the NDRRMC Chairperson. The certified true copy (OCD Records Section) is in the DDRiVE-M project files as `IRR_12287_2026.pdf`. It takes effect on publication (Rule VIII s. 5); the publication date is not in the document.

What the IRR says (scanned copy, read by OCR and checked against the page images):

| Provision | Text (abridged) |
| --- | --- |
| Rule V s. 1(b) | LGUs may include "no more than 10% of the 70% of the annual Local Disaster Risk Reduction and Management Fund (LDRRMF) for anticipatory action measures", and may also use other sources: unexpended LDRRMF accrued to the Special Trust Fund, partners and donors, ODA, other LGUs |
| Rule V s. 1(c) | NGAs and LGUs may request NDRRM Fund augmentation, subject to the approval of the President |
| Rule V s. 2 | Funds allocated for anticipatory action are disbursed immediately, until the lifting. "Except for funding sources other than those allocated for anticipatory action in the regular agency budgets, local and national DRRM Funds", disbursement is based on the damage forecast in the pre-disaster risk assessment. For hydrometeorological and geological hazards, "disbursements for interventions to be undertaken beyond a lead time of three (3) days shall not exceed 30% of the allocation for anticipatory action, while up to 70% thereof shall be allowable to be disbursed for interventions to be implemented within a maximum lead time of three (3) days." Slow-onset hazards such as drought: timelines and rates "further detailed in the operational guidelines". The graduation "shall not apply to other funding sources ... including agency budgets, external grants or donations, or other sources authorized by law" |
| Rule V s. 3 | No-regrets principle; unused NGA funds revert, LGU funds accrue to the Special Trust Fund |

## Decision

1. **The limits are data, not code constants.** `ddrive_aa_rule_sets` holds one row per rule set (`IRR-RA12287-2026`): the 7% LDRRMF ceiling (10% × 70%), the 30% and 70% shares, the 72-hour threshold, which funds and hazards are graduated, and the citation. Users can read it, nobody can change it from the app. A future IRR amendment or the operational guidelines become a new row, activated by migration.
2. **Allocations are recorded per organisation, year and fund** (`ddrive_aa_allocations`): LDRRMF (with the annual LDRRMF, so the ceiling is checked), an agency's anticipatory action budget, and NDRRM Fund augmentation, each with its basis (investment plan and Sanggunian resolution, or the approval). Never deleted; never reduced below what has been disbursed.
3. **Graduation is by lead time, per allocation and year.** Each measure records when it will be undertaken (`implement_by`); the database computes its band against the case's expected onset: more than 72 hours before is "beyond 3 days", otherwise "within 3 days". Disbursements are summed per organisation, fund and year (the year of the declaration, Philippine time) by band, across cases.
4. **The database refuses** a disbursement from a graduated fund that has no allocation for the year, no implementation time, would take a band above its share, or would exceed the allocation. Every refusal cites the IRR. A transaction-level lock per allocation stops two officers from both passing the same limit. Once money is disbursed from a measure, its fund and implementation time are frozen.
5. **Not graduated:** grants and donations, other budget lines, other lawful sources, and unexpended LDRRMF in the Special Trust Fund (listed among the "other sources" in Rule V s. 1(b)).
6. **Slow-onset hazards (drought):** the IRR leaves the rate to operational guidelines that DDRiVE-M does not have yet. Disbursement stays within the allocation and must cite the guideline relied on (`slow_onset_basis`); no band limit is applied.

## Readings that need legal and finance confirmation

- **Base of the 30% and 70%.** Read as the year's allocation for anticipatory action for that fund, summed across declarations. If OCD or COA read it per declaration, the sums change from per year to per case.
- **"Beyond a lead time of three days".** Read as the intervention being undertaken more than 72 hours before the expected onset recorded on the case. A different reference time (forecast issue, declaration) would change the band.
- **Special Trust Fund not graduated.** Rule V s. 1(b) lists it among "other sources", and s. 2 exempts other lawful sources. Medium confidence.
- **Hazard "other" treated as graduated.** The conservative reading; the case form should use a specific hazard where one fits.
- **AA-02 asks to map "each forecast level" to a permitted release.** The IRR graduates by lead time, not by forecast level, and bases amounts on the damage the pre-disaster risk assessment forecasts without a numeric table. A level-to-amount table would be invented, so none is encoded; the operational guidelines may provide one.

## Consequences

- From version 0.7.0, an organisation must record its allocation before disbursing from the LDRRMF, an agency anticipatory action budget or the NDRRM Fund. Disbursements recorded before the upgrade are kept and counted.
- AT-016 now has automated positive and negative tests (`supabase/tests/70_phase3_aa_graduated.sql`). It is not "accepted" until legal counsel and the finance/control lead sign the readings above.
- When the operational guidelines are issued, add a rule set (drought timelines and rates; any forecast-level table) and its tests; do not edit this one.
