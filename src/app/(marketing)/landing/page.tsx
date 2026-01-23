'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Clock,
  Check,
  ArrowRight,
  Building2,
  Smartphone,
  Globe,
  Mail,
  Phone,
  BookOpen,
  Home,
  Bus,
  Library,
  FileText,
  Settings,
  Sparkles,
  Gift,
  UserCog,
  Lock,
  ChevronUp,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Student Management',
    description: 'Complete student records with enrollment tracking, parent contacts, and academic history. Multi-year student journey from registration to graduation.',
  },
  {
    icon: CreditCard,
    title: 'Fee Collection & Payments',
    description: 'Flexible fee models - per course, semester, or annual. Track payments, generate receipts, and manage outstanding balances effortlessly.',
  },
  {
    icon: BarChart3,
    title: 'Academic Transcripts',
    description: 'Generate professional transcripts matching NQA standards. Year-by-year academic records with grades, credits, and GPA calculations.',
  },
  {
    icon: GraduationCap,
    title: 'Program & Course Management',
    description: 'Manage diploma and certificate programs with multi-year curricula. Link courses to programs, track student progression through Year 1, 2, 3.',
  },
  {
    icon: Shield,
    title: 'Re-Registration System',
    description: 'Streamlined re-registration for returning students. Same student number, automatic course enrollment for the next academic year.',
  },
  {
    icon: Clock,
    title: 'Cohort Tracking',
    description: 'Track student cohorts by intake year. Monitor progression rates, graduation statistics, and identify at-risk students early.',
  },
]

