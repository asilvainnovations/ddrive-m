// Gawad KALASAG Seal for Excellence in DRRM and Humanitarian Assistance: LDRRMCO Assessment Toolkit CY 2026
// (the toolkit workbook in the DDRiVE-M project files). Indicators, means of verification and rating guides are the
// toolkit's own text, read from its checklists (S, C, MS, EP, KMA, PP); weights and bands from its Summary sheet.
// The database holds the item codes and weights and computes the score (migration 20261127060000).

export type GkSection = 'structure' | 'competency' | 'management_systems' | 'enabling_policies' | 'knowledge_management' | 'partnership';
export interface GkItem {
  code: string;
  section: GkSection;
  title: string;
  indicators: string[];
  means_of_verification: string[];
  rating_guide: { scope: string | null; score: number; text: string }[];
}

export const GK_SECTIONS: { key: GkSection; title: string; weight: number }[] = [
  { key: 'structure', title: 'I. Structure', weight: 0.25 },
  { key: 'competency', title: 'II. Competency', weight: 0.35 },
  { key: 'management_systems', title: 'III. Management Systems', weight: 0.15 },
  { key: 'enabling_policies', title: 'IV. Enabling Policies', weight: 0.05 },
  { key: 'knowledge_management', title: 'V. Knowledge Management and Advocacy', weight: 0.1 },
  { key: 'partnership', title: 'VI. Partnership and Participation', weight: 0.1 },
];

export const GK_BANDS: { min: number; label: string; description: string }[] = [
  { min: 2.5, label: 'Gold Recognition', description: 'Exceeded the standards for the establishment and functionality of the LDRRMC and LDRRMO under Sections 11 and 12 of RA 10121.' },
  { min: 2.0, label: 'Silver Recognition', description: 'Substantially adheres to the standards under Sections 11 and 12 of RA 10121.' },
  { min: 1.5, label: 'Bronze Recognition', description: 'Generally adheres to the standards under Sections 11 and 12 of RA 10121.' },
  { min: 0.5, label: 'Partially Compliant', description: 'Partly adheres to the standards under Sections 11 and 12 of RA 10121.' },
  { min: 0, label: 'Non-Compliant', description: 'Does not generally adhere to the standards under Sections 11 and 12 of RA 10121.' },
];
export const gkBand = (mean: number | null) => (mean == null ? null : GK_BANDS.find((b) => mean >= b.min) ?? GK_BANDS[GK_BANDS.length - 1]);

// Checklist I minimum requirements. Without all six, the LGU is not endorsed to the national awards.
export const GK_MIN_REQUIREMENTS: { key: string; label: string }[] = [
  { key: 'ldrrmc', label: 'Established and organised Local DRRM Council' },
  { key: 'non_state_members', label: 'Non-state members in the LDRRMC: 4 CSOs and 1 private sector' },
  { key: 'ldrrmo', label: 'Established LDRRM Office' },
  { key: 'ldrrm_officer', label: 'Permanent and functional LDRRM Officer compliant with JMC 2014-1' },
  { key: 'operations_center', label: 'Established, functional operations center' },
  { key: 'ldrrmp', label: 'Approved and adopted LDRRM Plan covering the assessment year (guided by the NDRRMP)' },
];

