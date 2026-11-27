// Forms and the exercise check library. Sources (DDRiVE-M project files): NDRRMC Memo 147 s. 2017 (LDRRMP review
// form and certificate), RDRRMOC SOPG 2022 (reportorial requirements), RA 10821 s. 5 (schools used as evacuation
// centres), NDRRMC Memo 131 s. 2018 (EOC), Disaster Preparedness Minimum Standards Vol. 2, RA 10121, Gawad KALASAG
// toolkit CY 2026 (3.1: SOPs tested, AAR of SIMEX).

export type FormKey = 'ldrrmp_review' | 'initial_report' | 'situation_report' | 'school_ec_notice' | 'after_action_report';
export interface FormField { id: string; label: string; kind: 'text' | 'textarea' | 'datetime' | 'number' | 'yesno'; help?: string; required?: boolean }
export interface FormTemplate {
  key: FormKey; name: string; source: string; purpose: string; who: 'responder' | 'analyst';
  fields: FormField[];
  /** Who signs it off (status final). */
  finalisedBy: string;
}

// Memo 147 "Provisional Review Form for the Monitoring and Evaluation of Local DRRM Plans" (indicators of a good DRRM plan).
export const LDRRMP_REVIEW_GROUPS: { group: string; items: string[] }[] = [
  { group: '1) Risk profile', items: ['Availability of risk assessment maps', 'Updated or enhanced maps (province 1:50,000; city/municipality 1:10,000; barangay at a larger scale)', 'Vulnerability and risk maps', 'Detailed hazard, vulnerability and capacity assessment indicating the worst scenario'] },
  { group: '2) DRRM inclusive', items: ['Different needs of men and women, children, youth, girls, PWDs and the elderly are taken into consideration', 'Direct involvement of men, women and vulnerable sectors in public awareness, drills and training', 'Evacuation centres set up for the needs of women, children, youth, girls, PWDs and the elderly'] },
  { group: '3) Mainstreaming of DRRM/CCA in the CLUP and CDP', items: ['DRRM programs and strategies mainstreamed in the local development plans, CLUP and PDPFP', 'Climate change adaptation strategies and environmental management mainstreamed in LGU programs', 'Updated zoning ordinances or safety regulations'] },
  { group: '4) Analysis of the internal and external environment', items: ['Strengths, weaknesses, opportunities and challenges identified (SWOC per thematic area)'] },
  { group: '5a) Minimum PPAs: prevention and mitigation', items: ['Early warning system (indigenous or advanced)', 'Establishment of the DRRM office', 'Risk financing schemes for facilities and equipment', 'Environmental management policies, programs and activities', 'Infrastructure resilience (building code compliance, infrastructure audit)', 'Community-based and scientific DRRM and CCA assessment, mapping, analysis and monitoring at barangay level', 'Food security measures'] },
  { group: '5b) Minimum PPAs: preparedness', items: ['Capacity building of DRRMC members', 'Insurance for volunteers', 'Component plans (IEC and advocacy, preparedness, response, contingency plan per hazard, pre-disaster recovery plan)', 'Communicating hazard map results to communities', 'Capacity building and training for public and private sectors', 'DRRM and CCA in the education system', 'Standard manual of operations and operations center', 'ICS coordination and communication systems', 'Partnership arrangements among stakeholders', 'Formation, training and accreditation of volunteers', 'Evacuation centres located in safe areas', 'Updating of DRRM-CCA plans', 'Stockpiling of food, non-food and medical supplies', 'Equipage', 'Dissemination of warnings and real-time reporting', 'Weather monitoring', 'ICS simulation', 'Emergency medical teams'] },
  { group: '5c) Minimum PPAs: response', items: ['Procurement and distribution of basic needs', 'Activation of ICS', 'Activation of assessment teams and RDANA', 'Search, rescue and retrieval', 'Evacuation system and camp management', 'Standard-based relief shelters and temporary shelters', 'Child-friendly spaces or temporary learning areas in evacuation centres', 'Temporary livelihood or income-generating projects', 'Basic health services to affected families', 'Psychosocial programs and stress debriefing', 'Activation of the Response Clusters per the National Response Plan'] },
  { group: '5d) Minimum PPAs: rehabilitation and recovery', items: ['Post-Disaster Needs Assessment (PDNA)', 'Financial assistance to affected families', 'Long-term livelihood programs and projects', 'Safe relocation sites', 'Disaster-resilient housing', 'Rehabilitation and restoration of infrastructure and facilities'] },
  { group: '6) Monitoring and evaluation', items: ['M&E plan per thematic area'] },
  { group: '7) Allocation and use of the LDRRMF and other sources', items: ['5% LDRRMF allocated (70% mitigation and preparedness; 30% quick response), with annual work and financial plan and Sanggunian resolution', 'Other sources (20% Development Fund, GAD, SEF, national and international funding, donations) included in the AIP'] },
  { group: '8) Processes involved', items: ['LDRRMC chair and members took part in formulating the plan', 'Technical and line agencies provided inputs (OCD, PAGASA, DENR-MGB, PHIVOLCS, NAMRIA)', 'TWG created to enhance and finalise the plan', 'Barangay representatives validated the HVCA', 'NGOs, CSOs and POs took part', 'Hazard maps and risk assessment updated with technical agencies'] },
];

