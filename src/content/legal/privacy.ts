import type { Policy } from './types';
import { LEGAL_FACTS as F, fact } from './facts';

// Publication draft. This policy deliberately avoids representing untested technical
// controls, contractual allocations, retention schedules or regulatory registrations as verified.
export const privacy: Policy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'How DDRiVE-M handles account information, organisation records, disaster-related information and privacy requests.',
  effective: F.effective,
  updated: F.updated,
  keyPoints: [
    'DDRiVE-M is designed to support disaster risk reduction, climate adaptation and resilience work; information entered may include sensitive details about affected people.',
    'The organisation using the platform and ASilva Innovations may have different controller and processor responsibilities depending on the purpose and the applicable agreement.',
    'The platform owner identifies Supabase as the database and authentication provider and the hosting region as Northeast Asia; the live project configuration must be checked before publication.',
    'Do not enter personal or sensitive information unless your organisation has an appropriate lawful basis, authority and safeguards.',
    'You may raise a privacy request with the Data Protection Officer or, where the organisation determines the processing, with that organisation.',
  ],
  sections: [
    {
      id: 'who',
      title: '1. Who we are and who this policy covers',
      blocks: [
        { p: `${F.publisher} publishes and operates DDRiVE-M. This policy applies to the public website, the web application and its installable application experience.` },
        { p: 'DDRiVE-M is intended for use by organisations involved in disaster risk reduction, climate change adaptation, emergency management and resilience planning. Depending on the deployment, it may process account information and records relating to hazards, exposure, vulnerability, incidents, evacuation, response, recovery, plans and organisational operations.' },
        { p: 'The organisation that decides why and how personal information is processed may be the personal information controller for those activities. ASilva Innovations may act as a personal information processor when processing information on that organisation’s documented instructions. For account administration, service security, support and other purposes determined by ASilva Innovations, its role must be assessed separately. The parties’ actual roles must be confirmed in the applicable service agreement and privacy documentation; this policy does not by itself determine them.' },
      ],
    },
    {
      id: 'information',
      title: '2. Information that may be processed',
      blocks: [
        { p: 'Depending on the features enabled and how an organisation uses the service, information may include:' },
        { ul: [
          'Account and identity information, such as name, email address, organisation membership, assigned role and authentication-related identifiers.',
          'Operational and organisational records entered by users, including hazard observations, risk assessments, incidents, plans, actions, resources, messages and monitoring records.',
          'Information about affected or at-risk people, which may include names, location details, age, sex, disability-related information, health information, household details or other sensitive personal information.',
          'User-generated files, attachments, coordinates and other information submitted to the platform.',
          'Technical and security information generated through use of the service, such as device, browser, access and diagnostic logs, to the extent collected by the application and its service providers.',
        ] },
        { note: 'Do not enter personal information that is not necessary for the DRRM or resilience purpose. Avoid placing sensitive personal information in free-text fields unless the organisation has approved the purpose, lawful basis, access controls and retention arrangements.' },
      ],
    },
    {
      id: 'purposes',
      title: '3. Purposes and lawful basis',
      blocks: [
        { p: 'Information may be processed to provide user accounts and organisation workspaces; support risk analysis and planning; record preparedness, response, anticipatory action and recovery activities; maintain security and accountability; provide technical support; and meet applicable legal obligations.' },
        { p: 'The appropriate lawful basis must be identified for each processing purpose under Republic Act No. 10173 (Data Privacy Act of 2012) and its implementing rules. Where sensitive personal information is involved, the organisation responsible for the processing must identify and document a basis permitted under section 13, together with any applicable safeguards.' },
        { p: 'A user’s acceptance of this policy is not a substitute for the lawful basis, authority, transparency notices or consent that may be required for a particular processing activity.' },
      ],
    },
    {
      id: 'sharing',
      title: '4. Service providers and disclosures',
      blocks: [
        { p: 'The platform owner identifies Supabase as the provider used for database and authentication services. The owner-supplied hosting region is Northeast Asia. This region must be verified against the live Supabase project configuration, and the applicable provider terms, subprocessors, backup locations and support-access arrangements must be reviewed before this policy is treated as final.' },
        { p: 'Other third-party services may be used for functions such as maps, fonts, identity sign-in, video or public hazard information. The services actually loaded by the deployed version, their purposes and the information they receive must be maintained in a current third-party services inventory.' },
        { p: 'Information may also be disclosed where required by law or valid legal process, or where necessary to protect vital interests, public safety or the security of the service, subject to applicable law and documented procedures.' },
        { p: 'The platform must not be represented as sharing data only with the providers listed here until the production dependency, network-request and subprocessor inventories have been checked.' },
      ],
    },
    {
      id: 'location',
      title: '5. Hosting and international transfers',
      blocks: [
        { p: `The platform owner has identified the Supabase host region as ${fact(F.hostingRegion)}. This is an owner-supplied configuration statement, not an independent verification of the live production project or of every backup, support or subprocessor location.` },
        { p: 'Where personal information is transferred or made accessible outside the Philippines, the responsible personal information controller and processor must assess the transfer, contractual safeguards, security measures and accountability requirements under the Data Privacy Act and applicable rules. The location of the primary database alone does not establish the location of all processing.' },
      ],
    },
    {
      id: 'security',
      title: '6. Security and confidentiality',
      blocks: [
        { p: 'ASilva Innovations is committed to applying appropriate organisational, physical and technical safeguards proportionate to the nature of the information and the risks of disaster-related processing.' },
        { p: 'The production security statement must be supported by evidence for the deployed configuration, including authentication and role controls, organisation-level access isolation, database policies, encryption in transit and at rest, privileged access, secrets management, audit logging, backup and restoration, vulnerability management, incident response and personnel confidentiality.' },
        { note: 'The existence of source code, a database policy or a design document is not by itself proof that a control is correctly configured or operating in production. Do not rely on this policy as a certification that every listed safeguard has passed independent testing.' },
        { p: 'Users must protect their credentials, use approved devices and accounts, report suspected unauthorised access promptly and avoid exporting or sharing records outside authorised channels.' },
      ],
    },
    {
      id: 'retention',
      title: '7. Retention and deletion',
      blocks: [
        { p: 'Information should be retained only for as long as necessary for the declared purpose, applicable legal obligations, operational accountability and any documented records-management schedule.' },
        { p: 'Retention periods differ by record type and by the organisation using the service. The organisation acting as controller must establish and communicate the applicable retention schedule for its records. ASilva Innovations must document retention for account administration, support, security logs, backups and service operations.' },
        { p: 'Deletion requests may be subject to legal retention requirements, public records obligations, investigation holds, backup cycles or the rights of other data subjects. Where deletion cannot be completed immediately, the responsible party should explain the reason and the applicable schedule.' },
      ],
    },
    {
      id: 'rights',
      title: '8. Data subject rights and requests',
      blocks: [
        { p: 'Subject to the Data Privacy Act and applicable exceptions, data subjects may exercise rights including being informed, access, correction, objection, erasure or blocking, data portability and complaint.' },
        { p: `For privacy questions or requests involving ASilva Innovations’ own processing, contact the Data Protection Officer at ${F.dpoEmail}. If the information was entered by an LGU, agency or other customer organisation and that organisation determines the purpose of processing, the request may need to be directed to that organisation. We will route requests appropriately where possible.` },
        { p: 'Requests will be handled within the periods required by applicable law. Any service target published by the organisation must not shorten or replace a statutory deadline.' },
      ],
    },
    {
      id: 'breach',
      title: '9. Personal data breaches',
      blocks: [
        { p: 'Suspected or confirmed personal data breaches must be reported promptly through the organisation’s designated incident channel and to the Data Protection Officer. The responsible controller must assess the nature, scope, risk and notification obligations under the Data Privacy Act, its implementing rules and applicable National Privacy Commission issuances.' },
        { p: 'Where notification to the National Privacy Commission and affected data subjects is legally required, the responsible controller must meet the applicable notification conditions and deadlines. A processor must notify the controller without undue delay in accordance with the applicable agreement and incident-response procedure.' },
        { p: 'Do not treat this policy as a substitute for the incident-response plan, breach register, notification decision record or controller–processor notification procedure.' },
      ],
    },
    {
      id: 'children',
      title: '10. Information about children and vulnerable people',
      blocks: [
        { p: 'Disaster operations may require organisations to process information about children, older persons, persons with disabilities, displaced people and other at-risk groups. Such processing requires heightened necessity, proportionality, access, security and retention safeguards.' },
        { p: 'The organisation determining the purpose of processing must ensure that the processing is lawful, necessary for the stated purpose, appropriately disclosed and restricted to authorised personnel. Avoid collecting information about children or vulnerable people merely because a field is available.' },
      ],
    },
    {
      id: 'changes',
      title: '11. Changes to this policy',
      blocks: [
        { p: 'This policy will be reviewed when the platform’s processing purposes, features, providers, hosting arrangements or legal requirements materially change. The updated date will be shown at the top of the policy page. Material changes should be communicated through an appropriate channel.' },
      ],
    },
    {
      id: 'contact',
      title: '12. Data Protection Officer and contact details',
      blocks: [
        { table: {
          head: ['Item', 'Details'],
          rows: [
            ['Publisher / service operator', F.publisher],
            ['Data Protection Officer (owner-supplied designation)', fact(F.dpoName)],
            ['DPO contact email', F.dpoEmail],
            ['General enquiries', F.generalEmail],
            ['Privacy enquiries', F.privacyEmail],
            ['Business address', F.address],
            ['Supabase primary host region (owner-supplied; verify live configuration)', fact(F.hostingRegion)],
            ['NPC registration reference', fact(F.npcRegistration)],
          ],
        } },
        { p: 'You may also contact the National Privacy Commission through its official website at privacy.gov.ph.' },
      ],
    },
  ],
};
