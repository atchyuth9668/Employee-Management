import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  const location = useLocation();
  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <div className="empty-state-icon">404</div>
      <div className="empty-state-title">Page not found</div>
      <div className="empty-state-desc">We couldn't find <code>{location.pathname}</code>.</div>
      <Link to="/"><Button variant="primary">Back to overview</Button></Link>
    </div>
  );
};