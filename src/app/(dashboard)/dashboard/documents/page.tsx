'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  File,
  Image,
  FileSpreadsheet,
  FileIcon,
  Eye,
  Edit,
  Users,
  User,
  Calendar,
  HardDrive,
  Filter,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import toast from 'react-hot-toast'

interface DocumentCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  is_student_visible: boolean
  document_count?: number
}

interface StudentDocument {
  id: string
  student_id: string
  category_id: string | null
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  description: string | null
  uploaded_by: string | null
  is_verified: boolean
  created_at: string
  student?: {
    id: string
    student_number: string
    full_name: string
  }
  category?: DocumentCategory
}

interface StaffDocument {
  id: string
  staff_id: string | null
  category_id: string | null
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  description: string | null
  is_public: boolean
  created_at: string
  category?: DocumentCategory
}

interface Student {
  id: string
  student_number: string
  full_name: string
}

export default function DocumentsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [activeTab, setActiveTab] = useState('student')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Data
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([])
  const [staffDocuments, setStaffDocuments] = useState<StaffDocument[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // Dialogs
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null)
  const [uploadType, setUploadType] = useState<'student' | 'staff'>('student')

  // Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_student_visible: true,
  })

  const [uploadForm, setUploadForm] = useState({
    student_id: '',
    category_id: '',
    description: '',
    is_public: false,
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (user?.institution_id) {
      fetchData()
    }
  }, [user?.institution_id])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch data with graceful error handling for each
      await Promise.allSettled([
        fetchCategories(),
        fetchStudentDocuments(),
        fetchStaffDocuments(),
        fetchStudents(),
      ])
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string }
      console.error('Error fetching data:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        fullError: error
      })
      toast.error(err?.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .eq('institution_id', user?.institution_id)
      .order('name')

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('document_categories table does not exist yet')
        return
      }
      console.error('Error fetching categories:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return
    }
    setCategories(data || [])
  }

  const fetchStudentDocuments = async () => {
    const { data, error } = await supabase
      .from('student_documents')
      .select(`
        *,
        student:students(id, student_number, full_name),
        category:document_categories(id, name)
      `)
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('student_documents table does not exist yet')
        return
      }
      console.error('Error fetching student documents:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return
    }
    setStudentDocuments(data || [])
  }

  const fetchStaffDocuments = async () => {
    const { data, error } = await supabase
      .from('staff_documents')
      .select(`
        *,
        category:document_categories(id, name)
      `)
      .eq('institution_id', user?.institution_id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('staff_documents table does not exist yet')
        return
      }
      console.error('Error fetching staff documents:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return
    }
    setStaffDocuments(data || [])
  }

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_number, full_name')
      .eq('institution_id', user?.institution_id)
      .eq('status', 'active')
      .order('full_name')
      .limit(500)

    if (error) {
      console.error('Error fetching students:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return
    }
    setStudents(data || [])
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast.error('Please enter a category name')
      return
    }

    try {
      const data = {
        institution_id: user?.institution_id,
        name: categoryForm.name,
        description: categoryForm.description || null,
        is_student_visible: categoryForm.is_student_visible,
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('document_categories')
          .update(data)
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('Category updated')
      } else {
        const { error } = await supabase.from('document_categories').insert([data])

        if (error) throw error
        toast.success('Category created')
      }

      setShowCategoryDialog(false)
      resetCategoryForm()
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Documents in this category will be uncategorized.')) return

    try {
      const { error } = await supabase.from('document_categories').delete().eq('id', id)

      if (error) throw error
      toast.success('Category deleted')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (uploadType === 'student' && !uploadForm.student_id) {
      toast.error('Please select a student')
      return
    }

    setUploading(true)

    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user?.institution_id}/${uploadType === 'student' ? 'students' : 'staff'}/${fileName}`

      // Upload to Supabase Storage
      console.log('Uploading to storage...', { filePath, bucket: 'documents' })
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) {
        console.error('Storage upload failed:', {
          message: uploadError.message,
          name: uploadError.name,
          error: uploadError
        })
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log('Upload successful:', uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      console.log('Public URL:', urlData.publicUrl)

      // Save document record
      if (uploadType === 'student') {
        console.log('Inserting student document record...')
        const { error, data } = await supabase.from('student_documents').insert([
          {
            institution_id: user?.institution_id,
            student_id: uploadForm.student_id,
            category_id: uploadForm.category_id || null,
            file_name: selectedFile.name,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            file_url: urlData.publicUrl,
            description: uploadForm.description || null,
            is_verified: false,
          },
        ]).select()

        if (error) {
          console.error('Database insert failed:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          throw new Error(`Database insert failed: ${error.message}`)
        }
        console.log('Document record created:', data)
        fetchStudentDocuments()
      } else {
        console.log('Inserting staff document record...')
        const { error, data } = await supabase.from('staff_documents').insert([
          {
            institution_id: user?.institution_id,
            category_id: uploadForm.category_id || null,
            file_name: selectedFile.name,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            file_url: urlData.publicUrl,
            description: uploadForm.description || null,
            is_public: uploadForm.is_public,
          },
        ]).select()

        if (error) {
          console.error('Database insert failed:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          throw new Error(`Database insert failed: ${error.message}`)
        }
        console.log('Document record created:', data)
        fetchStaffDocuments()
      }

      toast.success('Document uploaded successfully')
      setShowUploadDialog(false)
      resetUploadForm()
    } catch (error: unknown) {
      const err = error as { message?: string; statusCode?: string; error?: string; name?: string }
      console.error('Error uploading document:', {
        message: err?.message,
        statusCode: err?.statusCode,
        error: err?.error,
        name: err?.name,
        fullError: error
      })
      toast.error(err?.message || err?.error || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string, type: 'student' | 'staff', fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('documents').remove([filePath])
      }

      // Delete record
      const table = type === 'student' ? 'student_documents' : 'staff_documents'
      const { error } = await supabase.from(table).delete().eq('id', id)

      if (error) throw error
      toast.success('Document deleted')

      if (type === 'student') {
        fetchStudentDocuments()
      } else {
        fetchStaffDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleVerifyDocument = async (id: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('student_documents')
        .update({ is_verified: verified })
        .eq('id', id)

      if (error) throw error
      toast.success(verified ? 'Document verified' : 'Verification removed')
      fetchStudentDocuments()
    } catch (error) {
      console.error('Error updating document:', error)
      toast.error('Failed to update document')
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      is_student_visible: true,
    })
    setEditingCategory(null)
  }

  const resetUploadForm = () => {
    setUploadForm({
      student_id: '',
      category_id: '',
      description: '',
      is_public: false,
    })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openEditCategory = (category: DocumentCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      is_student_visible: category.is_student_visible,
    })
    setShowCategoryDialog(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4 text-purple-500" />
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
    if (fileType.includes('spreadsheet') || fileType.includes('excel'))
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />
    if (fileType.includes('word') || fileType.includes('document'))
      return <FileText className="h-4 w-4 text-blue-500" />
    return <FileIcon className="h-4 w-4 text-gray-500" />
  }

  // Filter documents
  const filteredStudentDocs = studentDocuments.filter((doc) => {
    const matchesSearch =
      !searchTerm ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.student?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.student?.student_number.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' && !doc.category_id) ||
      doc.category_id === categoryFilter

    return matchesSearch && matchesCategory
  })

  const filteredStaffDocs = staffDocuments.filter((doc) => {
    const matchesSearch =
      !searchTerm || doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' && !doc.category_id) ||
      doc.category_id === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Stats
  const totalStudentDocs = studentDocuments.length
  const totalStaffDocs = staffDocuments.length
  const totalSize = [...studentDocuments, ...staffDocuments].reduce(
    (acc, doc) => acc + doc.file_size,
    0
  )
  const verifiedDocs = studentDocuments.filter((d) => d.is_verified).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Storage</h1>
          <p className="text-muted-foreground">
            Manage student and institutional documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetCategoryForm()
              setShowCategoryDialog(true)
            }}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button
            onClick={() => {
              setUploadType(activeTab === 'student' ? 'student' : 'staff')
              resetUploadForm()
              setShowUploadDialog(true)
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Student Documents</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudentDocs}</div>
            <p className="text-xs text-muted-foreground">{verifiedDocs} verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Documents</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaffDocs}</div>
            <p className="text-xs text-muted-foreground">Institutional files</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
            <p className="text-xs text-muted-foreground">Used storage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Document categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="student">
            <User className="h-4 w-4 mr-2" />
            Student Documents
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="h-4 w-4 mr-2" />
            Staff Documents
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Student Documents Tab */}
        <TabsContent value="student" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <CardTitle>Student Documents</CardTitle>
                  <CardDescription>
                    ID copies, certificates, and other student files
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudentDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No student documents found</p>
                  <p className="text-sm">Upload documents to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudentDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.file_type)}
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{doc.file_name}</p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {doc.student?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.student?.student_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.category?.name || (
                            <span className="text-muted-foreground">Uncategorized</span>
                          )}
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.is_verified ? (
                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={doc.file_url} download={doc.file_name}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleVerifyDocument(doc.id, !doc.is_verified)}
                              >
                                {doc.is_verified ? (
                                  <>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Remove Verification
                                  </>
                                ) : (
                                  <>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Mark as Verified
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDeleteDocument(doc.id, 'student', doc.file_url)
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Documents Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <CardTitle>Staff Documents</CardTitle>
                  <CardDescription>
                    Institutional documents, policies, and resources
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStaffDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No staff documents found</p>
                  <p className="text-sm">Upload documents to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaffDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.file_type)}
                            <div>
                              <p className="font-medium truncate max-w-[250px]">{doc.file_name}</p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.category?.name || (
                            <span className="text-muted-foreground">Uncategorized</span>
                          )}
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.is_public ? (
                            <Badge className="bg-blue-100 text-blue-800">Public</Badge>
                          ) : (
                            <Badge variant="outline">Staff Only</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.file_url} download={doc.file_name}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc.id, 'staff', doc.file_url)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Document Categories</CardTitle>
                  <CardDescription>
                    Organize documents into categories
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetCategoryForm()
                    setShowCategoryDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No categories yet</p>
                  <p className="text-sm">Create categories to organize documents</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-yellow-500" />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          {category.is_student_visible && (
                            <Badge variant="outline" className="text-xs">
                              Student Visible
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {studentDocuments.filter((d) => d.category_id === category.id).length +
                              staffDocuments.filter((d) => d.category_id === category.id).length}{' '}
                            documents
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Document Category'}
            </DialogTitle>
            <DialogDescription>
              Organize documents into logical categories
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., ID Documents, Certificates"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="What types of documents belong in this category?"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_student_visible"
                checked={categoryForm.is_student_visible}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, is_student_visible: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_student_visible">
                Visible to students (students can see documents in this category)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === 'student' ? 'Student' : 'Staff'} Document
            </DialogTitle>
            <DialogDescription>
              Upload a document (max 10MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadType}
                onValueChange={(value) => setUploadType(value as 'student' | 'staff')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student Document</SelectItem>
                  <SelectItem value="staff">Staff Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uploadType === 'student' && (
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select
                  value={uploadForm.student_id}
                  onValueChange={(value) =>
                    setUploadForm({ ...uploadForm, student_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search for a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.student_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Select
                value={uploadForm.category_id}
                onValueChange={(value) =>
                  setUploadForm({ ...uploadForm, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select File</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    {getFileIcon(selectedFile.type)}
                    <span>{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Word, Excel, Images (max 10MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, description: e.target.value })
                }
                placeholder="Brief description of the document"
              />
            </div>

            {uploadType === 'staff' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={uploadForm.is_public}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, is_public: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_public">Make this document publicly accessible</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
