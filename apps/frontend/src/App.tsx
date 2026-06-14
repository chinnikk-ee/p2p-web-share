import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/providers/AppProviders';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { RoomPage } from '@/pages/RoomPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  );
}
