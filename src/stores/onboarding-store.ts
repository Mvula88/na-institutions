import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  link?: string
}

interface OnboardingState {
  // Tour state
  tourCompleted: boolean
  tourActive: boolean
  currentTourStep: number

  // Checklist state
  checklistDismissed: boolean
  checklistItems: ChecklistItem[]

  // Actions
  startTour: () => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  goToStep: (step: number) => void

  completeChecklistItem: (id: string) => void
  dismissChecklist: () => void
  resetOnboarding: () => void
}

const defaultChecklistItems: ChecklistItem[] = [
  {
    id: 'add-student',
    title: 'Add your first student',
    description: 'Register a student to start tracking their information and fees.',
    completed: false,
    link: '/dashboard/students',
  },
  {
    id: 'add-subject',
    title: 'Set up subjects',
    description: 'Add the subjects you offer at your centre.',
    completed: false,
    link: '/dashboard/subjects',
  },
  {
    id: 'record-payment',
    title: 'Record a payment',
    description: 'Log your first fee payment from a student.',
    completed: false,
    link: '/dashboard/payments',
  },
  {
    id: 'view-reports',
    title: 'Check out the reports',
    description: 'See how your centre is performing at a glance.',
    completed: false,
    link: '/dashboard/reports',
  },
  {
    id: 'update-profile',
    title: 'Update your profile',
    description: 'Add your details and centre information.',
    completed: false,
    link: '/dashboard/settings',
  },
]

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      tourCompleted: false,
      tourActive: false,
      currentTourStep: 0,
      checklistDismissed: false,
      checklistItems: defaultChecklistItems,

      startTour: () => set({ tourActive: true, currentTourStep: 0 }),

      endTour: () => set({ tourActive: false, tourCompleted: true }),

      nextStep: () => {
        const { currentTourStep } = get()
        set({ currentTourStep: currentTourStep + 1 })
      },

      prevStep: () => {
        const { currentTourStep } = get()
        if (currentTourStep > 0) {
          set({ currentTourStep: currentTourStep - 1 })
        }
      },

      skipTour: () => set({ tourActive: false, tourCompleted: true }),

      goToStep: (step: number) => set({ currentTourStep: step }),

      completeChecklistItem: (id: string) => {
        const { checklistItems } = get()
        set({
          checklistItems: checklistItems.map((item) =>
            item.id === id ? { ...item, completed: true } : item
          ),
        })
      },

      dismissChecklist: () => set({ checklistDismissed: true }),

      resetOnboarding: () =>
        set({
          tourCompleted: false,
          tourActive: false,
          currentTourStep: 0,
          checklistDismissed: false,
          checklistItems: defaultChecklistItems,
        }),
    }),
    {
      name: 'onboarding-storage',
    }
  )
)
