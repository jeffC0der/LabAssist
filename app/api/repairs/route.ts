import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendRepairReceiptEmail } from '@/lib/emailService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Seed data for empty tables ──
const SEED_REPAIRS = [
  {
    rma_number: '01-LP-2026-0928',
    client_name: 'Marcus Vance',
    client_email: 'marcus.vance@umak.edu.ph',
    device_type: 'Laptop',
    device_model: 'Lenovo Legion 5 15ARH05',
    serial_number: 'PF2X9Y8Z',
    os_specs: 'Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050',
    reported_issue: 'Spilled coffee on keyboard and trackpad; spacebar sticky and no display output on external HDMI port.',
    inspection_scratches_dents: true,
    inspection_missing_screws_feet: false,
    inspection_screen_damage_dead_pixels: false,
    inspection_liquid_damage_indicators: true,
    additional_inspection_notes: 'Liquid residue visible near top-right palm rest. OEM 230W power brick included with unit.',
    status: 'IN_DIAGNOSTICS',
    priority: 'HIGH',
    technician_name: 'Tech. Alex Torres',
    technician_notes: 'Ultrasonic board wash completed for daughterboard. Testing HDMI IC solder pads under microscope.',
    parts_replaced: 'Keyboard membrane assembly ordered (P/N: 5CB0Z21516)',
  },
  {
    rma_number: '02-PC-2026-0928',
    client_name: 'Alyssa Gomez',
    client_email: 'alyssa.gomez@umak.edu.ph',
    device_type: 'Desktop',
    device_model: 'Dell OptiPlex 7080 Micro Tower',
    serial_number: 'DL7080-99X4',
    os_specs: 'Windows 11 Pro | Intel Core i7-10700 | 32GB RAM | 512GB NVMe SSD',
    reported_issue: 'Continuous 3 amber + 2 white power LED diagnostic code on boot. Fans spin up then immediately shut down.',
    inspection_scratches_dents: false,
    inspection_missing_screws_feet: true,
    inspection_screen_damage_dead_pixels: false,
    inspection_liquid_damage_indicators: false,
    additional_inspection_notes: 'Two rear chassis thumb screws missing. Internal dust buildup in CPU cooler.',
    status: 'REPAIR_IN_PROGRESS',
    priority: 'MEDIUM',
    technician_name: 'Tech. Alex Torres',
    technician_notes: 'Reseated DIMM slot 2. Re-applied Arctic MX-4 thermal paste. Testing 24hr MemTest86 run.',
    parts_replaced: 'CMOS CR2032 battery replaced',
  },
  {
    rma_number: '03-LP-2026-0928',
    client_name: 'Daniel Bautista',
    client_email: 'daniel.bautista@umak.edu.ph',
    device_type: 'Laptop',
    device_model: 'ASUS ROG Zephyrus G14 GA402RJ',
    serial_number: 'G14-8841Z',
    os_specs: 'Windows 11 Home | Ryzen 9 6900HS | 16GB DDR5 | Radeon RX 6700S',
    reported_issue: 'Overheating and thermal throttling under CAD workloads. CPU temps reach 96°C within 3 minutes of rendering.',
    inspection_scratches_dents: true,
    inspection_missing_screws_feet: false,
    inspection_screen_damage_dead_pixels: false,
    inspection_liquid_damage_indicators: false,
    additional_inspection_notes: 'Chassis rubber feet intact. Minor scuff on anodized top lid.',
    status: 'READY_FOR_PICKUP',
    priority: 'LOW',
    technician_name: 'Tech. Maria Santos',
    technician_notes: 'Liquid metal repasted on vapor chamber. Fan intake grills de-dusted. Stress test stable at 78°C under sustained load.',
    parts_replaced: 'Thermal Grizzly Conductonaut liquid metal',
  },
  {
    rma_number: '04-PC-2026-0928',
    client_name: 'Kristine Reyes',
    client_email: 'kristine.reyes@umak.edu.ph',
    device_type: 'Desktop',
    device_model: 'Custom Engineering Workstation (Fractal Node 202)',
    serial_number: 'ENG-LAB-CUST-04',
    os_specs: 'Ubuntu 22.04 LTS | Ryzen 7 5800X3D | 64GB ECC RAM | RTX 4070',
    reported_issue: 'GPU PCIe slot sagging caused intermittent PCIe x16 link disconnection, causing kernel panic during CUDA training.',
    inspection_scratches_dents: false,
    inspection_missing_screws_feet: false,
    inspection_screen_damage_dead_pixels: false,
    inspection_liquid_damage_indicators: false,
    additional_inspection_notes: 'Custom dual-slot GPU anti-sag bracket requested.',
    status: 'AWAITING_PARTS',
    priority: 'HIGH',
    technician_name: 'Tech. Alex Torres',
    technician_notes: 'PCIe slot pins inspected with endoscope. Sourcing heavy-duty PCIe riser and CNC aluminum support pillar.',
    parts_replaced: null,
  },
];

