# B1.5 QA Image Set Needed

Date: 2026-06-28
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Branch checked: `feature/b1-4-brand-architecture-photo-ux`
Preview checked: `https://6a415b6952fddc66d29243b1--mosapack.netlify.app`

## Status

B1.5 mixed-photo QA is blocked because the required private image folder does not exist:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

No 20-photo QA was run.
No private photos were committed.
No public app code was changed.
No production deploy was run.
No B2 implementation was started.

## What Was Verified Before Blocking

The B1.4 preview routes returned HTTP 200:

- `/`
- `/builder/`
- `/contact/`
- `/assets/scenes/office-1920x1080.jpg`

Production exposure baseline passed:

- old raw builders not exposed
- old dashboards not exposed
- Netlify Forms detected
- no suspicious fetched public HTML strings detected

## Required Private Folder

Derek should create:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

Add 20 private test images. Do not commit this folder or the images.

## Suggested Filenames

Use this naming pattern:

- `pet-01.jpg`
- `pet-02.jpg`
- `pet-03.jpg`
- `pet-04.jpg`
- `pet-05.jpg`
- `couple-01.jpg`
- `couple-02.jpg`
- `couple-03.jpg`
- `family-01.jpg`
- `family-02.jpg`
- `family-03.jpg`
- `memorial-01.jpg`
- `memorial-02.jpg`
- `memorial-03.jpg`
- `baby-kids-01.jpg`
- `baby-kids-02.jpg`
- `baby-kids-03.jpg`
- `other-01.jpg`
- `other-02.jpg`
- `other-03.jpg`

Accepted formats for the QA script/manual run:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.heic`

## Image Mix Requirements

The folder should include:

- 5 pet photos
- 3 couple/wedding photos
- 3 family photos
- 3 memorial-style photos
- 3 baby/kids photos
- 3 corporate/logo/other photos

Include a realistic mix where possible:

- portrait and landscape
- light subjects and dark subjects
- subject near edge
- busy backgrounds
- multiple people or pets
- one low-resolution image
- one flat logo or graphic

## Next Step

After the private image folder exists with at least 20 image files, rerun B1.5 mixed-photo QA from the B1.4 branch.
