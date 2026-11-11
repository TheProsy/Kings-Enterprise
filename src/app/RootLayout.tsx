import { Outlet } from 'react-router-dom';
import { SeoManager } from '@/components/seo/SeoManager';

export function RootLayout() {
  return (
    <>
      <SeoManager />
      <Outlet />
    </>
  );
}
