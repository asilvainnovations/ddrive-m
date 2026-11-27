// DRRM plan templates. Each section says what to write and the document it comes from. Sources are in the DDRiVE-M
// project files: NDRRMC Memo 147 s. 2017 (LDRRMP review checklist, which sets the LDRRMP outline), NDRRMC Disaster
// Preparedness Minimum Standards Vol. 2, NDRRMC Memo 131 s. 2018 (EOC), RDRRMOC SOPG 2022, OCD-NEDA Disaster
// Rehabilitation and Recovery Planning Guide, the Gawad KALASAG CY 2026 toolkit, RA 10121 and RA 10821. The PSCP
// structure is the repository's own PSCP Digital Template (public/PSCP-Digital-Template.html).
// A template is a structure to fill, not a finished plan: the organisation writes the content, and the council adopts it.

export type PlanTemplateKey = 'ldrrmp' | 'contingency_plan' | 'eoc_manual' | 'recovery_program' | 'pscp' | 'lccap' | 'communication_plan';

export interface TableField { columns: { key: string; label: string; width?: 'sm' | 'md' | 'lg' }[] }
export interface PlanSection {
  id: string;
  title: string;
  guidance: string;
  source: string;
  /** A table to fill, row by row; otherwise free text. */
  table?: TableField;
  /** Counted when checking whether the plan is complete. */
  required?: boolean;
}
export interface PlanTemplate {
  key: PlanTemplateKey;
  name: string;
  type: string;
  standard: string;
  purpose: string;
  perHazard?: boolean;
  period?: boolean;
  sections: PlanSection[];
  /** What the council must do before the plan is in force. */
  adoption: string;
}