export const GK_ITEMS: GkItem[] = [
 {
  "code": "1.1",
  "title": "Establishment of LDRRMC",
  "section": "structure",
  "indicators": [
   "Existence of LDRRMC - compliant to Section 11 of RA 10121",
   "The existing Provincial, City, and Municipal Disaster Coordinating Councils shall henceforth be known as the Provincial, City, and Municipal Disaster Risk Reduction and Management Councils.",
   "Composition:",
   "The LDRRMC shall be composed of, but not limited to, the following:",
   "(1)",
   "(2)",
   "(3)",
   "(4)",
   "(5)",
   "(6)",
   "(7)",
   "(8)",
   "(9)",
   "(10)",
   "(11)",
   "(12)",
   "(13)",
   "(14)",
   "(15)",
   "(16)",
   "(17)",
   "(18)",
   "The four representatives of the CSO shall come from any of the following categories:",
   "a.",
   "b.",
   "c.",
   "d.",
   "According to NDRRMC MC No. 07 s. 2022 - LDRRMCs that cannot satisfy the representation of the private sector or any of the four categories of CSO representatives by reason of unavailability or non-application thereof may allow other applicants from any other categories as mentioned in Subsection 5.3.1., to occupy the seats in the council."
  ],
  "means_of_verification": [
   "Sanggunian Ordinance or Resolution or Executive Order establishing the LDRRMC",
   "Composition of LDRRMC based on RA 10121 (16 mandatory members with at least four accredited CSO and at least one private sector representative)",
   "Certification and/or proof of Legal personality, e.g. Accreditation, certificate from LGU, SEC Registration, of the CSOs/PS Representatives",
   "The agriculturist position is mandatory on the provincial level but optional in the city and municipal level. (Section 482 of RA 7160)",
   "CSO and PS’ name shall be Specified in the Ordinance/EO/Resolution",
   "For offices which represented other required members of the council (e.g. Veterinary, GAD, MENRO) shall be specified in the Ordinance/ EO/ Resolution",
   "For the Veterinary Offices, pursuant to Section 489 of Local Government Code, the Appointment of a Veterinarian officer is mandatory for the Provincial and City Governments. Further, per DILG Memo Circular 2014-56 dated 06 May 2014, For Provinces, Cities and 1st Class Municipalities, there must be an appointed Veterinarian and established Veterinary Office.",
   "For GAD Offices, pursuant to RA 9710, on creation and/or Strengthening of the GAD Focal Points (GFP). local government units shall establish or strengthen their GAD Focal Point System or similar GAD mechanism to catalyze and accelerate gender mainstreaming within the agency or local government unit.. Further, per PCW-DILG-DBM-NEDA JMC No. 2013-1, where feasible, the LGU may also establish a GAD Office or unit under the Office of the LCE that will support and coordinate all GAD-related PPAs and concerns of the LGU GFPS. The LCE may also appoint or designate the LGU personnel to manage the GAD office and/or unit."
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "if LDRRMC is: (a) established through Sanggunian Ordinance or Resolution or Executive Order; and (b) composition exceeded requirements in RA 10121 (mandatory members with at least four CSOs and at least one private sector representative, both accredited with certification and/or proof of legal personality)"
   },
   {
    "scope": null,
    "score": 2,
    "text": "if LDRRMC is: (a) established through Sanggunian Ordinance or Resolution or Executive Order; and (b) composition is compliant to RA 10121 (mandatory members with at least four CSOs and at least one private sector representative, both accredited with certification and/or proof of legal personality)"
   },
   {
    "scope": null,
    "score": 1,
    "text": "if LDRRMC is established through Sanggunian Ordinance or Resolution or Executive Order; but the composition is not compliant to RA 10121"
   },
   {
    "scope": null,
    "score": 0,
    "text": "if there is no LDRRMC established"
   }
  ]
 },
 {
  "code": "1.2",
  "title": "Convene the LDRRMC quarterly or as necessary",
  "section": "structure",
  "indicators": [
   "Regular full council meetings of the LDRRMC convened at least once every quarter"
  ],
  "means_of_verification": [
   "Minutes of the Meeting",
   "Attendance of members to LDRRMC Meetings",
   "LDRRMC Resolutions (if applicable)",
   "Photo documentation (as supporting document)",
   "Electronic Attendance Sheet such as record of Zoom attendance, google sheet with timestamp, etc. (if applicable)",
   "Other meetings are the ff:"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Conducted more than the four (4) regular quarterly full LDRRMC meetings with, minutes of the meeting, required prepared and list of attendance"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Conducted one (1) regular meeting every quarter with minutes of the meeting prepared and list of attendance"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Conducted less than four (4) council meetings (one regular meeting every quarter) with minutes of the meeting prepared and list of attendance"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No documented council meetings per quarter"
   }
  ]
 },
 {
  "code": "1.3",
  "title": "Organization of DRRMC",
  "section": "structure",
  "indicators": [
   "Provinces: C/MDRRMCs are organized",
   "Cities and municipalities: BDRRMCs are organized"
  ],
  "means_of_verification": [
   "Provinces: Sanggunian Ordinance or Resolutions or Executive Orders on the establishment of C/MDRRMCs",
   "Provinces: Summary list of LGUs with organized DRRMCs",
   "Cities and municipalities: Sanggunian Ordinance or Resolutions or Executive Orders on the establishment of BDRRMCs",
   "Cities and municipalities: Summary list of LGUs with organized DRRMCs"
  ],
  "rating_guide": [
   {
    "scope": "Provinces",
    "score": 3,
    "text": "established 100% C/ MDRRMCs through Sanggunian Ordinance or Resolution or Executive Order"
   },
   {
    "scope": "Provinces",
    "score": 2,
    "text": "established 75-99% C/MDRRMCs through Sanggunian Ordinance or Resolution or Executive Order"
   },
   {
    "scope": "Provinces",
    "score": 1,
    "text": "established 50-74% C/MDRRMCs through Sanggunian Ordinance or Resolution or Executive Order"
   },
   {
    "scope": "Provinces",
    "score": 0,
    "text": "less than 50% documentation on the establishment of C/MDRRMCs"
   },
   {
    "scope": "Cities and municipalities",
    "score": 3,
    "text": "established 100% BDRRMCs through Sanggunian Ordinance or Resolution or Executive Order;"
   },
   {
    "scope": "Cities and municipalities",
    "score": 2,
    "text": "established 75-99% BDRRMCs through Sanggunian Ordinance or Resolution or Executive Order"
   },
   {
    "scope": "Cities and municipalities",
    "score": 1,
    "text": "established less than 50-74% BDRRMCs through Sanggunian Ordinance or Resolution or Executive Order"
   },
   {
    "scope": "Cities and municipalities",
    "score": 0,
    "text": "less than 50% documentation on the establishment of BDRRMCs"
   }
  ]
 },
 {
  "code": "1.4",
  "title": "Secretariat and Executive Arm of LDRRMC",
  "section": "structure",
  "indicators": [
   "Availability of database or records of all proceedings of the LDRRMC meetings, guidelines, protocols, systems, and plans available within the last 3 years",
   "Presence of a list of resolutions and adopted policies of the LDRRMC"
  ],
  "means_of_verification": [
   "Minutes of Council Meeting within the last 3 years",
   "Attendance of the meetings within the last 3 years",
   "Guidelines, protocols, policies, and/or plans (if applicable)",
   "Council/committee resolutions within the last 3 years (if applicable)",
   "Photo documentation (if applicable, as supporting documents)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) maintains a complete database or records of all proceedings of LDRRMC Meetings and adopted policies, guidelines/ protocols/ systems/ plans available within the last 3 years; and (b) provides secretariat support to the LDRRMC and organizes regular conduct of LDRRMC Meetings within the last three years with complete documentation e.g. Minutes of the Meeting with list of attendance"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) provides secretariat support to the LDRRMC and (b) organizes regular conduct of LDRRMC Meetings within the last three years with complete documentation e.g. Minutes of the Meeting with list of attendance"
   },
   {
    "scope": null,
    "score": 1,
    "text": "(a) provides secretariat support to the LDRRMC and (b) conduct of LDRRMC Meetings within the last three years but with incomplete documentation e.g. lacking of Minutes of the Meeting"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no MOVs on the provision of support to the LDRRMC"
   }
  ]
 },
 {
  "code": "1.5",
  "title": "Creation of LDRRM Office",
  "section": "structure",
  "indicators": [
   "Presence of an established and institutionalized LDRRM Office pursuant to Sec. 12 of RA 10121 and NDRRMC-DILG-DBM-CCC JMC 2014-1: Implementing Guidelines for the Establishment of LDRRM Offices or Barangay DRRM Committee in LGUs.",
   "Presence of an institutionalized LDRRMO",
   "Special DRRM Offices",
   "Office functioning as LDRRMOs (for those with special offices created before the enactment of RA 10121 and in consonance with Section 76 of RA 7160)"
  ],
  "means_of_verification": [
   "Sanggunian Ordinance or Resolution or Executive Order creating the LDRRMO with budget appropriation and creation of plantilla positions",
   "LDDRM Office organizational structure (MOV is contributory to post-disaster planning)",
   "Special provision on disaster risk reduction and management in the Ordinance or Sanggunian Resolution or Executive Order creating the special DRRMO office in the LGU",
   "Physical structure and facilities for the LDRRM Office as a separate office space or housed as a separate building",
   "Payment receipt of Insurance of the building"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Presence of: (a) Sanggunian Ordinance or Resolution or Executive Order creating the LDRRM Office with corresponding budget and plantilla positions in accordance with (Section 12) RA 10121 and (Item No. 5) NDRRMC-DILG-DBM-CSC JMC 2014-1; and (b) Separate building for LDRRM Office and covered with insurance for Provinces to 1st-3rd Class Municipalities and separate office/ space for LDRRM Office for 4th to 6th Class Municipalities"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Presence of: (a) Sanggunian Ordinance or Resolution or Executive Order creating the LDRRM Office with corresponding budget and plantilla positions in accordance with (Section 12) RA 10121 and (Item No. 5) NDRRMC-DILG- DBM-CSC JMC 2014-1; and (b) separate office/ space for LDRRM Office"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Presence of: (a) Sanggunian Ordinance or Resolution or Executive Order creating the LDRRM Office; and (b) at least office facilities for LDRRM Office"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No documentation on the establishment of LDRRM Office"
   }
  ]
 },
 {
  "code": "1.6",
  "title": "LDRRMO Staffing / Personnel Complement",
  "section": "structure",
  "indicators": [
   "Filled-up positions based on NDRRMC-DILG-DBM-CSC JMC 2014-1, who shall be responsible for:",
   "(1)",
   "(2)",
   "(3)"
  ],
  "means_of_verification": [
   "Appointment Papers",
   "CSC Attestation",
   "Local Budget Preparation (LBP) Form No. 3",
   "Task and responsibility of LDRRMO Staff",
   "Consideration will be given if an LGU with a recently vacated plantilla LDRRMO position/s because incumbent was separated from service e.g., resignation/ retirement; provided that:",
   "Permanent/Designated personnel must be the personnel responsible for:"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Elevated LDRRMO organization and staffing into a Conversion of LDRRMO into a department compliant to (Item 5.4 & 5.6) NDRRMC-DILG DBM-CSC JMC 2014-1; and (b) Exceeded filled-up mandatory positions (Permanent LDRRMO Head + 3 permanent LDRRMO staff reporting and functioning to the Local DRRM Office) compliant to Section 5 of NDRRMC-DILG DBM-CSC JMC 2014-1"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Filled-up mandatory positions (Permanent LDRRMO Head + permanent 3 LDRRMO Staff reporting and functioning to the Local DRRM Office) compliant to Section 5 of NDRRMC-DILG DBM-CSC JMC 2014-1"
   },
   {
    "scope": null,
    "score": 1,
    "text": "personnel complement to the LDRRM Office is designated or assigned"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No MOVs on LDRRM Office personnel"
   }
  ]
 },
 {
  "code": "1.7",
  "title": "Local DRRM Officer",
  "section": "structure",
  "indicators": [
   "LDRRM Officer is operationally defined as the head or the highest ranking official in the LDRRM Office and is appointed to the prescribed SG and with CSC-attested appointment",
   "Educational attainment and eligibility in accordance with the qualification standards under Item No. 6 of NDRRMC-DILG-DBM-CSC JMC 2014-1",
   "Completion of DRRM-related trainings such as, but not limited to:",
   "(1)",
   "(2)",
   "(3)",
   "(4)",
   "(5)",
   "(6)",
   "(7)",
   "(8)",
   "Similar trainings completed from credible or reputable institution (last 5 years)"
  ],
  "means_of_verification": [
   "Appointment Paper (MOV is contributory to post-disaster planning)",
   "Statement of duties and responsibilities of LDRRM Officer (MOV is contributory to post-disaster planning)",
   "CSC Attestation",
   "For designated (OIC or serving in concurrent capacity) LDRRMO Head, presence of Executive Order or any relevant issuances assigning as the LDRRMO Head",
   "Duly Notarized Personal Data Sheet",
   "Certificate of completion of trainings and seminars attended (local and international)",
   "Appointment that is yet to be attested by CSC may be considered, as long as it bears the required SG and LGU has already transmitted its copy to CSC Field Office.",
   "LGU with a recently vacated because the incumbent was separated from service e.g., resignation/ retirement; provided that:"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Exceeds ALL the minimum required qualifications such as: (a) permanent LDRRM Officer occupying the plantilla position, performing the functions of the position, with SG level prescribed by the item no. 6 of NDRRMC-DILG- DBM-CSC JMC 2014-1; (b) educational attainment, and eligibility in accordance with item no. 6 of NDRRMC-DILG-DBM-CSC JMC 2014-1; (c) Completion of necessary DRRM-related trainings (6 or more Trainings) as indicated in this toolkit;"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Meets all the required qualifications such as: (a) permanent LDRRM Officer occupying the plantilla position with SG level prescribed by the item no. 6 of NDRRMC- DILG-DBM-CSC JMC 2014-1 (b) Educational attainment and eligibility in accordance with item no. 6 of NDRRMC-DILG- DBM-CSC JMC 2014-1; and (c) completion of necessary DRRM-CCA related trainings (At least 5 trainings) as indicated in this toolkit"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Meet the minimum required qualifications such as: (a) permanent LDRRM Officer occupying the plantilla position with SG level prescribed by the item no. 6 of NDRRMC-DILG-DBM- CSC JMC 2014-1 or OIC/Serving in concurrent capacity; and (b) completion of at least three of the necessary DRRM-related trainings as indicated in this toolkit"
   },
   {
    "scope": null,
    "score": 0,
    "text": "LDRRM Officer does not meet minimum qualification based on the item no. 6 of NDRRMC-DILG-DBM- CSC JMC 2014-1"
   }
  ]
 },
 {
  "code": "1.8",
  "title": "Establishment of Provincial / City / Municipal DRRM Operations Center",
  "section": "structure",
  "indicators": [
   "Established functional 24/7 LDRRM Operations Center with human resource",
   "Established functional LDRRM Operations center at least during emergencies",
   "As provided for in NDRRMC Memorandum No. 131 s. 2018 or the Guidelines on the Establishment, Operationalization and Management of Emergency Operation Center, an Operation Center (OpCen) is a designated facility that is staffed and equipped with resources to undertake multi-stakeholder coordination, manage information, and facilitate resource mobilization in anticipation of and/or to support incident operations.",
   "Common OpCen Physical Requirements",
   "(1)",
   "(2)",
   "(3)",
   "(4)",
   "(5)",
   "(6)",
   "(7)",
   "(8)",
   "OpCen Readiness Level:",
   "(1)",
   "(2)",
   "(3)",
   "Back-up or alternate Emergency Operations Center (EOC) may be established, as needed, based on CPs, PSCP or other relevant plans in order to ensure continuity of operations amidst any disruption -NDRRMC MEMO 131, s. 2018, 9.1.6",
   "Selection of alternate EOC location should be based on same factors as the primary EOC:",
   "Accessibility",
   "(1)",
   "(2)",
   "Safety",
   "(1)",
   "(2)",
   "Size",
   "(1)",
   "(2)",
   "Systems capability",
   "(1)",
   "(2)",
   "Survivability",
   "(1)",
   "(2)"
  ],
  "means_of_verification": [
   "Executive Order or similar issuance for the creation/establishment of 24/7 Operations Center",
   "OpCen duty logbook",
   "SOP / OpCen Manuals",
   "Organizational Structure",
   "Updated and signed Inventory of Equipment (January-December of year being assessed)",
   "Payment receipt of Insurance of OpCen Building",
   "Photo documentation on the activation of OpCen as supporting document",
   "Notarized MOA/MOU for the alternative site/ as stated in their PSCP if applicable"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) With established functional 24/7 OpCen adhering to NDRRMC Standards; (b) with Hot and insured OpCen; (c) identified alternate EOC; (d) presence of SOPs/OpCen Manual; and (e) Updated Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) With established 24/7 OpCen (Provinces, Cities, and 1st-3rd Class Municipalities: Functional 24/7 Operations Center; 4th-6th Class Municipalities: Functional 24/7 Operations Center at least during emergencies) (b) With Hot or Warm OpCen; (c) Presence of SOPs/OpCen Manual; and (d) Updated Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 1,
    "text": "(a) With established OpCen (functioning 24/7 at least during disasters); and (b) Updated Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No MOVs on the established OpCen"
   }
  ]
 },
 {
  "code": "1.9",
  "title": "Organization and Competence of local Emergency Response Teams (ERTs)",
  "section": "structure",
  "indicators": [
   "Take all necessary steps on a continuing basis to maintain, provide, or arrange the provision of, or to otherwise make available, suitably-trained and competent personnel for effective civil defense and disaster risk reduction and management in its area;",
   "Organized and suitably- trained ERTs on civil defense and DRRM",
   "At least one LDRRMC member and LDRRMO head trained on Incident Command System",
   "Availability of SRR resources for at least top 2 hazards of the locality"
  ],
  "means_of_verification": [
   "CP Form 1. Hazard Analysis” from the contingency plan / Risk Assessment from other plans to check the consistency of available equipment with the hazards present in the area.",
   "Training Needs Assessment / training plan / Career Development Plan",
   "Updated Roster or directory or organizational structure of ERTs",
   "Updated and signed Table of equipment / list of equipage",
   "Organizational Structure / NOSCA / Fill-up Rate",
   "List of personnel with respective trainings attended",
   "Certificate/ Receipt of payment of LDRRMO personnel Insurance (government or private insurance)",
   "Insurance policy should be valid during the assessment period",
   "Policies/Issuances stating the ERT insurances",
   "Recognition or Resolution or Order from the Sanggunian or other appropriate authority in the LGU",
   "Certificate of DRRM- related capacity enhancements trainings attended",
   "Office Order / After-Activity Report"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Organized ERTs and provided training on ERTs and on SRR and Basic ICS with documentations such as Certificate of Trainings and After Activity Report; and (at least 50% of ERTs) (b) Availability of response equipment/ assets for more than 2 hazards in the locality; (c) Provided insurance and organized ERTs in the LGU; and (d) Updated Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) Availability of response equipment/ assets for the top 2 hazards in the locality; (b) Organized ERTs and provided training on ERTs and SRR and Basic ICS with documentations such as Certificate of Trainings and After Activity Report; and (c) Updated Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 1,
    "text": "(a) No established ERT but with available personnel to perform Civil Defense and DRRM functions; and (b) Inventory of Equipment signed by LDRRM Officer/duly designated officer"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No established ERT and no other personnel to perform Civil Defense and DRRM functions"
   }
  ]
 },
 {
  "code": "2.1",
  "title": "Facilitation and Support to Risk Assessment",
  "section": "competency",
  "indicators": [
   "Conduct of risk assessments and incorporated to risk profile of DRR-CCA related plans"
  ],
  "means_of_verification": [
   "Presence of Risk Profile",
   "Result of risk assessment / Risk profile (CDRA, CBRA, VRA, GIS, Risk Maps, GEORISKPH, REDAS, etc.)",
   "Attendance sheet and signed AAR for the conduct of risk assessment stating the method used and reflecting the involvement of the vulnerable sectors",
   "Photo documentation (if applicable)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "updated CDRA or used GEORISKPH or REDAS with output risk maps incorporated in risk profile with participation of vulnerable sectors within the last three (3) years"
   },
   {
    "scope": null,
    "score": 2,
    "text": "conducted CDRA or used GEORISKPH or REDAS with output risk maps with community participation beyond the last three (3) years"
   },
   {
    "scope": null,
    "score": 1,
    "text": "conducted hazard/exposure assessments for their risk assessments using other tools led or sponsored by the LGU"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no risk assessment conducted"
   }
  ]
 },
 {
  "code": "2.2",
  "title": "Maintenance of Local Risk Maps",
  "section": "competency",
  "indicators": [
   "Inventory of Risk Maps maintained, reproduced and displayed specifications/features that must be seen in local risk maps such as but not limited to:"
  ],
  "means_of_verification": [
   "Photos and PDF of Risk maps with a scale of 1:50,000 for provinces and 1:10,000 for municipalities and cities (updated, digitized GIS maps, prominently displayed)",
   "Photo/Digitalized Maps means the completed process of turning information into a form that can be read easily by a computer"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) updated local risk maps within the last three (3) years of more than the top two (2) hazards in the locality; and (b) prominently displayed (b) prominently displayed"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) updated local risk maps within the last three (3) years of the top two (2) hazards in the locality; and (b) prominently displayed"
   },
   {
    "scope": null,
    "score": 1,
    "text": "One (1) local risk map of any of the top two (2) hazards in the locality and prominently displayed"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no Risk Maps"
   }
  ]
 },
 {
  "code": "2.3",
  "title": "Operation of multi-hazard end-to-end Early Warning System (EWS) to provide accurate and timely advice to national or local emergency response organizations and the general public",
  "section": "competency",
  "indicators": [
   "Maximized the use of mass media, other technologies for communication",
   "Use of traditional or indigenous means of monitoring and warning dissemination within communities for operationalization of the EWS",
   "Four (4) Elements of a Sound Early Warning System:"
  ],
  "means_of_verification": [
   "Approved and adopted SOP or Manual on EWS with the following Procedures and Protocols on:"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Approved and adopted SOP or Manual with laymanized and localized Multi-hazard EWS compliant with the four elements of a sound EWS (Risk Knowledge, Monitoring and Warning Service, Dissemination and Communication; and Response Capability); and (b) with traditional or indigenous EWS"
   },
   {
    "scope": null,
    "score": 2,
    "text": "With SOP or manual on EWS compliant with the four elements of a sound EWS (Risk Knowledge, Monitoring and Warning Service, Dissemination and Communication, and Response Capability)"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Available SOP or Manual on EWS not compliant to the four (4) elements of EWS"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No SOP or manual on EWS"
   }
  ]
 },
 {
  "code": "2.4.A",
  "title": "Designing, Programming and Coordination of DRRM Activities (consistent with NDRRM Council’s Standards and Guidelines)",
  "section": "competency",
  "indicators": [
   "Presence of approved LDRRMP (aligned with NDRRMP 2020-2030)"
  ],
  "means_of_verification": [
   "Reviewed LDRRMP using NDRRMC prescribed template, approved by the LDRRMC and adopted by the Sanggunian",
   "Approved LDRRMP with Sangunian Resolution",
   "Reviewing authority is either OCD or per NDRRMC 147 (if applicable)",
   "Certification valid during the assessment year issued by the Reviewing Authority"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Updated, LDRRMC-approved, and Sangunian-adopted LDRRMP; and (b) LDRRMP reviewed by the reviewing authority with certification compliant to NDRRMC MC 147 s 2017"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) Updated, LDRRMC-approved, and Sangunian-adopted LDRRMP; and (b) LDRRMP reviewed by the reviewing authority with pending compliance/comments from reviewing authority"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Updated and Sangunian-approved LDRRMP but not reviewed by the reviewing authority compliant to NDRRMC MC 147 s 2017"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no or draft LDRRMP"
   }
  ]
 },
 {
  "code": "2.4.B",
  "title": "Presence of updated C/M/BDRRM Plan",
  "section": "competency",
  "indicators": [
   "Provinces: Presence of DRRM Plan"
  ],
  "means_of_verification": [
   "Provinces: List of submitted approved C/MDRRMPs duly certified by the LDRRMO",
   "Provinces: Consolidated Resolution of lower LGUs approving the LDRRMP",
   "Provinces: Organization of Provincial Review Team\" with EO or resolution reviewing the City/Municipality DRRM Plans",
   "Cities and municipalities: List of submitted approved BDRRMPs duly certified by the LDRRMO",
   "Cities and municipalities: Consolidated Resolution of lower LGUs approving the LDRRMP",
   "Cities and municipalities: Organization of Municipal/City Review Team with EO or resolution reviewing the Barangay DRRM Plans"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "100% of lower LGUs with approved C/M/BDRRMP"
   },
   {
    "scope": null,
    "score": 2,
    "text": "At least 75% of lower LGUs with approved C/M/BDRRMP"
   },
   {
    "scope": null,
    "score": 1,
    "text": "At least 50%-74% of lower LGUs with approved C/M/BDRRMPs"
   },
   {
    "scope": null,
    "score": 0,
    "text": "less than 50% of lower LGUs with approved C/M/BDRRMPs"
   }
  ]
 },
 {
  "code": "2.4.C",
  "title": "Presence of LCCAP",
  "section": "competency",
  "indicators": [
   "Presence of LCCAP and climate change (CC) expenditure tagged AIP",
   "The LCCAP sets out the strategies of an LGU to mitigate and adapt to the impacts of climate change. Depending on the planning scenarios in the LGUs, the LCCAP may either be integrated into the PDPFP/CLUP/CDP or it may be a stand-alone document, containing:"
  ],
  "means_of_verification": [
   "Local Climate Change Action Plan with Sanggunian Resolution adopting the LCCAP",
   "Approved PDPFP, CLUP, or CDP, if LCCAP is integrated into any of these plans",
   "Certification of Submission by CCC"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "with LCCAP (a) approved by the LDC, (b) adopted by the Sanggunian and (c) integrated in the CLUP or CDP (d) submitted to the CCC"
   },
   {
    "scope": null,
    "score": 2,
    "text": "with LCCAP approved by the LDC and adopted by the Sanggunian"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with draft LCCAP"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no draft LCCAP"
   }
  ]
 },
 {
  "code": "2.4.D",
  "title": "Presence of contingency plans",
  "section": "competency",
  "indicators": [
   "Presence of contingency plans",
   "A Contingency Plan (CP) is a scenario-based plan for a specific and projected natural and/or human-induced hazard. It aims to address the impacts of the hazard to people, properties, and the environment; and/or to prevent the occurrence of the emerging threats through the arrangement of timely, effective, appropriate, and well-coordinated responses as well as the efficient management of resources.",
   "In light of the COVID-19 pandemic, NDRRMC MC 57 s. 2020 was issued enjoining, amongst others, all LGUs to update their respective PSCPs and CPs due to ongoing public health emergencies."
  ],
  "means_of_verification": [
   "LDRRMC Approved and Sangunian adopted hazard-specific Contingency Plans for at least 2 top hazards (based on Risk Assessment results) within the last 3 years",
   "Approved and adopted hazard-specific Contingency Plans for at least 2 top hazards updated for COVID/EREID and approved by LDRRMC"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "CPs are formulated/updated for COVID/EREID and approved by LDRRMC, adopted by Sanggunian for at least top two identified hazards within the last three years"
   },
   {
    "scope": null,
    "score": 2,
    "text": "CPs are formulated/updated and approved by the LDRRMC and adopted by Sanggunian for at least top two identified hazards within the last three (3) years\""
   },
   {
    "scope": null,
    "score": 1,
    "text": "At least 1 approved CP by the LDRRMC and adopted by Sanggunian"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no approved CP by the LDRRMC and adopted by Sanggunian"
   }
  ]
 },
 {
  "code": "2.5",
  "title": "Monitor and evaluate the implementation of the LDRRMPs",
  "section": "competency",
  "indicators": [
   "Monitoring mechanism/plan in the LDRRMP (i.e. M&E plan)",
   "Accomplishment Rate of LDRRMP vis-a-vis Target PPAs in the LDRRMP"
  ],
  "means_of_verification": [
   "Approved LDRRMP with Certificate of LDRRMP Review",
   "Monitoring and Evaluation Report",
   "Accomplishment reports per PAP as attachments to the M&E Report (Physical and Financial Accomplishment Report, AARs, ATARs, etc)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "with approved LDRRMP and M&E Financial and Physical Report every quarter"
   },
   {
    "scope": null,
    "score": 2,
    "text": "with approved LDRRMP with M&E Report every semester"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with approved LDRRMP with annual M&E Report"
   },
   {
    "scope": null,
    "score": 0,
    "text": "without M&E Report"
   }
  ]
 },
 {
  "code": "2.6",
  "title": "Organization and conduct of training (including Training of Trainers), orientation and knowledge management activities on DRRM at the local level",
  "section": "competency",
  "indicators": [
   "DRRM Training based on the risk identified in the LGU conducted within the last three (3) years (Basic, Advance & Executive):",
   "Basic Courses:",
   "1)",
   "2)",
   "3)",
   "Advance Courses:",
   "1)",
   "2)",
   "3)",
   "4)",
   "5)",
   "6)",
   "7)",
   "8)",
   "9)",
   "10)",
   "11)",
   "12)",
   "13)",
   "Executive Courses:",
   "1)",
   "2)",
   "Trainings offered by Other Agencies:",
   "1)",
   "2)",
   "3)",
   "4)",
   "5)",
   "6)",
   "7)",
   "8)",
   "9)",
   "10)",
   "11)",
   "12)"
  ],
  "means_of_verification": [
   "Post-Training Report",
   "Attendance Sheet / List of Trainees",
   "List of Pool of Trainers with certificates"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "developed pool/s of trainers through the conduct of training of trainers and organized and conducted at atleast 5 different DRRM-related trainings and workshops based on the risk present in their LGUs conducted in the last three (3) years with complete documentation"
   },
   {
    "scope": null,
    "score": 2,
    "text": "organized and conducted at least five (5 DRRM-related activities such as trainings and workshops based on the risk present in their LGUs in the last three (3) years with DRRM-related trainings complete documentation."
   },
   {
    "scope": null,
    "score": 1,
    "text": "conducted less than 5 DRRM-related activities such as seminars, briefings, orientation and other knowledge management activities with complete documentation."
   },
   {
    "scope": null,
    "score": 0,
    "text": "No documentation of DRRM-related trainings, orientation knowledge management activities conducted"
   }
  ]
 },
 {
  "code": "2.7",
  "title": "Recommend the implementation of forced or pre-emptive evacuation of local residents, if necessary",
  "section": "competency",
  "indicators": [
   "Presence of measures to implement forced or pre-emptive evacuation"
  ],
  "means_of_verification": [
   "Policy on pre-emptive and forced evacuation",
   "Sanggunian Ordinance",
   "Executive Order",
   "LDRRMC Resolution",
   "SOP on pre- emptive or forced evacuation",
   "SitRep of the previous disaster response"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Policy (ordinance, EO, resolution) enforcing the implementation of the pre-emptive (mandatory or forced evacuation); (b) updated SOP on pre-emptive (mandatory or forced evacuation), and (c) enforced the pre-emptive (mandatory or forced evacuation) resulting to zero (0) casualty (if applicable);"
   },
   {
    "scope": null,
    "score": 2,
    "text": "with: (a) Policy (ordinance, EO, resolution) enforcing the implementation of the pre-emptive (mandatory or forced evacuation); or (b) SOP on pre-emptive (mandatory or forced evacuation)"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with LDRRMC resolution/ordinance recommending for the policy of pre-emptive (mandatory or forced evacuation) approved by the sanggunian"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no actions undertaken"
   }
  ]
 },
 {
  "code": "2.8",
  "title": "Pre-positioning",
  "section": "competency",
  "indicators": [
   "Pre-positioned stockpiles of relief goods (food, water, and non-food) or a negotiated agreement with local suppliers",
   "MOA can be forged with suppliers (or in some cases, Purchase Order) such as supermarkets for the prepositioning of relief goods and other supplies, and pharmacies for medical supplies based on Rule 4 Section 4 (14) of the IRR of R.A. No. 10121.",
   "NDRRMC Disaster Preparedness Minimum Standards Vol. 2 prescribes that the minimum for stockpiling is 500 food packs and 500 hygiene kits.",
   "Properly managed stockpiles are measured by: - Theres is a well-organized, with clear labeling and categorization of items - There is a system in place to track inventory levels, ensuring that items are neither overstocked nor understocked -Note that regular maintenance is conducted to ensure the quality and integrity of teh items within the stockpile - Stockpile is managed efficiently, with items easily accessible when needed, minimizing downtime or delays - Ensure that management practices adhere to relevant regulations and standanrds, demonstrating accountability and responsibility - There are strategies in place to mitigate risks such as spoilage, expiration, or fluctuations in demand"
  ],
  "means_of_verification": [
   "Inventory of stockpile of relief goods duly signed by the proper signing authority",
   "Standby arrangements or MOU / notarized MOA with local suppliers on framework agreement",
   "Contingency Plan indicating (reflecting) the volume of stockpiling of LGU",
   "Photo Documentation of the stockpile",
   "Inventory of Donation Management duly signed by the proper signing authority"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Properly managed stockpile of relief goods and standby arrangements and MOU/ notarized MOA with local suppliers"
   },
   {
    "scope": null,
    "score": 2,
    "text": "with stockpile of relief goods and standby arrangements"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with stockpile of relief goods or MOU/notarized MOA with local suppliers"
   },
   {
    "scope": null,
    "score": 0,
    "text": "no stockpile of relief goods and standby arrangements or MOU/MOA with local suppliers"
   }
  ]
 },
 {
  "code": "2.9",
  "title": "Camp Coordination and Camp Management",
  "section": "competency",
  "indicators": [
   "DSWD-DILG-DOH-DepEd Joint Memorandum Circular No 02 s. 2021 or the Guidelines on Camp Coordination and Camp Management and Internally Displaced Persons (IDP) Protection provides the guidelines to be used by the LGUs in managing their camps and identifying areas of coordination, collaboration, and cooperation among other stakeholders to ensure the delivery of essential to the IDPs.",
   "Camp Management aims to provide assistance and protection to the IDP inside camps in accordance with international and local law and standards and ensuring that every member of the community has the opportunity to participate in the activities in the camp.",
   "The protection, safety and well-being of IDPs affected by disaster is the primary concern of the State.",
   "Established Fgunctional Camps and other facilities following the basic standards set by the JMC2 series of 2021",
   "Camp Management Kit: LGU Camp Management Plan, registration forms, Disaster Assistance Family Access Card, grievance and referral forms, logbook, pens, stapler cartolina, megaphone, floor mat, flash light, whistle, emergency light, alcohol, face mask, face shield, antibacterial hand soap, disinfectant spray, poster chart, multipurpose storage, directory of contact persons and agencies/offices vital to camp management, signage, communication equipment, and information board.",
   "LGU Camp Management Plan, registration forms, Disaster Assistance Family Access Card, grievance and referral forms, logbook, pens, stapler cartolina, megaphone, floor mat, flash light, whistle, emergency light, alcohol, face mask, face shield, antibacterial hand soap, disinfectant spray, poster chart, multipurpose storage, directory of contact persons and agencies/offices vital to camp management, signage, communication equipment, and information board.",
   "Women-friendly Space Kits:",
   "Curtain, Floor Mat, Markers, Eraser, Cartonlina, Paper, Ballpen, Pencil, Crayons, Record Book, Flash light, Whistle, Emergency light, Alcohol, Face mask, face shield, hand soap, disinfectant spray, poster chart, multipurpose storage, monoblock chairs and tables, and white board",
   "Child-friendly Space Kits:",
   "Floormat, marker, crayons, pencil, paper, art paper, scissor, glue, stress ball, skipping rope, building blocks, puzzle, books, flash cards, flash light, whistle, emergency light, alcohol, face mask, face shield, hand soap, disinfectant spray, poster chart, multipurpose storage",
   "Availability of Age and Sex Dissagregated data in Evacuation Centers."
  ],
  "means_of_verification": [
   "Approved and Adopted Camp Management Plan (CMP) and its organizational structure (reviewed by the M/PSWDO and LDRRMO) as per DSWD-DILG-DOH-DepEd JMC No. 2s, 2021 with Sangunian resolution",
   "Certificate of Camp Coordination and Camp Management Training of LSWDO personnel",
   "Certificate of Camp Coordination Coordination and Camp Management Training of other LGU personnel",
   "Availability of Camp Management Kit per identified camp:",
   "Documentation on the response operations complete with Age and Sex dissagrated data.",
   "Met minimum required minimum health standard protocol as integrated into the LGU Plan",
   "Inventory of Camp managers (included in the CMP)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) with Approved by the council and Adopted by the Sanggunian Camp Management Plan (CMP) and its organizational structure (reviewed by the M/PSWDO and LDRRMO) as per JMC No. 2 s, 2021 with Sangunian resolution; (b) Certificate of CCCM Training of LSWDO personnel; (c) Availability of Camp Management Kit per identified camp: and (d) documentation on the response operations, if applicable"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) with LDRRMC Approved Camp Management Plan (CMP) and its organizational structure (reviewed by the M/PSWDO and LDRRMO) as per JMC No. 2 s, 2021 (b) Availability of Camp Management Kit per identified camp: and (c) documentation on the response operations, if applicable"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with draft Camp Management Plan (CMP) and its organizational structure"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No Camp Management Plan (CMP)"
   }
  ]
 },
 {
  "code": "2.10",
  "title": "Response to and management of adverse effects of emergencies / disasters",
  "section": "competency",
  "indicators": [
   "Responding to and managing the adverse effects of emergencies and disasters",
   "LGUs that do not experience disaster will use the Normal Condition MOVs and Ratings, otherwise use the Alert Condition"
  ],
  "means_of_verification": [
   "Displayed Org structure of the organized emergency response teams at the OpCen",
   "Spot Reports",
   "Team Duty Schedule",
   "After Duty Reports",
   "Logbook (duty personnel, dispatched, logged calls)",
   "Activation, deactivation and non- activation protocols/but presence of SOPs",
   "Reports submitted to OCD, DILG, Higher LGUS, etc (screenshot, email, hardcopies)",
   "organized timely and effective GAD-responsive and PWD- inclusive response operations maybe measured by:",
   "Attendance Sheet and Minutes of Pre-Disaster Risk Assessment or Emergency Meeting",
   "Order / Memorandum raising and downgrading the alert status",
   "Preparedness Measures",
   "Situational Report and Terminal Report",
   "Memorandum for Deployment of Teams",
   "Implementation Plan and Incident Action Plan",
   "RDANA Report",
   "ICS forms",
   "Declaration of State of Calamity, if applicable",
   "Ordinance / Executive Order on Pre-Emptive / Forced Evacuation",
   "Executive Order on the suspension of classes / work",
   "Reports submitted to OCD, DILG, Higher LGUS, etc (screenshot, email, hardcopies)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Presence of organized emergency response teams, systems, procedures, protocols; (b) organized timely and effective GAD-responsive and PWD- inclusive response operations during normal conditions with documentation; and (c) timely reporting to appropriate authorities (OCD, DILG, Higher LGUs, etc.) (a) Presence of organized emergency response teams, systems, procedures, protocols; (b) Ordinance / Executive Order on Pre-Emptive / Forced Evacuation, Executive Order on the suspension of classes / work, if applicable; (c) organized timely and effective GAD-responsive and PWD- inclusive response operations during heightened alert with documentation (d) and timely reporting to appropriate authorities (OCD, DILG, Higher LGUs, etc.)"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) Presence of organized emergency response teams, systems, procedures, protocols; and (b) organized timely and effective inclusive response operations during normal conditions (a) Presence of organized emergency response teams, systems, procedures, protocols, and (b) organized timely and effective response operations during heightened alert"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Presence of organized emergency response teams, systems, procedures, and protocols Presence of organized emergency response teams, systems, procedures, and protocols"
   },
   {
    "scope": null,
    "score": 0,
    "text": "absence of organized teams, systems, procedures, and protocols absence of organized emergency response teams, systems, procedures, and protocols"
   }
  ]
 },
 {
  "code": "2.11",
  "title": "Facilitation of early recovery and rehabilitation interventions",
  "section": "competency",
  "indicators": [
   "Key rehabilitation and recovery strategies identified",
   "Priority rehabilitation and recovery, Build Back Better, or related programs, project and activities ensuring resilience from disasters are implemented"
  ],
  "means_of_verification": [
   "Rehabilitation and recovery strategies and priority programs in the Rehabilitation and Recovery Program (RRP) OR the LDRRMP",
   "Post Disaster Needs Assessment (PDNA) Report, Rapid Post-Disaster Damage and Loss Estimation (RaDE), Situational Report, Calamity Damage Assessment Report (CDAR), LGU Post Damage Assessment Report, AND/OR RRP, if recently affected by a MAJOR disaster AND AS APPLICABLE",
   "Action plan of rehab & recovery (realignment of the Rehab and recovery Pillar Action Plan ) based on post-disaster damage and loss reports which can include provision of livelihood assistance programs (AAR/After Action Review/ Photo Documentation)",
   "Annual investment program (AIP) incorporating the priority DRRM projects",
   "LGU project monitoring (and evaluation) report (on Physical and Financial Report) on the rehab and recovery programs based on LDRRMPS",
   "LDRRMF utilization report"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Rehabilitation and recovery programs, projects and activities in the LDRRMP or RRP implemented and monitored"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Rehabilitation and recovery programs, projects and activities in the LDRRMP or RRP implemented"
   },
   {
    "scope": null,
    "score": 1,
    "text": "LDRRMP with strategies and programs on rehabilitation and recovery or PDNA and RRP, if affected by disaster"
   },
   {
    "scope": null,
    "score": 0,
    "text": "absence of rehabilitation and recovery strategies and programs in LDRRMP and absence of PDNA and RRP, if affected by a major disaster"
   }
  ]
 },
 {
  "code": "2.12",
  "title": "Formulation of Rehabilitation and Recovery Program",
  "section": "competency",
  "indicators": [
   "Pre-disaster planning activities conducted:",
   "Except for financing, pre-disaster planning activities (es prescribed in the RRP) are already reflected in other capacity pillar indicators, to with:",
   "a)",
   "b)",
   "c)",
   "d)",
   "However, to emphasize the linkage between prevention and mitigation/ preparedness and rehabilitation and recovery the presence of pre-disaster planning outputs are considered in the rating"
  ],
  "means_of_verification": [
   "Sanggunian approved local budget for LDRRMF",
   "Approved allocation for rehab and recovery projects in the local budget",
   "Insurance policy for assets insured under GSIS and other disaster related insurance (i.e. crop insurance)",
   "Other standby financing sources for rehabilitation and recovery projects and activities",
   "Listing of farmer enrolled beneficiaries to crop insurance of DA"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Presence of the following: (a) Updated database of socioeconomic and disaster related statistics and maps with management information system (b) LDRRM Office with LDRRM Officer assigned with DRR, planning or other related functions (c) List and maps of identified critical areas, assets and population centers (d) LDRRMF, GSIS property insurance (beyond motor vehicle insurance – i.e. building insurance) and other disaster risk financing and insurance"
   },
   {
    "scope": null,
    "score": 2,
    "text": "Presence of the following: (a) Updated database of socioeconomic and disaster related statistics and maps (b) LDRRM Office with LDRRM Officer assigned with planning functions (c) List of identified critical areas, assets and population centers (d) LDRRMF and GSIS property insurance"
   },
   {
    "scope": null,
    "score": 1,
    "text": "Presence of the following: (a) Basic database of socioeconomic and disaster related statistics and maps (b) LDRRM Office (c) List of identified critical areas, assets and population centers (d) LDRRMF"
   },
   {
    "scope": null,
    "score": 0,
    "text": "absence of the pre-disaster planning activities"
   }
  ]
 },
 {
  "code": "3.1",
  "title": "Hazard-specific SOPs",
  "section": "management_systems",
  "indicators": [
   "Tested, reviewed and cascaded Response Plan / SOPs and CPs (including Operation LISTO)",
   "Utilization of available templates for reporting, bulletins, and monitoring",
   "Incident Command System in place"
  ],
  "means_of_verification": [
   "Approved and Adopted Hazard-Specific SOPs CP",
   "Accomplished Form for Operation LISTO (Monitoring of LGU’s Preparedness Actions)",
   "AAR of SIMEX based on the SOP / CP in the last (3 years)",
   "Situational and/or Incident Reports, Advisories",
   "Regular submission of reports to the OCDROs, DILG ROs, and Provincial DRRMO, as applicable",
   "Updated organizational structure of Incident Management Team (IMT) / ICS",
   "All IMT members are trained in ICS",
   "Submission of Incident Action Plan when activated"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) with approved and adopted hazard-specific SOP for at least 3 hazards updated within the last 3 years (b) with approved AAR for the 3 hazards identified, (c) situational report and/or incident reports that are regularly submitted; (d) accomplished operation listo checklist (e) ICS in place"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) with approved and adopted hazard-specific SOP for at least 2 hazards updated within the last 3 years (b) situational report and/or incident reports that are regularly submitted; (c) accomplished operation listo checklist (d) ICS in place"
   },
   {
    "scope": null,
    "score": 1,
    "text": "with draft hazard-specific SOPs or one (1) approved SOP within AOR and Situational and/or Incident Reports"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No established SOPs"
   }
  ]
 },
 {
  "code": "3.2",
  "title": "Ensure the integration of risk reduction and climate change adaptation into local development plans, programs, and budgets as strategy in sustainable development and poverty reduction",
  "section": "management_systems",
  "indicators": [
   "Provinces: Mainstreamed DRR / CCA in CLUP/PDPFP, local development plans and investment programs"
  ],
  "means_of_verification": [
   "Provinces: DHSUD Approved Provincial Development and Physical Framework Plan through Resolution",
   "Provinces: Certification from RLUC or Regional NEDA, or DHSUD stating that the draft is currently under review and results of risk assessment is already incorporated therein if PDPFP is yet to be approved",
   "Provinces: Approved Provincial Development Investment Program containing DRR / CCA PPAs",
   "Cities and municipalities: Sangunian approved CLUP duly endorsed to the Department of Human Settlements and Urban Development (DHSUD) for review and approval of the Secretary",
   "Cities and municipalities: Approved risk-informed Comprehensive Development Plan",
   "Cities and municipalities: Approved risk-informed CLUP with Zoning Ordinance",
   "Cities and municipalities: Certification from Provincial Land Use Committee (PLUC) or Regional/Central DHSUD stating that the final draft is currently under review and results of risk assessment is already incorporated therein if CLUP is yet to be approved",
   "Cities and municipalities: CDP Assessment Result certified by the CDP Technical Assessment Committee (TAC)",
   "Cities and municipalities: Sanggunian Bayan / Panglungsod Resolution approving the LDIP and AIP that contains DRR/CCA PPAs"
  ],
  "rating_guide": [
   {
    "scope": "Provinces",
    "score": 3,
    "text": "DHSUD RLUC approved risk-informed PDPFP/; approved LDIP with DRR/CCA PPAs aligned with LDRRMP for the year being assessed"
   },
   {
    "scope": "Provinces",
    "score": 2,
    "text": "with draft PDPFP for the year being assessed with certification that the draft is under review and results of risk assessment is already incorporated therein if PDPFP is yet to be approved"
   },
   {
    "scope": "Provinces",
    "score": 1,
    "text": "with draft PDPFP for the year being assessed"
   },
   {
    "scope": "Provinces",
    "score": 0,
    "text": "outdated Risk Informed PDPFP"
   },
   {
    "scope": "Cities and municipalities",
    "score": 3,
    "text": "LGU has both DHSUD and PLUC Approved and Adopted Risk-Informed CLUP and Sanggunian Adopted CDP (with CDP Assessment Result declaring that CDP is risk-informed) and approved LDIP and AIP"
   },
   {
    "scope": "Cities and municipalities",
    "score": 2,
    "text": "LGU has either approved and updated Risk-Informed CLUP (DHSUD-Approved) or CDP (Sanggunian-approved) and approved LDIP and AIP"
   },
   {
    "scope": "Cities and municipalities",
    "score": 1,
    "text": "with draft (not yet approved) Risk Informed CLUP (with certification from DHSUD or PLUC) and CDP"
   },
   {
    "scope": "Cities and municipalities",
    "score": 0,
    "text": "no draft Risk Informed CLUP and CDP"
   }
  ]
 },
 {
  "code": "3.3",
  "title": "Programming and budgeting for LDRRMF and other DRRM resources/funding and budgetary support to LDRRMO",
  "section": "management_systems",
  "indicators": [
   "Identified PPAs to increase resiliency and mitigate the impact of future disaster (activity & policy consistent with the risk assessment of the locality)",
   "Identified PPAs included in the Annual Investment Program",
   "Budget provision for MOOE / Capital Outlay of LDRRMO",
   "LDRRM Fund for the previous year"
  ],
  "means_of_verification": [
   "Approved Local DRRM Fund Investment Plan (Annual or Multi-Year)",
   "List of PPAs indicated in the LDRRMP",
   "Approved Annual Investment Program",
   "LDRRMF utilization report / Implementation Report / Accomplishment Report",
   "Statement of Receipts and Expenditures",
   "Regular (monthly) submission of LDRRMF Utilization Report to COA, copy furnished OCD and DILG"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Approved multi-year LDRRM Investment Program with allocation of 70% for pre-disaster activity and 30% for QRF; with higher budget for prevention and mitigation; (b) LDRRMF Utilization rate of 95%-100% (70% MITIGATION FUND) based on the LDRRMP (c) incorporated in the AIP and LDIP; (d) programming for DRRM PPAs exceeded the 5% allocation requirement; (e) timely (monthly) and complete submission of LDRRMF utilization with above 69% of the PPAs in the LDRRMP and LDRRMFIP/AIP (DRRM-related) implemented (previous year)"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) allocation of 70% for pre-disaster activity and 30% for QRF; (b) LDRRMF Utilization (70% MITIGATION FUND) Rate not lower than 75% based on the LDRRMP (c) approved annual LDRRMFIP, (d) incorporated in the AIP; (e) 5% of IRA budget allocation for DRRM; (f) timely (monthly) and complete submission of LDRRMF utilization"
   },
   {
    "scope": null,
    "score": 1,
    "text": "(a) with LDRRMP, LDRRMFIP and irregular submission of LDRRMF Utilization Report; (b) 50% - 75% LDRRMF Utilization Rate(70% MITIGATION FUND) based on the LDRRMP"
   },
   {
    "scope": null,
    "score": 0,
    "text": "(a) no LDRRMFIP (b) below 50% LDRRM Utilization Rate (70% MITIGATION FUND)"
   }
  ]
 },
 {
  "code": "4.1",
  "title": "Recommendation to enact DRRM- related ordinances through the LDRRMC",
  "section": "enabling_policies",
  "indicators": [
   "Enacted local ordinances consistent with the requirements of RA 10121 and other national policy on the DRR CCA e.g. RA 10821",
   "Proposed legislations, or policy recommendations, related to DRRM initiated by the LDRRMC/O based on the priority policy agenda of the LDRRMP",
   "Inclusion of environmental, health, education, and other sectoral program/s in the DRRM-related ordinances – not necessarily that these have to be in the LDRRMP, these may be in the environmental sector of the Comprehensive Development Plan (CDP)."
  ],
  "means_of_verification": [
   "LDRRMC Approved and Sanggunian-adopted DRRM-related Ordinances for the year being assessed",
   "Council/Committee LDRRMC Resolutions Proposed DRRM-related ordinances",
   "Note:",
   "Include transmittal of documents to Local Sangunian (if applicable)",
   "Minutes of the sanggunian session where such ordinance was discussed and/or enacted"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "Legislations ordinances/policy recommendations related to DRRM initiated by the LDRRMC/O approved/adopted by the Sanggunian for the year being assessed"
   },
   {
    "scope": null,
    "score": 2,
    "text": "proposed legislations and ordinances, or policy recommendations related to DRRM initiated by the LDRRMC/O"
   },
   {
    "scope": null,
    "score": 1,
    "text": "provides support to Sanggunian but does not initiate proposing legislations or policy recommendations"
   },
   {
    "scope": null,
    "score": 0,
    "text": "does not support Sanggunian in enacting DRRM-related policies"
   }
  ]
 },
 {
  "code": "5.1",
  "title": "Local Disaster Database Resource",
  "section": "knowledge_management",
  "indicators": [
   "Availability of updated inventory of vital resources needed during emergencies such as human resource, equipment, directories, and location of critical infrastructures and their capacities such as hospitals and permanent evacuation centers.",
   "Note:",
   "Based on the RA10821 under Section 5. – Only in cases where there is no other available place or structure which can be used as a general evacuation center may a school or child development center be used as an evacuation center not exceeding 15 days. When a school or child development center is used as an evacuation center, gymnasiums, learning and activity centers, auditoriums and other open spaces shall be utilized first. Classrooms shall only be used as a last resort."
  ],
  "means_of_verification": [
   "Dated and duly approved by proper authority database of human resources, equipment, critical facilities",
   "List of Permanent Evacuation Centers",
   "Note:",
   "If the use of school is predicted to exceed fifteen (15) days, the affected LGU shall provide written documentation to the DepED and the DILG on the following:",
   "Inventory of maps (list of available maps)",
   "Website / Social Media containing directory (e.g address of hospitals / evacuation centers / contact details)",
   "Posted and disseminated directory (For LGUs without internet connection)",
   "Databases of socioeconomic and disaster related statistics and maps (MOVs are contributory to post-disaster planning)",
   "Refer to Annex A of Rehab and Recovery Planning Guide",
   "examples of GIS: QGIS, geo PH analytics from GeoRiskPH",
   "CDRA (database)",
   "Operations manual of the management information system (MOVs are contributory to post-disaster planning)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) Completed, disaggregated, and updated (at least semestral) database of critical infrastructures, human resource, equipment, and critical facilities (b) permanent evacuation centers and its capacity (if use of schools - with Memorandum of Agreement between City Division School and LGU and transition site after the 15 days) ; (c) updated inventory of maps (same as the other criteria); and (d) posted directory in websites (social media, etc.) and public places"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) Completed, and updated (annual) database of critical infrastructures human resource, equipment and critical facilities (b) permanent evacuation centers and its capacity (if use of schools - with Memorandum of Agreement between City Division School and LGU and transition site after the 15 days); (c) updated inventory of maps; and (d) posted directory in public places"
   },
   {
    "scope": null,
    "score": 1,
    "text": "With database of critical infrastructures with resources, permanent evacuation centers, capacity, and inventory of maps with directory."
   },
   {
    "scope": null,
    "score": 0,
    "text": "no database of critical infrastructures, resource, permanent evacuation centers, capacity, and inventory maps"
   }
  ]
 },
 {
  "code": "5.2",
  "title": "Conducted information dissemination and public awareness",
  "section": "knowledge_management",
  "indicators": [
   "Availability of contextualized, laymanized and in popular language IEC materials on hazards, risks, vulnerabilities, EWS and counter measures for at least top 2 hazards",
   "Info dissemination/IEC activities on RA 10121 and related laws conducted",
   "Regular conduct of Evacuation Drills",
   "Hazard maps, evacuation maps/routes, hazard signages are displayed in appropriate areas",
   "Public advisories are issued on impending hazards"
  ],
  "means_of_verification": [
   "IEC Program on RA 10121 and related laws, Disaster Preparedness, and EWS",
   "Post-activity reports on the conduct of drills and other related IEC activities conducted",
   "Presence of actual IEC materials (e.g posters / flyers / online pubmats)",
   "Hazards maps and signages displayed in conspicuous areas",
   "Issuance of advisories (e.g social media / email / receiving copies / logbooks)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) With contextualized, laymanized and in popular language IEC programs developed, implemented, and disseminated based on the result of risk assessments for at least 3 hazards and developed effective, practical, sustainable traditional or tech-based innovations IEC program (b) posting of hazard maps and signages displayed in conspicuous areas; and (c) conduct of drills and other exercises"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) With contextualized, laymanized and in popular language IEC materials for at least top 2 hazards and dissemination of the same through various media platforms (b) posting of hazard maps and signages displayed in conspicuous areas; and (c) conduct of drills and other exercises"
   },
   {
    "scope": null,
    "score": 1,
    "text": "With existing IEC program"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No IEC program."
   }
  ]
 },
 {
  "code": "6.1",
  "title": "Develop, strengthen and operationalize mechanisms for partnership or networking with the private sector, CSOs, and volunteer groups.",
  "section": "partnership",
  "indicators": [
   "Presence of mechanisms for partnership or networking of the LGU with other local government units, NGAs, private sector, CSOs, and volunteer groups in the four (4) pillars or thematic areas, e.g. Sister Cities program with LGUs; for Disaster Response, distribution of relief goods, medical services, psycho-social support, and security services",
   "Mobilization of LGUs, CSOs, private groups, and their resources during emergencies/disasters or whenever applicable"
  ],
  "means_of_verification": [
   "List of accredited CSOs, Private Groups, or Volunteers",
   "Service Level Agreements / MOU / notarized MOA with LGUs, CSOs, private groups and organized volunteers",
   "Certificate of Accreditation for CSOs or Volunteers",
   "Any means of recognition/s from local, regional or national given to the LGU",
   "Post-Activity Report",
   "Signed / Approved Contingency Plan Incident Action Plan (for LGUs with disasters)"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "(a) mechanisms for partnership or networking of the LGU with other local government units, NGAs, private sector, CSOs, and volunteer groups in all the Four (4) pillars or thematic areas; (b) any means of recognition/s; and (c) Interoperability outside Area of Responsibility in Mobilizing LGUs, CSOs, Private Groups, volunteers, with established IMT / EOC during emergencies/disasters or whenever applicable"
   },
   {
    "scope": null,
    "score": 2,
    "text": "(a) mechanism/s for partnership or networking of the LGU with other local government units, NGAs, private sector, CSOs, and volunteer groups in any two (2) of the four thematic areas; (b) any means of recognition/s; and (c) Mobilization of the LGU, CSOs, Private Groups, volunteers within the LGU, and their resources during emergencies/disasters, with established IMT / EOC, whenever applicable"
   },
   {
    "scope": null,
    "score": 1,
    "text": "(a) mechanism/s for partnership or networking of the LGU with other local government units, NGAs, private sector, CSOs, and volunteer groups in any of the four (4) pillars or thematic areas; and (b) Mobilization of the LGU, CSOs, Private Groups, volunteers within the LGU, and their resources during emergencies/disasters, with established IMT / EOC, whenever applicable"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No MOVs on partnership and/or mobilization with LGUs, CSOs, private groups, volunteers, and their resources during emergencies/disasters"
   }
  ]
 },
 {
  "code": "6.2",
  "title": "Participation on other external activities set by higher DRRM Councils",
  "section": "partnership",
  "indicators": [
   "No. of external activities set by higher DRRM Councils participated upon"
  ],
  "means_of_verification": [
   "Certificate of Attendance / Participation/ After Activity Report"
  ],
  "rating_guide": [
   {
    "scope": null,
    "score": 3,
    "text": "5 or more identified activities attended within a year"
   },
   {
    "scope": null,
    "score": 2,
    "text": "3-4 identified activities attended within a year"
   },
   {
    "scope": null,
    "score": 1,
    "text": "1-2 identified activities attended within a year"
   },
   {
    "scope": null,
    "score": 0,
    "text": "No participation"
   }
  ]
 }
];
