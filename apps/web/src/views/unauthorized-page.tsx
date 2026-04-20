import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="login-shell">
      <section className="login-card unauthorized-card">
        <p className="eyebrow">Access Control</p>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this resource.</p>
        <button className="button" onClick={() => navigate('/')} type="button">
          Back
        </button>
      </section>
    </div>
  );
}
