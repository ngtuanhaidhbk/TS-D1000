import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from './shared/layout/app-layout';
import { AuthProvider } from './shared/providers/auth-provider';
import { ProtectedRoute } from './shared/router/protected-route';
import { RoleRoute } from './shared/router/role-route';
import { AdminPage } from './views/admin-page';
import { DashboardPage } from './views/dashboard-page';
import { LoginPage } from './views/login-page';
import { UnauthorizedPage } from './views/unauthorized-page';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'admin-only',
        element: (
          <RoleRoute allowedRoles={['ADMIN']}>
            <AdminPage />
          </RoleRoute>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
