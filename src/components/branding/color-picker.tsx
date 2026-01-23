'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, Palette } from 'lucide-react'
import toast from 'react-hot-toast'

interface ColorPickerProps {
  centerId: string
  currentColor?: string | null
  label?: string
  field: 'primary_color' | 'secondary_color'
  onColorChange?: (color: string) => void
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#1E40AF' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Gray', value: '#4B5563' },
  { name: 'Black', value: '#1F2937' },
]

export function ColorPicker({
  centerId,
  currentColor,
  label = 'Brand Color',
  field,
  onColorChange,
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor || '#1E40AF')
  const [customColor, setCustomColor] = useState(currentColor || '#1E40AF')
  const [saving, setSaving] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    if (currentColor) {
      setSelectedColor(currentColor)
      setCustomColor(currentColor)
    }
  }, [currentColor])

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color)
    await saveColor(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
    setSelectedColor(e.target.value)
  }

  const handleCustomColorBlur = async () => {
    await saveColor(customColor)
  }

  const saveColor = async (color: string) => {
    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('institutions')
        .update({ [field]: color } as never)
        .eq('id', centerId)

      if (error) {
        throw error
      }

      toast.success('Color saved!')

      if (onColorChange) {
        onColorChange(color)
      }
    } catch (error) {
      console.error('Error saving color:', error)
      toast.error('Failed to save color')
    } finally {
      setSaving(false)
    }
  }

  const isPresetColor = PRESET_COLORS.some((c) => c.value === selectedColor)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div
          className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: selectedColor }}
        />
      </div>

      {/* Preset Colors */}
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color.value)}
            className={`relative w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
              selectedColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {selectedColor === color.value && (
              <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
            )}
          </button>
        ))}
      </div>

      {/* Custom Color */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Palette className="w-4 h-4" />
          Custom color
        </button>

        {showCustom && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={handleCustomColorChange}
              onBlur={handleCustomColorBlur}
              className="w-12 h-10 cursor-pointer rounded border-0"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onBlur={handleCustomColorBlur}
              placeholder="#1E40AF"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {saving && (
        <p className="text-xs text-gray-500">Saving...</p>
      )}
    </div>
  )
}

/**
 * Combined branding settings component
 */
interface BrandingSettingsProps {
  centerId: string
  primaryColor?: string | null
  secondaryColor?: string | null
  onUpdate?: () => void
}

export function BrandingSettings({
  centerId,
  primaryColor,
  secondaryColor,
  onUpdate,
}: BrandingSettingsProps) {
  return (
    <div className="space-y-6">
      <ColorPicker
        centerId={centerId}
        currentColor={primaryColor}
        label="Primary Color"
        field="primary_color"
        onColorChange={onUpdate}
      />
      <ColorPicker
        centerId={centerId}
        currentColor={secondaryColor}
        label="Secondary Color"
        field="secondary_color"
        onColorChange={onUpdate}
      />
    </div>
  )
}
