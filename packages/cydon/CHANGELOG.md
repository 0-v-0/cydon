# Changelog

All notable functional changes to the `cydon` package are documented here.
Releases before 0.2.0 are not covered.

## 0.2.0

### Changed

- The events API (`EventOf`, `on`/`off`/`emit`, event types) moved to a
  dedicated subpath: `import { EventOf } from 'cydon/events'`. It is no
  longer exported from the root entry or included in the IIFE bundle
  (`cydon.iife.js`), keeping the script-tag build at ~3.3 kB brotli. ESM
  imports and type declarations are unchanged apart from the path;
  script-tag users can switch to the native `EventTarget`.

### Added

- Generic data typing: `CydonOf` instances accept a data type parameter —
  `new Cydon<{ count: number }>()` — with full typing on `data`/`$data`.
- c-for scope chain: item templates can read data from outer scopes, and
  nested `c-for` loops resolve their arrays from parent scopes. Item data
  objects are prototype-linked to the parent data, so the lookup is native.
- Development builds warn when a binding modifies state during a commit —
  such a write would not be rendered reactively.
- The progressive-enhancement walker for the `c-data` attribute ships from a
  dedicated subpath: `import 'cydon/declarative'` (ESM) or a
  `<script src="…/declarative.iife.js">` tag placed after the main bundle. The
  walker was previously unreferenced dead code and never shipped in any
  bundle.

### Fixed

- Two `c-for` loops over the same array field both stay live: array writes
  fan out to every registered loop instead of the second accessor silently
  replacing the first.
- The bind walk keeps DOM indices valid when the DOM is mutated mid-bind
  (c-if swapping itself for its anchor, templates removing themselves), and
  `c-for` clearing only removes items its own loop rendered.
- `bind()` handles a missing DOM node when the DOM was mutated after compile
  instead of derailing the walk.
- c-model: binding a plain data property no longer compiles an eval'd
  function, avoiding CSP violations in getter and setter.
- Scope fallback on `set` only applies to direct writes on the scope proxy,
  fixing property writes landing in the wrong scope.
- `c-model.lazy` development warning only fires where the modifier actually
  has no effect.
- Type declarations bundle only library sources.

### Removed

- The `$limits` field. The documented per-property update cap never engaged:
  loop protection is structural — a commit is a single pass and writes made
  during it never re-enter the queue. Code assigning `$limits` should be
  removed.
- The UMD/CommonJS build (`cydon.umd.cjs`): the Vite 6+ lib pipeline no
  longer supports the `umd` format. The package now ships ESM only
  (`cydon`, `cydon/events`, `cydon/declarative`) plus the IIFE global build;
  Node 22.12+ can `require()` the ESM entry directly.
