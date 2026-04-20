import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../providers/auth-provider';

export function AppLayout() {
  const { user, logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">TS-D1000</div>
        <nav className="nav">
          <NavLink to="/" className="nav-link">
            Dashboard
          </NavLink>
          <span className="nav-link nav-link-muted">Map View</span>
          <span className="nav-link nav-link-muted">Camera View</span>
          <span className="nav-link nav-link-muted">Manual Control</span>
          {user?.role === 'ADMIN' ? (
            <NavLink to="/admin-only" className="nav-link">
              User Management
            </NavLink>
          ) : null}
          {user?.role === 'ADMIN' ? <span className="nav-link nav-link-muted">Config</span> : null}
          {user?.role === 'ADMIN' ? <span className="nav-link nav-link-muted">Logs</span> : null}
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
