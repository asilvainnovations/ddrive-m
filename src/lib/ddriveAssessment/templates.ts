// Starting sets of hazard events for common Philippine settings (ADR-006). They prefill unscored rows; the workshop
// decides which apply and scores them. Every row uses the DDRiVE catalogue names, so the database accepts it.
import type { FamilyCode } from './scoring';

export interface TemplateRow { family_code: FamilyCode; main_hazard: string; hazard_event: string }
export interface Template { key: string; label: string; description: string; rows: TemplateRow[] }

const r = (family_code: FamilyCode, main_hazard: string, hazard_event: string): TemplateRow => ({ family_code, main_hazard, hazard_event });

export const TEMPLATES: Template[] = [
  {
    key: 'blank', label: 'Blank', description: 'Start with no hazard events and add them one by one.', rows: [],
  },
  {
    key: 'coastal_lgu',
    label: 'Coastal LGU',
    description: 'Typhoon-exposed coastal city or municipality: wind, storm surge, coastal and river floods, rain-induced landslides, earthquake and tsunami.',
    rows: [
      r('H3', 'Tropical Cyclone', 'Wind'),
      r('H3', 'Tropical Cyclone', 'Storm Surge'),
      r('H3', 'Tropical Cyclone', 'Rain'),
      r('H2', 'Flood', 'Riverine Flood'),
      r('H2', 'Flood', 'Flash Flood'),
      r('H2', 'Wave Action', 'Coastal Flood'),
      r('H2', 'Wave Action', 'Coastal Erosion'),
      r('H2', 'Landslide', 'Landslide following event'),
      r('H1', 'Earthquake', 'Ground movement'),
      r('H1', 'Earthquake', 'Liquefaction'),
      r('H1', 'Earthquake', 'Tsunami'),
      r('H5', 'Disease', 'Bacterial Disease'),
    ],
  },
  {
    key: 'upland_lgu',
    label: 'Upland LGU',
    description: 'Mountainous municipality: landslides and debris flows, flash floods, typhoon wind and rain, earthquake, drought and fire.',
    rows: [
      r('H2', 'Landslide', 'Landslide following event'),
      r('H2', 'Landslide', 'Mudfall/Rockfall/Debris'),
      r('H2', 'Flood', 'Flash Flood'),
      r('H3', 'Tropical Cyclone', 'Wind'),
      r('H3', 'Tropical Cyclone', 'Rain'),
      r('H1', 'Earthquake', 'Ground movement'),
      r('H1', 'Earthquake', 'Landslide following event'),
      r('H4', 'Drought', 'Land Fire of Brush/Bush/Pasture'),
      r('H4', 'Wildfire', 'Forest Fire'),
    ],
  },
  {
    key: 'volcanic_area',
    label: 'Near an active volcano',
    description: 'Communities within a volcano hazard zone: ash fall, pyroclastic flows, lava, lahar, plus earthquake and typhoon rain.',
    rows: [
      r('H1', 'Volcanic Activity', 'Ash fall'),
      r('H1', 'Volcanic Activity', 'Pyroclastic flow'),
      r('H1', 'Volcanic Activity', 'Lava flow'),
      r('H1', 'Volcanic Activity', 'Lahar'),
      r('H1', 'Earthquake', 'Ground movement'),
      r('H3', 'Tropical Cyclone', 'Rain'),
      r('H2', 'Flood', 'Flash Flood'),
    ],
  },
  {
    key: 'urban_city',
    label: 'Highly urbanised city',
    description: 'Dense city: urban flood, earthquake and fire following, typhoon, heat, epidemics, and technological hazards.',
    rows: [
      r('H2', 'Flood', 'Flash Flood'),
      r('H2', 'Flood', 'Riverine Flood'),
      r('H1', 'Earthquake', 'Ground movement'),
      r('H1', 'Earthquake', 'Fire following event'),
      r('H1', 'Earthquake', 'Liquefaction'),
      r('H3', 'Tropical Cyclone', 'Wind'),
      r('H3', 'Extreme Temperature', 'Heatwave'),
      r('H5', 'Disease', 'Viral Disease'),
      r('H7', 'Technological hazard', 'Power outage'),
      r('H7', 'Technological hazard', 'Structural collapse'),
      r('H7', 'Chemical and radiological hazard', 'Industrial explosion'),
      r('H7', 'Transportation accidents', 'Road accident'),
    ],
  },
  {
    key: 'enterprise_site',
    label: 'Enterprise or facility',
    description: 'A business site or public facility (business continuity): flood, typhoon, earthquake, fire, power outage and spills.',
    rows: [
      r('H2', 'Flood', 'Flash Flood'),
      r('H3', 'Tropical Cyclone', 'Wind'),
      r('H1', 'Earthquake', 'Ground movement'),
      r('H1', 'Earthquake', 'Fire following event'),
      r('H7', 'Technological hazard', 'Power outage'),
      r('H7', 'Technological hazard', 'Industrial disaster'),
      r('H7', 'Chemical and radiological hazard', 'Chemical spill'),
      r('H5', 'Disease', 'Viral Disease'),
    ],
  },
];
