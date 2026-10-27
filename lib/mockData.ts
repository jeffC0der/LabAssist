// ─── Mock Data Library ───────────────────────────────────────────────────────

export type TicketStatus = 'PENDING' | 'DISPATCHED' | 'UNDER_REPAIR' | 'RESOLVED';
export type TicketCategory = 'DISPLAY' | 'PERIPHERALS' | 'POWER/UPS' | 'NET/SOFTWARE';
export type TicketKey = 'A' | 'B' | 'C' | 'D';

export interface Ticket {
  ticket_id: string;
  lab_id: string;
  pc_num: string;
  category: TicketCategory;
  key: TicketKey;
  timestamp: string;
  status: TicketStatus;
  reporter: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignee?: string;
  resolvedAt?: string;
  notes?: string;
  userId?: string;
  userEmail?: string;
}

export const KEY_CATEGORY_MAP: Record<TicketKey, TicketCategory> = {
  A: 'DISPLAY',
  B: 'PERIPHERALS',
  C: 'POWER/UPS',
  D: 'NET/SOFTWARE',
};

export const CATEGORY_DESCRIPTIONS: Record<TicketCategory, string> = {
  'DISPLAY': 'Monitor, projector, or display output issues',
  'PERIPHERALS': 'Keyboard, mouse, USB hub, or input device faults',
  'POWER/UPS': 'Power supply, UPS battery, or electrical issues',
  'NET/SOFTWARE': 'Network connectivity, OS, or software failures',
};

export const LAB_ROOMS = ['All Labs', 'LAB-101', 'LAB-102', 'LAB-103', 'LAB-104', 'LAB-105'];

export function getKPIData(tickets: Ticket[]) {
  const pending = tickets.filter(t => t.status === 'PENDING').length;
  const dispatched = tickets.filter(t => t.status === 'DISPATCHED').length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED');
  
  // Calculate avg resolution time in minutes
  let avgRes = 0;
  if (resolved.length > 0) {
    const times = resolved
      .filter(t => t.resolvedAt)
      .map(t => {
        const start = new Date(t.timestamp).getTime();
        const end = new Date(t.resolvedAt!).getTime();
        return (end - start) / 60000;
      });
    avgRes = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }

  return {
    total: tickets.length,
    pending,
    dispatched,
    resolved: resolved.length,
    avgResolutionMins: Math.abs(avgRes),
  };
}

// ─── Student Portal Mock Data ──────────────────────────────────────────────────

export type WorkstationStatus = 'ONLINE' | 'OCCUPIED' | 'ISSUE_REPORTED' | 'UNDER_REPAIR';

export interface Workstation {
  id: string; // e.g. PC-01
  labId: string; // e.g. LAB-101
  status: WorkstationStatus;
  user?: string;
  ip: string;
  specs: string;
  lastPing: string;
  activeIssue?: string;
}

export interface LoanerItem {
  id: string;
  name: string;
  category: 'Dev Kit' | 'Adapter' | 'Tool' | 'Sensor';
  available: number;
  total: number;
  image?: string;
  location: string;
}

export interface LoanerRequest {
  id: string;
  itemId: string;
  itemName: string;
  studentName: string;
  studentId: string;
  labRoom: string;
  duration: string;
  requestedAt: string;
  status: 'APPROVED' | 'CHECKED_OUT' | 'RETURNED';
  lockerCode?: string;
}

export const MOCK_LOANER_ITEMS: LoanerItem[] = [
  { id: 'LOAN-01', name: 'ESP32-S3 Dual-Core Dev Kit', category: 'Dev Kit', available: 8, total: 12, location: 'Cabinet A-02' },
  { id: 'LOAN-02', name: 'Arduino Giga R1 WiFi Board', category: 'Dev Kit', available: 4, total: 6, location: 'Cabinet A-03' },
  { id: 'LOAN-03', name: 'USB-C to 4K 60Hz HDMI Adapter', category: 'Adapter', available: 14, total: 20, location: 'Drawer B-01' },
  { id: 'LOAN-04', name: 'DisplayPort to VGA Converter', category: 'Adapter', available: 6, total: 10, location: 'Drawer B-02' },
  { id: 'LOAN-05', name: 'Fluke 117 True-RMS Multimeter', category: 'Tool', available: 5, total: 8, location: 'Cabinet C-01' },
  { id: 'LOAN-06', name: 'Saleae 8-Channel Logic Analyzer', category: 'Tool', available: 3, total: 4, location: 'Cabinet C-04' },
  { id: 'LOAN-07', name: '100MHz Oscilloscope Probe Set', category: 'Tool', available: 9, total: 12, location: 'Cabinet C-05' },
  { id: 'LOAN-08', name: 'BME680 Environmental Sensor Kit', category: 'Sensor', available: 7, total: 10, location: 'Drawer D-02' },
];

