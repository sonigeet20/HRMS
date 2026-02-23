export const NAV_ITEMS = {
  EMPLOYEE: [
    { label: 'Dashboard', href: '/employee/dashboard', icon: 'LayoutDashboard' },
    { label: 'Attendance', href: '/employee/attendance', icon: 'Clock' },
    { label: 'Leave', href: '/employee/leave', icon: 'CalendarOff' },
    { label: 'Payslips', href: '/employee/payslips', icon: 'Receipt' },
    { label: 'Profile', href: '/employee/profile', icon: 'User' },
    { label: 'Feedback', href: '/employee/feedback', icon: 'MessageSquare' },
    { label: 'Desktop Agent', href: '/admin/downloads', icon: 'Download' },
  ],
  HR: [
    { label: 'Employees', href: '/hr/employees', icon: 'Users' },
    { label: 'Attendance', href: '/hr/attendance', icon: 'Clock' },
    { label: 'Leaves', href: '/hr/leaves', icon: 'CalendarOff' },
    { label: 'Policies', href: '/hr/policies', icon: 'Shield' },
    { label: 'Payroll', href: '/hr/payroll', icon: 'Banknote' },
    { label: 'Feedback', href: '/hr/feedback', icon: 'MessageSquare' },
    { label: 'Reports', href: '/hr/reports', icon: 'BarChart3' },
  ],
  ADMIN: [
    { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'FileText' },
    { label: 'Agent Downloads', href: '/admin/downloads', icon: 'Download' },
  ],
} as const;

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-500',
  WFH: 'bg-blue-500',
  ABSENT: 'bg-red-500',
  LEAVE: 'bg-yellow-500',
  HOLIDAY: 'bg-purple-500',
  WEEKEND: 'bg-gray-300',
  HALF_DAY: 'bg-orange-500',
  LATE: 'bg-amber-500',
  NON_COMPLIANT: 'bg-red-700',
};
