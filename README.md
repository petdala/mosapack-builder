# MosaPack Clean Launch Repo

This repository contains the minimal MosaPack launch surface extracted from the historical mixed workspace.

## Publish Root

Netlify must publish only `public/`.

## Included

- One landing page: `public/index.html`
- One canonical builder: `public/builder/index.html`
- Legal/contact pages under `public/legal/` and `public/contact/`
- MosaPack execution docs under `docs/mosapack/`

## Excluded

Historic builder variants, unrelated apps, reporting surfaces, archived bundles, virtualenvs, node_modules, and old git history are intentionally excluded.

## Current Rule

Run A0 credential rotation before launch work. Do not deploy until the clean repo has passed credential exposure review.
