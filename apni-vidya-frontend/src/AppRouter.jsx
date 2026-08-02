import React from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { Landing } from './pages/public/Landing';
import { NotFound } from './pages/public/NotFound';
import { Unauthorized } from './pages/public/Unauthorized';
import { EnrollmentForm } from './pages/public/EnrollmentForm';
import { Portfolio } from './pages/public/Portfolio';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { ChangePassword } from './pages/auth/ChangePassword';

// Admin / Teacher Pages
const AdminOverview = lazy(() => import('./pages/admin/Overview').then(m => ({ default: m.Overview })));
const InstituteProfile = lazy(() => import('./pages/admin/InstituteProfile').then(m => ({ default: m.InstituteProfile })));
const Courses = lazy(() => import('./pages/admin/Courses').then(m => ({ default: m.Courses })));
const Batches = lazy(() => import('./pages/admin/Batches').then(m => ({ default: m.Batches })));
const Teachers = lazy(() => import('./pages/admin/Teachers').then(m => ({ default: m.Teachers })));
const Students = lazy(() => import('./pages/admin/Students').then(m => ({ default: m.Students })));
const Enrollments = lazy(() => import('./pages/admin/Enrollments').then(m => ({ default: m.Enrollments })));
const Attendance = lazy(() => import('./pages/admin/Attendance').then(m => ({ default: m.Attendance })));
const Fees = lazy(() => import('./pages/admin/Fees').then(m => ({ default: m.Fees })));
const Tests = lazy(() => import('./pages/admin/Tests').then(m => ({ default: m.Tests })));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank').then(m => ({ default: m.QuestionBank })));
const Timetable = lazy(() => import('./pages/admin/Timetable').then(m => ({ default: m.Timetable })));
const Planner = lazy(() => import('./pages/admin/Planner').then(m => ({ default: m.Planner })));
const StudyMaterials = lazy(() => import('./pages/admin/StudyMaterials').then(m => ({ default: m.StudyMaterials })));
const Announcements = lazy(() => import('./pages/admin/Announcements').then(m => ({ default: m.Announcements })));
const Reports = lazy(() => import('./pages/admin/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.Settings })));

// Student Portal
const StudentPortal = lazy(() => import('./pages/student/StudentPortal').then(m => ({ default: m.StudentPortal })));

// Parent Portal uses the same component, just different RBAC, because parent accounts have a student_id mapped to them on backend (if configured) or they just see their child's view.
// In this MVP, we map parent routes to the StudentPortal which handles the user's mapped student data.
const ParentPortal = lazy(() => import('./pages/student/StudentPortal').then(m => ({ default: m.StudentPortal }))); 

const SuperAdminOverview = lazy(() => import('./pages/superadmin/Overview').then(m => ({ default: m.Overview })));
const SuperAdminInstitutes = lazy(() => import('./pages/superadmin/Institutes').then(m => ({ default: m.Institutes })));
const TestPlayer = lazy(() => import('./pages/student/TestPlayer').then(m => ({ default: m.TestPlayer })));
const DetailedReport = lazy(() => import('./pages/shared/DetailedReport').then(m => ({ default: m.DetailedReport })));
const Leaderboard = lazy(() => import('./pages/shared/Leaderboard').then(m => ({ default: m.Leaderboard })));

// Super Admin Fallback for non-existent routes
const ComingSoon = ({ title }) => (
  <div className="empty" style={{ marginTop: 64 }}>
    <h2 className="h1">{title} Dashboard</h2>
    <p className="muted">This portal is currently being deployed.</p>
  </div>
);

const LoadingFallback = () => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
  </div>
);

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/enroll/:slug" element={<EnrollmentForm />} />
      <Route path="/portfolio/:token" element={<Portfolio />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      
      {/* Test Player (Full screen, no sidebar) */}
      <Route path="/play-test/:test_id" element={<ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><TestPlayer /></Suspense></ProtectedRoute>} />
      
      {/* Detailed Evaluation Report */}
      <Route path="/report/:test_id" element={<ProtectedRoute allowedRoles={['student', 'institute_admin', 'teacher', 'parent']}><Suspense fallback={<LoadingFallback />}><DetailedReport /></Suspense></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'institute_admin', 'teacher', 'parent']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><Leaderboard /></Suspense>} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['institute_admin']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><AdminOverview /></Suspense>} />
        <Route path="institute" element={<Suspense fallback={<LoadingFallback />}><InstituteProfile /></Suspense>} />
        <Route path="courses" element={<Suspense fallback={<LoadingFallback />}><Courses /></Suspense>} />
        <Route path="batches" element={<Suspense fallback={<LoadingFallback />}><Batches /></Suspense>} />
        <Route path="teachers" element={<Suspense fallback={<LoadingFallback />}><Teachers /></Suspense>} />
        <Route path="students" element={<Suspense fallback={<LoadingFallback />}><Students /></Suspense>} />
        <Route path="enrollments" element={<Suspense fallback={<LoadingFallback />}><Enrollments /></Suspense>} />
        <Route path="attendance" element={<Suspense fallback={<LoadingFallback />}><Attendance /></Suspense>} />
        <Route path="fees" element={<Suspense fallback={<LoadingFallback />}><Fees /></Suspense>} />
        <Route path="tests" element={<Suspense fallback={<LoadingFallback />}><Tests /></Suspense>} />
        <Route path="questions" element={<Suspense fallback={<LoadingFallback />}><QuestionBank /></Suspense>} />
        <Route path="timetable" element={<Suspense fallback={<LoadingFallback />}><Timetable /></Suspense>} />
        <Route path="planner" element={<Suspense fallback={<LoadingFallback />}><Planner /></Suspense>} />
        <Route path="materials" element={<Suspense fallback={<LoadingFallback />}><StudyMaterials /></Suspense>} />
        <Route path="announcements" element={<Suspense fallback={<LoadingFallback />}><Announcements /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<LoadingFallback />}><Reports /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
      </Route>

      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><AdminOverview /></Suspense>} />
        <Route path="students" element={<Suspense fallback={<LoadingFallback />}><Students /></Suspense>} />
        <Route path="attendance" element={<Suspense fallback={<LoadingFallback />}><Attendance /></Suspense>} />
        <Route path="tests" element={<Suspense fallback={<LoadingFallback />}><Tests /></Suspense>} />
        <Route path="questions" element={<Suspense fallback={<LoadingFallback />}><QuestionBank /></Suspense>} />
        <Route path="timetable" element={<Suspense fallback={<LoadingFallback />}><Timetable /></Suspense>} />
        <Route path="planner" element={<Suspense fallback={<LoadingFallback />}><Planner /></Suspense>} />
        <Route path="materials" element={<Suspense fallback={<LoadingFallback />}><StudyMaterials /></Suspense>} />
        <Route path="announcements" element={<Suspense fallback={<LoadingFallback />}><Announcements /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
      </Route>

      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><StudentPortal /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
        <Route path=":view" element={<Suspense fallback={<LoadingFallback />}><StudentPortal /></Suspense>} />
      </Route>

      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><ParentPortal /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
        <Route path=":view" element={<Suspense fallback={<LoadingFallback />}><ParentPortal /></Suspense>} />
      </Route>

      <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<LoadingFallback />}><SuperAdminOverview /></Suspense>} />
        <Route path="institutes" element={<Suspense fallback={<LoadingFallback />}><SuperAdminInstitutes /></Suspense>} />
        <Route path="*" element={<Navigate to="/superadmin" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
