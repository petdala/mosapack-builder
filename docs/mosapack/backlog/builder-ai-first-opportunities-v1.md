# Builder AI-First Opportunities v1

Status: deferred backlog.

These ideas may improve the proof builder later, but they are intentionally not part of the commercial wow completion pass. The current builder stays lightweight, honest, and proof-first while supplier and fulfillment validation continues.

## Deferred Opportunities

| Opportunity | Why It Could Help | Why It Is Deferred |
| --- | --- | --- |
| Auto-crop via face or subject detection | Could reduce crop friction for portraits, pets, and baby photos. | Adds model/runtime complexity before the proof path needs it. |
| Blur or darkness quality gate | Could warn customers earlier when a photo is likely weak. | Must not become a public quality score or block proof requests unfairly. |
| Auto style suggestion | Could recommend Bright Pop, Calm Background, or Mono Keepsake based on the image. | Current manual style presets are simpler and more transparent. |
| Category inference | Could prefill Pet, Family, Baby or kids, and similar categories. | Avoids heavier inference and privacy questions in the first public builder. |
| Text-to-theme style generation | Could create themed looks from customer prompts. | Risks fake image effects and product drift away from honest mosaic cells. |
| Background removal | Could help busy photos. | Supplier/physical validation should happen before adding heavier image dependencies. |
| Face-detail priority map | Could preserve faces better in the cell map. | Explicitly deferred until the proof workflow and physical output are stable. |

## Guardrails

- Do not add checkout, payment, pricing, shipping, or production promises to the public builder.
- Do not add public quality scores or badges.
- Do not expose advanced settings, renderer internals, or operator controls to normal customers.
- Every preview cell must continue to represent a real producible mosaic color and placement.