// Convert DB row → frontend shape
function rowToRepair(row: any) {
  return {
    id: row.rma_number,
    jobOrderNo: row.rma_number,
    clientName: row.client_name,
    clientEmail: row.client_email,
    deviceType: row.device_type,
    deviceModel: row.device_model,
    serialNumber: row.serial_number,
    osSpecs: row.os_specs || '',
    reportedIssue: row.reported_issue,
    inspectionNotes: {
      scratchesDents: row.inspection_scratches_dents ?? false,
      missingScrewsFeet: row.inspection_missing_screws_feet ?? false,
      screenDamageDeadPixels: row.inspection_screen_damage_dead_pixels ?? false,
      liquidDamageIndicators: row.inspection_liquid_damage_indicators ?? false,
    },
    additionalInspectionNotes: row.additional_inspection_notes || '',
    status: row.status,
    priority: row.priority,
    technicianAssigned: row.technician_name || undefined,
    technicianNotes: row.technician_notes || undefined,
    partsReplaced: row.parts_replaced || undefined,
    intakeDate: row.created_at || new Date().toISOString(),
    estimatedCompletion: row.estimated_completion || undefined,
    completedAt: row.completed_at || undefined,
    userId: row.user_id || undefined,
  };
}

// ── GET: Fetch all device repair records ──
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      repairs: SEED_REPAIRS.map((r) => ({
        id: r.rma_number,
        jobOrderNo: r.rma_number,
        clientName: r.client_name,
        clientEmail: r.client_email,
        deviceType: r.device_type,
        deviceModel: r.device_model,
        serialNumber: r.serial_number,
        osSpecs: r.os_specs,
        reportedIssue: r.reported_issue,
        inspectionNotes: {
          scratchesDents: r.inspection_scratches_dents,
          missingScrewsFeet: r.inspection_missing_screws_feet,
          screenDamageDeadPixels: r.inspection_screen_damage_dead_pixels,
          liquidDamageIndicators: r.inspection_liquid_damage_indicators,
        },
        additionalInspectionNotes: r.additional_inspection_notes,
        status: r.status,
        priority: r.priority,
        technicianAssigned: r.technician_name,
        technicianNotes: r.technician_notes,
        partsReplaced: r.parts_replaced,
        intakeDate: new Date().toISOString(),
      }))
    });
  }

  try {
    const { data, error } = await supabase
      .from('device_repairs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase device_repairs query error:', error.message);
      return NextResponse.json({ repairs: [] });
    }

    // Auto-seed if empty
    if (!data || data.length === 0) {
      try {
        await supabase.from('device_repairs').insert(SEED_REPAIRS);
        const { data: seeded } = await supabase
          .from('device_repairs')
          .select('*')
          .order('created_at', { ascending: false });
        return NextResponse.json({ repairs: (seeded || []).map(rowToRepair) });
      } catch (seedErr) {
        console.warn('Failed to seed device_repairs:', seedErr);
        return NextResponse.json({ repairs: [] });
      }
    }

    return NextResponse.json({ repairs: data.map(rowToRepair) });
  } catch (err: any) {
    console.error('Error fetching repairs:', err);
    return NextResponse.json({ repairs: [] });
  }
}

