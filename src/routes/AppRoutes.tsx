import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './Guards';
import { LoginPage } from '../pages/auth/LoginPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { UpdatePasswordPage } from '../pages/auth/UpdatePasswordPage';
import { OverviewPage } from '../pages/overview/OverviewPage';
import { SchoolsListPage } from '../pages/schools/SchoolsListPage';
import { SchoolCreatePage } from '../pages/schools/SchoolCreatePage';
import { SchoolEditPage } from '../pages/schools/SchoolEditPage';
import { SchoolDetailPage } from '../pages/schools/SchoolDetailPage';
import { VisitsListPage } from '../pages/visits/VisitsListPage';
import { VisitDetailPage } from '../pages/visits/VisitDetailPage';
import { DailyLogsListPage } from '../pages/logs/DailyLogsListPage';
import { DailyLogCreatePage } from '../pages/logs/DailyLogCreatePage';
import { EscalationsListPage } from '../pages/escalations/EscalationsListPage';
import { EscalationDetailPage } from '../pages/escalations/EscalationDetailPage';
import { EngineersListPage } from '../pages/engineers/EngineersListPage';
import { EngineerDetailPage } from '../pages/engineers/EngineerDetailPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { HolidaysPage } from '../pages/holidays/HolidaysPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AppShell } from '../components/layout/AppShell';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/reset" element={<ResetPasswordPage />} />
    <Route path="/update-password" element={<UpdatePasswordPage />} />

    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<OverviewPage />} />
      <Route path="/schools" element={<SchoolsListPage />} />
      <Route path="/schools/new" element={<RoleRoute roles={['admin', 'team_lead']}><SchoolCreatePage /></RoleRoute>} />
      <Route path="/schools/:id" element={<SchoolDetailPage />} />
      <Route path="/schools/:id/edit" element={<RoleRoute roles={['admin', 'team_lead']}><SchoolEditPage /></RoleRoute>} />
      <Route path="/visits" element={<VisitsListPage />} />
      <Route path="/visits/:id" element={<VisitDetailPage />} />
      <Route path="/logs" element={<DailyLogsListPage />} />
      <Route path="/logs/new" element={<DailyLogCreatePage />} />
      <Route path="/escalations" element={<EscalationsListPage />} />
      <Route path="/escalations/:id" element={<EscalationDetailPage />} />
      <Route path="/engineers" element={<RoleRoute roles={['admin', 'team_lead']}><EngineersListPage /></RoleRoute>} />
      <Route path="/engineers/:id" element={<RoleRoute roles={['admin', 'team_lead']}><EngineerDetailPage /></RoleRoute>} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/holidays" element={<HolidaysPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Route>
  </Routes>
);