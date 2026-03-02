# Changelog

All notable changes to the "fonted" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.2.1] - 2026-02-03

- Improved error handling and user-facing error messages
- Added structured logging via a dedicated Output Channel
- Tightened TypeScript compiler checks
- Cleaned up stale dependencies
- Fixed double restart prompt when reloading fonts
- Updated CI workflow to use Bun
- Improved README documentation

## [1.2.0] - 2025-06-21

- Anticipate workbench directory change

## [1.1.0] - 2024-10-30

- Change back to `workbench.html`. At this point VS Code is just playing hide and seek.

## [1.0.0] - 2024-10-03

- Meet VS Code 1.94.0 API changes:
  - `workbench.html` renamed to `workbench.esm.html`
  - Remove use of `require.main`

## [0.0.6] - 2023-05-01

- Set `extensionKind` to `ui`. Resolves [#1](https://github.com/blackmann/fonted/issues/1).

## [0.0.1] - Initial release

- Initial release
