-- ============================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- ============================================
-- Run this after migrations to populate test data

-- ============================================
-- CREATE TEST USERS IN AUTH
-- ============================================

-- Super Admin user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'admin@tutorialcenter.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Center Admin user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'authenticated',
    'authenticated',
    'center@absolute.edu.na',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Center Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Staff user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'authenticated',
    'authenticated',
    'staff@absolute.edu.na',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Staff Member"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Add identities for each user
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@tutorialcenter.com', '{"sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "email": "admin@tutorialcenter.com"}', 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'center@absolute.edu.na', '{"sub": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "email": "center@absolute.edu.na"}', 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'staff@absolute.edu.na', '{"sub": "c3d4e5f6-a7b8-9012-cdef-123456789012", "email": "staff@absolute.edu.na"}', 'email', NOW(), NOW(), NOW());

-- ============================================
-- TUTORIAL CENTERS
-- ============================================

INSERT INTO tutorial_centers (
    id, name, slug, email, phone, address, city,
    logo_url, primary_color, secondary_color,
    bank_name, account_number, branch_code,
    status, subscription_tier,
    hostel_module_enabled, transport_module_enabled, library_module_enabled, sms_module_enabled
) VALUES
(
    'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
    'Absolute Tutorial College',
    'absolute-tutorial',
    'info@absolute.edu.na',
    '+264 61 123 4567',
    '123 Education Street, Klein Windhoek',
    'Windhoek',
    NULL,
    '#1E40AF',
    '#F59E0B',
    'First National Bank',
    '62123456789',
    '280172',
    'active',
    'premium',
    TRUE, TRUE, FALSE, TRUE
),
(
    'e2f3a4b5-c6d7-8901-bcde-f12345678901',
    'Excellence Learning Centre',
    'excellence-learning',
    'info@excellence.edu.na',
    '+264 61 987 6543',
    '456 Academic Ave, Olympia',
    'Windhoek',
    NULL,
    '#059669',
    '#DC2626',
    'Bank Windhoek',
    '8001234567',
    '483872',
    'active',
    'basic',
    FALSE, FALSE, FALSE, FALSE
);

-- ============================================
-- USERS (Link to auth.users)
-- ============================================

INSERT INTO users (id, email, full_name, phone, role, center_id, is_active) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@tutorialcenter.com', 'Super Admin', '+264 81 000 0000', 'super_admin', NULL, TRUE),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'center@absolute.edu.na', 'John Ndapandula', '+264 81 111 1111', 'center_admin', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', TRUE),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'staff@absolute.edu.na', 'Maria Shikongo', '+264 81 222 2222', 'center_staff', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', TRUE);

-- ============================================
-- SUBJECTS (for Absolute Tutorial)
-- ============================================

