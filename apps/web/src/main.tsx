import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import logo from '@lol/shared/logo.svg';
import { App } from './App';
import './index.css';

// The logo lives in @lol/shared, outside this app's public dir, so the favicon is set here.
document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href = logo;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