// Memo 147, 2.4.4: a Certificate of Review is issued only when all four are met.
export const LDRRMP_CERTIFICATE_CRITERIA = [
  { id: 'contents', label: 'The plan contains at least the risk profile; DRRM-CCA mainstreamed in the CLUP and CDP; the minimum PPAs per thematic area; monitoring and evaluation; and the allocation and use of the LDRRMF and other sources' },
  { id: 'approved', label: 'The LDRRMP is duly approved by the Sanggunian' },
  { id: 'aligned', label: 'The PPAs are aligned with the PPAs of the higher DRRM plan' },
  { id: 'appropriate', label: 'The PPAs are appropriate to the hazards in the locality' },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  { key: 'ldrrmp_review', name: 'LDRRMP review and Certificate of Review', source: 'NDRRMC Memo 147 s. 2017', who: 'analyst', finalisedBy: 'DRRM officer (as LDRRMP Review Team leader)',
    purpose: 'The LDRRMP Review Team checks a plan against the indicators of a good DRRM plan and the four criteria for a Certificate of Review.',
    fields: [
      { id: 'team', label: 'Review team (leader, assistant leader, members)', kind: 'textarea', required: true },
      { id: 'higher_plan', label: 'Higher DRRM plan the plan is aligned with', kind: 'text', required: true },
      { id: 'aip_consistent', label: 'The Sanggunian-approved AIP for DRRM-CCA is consistent with the plan', kind: 'yesno', required: true },
      { id: 'recommendations', label: 'Recommendations', kind: 'textarea' },
    ] },
  { key: 'initial_report', name: 'Initial incident report', source: 'RDRRMOC SOPG 2022, reportorial requirements', who: 'responder', finalisedBy: 'The reporting responder',
    purpose: 'Confirms whether an incident actually occurred. Due within two hours.',
    fields: [
      { id: 'occurred_at', label: 'When it happened', kind: 'datetime', required: true },
      { id: 'what', label: 'What happened', kind: 'textarea', required: true },
      { id: 'where', label: 'Where (barangay, municipality, coordinates)', kind: 'text', required: true },
      { id: 'why', label: 'Why / cause', kind: 'textarea' },
      { id: 'who', label: 'Who is affected or involved', kind: 'textarea', required: true },
      { id: 'how', label: 'How it happened', kind: 'textarea' },
      { id: 'initial_steps', label: 'Initial steps taken', kind: 'textarea', required: true },
      { id: 'source', label: 'Source of information (agency, LCE, SMS, media) and whether confirmed', kind: 'text', required: true },
    ] },
  { key: 'situation_report', name: 'Situation report (SitRep)', source: 'RDRRMOC SOPG 2022, reportorial requirements', who: 'responder', finalisedBy: 'The reporting responder',
    purpose: 'Cumulative report, issued whenever there are updates.',
    fields: [
      { id: 'number', label: 'SitRep number', kind: 'number', required: true },
      { id: 'as_of', label: 'As of', kind: 'datetime', required: true },
      { id: 'situation', label: 'Prevailing situation', kind: 'textarea', required: true },
      { id: 'response', label: 'Emergency response', kind: 'textarea', required: true },
      { id: 'preparedness', label: 'Preparedness measures', kind: 'textarea' },
      { id: 'families', label: 'Affected families', kind: 'number' },
      { id: 'persons', label: 'Affected persons', kind: 'number' },
      { id: 'evacuated', label: 'Persons in evacuation centres', kind: 'number' },
      { id: 'dead', label: 'Dead (validated)', kind: 'number' },
      { id: 'injured', label: 'Injured', kind: 'number' },
      { id: 'missing', label: 'Missing', kind: 'number' },
      { id: 'damage', label: 'Damage to houses, infrastructure and agriculture', kind: 'textarea' },
      { id: 'issues', label: 'Issues, concerns and recommendations', kind: 'textarea' },
    ] },
  { key: 'school_ec_notice', name: 'School used as evacuation centre: written documentation', source: 'RA 10821 s. 5', who: 'responder', finalisedBy: 'The LDRRMO',
    purpose: 'Required when a school or child development centre is expected to be used as an evacuation centre for more than 15 days; sent to DepEd and DILG.',
    fields: [
      { id: 'school', label: 'Name and location of the school', kind: 'text', required: true },
      { id: 'since', label: 'Used as an evacuation centre since', kind: 'datetime', required: true },
      { id: 'expected_days', label: 'Expected duration (days)', kind: 'number', required: true },
      { id: 'spaces_used', label: 'Spaces used (gymnasiums and open spaces first; classrooms only as a last resort)', kind: 'textarea', required: true },
      { id: 'alternatives', label: 'All alternative sites, and the proposal for final site selection', kind: 'textarea', required: true },
      { id: 'measures', label: 'Measures to prevent interference with or disruption of classes', kind: 'textarea', required: true },
      { id: 'sent_to', label: 'Sent to DepEd and DILG on', kind: 'datetime' },
    ] },
  { key: 'after_action_report', name: 'After-action report (exercise)', source: 'Gawad KALASAG toolkit 3.1 (AAR of SIMEX)', who: 'analyst', finalisedBy: 'DRRM officer',
    purpose: 'Made from an evaluated exercise in Validation: what was tested, what was observed, gaps and improvement actions.',
    fields: [{ id: 'notes', label: 'Additional notes', kind: 'textarea' }] },
];
export const formByKey = (k: string) => FORM_TEMPLATES.find((f) => f.key === k) ?? null;