INSERT INTO subjects (id, center_id, name, code, description, monthly_fee, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Mathematics', 'MATH', 'Grade 10-12 Mathematics', 450.00, TRUE),
('22222222-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Physical Science', 'PHYS', 'Grade 10-12 Physical Science', 450.00, TRUE),
('33333333-3333-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'English', 'ENG', 'Grade 10-12 English First Language', 350.00, TRUE),
('44444444-4444-4444-4444-444444444444', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Accounting', 'ACC', 'Grade 10-12 Accounting', 400.00, TRUE),
('55555555-5555-5555-5555-555555555555', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Biology', 'BIO', 'Grade 10-12 Biology', 400.00, TRUE);

-- ============================================
-- TEACHERS (for Absolute Tutorial)
-- ============================================

INSERT INTO teachers (id, center_id, full_name, email, phone, gender, qualification, specialization, date_joined, status) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Dr. Peter Amukoto', 'peter@absolute.edu.na', '+264 81 333 3333', 'male', 'PhD Mathematics', 'Mathematics, Statistics', '2022-01-15', 'active'),
('aaaaaaaa-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Ms. Sarah Heita', 'sarah@absolute.edu.na', '+264 81 444 4444', 'female', 'MSc Physics', 'Physical Science', '2022-03-01', 'active'),
('aaaaaaaa-3333-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Mr. Thomas Shipanga', 'thomas@absolute.edu.na', '+264 81 555 5555', 'male', 'BEd English', 'English, Literature', '2023-01-10', 'active'),
('aaaaaaaa-4444-4444-4444-444444444444', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Mrs. Anna Nghifikwa', 'anna@absolute.edu.na', '+264 81 666 6666', 'female', 'BCom Accounting', 'Accounting, Business Studies', '2021-06-15', 'active');

-- Link teachers to subjects
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
('aaaaaaaa-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555'),
('aaaaaaaa-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
('aaaaaaaa-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444');

-- ============================================
-- STUDENTS (for Absolute Tutorial)
-- ============================================

INSERT INTO students (
    id, center_id, student_number, full_name, email, phone, gender, date_of_birth,
    grade, school_name, address, parent_name, parent_phone, parent_email, relationship, status
) VALUES
('bbbbbbbb-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260001', 'Michael Angula', 'michael@student.com', '+264 81 701 0001', 'male', '2008-03-15', 'Grade 12', 'Windhoek High School', '123 Student Lane', 'Joseph Angula', '+264 81 801 0001', 'joseph@parent.com', 'Father', 'active'),
('bbbbbbbb-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260002', 'Emma Nashandi', 'emma@student.com', '+264 81 701 0002', 'female', '2008-07-22', 'Grade 12', 'St. Pauls College', '456 Academic St', 'Grace Nashandi', '+264 81 801 0002', 'grace@parent.com', 'Mother', 'active'),
('bbbbbbbb-3333-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260003', 'David Shikongo', 'david@student.com', '+264 81 701 0003', 'male', '2009-01-10', 'Grade 11', 'Concordia College', '789 Knowledge Ave', 'Peter Shikongo', '+264 81 801 0003', 'peter.s@parent.com', 'Father', 'active'),
('bbbbbbbb-4444-4444-4444-444444444444', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260004', 'Sarah Iipinge', 'sarah.i@student.com', '+264 81 701 0004', 'female', '2009-05-18', 'Grade 11', 'Delta Secondary', '321 Learning Rd', 'Martha Iipinge', '+264 81 801 0004', 'martha@parent.com', 'Mother', 'active'),
('bbbbbbbb-5555-5555-5555-555555555555', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260005', 'John Nangolo', 'john.n@student.com', '+264 81 701 0005', 'male', '2008-11-30', 'Grade 12', 'Academia Secondary', '654 Study Blvd', 'Elizabeth Nangolo', '+264 81 801 0005', 'liz@parent.com', 'Mother', 'active'),
('bbbbbbbb-6666-6666-6666-666666666666', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260006', 'Anna Hamutenya', 'anna.h@student.com', '+264 81 701 0006', 'female', '2009-09-05', 'Grade 11', 'Centaurus High', '987 Wisdom Way', 'James Hamutenya', '+264 81 801 0006', 'james@parent.com', 'Father', 'active'),
('bbbbbbbb-7777-7777-7777-777777777777', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260007', 'Peter Shifidi', 'peter.sh@student.com', '+264 81 701 0007', 'male', '2010-02-14', 'Grade 10', 'Windhoek High School', '147 Scholar St', 'Maria Shifidi', '+264 81 801 0007', 'maria.sh@parent.com', 'Mother', 'active'),
('bbbbbbbb-8888-8888-8888-888888888888', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'ABS260008', 'Grace Kapinga', 'grace.k@student.com', '+264 81 701 0008', 'female', '2010-06-25', 'Grade 10', 'St. Pauls College', '258 Education Ln', 'Thomas Kapinga', '+264 81 801 0008', 'thomas.k@parent.com', 'Father', 'active');

-- Enroll students in subjects
INSERT INTO student_subjects (student_id, subject_id, enrolled_date, is_active) VALUES
('bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-01-05', TRUE),
('bbbbbbbb-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE),
('bbbbbbbb-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '2026-01-05', TRUE),
('bbbbbbbb-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE),
('bbbbbbbb-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-01-05', TRUE),
('bbbbbbbb-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', '2026-01-05', TRUE),
('bbbbbbbb-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '2026-01-05', TRUE),
('bbbbbbbb-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE),
('bbbbbbbb-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '2026-01-05', TRUE),
('bbbbbbbb-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '2026-01-05', TRUE),
('bbbbbbbb-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE),
('bbbbbbbb-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE),
('bbbbbbbb-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '2026-01-05', TRUE),
('bbbbbbbb-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', '2026-01-05', TRUE),
('bbbbbbbb-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', '2026-01-05', TRUE);

-- ============================================
-- STUDENT FEES (January 2026)
-- ============================================

INSERT INTO student_fees (id, center_id, student_id, fee_month, fee_type, amount_due, amount_paid, status, due_date) VALUES
('fefefefe-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-1111-1111-1111-111111111111', '2026-01-01', 'tuition', 1250.00, 1250.00, 'paid', '2026-01-15'),
('fefefefe-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-2222-2222-2222-222222222222', '2026-01-01', 'tuition', 1200.00, 600.00, 'partial', '2026-01-15'),
('fefefefe-3333-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-3333-3333-3333-333333333333', '2026-01-01', 'tuition', 1300.00, 0.00, 'unpaid', '2026-01-15'),
('fefefefe-4444-4444-4444-444444444444', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-4444-4444-4444-444444444444', '2026-01-01', 'tuition', 750.00, 750.00, 'paid', '2026-01-15'),
('fefefefe-5555-5555-5555-555555555555', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-5555-5555-5555-555555555555', '2026-01-01', 'tuition', 900.00, 900.00, 'paid', '2026-01-15'),
('fefefefe-6666-6666-6666-666666666666', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-6666-6666-6666-666666666666', '2026-01-01', 'tuition', 750.00, 400.00, 'partial', '2026-01-15'),
('fefefefe-7777-7777-7777-777777777777', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-7777-7777-7777-777777777777', '2026-01-01', 'tuition', 800.00, 0.00, 'unpaid', '2026-01-15'),
('fefefefe-8888-8888-8888-888888888888', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-8888-8888-8888-888888888888', '2026-01-01', 'tuition', 1200.00, 1200.00, 'paid', '2026-01-15');

-- ============================================
-- PAYMENTS
-- ============================================

INSERT INTO payments (id, center_id, student_id, student_fee_id, amount, payment_method, reference_number, notes, recorded_by, payment_date) VALUES
('cacacaca-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-1111-1111-1111-111111111111', 'fefefefe-1111-1111-1111-111111111111', 1250.00, 'bank_transfer', 'FNB-2026-0001', 'January tuition paid in full', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-01-05'),
('cacacaca-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-2222-2222-2222-222222222222', 'fefefefe-2222-2222-2222-222222222222', 600.00, 'cash', NULL, 'Partial payment - balance N$600', 'c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-01-04'),
('cacacaca-4444-4444-4444-444444444444', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-4444-4444-4444-444444444444', 'fefefefe-4444-4444-4444-444444444444', 750.00, 'mobile_money', 'MPESA-123456', 'January tuition', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-01-03'),
('cacacaca-5555-5555-5555-555555555555', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-5555-5555-5555-555555555555', 'fefefefe-5555-5555-5555-555555555555', 900.00, 'bank_transfer', 'BWK-2026-0015', 'January fees', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-01-02'),
('cacacaca-6666-6666-6666-666666666666', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-6666-6666-6666-666666666666', 'fefefefe-6666-6666-6666-666666666666', 400.00, 'cash', NULL, 'Partial - will pay rest end of month', 'c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-01-04'),
('cacacaca-8888-8888-8888-888888888888', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'bbbbbbbb-8888-8888-8888-888888888888', 'fefefefe-8888-8888-8888-888888888888', 1200.00, 'card', 'VISA-****-9876', 'Full payment January', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-01-01');

-- ============================================
-- HOSTEL DATA
-- ============================================

-- Hostel Blocks
INSERT INTO hostel_blocks (id, center_id, name, description, gender_restriction, is_active) VALUES
('b10cb10c-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Block A - Boys', 'Main boys hostel block with 10 rooms', 'male', TRUE),
('b10cb10c-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Block B - Girls', 'Main girls hostel block with 8 rooms', 'female', TRUE),
('b10cb10c-3333-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'Block C - Mixed', 'New mixed block for senior students', NULL, TRUE);

-- Hostel Rooms
INSERT INTO hostel_rooms (id, center_id, block_id, room_number, room_type, capacity, current_occupancy, monthly_fee, is_active) VALUES
('a00aa00a-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-1111-1111-1111-111111111111', 'A101', 'shared', 2, 2, 1500.00, TRUE),
('a00aa00a-1112-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-1111-1111-1111-111111111111', 'A102', 'shared', 2, 1, 1500.00, TRUE),
('a00aa00a-1113-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-1111-1111-1111-111111111111', 'A103', 'single', 1, 0, 2000.00, TRUE),
('a00aa00a-1114-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-1111-1111-1111-111111111111', 'A104', 'shared', 3, 1, 1200.00, TRUE),
('a00aa00a-2221-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-2222-2222-2222-222222222222', 'B101', 'shared', 2, 2, 1500.00, TRUE),
('a00aa00a-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-2222-2222-2222-222222222222', 'B102', 'shared', 2, 1, 1500.00, TRUE),
('a00aa00a-2223-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-2222-2222-2222-222222222222', 'B103', 'single', 1, 1, 2000.00, TRUE),
('a00aa00a-3331-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-3333-3333-3333-333333333333', 'C101', 'single', 1, 0, 2500.00, TRUE),
('a00aa00a-3332-3333-3333-333333333333', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'b10cb10c-3333-3333-3333-333333333333', 'C102', 'single', 1, 0, 2500.00, TRUE);

-- Hostel Allocations
INSERT INTO hostel_allocations (id, center_id, room_id, student_id, check_in_date, status) VALUES
('a110a110-1111-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', '2026-01-05', 'checked_in'),
('a110a110-1112-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-1111-1111-1111-111111111111', 'bbbbbbbb-3333-3333-3333-333333333333', '2026-01-05', 'checked_in'),
('a110a110-1113-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-1112-1111-1111-111111111111', 'bbbbbbbb-5555-5555-5555-555555555555', '2026-01-05', 'checked_in'),
('a110a110-1114-1111-1111-111111111111', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-1114-1111-1111-111111111111', 'bbbbbbbb-7777-7777-7777-777777777777', '2026-01-05', 'checked_in'),
('a110a110-2221-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-2221-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', '2026-01-05', 'checked_in'),
('a110a110-2222-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-2221-2222-2222-222222222222', 'bbbbbbbb-4444-4444-4444-444444444444', '2026-01-05', 'checked_in'),
('a110a110-2223-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-2222-2222-2222-222222222222', 'bbbbbbbb-6666-6666-6666-666666666666', '2026-01-05', 'checked_in'),
('a110a110-2224-2222-2222-222222222222', 'd1e2f3a4-b5c6-7890-abcd-ef1234567890', 'a00aa00a-2223-2222-2222-222222222222', 'bbbbbbbb-8888-8888-8888-888888888888', '2026-01-05', 'checked_in');

-- ============================================
-- DONE!
-- ============================================
-- Test accounts:
-- Super Admin: admin@tutorialcenter.com / password123
-- Center Admin: center@absolute.edu.na / password123
-- Staff: staff@absolute.edu.na / password123