const AREAS = 'Prevention and mitigation; Preparedness; Response; Rehabilitation and recovery';

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: 'ldrrmp', name: 'Local DRRM Plan (LDRRMP)', type: 'DRRM', standard: 'RA 10121; NDRRMC Memo 147 s. 2017', period: true,
    purpose: 'The comprehensive local plan for the four thematic areas, aligned with the NDRRMP 2020-2030 and the higher DRRM plan, for a six-year period.',
    adoption: 'Approved by the LDRRMC and adopted by the Sanggunian (RA 10121 s. 11(b)(1); Minimum Standards Vol. 2), then reviewed by the LDRRMP Review Team for a Certificate of Review (Memo 147).',
    sections: [
      { id: 'lce_message', title: 'Message from the Local Chief Executive', source: 'Memo 147 checklist, Preliminary pages C', guidance: 'The LCE, as LDRRMC chair, endorses the plan.' },
      { id: 'policies', title: 'Existing DRRM-CCA policies, guidelines and resolutions', source: 'Memo 147 checklist, Preliminary pages D', guidance: 'List the ordinances, executive orders and resolutions in force, with a short description of each.', table: { columns: [{ key: 'instrument', label: 'Instrument and number' }, { key: 'description', label: 'What it does', width: 'lg' }] } },
      { id: 'executive_summary', title: 'Executive summary', source: 'Memo 147 checklist, Preliminary pages I', guidance: 'The plan in one page: the main risks, the goals per thematic area, the budget, and how progress is tracked.', required: true },
      { id: 'ecological_profile', title: 'A. Ecological profile', source: 'Memo 147 checklist A', guidance: 'Only a summary of: 1 population and social services, 2 local economy, 3 infrastructure and physical base, 4 environmental management and natural resources. Refer to the CLUP and CDP for the full data.', required: true },
      { id: 'institutional', title: 'B. Institutional set-up (LDRRMC and LDRRMO structure)', source: 'Memo 147 checklist B; RA 10121 ss. 11-12', guidance: 'Council membership (16 mandatory members, 4 accredited CSOs, 1 private sector), committees, and the LDRRMO with its three functions: administration and training; research and planning; operations and warning.', required: true },
      { id: 'risk_profile', title: 'C. Risk profile (with risk maps)', source: 'Memo 147 checklist C and review form 1', guidance: 'From the risk assessment: 1 all hazards, 2 vulnerability, 3 capacity, 4 exposure. Include hazard susceptibility, vulnerability and risk maps (city/municipality 1:10,000; barangay at a larger scale) and the worst-case scenario. DDRiVE assessments in Diagnosis can be summarised here.', required: true,
        table: { columns: [{ key: 'hazard', label: 'Hazard' }, { key: 'exposed', label: 'Exposed elements (population, facilities)', width: 'lg' }, { key: 'vulnerability', label: 'Vulnerability' }, { key: 'capacity', label: 'Capacity' }, { key: 'risk', label: 'Risk level' }] } },
      { id: 'swoc', title: 'D. Situational analysis: SWOC per thematic area', source: 'Memo 147 checklist D and review form 4', guidance: 'Strengths, weaknesses, opportunities and challenges for each thematic area, including cross-cutting concerns: health, human-induced disasters, gender mainstreaming, environmental protection, cultural sensitivity or indigenous practices, and the rights-based approach.', required: true,
        table: { columns: [{ key: 'area', label: 'Thematic area' }, { key: 'strengths', label: 'Strengths' }, { key: 'weaknesses', label: 'Weaknesses' }, { key: 'opportunities', label: 'Opportunities' }, { key: 'challenges', label: 'Challenges' }] } },
      { id: 'thematic_plans', title: 'E. Thematic area plans', source: 'Memo 147 checklist E; NDRRMP 2020-2030', guidance: `One block per thematic area (${AREAS}): goals, objectives, outcome, programs/projects/activities, targets including gender concerns, key output, responsible office, timeframe and source of funds. Name the NDRRMP output each PPA serves, so the review can check alignment with the higher plan.`, required: true,
        table: { columns: [{ key: 'area', label: 'Thematic area' }, { key: 'objective', label: 'Objective / outcome' }, { key: 'ppa', label: 'PPA', width: 'lg' }, { key: 'target', label: 'Target (incl. gender)' }, { key: 'output', label: 'Key output' }, { key: 'ndrrmp', label: 'NDRRMP output', width: 'sm' }, { key: 'office', label: 'Responsible' }, { key: 'timeframe', label: 'Timeframe' }, { key: 'funds', label: 'Source of funds' }] } },
      { id: 'inclusion', title: 'Inclusive DRRM and protection of children', source: 'Memo 147 review form 2; RA 10821 ss. 4-5', guidance: 'How the plan meets the different needs of women, men, children, youth, persons with disabilities and older persons; their direct involvement; evacuation centres set up for their needs. Integrate the Comprehensive Emergency Program for Children (RA 10821 s. 4): safe evacuation centres, child-friendly spaces, transitional shelters for orphaned, separated and unaccompanied children, and schools used as evacuation centres only as a last resort (s. 5).', required: true },
      { id: 'mainstreaming', title: 'Mainstreaming in the CLUP, CDP and investment programs', source: 'Memo 147 review form 3; RA 10121 s. 11(b)(2)', guidance: 'Where the plan\'s PPAs appear in the CLUP, zoning ordinance, CDP/PDPFP, LDIP and AIP. The Integration module keeps this register.' },
      { id: 'monitoring', title: 'F. Monitoring and evaluation', source: 'Memo 147 checklist F', guidance: 'For each expected result: baseline, assumptions or risks, objectively verifiable indicators, targets, data sources, collection methods, frequency and audience of the report, office primarily responsible, and resources needed.', required: true,
        table: { columns: [{ key: 'result', label: 'Expected result', width: 'lg' }, { key: 'baseline', label: 'Baseline' }, { key: 'indicator', label: 'Indicator' }, { key: 'target', label: 'Target' }, { key: 'source', label: 'Data source / method' }, { key: 'frequency', label: 'Frequency, audience' }, { key: 'opr', label: 'OPR' }, { key: 'assumptions', label: 'Assumptions / risks' }] } },
      { id: 'ldrrmf', title: 'Allocation and use of the LDRRMF and other sources', source: 'Memo 147 review form 7; RA 10121 s. 21', guidance: 'LDRRMF of not less than 5% of estimated revenue from regular sources: 70% for mitigation and preparedness, 30% Quick Response Fund. Other sources (20% Development Fund, GAD, Special Education Fund, national and international funding, donations) in the AIP. Budget lines are kept in Integration.' },
      { id: 'annexes', title: 'G. Annexes', source: 'Memo 147 checklist G', guidance: 'Protocols, systems and guidelines (for example ICS); DRRM-CCA trainings conducted; standard manual of operations; contingency plans; directory.' },
      { id: 'references', title: 'H. References', source: 'Memo 147 checklist H', guidance: 'The documents and literature used, properly cited.' },
    ],
  },
  {
    key: 'contingency_plan', name: 'Contingency Plan (per hazard)', type: 'Contingency', standard: 'NDRRMC-NSC JMC 1 s. 2016; Minimum Standards Vol. 2', perHazard: true,
    purpose: 'A scenario-based plan for a specific, projected hazard: who does what, with which resources, when it strikes (NDRRMC Memo 131 s. 2018, 7.1).',
    adoption: 'Approved by the LDRRMC and adopted by the Sanggunian, for at least the top two hazards, updated within the last three years and tested by a simulation exercise with an after-action report (Gawad KALASAG toolkit 2.4.D and 3.1). Check the structure against the NDRRMC Contingency Planning Guidebook adopted by JMC 1 s. 2016.',
    sections: [
      { id: 'hazard_scenario', title: 'Hazard and scenario', source: 'Memo 131 7.1', guidance: 'The hazard, its trigger and the planning scenario (for example worst credible case), with its expected effects on people, property, environment and services.', required: true },
      { id: 'affected', title: 'Affected population', source: 'Minimum Standards Vol. 2, 3 (Plans)', guidance: 'Number of families in high-risk areas and to be evacuated, with older persons, children and persons with disabilities, disaggregated by sex and age.', required: true,
        table: { columns: [{ key: 'area', label: 'Barangay / area' }, { key: 'families', label: 'Families', width: 'sm' }, { key: 'persons', label: 'Persons', width: 'sm' }, { key: 'children', label: 'Children', width: 'sm' }, { key: 'older', label: 'Older persons', width: 'sm' }, { key: 'pwd', label: 'PWD', width: 'sm' }] } },
      { id: 'objectives', title: 'Goal and objectives', source: 'Memo 131 7.1', guidance: 'What the response must achieve under this scenario.', required: true },
      { id: 'activation', title: 'Activation, alert levels and deactivation', source: 'Memo 131 9.2.1, 9.2.7; RDRRMOC SOPG 2022', guidance: 'Triggers that activate the EOC or raise the alert (impending hazard, planned event, ongoing emergency, request for augmentation, direction of the Responsible Official); the alert levels used (WHITE / BLUE / RED; or Standby, Alpha, Bravo, Charlie after the PDRA); and when the EOC is deactivated.', required: true },
      { id: 'coordination', title: 'Coordination: EOC, IMT and Response Clusters', source: 'Memo 131 9.2.5, 9.3', guidance: 'The EOC\'s five management functions (management, operations, planning, logistics, finance/administration) and duty composition; the IMT on scene; all IMT resource requests go to the EOC, which coordinates with the Response Clusters; the EOC and the incident command post are not co-located.', required: true },
      { id: 'clusters', title: 'Cluster and sector plans', source: 'Memo 131 7.21', guidance: 'For each cluster or sector: lead office, members, tasks, resources needed and resources available, gaps.',
        table: { columns: [{ key: 'cluster', label: 'Cluster / sector' }, { key: 'lead', label: 'Lead office' }, { key: 'tasks', label: 'Tasks', width: 'lg' }, { key: 'needed', label: 'Resources needed' }, { key: 'available', label: 'Available' }, { key: 'gap', label: 'Gap' }] } },
      { id: 'stockpile', title: 'Relief stockpile and logistics', source: 'Minimum Standards Vol. 2, 2 and 3', guidance: 'Volume of stockpile (minimum 500 packs good for at least 3 days), location (warehouse in a low-risk area), distribution channel (tagging system), delivery system and transportation.', required: true },
      { id: 'evacuation', title: 'Evacuation', source: 'Minimum Standards Vol. 2, 2; RA 10121 s. 11(b)(3); RA 10821 s. 5', guidance: 'Warning and alarm protocol, evacuation map and routes, evacuation centres in low-risk areas, pre-emptive or forced evacuation as recommended by the LDRRMC. Children are given priority; schools and child development centres are used only when no other structure is available, gymnasiums and open spaces before classrooms.', required: true },
      { id: 'children', title: 'Children, pregnant and lactating mothers', source: 'RA 10821 ss. 4, 6', guidance: 'Child-friendly spaces in every city or municipality under a state of calamity; transitional shelters and family tracing for orphaned, separated and unaccompanied children; services for pregnant and lactating mothers.', required: true },
      { id: 'reporting', title: 'Reporting and public information', source: 'RDRRMOC SOPG 2022, reportorial requirements; Minimum Standards Vol. 2', guidance: 'Initial report within two hours (what, when, where, why, who, how, initial steps); cumulative situation reports whenever there are updates; final report three months after operations end. Designated public information officer and internal communication protocol.', required: true },
      { id: 'maintenance', title: 'Testing and updating', source: 'Gawad KALASAG toolkit 2.4.D, 3.1; RA 10121 s. 11(b)(1)', guidance: 'Who updates the plan, how often (at least every three years), and the simulation exercises that test it, with their after-action reports. DDRiVE-M records the tests in Validation.' },
    ],
  },
  {
    key: 'eoc_manual', name: 'EOC Standard Operations Manual', type: 'Operations', standard: 'NDRRMC Memo 131 s. 2018; RDRRMOC SOPG 2022',
    purpose: 'How the operations center works day to day and how it becomes an EOC in an emergency.',
    adoption: 'Approved by the LDRRMC. Funded from the LDRRMF through the LDRRMP and the approved AIP (Memo 131 9.1.6.2).',
    sections: [
      { id: 'facility', title: 'Location, facility and alternate EOC', source: 'Memo 131 9.1.2, 9.1.5, 9.1.6', guidance: 'A strategic location safe from hazards and accessible to duty personnel; computers, communications and monitoring equipment, work stations, meeting rooms, meal and rest areas, back-up power and vehicles; the back-up or alternate EOC.', required: true },
      { id: 'alert_levels', title: 'Alert levels and protocols', source: 'Memo 131 9.2.2-9.2.4; SOPG 2022', guidance: 'The EOC\'s alert codes (for example WHITE normal, BLUE preparation or escalation, RED imminent or ongoing; Standby, Alpha, Bravo, Charlie for slow-onset hazards after the PDRA), who may raise or lower them, and what changes at each level.', required: true,
        table: { columns: [{ key: 'level', label: 'Alert level' }, { key: 'when', label: 'When', width: 'lg' }, { key: 'staffing', label: 'Staffing' }, { key: 'decides', label: 'Who decides' }] } },
      { id: 'activation', title: 'Activation and deactivation triggers', source: 'Memo 131 9.2.1, 9.2.7', guidance: 'Activate on: a threat of an impending hazard; a planned event with anticipated threat; an ongoing incident; a request for support that needs multi-stakeholder coordination; direction of the Responsible Official. Deactivate when the situation has improved, tactical operations no longer need EOC support, lower-level EOCs can manage, or as directed.', required: true },
      { id: 'functions', title: 'The five management functions and duty composition', source: 'Memo 131 9.3', guidance: 'Management, operations, planning (information management, situation reporting, action planning), logistics and finance/administration: who fills each, duty schedules and tours of duty.', required: true,
        table: { columns: [{ key: 'function', label: 'Function' }, { key: 'position', label: 'Unit / position' }, { key: 'primary', label: 'Primary' }, { key: 'alternate', label: 'Alternate' }, { key: 'duties', label: 'Duties', width: 'lg' }] } },
      { id: 'ics_link', title: 'Link with the IMT and Response Clusters', source: 'Memo 131 9.2.6', guidance: 'The EOC links the Response Clusters (resource providers) and the IMT (resource employer). All IMT resource requests go to the EOC. The EOC and ICP are not co-located. All actions follow the Responsible Official\'s priorities.', required: true },
      { id: 'reporting', title: 'Reporting, advisories and file naming', source: 'SOPG 2022', guidance: 'Validation of reports before submission; initial report within two hours; cumulative situation reports; final report three months after operations; templates and file names for situation and incident reports.', required: true },
      { id: 'duty', title: 'Duty turn-over and conduct', source: 'SOPG 2022', guidance: 'Turn-over log, swapping of duty (at least two days ahead, countersigned), staying at the EOC for the whole tour, conduct and welfare of duty personnel.' },
    ],
  },
  {
    key: 'recovery_program', name: 'Rehabilitation and Recovery Program', type: 'Recovery', standard: 'OCD-NEDA Disaster Rehabilitation and Recovery Planning Guide',
    purpose: 'The program to restore and build back better after a major disaster; can be prepared before a disaster as part of the LDRRMP (Minimum Standards Vol. 2).',
    adoption: 'Prepared by the LDRRMC and approved by the Sanggunian; submitted through the RDRRMC when national funding is requested (Planning Guide, Part 2).',
    sections: [
      { id: 'background', title: 'Background and affected areas', source: 'Planning Guide, Part 2 B', guidance: 'Location, topography, climate, natural resources, economic activities before the disaster, social and demographic data.', required: true },
      { id: 'event', title: 'Description of the hazard event', source: 'Planning Guide, Part 2 B', guidance: 'The hazard and its immediate effects, from situation reports of the OCD and agencies such as PAGASA, PHIVOLCS and MGB.', required: true },
      { id: 'effects', title: 'Assessment of the effects of the disaster', source: 'Planning Guide, Part 2 B', guidance: 'Physical assessment (damage to infrastructure, changes to landscape) and socioeconomic assessment (damage and losses by sector, macroeconomic impact, displaced, casualties, missing and injured, vulnerable sectors), from the PDNA.', required: true },
      { id: 'framework', title: 'Recovery framework and objectives', source: 'Planning Guide, Part 1.2, Part 2 B (Box 4)', guidance: 'Target outcomes for the five sectors (livelihood and business; agriculture and fisheries; housing and settlement; social services; physical infrastructure) and achievable objectives within a set timeframe.', required: true },
      { id: 'strategies', title: 'Strategies by sector', source: 'Planning Guide, Box 5', guidance: 'Specific sector and sub-sector strategies for the short and medium term, with cross-cutting concerns: vulnerable groups, culture, gender, environment, poverty reduction, DRR, local governance.', required: true,
        table: { columns: [{ key: 'sector', label: 'Sector' }, { key: 'outcome', label: 'Sector outcome' }, { key: 'strategy', label: 'Strategies', width: 'lg' }] } },
      { id: 'investment', title: 'PPAs, investment requirement and funding', source: 'Planning Guide, Tables 3-5', guidance: 'Each PPA with sector, cost, source of fund and implementation period; totals by source and by sector.', required: true,
        table: { columns: [{ key: 'ppa', label: 'PPA', width: 'lg' }, { key: 'sector', label: 'Sector' }, { key: 'cost', label: 'Cost (PHP)', width: 'sm' }, { key: 'source', label: 'Source of fund' }, { key: 'period', label: 'Implementation period' }, { key: 'agency', label: 'Implementing office' }] } },
      { id: 'institutional', title: 'Institutional arrangements and implementation', source: 'Planning Guide, Parts 3-4', guidance: 'Coordination structure, roles of stakeholders, implementation strategies and partnerships.' },
      { id: 'communications', title: 'Communications strategy', source: 'Planning Guide, 4.3', guidance: 'How progress and decisions are communicated to affected communities and partners.' },
      { id: 'monitoring', title: 'Monitoring and evaluation', source: 'Planning Guide, Part 5', guidance: 'Progress monitoring of physical and financial accomplishment, and outcome evaluation.', required: true },
    ],
  },
  {
    key: 'pscp', name: 'Public Service Continuity Plan (PSCP)', type: 'Continuity', standard: 'NDRRMC Memo 33 s. 2018; DDRiVE-M PSCP template',
    purpose: 'How the organisation keeps delivering essential services to the public through any disruption (Memo 131 7.17).',
    adoption: 'Approved by the head of agency or LCE; tested and maintained.',
    sections: [
      { id: 'summary', title: 'Executive summary and document control', source: 'PSCP template 1-2', guidance: 'Purpose, scope, version, approval and distribution.', required: true },
      { id: 'profile', title: 'Agency profile', source: 'PSCP template 3', guidance: 'Mandate, services to the public, offices and locations.', required: true },
      { id: 'bia', title: 'Risk assessment and business impact analysis', source: 'PSCP template 4', guidance: 'Hazards that can disrupt services; essential functions with their maximum tolerable downtime and minimum resources.', required: true,
        table: { columns: [{ key: 'function', label: 'Essential function', width: 'lg' }, { key: 'mtd', label: 'Maximum tolerable downtime' }, { key: 'resources', label: 'Minimum resources' }, { key: 'dependencies', label: 'Dependencies' }] } },
      { id: 'strategies', title: 'Continuity strategies', source: 'PSCP template 5', guidance: 'Alternate sites, vital records, telework and other ways to keep each essential function running.', required: true },
      { id: 'teams', title: 'Continuity teams and activation', source: 'PSCP template 6; Memo 131 9.3.4', guidance: 'Teams, roles, succession, and when the plan is activated; non-emergency work suspended to support the EOC as provided in the PSCP.', required: true },
      { id: 'recovery', title: 'Recovery and resumption', source: 'PSCP template 7', guidance: 'How normal operations resume.' },
      { id: 'maintenance', title: 'Training, testing and maintenance', source: 'PSCP template 8', guidance: 'Training, exercises and review schedule.' },
    ],
  },
  {
    key: 'lccap', name: 'Local Climate Change Action Plan (LCCAP)', type: 'Climate', standard: 'RA 9729; Gawad KALASAG toolkit 2.4.C', period: true,
    purpose: 'The LGU\'s strategies to mitigate and adapt to climate change, stand-alone or integrated in the PDPFP, CLUP or CDP.',
    adoption: 'Approved by the Local Development Council, adopted by the Sanggunian, integrated in the CLUP or CDP and submitted to the Climate Change Commission (toolkit 2.4.C).',
    sections: [
      { id: 'risk_assessment', title: 'Results of the climate and disaster risk assessment', source: 'Toolkit 2.4.C; CLUP Supplemental Guidelines (CDRA)', guidance: 'Summary of the CDRA: hazards, exposure, sensitivity, adaptive capacity, and the decision areas identified.', required: true },
      { id: 'adaptation', title: 'Climate change adaptation actions', source: 'Toolkit 2.4.C', guidance: 'Actions to reduce vulnerability, with responsible office, timeframe and cost.', required: true,
        table: { columns: [{ key: 'action', label: 'Action', width: 'lg' }, { key: 'sector', label: 'Sector' }, { key: 'office', label: 'Responsible' }, { key: 'timeframe', label: 'Timeframe' }, { key: 'cost', label: 'Cost (PHP)', width: 'sm' }] } },
      { id: 'mitigation', title: 'Climate change mitigation actions', source: 'Toolkit 2.4.C', guidance: 'Actions to reduce greenhouse gas emissions.', required: true },
      { id: 'integration', title: 'Integration and expenditure tagging', source: 'Toolkit 2.4.C', guidance: 'Where the LCCAP is integrated (CLUP, CDP, PDPFP) and how its PPAs are tagged in the AIP as climate change expenditure.' },
    ],
  },
  {
    key: 'communication_plan', name: 'Communication and Advocacy Plan', type: 'Communication', standard: 'Minimum Standards Vol. 2; toolkit 5.2',
    purpose: 'How the LGU informs the public and coordinates internally before, during and after disasters.',
    adoption: 'Approved by the LDRRMC; advocacy plans disseminated to communities (Minimum Standards Vol. 2, 3).',
    sections: [
      { id: 'pio', title: 'Public information officer and spokespersons', source: 'Minimum Standards Vol. 2, 2 (Communication)', guidance: 'The designated PIO and alternate.', required: true },
      { id: 'internal', title: 'Internal communication protocols', source: 'Minimum Standards Vol. 2, 2 and 3', guidance: 'How agencies and LGUs exchange information; channels, contact lists, back-up communication.', required: true },
      { id: 'audiences', title: 'Audiences, messages and channels', source: 'Toolkit 5.2', guidance: 'Who needs what information, in which language and format, through which channel, including persons with disabilities.', required: true,
        table: { columns: [{ key: 'audience', label: 'Audience' }, { key: 'message', label: 'Key messages', width: 'lg' }, { key: 'channel', label: 'Channel' }, { key: 'timing', label: 'When' }] } },
      { id: 'iec', title: 'IEC materials and activities', source: 'Minimum Standards Vol. 2, 3', guidance: 'Materials and activities conducted regularly, with schedule.' },
    ],
  },
];

export const templateByKey = (k: string | null | undefined) => PLAN_TEMPLATES.find((t) => t.key === k) ?? null;

export type PlanContent = Record<string, string | Record<string, string>[]>;
const filled = (v: unknown) => (Array.isArray(v) ? v.some((r) => Object.values(r as Record<string, string>).some((x) => String(x ?? '').trim())) : String(v ?? '').trim().length >= 20);

/** Required sections filled, out of required sections. A text section counts from 20 characters; a table from one row. */
export function completeness(t: PlanTemplate, content: PlanContent): { done: number; total: number; missing: string[] } {
  const req = t.sections.filter((s) => s.required);
  const missing = req.filter((s) => !filled(content[s.id])).map((s) => s.title);
  return { done: req.length - missing.length, total: req.length, missing };
}
