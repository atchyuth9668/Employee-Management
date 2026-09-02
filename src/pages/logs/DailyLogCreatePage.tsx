import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LogCreateModal } from './DailyLogsListPage';
import { useState } from 'react';

export const DailyLogCreatePage = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.title = 'Log Activity | Field Operations';
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log Activity</h1>
          <div className="page-subtitle">Record what was done today</div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/logs')}>Back to logs</Button>
      </div>
      <Card>
        <CardHeader title="New Daily Log" />
        <CardBody>
          <p className="text-muted text-sm">Use the dialog to enter your activity details.</p>
        </CardBody>
      </Card>
      <LogCreateModal open={open} onClose={() => { setOpen(false); navigate('/logs'); }} />
    </div>
  );
};