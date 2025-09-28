# .github folder guide

This repository uses the official VS Code Copilot customization structure to keep AI-generated code consistent with our project standards.

- .github/copilot-instructions.md
  - Repository-wide custom instructions automatically applied to chat in this workspace.
  - See docs: https://code.visualstudio.com/docs/copilot/customization/custom-instructions#_use-a-githubcopilotinstructionsmd-file

- .github/instructions/
  - Contains one or more task- or language-scoped instructions files using the `.instructions.md` extension.
  - We include `stack-react-ts.instructions.md` for React+TS+Vite+XState+Tailwind guidance.
  - See docs: https://code.visualstudio.com/docs/copilot/customization/custom-instructions#_use-instructionsmd-files

- .github/chatmodes/
  - Contains custom chat mode files using the `.chatmode.md` extension.
  - We include `jineng-wuziqi.chatmode.md` to keep this project’s architecture and style consistent during chat.
  - See docs: https://code.visualstudio.com/docs/copilot/customization/custom-chat-modes

Notes:

- Ensure the VS Code settings to use instruction and chat mode files are enabled when needed.
- You can add more instructions/chat modes as the project grows; prefer small, focused files.
