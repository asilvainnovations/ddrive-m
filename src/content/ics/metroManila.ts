// ICS simulator content for a sub-regional (multi-LGU) setting: Metro Manila. Training material only.
// Each phase has one best option; the explanations name the instrument they rest on. The scenarios are composites
// written for exercise use, not forecasts. Figures quoted as context carry their source in `sources`.
//
// Role definitions and the decision format follow MODE (Ormoc City CDRRMO) ics-data.json, Apache License 2.0,
// rewritten for a sub-regional setting. See THIRD_PARTY_NOTICES.md.
import type { Role, Scenario } from '@/lib/ics/engine';

export const ROLES: Role[] = [
  { id: 'ro', abbr: 'RO', name: 'Responsible Official', who: 'The Local Chief Executive of the affected LGU', desc: 'Sets policy and priorities, delegates authority to the Incident Commander, signs orders and requests to the MMDRRMC.' },
  { id: 'eoc', abbr: 'EOC', name: 'EOC Manager', who: 'LDRRMO operations centre', desc: 'Runs the EOC: alert level, information management, resource sourcing, reporting to the MMDRRMC through OCD-NCR.' },
  { id: 'ic', abbr: 'IC', name: 'Incident Commander', who: 'Designated by the Responsible Official', desc: 'Overall on-scene management: incident objectives, the Incident Action Plan, responder safety.' },
  { id: 'sofr', abbr: 'SOFR', name: 'Safety Officer', who: 'Command Staff', desc: 'Watches hazards to responders and can stop unsafe acts at once.' },
  { id: 'pio', abbr: 'PIO', name: 'Public Information Officer', who: 'Command Staff', desc: 'Single voice for verified public information, rumour control and media.' },
  { id: 'lofr', abbr: 'LOFR', name: 'Liaison Officer', who: 'Command Staff', desc: 'Contact point for assisting agencies, neighbouring LGUs, the private sector and NGOs.' },
  { id: 'osc', abbr: 'OSC', name: 'Operations Section Chief', who: 'General Staff', desc: 'Directs tactical operations: rescue, evacuation, medical, fire and security.' },
  { id: 'psc', abbr: 'PSC', name: 'Planning Section Chief', who: 'General Staff', desc: 'Situation and resource status, the Incident Action Plan, documentation.' },
  { id: 'lsc', abbr: 'LSC', name: 'Logistics Section Chief', who: 'General Staff', desc: 'Facilities, transport, supplies, communications, food and medical support for responders.' },
  { id: 'fsc', abbr: 'FSC', name: 'Finance/Admin Section Chief', who: 'General Staff', desc: 'Costs, time, emergency procurement and the LDRRMF, within COA rules.' },
];
export const roleOf = (id: string) => ROLES.find((r) => r.id === id) ?? ROLES[2]!;