export const MOCK_LOANER_REQUESTS: LoanerRequest[] = [
  {
    id: 'REQ-8821',
    itemId: 'LOAN-01',
    itemName: 'ESP32-S3 Dual-Core Dev Kit',
    studentName: 'Marcus Vance',
    studentId: '2024-88912',
    labRoom: 'LAB-101',
    duration: '2 Hours (Class Lab)',
    requestedAt: '12m ago',
    status: 'APPROVED',
    lockerCode: 'LOCKER-B4 · PIN 4912',
  },
  {
    id: 'REQ-8819',
    itemId: 'LOAN-03',
    itemName: 'USB-C to 4K 60Hz HDMI Adapter',
    studentName: 'Clara Chen',
    studentId: '2023-74120',
    labRoom: 'LAB-102',
    duration: 'Full Session',
    requestedAt: '35m ago',
    status: 'CHECKED_OUT',
    lockerCode: 'LOCKER-A1',
  },
];

// ─── Admin Console Mock Data ───────────────────────────────────────────────────

export interface ESP32Node {
  id: string;
  name: string;
  labRoom: string;
  cluster: string;
  macAddress: string;
  ipAddress: string;
  rssi: number; // dBm e.g. -54
  powerSource: 'AC Mains' | 'Battery Backup (98%)' | 'Battery Backup (74%)';
  pingMs: number;
  uptime: string;
  firmware: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastSeen: string;
  assignedStations: string;
}

export const MOCK_ESP32_FLEET: ESP32Node[] = [
  {
    id: 'ESP-NODE-101A',
    name: 'Lab 101 South Cluster Hub',
    labRoom: 'LAB-101',
    cluster: 'Cluster Alpha (PC 01-12)',
    macAddress: '24:6F:28:B1:3C:4E',
    ipAddress: '192.168.4.102',
    rssi: -54,
    powerSource: 'AC Mains',
    pingMs: 12,
    uptime: '24d 18h 41m',
    firmware: 'v2.4.2-iot',
    status: 'ONLINE',
    lastSeen: 'Just now',
    assignedStations: 'PC-01 – PC-12',
  },
  {
    id: 'ESP-NODE-101B',
    name: 'Lab 101 North Cluster Hub',
    labRoom: 'LAB-101',
    cluster: 'Cluster Beta (PC 13-24)',
    macAddress: '24:6F:28:B1:3C:5F',
    ipAddress: '192.168.4.103',
    rssi: -62,
    powerSource: 'AC Mains',
    pingMs: 16,
    uptime: '24d 18h 39m',
    firmware: 'v2.4.2-iot',
    status: 'ONLINE',
    lastSeen: '1s ago',
    assignedStations: 'PC-13 – PC-24',
  },
  {
    id: 'ESP-NODE-102A',
    name: 'Lab 102 Main Gateway',
    labRoom: 'LAB-102',
    cluster: 'Cluster Main (PC 01-20)',
    macAddress: 'A0:B7:65:F4:11:2D',
    ipAddress: '192.168.4.105',
    rssi: -49,
    powerSource: 'AC Mains',
    pingMs: 9,
    uptime: '18d 04h 12m',
    firmware: 'v2.4.2-iot',
    status: 'ONLINE',
    lastSeen: 'Just now',
    assignedStations: 'PC-01 – PC-20',
  },
  {
    id: 'ESP-NODE-103A',
    name: 'Lab 103 Embedded Master Hub',
    labRoom: 'LAB-103',
    cluster: 'Cluster Core (PC 01-18)',
    macAddress: '3C:71:BF:8E:22:90',
    ipAddress: '192.168.4.110',
    rssi: -78,
    powerSource: 'Battery Backup (74%)',
    pingMs: 38,
    uptime: '06d 12h 05m',
    firmware: 'v2.3.9-legacy',
    status: 'DEGRADED',
    lastSeen: '4s ago',
    assignedStations: 'PC-01 – PC-18',
  },
  {
    id: 'ESP-NODE-104A',
    name: 'Lab 104 Electronics Cluster',
    labRoom: 'LAB-104',
    cluster: 'Cluster Alpha (PC 01-24)',
    macAddress: '58:BF:25:AA:99:1C',
    ipAddress: '192.168.4.114',
    rssi: -58,
    powerSource: 'AC Mains',
    pingMs: 14,
    uptime: '31d 02h 45m',
    firmware: 'v2.4.2-iot',
    status: 'ONLINE',
    lastSeen: '2s ago',
    assignedStations: 'PC-01 – PC-24',
  },
  {
    id: 'ESP-NODE-105A',
    name: 'Lab 105 Apple Studio Hub',
    labRoom: 'LAB-105',
    cluster: 'Cluster Mac (PC 01-16)',
    macAddress: '84:CC:A8:54:E3:7A',
    ipAddress: '192.168.4.120',
    rssi: -51,
    powerSource: 'AC Mains',
    pingMs: 11,
    uptime: '12d 20h 18m',
    firmware: 'v2.4.2-iot',
    status: 'ONLINE',
    lastSeen: 'Just now',
    assignedStations: 'PC-01 – PC-16',
  },
];
