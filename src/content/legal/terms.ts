import type { Policy } from './types';
import { LEGAL_FACTS as F } from './facts';

export const terms: Policy = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: 'Conditions for using DDRiVE-M, including organisational responsibilities, official information, AI-assisted work and safety-critical decisions.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'DDRiVE-M is a decision-support and information-management platform, not an official warning or emergency command authority.',
    'Always verify warnings and instructions with PAGASA, PHIVOLCS, NDRRMC, OCD and the responsible local DRRM office.',
    'Your organisation remains responsible for the accuracy, lawful use and authorised disclosure of records it enters.',
    'AI-generated content and analytical outputs require qualified human review before operational or legal use.',
    'Decisions on evacuation, statutory declarations, public expenditure and release of funds remain with legally authorised persons and bodies.',
  ],
  sections: [
    { id: 'agreement', title: '1. Agreement and scope', blocks: [
      { p: `These terms govern access to DDRiVE-M, published by ${F.publisher}. By accessing the service, you agree to these terms and the Privacy Policy. If you use the service on behalf of an organisation, you confirm that you are authorised to do so.` },
      { p: 'A separate subscription, pilot, data-processing, procurement or government service agreement may add to or supersede these terms where it expressly says so.' },
    ] },
    { id: 'purpose', title: '2. Intended use and limitations', blocks: [
      { p: 'DDRiVE-M supports risk intelligence, governance, operational decisions and resilience outcomes. It may organise information and support planning, assessment, coordination, monitoring and learning.' },
      { p: 'The service does not replace official warning channels, statutory decision-making, professional judgment, incident command, field verification or the procedures of the responsible government authority.' },
      { p: 'Information may be delayed, incomplete, unavailable or incorrect. Users must check source, timestamp, geographic applicability, validity and uncertainty before relying on information for operational decisions.' },
    ] },
    { id: 'official', title: '3. Official warnings and emergency decisions', blocks: [
      { p: 'DDRiVE-M does not issue or amend official warnings, storm signals, volcanic bulletins, tsunami advisories, evacuation orders or declarations. Where official information is displayed, users should verify it with the issuing agency and follow the agency’s instructions.' },
      { p: 'Evacuation, declaration of a State of Imminent Disaster, use of public funds and other statutory decisions must be made by the authority designated by law and the applicable implementing rules. DDRiVE-M may support documentation and workflow but does not confer legal authority.' },
      { p: 'In an emergency, follow official instructions and contact the appropriate emergency service or local DRRM office.' },
    ] },
    { id: 'accounts', title: '4. Accounts and organisation access', blocks: [
      { ul: [
        'Provide accurate account information and keep it current.',
        'Protect your credentials and promptly report suspected compromise.',
        'Use only the organisation and role assigned to you.',
        'Organisation administrators must manage membership and access in accordance with their organisation’s policies and applicable law.',
      ] },
    ] },
    { id: 'records', title: '5. Organisation records and privacy', blocks: [
      { p: 'The organisation using DDRiVE-M is responsible for determining the purpose and lawful basis for personal information it enters, ensuring the information is accurate and necessary, providing required notices, controlling access and establishing retention and disclosure rules.' },
      { p: `The parties’ respective controller and processor roles, permitted processing, security duties, assistance, breach notification, return and deletion arrangements must be set out in the applicable agreement and privacy documentation. Contact ${F.dpoEmail} for privacy-related enquiries.` },
    ] },
    { id: 'acceptable', title: '6. Acceptable use and integrity of information', blocks: [
      { p: 'You must not use the service unlawfully, compromise its security, access another organisation’s information without authority, impersonate an official source, or knowingly enter or alter information in a way that misleads users or creates a safety risk.' },
      { p: 'Information used for statutory assessments, declarations, funding or public reporting must be traceable to its source, date, method, responsible person and validation status. Applicable laws, including RA 12287 and its implementing rules, govern prohibited conduct and penalties; users should consult the law itself rather than rely on a summary in these terms.' },
    ] },
    { id: 'ai', title: '7. AI and analytical outputs', blocks: [
      { p: 'AI-generated answers, summaries, classifications, recommendations, forecasts and draft plans may contain errors, omissions or bias. They are decision-support outputs, not official determinations or professional certification.' },
      { p: 'A qualified and authorised person must review source evidence, assumptions, uncertainty, applicability and consequences before an output is used in a plan, public communication, operational instruction, declaration or funding decision.' },
      { p: 'Do not submit information to an AI-enabled feature unless you are authorised to do so and the applicable privacy, security and data-sharing requirements have been met.' },
    ] },
    { id: 'availability', title: '8. Availability and changes', blocks: [
      { p: 'The service may be unavailable or degraded due to maintenance, connectivity, provider outages, security events or other circumstances. Users must maintain appropriate operational alternatives and must not rely on DDRiVE-M as the sole emergency communications channel.' },
    ] },
    { id: 'ip', title: '9. Intellectual property and third-party information', blocks: [
      { p: `The software and platform materials are provided by ${F.publisher} or their respective rights holders. Official hazard information, maps, imagery and third-party materials remain subject to the rights and terms of their respective providers.` },
      { p: 'Users must comply with applicable licences, attribution requirements and organisational data-sharing rules.' },
    ] },
    { id: 'liability', title: '10. Disclaimers and liability', blocks: [
      { p: 'To the extent permitted by law, the service is provided on an “as available” basis. Nothing in these terms excludes a right or liability that cannot lawfully be excluded or limited under Philippine law.' },
      { p: 'Any limitation of liability, indemnity, service level, warranty or remedy applicable to a government or institutional deployment should be stated in the signed agreement and reviewed for consistency with procurement and public-sector requirements.' },
    ] },
    { id: 'law', title: '11. Governing law and contact', blocks: [
      { p: `These terms are governed by the laws of the Republic of the Philippines. Questions may be sent to ${F.legalEmail} or ${F.generalEmail}.` },
    ] },
  ],
};
