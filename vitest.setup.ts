import '@testing-library/jest-dom/vitest';
import './src/ui/i18n';
import i18n from 'i18next';
import { beforeAll } from 'vitest';

// Ensure tests run with English language regardless of default zh UI.
beforeAll(async () => {
  try {
    await i18n.changeLanguage('en');
  } catch {
    // ignore
  }
});
