import { useAuth } from '../shared/providers/auth-provider';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="card">
      <p className="eyebrow">Dashboard</p>
      <h2>Welcome back</h2>
      <p>
        Logged in as <strong>{user?.username}</strong> with role <strong>{user?.role}</strong>.
      </p>
      <ul>
        <li>Backend auth API</li>
        <li>Role-aware layout shell</li>
        <li>Protected route foundation</li>
      </ul>
    </section>
  );
}
