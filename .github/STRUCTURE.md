# Internal .github Folder Structure

This document explains the purpose of the files under `.github/`.

## Files

- `copilot-instructions.md`: Repository-wide AI assistance instructions.
- `instructions/stack-react-ts.instructions.md`: Stack-specific generation guidance.
- `chatmodes/` (if present): Custom chat modes for consistent architectural/QoS alignment.
- `workflows/`: GitHub Actions (CI / Deployment).

## Notes

These files are intentionally kept out of the main README to avoid confusing contributors and to prevent GitHub from choosing the wrong README for the repository homepage.

If you add a new instruction or workflow, briefly document it here for future maintainers.