export const FORMS: Record<string, string> = {
  '201': 'Incident Briefing', '202': 'Incident Objectives', '203': 'Organization Assignment List', '205': 'Radio Communications Plan',
  '206': 'Medical Plan', '208': 'Safety Message', '209': 'Incident Status Summary', '211': 'Check-in List', '213': 'General Message', '214': 'Activity Log',
  '215': 'Operational Planning Worksheet', '221': 'Demobilization Check-out',
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'mm-flood', name: 'Marikina–Pasig river flood under an enhanced monsoon', hazard: 'Flood',
    lgus: ['137402000', '137403000', '137404000', '137401000', '133900000'],
    blurb: 'A tropical storm enhances the southwest monsoon. The Marikina River rises; water moves downstream into Pasig and Manila.',
    context: 'The Marikina River drains into the Pasig River. A rise at the Sto. Niño gauge reaches downstream LGUs hours later, so an upstream decision is also a downstream warning. Marikina\'s alarm levels: 15 m prepare, 16 m evacuate, 18 m forced evacuation.',
    sources: ['Marikina City DRRMO alarm levels (PIA, Inquirer, Manila Bulletin reports)', 'NDRRMC Memo 131 s. 2018', 'RA 12287 and IRR'],
    phases: [
      {
        name: 'Forecast and PDRA', clock: 'D-2 · 09:00', eoc: 'white',
        situation: [
          'PAGASA forecasts a tropical storm to enhance the southwest monsoon over Luzon for the next three days, with heavy to intense rain over Metro Manila and the Marikina watershed.',
          'The MMDRRMC calls a pre-disaster risk assessment (PDRA) this afternoon. Your LGU has not yet met.',
        ],
        intel: 'Planning: your flood contingency plan has an activation set (clusters and EOC functions) and names the Sto. Niño gauge as a trigger. Three riverside barangays hold about a third of your flood-exposed households.',
        hint: 'Which step lets the LGU act before the rain peaks, and who needs to hear about it?',
        forms: ['201', '214'], discuss: 'Who in our LGU attends the MMDRRMC PDRA, and with what figures?',
        opts: [
          { t: 'Hold the LDRRMC PDRA this morning, raise the EOC to BLUE, run the contingency plan at BLUE and bring your exposure figures to the MMDRRMC PDRA; if the PDRA shows severe impact, prepare a request under RA 12287.', v: 'best', s: [92, 94, 88, 95, 92],
            why: 'The PDRA drives the EOC level (Memo 131, 9.2.1.1 impending hazard) and any anticipatory action under RA 12287. Bringing figures to the MMDRRMC lets neighbouring LGUs plan for water and evacuees that cross boundaries.' },
          { t: 'Raise the EOC to BLUE and pre-position boats, but skip the MMDRRMC PDRA; your LGU knows its river.', v: 'good', s: [78, 50, 60, 72, 85],
            why: 'Early readiness is right, but the flood does not stop at your boundary. Downstream LGUs and the clusters plan from the sub-regional PDRA.' },
          { t: 'Wait for the first alarm at 15 m before convening anyone.', v: 'unsafe', s: [35, 30, 35, 25, 15],
            why: 'At the first alarm the lead time for pre-positioning and pre-emptive evacuation is mostly gone. A forecast is the trigger for preparedness, not the water level.' },
          { t: 'Ask the Sangguniang Panlungsod to declare a state of calamity now so funds can be released.', v: 'weak', s: [45, 50, 55, 35, 55],
            why: 'A state of calamity (RA 10121, Sec. 16) answers a disaster that has happened. Before impact the instrument is a PDRA and, where it applies, RA 12287 anticipatory action.' },
        ],
      },
      {
        name: 'River at the second alarm', clock: 'D-day · 14:00', eoc: 'blue',
        situation: [
          'The Marikina River reaches 16 m at Sto. Niño (second alarm) and is rising about 0.3 m an hour. Rain continues over the watershed.',
          'Riverside households, many with older persons and persons with disabilities, are still at home. Pasig and Quezon City ask what you are seeing.',
        ],
        intel: 'Operations: your evacuation centres can take about 70% of the riverside population. Two schools are on the list as last-resort centres.',
        hint: 'The second alarm means evacuate. Who moves first, and who downstream needs your reading?',
        forms: ['213', '209'], discuss: 'What is our trigger for moving people who need assistance?',
        opts: [
          { t: 'Start pre-emptive evacuation of low-lying riverside areas, older persons and persons with disabilities first; raise the EOC to RED; share the gauge trend with Pasig, Quezon City and the MMDRRMC through OCD-NCR every hour.', v: 'best', s: [92, 95, 92, 95, 90],
            why: 'The second alarm is the evacuate stage. Moving those who need assistance first saves the most lives; an upstream reading is downstream lead time, so sharing it is part of the response (Memo 131, 9.1.3 links between EOCs).' },
          { t: 'Evacuate your riverside barangays but keep the readings in-house until the situation is clearer.', v: 'good', s: [80, 45, 55, 75, 82],
            why: 'Your own residents are protected, but downstream LGUs lose hours of warning they cannot get anywhere else.' },
          { t: 'Advise residents to watch the river and wait for the third alarm (18 m) for forced evacuation.', v: 'weak', s: [50, 45, 50, 35, 30],
            why: 'Waiting for forced evacuation puts the slowest movers on the move in the worst conditions.' },
          { t: 'Let families go back across the river to secure belongings before the water rises further.', v: 'unsafe', s: [25, 30, 30, 10, 30],
            why: 'Crossings during a rising river are a leading cause of drowning. The Safety Officer should stop it.' },
        ],
      },
      {
        name: 'Third alarm and overflowing centres', clock: 'D-day · 20:00', eoc: 'red',
        situation: [
          'The river passes 18 m (third alarm): forced evacuation. Your evacuation centres are at 120% of capacity.',
          'Pasig reports spare space in two centres on high ground. The CCCM cluster (DSWD-NCR) asks for registered family counts by sex, age and disability.',
        ],
        intel: 'Logistics: MMDA can lend two trucks for four hours. Your schools used as centres hold classes again on Monday.',
        hint: 'Who has to agree before your evacuees go to another LGU, and what do they need to know?',
        forms: ['211', '215'], discuss: 'Do we have a standing agreement with neighbouring LGUs for hosting evacuees?',
        opts: [
          { t: 'Request hosting through the MMDRRMC and the CCCM cluster; move families only once Pasig agrees, with MMDA trucks, a registered list (sex, age, disability) and your staff going with them.', v: 'best', s: [90, 96, 90, 94, 85],
            why: 'A receiving LGU must consent and plan its own centre. Registration and disaggregated counts let the CCCM cluster and the receiving LGU meet needs (JMC No. 02 s. 2021) and keep families traceable.' },
          { t: 'Open the remaining schools as overflow centres in your own LGU.', v: 'good', s: [75, 60, 65, 70, 80],
            why: 'It keeps people inside your jurisdiction, but schools are a last resort and RA 10821 limits how long they can be used; plan their return before Monday.' },
          { t: 'Keep everyone in the full centres; the water should peak tonight.', v: 'weak', s: [45, 35, 40, 30, 55],
            why: 'Crowding beyond capacity raises protection and health risks, and the peak is a forecast, not a fact.' },
          { t: 'Send the overflow to Pasig\'s centres now and tell Pasig when they arrive.', v: 'unsafe', s: [35, 15, 25, 30, 70],
            why: 'Moving people into another LGU without its consent overloads a centre that may already be planned for its own residents.' },
        ],
      },
      {
        name: 'Water recedes: return and stand-down', clock: 'D+3 · 08:00', eoc: 'red',
        situation: [
          'The river is below 15 m and falling. Families want to go home; some houses near the bank are damaged.',
          'The MMDRRMC asks for your damage assessment and whether you still need augmentation.',
        ],
        intel: 'Planning: RDANA teams can cover the riverside barangays in a day. Two hosted families in Pasig have members in hospital.',
        hint: 'What has to be true before the EOC goes down a level, and before people go home?',
        forms: ['209', '221'], discuss: 'What tells us it is safe to close a centre?',
        opts: [
          { t: 'Run the RDANA first, return families in phases once their houses are checked, keep centres open for those who cannot return, and lower the EOC to BLUE under a Memo 131 deactivation trigger when field operations no longer need it.', v: 'best', s: [92, 90, 88, 94, 85],
            why: 'Deactivation follows a stated trigger (Memo 131, 9.2.7). Phased return after checks avoids sending families into unsafe houses; those who cannot return still need a centre.' },
          { t: 'Lower the EOC to WHITE as soon as the river is below the first alarm.', v: 'weak', s: [50, 45, 50, 40, 70],
            why: 'The river reading is not the end of the emergency: families are still displaced and the damage is not yet assessed.' },
          { t: 'Close all centres today so schools can reopen on Monday.', v: 'unsafe', s: [35, 35, 40, 20, 65],
            why: 'Closing centres before houses are checked can return families to danger. Plan the schools\' return, but not at the cost of safety.' },
          { t: 'Keep the EOC on RED for another week to be safe.', v: 'good', s: [65, 60, 60, 65, 50],
            why: 'Cautious, but holding all resources on full alert without a need wears out staff and ties up assets other LGUs may need.' },
        ],
      },
    ],
  },
  {
    id: 'mm-quake', name: 'West Valley Fault earthquake (magnitude 7.2)', hazard: 'Earthquake',
    lgus: ['137404000', '137402000', '137403000', '137602000', '137607000', '137603000'],
    blurb: 'An evening earthquake on the West Valley Fault. Buildings collapse, fires start, communications fail across Metro Manila.',
    context: 'The MMEIRS scenario (Model 08, magnitude 7.2, 7 PM) projected about 34,000 deaths from collapsed buildings and some 18,000 more from fires. MMDA\'s Oplan Metro Yakal Plus organises the response in four quadrants.',
    sources: ['MMEIRS (JICA–MMDA–PHIVOLCS, 2004), Model 08', 'MMDA Oplan Metro Yakal Plus', 'NDRRMC Memo 131 s. 2018', 'NDRRMC MC No. 19 s. 2016'],
    phases: [
      {
        name: 'The first fifteen minutes', clock: 'D-day · 19:15', eoc: 'white',
        situation: [
          'Strong shaking for about 30 seconds. Power is out, mobile networks are jammed, and your EOC building has visible cracks.',
          'PHIVOLCS has not yet issued a bulletin. Staff on duty are shaken; two are missing.',
        ],
        intel: 'Logistics: the alternate EOC in your plan has a generator and HF radio. The radio net to OCD-NCR was last tested three months ago.',
        hint: 'Where does the EOC work from, and how does it reach the sub-regional council?',
        forms: ['201', '205'], discuss: 'Has our alternate EOC ever been opened for real?',
        opts: [
          { t: 'Move to the alternate EOC, account for staff, set the EOC to RED on an ongoing emergency, have the Responsible Official designate an Incident Commander, and report to OCD-NCR by HF radio.', v: 'best', s: [94, 90, 90, 94, 92],
            why: 'A damaged building is not a safe EOC (Memo 131, 9.1.5–9.1.6 alternate EOC). RED on an ongoing emergency (9.2.1.3); a designated IC gives unity of command; radio works when networks fail.' },
          { t: 'Stay in the cracked building; moving will waste time.', v: 'unsafe', s: [35, 40, 45, 15, 60],
            why: 'Aftershocks can bring down a damaged structure on the very team that must lead the response. The Safety Officer should order the move.' },
          { t: 'Wait for the PHIVOLCS bulletin before activating anything.', v: 'weak', s: [45, 40, 40, 30, 20],
            why: 'The shaking itself is the trigger. A bulletin will confirm magnitude and location; it does not change what must happen now.' },
          { t: 'Send all available staff out to search for survivors at once.', v: 'good', s: [55, 45, 45, 60, 80],
            why: 'The urge is right, but without a command post, check-in and accountability, teams duplicate effort and cannot be redeployed.' },
        ],
      },
      {
        name: 'Rescue requests beyond capacity', clock: 'D-day · 21:30', eoc: 'red',
        situation: [
          'Forty collapse sites and six fires are reported in your LGU. You have three rescue teams and two fire trucks; BFP units are committed.',
          'Neighbouring LGUs report the same. Volunteers and private equipment owners arrive at your command post.',
        ],
        intel: 'Operations: three sites are schools and a hospital annex. Two fires are near an LPG storage area.',
        hint: 'How do you decide where three teams go, and how do outside resources join?',
        forms: ['211', '215', '204'], discuss: 'Do we have a check-in point for volunteers and private equipment?',
        opts: [
          { t: 'Prioritise sites by lives at risk and spread hazard (the LPG area first for BFP), set a check-in point for volunteers and private equipment, form a Unified Command with BFP, and request augmentation through the MMDRRMC quadrant.', v: 'best', s: [94, 94, 88, 95, 88],
            why: 'Triage of sites saves the most lives; check-in (ICS 211) keeps responders accountable; Unified Command joins agencies with their own mandates (MC No. 4 s. 2012); Oplan Metro Yakal Plus routes augmentation by quadrant.' },
          { t: 'Send the teams to the sites that called first.', v: 'weak', s: [50, 40, 45, 35, 70],
            why: 'First-called is not most-at-risk. Without triage, teams can be tied up where few lives are at stake.' },
          { t: 'Turn away volunteers and private equipment; only government teams may respond.', v: 'weak', s: [55, 30, 40, 40, 60],
            why: 'Organised, checked-in volunteers and equipment are a real capacity. The answer is to bring them under ICS, not to send them away.' },
          { t: 'Let volunteers go to any site they choose to speed things up.', v: 'unsafe', s: [25, 25, 30, 20, 65],
            why: 'Untracked rescuers in collapsed structures are at risk themselves, and nobody knows who is where if an aftershock hits.' },
        ],
      },
      {
        name: 'Open spaces and the dead and missing', clock: 'D+1 · 09:00', eoc: 'red',
        situation: [
          'Thousands are sleeping in open spaces; aftershocks continue. Bodies are being brought to the barangay hall.',
          'Families post names of the missing on social media; reports conflict.',
        ],
        intel: 'Planning: your contingency plan names two open spaces as camp sites but they have not been checked for damaged structures nearby.',
        hint: 'Which cluster leads on the dead and missing, and how are camp sites made safe?',
        forms: ['209', '213'], discuss: 'Who in our LGU can run a family tracing desk?',
        opts: [
          { t: 'Screen the open spaces for nearby damaged structures before opening camps, register families there, and set up the dead and missing process under NDRRMC MC No. 19 with a single verified list and a family tracing desk.', v: 'best', s: [90, 92, 94, 94, 85],
            why: 'A camp next to a damaged building is a new hazard. MDM under MC No. 19 s. 2016 (DILG-led cluster) protects identification and dignity; one verified list answers families and stops rumours.' },
          { t: 'Let people stay wherever they are; formal camps can wait.', v: 'weak', s: [45, 40, 40, 35, 60],
            why: 'Scattered sites cannot be supplied, protected or counted; protection risks rise for women and children.' },
          { t: 'Post the names of the dead on the LGU page as soon as bodies arrive.', v: 'unsafe', s: [35, 30, 15, 20, 60],
            why: 'Unverified identification hurts families and breaks the MDM process. Names go to families first, after verification.' },
          { t: 'Use school buildings as camps since they are the largest structures.', v: 'good', s: [65, 60, 60, 60, 70],
            why: 'Large, but only after a structural check; schools also need to return to learners (RA 10821).' },
        ],
      },
      {
        name: 'Declaration and recovery', clock: 'D+5 · 10:00', eoc: 'red',
        situation: [
          'Several Metro Manila LGUs are affected. Your Sanggunian is ready to declare a state of calamity; the NDRRMC is considering a recommendation for the region.',
          'Search and rescue is winding down; shelter and debris are the next problems.',
        ],
        intel: 'Finance: the Quick Response Fund is nearly used. A state of calamity allows price controls and use of the remaining LDRRMF for response.',
        hint: 'Who declares a state of calamity for one LGU, and who for a cluster of LGUs?',
        forms: ['209', '221'], discuss: 'What do we stop doing when SRR ends?',
        opts: [
          { t: 'Have the Sanggunian declare a state of calamity for your LGU on the LDRRMC\'s recommendation, report through the MMDRRMC so the NDRRMC can recommend a regional declaration to the President, and shift the EOC plan from SRR to shelter, debris and early recovery.', v: 'best', s: [90, 92, 90, 94, 85],
            why: 'RA 10121 Sec. 16: the local sanggunian declares for its LGU on the LDRRMC\'s recommendation; for a cluster of LGUs the NDRRMC recommends the declaration to the President. Response objectives change as SRR ends.' },
          { t: 'Wait for a presidential declaration before doing anything at the LGU level.', v: 'weak', s: [45, 50, 45, 35, 30],
            why: 'The LGU can declare for itself; waiting delays its own funds and measures.' },
          { t: 'Have the Mayor declare a state of calamity by executive order.', v: 'weak', s: [50, 40, 50, 30, 70],
            why: 'Under RA 10121 Sec. 16 the local sanggunian declares, on the LDRRMC\'s recommendation.' },
          { t: 'Close the EOC now that rescue has ended.', v: 'unsafe', s: [30, 30, 30, 20, 60],
            why: 'Thousands are still displaced. The EOC lowers its level only when a Memo 131 deactivation trigger is met.' },
        ],
      },
    ],
  },
  {
    id: 'mm-surge', name: 'Storm surge along the Manila Bay coast', hazard: 'Storm surge',
    lgus: ['137503000', '137502000', '133900000', '137605000', '137604000', '137601000'],
    blurb: 'A strong typhoon tracks close to Manila Bay with a storm surge warning for the coast from Navotas to Las Piñas.',
    context: 'The coastal LGUs of Manila Bay share the same surge and the same roads out. Fisherfolk and informal settlers on the shoreline are the most exposed and often the most reluctant to leave.',
    sources: ['PAGASA storm surge warnings', 'NDRRMC Memo 131 s. 2018', 'RA 12287 and IRR'],
    phases: [
      {
        name: 'Storm surge warning', clock: 'D-2 · 11:00', eoc: 'blue',
        situation: [
          'PAGASA issues a storm surge warning of up to 2–3 m for coastal areas of Metro Manila within 48 hours.',
          'The MMDRRMC asks the six coastal LGUs to agree a common timeline for evacuation and for road use.',
        ],
        intel: 'Planning: your shoreline barangays hold many fisherfolk families. The coastal road is also the route out for two neighbouring LGUs.',
        hint: 'What has to be agreed between coastal LGUs before anyone moves?',
        forms: ['201', '202'], discuss: 'Do the coastal LGUs share one evacuation timeline?',
        opts: [
          { t: 'Agree a common pre-emptive evacuation start time and road plan with the other coastal LGUs through the MMDRRMC, ask the PCG to advise against sailing, and prepare an RA 12287 request if the PDRA shows severe impact.', v: 'best', s: [92, 95, 90, 94, 92],
            why: 'Shared roads need a shared timeline or the LGUs block each other. The PCG addresses fisherfolk at sea; RA 12287 lets the LGU act on the forecast.' },
          { t: 'Start your own evacuation now without telling the others; the earlier the better.', v: 'good', s: [70, 40, 55, 70, 88],
            why: 'Early is good, but an uncoordinated start can jam the shared coastal road just as neighbours begin moving.' },
          { t: 'Wait until the surge warning height is confirmed nearer landfall.', v: 'weak', s: [45, 45, 45, 35, 25],
            why: 'Surge warnings are given early because coastal evacuation takes long. Waiting shortens the window.' },
          { t: 'Tell fisherfolk to secure their boats at sea away from the coast.', v: 'unsafe', s: [25, 30, 30, 10, 50],
            why: 'Lives at sea during a typhoon are at the greatest risk. Advise them to stay ashore and evacuate.' },
        ],
      },
      {
        name: 'Families who refuse to leave', clock: 'D-1 · 16:00', eoc: 'red',
        situation: [
          'About a quarter of shoreline households refuse to leave, afraid of losing boats and belongings.',
          'The surge is expected around high tide early tomorrow.',
        ],
        intel: 'Operations: BDRRMC volunteers know each household. The LCE has signed an order for forced evacuation of high-risk shoreline areas.',
        hint: 'What usually moves reluctant families, and how is the order enforced with respect?',
        forms: ['213', '214'], discuss: 'What did we promise people about their belongings last time?',
        opts: [
          { t: 'Go house to house with BDRRMC volunteers who know the families, explain the surge in plain language, arrange secure storage or watch for boats and belongings, and apply the LCE\'s order with police support only as a last resort, prioritising children, older persons and persons with disabilities.', v: 'best', s: [92, 90, 95, 94, 85],
            why: 'Trusted messengers and a credible answer to "what happens to my boat" move most families; the order is applied with care, and those least able to self-evacuate go first.' },
          { t: 'Send the police to remove everyone tonight.', v: 'weak', s: [55, 45, 30, 45, 75],
            why: 'Force first breaks trust and can push families to return during the storm. Persuasion first, enforcement last.' },
          { t: 'Leave those who refuse; they made their choice.', v: 'unsafe', s: [30, 30, 30, 10, 60],
            why: 'A surge of 2–3 m on the shoreline is life-threatening; the LGU has the duty and the order to protect them.' },
          { t: 'Broadcast a final warning by public address and social media.', v: 'good', s: [60, 55, 70, 60, 80],
            why: 'Useful, but a broadcast rarely moves a family that has already refused; it needs a face-to-face visit.' },
        ],
      },
      {
        name: 'Surge and rescues', clock: 'D-day · 05:30', eoc: 'red',
        situation: [
          'The surge overtops a section of the coastal wall. Water is waist-deep in two shoreline barangays; families who stayed call for rescue.',
          'Your rescue boats are deployed; a neighbouring LGU offers one more boat team.',
        ],
        intel: 'Safety: winds are still above safe limits for small boats for the next two hours.',
        hint: 'When is it safe to send boats, and how does the offered team join?',
        forms: ['208', '211'], discuss: 'Who decides that conditions are safe for boat rescue?',
        opts: [
          { t: 'Hold boats until the Safety Officer clears conditions, keep callers on the line with shelter-in-place advice, accept the neighbour\'s team through check-in, and launch together as soon as winds drop.', v: 'best', s: [94, 92, 90, 95, 85],
            why: 'Responder safety comes first (the Safety Officer can stop unsafe acts). Shelter-in-place advice keeps callers alive until boats can go; check-in brings the extra team under one plan.' },
          { t: 'Launch all boats now; every minute counts.', v: 'unsafe', s: [35, 40, 40, 20, 80],
            why: 'Small boats in typhoon winds can capsize and add rescuers to the victims.' },
          { t: 'Decline the neighbour\'s team; your teams can handle it.', v: 'weak', s: [55, 35, 45, 45, 70],
            why: 'Calls exceed your boats. An offered team, checked in, is capacity you need.' },
          { t: 'Ask the neighbour\'s team to go to any barangay they like.', v: 'weak', s: [40, 45, 40, 40, 70],
            why: 'Free-lancing teams duplicate effort and cannot be accounted for.' },
        ],
      },
      {
        name: 'After the surge', clock: 'D+1 · 09:00', eoc: 'red',
        situation: [
          'The water has gone; debris and damaged houses line the shore. Evacuees want to return; fishing boats are lost.',
          'The MMDRRMC compiles damage and needs across the coastal LGUs.',
        ],
        intel: 'Planning: two centres are schools that must reopen. The surge reached about 200 m inland at its furthest.',
        hint: 'Which families can go home first, and what feeds into recovery?',
        forms: ['209', '221'], discuss: 'Should some shoreline homes be rebuilt at all?',
        opts: [
          { t: 'Do the RDANA, return families in phases where houses are safe, move remaining families from schools to non-school centres before classes resume, and report damage and livelihood losses (boats) through the MMDRRMC for recovery planning.', v: 'best', s: [90, 92, 90, 94, 85],
            why: 'Assessment before return; schools returned to learners (RA 10821); livelihood losses reported early feed the recovery plan and any no-build or relocation decision.' },
          { t: 'Let everyone return today; the water is gone.', v: 'unsafe', s: [35, 35, 40, 20, 70],
            why: 'Damaged houses, debris and contaminated water are still hazards.' },
          { t: 'Keep everyone in the centres until all houses are rebuilt.', v: 'weak', s: [50, 45, 50, 40, 50],
            why: 'Long stays in centres harm health and livelihoods; families whose houses are safe should return.' },
          { t: 'Report only deaths and injuries; livelihood damage is not the EOC\'s concern.', v: 'weak', s: [55, 40, 45, 40, 70],
            why: 'Lost boats are lost income. Damage and needs reporting covers livelihoods so recovery can address them.' },
        ],
      },
    ],
  },
];
export const scenarioOf = (id: string) => SCENARIOS.find((s) => s.id === id);
