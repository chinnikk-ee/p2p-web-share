import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

// Note: React.StrictMode is intentionally omitted — its double-invoked effects
// would tear down and recreate live WebRTC sessions in development.
createRoot(container).render(<App />);