// ─── Exercises ───────────────────────────────────────────────────────────────
export type ExerciseType = 'tabletop' | 'drill' | 'functional' | 'full_scale';
export const EXERCISE_TYPES: { key: ExerciseType; label: string; what: string }[] = [
  { key: 'tabletop', label: 'Tabletop exercise', what: 'Officials talk through the plan against a scenario, around a table. Tests understanding, roles and decisions.' },
  { key: 'drill', label: 'Drill', what: 'One function practised for real, for example an evacuation or a warning dissemination drill.' },
  { key: 'functional', label: 'Functional exercise', what: 'The EOC and teams work a simulated event in real time, without deploying resources on the ground.' },
  { key: 'full_scale', label: 'Full-scale simulation exercise (SIMEX)', what: 'Responders and resources are deployed on the ground against a simulated event.' },
];

export interface CheckTemplate { kind: 'capability' | 'coordination' | 'assumption' | 'objective'; statement: string; expected: string; source: string; for?: string[] }
// Capabilities and coordination the standards require; pick those the exercise tests.
export const CHECK_LIBRARY: CheckTemplate[] = [
  { kind: 'capability', statement: 'The EOC is activated when a trigger occurs', expected: 'Activation on an impending hazard, a planned event with anticipated threat, an ongoing emergency, a request for augmentation, or the Responsible Official\'s direction', source: 'NDRRMC Memo 131 s. 2018, 9.2.1' },
  { kind: 'capability', statement: 'The alert level is raised according to the protocol', expected: 'Alert raised (WHITE to BLUE or RED; or EPR protocol after the PDRA) by the authorised official, and staffing changes accordingly', source: 'RDRRMOC SOPG 2022' },
  { kind: 'capability', statement: 'The five EOC management functions are staffed', expected: 'Management, operations, planning, logistics and finance/administration each have an assigned person', source: 'NDRRMC Memo 131 s. 2018, 9.3.1-9.3.2' },
  { kind: 'capability', statement: 'Initial report within two hours', expected: 'Initial report with what, when, where, why, who, how and initial steps submitted within two hours', source: 'RDRRMOC SOPG 2022' },
  { kind: 'capability', statement: 'Situation reports are issued with the required content', expected: 'Cumulative SitRep with prevailing situation, response, preparedness measures, effects, issues and recommendations', source: 'RDRRMOC SOPG 2022' },
  { kind: 'capability', statement: 'Warnings reach the communities at risk', expected: 'Warning and alarm protocol works end to end; the PIO issues public information', source: 'Minimum Standards Vol. 2, 2' },
  { kind: 'capability', statement: 'Pre-emptive or forced evacuation is recommended and carried out', expected: 'LDRRMC recommends evacuation in time; families reach evacuation centres in low-risk areas', source: 'RA 10121 s. 11(b)(3); Minimum Standards Vol. 2' },
  { kind: 'capability', statement: 'Children are given priority in evacuation and protected', expected: 'Children evacuated first; child-friendly spaces set up; separated or unaccompanied children identified and referred', source: 'RA 10821 ss. 4, 6' },
  { kind: 'capability', statement: 'Schools are used as evacuation centres only as a last resort', expected: 'Other structures used first; in schools, gymnasiums and open spaces before classrooms; DepEd and DILG documentation if more than 15 days', source: 'RA 10821 s. 5' },
  { kind: 'capability', statement: 'Relief stockpile is available and distributed', expected: 'At least 500 packs good for 3 days, from a warehouse in a low-risk area, distributed by tagging', source: 'Minimum Standards Vol. 2, 2' },
  { kind: 'coordination', statement: 'IMT resource requests go through the EOC to the Response Clusters', expected: 'Every request from the IMT is logged at the EOC and coordinated with the clusters', source: 'NDRRMC Memo 131 s. 2018, 9.2.5.2' },
  { kind: 'coordination', statement: 'The EOC and the incident command post are not co-located', expected: 'Separate locations', source: 'NDRRMC Memo 131 s. 2018, 9.2.5.3' },
  { kind: 'coordination', statement: 'Actions follow the Responsible Official\'s priorities', expected: 'EOC, clusters and IMT act on the RO\'s stated priorities and decisions', source: 'NDRRMC Memo 131 s. 2018, 9.2.5.5' },
  { kind: 'coordination', statement: 'Internal communication protocols work between agencies and LGUs', expected: 'Agencies and barangays are reached on the designated channels, with back-up channels when the primary fails', source: 'Minimum Standards Vol. 2, 2-3' },
  { kind: 'capability', statement: 'The EOC is deactivated on the right triggers', expected: 'Deactivation when the emergency is alleviated, tactical operations no longer need support, or lower levels can manage', source: 'NDRRMC Memo 131 s. 2018, 9.2.7' },
];

/** Starting objectives and assumptions for an exercise of a given plan; the planner edits them. */
export function startingChecks(templateKey: string | null): CheckTemplate[] {
  const own: CheckTemplate[] = [
    { kind: 'objective', statement: 'Validate the roles and responsibilities in the plan', expected: 'Each office can state and perform its role in the plan', source: 'RA 10121 s. 11(b)(1): review and test the plan' },
    { kind: 'assumption', statement: 'The plan\'s scenario figures hold (affected and displaced families)', expected: 'Evacuation and relief capacity matches the projected number of displaced families', source: 'Plan: affected population' },
  ];
  const picks = templateKey === 'eoc_manual'
    ? [0, 1, 2, 3, 4, 10, 11, 12, 14]
    : templateKey === 'pscp' ? [2, 13] : [0, 1, 2, 3, 6, 7, 8, 9, 10, 11];
  return [...own, ...picks.map((i) => CHECK_LIBRARY[i])];
}

export const RESULT_LABEL = { met: 'Met', partly: 'Partly met', not_met: 'Not met', not_tested: 'Not tested' } as const;
