'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Bus,
  Plus,
  Search,
  Route,
  Users,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Car,
  CheckCircle,
  XCircle,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { parseNumericInput, parseIntegerInput, formatNumericValue } from '@/lib/numeric-input'

interface Vehicle {
  id: string
  registration_number: string
  vehicle_type: string
  capacity: number
  driver_name: string | null
  driver_phone: string | null
  status: string
  notes: string | null
}

interface TransportRoute {
  id: string
  name: string
  description: string | null
  pickup_points: string[] | null
  monthly_fee: number
  is_active: boolean
  _count?: { students: number }
}

interface StudentTransport {
  id: string
  pickup_point: string | null
  status: string
  student: {
    id: string
    full_name: string
    student_number: string | null
    grade: string | null
  }
  route: {
    id: string
    name: string
  }
  vehicle: {
    id: string
    registration_number: string
  } | null
}

const ITEMS_PER_PAGE = 10

export default function TransportPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'assignments'>('vehicles')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState({
    registration_number: '',
    vehicle_type: 'bus',
    capacity: 20,
    driver_name: '',
    driver_phone: '',
    notes: '',
  })

  // Routes state
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null)
  const [routeForm, setRouteForm] = useState({
    name: '',
    description: '',
    pickup_points: '',
    monthly_fee: 0,
  })

  // Assignments state
  const [assignments, setAssignments] = useState<StudentTransport[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [routeFilter, setRouteFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('active')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Student assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; full_name: string; student_number: string | null; grade: string | null }>>([])
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; full_name: string } | null>(null)
  const [assignForm, setAssignForm] = useState({
    route_id: '',
    vehicle_id: '',
    pickup_point: '',
  })
  const [isSearching, setIsSearching] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: string; item: Vehicle | TransportRoute | StudentTransport | null }>({
    open: false,
    type: '',
    item: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (activeTab === 'vehicles') fetchVehicles()
    else if (activeTab === 'routes') fetchRoutes()
    else if (activeTab === 'assignments') fetchAssignments()
  }, [activeTab, user?.institution_id, routeFilter, vehicleFilter, assignmentStatusFilter, currentPage])

  async function fetchVehicles() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('institution_id', user.institution_id)
      .order('registration_number')

    if (!error) setVehicles(data || [])
    setIsLoading(false)
  }

  async function fetchRoutes() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('transport_routes')
      .select('*')
      .eq('institution_id', user.institution_id)
      .order('name')

    if (!error) {
      // Get student counts for each route
      interface RouteData {
        id: string
        name: string
        description: string | null
        pickup_points: string[]
        monthly_fee: number
        is_active: boolean
      }
      const typedData = (data || []) as RouteData[]
      const routesWithCounts = await Promise.all(
        typedData.map(async (route) => {
          const { count } = await supabase
            .from('student_transport')
            .select('id', { count: 'exact' })
            .eq('route_id', route.id)
            .eq('status', 'active')
          return { ...route, _count: { students: count || 0 } }
        })
      )
      setRoutes(routesWithCounts)
    }
    setIsLoading(false)
  }

  async function fetchAssignments() {
    if (!user?.institution_id) return
    setIsLoading(true)
    const supabase = createClient()

    // Build the query with filters
    let query = supabase
      .from('student_transport')
      .select(`
        id, pickup_point, status,
        student:students(id, full_name, student_number, grade),
        route:transport_routes(id, name),
        vehicle:vehicles(id, registration_number)
      `, { count: 'exact' })
      .eq('institution_id', user.institution_id)
      .order('created_at', { ascending: false })

    // Apply server-side filters
    if (assignmentStatusFilter) {
      query = query.eq('status', assignmentStatusFilter)
    }
    if (routeFilter) {
      query = query.eq('route_id', routeFilter)
    }
    if (vehicleFilter) {
      query = query.eq('vehicle_id', vehicleFilter)
    }

    const { data, count, error } = await query

    if (!error) {
      let filteredData = (data || []) as unknown as StudentTransport[]

      // Filter by search query on the client side (Supabase doesn't support filtering on joined tables)
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        filteredData = filteredData.filter(a =>
          a.student?.full_name?.toLowerCase().includes(lowerQuery) ||
          a.student?.student_number?.toLowerCase().includes(lowerQuery)
        )
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const paginatedData = filteredData.slice(from, from + ITEMS_PER_PAGE)

      setAssignments(paginatedData)
      setTotalCount(searchQuery ? filteredData.length : (count || 0))
    }
    setIsLoading(false)
  }

  async function searchStudents(query: string) {
    if (!user?.institution_id || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const supabase = createClient()

    // Use a more efficient query - search students first, then check assignments
    // This avoids fetching ALL assignments upfront
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, student_number, grade')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .or(`full_name.ilike.%${query}%,student_number.ilike.%${query}%`)
      .limit(15) // Fetch a few extra to account for filtering

    interface StudentData { id: string; full_name: string; student_number: string | null; grade: string | null }
    const typedStudents = (students || []) as StudentData[]

    if (typedStudents.length === 0) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Only check assignment status for the found students (much more efficient)
    const studentIds = typedStudents.map(s => s.id)
    const { data: existingAssignments } = await supabase
      .from('student_transport')
      .select('student_id')
      .eq('institution_id', user.institution_id)
      .eq('status', 'active')
      .in('student_id', studentIds)

    const assignedStudentIds = new Set(
      ((existingAssignments || []) as { student_id: string }[]).map(a => a.student_id)
    )

    // Filter out already assigned students
    const availableStudents = typedStudents
      .filter(s => !assignedStudentIds.has(s.id))
      .slice(0, 10) // Limit final results
    setSearchResults(availableStudents)
    setIsSearching(false)
  }

  async function handleAssignStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id || !selectedStudent) return

    setIsSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('student_transport').insert({
        institution_id: user.institution_id,
        student_id: selectedStudent.id,
        route_id: assignForm.route_id,
        vehicle_id: assignForm.vehicle_id || null,
        pickup_point: assignForm.pickup_point || null,
        status: 'active',
      } as never)

      if (error) throw error

      toast.success(`${selectedStudent.full_name} assigned to transport`)
      setShowAssignModal(false)
      resetAssignForm()
      fetchAssignments()
    } catch (error) {
      console.error('Error assigning student:', error)
      toast.error('Failed to assign student')
    } finally {
      setIsSaving(false)
    }
  }

  function resetAssignForm() {
    setSelectedStudent(null)
    setStudentSearch('')
    setSearchResults([])
    setAssignForm({ route_id: '', vehicle_id: '', pickup_point: '' })
  }

  async function handleRemoveAssignment(assignment: StudentTransport) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('student_transport')
        .delete()
        .eq('id', assignment.id)

      if (error) throw error
      toast.success('Transport assignment removed')
      fetchAssignments()
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Failed to remove assignment')
    }
  }

  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            registration_number: vehicleForm.registration_number,
            vehicle_type: vehicleForm.vehicle_type,
            capacity: vehicleForm.capacity,
            driver_name: vehicleForm.driver_name || null,
            driver_phone: vehicleForm.driver_phone || null,
            notes: vehicleForm.notes || null,
          } as never)
          .eq('id', editingVehicle.id)
        if (error) throw error
        toast.success('Vehicle updated successfully')
      } else {
        const { error } = await supabase.from('vehicles').insert({
          institution_id: user.institution_id,
          registration_number: vehicleForm.registration_number,
          vehicle_type: vehicleForm.vehicle_type,
          capacity: vehicleForm.capacity,
          driver_name: vehicleForm.driver_name || null,
          driver_phone: vehicleForm.driver_phone || null,
          notes: vehicleForm.notes || null,
        } as never)
        if (error) throw error
        toast.success('Vehicle added successfully')
      }
      setShowVehicleModal(false)
      resetVehicleForm()
      fetchVehicles()
    } catch (error) {
      console.error('Error saving vehicle:', error)
      toast.error('Failed to save vehicle')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveRoute(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.institution_id) return
    setIsSaving(true)
    const supabase = createClient()

    try {
      const pickupPoints = routeForm.pickup_points
        .split('\n')
        .map(p => p.trim())
        .filter(p => p)

      if (editingRoute) {
        const { error } = await supabase
          .from('transport_routes')
          .update({
            name: routeForm.name,
            description: routeForm.description || null,
            pickup_points: pickupPoints,
            monthly_fee: routeForm.monthly_fee,
          } as never)
          .eq('id', editingRoute.id)
        if (error) throw error
        toast.success('Route updated successfully')
      } else {
        const { error } = await supabase.from('transport_routes').insert({
          institution_id: user.institution_id,
          name: routeForm.name,
          description: routeForm.description || null,
          pickup_points: pickupPoints,
          monthly_fee: routeForm.monthly_fee,
        } as never)
        if (error) throw error
        toast.success('Route added successfully')
      }
      setShowRouteModal(false)
      resetRouteForm()
      fetchRoutes()
    } catch (error) {
      console.error('Error saving route:', error)
      toast.error('Failed to save route')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal.item) return
    setIsDeleting(true)
    const supabase = createClient()

    try {
      let table = 'vehicles'
      if (deleteModal.type === 'route') table = 'transport_routes'
      else if (deleteModal.type === 'assignment') table = 'student_transport'

      const { error } = await supabase.from(table).delete().eq('id', deleteModal.item.id)
      if (error) throw error

      const typeLabels: Record<string, string> = {
        vehicle: 'Vehicle',
        route: 'Route',
        assignment: 'Assignment',
      }
      toast.success(`${typeLabels[deleteModal.type]} deleted successfully`)
      setDeleteModal({ open: false, type: '', item: null })

      if (deleteModal.type === 'vehicle') fetchVehicles()
      else if (deleteModal.type === 'route') fetchRoutes()
      else if (deleteModal.type === 'assignment') fetchAssignments()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete. It may be in use.')
    } finally {
      setIsDeleting(false)
    }
  }

  function resetVehicleForm() {
    setVehicleForm({
      registration_number: '',
      vehicle_type: 'bus',
      capacity: 20,
      driver_name: '',
      driver_phone: '',
      notes: '',
    })
    setEditingVehicle(null)
  }

  function resetRouteForm() {
    setRouteForm({
      name: '',
      description: '',
      pickup_points: '',
      monthly_fee: 0,
    })
    setEditingRoute(null)
  }

  function openEditVehicle(vehicle: Vehicle) {
    setVehicleForm({
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      notes: vehicle.notes || '',
    })
    setEditingVehicle(vehicle)
    setShowVehicleModal(true)
  }

  function openEditRoute(route: TransportRoute) {
    setRouteForm({
      name: route.name,
      description: route.description || '',
      pickup_points: route.pickup_points?.join('\n') || '',
      monthly_fee: route.monthly_fee,
    })
    setEditingRoute(route)
    setShowRouteModal(true)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      maintenance: { bg: 'bg-amber-100 text-amber-700', icon: <Wrench className="w-3 h-3" /> },
      inactive: { bg: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3 h-3" /> },
    }
    return badges[status] || badges.inactive
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Transport Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage vehicles, routes, and student transport</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" /> },
              { id: 'routes', label: 'Routes', icon: <Route className="w-4 h-4" /> },
              { id: 'assignments', label: 'Student Assignments', icon: <Users className="w-4 h-4" /> },
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
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetVehicleForm()
                setShowVehicleModal(true)
              }}
            >
              Add Vehicle
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <Bus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles yet</h3>
              <p className="text-gray-500 mb-4">Add your first vehicle to get started</p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetVehicleForm()
                  setShowVehicleModal(true)
                }}
              >
                Add Vehicle
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {vehicles
                .filter(v => v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((vehicle) => {
                  const statusBadge = getStatusBadge(vehicle.status)
                  return (
                    <div key={vehicle.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Bus className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{vehicle.registration_number}</p>
                          <p className="text-sm text-gray-500">
                            {vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)} • {vehicle.capacity} seats
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {vehicle.driver_name && (
                          <div className="text-sm">
                            <p className="text-gray-900">{vehicle.driver_name}</p>
                            <p className="text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {vehicle.driver_phone || '—'}
                            </p>
                          </div>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg}`}>
                          {statusBadge.icon}
                          {vehicle.status}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditVehicle(vehicle)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'vehicle', item: vehicle })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Transport Routes</h2>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetRouteForm()
                setShowRouteModal(true)
              }}
            >
              Add Route
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : routes.length === 0 ? (
            <div className="p-12 text-center">
              <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No routes yet</h3>
              <p className="text-gray-500 mb-4">Create your first transport route</p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetRouteForm()
                  setShowRouteModal(true)
                }}
              >
                Add Route
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {routes.map((route) => (
                <div key={route.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Route className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{route.name}</p>
                      <p className="text-sm text-gray-500">{route.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-right">
                      <p className="text-gray-900 font-medium">N$ {route.monthly_fee.toFixed(2)}/mo</p>
                      <p className="text-gray-500">{route._count?.students || 0} students</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {route.pickup_points && route.pickup_points.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          <MapPin className="w-3 h-3" />
                          {route.pickup_points.length} stops
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        route.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {route.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditRoute(route)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, type: 'route', item: route })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              {/* Primary filters row */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    onKeyUp={() => fetchAssignments()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Select
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    placeholder="All Status"
                    value={assignmentStatusFilter}
                    onChange={(e) => {
                      setAssignmentStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-32"
                  />
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                      showAdvancedFilters || routeFilter || vehicleFilter
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">More Filters</span>
                    {(routeFilter || vehicleFilter) && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                        {[routeFilter, vehicleFilter].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      resetAssignForm()
                      fetchRoutes()
                      fetchVehicles()
                      setShowAssignModal(true)
                    }}
                  >
                    Assign Student
                  </Button>
                </div>
              </div>

              {/* Advanced filters row */}
              {showAdvancedFilters && (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                  <Select
                    options={routes.map(r => ({
                      value: r.id,
                      label: r.name
                    }))}
                    placeholder="All Routes"
                    value={routeFilter}
                    onChange={(e) => {
                      setRouteFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-44"
                  />
                  <Select
                    options={vehicles.filter(v => v.status === 'active').map(v => ({
                      value: v.id,
                      label: v.registration_number
                    }))}
                    placeholder="All Vehicles"
                    value={vehicleFilter}
                    onChange={(e) => {
                      setVehicleFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-44"
                  />
                  {(routeFilter || vehicleFilter) && (
                    <button
                      onClick={() => {
                        setRouteFilter('')
                        setVehicleFilter('')
                        setCurrentPage(1)
                      }}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              {/* Active filters display */}
              {(assignmentStatusFilter || routeFilter || vehicleFilter) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {assignmentStatusFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Status: {assignmentStatusFilter}
                      <button onClick={() => { setAssignmentStatusFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {routeFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Route: {routes.find(r => r.id === routeFilter)?.name}
                      <button onClick={() => { setRouteFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {vehicleFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Vehicle: {vehicles.find(v => v.id === vehicleFilter)?.registration_number}
                      <button onClick={() => { setVehicleFilter(''); setCurrentPage(1) }} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transport assignments</h3>
              <p className="text-gray-500 mb-4">Assign students to transport routes</p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetAssignForm()
                  fetchRoutes()
                  fetchVehicles()
                  setShowAssignModal(true)
                }}
              >
                Assign Student
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Route</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pickup Point</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{assignment.student?.full_name}</p>
                          <p className="text-sm text-gray-500">{assignment.student?.student_number} • {assignment.student?.grade}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{assignment.route?.name}</td>
                        <td className="px-6 py-4 text-gray-600">{assignment.pickup_point || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{assignment.vehicle?.registration_number || 'Not assigned'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setDeleteModal({ open: true, type: 'assignment', item: assignment })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
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

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h2>
              <button onClick={() => setShowVehicleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4">
              <Input
                label="Registration Number"
                required
                value={vehicleForm.registration_number}
                onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                placeholder="e.g., N 12345 W"
              />
              <Select
                label="Vehicle Type"
                required
                value={vehicleForm.vehicle_type}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                options={[
                  { value: 'bus', label: 'Bus' },
                  { value: 'minibus', label: 'Minibus' },
                  { value: 'van', label: 'Van' },
                ]}
              />
              <Input
                label="Capacity (seats)"
                type="text"
                inputMode="numeric"
                required
                value={formatNumericValue(vehicleForm.capacity)}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: parseIntegerInput(e.target.value) })}
              />
              <Input
                label="Driver Name"
                value={vehicleForm.driver_name}
                onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })}
              />
              <Input
                label="Driver Phone"
                type="tel"
                value={vehicleForm.driver_phone}
                onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })}
              />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowVehicleModal(false)} className="flex-1">
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

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRoute ? 'Edit Route' : 'Add Route'}
              </h2>
              <button onClick={() => setShowRouteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRoute} className="p-6 space-y-4">
              <Input
                label="Route Name"
                required
                value={routeForm.name}
                onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                placeholder="e.g., Katutura - Windhoek"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={routeForm.description}
                  onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Points</label>
                <textarea
                  value={routeForm.pickup_points}
                  onChange={(e) => setRouteForm({ ...routeForm, pickup_points: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none resize-none"
                  rows={4}
                  placeholder="One pickup point per line"
                />
                <p className="text-xs text-gray-500 mt-1">Enter each pickup location on a new line</p>
              </div>
              <Input
                label="Monthly Fee (N$)"
                type="text"
                inputMode="decimal"
                value={formatNumericValue(routeForm.monthly_fee)}
                onChange={(e) => setRouteForm({ ...routeForm, monthly_fee: parseNumericInput(e.target.value) })}
              />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowRouteModal(false)} className="flex-1">
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

      {/* Student Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Assign Student to Transport</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignStudent} className="p-6 space-y-4">
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-medium text-blue-900">{selectedStudent.full_name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null)
                        setStudentSearch('')
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value)
                        searchStudents(e.target.value)
                      }}
                      placeholder="Type student name to search..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {searchResults.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent({ id: student.id, full_name: student.full_name })
                              setStudentSearch('')
                              setSearchResults([])
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-sm text-gray-500">{student.student_number} • Grade {student.grade}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {studentSearch.length >= 2 && searchResults.length === 0 && !isSearching && (
                      <p className="text-sm text-gray-500 mt-1">No students found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Route Selection */}
              <Select
                label="Route *"
                required
                value={assignForm.route_id}
                onChange={(e) => setAssignForm({ ...assignForm, route_id: e.target.value })}
                options={[
                  { value: '', label: 'Select a route' },
                  ...routes.filter(r => r.is_active).map((route) => ({
                    value: route.id,
                    label: `${route.name} - R ${route.monthly_fee.toFixed(2)}/mo`,
                  })),
                ]}
              />

              {/* Vehicle Selection (Optional) */}
              <Select
                label="Vehicle (Optional)"
                value={assignForm.vehicle_id}
                onChange={(e) => setAssignForm({ ...assignForm, vehicle_id: e.target.value })}
                options={[
                  { value: '', label: 'Select a vehicle (optional)' },
                  ...vehicles.filter(v => v.status === 'active').map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number} (${vehicle.capacity} seats)`,
                  })),
                ]}
              />

              {/* Pickup Point */}
              {assignForm.route_id && (
                <Select
                  label="Pickup Point"
                  value={assignForm.pickup_point}
                  onChange={(e) => setAssignForm({ ...assignForm, pickup_point: e.target.value })}
                  options={[
                    { value: '', label: 'Select pickup point' },
                    ...(routes.find(r => r.id === assignForm.route_id)?.pickup_points || []).map((point) => ({
                      value: point,
                      label: point,
                    })),
                  ]}
                />
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowAssignModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !selectedStudent || !assignForm.route_id}
                  leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isSaving ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: '', item: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteModal.type === 'vehicle' ? 'Vehicle' : deleteModal.type === 'route' ? 'Route' : 'Assignment'}`}
        message={`Are you sure you want to delete this ${deleteModal.type}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