const plans = [
  {
    name: 'Micro',
    description: 'Solo tutors & small operators',
    monthlyPrice: 99,
    annualPrice: 990,
    setupFee: 0,
    students: 'Up to 15 students',
    features: [
      'Student management',
      'Attendance & grades',
      'Fee tracking & payments',
      'Timetable management',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Starter',
    description: 'Small private colleges',
    monthlyPrice: 299,
    annualPrice: 2990,
    setupFee: 0,
    students: 'Up to 50 students',
    features: [
      'Everything in Micro',
      'Up to 2 staff accounts',
      'Course management',
      'Basic reports',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Standard',
    description: 'Growing VTCs & colleges',
    monthlyPrice: 699,
    annualPrice: 6990,
    setupFee: 0,
    students: 'Up to 150 students',
    features: [
      'Everything in Starter',
      'Up to 5 staff accounts',
      'Academic transcripts',
      'Student & lecturer portals',
      'Library & SMS modules',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Premium',
    description: 'Large institutions & academies',
    monthlyPrice: 1499,
    annualPrice: 14990,
    setupFee: 0,
    students: 'Unlimited students',
    features: [
      'Everything in Standard',
      'Unlimited staff',
      'Hostel & transport modules',
      'Multi-year tracking',
      'Custom branding',
      'Dedicated support',
    ],
    highlighted: false,
  },
]

const testimonials = [
  {
    name: 'Andreas K.',
    role: 'Director, Windhoek Private College',
    quote: 'Managing 3-year diploma programs used to be chaos. Now we track each student from enrollment to graduation with proper transcripts. The re-registration system alone saves us weeks of admin work.',
  },
  {
    name: 'Selma N.',
    role: 'Registrar, Northern Namibia University',
    quote: 'Our students can finally access their grades and fee statements online. The cohort tracking and academic transcript generation meet all our NQA compliance requirements.',
  },
  {
    name: 'Johannes S.',
    role: 'Principal, Swakopmund Technical Academy',
    quote: 'Whether you run a small VTC or a growing college, this system adapts. We started with 30 students and now manage over 200 without changing platforms.',
  },
]

// Intersection Observer hook for animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

// Text cycling hook for rotating words
function useTextCycle(words: string[], intervalMs = 3000) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [words.length, intervalMs])

  return words[currentIndex]
}

export default function LandingPage() {
  const heroRef = useInView(0.1)
  const dashboardRef = useInView(0.2)
  const featuresRef = useInView(0.1)
  const pricingRef = useInView(0.1)
  const testimonialsRef = useInView(0.1)
  const ctaRef = useInView(0.3)
  
  // Cycling text for hero section
  const cyclingText = useTextCycle(['VTCs', 'Colleges', 'Universities', 'Academies'], 3000)

  // Scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out infinite 2s; }
        .animate-float-slow { animation: float 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }
        .animate-slide-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
        .animate-slide-right {
          animation: slide-in-right 0.8s ease-out forwards;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .opacity-0 { opacity: 0; }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
        }
        .glow-purple {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
        }
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-x 3s ease infinite;
        }
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .hover-glow:hover {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
        }
        @keyframes text-fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-text-fade-in {
          animation: text-fade-in 0.5s ease-out forwards;
        }
        .grid-pattern {
          background-image:
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        /* Custom grid pattern */
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(226 232 240 / 0.4)'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E");
        }
        /* Dark mode version */
        .dark .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(30 41 59 / 0.4)'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={scrollToTop}
              className="flex items-center cursor-pointer"
              aria-label="Go to top"
            >
              <Image
                src="/institux-logo.png"
                alt="InstituX Logo"
                width={176}
                height={44}
                className="h-11 w-auto"
                priority
              />
            </button>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:scale-105"
                >
                  Join Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden">
        {/* 1. The Grid Layer (with fade-out mask) */}
        <div className="absolute inset-0 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>

        {/* 2. The Mesh Gradient Layer (Blurred blobs) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-30">
          {/* Blue blob */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-float"></div>
          {/* Indigo/Purple blob */}
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-float-delayed"></div>
          {/* Pink accent blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-[100px] animate-float-slow"></div>
        </div>

        {/* Floating geometric shapes */}
        <div className="absolute top-32 right-20 w-4 h-4 bg-blue-500 rounded-full animate-bounce-subtle opacity-60"></div>
        <div className="absolute top-60 left-20 w-3 h-3 bg-purple-500 rounded-full animate-bounce-subtle delay-300 opacity-60"></div>
        <div className="absolute bottom-40 right-40 w-2 h-2 bg-pink-500 rounded-full animate-bounce-subtle delay-500 opacity-60"></div>

        <div
          ref={heroRef.ref}
          className={`max-w-7xl mx-auto text-center relative z-10 ${heroRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
        >
          <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
            Proudly Namibian
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Complete Institution Management<br />
            <span className="inline-block">
              <span className="text-gradient">For Namibian </span>
              <span key={cyclingText} className="text-gradient inline-block animate-text-fade-in">{cyclingText}</span>
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 animate-fade-in delay-200">
            From student enrollment to graduation transcripts. Manage multi-year programs,
            track cohorts, handle re-registrations, and generate NQA-compliant records.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-500/30 hover:scale-105 group animate-pulse-glow"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 backdrop-blur-sm"
            >
              View Pricing
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4 animate-fade-in delay-400">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white -mt-8 relative">
        <div
          ref={dashboardRef.ref}
          className={`max-w-6xl mx-auto ${dashboardRef.isInView ? 'animate-scale-in' : 'opacity-0'}`}
        >
          <div className="relative group">
            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>

            {/* Browser mockup frame */}
            <div className="relative bg-gray-800 rounded-t-xl p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-sm flex items-center gap-2">
                  <Lock className="w-3 h-3 text-green-400" />
                  <span className="animate-shimmer bg-clip-text">app.institux.com/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="relative bg-gray-100 rounded-b-xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="flex">
                {/* Sidebar */}
                <div className="w-56 bg-white border-r border-gray-200 p-3 hidden md:block">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">My Institution</span>
                  </div>
                  <nav className="space-y-0.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium shadow-md">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Dashboard
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Students
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Users className="w-3.5 h-3.5" />
                      Lecturers
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <UserCog className="w-3.5 h-3.5" />
                      Staff
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <BookOpen className="w-3.5 h-3.5" />
                      Courses
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <CreditCard className="w-3.5 h-3.5" />
                      Payments
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 rounded-lg text-xs">
                      <Home className="w-3.5 h-3.5" />
                      Hostel
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 rounded-lg text-xs">
                      <Bus className="w-3.5 h-3.5" />
                      Transport
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Library className="w-3.5 h-3.5" />
                      Library
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                      Subscription
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      Reports
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Gift className="w-3.5 h-3.5" />
                      Referrals
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </div>
                  </nav>
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 md:p-6 bg-gray-50">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">247</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        +12 this month
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Revenue (Jan)</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">N$48,500</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        +8% vs Dec
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className="text-xl md:text-2xl font-bold text-orange-600">N$12,300</p>
                      <p className="text-xs text-gray-500">23 students</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Active Courses</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">8</p>
                      <p className="text-xs text-gray-500">Maths most popular</p>
                    </div>
                  </div>

                  {/* Recent payments table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">Recent Payments</h3>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Student</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Date</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Amount</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Andreas Shikongo</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Today, 10:30</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">N$450.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs animate-pulse">Paid</span></td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Selma Nghidinwa</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Today, 09:15</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">N$300.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Paid</span></td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Johannes Nangolo</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Yesterday</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">N$600.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Paid</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements for visual appeal */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full opacity-20 blur-2xl animate-float"></div>
            <div className="absolute -top-4 -left-4 w-40 h-40 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full opacity-15 blur-2xl animate-float-delayed"></div>
          </div>

          <p className="text-center text-gray-500 mt-8 text-sm">
            See exactly what your institution management dashboard will look like
          </p>
        </div>
      </section>

      {/* Problem Statement Section - Modern SaaS Style */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Built for Namibian education. <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Not another generic school system.</span>
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              VTCs, colleges, universities, and academies have unique needs—multi-year programs, cohort tracking,
              annual re-registration. InstituX is purpose-built for how tertiary institutions actually work.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">N$99</div>
                <div className="text-sm text-gray-600">Starting from</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">14 days</div>
                <div className="text-sm text-gray-600">Free trial</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">17%</div>
                <div className="text-sm text-gray-600">Save on annual</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Modern SaaS Grid */}
      <section id="features" className="py-32 bg-gray-50">
        <div ref={featuresRef.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 ${featuresRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
              Features
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything your institution needs,
              <span className="block">nothing it doesn't.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Purpose-built for VTCs, colleges, universities, and academies across Namibia.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-8 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 ${
                  featuresRef.isInView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Modern SaaS Style */}
      <section id="pricing" className="py-32 bg-white">
        <div ref={pricingRef.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 ${pricingRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
              Pricing
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your institution. Scale up or down anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-6 bg-white rounded-2xl transition-all duration-300 flex flex-col ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-xl'
                    : 'border border-gray-200 hover:border-gray-300'
                } ${pricingRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-600">{plan.students}</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-gray-600">N$</span>
                    <span className="text-4xl font-bold text-gray-900">{plan.monthlyPrice.toLocaleString()}</span>
                    <span className="text-gray-600">/mo</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    or N${plan.annualPrice.toLocaleString()}/year <span className="text-green-600 font-medium">(save 17%)</span>
                  </p>
                </div>
                <ul className="space-y-2 mb-6 text-sm flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block w-full py-2.5 px-4 text-center text-sm rounded-xl font-medium transition-all duration-300 mt-auto ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
          
          {/* Payment methods - Moved up */}
          <div className="flex flex-col items-center mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">Secure payments powered by Stripe</p>
            <div className="flex items-center gap-6 opacity-50">
              <div className="h-8 w-12 flex items-center justify-center">
                <svg viewBox="0 0 48 30" className="h-7 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="15" cy="15" r="13" fill="#EB001B"/>
                  <circle cx="33" cy="15" r="13" fill="#F79E1B"/>
                  <path d="M24 5.5a13 13 0 010 19 13 13 0 000-19z" fill="#FF5F00"/>
                </svg>
              </div>
              <div className="h-8 w-12 flex items-center justify-center">
                <svg viewBox="0 0 48 16" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.5.5L16 15.5h-3.5L16 .5h3.5zm15 10l1.5-4.5 1 4.5h-2.5zm3.5 5h3l-2.5-15h-3c-.6 0-1.1.3-1.3.8L29.5 15.5h3.5l.7-2h4.3v2zm-8-5c0-4-5.5-4.2-5.5-6 0-.5.5-1 1.7-1.2.6 0 2.1 0 3.9 1l.7-3.3c-1-.4-2.2-.7-3.7-.7-4 0-6.7 2.1-6.7 5 0 2.2 2 3.4 3.5 4.2 1.5.7 2 1.2 2 1.8 0 1-1.2 1.4-2.3 1.5-2 0-3.2-.5-4-.9l-.8 3.3c.9.4 2.6.8 4.4.8 4.2 0 6.9-2.1 6.9-5.2v-.4zM13.5.5L7 15.5H3.3L.1 3.3c-.2-.6-.3-1-.9-1.2-1-.5-2.5-1-3.8-1.3l.1-.3h5.3c.7 0 1.3.5 1.4 1.2l1.3 7 3.5-8.2h3.5z" fill="#1A1F71"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Need a custom plan?{' '}
              <a href="#contact" className="text-blue-600 font-medium hover:text-blue-700">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Modern SaaS Style */}
      <section className="py-32 bg-gray-50">
        <div ref={testimonialsRef.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 ${testimonialsRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
              Testimonials
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by educators
            </h2>
            <p className="text-xl text-gray-600">Real feedback from VTCs, colleges, and universities across Namibia</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`p-8 bg-white rounded-2xl border border-gray-200 ${
                  testimonialsRef.isInView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-900 mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="pt-6 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Modern SaaS Style */}
      <section
        ref={ctaRef.ref}
        className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"
      >
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${ctaRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to modernise your institution?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join educational institutions across Namibia. Start your 14-day free trial today—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section - Modern SaaS Style */}
      <section id="contact" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
              Get in Touch
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Have questions?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're here to help. Reach out and we'll respond as soon as possible.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-8 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:support@institux.com" className="text-blue-600 hover:text-blue-700 text-sm">
                support@institux.com
              </a>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <a href="https://wa.me/264813214813" className="text-green-600 hover:text-green-700 text-sm">
                +264 81 321 4813
              </a>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Schedule a call</h3>
              <a href="#" className="text-purple-600 hover:text-purple-700 text-sm">
                Book a demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Modern SaaS Style */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <button 
                onClick={scrollToTop}
                className="inline-block mb-4 cursor-pointer"
                aria-label="Go to top"
              >
                <div className="bg-white rounded-lg p-3 inline-flex items-center">
                  <Image
                    src="/institux-logo.png"
                    alt="InstituX Logo"
                    width={160}
                    height={40}
                    className="h-10 w-auto"
                  />
                </div>
              </button>
              <p className="text-gray-400 text-sm leading-relaxed">
                Complete management software for Namibian VTCs, colleges, universities, and academies. From enrollment to graduation.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li><a href="mailto:support@institux.com" className="text-sm text-gray-400 hover:text-white transition-colors">support@institux.com</a></li>
                <li><span className="text-sm text-gray-400">Windhoek, Namibia</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} InstituX. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-400">Secure & encrypted</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-110 group ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6 group-hover:animate-bounce" />
      </button>
    </div>
  )
}
