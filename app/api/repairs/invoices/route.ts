import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInvoiceNotificationEmail } from '@/lib/emailService';
import {
  getInMemoryInvoice,
  setInMemoryInvoice,
  extractWorkflowMetadata,
  packWorkflowMetadata,
} from '@/lib/repairStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// In-memory fallback cache for development/demo resiliency
const inMemoryInvoices: Record<string, any> = {
  '01-LP-2026-0928': {
    id: 'c1111111-1111-1111-1111-111111111111',
    invoiceNumber: 'INV-01-2026-0928',
    jobOrderNumber: '01-LP-2026-0928',
    issueDate: '2026-09-28',
    paymentTiming: 'PAY_AFTER_REPAIR',
    paymentStatus: 'UNPAID',
    paymentMethod: 'ONLINE',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.vance@umak.edu.ph',
    deviceModel: 'Lenovo Legion 5 15ARH05',
    serialNumber: 'PF2X9Y8Z',
    assignedTechnician: 'Tech. Alex Torres',
    totalAmount: 1850.0,
    amountPaid: 0.0,
    onlinePaymentReference: null,
    settlementDate: null,
    billingNotes: 'Includes 30-day parts warranty for keyboard membrane.',
    items: [
      {
        id: 'item-1',
        workScope: 'Motherboard Ultrasonic Cleaning & Solder Rework',
        itemName: 'Daughterboard Flux & Ultrasonic Solvents',
        quantity: 1,
        unitCost: 650.0,
        totalCost: 650.0,
      },
      {
        id: 'item-2',
        workScope: 'Replacement Keyboard Membrane Assembly',
        itemName: 'OEM Keyboard Membrane (P/N: 5CB0Z21516)',
        quantity: 1,
        unitCost: 1200.0,
        totalCost: 1200.0,
      },
    ],
  },
  '02-PC-2026-0928': {
    id: 'c2222222-2222-2222-2222-222222222222',
    invoiceNumber: 'INV-02-2026-0928',
    jobOrderNumber: '02-PC-2026-0928',
    issueDate: '2026-09-28',
    paymentTiming: 'PAY_AFTER_REPAIR',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    clientName: 'Alyssa Gomez',
    clientEmail: 'alyssa.gomez@umak.edu.ph',
    deviceModel: 'Dell OptiPlex 7080 Micro Tower',
    serialNumber: 'DL7080-99X4',
    assignedTechnician: 'Tech. Alex Torres',
    totalAmount: 650.0,
    amountPaid: 0.0,
    onlinePaymentReference: null,
    settlementDate: null,
    billingNotes: 'Basic diagnostic & thermal paste repasting.',
    items: [
      {
        id: 'item-1',
        workScope: 'Bench Diagnostics & Contact Oxidation Cleaning',
        itemName: 'Contact Cleaner & Arctic MX-4 Compound',
        quantity: 1,
        unitCost: 500.0,
        totalCost: 500.0,
      },
      {
        id: 'item-2',
        workScope: 'Battery Replacement',
        itemName: 'CMOS CR2032 Lithium Cell',
        quantity: 1,
        unitCost: 150.0,
        totalCost: 150.0,
      },
    ],
  },
};

/**
 * Generates an Invoice ID following the required standard:
 * INV-[QUEUE]-[YEAR]-[MMDD]
 * Example: INV-01-2026-0930, INV-02-2026-0930
 * The daily queue sequence resets automatically on each new day.
 */
