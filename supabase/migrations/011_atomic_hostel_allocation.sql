-- Create atomic function for hostel room allocation
-- This prevents race conditions by handling allocation and occupancy update in a single transaction

CREATE OR REPLACE FUNCTION allocate_student_to_room(
  p_center_id UUID,
  p_student_id UUID,
  p_room_id UUID,
  p_check_in_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room RECORD;
  v_existing_allocation RECORD;
  v_allocation_id UUID;
BEGIN
  -- Lock the room row to prevent concurrent modifications
  SELECT id, current_occupancy, capacity
  INTO v_room
  FROM hostel_rooms
  WHERE id = p_room_id AND center_id = p_center_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Room not found');
  END IF;

  -- Check if room has available space
  IF v_room.current_occupancy >= v_room.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Room is at full capacity');
  END IF;

  -- Check if student already has an active allocation
  SELECT id INTO v_existing_allocation
  FROM hostel_allocations
  WHERE student_id = p_student_id
    AND center_id = p_center_id
    AND status = 'checked_in'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Student already has an active room allocation');
  END IF;

  -- Create the allocation
  INSERT INTO hostel_allocations (center_id, student_id, room_id, check_in_date, status)
  VALUES (p_center_id, p_student_id, p_room_id, p_check_in_date, 'checked_in')
  RETURNING id INTO v_allocation_id;

  -- Update room occupancy atomically
  UPDATE hostel_rooms
  SET current_occupancy = current_occupancy + 1,
      updated_at = NOW()
  WHERE id = p_room_id;

  RETURN json_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'message', 'Student allocated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create atomic function for checkout
CREATE OR REPLACE FUNCTION checkout_student_from_room(
  p_allocation_id UUID,
  p_center_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
BEGIN
  -- Get and lock the allocation
  SELECT id, room_id, status
  INTO v_allocation
  FROM hostel_allocations
  WHERE id = p_allocation_id AND center_id = p_center_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Allocation not found');
  END IF;

  IF v_allocation.status != 'checked_in' THEN
    RETURN json_build_object('success', false, 'error', 'Student is not currently checked in');
  END IF;

  -- Update allocation status
  UPDATE hostel_allocations
  SET status = 'checked_out',
      check_out_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_allocation_id;

  -- Update room occupancy atomically
  UPDATE hostel_rooms
  SET current_occupancy = GREATEST(0, current_occupancy - 1),
      updated_at = NOW()
  WHERE id = v_allocation.room_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Student checked out successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION allocate_student_to_room TO authenticated;
GRANT EXECUTE ON FUNCTION checkout_student_from_room TO authenticated;

COMMENT ON FUNCTION allocate_student_to_room IS 'Atomically allocate a student to a hostel room';
COMMENT ON FUNCTION checkout_student_from_room IS 'Atomically checkout a student from their hostel room';
