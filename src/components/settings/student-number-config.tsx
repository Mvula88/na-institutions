'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hash, Save, Loader2, Eye, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface StudentNumberConfigProps {
  institutionId: string
}

interface StudentNumberSettings {
  student_number_prefix: string
  student_number_format: string
  student_number_separator: string
  student_number_year_format: string
  student_number_sequence_padding: number
}

const FORMAT_PRESETS = [
  {
    label: 'Standard (IUM2026001)',
    format: '{PREFIX}{YEAR:2}{SEQ:4}',
    separator: '',
  },
  {
    label: 'With Separator (NUST-2026-00001)',
    format: '{PREFIX}{SEP}{YEAR:4}{SEP}{SEQ:5}',
    separator: '-',
  },
  {
    label: 'Year First (2026-VTC-0001)',
    format: '{YEAR:4}{SEP}{PREFIX}{SEP}{SEQ:4}',
    separator: '-',
  },
  {
    label: 'Slash Format (VVTC/26/0001)',
    format: '{PREFIX}{SEP}{YEAR:2}{SEP}{SEQ:4}',
    separator: '/',
  },
]

export default function StudentNumberConfig({ institutionId }: StudentNumberConfigProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [previewNumber, setPreviewNumber] = useState('')
  const [settings, setSettings] = useState<StudentNumberSettings>({
    student_number_prefix: '',
    student_number_format: '{PREFIX}{YEAR:2}{SEQ:4}',
    student_number_separator: '',
    student_number_year_format: '2',
    student_number_sequence_padding: 4,
  })

  useEffect(() => {
    fetchSettings()
  }, [institutionId])

  useEffect(() => {
    generatePreview()
  }, [settings])

  async function fetchSettings() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('institutions')
      .select('student_number_prefix, student_number_format, student_number_separator, student_number_year_format, student_number_sequence_padding, name')
      .eq('id', institutionId)
      .single()

    if (!error && data) {
      const inst = data as StudentNumberSettings & { name: string }
      setSettings({
        student_number_prefix: inst.student_number_prefix || generateDefaultPrefix(inst.name),
        student_number_format: inst.student_number_format || '{PREFIX}{YEAR:2}{SEQ:4}',
        student_number_separator: inst.student_number_separator || '',
        student_number_year_format: inst.student_number_year_format || '2',
        student_number_sequence_padding: inst.student_number_sequence_padding || 4,
      })
    }
    setIsFetching(false)
  }

  function generateDefaultPrefix(name: string): string {
    // Generate prefix from institution name (first letters of each word, max 4 chars)
    const words = name.split(' ').filter(w => w.length > 0)
    if (words.length === 1) {
      return words[0].substring(0, 4).toUpperCase()
    }
    return words.map(w => w[0]).join('').substring(0, 4).toUpperCase()
  }

  function generatePreview() {
    const currentYear = new Date().getFullYear()
    const year2 = String(currentYear).slice(-2)
    const year4 = String(currentYear)

    let number = settings.student_number_format
      .replace('{PREFIX}', settings.student_number_prefix.toUpperCase())
      .replace('{SEP}', settings.student_number_separator)
      .replace('{YEAR:2}', year2)
      .replace('{YEAR:4}', year4)
      .replace('{SEQ:3}', '001')
      .replace('{SEQ:4}', '0001')
      .replace('{SEQ:5}', '00001')
      .replace('{SEQ:6}', '000001')

    // Also handle the generic {SEQ} pattern
    const seqPadding = settings.student_number_sequence_padding || 4
    number = number.replace(/\{SEQ(?::\d+)?\}/g, '1'.padStart(seqPadding, '0'))

    setPreviewNumber(number)
  }

  function applyPreset(preset: typeof FORMAT_PRESETS[0]) {
    setSettings({
      ...settings,
      student_number_format: preset.format,
      student_number_separator: preset.separator,
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!settings.student_number_prefix.trim()) {
      toast.error('Please enter a student number prefix')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          student_number_prefix: settings.student_number_prefix.toUpperCase(),
          student_number_format: settings.student_number_format,
          student_number_separator: settings.student_number_separator,
          student_number_year_format: settings.student_number_year_format,
          student_number_sequence_padding: settings.student_number_sequence_padding,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', institutionId)

      if (error) throw error

      toast.success('Student number settings saved!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Prefix */}
      <div>
        <Input
          label="Institution Prefix"
          value={settings.student_number_prefix}
          onChange={(e) => setSettings({ ...settings, student_number_prefix: e.target.value.toUpperCase() })}
          placeholder="e.g., IUM, NUST, VTC"
          maxLength={10}
        />
        <p className="text-xs text-gray-500 mt-1">
          A short code identifying your institution (max 10 characters)
        </p>
      </div>

      {/* Format Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Format Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FORMAT_PRESETS.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                settings.student_number_format === preset.format
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm text-gray-900">{preset.label}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{preset.format}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Format */}
      <div>
        <Input
          label="Custom Format (Advanced)"
          value={settings.student_number_format}
          onChange={(e) => setSettings({ ...settings, student_number_format: e.target.value })}
          placeholder="{PREFIX}{YEAR:2}{SEQ:4}"
        />
        <div className="text-xs text-gray-500 mt-2 space-y-1">
          <p><strong>Format tokens:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li><code className="bg-gray-100 px-1 rounded">{'{PREFIX}'}</code> - Your institution prefix</li>
            <li><code className="bg-gray-100 px-1 rounded">{'{YEAR:2}'}</code> - 2-digit year (26)</li>
            <li><code className="bg-gray-100 px-1 rounded">{'{YEAR:4}'}</code> - 4-digit year (2026)</li>
            <li><code className="bg-gray-100 px-1 rounded">{'{SEQ:4}'}</code> - Sequence with 4 digits (0001)</li>
            <li><code className="bg-gray-100 px-1 rounded">{'{SEP}'}</code> - Separator character</li>
          </ul>
        </div>
      </div>

      {/* Separator */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Separator Character"
            value={settings.student_number_separator}
            onChange={(e) => setSettings({ ...settings, student_number_separator: e.target.value })}
            placeholder="e.g., - or /"
            maxLength={5}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for no separator
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sequence Padding
          </label>
          <select
            value={settings.student_number_sequence_padding}
            onChange={(e) => setSettings({ ...settings, student_number_sequence_padding: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={3}>3 digits (001)</option>
            <option value={4}>4 digits (0001)</option>
            <option value={5}>5 digits (00001)</option>
            <option value={6}>6 digits (000001)</option>
          </select>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Live Preview</span>
          </div>
          <button
            type="button"
            onClick={generatePreview}
            className="text-blue-600 hover:text-blue-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-lg px-4 py-3 border border-blue-200">
          <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
            {previewNumber || 'Configure settings above'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            First student registered in {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Hash className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">How Student Numbers Work</h4>
            <p className="text-sm text-amber-700 mt-1">
              When a new student is registered, a unique number is automatically generated based on your format settings.
              The sequence resets each year, so the first student in 2027 would be 0001 again.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        type="submit"
        disabled={isLoading}
        leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  )
}
