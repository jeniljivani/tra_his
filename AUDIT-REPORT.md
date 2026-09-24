# TraHis v25 — Icon Fix / Stability Patch

## Patch
- Fixed missing **Settings** icon in the side drawer.
- Root cause: the project bundled Bootstrap Icons stylesheet does not define `bi-sliders2`, while the drawer referenced that unsupported class.
- Replaced the unsupported class with bundled `bi-gear-fill` across all shared drawer markup and tutorial metadata.
- Bumped the service-worker cache namespace to `trahis-v25` so the corrected HTML is not hidden by an older cached shell.

## Verification
- No remaining `bi-sliders2` references in HTML/JS.
- `bi-gear-fill` exists in the bundled `assets/bootstrap-icons.css`.
- All HTML pages retain the Settings drawer entry.
- Service-worker cache namespace is v25.
