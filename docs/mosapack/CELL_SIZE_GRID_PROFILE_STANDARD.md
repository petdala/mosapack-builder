# Cell Size Grid Profile Standard

Date: 2026-07-07
Status: documented standard; fine-cell runtime output not implemented.

## Purpose

Separate grid count from physical cell size and finished size.

The current schema v1.1 shortcut:

```text
size_in == grid / 2
```

is only true because current production assumes:

```text
cell_size_in = 0.5
```

Future schemas should model `cell_size_in` and `finished_size_in` explicitly.

## Current Profiles

| Profile | Grid | Cell size | Finished size | Status |
| --- | ---: | ---: | ---: | --- |
| `standard_12` | 24x24 | 0.5in | 12in | commercial MVP target |
| `gallery_16` | 32x32 | 0.5in | 16in | premium proof option |
| `signature_24` | 48x48 | 0.5in | 24in | made-to-order beta |

## Future Profiles

| Profile | Grid | Cell size | Finished size | Status |
| --- | ---: | ---: | ---: | --- |
| `fine_12` | 32x32 | 0.375in | 12in | vendor-first / borderline DIY |
| `micro_12` | 48x48 | 0.25in | 12in | vendor-only / deferred |

## DIY Feasibility

- Minimum realistic DIY loose-sticker size is about 0.5in.
- 0.375in may be borderline and must be physically tested.
- 0.25in is not customer-DIY for loose stickers.

## v1 Rule

Do not mix cell sizes inside one physical kit for v1.

Gate A remains:

```text
OL2050 / 0.5in stickers
```

Smaller cells remain future vendor/POD-only profiles until peel/place evidence proves they are buildable.