async function generateInvoiceNumber(supabase: any, targetDate: Date = new Date()): Promise<string> {
  const year = targetDate.getFullYear().toString();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const mmdd = `${month}${day}`;
  const pattern = new RegExp(`^INV-(\\d+)-${year}-${mmdd}$`);

  let maxQueue = 0;

  // 1. Check in-memory invoices cache for matches today
  Object.values(inMemoryInvoices).forEach((inv: any) => {
    if (inv?.invoiceNumber) {
      const match = String(inv.invoiceNumber).match(pattern);
      if (match && match[1]) {
        const q = parseInt(match[1], 10);
        if (!isNaN(q) && q > maxQueue) {
          maxQueue = q;
        }
      }
    }
  });

  // 2. Query database as source of truth if connected
  if (supabase) {
    try {
      // First try stored RPC if defined
      const { data: rpcNum, error: rpcErr } = await supabase.rpc('generate_invoice_number');
      if (!rpcErr && rpcNum && typeof rpcNum === 'string') {
        return rpcNum;
      }
    } catch (_) {
      // Continue to direct SQL query if RPC is not present
    }

    try {
      const suffix = `-${year}-${mmdd}`;
      const { data: rows, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `INV-%${suffix}`);

      if (!error && rows && Array.isArray(rows)) {
        rows.forEach((r: any) => {
          if (r?.invoice_number) {
            const match = String(r.invoice_number).match(pattern);
            if (match && match[1]) {
              const q = parseInt(match[1], 10);
              if (!isNaN(q) && q > maxQueue) {
                maxQueue = q;
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn('Database invoice number check warning:', err);
    }
  }

  const nextQueue = maxQueue + 1;
  const queueStr = String(nextQueue).padStart(2, '0');
  return `INV-${queueStr}-${year}-${mmdd}`;
}

// ── GET: Fetch invoice and invoice items for a Job Order ──
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobOrderId = searchParams.get('jobOrderId');
  const jobOrderNumber = searchParams.get('jobOrderNumber') || searchParams.get('rmaNumber');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const fallback = jobOrderNumber ? inMemoryInvoices[jobOrderNumber] : null;
    return NextResponse.json({
      invoice: fallback || null,
      items: fallback?.items || [],
      message: 'Supabase client unavailable, using fallback',
    });
  }

  try {
    let query = supabase.from('invoices').select('*, invoice_items(*), job_orders(*, repair_requests(*))');
    
    if (jobOrderId) {
      query = query.eq('job_order_id', jobOrderId);
    } else if (jobOrderNumber) {
      // Find job order by number
      const { data: jobOrder } = await supabase
        .from('job_orders')
        .select('id, job_order_number, repair_requests(client_name, client_email, device_model, serial_number, technician_evaluation)')
        .eq('job_order_number', jobOrderNumber)
        .maybeSingle();

      if (jobOrder) {
        query = query.eq('job_order_id', jobOrder.id);
      } else {
        // Fallback to checking inMemory or device_repairs table
        const { data: devRepair } = await supabase
          .from('device_repairs')
          .select('*')
          .eq('rma_number', jobOrderNumber)
          .maybeSingle();

        if (devRepair && devRepair.total_amount > 0) {
          const formatted = {
            id: `inv-${devRepair.rma_number}`,
            invoiceNumber: `INV-${devRepair.rma_number}`,
            jobOrderNumber: devRepair.rma_number,
            issueDate: devRepair.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            paymentTiming: devRepair.payment_timing || 'PAY_AFTER_REPAIR',
            paymentStatus: devRepair.payment_status || 'UNPAID',
            paymentMethod: devRepair.payment_method || 'CASH',
            clientName: devRepair.client_name,
            clientEmail: devRepair.client_email,
            deviceModel: devRepair.device_model,
            serialNumber: devRepair.serial_number,
            assignedTechnician: devRepair.technician_name || 'Tech. Alex Torres',
            totalAmount: Number(devRepair.total_amount || 0),
            amountPaid: Number(devRepair.amount_paid || 0),
            onlinePaymentReference: devRepair.online_payment_reference,
            settlementDate: devRepair.settlement_date,
            items: [
              {
                id: '1',
                workScope: 'Device Repair & Diagnostic Bench Service',
                itemName: devRepair.parts_replaced || 'Standard Service',
                quantity: 1,
                unitCost: Number(devRepair.total_amount || 0),
                totalCost: Number(devRepair.total_amount || 0),
              },
            ],
          };
          return NextResponse.json({ invoice: formatted, items: formatted.items });
        }

        const mem = inMemoryInvoices[jobOrderNumber];
        return NextResponse.json({ invoice: mem || null, items: mem?.items || [] });
      }
    }

    const { data: invoice, error } = await query.maybeSingle();

    if (error) {
      console.warn('Invoice fetch error:', error.message);
      const mem = jobOrderNumber ? inMemoryInvoices[jobOrderNumber] : null;
      return NextResponse.json({ invoice: mem || null, items: mem?.items || [] });
    }

    if (!invoice) {
      const mem = jobOrderNumber ? inMemoryInvoices[jobOrderNumber] : null;
      return NextResponse.json({ invoice: mem || null, items: mem?.items || [] });
    }

    // Format invoice with full hydrated fields
    const req = invoice.job_orders?.repair_requests;
    const items = (invoice.invoice_items || []).map((it: any) => ({
      id: it.id,
      workScope: it.work_scope,
      itemName: it.item_name || '',
      quantity: it.quantity || 1,
      unitCost: Number(it.unit_cost || 0),
      totalCost: Number(it.total_cost || (it.quantity || 1) * (it.unit_cost || 0)),
    }));

    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      jobOrderId: invoice.job_order_id,
      jobOrderNumber: invoice.job_orders?.job_order_number || jobOrderNumber,
      issueDate: invoice.issue_date || new Date().toISOString().split('T')[0],
      paymentTiming: invoice.payment_timing,
      paymentStatus: invoice.payment_status,
      paymentMethod: invoice.payment_method,
      clientName: req?.client_name || 'Client',
      clientEmail: req?.client_email,
      deviceModel: req?.device_model || 'Device',
      serialNumber: req?.serial_number || 'N/A',
      assignedTechnician: 'Tech. Alex Torres',
      totalAmount: Number(invoice.total_amount || 0),
      amountPaid: Number(invoice.amount_paid || 0),
      onlinePaymentReference: invoice.online_payment_reference,
      settlementDate: invoice.settlement_date,
      billingNotes: invoice.billing_notes,
      items,
    };

    return NextResponse.json({
      invoice: formattedInvoice,
      items,
    });
  } catch (err: any) {
    console.error('Error fetching invoice:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: Create or update Invoice with Line Items ──
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      jobOrderId,
      jobOrderNumber,
      paymentTiming = 'PAY_AFTER_REPAIR', // 'PAY_NOW' | 'PAY_AFTER_REPAIR'
      paymentStatus = 'UNPAID',           // 'UNPAID' | 'PAID'
      paymentMethod,                      // 'CASH' | 'ONLINE'
      amountPaid = 0,
      onlinePaymentReference,
      billingNotes,
      clientName,
      clientEmail,
      deviceModel,
      serialNumber,
      assignedTechnician,
      items = [],                         // Array of { workScope, itemName, quantity, unitCost }
    } = body;

    if (!jobOrderNumber && !jobOrderId) {
      return NextResponse.json(
        { error: 'jobOrderNumber or jobOrderId is required' },
        { status: 400 }
      );
    }

    const joNum = jobOrderNumber || 'JO-' + Date.now();

    // Compute item totals
    const calculatedItems = items.map((it: any, index: number) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitCost = Math.max(0, Number(it.unitCost) || 0);
      const scope = it.workScope?.trim() || 'Diagnostics & Labor Service';
      return {
        id: `item-${Date.now()}-${index}`,
        workScope: scope,
        itemName: it.itemName?.trim() || undefined,
        quantity: qty,
        unitCost: unitCost,
        totalCost: qty * unitCost,
      };
    });

    const totalAmount = calculatedItems.reduce((acc: number, curr: any) => acc + curr.totalCost, 0);

    // Strict validation according to specifications
    let resolvedPaymentStatus = paymentStatus;
    let resolvedAmountPaid = 0;
    let resolvedReference = onlinePaymentReference || null;
    let resolvedPaymentMethod = paymentMethod || null;

    if (paymentTiming === 'PAY_NOW') {
      if (paymentMethod === 'CASH') {
        const received = Number(amountPaid);
        if (isNaN(received) || received <= 0) {
          return NextResponse.json(
            { error: 'Amount received is required for Pay Now with Cash' },
            { status: 400 }
          );
        }
        resolvedAmountPaid = received;
        resolvedPaymentStatus = 'PAID';
        resolvedPaymentMethod = 'CASH';
      } else if (paymentMethod === 'ONLINE') {
        const paid = Number(amountPaid);
        if (isNaN(paid) || paid <= 0) {
          return NextResponse.json(
            { error: 'Amount paid is required for Pay Now with Online Payment' },
            { status: 400 }
          );
        }
        if (!onlinePaymentReference || !onlinePaymentReference.trim()) {
          return NextResponse.json(
            { error: 'Online payment reference number is required for Pay Now with Online Payment' },
            { status: 400 }
          );
        }
        resolvedAmountPaid = paid;
        resolvedPaymentStatus = 'PAID';
        resolvedPaymentMethod = 'ONLINE';
        resolvedReference = onlinePaymentReference.trim();
      }
    } else {
      // Pay After Repair: Default to UNPAID unless this is a settlement (explicit PAID + amountPaid)
      if (paymentStatus === 'PAID' && Number(amountPaid) > 0) {
        // Settlement scenario: technician is collecting payment at pickup
        resolvedPaymentStatus = 'PAID';
        resolvedAmountPaid = Number(amountPaid);
        resolvedPaymentMethod = paymentMethod || 'CASH';
        if (paymentMethod === 'ONLINE' && onlinePaymentReference) {
          resolvedReference = onlinePaymentReference.trim();
        }
      } else {
        resolvedPaymentStatus = 'UNPAID';
        resolvedAmountPaid = 0;
        resolvedReference = null;
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const supabase = getSupabaseAdmin();

    // Check if an existing invoice exists for this Job Order to preserve its invoice number
    let invoiceNumber = inMemoryInvoices[joNum]?.invoiceNumber;
    let existingInvId: string | null = null;
    let targetJobOrderId = jobOrderId;

    let resolvedEmail = clientEmail || inMemoryInvoices[joNum]?.clientEmail || null;
    let resolvedClientName = clientName || inMemoryInvoices[joNum]?.clientName || 'UMak Student / Faculty';
    let resolvedDevice = deviceModel || inMemoryInvoices[joNum]?.deviceModel || 'Hardware Unit';
    let resolvedSerial = serialNumber || inMemoryInvoices[joNum]?.serialNumber || 'N/A';
    let resolvedTechnician = assignedTechnician || inMemoryInvoices[joNum]?.assignedTechnician || 'Tech. Alex Torres';

    if (supabase) {
      try {
        if (!targetJobOrderId) {
          const { data: jo } = await supabase
            .from('job_orders')
            .select('id, repair_requests(client_name, client_email, device_model, serial_number)')
            .eq('job_order_number', joNum)
            .maybeSingle();
          if (jo) {
            targetJobOrderId = jo.id;
            const req = (jo as any).repair_requests;
            if (req) {
              if (req.client_email) resolvedEmail = req.client_email;
              if (req.client_name) resolvedClientName = req.client_name;
              if (req.device_model) resolvedDevice = req.device_model;
              if (req.serial_number) resolvedSerial = req.serial_number;
            }
          }
        }

        if (!resolvedEmail) {
          const { data: devRepair } = await supabase
            .from('device_repairs')
            .select('client_email, client_name, device_model, serial_number')
            .eq('rma_number', joNum)
            .maybeSingle();
          if (devRepair?.client_email) {
            resolvedEmail = devRepair.client_email;
            if (devRepair.client_name) resolvedClientName = devRepair.client_name;
            if (devRepair.device_model) resolvedDevice = devRepair.device_model;
            if (devRepair.serial_number) resolvedSerial = devRepair.serial_number;
          }
        }

        if (targetJobOrderId) {
          const { data: existingInv } = await supabase
            .from('invoices')
            .select('id, invoice_number')
            .eq('job_order_id', targetJobOrderId)
            .maybeSingle();

          if (existingInv) {
            existingInvId = existingInv.id;
            if (existingInv.invoice_number) {
              invoiceNumber = existingInv.invoice_number;
            }
          }
        }
      } catch (err) {
        console.warn('Error checking existing invoice in DB:', err);
      }
    }

    // If no existing invoice number found, generate a fresh sequential INV-[QUEUE]-[YEAR]-[MMDD]
    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber(supabase, new Date());
    }

    const formattedInvoice = {
      id: existingInvId || `inv-${Date.now()}`,
      invoiceNumber,
      jobOrderId: targetJobOrderId || jobOrderId || `jo-${joNum}`,
      jobOrderNumber: joNum,
      issueDate: todayDate,
      paymentTiming,
      paymentStatus: resolvedPaymentStatus,
      paymentMethod: resolvedPaymentMethod,
      clientName: resolvedClientName,
      clientEmail: resolvedEmail,
      deviceModel: resolvedDevice,
      serialNumber: resolvedSerial,
      assignedTechnician: resolvedTechnician,
      totalAmount,
      amountPaid: resolvedAmountPaid,
      onlinePaymentReference: resolvedReference,
      settlementDate: resolvedPaymentStatus === 'PAID' ? new Date().toISOString() : null,
      billingNotes: billingNotes || null,
      items: calculatedItems,
    };

    // Store in global in-memory cache and sync to extended repair store
    inMemoryInvoices[joNum] = formattedInvoice;
    setInMemoryInvoice(joNum, formattedInvoice);

    // Database persistence
    if (supabase) {
      try {
        // 1. Fetch existing device_repairs row to preserve evaluation and notes
        const { data: devRepairRec } = await supabase
          .from('device_repairs')
          .select('additional_inspection_notes')
          .eq('rma_number', joNum)
          .maybeSingle();

        const { cleanNotes, meta: existingMeta } = extractWorkflowMetadata(
          devRepairRec?.additional_inspection_notes
        );

        const updatedMeta = {
          ...existingMeta,
          billing: {
            paymentTiming: formattedInvoice.paymentTiming,
            paymentStatus: formattedInvoice.paymentStatus,
            paymentMethod: formattedInvoice.paymentMethod,
            totalAmount: Number(formattedInvoice.totalAmount || 0),
            amountPaid: Number(formattedInvoice.amountPaid || 0),
            onlinePaymentReference: formattedInvoice.onlinePaymentReference,
            settlementDate: formattedInvoice.settlementDate,
            billingNotes: formattedInvoice.billingNotes,
          },
        };

        // Update device_repairs table with embedded billing metadata
        await supabase
          .from('device_repairs')
          .update({
            updated_at: new Date().toISOString(),
            additional_inspection_notes: packWorkflowMetadata(cleanNotes, updatedMeta),
          })
          .eq('rma_number', joNum);

        // 2. Persist invoice to job_orders and invoices tables
        if (targetJobOrderId) {
          let invId = existingInvId;

          if (existingInvId) {
            await supabase
              .from('invoices')
              .update({
                invoice_number: invoiceNumber,
                issue_date: todayDate,
                payment_timing: paymentTiming,
                payment_status: resolvedPaymentStatus,
                payment_method: resolvedPaymentMethod,
                total_amount: totalAmount,
                amount_paid: resolvedAmountPaid,
                online_payment_reference: resolvedReference,
                settlement_date: resolvedPaymentStatus === 'PAID' ? new Date().toISOString() : null,
                billing_notes: billingNotes || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingInvId);

            await supabase.from('invoice_items').delete().eq('invoice_id', existingInvId);
          } else {
            const { data: newInv } = await supabase
              .from('invoices')
              .insert({
                job_order_id: targetJobOrderId,
                invoice_number: invoiceNumber,
                issue_date: todayDate,
                payment_timing: paymentTiming,
                payment_status: resolvedPaymentStatus,
                payment_method: resolvedPaymentMethod,
                total_amount: totalAmount,
                amount_paid: resolvedAmountPaid,
                online_payment_reference: resolvedReference,
                settlement_date: resolvedPaymentStatus === 'PAID' ? new Date().toISOString() : null,
                billing_notes: billingNotes || null,
              })
              .select('id')
              .single();

            invId = newInv?.id;
          }

          if (invId && calculatedItems.length > 0) {
            const itemsToInsert = calculatedItems.map((item: any) => ({
              invoice_id: invId,
              work_scope: 'LABOR_SERVICE',
              item_name: `${item.workScope}${item.itemName ? ' - ' + item.itemName : ''}`,
              quantity: item.quantity,
              unit_cost: item.unitCost,
              total_cost: item.totalCost,
            }));

            await supabase.from('invoice_items').insert(itemsToInsert);
          }
        }
      } catch (dbErr) {
        console.warn('Supabase billing sync warning:', dbErr);
      }
    }

    // ── Dispatch Brevo Email Notification to customer registered email ──
    let emailDispatched = false;
    let emailMessageId: string | undefined = undefined;

    if (resolvedEmail && resolvedEmail.includes('@')) {
      try {
        const emailRes = await sendInvoiceNotificationEmail({
          invoiceId: invoiceNumber,
          jobOrderId: joNum,
          issueDate: todayDate,
          paymentStatus: resolvedPaymentStatus,
          paymentMethod: resolvedPaymentMethod || 'N/A',
          clientName: resolvedClientName,
          clientEmail: resolvedEmail,
          device: resolvedDevice,
          serialNumber: resolvedSerial,
          assignedTechnician: resolvedTechnician,
          items: calculatedItems,
          totalAmount,
          amountPaid: resolvedAmountPaid,
          onlinePaymentReference: resolvedReference,
          billingNotes: billingNotes || null,
        });

        emailDispatched = emailRes.success;
        emailMessageId = emailRes.messageId;
        console.log(`[Invoices POST] Invoice notification email dispatched to ${resolvedEmail}: success=${emailRes.success}`);
      } catch (emailErr) {
        console.error('[Invoices POST] Error sending Brevo invoice email:', emailErr);
      }
    } else {
      console.warn(`[Invoices POST] Skipping email dispatch: No registered customer email found for ${joNum}`);
    }

    return NextResponse.json({
      success: true,
      invoice: formattedInvoice,
      items: calculatedItems,
      emailDispatched,
      emailMessageId,
    });
  } catch (err: any) {
    console.error('Invoice creation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
