'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOnboardingStore } from '@/stores/onboarding-store'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Rocket,
  ArrowRight,
  PartyPopper,
} from 'lucide-react'

export function OnboardingChecklist() {
  const { checklistItems, checklistDismissed, dismissChecklist, startTour } = useOnboardingStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const completedCount = checklistItems.filter((item) => item.completed).length
  const totalCount = checklistItems.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)
  const allCompleted = completedCount === totalCount

  if (checklistDismissed) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              {allCompleted ? (
                <PartyPopper className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {allCompleted ? 'All done!' : 'Getting Started'}
              </h3>
              <p className="text-sm text-gray-600">
                {allCompleted
                  ? 'You\'ve completed all the steps!'
                  : `${completedCount} of ${totalCount} tasks completed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={dismissChecklist}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title="Dismiss checklist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist items */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          {/* Take a tour button */}
          <button
            onClick={startTour}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group mb-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-blue-900">Take a quick tour</p>
                <p className="text-xs text-blue-700">Learn the basics in 2 minutes</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Task list */}
          {checklistItems.map((item) => (
            <ChecklistItem key={item.id} item={item} />
          ))}

          {/* All done message */}
          {allCompleted && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
              <p className="text-green-800 font-medium">
                Great job! You&apos;re all set up.
              </p>
              <button
                onClick={dismissChecklist}
                className="mt-2 text-sm text-green-600 hover:text-green-700 underline"
              >
                Dismiss this checklist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ChecklistItemProps {
  item: {
    id: string
    title: string
    description: string
    completed: boolean
    link?: string
  }
}

function ChecklistItem({ item }: ChecklistItemProps) {
  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        item.completed
          ? 'bg-gray-50'
          : 'bg-white hover:bg-gray-50 cursor-pointer'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {item.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            item.completed ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {item.title}
        </p>
        <p className={`text-sm ${item.completed ? 'text-gray-400' : 'text-gray-500'}`}>
          {item.description}
        </p>
      </div>
      {!item.completed && item.link && (
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )

  if (item.link && !item.completed) {
    return <Link href={item.link}>{content}</Link>
  }

  return content
}

// Compact version for sidebar
export function OnboardingProgress() {
  const { checklistItems, checklistDismissed, tourCompleted, startTour } = useOnboardingStore()

  const completedCount = checklistItems.filter((item) => item.completed).length
  const totalCount = checklistItems.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)

  if (checklistDismissed && tourCompleted) return null

  return (
    <div className="px-3 py-2">
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-blue-900">Getting Started</span>
          <span className="text-xs text-blue-700">{progressPercentage}%</span>
        </div>
        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {!tourCompleted && (
          <button
            onClick={startTour}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Take the tour
          </button>
        )}
      </div>
    </div>
  )
}
