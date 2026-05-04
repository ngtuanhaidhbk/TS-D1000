import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from './shared/layout/app-layout';
import { AuthProvider } from './shared/providers/auth-provider';
import { ProtectedRoute } from './shared/router/protected-route';
import { RoleRoute } from './shared/router/role-route';
import { AdminPage } from './views/admin-page';
import { CameraConfigPage } from './views/camera-config-page';
import { ConfigOverviewPage } from './views/config-overview-page';
import { DashboardPage } from './views/dashboard-page';
import { LayoutMapPage } from './views/layout-map-page';
import { LoginPage } from './views/login-page';
import { MappingsPage } from './views/mappings-page';
import { ModeConfigPage } from './views/mode-config-page';
import { ReadinessCheckPage } from './views/readiness-check-page';
import { LiveDashboardPage } from './views/live-dashboard-page';
import { LiveMapPage } from './views/live-map-page';
import { LiveSpeakersPage } from './views/live-speakers-page';
import { LiveCamerasPage } from './views/live-cameras-page';
import { LiveEventsPage } from './views/live-events-page';
import { LiveAlertsPage } from './views/live-alerts-page';
import { LiveRuntimeStatusPage } from './views/live-runtime-status-page';
import { RuntimeCameraViewPage } from './views/runtime-camera-view-page';
import { RuntimeManualControlPage } from './views/runtime-manual-control-page';
import { RuntimeMapViewPage } from './views/runtime-map-view-page';
import { RuntimeMonitorPage } from './views/runtime-monitor-page';
import { TsdConfigPage } from './views/tsd-config-page';
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
        path: 'runtime/map',
        element: <RuntimeMapViewPage />,
      },
      {
        path: 'runtime/cameras',
        element: <RuntimeCameraViewPage />,
      },
      {
        path: 'runtime/manual-control',
        element: <RuntimeManualControlPage />,
      },
      {
        path: 'runtime/monitor',
        element: <RuntimeMonitorPage />,
      },
      {
        path: 'live',
        element: <LiveDashboardPage />,
      },
      {
        path: 'live/map',
        element: <LiveMapPage />,
      },
      {
        path: 'live/speakers',
        element: <LiveSpeakersPage />,
      },
      {
        path: 'live/cameras',
        element: <LiveCamerasPage />,
      },
      {
        path: 'live/events',
        element: <LiveEventsPage />,
      },
      {
        path: 'live/alerts',
        element: <LiveAlertsPage />,
      },
      {
        path: 'live/runtime-status',
        element: <LiveRuntimeStatusPage />,
      },
      {
        path: 'config',
        element: <ConfigOverviewPage />,
      },
      {
        path: 'config/tsd',
        element: <TsdConfigPage />,
      },
      {
        path: 'config/cameras',
        element: <CameraConfigPage />,
      },
      {
        path: 'config/layout',
        element: <LayoutMapPage />,
      },
      {
        path: 'config/mappings',
        element: <MappingsPage />,
      },
      {
        path: 'config/mode',
        element: <ModeConfigPage />,
      },
      {
        path: 'config/readiness',
        element: <ReadinessCheckPage />,
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
