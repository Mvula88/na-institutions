'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

export function HelpTooltip({
  content,
  title,
  placement = 'top',
  className = '',
  iconSize = 'sm',
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const padding = 8

      let top = 0
      let left = 0

      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - padding
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'bottom':
          top = triggerRect.bottom + padding
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.left - tooltipRect.width - padding
          break
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.right + padding
          break
      }

      // Keep within viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left < padding) left = padding
      if (left + tooltipRect.width > viewportWidth - padding) {
        left = viewportWidth - tooltipRect.width - padding
      }
      if (top < padding) top = padding
      if (top + tooltipRect.height > viewportHeight - padding) {
        top = viewportHeight - tooltipRect.height - padding
      }

      setTooltipPosition({ top, left })
    }
  }, [isOpen, placement])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
        aria-label="Help"
      >
        <HelpCircle className={iconSizes[iconSize]} />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-64 bg-gray-900 text-white rounded-lg shadow-xl p-3 text-sm animate-fade-in"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {title && (
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{title}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-gray-300 leading-relaxed">{content}</p>

          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              placement === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2'
                : placement === 'bottom'
                ? 'top-[-4px] left-1/2 -translate-x-1/2'
                : placement === 'left'
                ? 'right-[-4px] top-1/2 -translate-y-1/2'
                : 'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </div>
  )
}

// Wrapper component for adding help to form labels
interface LabelWithHelpProps {
  label: string
  helpText: string
  required?: boolean
  htmlFor?: string
}

export function LabelWithHelp({ label, helpText, required, htmlFor }: LabelWithHelpProps) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <HelpTooltip content={helpText} placement="right" />
    </div>
  )
}
