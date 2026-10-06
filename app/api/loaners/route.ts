import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Seed data for loaner items ──
const SEED_LOANER_ITEMS = [
  { id: 'LOAN-01', name: 'ESP32-S3 DevKit', category: 'Dev Kit', available: 6, total: 8, location: 'LAB-101 Cabinet A' },
  { id: 'LOAN-02', name: 'UART-TTL Adapter', category: 'Adapter', available: 3, total: 5, location: 'LAB-101 Cabinet B' },
  { id: 'LOAN-03', name: 'Digital Multimeter', category: 'Tool', available: 4, total: 6, location: 'LAB-103 Tool Rack' },
  { id: 'LOAN-04', name: 'DHT22 Temp/Humidity', category: 'Sensor', available: 10, total: 12, location: 'LAB-101 Sensor Drawer' },
  { id: 'LOAN-05', name: 'USB Logic Analyzer', category: 'Tool', available: 2, total: 3, location: 'LAB-103 Bench 2' },
  { id: 'LOAN-06', name: 'Raspberry Pi 4 (4GB)', category: 'Dev Kit', available: 3, total: 5, location: 'LAB-104 Cabinet C' },
];

function rowToLoanerItem(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    available: row.available,
    total: row.total,
    image: row.image || undefined,
    location: row.location,
  };
}

function rowToLoanerRequest(row: any) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    studentName: row.student_name,
    studentId: row.student_id,
    labRoom: row.lab_room,
    duration: row.duration,
    requestedAt: row.requested_at || new Date().toISOString(),
    status: row.status,
    lockerCode: row.locker_code || undefined,
    returnedAt: row.returned_at || undefined,
  };
}

// ── GET: Fetch loaner items and active requests ──
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ items: SEED_LOANER_ITEMS.map(rowToLoanerItem), requests: [] });
  }

  try {
    // Fetch items
    const { data: items, error: itemsErr } = await supabase
      .from('loaner_items')
      .select('*')
      .order('id', { ascending: true });

    // Auto-seed items if empty
    let finalItems = items || [];
    if (!items || items.length === 0) {
      try {
        await supabase.from('loaner_items').insert(SEED_LOANER_ITEMS);
        const { data: seeded } = await supabase.from('loaner_items').select('*').order('id');
        finalItems = seeded || SEED_LOANER_ITEMS;
      } catch (seedErr) {
        console.warn('Failed to seed loaner_items:', seedErr);
        finalItems = SEED_LOANER_ITEMS;
      }
    }

    // Fetch requests
    const { data: requests, error: reqErr } = await supabase
      .from('loaner_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (itemsErr) console.warn('loaner_items query warning:', itemsErr.message);
    if (reqErr) console.warn('loaner_requests query warning:', reqErr.message);

    return NextResponse.json({
      items: finalItems.map(rowToLoanerItem),
      requests: (requests || []).map(rowToLoanerRequest),
    });
  } catch (err: any) {
    console.error('Error fetching loaners:', err);
    return NextResponse.json({ items: SEED_LOANER_ITEMS.map(rowToLoanerItem), requests: [] });
  }
}

// ── POST: Create a new loaner request ──
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { itemId, itemName, studentName, studentId, labRoom, duration } = body;

    if (!itemId || !studentName || !studentId || !labRoom || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, studentName, studentId, labRoom, duration' },
        { status: 400 }
      );
    }

    const requestId = `REQ-${Math.floor(8800 + Math.random() * 900)}`;
    const lockerLetters = ['A', 'B', 'C', 'D'];
    const randomLocker = `LOCKER-${lockerLetters[Math.floor(Math.random() * lockerLetters.length)]}${Math.floor(1 + Math.random() * 6)}`;
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const lockerCode = `${randomLocker} · PIN ${randomPin}`;

    const row = {
      id: requestId,
      item_id: itemId,
      item_name: itemName || 'Hardware Item',
      student_name: studentName,
      student_id: studentId,
      lab_room: labRoom,
      duration,
      status: 'APPROVED',
      locker_code: lockerCode,
    };

    if (supabase) {
      // Insert request
      const { error: insertErr } = await supabase
        .from('loaner_requests')
        .insert(row);

      if (insertErr) {
        console.error('Supabase loaner_requests insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      // Decrement available count on the item
      const { data: currentItem } = await supabase
        .from('loaner_items')
        .select('available')
        .eq('id', itemId)
        .single();

      if (currentItem && currentItem.available > 0) {
        await supabase
          .from('loaner_items')
          .update({ available: currentItem.available - 1 })
          .eq('id', itemId);
      }
    }

    return NextResponse.json({
      success: true,
      request: rowToLoanerRequest({ ...row, requested_at: new Date().toISOString() }),
      lockerCode,
    });
  } catch (err: any) {
    console.error('Loaner POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update request status (CHECKED_OUT / RETURNED) ──
export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { requestId, status, itemId } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: 'requestId and status are required' }, { status: 400 });
    }

    if (supabase) {
      const updates: any = { status };
      if (status === 'RETURNED') updates.returned_at = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('loaner_requests')
        .update(updates)
        .eq('id', requestId);

      if (updateErr) {
        console.error('Supabase loaner_requests update error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // If returned, increment available count
      if (status === 'RETURNED' && itemId) {
        const { data: currentItem } = await supabase
          .from('loaner_items')
          .select('available, total')
          .eq('id', itemId)
          .single();

        if (currentItem && currentItem.available < currentItem.total) {
          await supabase
            .from('loaner_items')
            .update({ available: currentItem.available + 1 })
            .eq('id', itemId);
        }
      }
    }

    return NextResponse.json({ success: true, requestId, status });
  } catch (err: any) {
    console.error('Loaner PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
