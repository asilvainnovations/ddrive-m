# Third-party notices

## MODE (Ormoc City CDRRMO operations platform, `ormoc-drrm-ops`)

Licensed under the Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0). The MODE licence file names no copyright owner.

These DDRiVE-M files contain code adapted from MODE (ADR-019). The changes are listed in each file's header:

| DDRiVE-M file | Adapted from | Changes |
|---|---|---|
| `src/lib/ics/engine.ts` | `src/features/tools/ics/engine.ts` | Scenario data moved out; doctrine patterns rewritten for Metro Manila; position drills and the browser run store removed |
| `src/content/ics/metroManila.ts` | `src/features/tools/ics/ics-data.json` (role definitions and decision format) | Roles rewritten for a multi-LGU setting; all scenarios are new |
| `src/lib/echo.ts` | `src/domain/echo.ts` | Benchmarks and water, space and toilet checks kept; multi-LGU roll-up and host suggestions are new |
| `src/lib/floodWatch.ts` | `src/domain/floodScreen.ts` | Watch list rebuilt on the DDRiVE-M flood outlook (ADR-016) with an LGU roll-up; the benefit-cost screen is kept |

Unless required by applicable law or agreed to in writing, software distributed under the Apache License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
