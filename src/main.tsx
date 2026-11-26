import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import { Theme } from '@astryxdesign/core/theme';
import { ccstTheme } from './theme/ccstTheme';
import './styles/app.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <Theme theme={ccstTheme}>
      <App />
    </Theme>
  </StrictMode>,
);
