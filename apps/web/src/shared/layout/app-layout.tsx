import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../providers/auth-provider';

export function AppLayout() {
  const { user, logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Control Desk</div>
        <nav className="nav">
          <NavLink to="/" className="nav-link">
            Dashboard
          </NavLink>
          <div className="nav-section">
            <span className="nav-section-title">Live Monitoring</span>
            <NavLink to="/live" className="nav-link">
              Live Dashboard
            </NavLink>
            <NavLink to="/live/map" className="nav-link">
              Realtime Map
            </NavLink>
            <NavLink to="/live/speakers" className="nav-link">
              Speakers
            </NavLink>
            <NavLink to="/live/cameras" className="nav-link">
              Cameras
            </NavLink>
            <NavLink to="/live/events" className="nav-link">
              Event Feed
            </NavLink>
            <NavLink to="/live/alerts" className="nav-link">
              Alerts
            </NavLink>
            <NavLink to="/live/runtime-status" className="nav-link">
              Runtime Status
            </NavLink>
          </div>
          <div className="nav-section">
            <span className="nav-section-title">Runtime</span>
            <NavLink to="/runtime/map" className="nav-link">
              Map View
            </NavLink>
            <NavLink to="/runtime/cameras" className="nav-link">
              Camera View
            </NavLink>
            <NavLink to="/runtime/manual-control" className="nav-link">
              Manual Control
            </NavLink>
            <NavLink to="/runtime/monitor" className="nav-link">
              Runtime Monitor
            </NavLink>
          </div>
          <div className="nav-section">
            <span className="nav-section-title">System Configuration</span>
            <NavLink to="/config" className="nav-link">
              Overview
            </NavLink>
            <NavLink to="/config/tsd" className="nav-link">
              TS-D1000
            </NavLink>
            <NavLink to="/config/cameras" className="nav-link">
              Cameras
            </NavLink>
            <NavLink to="/config/layout" className="nav-link">
              Layout &amp; Map
            </NavLink>
            <NavLink to="/config/mappings" className="nav-link">
              Mappings
            </NavLink>
            <NavLink to="/config/mode" className="nav-link">
              Operation Mode
            </NavLink>
            <NavLink to="/config/readiness" className="nav-link">
              Readiness Check
            </NavLink>
          </div>
          {isAdmin ? (
            <NavLink to="/admin-only" className="nav-link">
              User Management
            </NavLink>
          ) : null}
          <div className="nav-section">
            <span className="nav-section-title">Logs</span>
            <NavLink to="/logs" className="nav-link">
              All Logs
            </NavLink>
            {isAdmin ? (
              <NavLink to="/logs/audit" className="nav-link">
                Audit Logs
              </NavLink>
            ) : null}
            <NavLink to="/logs/runtime" className="nav-link">
              Runtime Logs
            </NavLink>
            <NavLink to="/logs/camera" className="nav-link">
              Camera Logs
            </NavLink>
            <NavLink to="/logs/errors" className="nav-link">
              System Errors
            </NavLink>
          </div>
        </nav>
      </aside>

      <section className="content">
        <header className="header">
          <div>
            <p className="eyebrow">Meeting Control</p>
            <h1>Foundation Layer</h1>
          </div>
          <div className="header-actions">
            <span>{user?.username}</span>
            <button
              className="button button-secondary"
              onClick={() => setIsLogoutConfirmOpen(true)}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </section>

      {isLogoutConfirmOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="dialog-card" role="dialog">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to logout?</p>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setIsLogoutConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="button button-danger" onClick={logout} type="button">
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
