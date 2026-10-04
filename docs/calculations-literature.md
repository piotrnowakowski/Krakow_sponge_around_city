# Calculations and literature in the app

Open **About → Calculations & literature**, use the matching button in **Room for the river**, or follow the link in **story step 5**. The section is available in English and Polish and uses the selected proposal's measured values (or the default example when none is selected).

## Calculation basis

- **Meanders:** current length `L₁`, proposed length `L₂`, extra length `L₂ − L₁`, percentage `100 × (L₂ − L₁) / L₁`. Distances use EPSG:2180. Amplitudes, target gain, screening cutoffs and obstacle buffers are project choices, not values validated by the literature. See [the reproducible method](meander-concepts.md).
- **Ditch estimate:** `V = mapped length × assumed cross-section × fill factor`, with the assumptions read from `retention.json`. The current values are 1.0 m² and 0.5, or 50 m³ for an illustrative 100 m ditch per filling. This is a channel-volume estimate, with no calculated recharge or peak-flow reduction.
- **Related partial-barrier work:** the earlier project review describes a local comparison using Manning flow, notch/crest discharge and continuity. Initial water plus inflow equals outflow, bank escape and final water. It is described separately from the static volume estimate and from meander geometry. None of the papers below calibrates the local candidate geometry or inflow assumptions.

## Reviewed sources and their role

The three field studies, USACE references and NatureScot guidance were recorded in the project's earlier ditch-barrier review. The restoration guidance below was checked while adding the meander explanation. This is an annotated methods bibliography, not a systematic literature review. Source pages and research abstracts were checked on 4 October 2026; the full Polish handbook was not reviewed in this update.

| Reference | What it contributes | Boundary |
|---|---|---|
| [River Restoration Centre, DS1](https://www.therrc.co.uk/ds1-restoring-meanders) | Historical-channel evidence and local energy/sediment analysis for remeandering. | Does not justify a universal sine-wave shape or 20% target. |
| [Wody Polskie, KPRWP](https://www.gov.pl/web/wody-polskie/krajowy-program-renaturyzacji-wod-powierzchniowych) | Polish restoration context and the need for local assessment. | Programme guidance is not site approval or model calibration. |
| [Muhawenimana et al. (2023)](https://orca.cardiff.ac.uk/id/eprint/160143/), DOI 10.1016/j.jhydrol.2023.129744 | Observed backwater, overbank flow and delayed release from leaky barriers, affected by barrier and storm conditions. | UK measured storage is not assigned to Kraków. |
| [Holden et al. (2017)](https://eprints.whiterose.ac.uk/id/eprint/104376/), DOI 10.1002/hyp.11031 | Flow redistribution and changing effects during a four-year peatland ditch-blocking trial. | Less ditch discharge is not equivalent to permanent storage; peat soils are not local agricultural-soil calibration. |
| [Roberts et al. (2024)](https://abdn.elsevierpure.com/en/publications/new-data-based-analysis-tool-for-functioning-of-natural-flood-man/), DOI 10.1016/j.jhydrol.2024.131164 | Outlet and soil-condition effects on drainage at temporary storage areas. | Provides no transferable benefit percentage for the mapped river/ditch candidates. |
| USACE [HEC-HMS continuity and routing](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/reservoir-modeling/reservoir-modeling-concepts-and-equations), HEC-RAS [uniform flow](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/stable-channel-design-functions/uniform-flow-computations) and [weir flow](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations) | Hydraulic equations behind the related barrier calculation. | The geometric proposal and simple storage estimate are not HEC simulations. |
| [NatureScot, Peatland ACTION dam guidance](https://www.nature.scot/doc/peatland-action-guidance-land-managers-installing-peat-and-plastic-dams) | Terrain and backwater considerations in peat-dam placement. | Peat construction details and spacings are not imported into agricultural-ditch screening. |
