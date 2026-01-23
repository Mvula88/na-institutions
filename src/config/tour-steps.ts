import { TourStep } from '@/components/onboarding'

export const dashboardTourSteps: TourStep[] = [
  {
    target: 'sidebar-dashboard',
    title: 'Welcome to your Dashboard',
    content: 'This is your home base. You\'ll see key stats and recent activity here. Let\'s take a quick look around!',
    placement: 'right',
  },
  {
    target: 'sidebar-students',
    title: 'Student Management',
    content: 'Add and manage all your students here. You can track their details, subjects, and payment history.',
    placement: 'right',
  },
  {
    target: 'sidebar-payments',
    title: 'Payment Tracking',
    content: 'Record fee payments, print receipts, and keep track of who has paid and who still owes.',
    placement: 'right',
  },
  {
    target: 'sidebar-subjects',
    title: 'Subjects & Classes',
    content: 'Set up the subjects you offer and assign them to students. You can also set different fee amounts per subject.',
    placement: 'right',
  },
  {
    target: 'sidebar-reports',
    title: 'Reports & Analytics',
    content: 'See how your centre is doing. Monthly revenue, outstanding fees, student numbers - all in one place.',
    placement: 'right',
  },
  {
    target: 'sidebar-settings',
    title: 'Settings',
    content: 'Update your centre details, manage staff accounts, and configure your preferences here.',
    placement: 'right',
  },
  {
    target: 'dashboard-stats',
    title: 'Quick Stats',
    content: 'These cards show your key numbers at a glance - total students, monthly revenue, and outstanding fees.',
    placement: 'bottom',
  },
  {
    target: 'dashboard-actions',
    title: 'Quick Actions',
    content: 'Use these buttons to quickly add a student or record a payment without navigating away.',
    placement: 'bottom',
  },
]

export const studentsTourSteps: TourStep[] = [
  {
    target: 'add-student-btn',
    title: 'Add New Student',
    content: 'Click here to register a new student. You\'ll be able to add their details, contact info, and subjects.',
    placement: 'bottom',
  },
  {
    target: 'student-search',
    title: 'Search Students',
    content: 'Quickly find any student by name or student number using this search bar.',
    placement: 'bottom',
  },
  {
    target: 'student-filters',
    title: 'Filter Students',
    content: 'Use filters to view students by grade, status, or subject. Helps when you have lots of students!',
    placement: 'bottom',
  },
]

export const paymentsTourSteps: TourStep[] = [
  {
    target: 'record-payment-btn',
    title: 'Record a Payment',
    content: 'When a parent pays, click here to record it. You can select the student and enter the amount.',
    placement: 'bottom',
  },
  {
    target: 'payment-filters',
    title: 'Filter Payments',
    content: 'View payments by date range, student, or payment method to find what you\'re looking for.',
    placement: 'bottom',
  },
  {
    target: 'export-btn',
    title: 'Export Data',
    content: 'Download your payment records as a CSV file for your own records or for your accountant.',
    placement: 'left',
  },
]
