import { Navigate } from 'react-router-dom';

import { useAuth } from '../providers/auth-provider';

type RoleRouteProps = {
  allowedRoles: Array<'ADMIN' | 'OPERATOR'>;
  children: JSX.Element;
};

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <div className="auth-loading">Loading session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to="/unauthorized" />;
  }

  return children;
}
