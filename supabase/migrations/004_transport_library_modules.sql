-- ============================================
-- TRANSPORT & LIBRARY MODULES
-- ============================================

-- ============================================
-- TRANSPORT MODULE
-- ============================================

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- 'bus', 'minibus', 'van'
    capacity INTEGER NOT NULL DEFAULT 20,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'maintenance', 'inactive'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, registration_number)
);

-- Routes table
CREATE TABLE transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pickup_points TEXT[], -- Array of pickup locations
    monthly_fee DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student transport assignments
CREATE TABLE student_transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    pickup_point VARCHAR(255),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'ended'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, route_id)
);

-- ============================================
-- LIBRARY MODULE
-- ============================================

-- Book categories
CREATE TABLE book_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(center_id, name)
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES book_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(20),
    publisher VARCHAR(255),
    publish_year INTEGER,
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    shelf_location VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'all_borrowed', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book borrowings
CREATE TABLE book_borrowings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    borrowed_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed', -- 'borrowed', 'returned', 'overdue'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_vehicles_center ON vehicles(center_id);
CREATE INDEX idx_transport_routes_center ON transport_routes(center_id);
CREATE INDEX idx_student_transport_center ON student_transport(center_id);
CREATE INDEX idx_student_transport_student ON student_transport(student_id);
CREATE INDEX idx_book_categories_center ON book_categories(center_id);
CREATE INDEX idx_books_center ON books(center_id);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_book_borrowings_center ON book_borrowings(center_id);
CREATE INDEX idx_book_borrowings_book ON book_borrowings(book_id);
CREATE INDEX idx_book_borrowings_student ON book_borrowings(student_id);
CREATE INDEX idx_book_borrowings_status ON book_borrowings(status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update available_copies when borrowing/returning
CREATE OR REPLACE FUNCTION update_book_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Borrowing a book
        UPDATE books
        SET available_copies = available_copies - 1,
            status = CASE WHEN available_copies - 1 = 0 THEN 'all_borrowed' ELSE status END
        WHERE id = NEW.book_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'borrowed' AND NEW.status = 'returned' THEN
        -- Returning a book
        UPDATE books
        SET available_copies = available_copies + 1,
            status = 'available'
        WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_availability
    AFTER INSERT OR UPDATE ON book_borrowings
    FOR EACH ROW
    EXECUTE FUNCTION update_book_availability();

-- Auto update timestamps
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transport_routes_updated_at
    BEFORE UPDATE ON transport_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_transport_updated_at
    BEFORE UPDATE ON student_transport
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_book_borrowings_updated_at
    BEFORE UPDATE ON book_borrowings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_borrowings ENABLE ROW LEVEL SECURITY;

-- Transport policies
CREATE POLICY "Center users can manage vehicles"
    ON vehicles FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all vehicles"
    ON vehicles FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage routes"
    ON transport_routes FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all routes"
    ON transport_routes FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage student transport"
    ON student_transport FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all student transport"
    ON student_transport FOR ALL
    USING (is_super_admin());

-- Library policies
CREATE POLICY "Center users can manage book categories"
    ON book_categories FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all book categories"
    ON book_categories FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage books"
    ON books FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all books"
    ON books FOR ALL
    USING (is_super_admin());

CREATE POLICY "Center users can manage borrowings"
    ON book_borrowings FOR ALL
    USING (center_id = get_user_center_id());

CREATE POLICY "Super admins can manage all borrowings"
    ON book_borrowings FOR ALL
    USING (is_super_admin());