// ── POST: Submit a new device repair intake ──
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      clientName,
      clientEmail,
      deviceType,
      deviceModel,
      serialNumber,
      osSpecs,
      reportedIssue,
      inspectionNotes,
      additionalInspectionNotes,
      userId,
    } = body;

    if (!clientName || !clientEmail || !deviceModel || !reportedIssue) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, clientEmail, deviceModel, reportedIssue' },
        { status: 400 }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthDate = `${month}${day}`;
    const devCode = deviceType === 'Desktop' ? 'PC' : (deviceType === 'Laptop' ? 'LP' : 'PC');

    // Determine queue number based on intake date on technician side
    let queueNum = '01';
    if (supabase) {
      try {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const { count } = await supabase
          .from('device_repairs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        const currentCount = (count || 0) + 1;
        queueNum = String(currentCount).padStart(2, '0');
      } catch (cntErr) {
        console.warn('Could not count daily repairs:', cntErr);
      }
    }

    // Standard Job Order No format: 01-PC/LP-2026-0928
    const jobOrderNo = `${queueNum}-${devCode}-${year}-${monthDate}`;

    const row = {
      rma_number: jobOrderNo,
      user_id: userId || null,
      client_name: clientName,
      client_email: clientEmail,
      device_type: deviceType || 'Laptop',
      device_model: deviceModel,
      serial_number: serialNumber || 'UNTAGGED-S/N',
      os_specs: osSpecs || null,
      reported_issue: reportedIssue,
      inspection_scratches_dents: inspectionNotes?.scratchesDents ?? false,
      inspection_missing_screws_feet: inspectionNotes?.missingScrewsFeet ?? false,
      inspection_screen_damage_dead_pixels: inspectionNotes?.screenDamageDeadPixels ?? false,
      inspection_liquid_damage_indicators: inspectionNotes?.liquidDamageIndicators ?? false,
      additional_inspection_notes: additionalInspectionNotes || null,
      status: 'RECEIVED',
      priority: 'MEDIUM',
    };

    if (supabase) {
      const { error: insertErr } = await supabase
        .from('device_repairs')
        .insert(row);

      if (insertErr) {
        console.error('Supabase device_repairs insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    // Format Confirmation Date: e.g. September 28, 2026 | 11:15 AM
    const confirmationDate = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' | ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Format Physical Condition Notes
    const conditionNotesList: string[] = [];
    if (inspectionNotes?.scratchesDents) conditionNotesList.push('Scratches & Dents');
    if (inspectionNotes?.missingScrewsFeet) conditionNotesList.push('Missing Screws / Feet');
    if (inspectionNotes?.screenDamageDeadPixels) conditionNotesList.push('Screen Damage / Dead Pixels');
    if (inspectionNotes?.liquidDamageIndicators) conditionNotesList.push('Liquid Damage Indicators');
    const physicalConditionNotes = conditionNotesList.length > 0
      ? conditionNotesList.join(', ')
      : 'Clean Physical Condition (No pre-existing defect flagged)';

    // Trigger Brevo email receipt automatically
    let emailDispatched = false;
    try {
      const emailRes = await sendRepairReceiptEmail({
        clientName,
        clientEmail,
        jobOrderNo,
        confirmationDate,
        deviceType: deviceType || 'Laptop',
        deviceModel,
        serialNumber: serialNumber || 'UNTAGGED-S/N',
        osSpecs: osSpecs || 'N/A',
        reportedIssue,
        physicalConditionNotes,
        additionalInspectionRemarks: additionalInspectionNotes || 'None',
      });
      emailDispatched = emailRes.success;
    } catch (mailErr) {
      console.warn('Brevo email receipt dispatch warning:', mailErr);
    }

    return NextResponse.json({
      success: true,
      emailDispatched,
      jobOrderNo,
      confirmationDate,
      repair: rowToRepair({ ...row, created_at: now.toISOString() }),
    });
  } catch (err: any) {
    console.error('Repair POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update repair status, assign technician, add notes ──
export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { rmaNumber, status, technicianName, technicianNotes, partsReplaced, priority } = body;

    if (!rmaNumber) {
      return NextResponse.json({ error: 'rmaNumber is required' }, { status: 400 });
    }

    if (supabase) {
      const updates: any = { updated_at: new Date().toISOString() };
      if (status !== undefined) updates.status = status;
      if (technicianName !== undefined) updates.technician_name = technicianName;
      if (technicianNotes !== undefined) updates.technician_notes = technicianNotes;
      if (partsReplaced !== undefined) updates.parts_replaced = partsReplaced;
      if (priority !== undefined) updates.priority = priority;
      if (status === 'COMPLETED') updates.completed_at = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('device_repairs')
        .update(updates)
        .eq('rma_number', rmaNumber);

      if (updateErr) {
        console.error('Supabase device_repairs update error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, rmaNumber, status });
  } catch (err: any) {
    console.error('Repair PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
