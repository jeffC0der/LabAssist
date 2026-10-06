import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendRepairReceiptEmail, sendReadyForPickupEmail, sendFinalReceiptEmail } from '@/lib/emailService';
import {
  extractWorkflowMetadata,
  packWorkflowMetadata,
  getAllExtendedRepairs,
  getExtendedRepair,
  setExtendedRepair,
  getInMemoryInvoice,
} from '@/lib/repairStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Seed data for empty tables ──
const SEED_REPAIRS: any[] = [
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

// Convert DB row → frontend/API shape with full workflow attributes
function rowToRepair(row: any) {
  const rma = row.rma_number || row.job_order_number || row.request_number || row.id;
  const { cleanNotes, meta: dbMeta } = extractWorkflowMetadata(row.additional_inspection_notes);
  const memExt = getExtendedRepair(rma);
  const inMemoryInv = getInMemoryInvoice(rma);

  const ext = {
    ...dbMeta,
    ...memExt,
    evaluation: {
      ...(dbMeta.evaluation || {}),
      ...(memExt.evaluation || {}),
    },
    completion: {
      ...(dbMeta.completion || {}),
      ...(memExt.completion || {}),
    },
    cancellation: {
      ...(dbMeta.cancellation || {}),
      ...(memExt.cancellation || {}),
    },
    billing: {
      ...(dbMeta.billing || {}),
      ...(memExt.billing || {}),
      ...(inMemoryInv
        ? {
          paymentTiming: inMemoryInv.paymentTiming,
          paymentStatus: inMemoryInv.paymentStatus,
          paymentMethod: inMemoryInv.paymentMethod,
          totalAmount: Number(inMemoryInv.totalAmount || 0),
          amountPaid: Number(inMemoryInv.amountPaid || 0),
          onlinePaymentReference: inMemoryInv.onlinePaymentReference,
          settlementDate: inMemoryInv.settlementDate,
        }
        : {}),
    },
  };

  // Resolve status: prefer embedded workflow metadata status, otherwise fallback to DB column
  let resolvedStatus = ext.status || row.status || row.request_status || 'RECEIVED';
  if (row.status === 'CANCELLED' || row.status === 'COMPLETED' || row.status === 'READY_FOR_PICKUP') {
    resolvedStatus = row.status;
  }
  const isConfirmed = !['RECEIVED', 'PENDING_EVALUATION', 'UNDER_EVALUATION', 'EVALUATED'].includes(resolvedStatus);

  const defaultEvaluation = {
    evaluatorId: row.evaluator_id || ext.evaluation?.evaluatorId || undefined,
    technicianEvaluation:
      row.technician_evaluation ||
      ext.evaluation?.technicianEvaluation ||
      (isConfirmed ? 'Initial intake evaluation completed. Approved for lab service.' : undefined),
    repairFeasibility: row.repair_feasibility || ext.evaluation?.repairFeasibility || (isConfirmed ? 'FEASIBLE' : 'PENDING'),
    partsAvailability: row.parts_availability || ext.evaluation?.partsAvailability || 'IN_STOCK',
    confirmedDate: row.confirmed_date || ext.evaluation?.confirmedDate || undefined,
    confirmedTime: row.confirmed_time || ext.evaluation?.confirmedTime || undefined,
    confirmedLocation: row.confirmed_location || ext.evaluation?.confirmedLocation || undefined,
    evaluatedAt: row.evaluated_at || ext.evaluation?.evaluatedAt || undefined,
  };

  return {
    id: rma,
    jobOrderNo: rma,
    requestNumber: row.request_number || rma,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone || undefined,
    clientDepartment: row.client_department || 'Undergraduate Engineering',
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
    additionalInspectionNotes: cleanNotes || '',
    status: resolvedStatus,
    priority: row.priority || ext.priority || 'MEDIUM',
    technicianAssigned: row.technician_name || ext.technicianAssigned || undefined,
    technicianId: row.technician_id || ext.technicianId || undefined,
    technicianNotes: row.technician_notes || ext.technicianNotes || undefined,
    partsReplaced: row.parts_replaced || ext.partsReplaced || undefined,
    intakeDate: row.created_at || new Date().toISOString(),
    estimatedCompletion: row.estimated_completion || undefined,
    readyAt: ext.readyAt || row.ready_at || undefined,
    pickupLocation: ext.pickupLocation || row.pickup_location || ext.evaluation?.confirmedLocation || row.confirmed_location || undefined,
    deviceReleasedTo: ext.deviceReleasedTo || ext.completion?.deviceReleasedTo || row.device_released_to || undefined,
    completedAt: row.completed_at || ext.completedAt || ext.completion?.completedAt || undefined,
    userId: row.user_id || undefined,

    // Evaluation Data
    evaluation: {
      ...defaultEvaluation,
      ...(ext.evaluation || {}),
      confirmedDate: (ext.evaluation?.confirmedDate && ext.evaluation.confirmedDate.trim()) || row.confirmed_date || defaultEvaluation.confirmedDate || undefined,
      confirmedTime: (ext.evaluation?.confirmedTime && ext.evaluation.confirmedTime.trim()) || row.confirmed_time || defaultEvaluation.confirmedTime || undefined,
      confirmedLocation: (ext.evaluation?.confirmedLocation && ext.evaluation.confirmedLocation.trim()) || row.confirmed_location || defaultEvaluation.confirmedLocation || undefined,
    },

    // Completion & Release Data
    completion: {
      deviceReleasedTo: ext.deviceReleasedTo || ext.completion?.deviceReleasedTo || row.device_released_to || undefined,
      completedAt: row.completed_at || ext.completedAt || ext.completion?.completedAt || undefined,
    },

    // Cancellation Data
    cancellation:
      ext.cancellation && ext.cancellation.reason
        ? ext.cancellation
        : row.cancellation_reason
          ? {
            reason: row.cancellation_reason,
            description: row.cancellation_description || undefined,
            cancelledAt: row.cancelled_at || undefined,
            cancelledBy: row.cancelled_by || undefined,
          }
          : undefined,

    // Billing & Invoice Overview
    billing: {
      paymentTiming: ext.billing?.paymentTiming || row.payment_timing || 'PAY_AFTER_REPAIR',
      paymentStatus: ext.billing?.paymentStatus || row.payment_status || 'UNPAID',
      paymentMethod: ext.billing?.paymentMethod || row.payment_method || undefined,
      totalAmount: Number(ext.billing?.totalAmount ?? row.total_amount ?? 0),
      amountPaid: Number(ext.billing?.amountPaid ?? row.amount_paid ?? 0),
      onlinePaymentReference: ext.billing?.onlinePaymentReference || row.online_payment_reference || undefined,
      settlementDate: ext.billing?.settlementDate || row.settlement_date || undefined,
    },
  };
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// ── GET: Fetch all device repair records ──
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        repairs: SEED_REPAIRS.map(rowToRepair),
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const { data, error } = await supabase
      .from('device_repairs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase device_repairs query error:', error.message);
      return NextResponse.json({ repairs: [] }, { headers: NO_CACHE_HEADERS });
    }

    // Auto-seed if empty
    if (!data || data.length === 0) {
      try {
        await supabase.from('device_repairs').insert(SEED_REPAIRS);
        const { data: seeded } = await supabase
          .from('device_repairs')
          .select('*')
          .order('created_at', { ascending: false });
        return NextResponse.json(
          { repairs: (seeded || []).map(rowToRepair) },
          { headers: NO_CACHE_HEADERS }
        );
      } catch (seedErr) {
        console.warn('Failed to seed device_repairs:', seedErr);
        return NextResponse.json({ repairs: [] }, { headers: NO_CACHE_HEADERS });
      }
    }

    return NextResponse.json(
      { repairs: data.map(rowToRepair) },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error fetching repairs:', err);
    return NextResponse.json({ repairs: [] }, { headers: NO_CACHE_HEADERS });
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
      clientPhone,
      clientDepartment,
      deviceType,
      deviceModel,
      serialNumber,
      osSpecs,
      reportedIssue,
      inspectionNotes,
      additionalInspectionNotes,
      userId,
      evaluation,
      paymentTiming,
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

    let maxQueue = 0;
    const pattern = new RegExp(`^(\\d+)-[A-Za-z0-9]+-${year}-${monthDate}$`, 'i');
    const existingRmas = new Set<string>();

    if (supabase) {
      try {
        const { data: rows } = await supabase
          .from('device_repairs')
          .select('rma_number');

        if (rows && Array.isArray(rows)) {
          rows.forEach((r: any) => {
            if (r?.rma_number) {
              const rmaStr = String(r.rma_number).trim();
              existingRmas.add(rmaStr.toLowerCase());
              const match = rmaStr.match(pattern);
              if (match && match[1]) {
                const q = parseInt(match[1], 10);
                if (!isNaN(q) && q > maxQueue) maxQueue = q;
              }
            }
          });
        }
      } catch (cntErr) {
        console.warn('Could not count daily repairs:', cntErr);
      }
    }

    // Check extendedRepairStore cache
    const allRepairs = getAllExtendedRepairs();
    Object.keys(allRepairs).forEach((k) => {
      const rmaStr = String(k).trim();
      existingRmas.add(rmaStr.toLowerCase());
      const match = rmaStr.match(pattern);
      if (match && match[1]) {
        const q = parseInt(match[1], 10);
        if (!isNaN(q) && q > maxQueue) maxQueue = q;
      }
    });

    // Check seed repairs
    SEED_REPAIRS.forEach((r) => {
      if (r?.rma_number) {
        const rmaStr = String(r.rma_number).trim();
        existingRmas.add(rmaStr.toLowerCase());
        const match = rmaStr.match(pattern);
        if (match && match[1]) {
          const q = parseInt(match[1], 10);
          if (!isNaN(q) && q > maxQueue) maxQueue = q;
        }
      }
    });

    let nextQueue = maxQueue + 1;
    let queueNum = String(nextQueue).padStart(2, '0');
    let jobOrderNo = `${queueNum}-${devCode}-${year}-${monthDate}`;

    // Guarantee collision freedom
    while (existingRmas.has(jobOrderNo.toLowerCase())) {
      nextQueue += 1;
      queueNum = String(nextQueue).padStart(2, '0');
      jobOrderNo = `${queueNum}-${devCode}-${year}-${monthDate}`;
    }

    // Store extended workflow attributes
    const initialMeta = {
      status: 'RECEIVED',
      priority: 'MEDIUM' as const,
      evaluation: evaluation || {
        repairFeasibility: 'PENDING' as const,
        partsAvailability: 'IN_STOCK' as const,
      },
      billing: {
        paymentTiming: (paymentTiming as any) || 'PAY_AFTER_REPAIR',
        paymentStatus: 'UNPAID' as const,
        totalAmount: 0.00,
        amountPaid: 0.00,
      },
    };

    setExtendedRepair(jobOrderNo, initialMeta);

    // Valid Supabase device_repairs columns only to prevent schema cache errors
    const dbRow: any = {
      rma_number: jobOrderNo,
      user_id: userId || null,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone || null,
      client_department: clientDepartment || 'Undergraduate Engineering',
      device_type: deviceType || 'Laptop',
      device_model: deviceModel.trim(),
      serial_number: serialNumber?.trim() || 'UNTAGGED-S/N',
      os_specs: osSpecs?.trim() || null,
      reported_issue: reportedIssue.trim(),
      inspection_scratches_dents: inspectionNotes?.scratchesDents ?? false,
      inspection_missing_screws_feet: inspectionNotes?.missingScrewsFeet ?? false,
      inspection_screen_damage_dead_pixels: inspectionNotes?.screenDamageDeadPixels ?? false,
      inspection_liquid_damage_indicators: inspectionNotes?.liquidDamageIndicators ?? false,
      additional_inspection_notes: packWorkflowMetadata(additionalInspectionNotes?.trim(), initialMeta),
      status: 'RECEIVED',
      priority: 'MEDIUM',
    };

    if (supabase) {
      const { error: insertErr } = await supabase
        .from('device_repairs')
        .insert(dbRow);

      if (insertErr) {
        console.error('Supabase device_repairs insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    } else {
      SEED_REPAIRS.unshift({
        ...dbRow,
        created_at: now.toISOString(),
      });
    }

    // Format Confirmation Date
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
      repair: rowToRepair({ ...dbRow, created_at: now.toISOString() }),
    });
  } catch (err: any) {
    console.error('Repair POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update repair status, evaluation, billing, completion, or cancellation ──
export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      rmaNumber,
      status,
      technicianName,
      technicianId,
      technicianNotes,
      partsReplaced,
      priority,
      // Evaluation
      technicianEvaluation,
      repairFeasibility,
      partsAvailability,
      confirmedDate,
      confirmedTime,
      confirmedLocation,
      evaluatorId,
      // Completion
      deviceReleasedTo,
      completedAt,
      // Cancellation
      cancellationReason,
      cancellationDescription,
      cancelledAt,
      cancelledBy,
      // Billing & Invoices
      paymentTiming,
      paymentStatus,
      paymentMethod,
      totalAmount,
      amountPaid,
      onlinePaymentReference,
      settlementDate,
      // Pickup Workflow
      pickupLocation,
      readyAt,
      clientEmail,
      clientName,
      deviceModel,
      isAdmin,
    } = body;

    if (!rmaNumber) {
      return NextResponse.json({ error: 'rmaNumber is required' }, { status: 400 });
    }

    // ── Pre-fetch existing record to inspect current status & payment conditions ──
    let existingRecord: any = null;
    if (supabase) {
      const { data: rec } = await supabase
        .from('device_repairs')
        .select('*')
        .eq('rma_number', rmaNumber)
        .maybeSingle();
      existingRecord = rec;
    } else {
      existingRecord = SEED_REPAIRS.find((r: any) => r.rma_number === rmaNumber);
    }

    const { cleanNotes, meta: existingDbMeta } = extractWorkflowMetadata(existingRecord?.additional_inspection_notes);
    const existingMem = getExtendedRepair(rmaNumber);
    const inMemoryInv = getInMemoryInvoice(rmaNumber);

    const currentExt = {
      ...existingDbMeta,
      ...existingMem,
      evaluation: {
        ...(existingDbMeta.evaluation || {}),
        ...(existingMem.evaluation || {}),
      },
      completion: {
        ...(existingDbMeta.completion || {}),
        ...(existingMem.completion || {}),
      },
      cancellation: {
        ...(existingDbMeta.cancellation || {}),
        ...(existingMem.cancellation || {}),
      },
      billing: {
        ...(existingDbMeta.billing || {}),
        ...(existingMem.billing || {}),
        ...(inMemoryInv
          ? {
            paymentTiming: inMemoryInv.paymentTiming,
            paymentStatus: inMemoryInv.paymentStatus,
            paymentMethod: inMemoryInv.paymentMethod,
            totalAmount: Number(inMemoryInv.totalAmount || 0),
            amountPaid: Number(inMemoryInv.amountPaid || 0),
            onlinePaymentReference: inMemoryInv.onlinePaymentReference,
            settlementDate: inMemoryInv.settlementDate,
          }
          : {}),
      },
    };

    const currentStatus = existingRecord?.status || currentExt.status || 'RECEIVED';
    const resolvedStatus = status || currentStatus;

    // Prevent further repair-status changes unless an administrator explicitly reopens the Job Order
    if (currentStatus === 'COMPLETED' && status && status !== 'COMPLETED' && !isAdmin) {
      return NextResponse.json(
        { error: 'This Job Order is already Completed. Further repair-status changes are locked unless reopened by an administrator.' },
        { status: 403 }
      );
    }

    // ── Validation for Job Order Completion ──
    if (status === 'COMPLETED') {
      const recipient = (deviceReleasedTo || '').trim();
      if (!recipient) {
        return NextResponse.json(
          { error: 'Device Released To recipient name is required to complete the Job Order.' },
          { status: 400 }
        );
      }

      // Check payment requirement
      const billingTotal = Number(totalAmount || currentExt.billing?.totalAmount || existingRecord?.total_amount || 0);
      const isPaid = (paymentStatus === 'PAID' || currentExt.billing?.paymentStatus === 'PAID') || billingTotal === 0;

      if (!isPaid) {
        return NextResponse.json(
          { error: 'Payment requirements have not been settled for this Job Order. Please settle payment before completing.' },
          { status: 400 }
        );
      }
    }

    let resolvedEmail = clientEmail || existingRecord?.client_email;
    let resolvedClientName = clientName || existingRecord?.client_name;
    let resolvedDeviceModel = deviceModel || existingRecord?.device_model;
    let resolvedLocation = pickupLocation || confirmedLocation || currentExt.pickupLocation || 'Electronics Diagnostics & Repair Desk - Room 402';
    let resolvedReadyAt = readyAt || currentExt.readyAt || new Date().toISOString();

    // Build consolidated workflow metadata
    const updatedExt = {
      ...currentExt,
      status: resolvedStatus,
      technicianAssigned: technicianName !== undefined ? technicianName : currentExt.technicianAssigned,
      technicianId: technicianId !== undefined ? technicianId : currentExt.technicianId,
      technicianNotes: technicianNotes !== undefined ? technicianNotes : currentExt.technicianNotes,
      partsReplaced: partsReplaced !== undefined ? partsReplaced : currentExt.partsReplaced,
      readyAt: resolvedReadyAt,
      pickupLocation: resolvedLocation,
      deviceReleasedTo: deviceReleasedTo || currentExt.deviceReleasedTo,
      completedAt: completedAt || (resolvedStatus === 'COMPLETED' ? new Date().toISOString() : currentExt.completedAt),
      evaluation: {
        ...(currentExt.evaluation || {}),
        ...(technicianEvaluation !== undefined ? { technicianEvaluation } : {}),
        ...(repairFeasibility !== undefined ? { repairFeasibility } : {}),
        ...(partsAvailability !== undefined ? { partsAvailability } : {}),
        ...(confirmedDate !== undefined ? { confirmedDate } : {}),
        ...(confirmedTime !== undefined ? { confirmedTime } : {}),
        ...(confirmedLocation !== undefined ? { confirmedLocation } : {}),
        ...(evaluatorId !== undefined ? { evaluatorId } : {}),
      },
      cancellation: cancellationReason
        ? {
          reason: cancellationReason,
          description: cancellationDescription,
          cancelledAt: cancelledAt || new Date().toISOString(),
          cancelledBy,
        }
        : currentExt.cancellation,
      completion: deviceReleasedTo
        ? {
          deviceReleasedTo: deviceReleasedTo.trim(),
          completedAt: completedAt || new Date().toISOString(),
        }
        : currentExt.completion,
      billing: {
        ...(currentExt.billing || {}),
        ...(paymentTiming !== undefined ? { paymentTiming } : {}),
        ...(paymentStatus !== undefined ? { paymentStatus } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(totalAmount !== undefined ? { totalAmount: Number(totalAmount) } : {}),
        ...(amountPaid !== undefined ? { amountPaid: Number(amountPaid) } : {}),
        ...(onlinePaymentReference !== undefined ? { onlinePaymentReference } : {}),
        ...(settlementDate !== undefined ? { settlementDate } : {}),
      },
    };

    // Save to global cross-module store
    setExtendedRepair(rmaNumber, updatedExt);

    // Map application status to database-compatible status for Supabase check constraint
    // (PostgreSQL check constraint permits: RECEIVED, IN_DIAGNOSTICS, REPAIR_IN_PROGRESS, AWAITING_PARTS, READY_FOR_PICKUP, COMPLETED, CANCELLED)
    const mapStatusToDb = (st?: string): string | undefined => {
      if (!st) return undefined;
      if (st === 'CONFIRMED' || st === 'PENDING_EVALUATION' || st === 'UNDER_EVALUATION' || st === 'EVALUATED') {
        return 'IN_DIAGNOSTICS';
      }
      return st;
    };

    if (supabase) {
      // Update database row with safe columns and embedded workflow metadata
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
        additional_inspection_notes: packWorkflowMetadata(cleanNotes, updatedExt),
      };
      if (status !== undefined) dbUpdates.status = mapStatusToDb(status);
      if (technicianName !== undefined) dbUpdates.technician_name = technicianName;
      if (technicianId !== undefined) dbUpdates.technician_id = technicianId;
      if (technicianNotes !== undefined) dbUpdates.technician_notes = technicianNotes;
      if (partsReplaced !== undefined) dbUpdates.parts_replaced = partsReplaced;
      if (priority !== undefined) dbUpdates.priority = priority;
      if (completedAt !== undefined) {
        dbUpdates.completed_at = completedAt;
      } else if (resolvedStatus === 'COMPLETED') {
        dbUpdates.completed_at = new Date().toISOString();
      }

      const { error: updateErr } = await supabase
        .from('device_repairs')
        .update(dbUpdates)
        .eq('rma_number', rmaNumber);

      if (updateErr) {
        console.warn('Supabase device_repairs update warning:', updateErr.message);
      }
    } else {
      const found = SEED_REPAIRS.find((r: any) => r.rma_number === rmaNumber);
      if (found) {
        if (status !== undefined) found.status = resolvedStatus;
        if (technicianNotes !== undefined) found.technician_notes = technicianNotes;
        if (partsReplaced !== undefined) found.parts_replaced = partsReplaced;
        if (deviceReleasedTo !== undefined) found.device_released_to = deviceReleasedTo.trim();
        if (completedAt !== undefined) {
          found.completed_at = completedAt;
        } else if (resolvedStatus === 'COMPLETED') {
          found.completed_at = new Date().toISOString();
        }
      }
    }

    // ── Dispatch Brevo Ready for Pickup Email Notification ──
    let emailDispatched = false;
    let emailMessageId: string | undefined = undefined;

    if (status === 'READY_FOR_PICKUP') {
      if (resolvedEmail && resolvedEmail.includes('@')) {
        try {
          const emailRes = await sendReadyForPickupEmail({
            jobOrderId: rmaNumber,
            device: resolvedDeviceModel || 'Hardware Unit',
            clientName: resolvedClientName || 'UMak Student / Faculty',
            clientEmail: resolvedEmail,
            pickupLocation: resolvedLocation,
            readyAt: resolvedReadyAt,
          });

          emailDispatched = emailRes.success;
          emailMessageId = emailRes.messageId;
          console.log(`[Repair PATCH] Ready for pickup email sent to ${resolvedEmail}, success=${emailRes.success}`);
        } catch (emailErr) {
          console.error('[Repair PATCH] Failed to dispatch Ready for Pickup email:', emailErr);
        }
      }
    }

    // ── Dispatch Brevo Final Receipt Email Notification ──
    let finalReceiptEmailDispatched = false;
    let finalReceiptEmailMessageId: string | undefined = undefined;

    if (status === 'COMPLETED') {
      const ext = getExtendedRepair(rmaNumber);
      const actualInvoiceId = `INV-01-${rmaNumber.replace(/[^0-9]/g, '').slice(-8) || '2026'}`;
      const actualSettlementDate = settlementDate || ext.billing?.settlementDate || new Date().toISOString();
      const actualPaymentMethod = paymentMethod || ext.billing?.paymentMethod || 'CASH';
      const actualOnlineReference = onlinePaymentReference || ext.billing?.onlinePaymentReference;
      const actualTotalPaid = Number(amountPaid || ext.billing?.amountPaid || totalAmount || ext.billing?.totalAmount || 0);

      let formattedSettlementDate = actualSettlementDate;
      try {
        const dateObj = new Date(actualSettlementDate);
        if (!isNaN(dateObj.getTime())) {
          formattedSettlementDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      } catch (_) { }

      const methodNormalized =
        actualPaymentMethod.toUpperCase() === 'ONLINE' || !!actualOnlineReference
          ? 'Online'
          : 'Cash';

      const releaseRecipientName = (
        deviceReleasedTo ||
        ext.deviceReleasedTo ||
        resolvedClientName ||
        'Authorized Recipient'
      ).trim();

      if (resolvedEmail && resolvedEmail.includes('@')) {
        try {
          const receiptRes = await sendFinalReceiptEmail({
            invoiceId: actualInvoiceId,
            jobOrderId: rmaNumber,
            settlementDate: formattedSettlementDate,
            paymentStatus: 'PAID IN FULL',
            paymentMethod: methodNormalized,
            onlineReference: actualOnlineReference || undefined,
            totalPaid: actualTotalPaid,
            deviceReleasedTo: releaseRecipientName,
            clientEmail: resolvedEmail,
            clientName: resolvedClientName,
            deviceModel: resolvedDeviceModel,
          });

          finalReceiptEmailDispatched = receiptRes.success;
          finalReceiptEmailMessageId = receiptRes.messageId;
          console.log(`[Repair PATCH] Final receipt email sent to ${resolvedEmail}, success=${receiptRes.success}`);
        } catch (receiptEmailErr) {
          console.error('[Repair PATCH] Failed to dispatch Final Receipt email:', receiptEmailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      rmaNumber,
      status,
      readyAt: resolvedReadyAt,
      pickupLocation: resolvedLocation,
      emailDispatched,
      emailMessageId,
      finalReceiptEmailDispatched,
      finalReceiptEmailMessageId,
    });
  } catch (err: any) {
    console.error('Repair PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
