# MosaPack Brand Architecture

## Core Brand

MosaPack turns meaningful photos into custom mosaic reveal kits.

## Core Builder

The canonical builder is photo-agnostic and supports any suitable image. It should work for pets, couples, families, memorials, kids, logos, holiday gifts, and premium portrait use cases without changing the core product architecture.

## First GTM Vertical

Pets are the first campaign wedge because they are emotional, visual, shareable, and easy to target. Pet copy can lead specific campaigns, examples, and category defaults, but it should not define the entire MosaPack brand.

## Future Verticals

- Pet Reveal Kits
- Wedding / Couple Gifts
- Family Memory Kits
- Baby / Kids
- Memorial Tribute Kits
- Corporate / Logo Gifts
- Holiday Gifts
- Premium Brick Portraits

## Copy Rules

Use globally:

- photo
- image
- subject
- custom proof
- meaningful photo
- gift
- mosaic reveal kit

Use pet-specific copy only as:

- campaign examples
- default selected category
- first use-case tile
- landing page section examples

Avoid globally:

- pet-only title
- “your pet” where “your photo” works
- “pet proof” where “custom proof” works
- product architecture that assumes every upload is a pet

## Recommended Global Positioning

“Create a custom mosaic from any meaningful photo. Preview it free, then request a custom proof before production.”

## Implementation Rule

Future verticals should reuse the canonical builder with category metadata and campaign copy. Do not create separate builders or product forks for each vertical unless a future conversion test proves a separate route is necessary.
