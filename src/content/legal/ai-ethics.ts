import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

export const aiEthics: Policy = {
  slug: 'ai-ethics',
  title: 'AI Use, Ethics and Governance Policy',
  summary: 'Human oversight, transparency, safety and accountability requirements for AI-enabled DDRiVE-M features.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'AI is decision support; authorised people and institutions retain decision-making responsibility.',
    'AI outputs must be traceable to sources, assumptions and limitations where the feature provides those capabilities.',
    'AI must not issue official warnings or make statutory declarations, evacuation orders or funding decisions.',
    'Personal and sensitive information must not be submitted to an AI feature without authorisation and an approved processing basis.',
    'Each AI-enabled feature requires documented risk assessment, testing, monitoring and a human fallback.',
  ],
  sections: [
    { id: 'status', title: '1. Scope and implementation status', blocks: [
      { p: 'This policy sets governance requirements for any AI-enabled capability that is made available in DDRiVE-M. It does not certify that every control described below is already implemented.' },
      { note: 'Feature status must be checked in the current release. A feature described in a roadmap, prototype or interface is not necessarily connected to a production AI service.' },
    ] },
    { id: 'principles', title: '2. Governing principles', blocks: [
      { ul: [
        'Human accountability: a named, authorised person remains responsible for decisions and actions.',
        'Safety and proportionality: the more consequential the use, the stronger the required review, testing and approval.',
        'Transparency: users must be told when content is AI-generated and what evidence, assumptions and limitations apply.',
        'Fairness and inclusion: assess risks of bias, exclusion and disproportionate harm to vulnerable groups.',
        'Privacy and security: use only authorised information, minimise personal data and apply approved access and retention controls.',
        'Contestability: users must be able to question, correct or disregard an AI output and use a non-AI alternative for critical workflows.',
      ] },
    ] },
    { id: 'prohibited', title: '3. Prohibited or restricted uses', blocks: [
      { ul: [
        'AI must not issue, modify or impersonate PAGASA, PHIVOLCS, NDRRMC, OCD or local government warnings and official instructions.',
        'AI must not independently declare a State of Imminent Disaster, order evacuation, certify a statutory assessment, approve public expenditure or release funds.',
        'AI must not fabricate source citations, invent missing observations or present uncertain estimates as verified facts.',
        'AI must not infer sensitive attributes or make consequential decisions about individuals without a separately approved lawful and ethical basis.',
      ] },
    ] },
    { id: 'controls', title: '4. Minimum controls before release', blocks: [
      { ul: [
        'Document the intended purpose, users, data inputs, model/provider, foreseeable misuse and prohibited uses.',
        'Complete privacy, security, safety and algorithmic impact assessments proportionate to the use case.',
        'Test accuracy, calibration, robustness, bias, prompt-injection resistance, source-grounding and failure behaviour.',
        'Provide human review, escalation, override and non-AI fallback paths.',
        'Log the model/version, prompt or workflow version, source references, output, review decision and relevant user action where lawful and proportionate.',
        'Monitor performance and incidents; suspend a feature when it creates unacceptable risk or cannot be supported safely.',
      ] },
      { p: 'These are release requirements. They must be supported by feature-specific evidence and an accountable approval record before the relevant AI capability is described as operational.' },
    ] },
    { id: 'data', title: '5. Data use and privacy', blocks: [
      { p: 'AI processing must follow the Privacy Policy, the applicable customer agreement, the Data Privacy Act and the data minimisation principle. The platform must not claim that customer data is never used for model training or shared with an AI provider unless the actual provider terms, account configuration and data flow have been verified.' },
      { p: 'Users must not submit personal or sensitive personal information to AI features unless the organisation has approved the purpose, lawful basis, data-sharing arrangements and safeguards.' },
    ] },
    { id: 'governance', title: '6. Governance and accountability', blocks: [
      { p: 'The product owner is responsible for maintaining the AI system inventory and assigning a business owner, technical owner and risk owner to each feature. The DPO must be consulted where personal information is processed. DRRM subject-matter experts and affected-user representatives should participate in validation for safety-critical workflows.' },
      { p: 'No standing AI Ethics Board, independent certification or public review process is claimed by this policy unless its membership, terms of reference, meeting records and decisions are formally documented.' },
    ] },
    { id: 'report', title: '7. Report an AI concern', blocks: [
      { p: `Report safety, privacy, bias, accuracy or misuse concerns to ${F.generalEmail}. Privacy-related concerns may also be sent to ${F.dpoEmail}. For immediate threats to life or safety, follow official emergency channels rather than relying on an AI feature.` },
    ] },
  ],
};
