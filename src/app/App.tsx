import { RouterProvider } from 'react-router-dom';
import router from '@/app/router';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/feedback/Toaster';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
