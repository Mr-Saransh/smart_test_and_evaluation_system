/* ═══════════════════════════════════════════════
   CONSTANTS — Roles, Nav Items, Status Maps, Colors
   ═══════════════════════════════════════════════ */

import {
  HomeIcon, BuildingIcon, UsersIcon, UserCheckIcon, BookOpenIcon,
  CalendarIcon, FileTextIcon, CurrencyIcon, ClipboardIcon, SettingsIcon,
  MegaphoneIcon, BellIcon, AwardIcon, ClockIcon, TrendingUpIcon, ShieldIcon, CpuIcon
} from '../components/common/Icons';

/* ─── Roles ─── */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  INSTITUTE_ADMIN: 'institute_admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.INSTITUTE_ADMIN]: 'Institute Admin',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.STUDENT]: 'Student',
  [ROLES.PARENT]: 'Parent',
};

/* ─── Route Prefixes ─── */
export const ROLE_HOME = {
  [ROLES.SUPER_ADMIN]: '/super-admin',
  [ROLES.INSTITUTE_ADMIN]: '/admin',
  [ROLES.TEACHER]: '/teacher',
  [ROLES.STUDENT]: '/student',
  [ROLES.PARENT]: '/parent',
};

/* ─── Sidebar Navigation Per Role ─── */
export const NAV_ITEMS = {
  [ROLES.SUPER_ADMIN]: [
    { id: 'overview', label: 'Platform Dashboard', path: '/super-admin', icon: HomeIcon },
    { id: 'institutes', label: 'Institutes', path: '/super-admin/institutes', icon: BuildingIcon },
    { id: 'users', label: 'User Management', path: '/super-admin/users', icon: UsersIcon },
    { id: 'analytics', label: 'Analytics', path: '/super-admin/analytics', icon: TrendingUpIcon },
    { id: 'settings', label: 'Platform Settings', path: '/super-admin/settings', icon: SettingsIcon },
  ],

  [ROLES.INSTITUTE_ADMIN]: [
    { id: 'overview', label: 'Dashboard', path: '/admin', icon: HomeIcon },
    { id: 'institute', label: 'Institute', path: '/admin/institute', icon: BuildingIcon },
    { id: 'courses', label: 'Courses', path: '/admin/courses', icon: BookOpenIcon },
    { id: 'batches', label: 'Batches', path: '/admin/batches', icon: UsersIcon },
    { id: 'teachers', label: 'Teachers', path: '/admin/teachers', icon: UserCheckIcon },
    { id: 'students', label: 'Students', path: '/admin/students', icon: UsersIcon },
    { id: 'enrollments', label: 'Enrollments', path: '/admin/enrollments', icon: UserCheckIcon },
    { id: 'attendance', label: 'Attendance', path: '/admin/attendance', icon: ClipboardIcon },
    { id: 'fees', label: 'Fees', path: '/admin/fees', icon: CurrencyIcon },
    { id: 'tests', label: 'Tests', path: '/admin/tests', icon: FileTextIcon },
    { id: 'questions', label: 'Question Bank', path: '/admin/questions', icon: BookOpenIcon },
    { id: 'timetable', label: 'Timetable', path: '/admin/timetable', icon: CalendarIcon },
    { id: 'planner', label: 'Study Planner', path: '/admin/planner', icon: ClockIcon },
    { id: 'materials', label: 'Study Materials', path: '/admin/materials', icon: BookOpenIcon },
    { id: 'announcements', label: 'Announcements', path: '/admin/announcements', icon: MegaphoneIcon },
    { id: 'notifications', label: 'Notifications', path: '/admin/notifications', icon: BellIcon },
    { id: 'reports', label: 'Reports', path: '/admin/reports', icon: TrendingUpIcon },
    { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: AwardIcon },
    { id: 'settings', label: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ],

  [ROLES.TEACHER]: [
    { id: 'home', label: 'Dashboard', path: '/teacher', icon: HomeIcon },
    { id: 'attendance', label: 'Attendance', path: '/teacher/attendance', icon: ClipboardIcon },
    { id: 'tests', label: 'Tests', path: '/teacher/tests', icon: FileTextIcon },
    { id: 'questions', label: 'Question Bank', path: '/teacher/questions', icon: BookOpenIcon },
    { id: 'materials', label: 'Study Materials', path: '/teacher/materials', icon: BookOpenIcon },
    { id: 'timetable', label: 'Schedule', path: '/teacher/timetable', icon: CalendarIcon },
    { id: 'planner', label: 'Planner', path: '/teacher/planner', icon: ClockIcon },
    { id: 'students', label: 'Students', path: '/teacher/students', icon: UsersIcon },
    { id: 'announcements', label: 'Announcements', path: '/teacher/announcements', icon: MegaphoneIcon },
    { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: AwardIcon },
    { id: 'settings', label: 'Settings', path: '/teacher/settings', icon: SettingsIcon },
  ],

  [ROLES.STUDENT]: [
    { id: 'home', label: 'Dashboard', path: '/student', icon: HomeIcon },
    { id: 'timetable', label: 'Timetable', path: '/student/timetable', icon: CalendarIcon },
    { id: 'tests', label: 'Tests', path: '/student/tests', icon: FileTextIcon },
    { id: 'materials', label: 'Study Material', path: '/student/materials', icon: BookOpenIcon },
    { id: 'planner', label: 'Study Planner', path: '/student/planner', icon: ClockIcon },
    { id: 'progress', label: 'Progress', path: '/student/progress', icon: TrendingUpIcon },
    { id: 'attendance', label: 'Attendance', path: '/student/attendance', icon: ClipboardIcon },
    { id: 'fees', label: 'Fee Status', path: '/student/fees', icon: CurrencyIcon },
    { id: 'announcements', label: 'Announcements', path: '/student/announcements', icon: MegaphoneIcon },
    { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: AwardIcon },
    { id: 'settings', label: 'Settings', path: '/student/settings', icon: SettingsIcon },
  ],

  [ROLES.PARENT]: [
    { id: 'home', label: 'Dashboard', path: '/parent', icon: HomeIcon },
    { id: 'attendance', label: 'Attendance', path: '/parent/attendance', icon: ClipboardIcon },
    { id: 'progress', label: 'Progress', path: '/parent/progress', icon: TrendingUpIcon },
    { id: 'fees', label: 'Fee Status', path: '/parent/fees', icon: CurrencyIcon },
    { id: 'timetable', label: 'Timetable', path: '/parent/timetable', icon: CalendarIcon },
    { id: 'announcements', label: 'Announcements', path: '/parent/announcements', icon: MegaphoneIcon },
    { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: AwardIcon },
    { id: 'settings', label: 'Settings', path: '/parent/settings', icon: SettingsIcon },
  ],
};

/* ─── Mobile Bottom Nav (max 5 items per role) ─── */
export const MOBILE_NAV = {
  [ROLES.INSTITUTE_ADMIN]: ['overview', 'students', 'attendance', 'tests', 'fees'],
  [ROLES.TEACHER]: ['home', 'attendance', 'tests', 'materials', 'students'],
  [ROLES.STUDENT]: ['home', 'timetable', 'tests', 'materials', 'progress'],
  [ROLES.PARENT]: ['home', 'attendance', 'progress', 'fees', 'announcements'],
};

/* ─── Status Colors & Labels ─── */
export const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#FEF3C7', fg: '#D97706' },
  approved: { label: 'Approved', bg: '#D1FAE5', fg: '#059669' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', fg: '#DC2626' },
  active: { label: 'Active', bg: '#D1FAE5', fg: '#059669' },
  draft: { label: 'Draft', bg: '#F3F4F6', fg: '#6B7280' },
  completed: { label: 'Completed', bg: '#DBEAFE', fg: '#2563EB' },
  paid: { label: 'Paid', bg: '#D1FAE5', fg: '#059669' },
  partial: { label: 'Partial', bg: '#FEF3C7', fg: '#D97706' },
  overdue: { label: 'Overdue', bg: '#FEE2E2', fg: '#DC2626' },
  present: { label: 'Present', bg: '#D1FAE5', fg: '#059669' },
  absent: { label: 'Absent', bg: '#FEE2E2', fg: '#DC2626' },
  late: { label: 'Late', bg: '#FEF3C7', fg: '#D97706' },
};

/* ─── Color Palette ─── */
export const COLORS = {
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primaryLight: '#e0e7ff',
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
};

/* ─── Timetable Day Labels ─── */
export const TT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ─── Timetable Subject Colors ─── */
const SUBJECT_COLORS = [
  ['#EFF6FF', '#2563EB'],
  ['#FEF3C7', '#D97706'],
  ['#D1FAE5', '#059669'],
  ['#FEE2E2', '#DC2626'],
  ['#F5F3FF', '#7C3AED'],
  ['#FFF7ED', '#EA580C'],
  ['#F0FDF4', '#16A34A'],
  ['#FDF2F8', '#DB2777'],
];

export function getSubjectColor(subject) {
  if (!subject) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

/* ─── Question Types ─── */
export const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'subjective', label: 'Subjective' },
];

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'hard', label: 'Hard', color: '#ef4444' },
];

/* ─── Material Types ─── */
export const MATERIAL_KINDS = [
  { value: 'pdf', label: 'PDF Document', icon: '📄' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'note', label: 'Notes', icon: '📝' },
  { value: 'link', label: 'External Link', icon: '🔗' },
  { value: 'other', label: 'Other', icon: '📎' },
];

/* ─── Attendance Statuses ─── */
export const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Present', shortLabel: 'P', color: '#10b981' },
  { value: 'absent', label: 'Absent', shortLabel: 'A', color: '#ef4444' },
  { value: 'late', label: 'Late', shortLabel: 'L', color: '#f59e0b' },
];
