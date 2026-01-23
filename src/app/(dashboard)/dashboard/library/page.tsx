'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Library,
  Plus,
  Search,
  Book,
  BookOpen,
  Users,
  Pencil,
  Trash2,
  FolderOpen,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  Undo2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BookCategory {
  id: string
  name: string
  description: string | null
  _count?: { books: number }
}

interface LibraryBook {
  id: string
  title: string
  author: string | null
  isbn: string | null
  publisher: string | null
  publish_year: number | null
  total_copies: number
  available_copies: number
  shelf_location: string | null
  status: string
  category: { id: string; name: string } | null
}

interface BookBorrowing {
  id: string
  borrowed_date: string
  due_date: string
  returned_date: string | null
  status: string
  book: { id: string; title: string; author: string | null }
  student: { id: string; full_name: string; student_number: string | null }
}

interface Student {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
}

const ITEMS_PER_PAGE = 10

export default function LibraryPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'books' | 'categories' | 'borrowings'>('books')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Books state
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [categories, setCategories] = useState<BookCategory[]>([])
  const [showBookModal, setShowBookModal] = useState(false)
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null)
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publish_year: '',
    total_copies: 1,
    shelf_location: '',
    category_id: '',
  })

  // Categories state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BookCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  })

  // Borrowings state
  const [borrowings, setBorrowings] = useState<BookBorrowing[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  // Issue Book state
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [issueForm, setIssueForm] = useState({
    student_id: '',
    book_id: '',
    due_date: '',
  })
  const [isIssuingBook, setIsIssuingBook] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: string; item: LibraryBook | BookCategory | null }>({
    open: false,
    type: '',
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [user?.institution_id])

  useEffect(() => {
    if (activeTab === 'books') fetchBooks()
    else if (activeTab === 'borrowings') fetchBorrowings()
  }, [activeTab, user?.institution_id, currentPage, statusFilter])

  async function fetchCategories() {
    if (!user?.institution_id) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('book_categories')
      .select('*')
      .eq('institution_id', user.institution_id)
      .order('name')

    if (!error) {
      // Get book counts for each category
      const typedData = (data || []) as BookCategory[]
      const categoriesWithCounts = await Promise.all(
        typedData.map(async (cat) => {
          const { count } = await supabase
            .from('books' as never)
            .select('id', { count: 'exact' })
            .eq('category_id' as never, cat.id as never)
          return { ...cat, _count: { books: count || 0 } }
        })
      )
      setCategories(categoriesWithCounts)
    }
  }

  async function fetchBooks() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('books')
      .select('*, category:book_categories(id, name)')
      .eq('institution_id', user.institution_id)
      .order('title')

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query

    if (!error) setBooks((data || []) as LibraryBook[])
    setIsLoading(false)
  }

  async function fetchBorrowings() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('book_borrowings')
      .select(`
        id, borrowed_date, due_date, returned_date, status,
        book:books(id, title, author),
        student:students(id, full_name, student_number)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('borrowed_date', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (!error) {
      setBorrowings((data || []) as unknown as BookBorrowing[])
      setTotalCount(count || 0)
    }
    setIsLoading(false)
  }

  async function fetchStudents(search?: string) {
    if (!user?.institution_id) return
    const supabase = createClient()

    let query = supabase
      .from('students')
      .select('id, full_name, student_number, grade')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .order('full_name')
      .limit(50)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,student_number.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (!error) {
      setStudents((data || []) as Student[])
    }
  }

  async function handleIssueBook(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id || !issueForm.student_id || !issueForm.book_id || !issueForm.due_date) {
      toast.error('Please fill in all fields')
      return
    }

    setIsIssuingBook(true)
    const supabase = createClient()

    try {
      // Check if book is available
      const selectedBook = books.find(b => b.id === issueForm.book_id)
      if (!selectedBook || selectedBook.available_copies <= 0) {
        toast.error('This book is not available for borrowing')
        return
      }

      // Create borrowing record
      const { error: borrowError } = await supabase
        .from('book_borrowings' as never)
        .insert({
          institution_id: user.institution_id,
          book_id: issueForm.book_id,
          student_id: issueForm.student_id,
          borrowed_date: new Date().toISOString().split('T')[0],
          due_date: issueForm.due_date,
          status: 'borrowed',
        } as never)

      if (borrowError) throw borrowError

      // Update available copies
      const { error: updateError } = await supabase
        .from('books' as never)
        .update({ available_copies: selectedBook.available_copies - 1 } as never)
        .eq('id' as never, issueForm.book_id as never)

      if (updateError) throw updateError

      toast.success('Book issued successfully!')
      setShowIssueModal(false)
      setIssueForm({ student_id: '', book_id: '', due_date: '' })
      setStudentSearch('')
      fetchBooks()
      fetchBorrowings()
    } catch (error) {
      console.error('Error issuing book:', error)
      toast.error('Failed to issue book')
    } finally {
      setIsIssuingBook(false)
    }
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const bookData = {
        title: bookForm.title,
        author: bookForm.author || null,
        isbn: bookForm.isbn || null,
        publisher: bookForm.publisher || null,
        publish_year: bookForm.publish_year ? parseInt(bookForm.publish_year) : null,
        total_copies: bookForm.total_copies,
        available_copies: editingBook ? editingBook.available_copies : bookForm.total_copies,
        shelf_location: bookForm.shelf_location || null,
        category_id: bookForm.category_id || null,
      }

      if (editingBook) {
        const { error } = await supabase
          .from('books' as never)
          .update(bookData as never)
          .eq('id' as never, editingBook.id as never)
        if (error) throw error
        toast.success('Book updated successfully')
      } else {
        const { error } = await supabase.from('books' as never).insert({
          ...bookData,
          institution_id: user.institution_id,
        } as never)
        if (error) throw error
        toast.success('Book added successfully')
      }
      setShowBookModal(false)
      resetBookForm()
      fetchBooks()
    } catch (error) {
      console.error('Error saving book:', error)
      toast.error('Failed to save book')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('book_categories' as never)
          .update({
            name: categoryForm.name,
            description: categoryForm.description || null,
          } as never)
          .eq('id' as never, editingCategory.id as never)
        if (error) throw error
        toast.success('Category updated successfully')
      } else {
        const { error } = await supabase.from('book_categories' as never).insert({
          institution_id: user.institution_id,
          name: categoryForm.name,
          description: categoryForm.description || null,
        } as never)
        if (error) throw error
        toast.success('Category added successfully')
      }
      setShowCategoryModal(false)
      resetCategoryForm()
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReturnBook(borrowingId: string, bookId: string) {
    const supabase = createClient()

    try {
      // Update borrowing status
      const { error } = await supabase
        .from('book_borrowings' as never)
        .update({
          status: 'returned',
          returned_date: new Date().toISOString().split('T')[0],
        } as never)
        .eq('id' as never, borrowingId as never)

      if (error) throw error

      // Restore available copies
      const book = books.find(b => b.id === bookId)
      if (book) {
        await supabase
          .from('books' as never)
          .update({ available_copies: book.available_copies + 1 } as never)
          .eq('id' as never, bookId as never)
      }

      toast.success('Book returned successfully')
      fetchBooks()
      fetchBorrowings()
    } catch (error) {
      console.error('Error returning book:', error)
      toast.error('Failed to return book')
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const table = deleteModal.type === 'book' ? 'books' : 'book_categories'
      const { error } = await supabase.from(table as never).delete().eq('id' as never, deleteModal.item.id as never)
      if (error) throw error
      toast.success(`${deleteModal.type === 'book' ? 'Book' : 'Category'} deleted successfully`)
      setDeleteModal({ open: false, type: '', item: null })
      if (deleteModal.type === 'book') fetchBooks()
      else fetchCategories()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete. It may be in use.')
    } finally {
      setIsDeleting(false)
    }
  }

  function resetBookForm() {
    setBookForm({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      publish_year: '',
      total_copies: 1,
      shelf_location: '',
      category_id: '',
    })
    setEditingBook(null)
  }

  function resetCategoryForm() {
    setCategoryForm({ name: '', description: '' })
    setEditingCategory(null)
  }

  function openEditBook(book: LibraryBook) {
    setBookForm({
      title: book.title,
      author: book.author || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      publish_year: book.publish_year?.toString() || '',
      total_copies: book.total_copies,
      shelf_location: book.shelf_location || '',
      category_id: book.category?.id || '',
    })
    setEditingBook(book)
    setShowBookModal(true)
  }

  function openEditCategory(category: BookCategory) {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
    })
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; icon: React.ReactNode }> = {
      borrowed: { bg: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3 h-3" /> },
      returned: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      overdue: { bg: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
    }
    return badges[status] || badges.borrowed
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library Management</h1>
          <p className="text-gray-500 mt-1">Manage books, categories, and borrowings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {[
          { id: 'books', label: 'Books', icon: <Book className="w-4 h-4" /> },
          { id: 'categories', label: 'Categories', icon: <FolderOpen className="w-4 h-4" /> },
          { id: 'borrowings', label: 'Borrowings', icon: <BookOpen className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Books Tab */}
      {activeTab === 'books' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetBookForm()
                setShowBookModal(true)
              }}
            >
              Add Book
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : books.length === 0 ? (
            <div className="p-12 text-center">
              <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
              <p className="text-gray-500 mb-4">Add your first book to the library</p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetBookForm()
                  setShowBookModal(true)
                }}
              >
                Add Book
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Book</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Availability</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {books
                    .filter(b =>
                      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.isbn?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{book.title}</p>
                          <p className="text-sm text-gray-500">{book.author || 'Unknown author'}</p>
                          {book.isbn && <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>}
                        </td>
                        <td className="px-6 py-4">
                          {book.category ? (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              {book.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{book.shelf_location || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            book.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {book.available_copies}/{book.total_copies} available
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditBook(book)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, type: 'book', item: book })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Book Categories</h2>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetCategoryForm()
                setShowCategoryModal(true)
              }}
            >
              Add Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-500 mb-4">Create categories to organize your books</p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetCategoryForm()
                  setShowCategoryModal(true)
                }}
              >
                Add Category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{category.description || 'No description'}</p>
                      <p className="text-xs text-gray-400 mt-2">{category._count?.books || 0} books</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCategory(category)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, type: 'category', item: category })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Borrowings Tab */}
      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                options={[
                  { value: 'borrowed', label: 'Borrowed' },
                  { value: 'returned', label: 'Returned' },
                  { value: 'overdue', label: 'Overdue' },
                ]}
                placeholder="All Status"
                className="w-40"
              />
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setIssueForm({ student_id: '', book_id: '', due_date: '' })
                setStudentSearch('')
                fetchStudents()
                fetchBooks()
                setShowIssueModal(true)
              }}
            >
              Issue Book
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : borrowings.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No borrowings yet</h3>
              <p className="text-gray-500">Book borrowings will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Book</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Borrowed</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {borrowings.map((borrowing) => {
                      const statusBadge = getStatusBadge(borrowing.status)
                      const isOverdue = borrowing.status === 'borrowed' && new Date(borrowing.due_date) < new Date()
                      return (
                        <tr key={borrowing.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{borrowing.book?.title}</p>
                            <p className="text-sm text-gray-500">{borrowing.book?.author}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-900">{borrowing.student?.full_name}</p>
                            <p className="text-sm text-gray-500">{borrowing.student?.student_number}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(borrowing.borrowed_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {new Date(borrowing.due_date).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              isOverdue ? 'bg-red-100 text-red-700' : statusBadge.bg
                            }`}>
                              {isOverdue ? <AlertCircle className="w-3 h-3" /> : statusBadge.icon}
                              {isOverdue ? 'Overdue' : borrowing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {borrowing.status === 'borrowed' && (
                              <button
                                onClick={() => handleReturnBook(borrowing.id, borrowing.book.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              >
                                <Undo2 className="w-4 h-4" />
                                Return
                              </button>
                            )}
                            {borrowing.status === 'returned' && borrowing.returned_date && (
                              <span className="text-sm text-gray-500">
                                Returned {new Date(borrowing.returned_date).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBook ? 'Edit Book' : 'Add Book'}
              </h2>
              <button onClick={() => setShowBookModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <Input
                label="Title"
                required
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Author"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                />
                <Input
                  label="ISBN"
                  value={bookForm.isbn}
                  onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Publisher"
                  value={bookForm.publisher}
                  onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                />
                <Input
                  label="Year"
                  type="number"
                  value={bookForm.publish_year}
                  onChange={(e) => setBookForm({ ...bookForm, publish_year: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total Copies"
                  type="number"
                  min="1"
                  required
                  value={bookForm.total_copies}
                  onChange={(e) => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value) || 1 })}
                />
                <Input
                  label="Shelf Location"
                  value={bookForm.shelf_location}
                  onChange={(e) => setBookForm({ ...bookForm, shelf_location: e.target.value })}
                  placeholder="e.g., A-12"
                />
              </div>
              <Select
                label="Category"
                value={bookForm.category_id}
                onChange={(e) => setBookForm({ ...bookForm, category_id: e.target.value })}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select category"
              />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowBookModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <Input
                label="Category Name"
                required
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Science Fiction"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowCategoryModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: '', item: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteModal.type === 'book' ? 'Book' : 'Category'}`}
        message={`Are you sure you want to delete this ${deleteModal.type}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Issue Book to Student</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssueBook} className="p-6 space-y-4">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search student by name or number..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      fetchStudents(e.target.value)
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  />
                </div>
                {students.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setIssueForm({ ...issueForm, student_id: student.id })
                          setStudentSearch(student.full_name)
                          setStudents([])
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                          issueForm.student_id === student.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {student.student_number || 'No student number'} • Grade {student.grade || 'N/A'}
                          </p>
                        </div>
                        {issueForm.student_id === student.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {issueForm.student_id && (
                  <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Student selected
                  </p>
                )}
              </div>

              {/* Book Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Book *
                </label>
                <select
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">Select a book...</option>
                  {books
                    .filter(book => book.available_copies > 0)
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} by {book.author || 'Unknown'} ({book.available_copies} available)
                      </option>
                    ))}
                </select>
                {books.filter(b => b.available_copies > 0).length === 0 && (
                  <p className="mt-1 text-sm text-red-600">No books available for borrowing</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={issueForm.due_date}
                  onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Typical loan period: 14-30 days
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isIssuingBook || !issueForm.student_id || !issueForm.book_id || !issueForm.due_date}
                  leftIcon={isIssuingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isIssuingBook ? 'Issuing...' : 'Issue Book'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
