'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LogoUploadProps {
  centerId: string
  currentLogoUrl?: string | null
  onUploadComplete?: (url: string) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']

export function LogoUpload({ centerId, currentLogoUrl, onUploadComplete }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, SVG, or WebP)')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()

      // Generate unique filename
      const ext = file.name.split('.').pop()
      const filename = `${centerId}/logo-${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('center-logos')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('center-logos')
        .getPublicUrl(data.path)

      const publicUrl = urlData.publicUrl

      // Update center record
      const { error: updateError } = await supabase
        .from('institutions')
        .update({ logo_url: publicUrl } as never)
        .eq('id', centerId)

      if (updateError) {
        throw updateError
      }

      setPreview(publicUrl)
      toast.success('Logo uploaded successfully!')

      if (onUploadComplete) {
        onUploadComplete(publicUrl)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleRemoveLogo = async () => {
    try {
      const supabase = createClient()

      // Clear logo URL in database
      const { error } = await supabase
        .from('institutions')
        .update({ logo_url: null } as never)
        .eq('id', centerId)

      if (error) {
        throw error
      }

      setPreview(null)
      toast.success('Logo removed')
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error('Failed to remove logo')
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Center Logo</label>

      {preview ? (
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-lg border border-gray-200 overflow-hidden bg-white p-2">
            <img
              src={preview}
              alt="Center logo"
              className="w-full h-full object-contain"
            />
          </div>
          <button
            onClick={handleRemoveLogo}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your logo here, or
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Choose File
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                JPEG, PNG, SVG or WebP. Max 5MB.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
