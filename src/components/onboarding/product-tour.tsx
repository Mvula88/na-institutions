'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

export interface TourStep {
  target: string // CSS selector or data-tour attribute
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface ProductTourProps {
  steps: TourStep[]
  onComplete?: () => void
}

export function ProductTour({ steps, onComplete }: ProductTourProps) {
  const { tourActive, currentTourStep, nextStep, prevStep, skipTour, endTour } = useOnboardingStore()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)

  const currentStep = steps[currentTourStep]
  const isLastStep = currentTourStep === steps.length - 1
  const isFirstStep = currentTourStep === 0

  // Find and highlight the target element
  const updateTargetPosition = useCallback(() => {
    if (!currentStep) return

    const selector = currentStep.target.startsWith('[')
      ? currentStep.target
      : `[data-tour="${currentStep.target}"]`

    const element = document.querySelector(selector)
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)

      // Calculate tooltip position
      const placement = currentStep.placement || 'bottom'
      const padding = 16
      const tooltipWidth = 320
      const tooltipHeight = 180

      let top = 0
      let left = 0

      switch (placement) {
        case 'top':
          top = rect.top - tooltipHeight - padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - padding
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + padding
          break
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left < padding) left = padding
      if (left + tooltipWidth > viewportWidth - padding) {
        left = viewportWidth - tooltipWidth - padding
      }
      if (top < padding) top = padding
      if (top + tooltipHeight > viewportHeight - padding) {
        top = viewportHeight - tooltipHeight - padding
      }

      setTooltipPosition({ top, left })

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (tourActive && mounted) {
      updateTargetPosition()

      // Update position on resize/scroll
      window.addEventListener('resize', updateTargetPosition)
      window.addEventListener('scroll', updateTargetPosition, true)

      return () => {
        window.removeEventListener('resize', updateTargetPosition)
        window.removeEventListener('scroll', updateTargetPosition, true)
      }
    }
  }, [tourActive, currentTourStep, mounted, updateTargetPosition])

  const handleNext = () => {
    if (isLastStep) {
      endTour()
      onComplete?.()
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    skipTour()
    onComplete?.()
  }

  if (!tourActive || !mounted || !currentStep) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={handleSkip} />

      {/* Spotlight on target element */}
      {targetRect && (
        <div
          className="absolute bg-transparent border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-white rounded-xl shadow-2xl p-5 transition-all duration-300 animate-fade-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Step {currentTourStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentStep.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{currentStep.content}</p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentTourStep
                  ? 'bg-blue-600'
                  : index < currentTourStep
                  ? 'bg-blue-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
