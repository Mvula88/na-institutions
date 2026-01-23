'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { parseCSV, downloadCSVTemplate, StudentImportRow } from '@/lib/csv-parser'
import { checkStudentLimit, StudentLimitCheck } from '@/lib/subscription-limits'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Users,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentImportPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState<StudentImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<{ row: number; message: string }[]>([])
  const [limitCheck, setLimitCheck] = useState<StudentLimitCheck | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)

  // Check student limits on mount
  useEffect(() => {
    if (user?.institution_id) {
      checkStudentLimit(user.institution_id).then(setLimitCheck)
    }
  }, [user?.institution_id])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(file)

    const content = await file.text()
    const result = await parseCSV(content)

    setParsedData(result.data)
    setParseErrors(result.errors)
    setStep('preview')
  }

  const handleImport = async () => {
    if (!parsedData.length) return

    setImporting(true)
    setStep('importing')

    try {
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import students')
      }

      setImportResult({ imported: data.imported })
      setStep('complete')
      toast.success(`Successfully imported ${data.imported} students!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import students')
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setParsedData([])
    setParseErrors([])
    setStep('upload')
    setImportResult(null)
  }

  const canImport = parsedData.length > 0 && parseErrors.length === 0 &&
    (limitCheck?.limit === -1 || (limitCheck && parsedData.length <= limitCheck.limit - limitCheck.current))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Students</h1>
        <p className="text-gray-500 mt-1">Bulk import students from a CSV file</p>
      </div>

      {/* Student Limit Warning */}
      {limitCheck && limitCheck.isNearLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Approaching student limit</p>
            <p className="text-sm text-amber-700">
              You have {limitCheck.limit - limitCheck.current} slots remaining on your {limitCheck.tier} plan.
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h2>
              <p className="text-gray-600 text-sm">
                Upload a CSV file with student information. Need a template?{' '}
                <button
                  onClick={downloadCSVTemplate}
                  className="text-blue-600 hover:underline"
                >
                  Download sample template
                </button>
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop your CSV file here, or</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Browse Files
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">CSV Requirements</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Required columns:</strong> first_name, last_name</li>
                <li>• <strong>Optional columns:</strong> email, phone, date_of_birth, gender, grade, parent_name, parent_phone, parent_email, address</li>
                <li>• Date format: YYYY-MM-DD or DD/MM/YYYY</li>
                <li>• Phone format: Namibian format (e.g., 0811234567 or +264811234567)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Preview Import</h2>
                <p className="text-gray-500 text-sm">{file?.name}</p>
              </div>
              <Button variant="outline" onClick={resetImport}>
                Upload Different File
              </Button>
            </div>

            {/* Errors */}
            {parseErrors.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertCircle className="w-5 h-5" />
                  {parseErrors.length} error(s) found
                </div>
                <ul className="text-sm text-red-600 space-y-1">
                  {parseErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>Row {error.row}: {error.message}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...and {parseErrors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {/* Summary */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{parsedData.length}</p>
                <p className="text-sm text-gray-600">Valid students</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{parseErrors.length}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {limitCheck?.limit === -1 ? '∞' : ((limitCheck?.limit ?? 0) - (limitCheck?.current ?? 0))}
                </p>
                <p className="text-sm text-gray-600">Available slots</p>
              </div>
            </div>

            {/* Limit warning */}
            {limitCheck && limitCheck.limit !== -1 && parsedData.length > limitCheck.limit - limitCheck.current && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Exceeds student limit</p>
                  <p className="text-sm text-red-700">
                    You can only import {limitCheck.limit - limitCheck.current} students on your {limitCheck.tier} plan.
                    <Link href="/dashboard/subscription" className="underline ml-1">Upgrade</Link> to add more.
                  </p>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {parsedData.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.slice(0, 10).map((student, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{student.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{student.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{student.grade || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                    Showing first 10 of {parsedData.length} students
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetImport}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canImport}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Import {parsedData.length} Students
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Importing Students...</h2>
            <p className="text-gray-500">Please wait while we add {parsedData.length} students to your center.</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
            <p className="text-gray-600 mb-6">
              Successfully imported {importResult.imported} students.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={resetImport}>
                Import More
              </Button>
              <Button onClick={() => router.push('/dashboard/students')}>
                View Students
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
