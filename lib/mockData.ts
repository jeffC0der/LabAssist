// ─── Mock Data Library ───────────────────────────────────────────────────────

export type TicketStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED';
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

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const MOCK_TICKETS: Ticket[] = [
  {
    ticket_id: 'TKT-2401',
    lab_id: 'LAB-302',
    pc_num: 'PC-07',
    category: 'DISPLAY',
    key: 'A',
    timestamp: minsAgo(5),
    status: 'PENDING',
    reporter: 'Student Kiosk',
    description: 'Monitor shows no signal after power cycle. Display backlight flickers intermittently.',
    priority: 'HIGH',
  },
  {
    ticket_id: 'TKT-2402',
    lab_id: 'LAB-101',
    pc_num: 'PC-12',
    category: 'NET/SOFTWARE',
    key: 'D',
    timestamp: minsAgo(12),
    status: 'DISPATCHED',
    reporter: 'Student Kiosk',
    description: 'Cannot connect to campus network. IP address not assigned by DHCP.',
    priority: 'MEDIUM',
    assignee: 'Tech. Rivera',
  },
  {
    ticket_id: 'TKT-2403',
    lab_id: 'LAB-204',
    pc_num: 'PC-03',
    category: 'POWER/UPS',
    key: 'C',
    timestamp: minsAgo(18),
    status: 'PENDING',
    reporter: 'Student Kiosk',
    description: 'UPS beeping continuously. PC shuts off unexpectedly under load.',
    priority: 'HIGH',
  },
  {
    ticket_id: 'TKT-2404',
    lab_id: 'LAB-302',
    pc_num: 'PC-15',
    category: 'PERIPHERALS',
    key: 'B',
    timestamp: minsAgo(25),
    status: 'RESOLVED',
    reporter: 'Student Kiosk',
    description: 'USB keyboard unresponsive. Mouse still works. Keys physically stuck.',
    priority: 'LOW',
    assignee: 'Tech. Santos',
    resolvedAt: minsAgo(8),
    notes: 'Replaced keyboard from spare inventory. Tested and confirmed working.',
  },
  {
    ticket_id: 'TKT-2405',
    lab_id: 'LAB-401',
    pc_num: 'PC-09',
    category: 'DISPLAY',
    key: 'A',
    timestamp: minsAgo(31),
    status: 'DISPATCHED',
    reporter: 'Student Kiosk',
    description: 'Screen has horizontal tear lines. HDMI cable may be loose.',
    priority: 'MEDIUM',
    assignee: 'Tech. Cruz',
  },
  {
    ticket_id: 'TKT-2406',
    lab_id: 'LAB-101',
    pc_num: 'PC-01',
    category: 'NET/SOFTWARE',
    key: 'D',
    timestamp: minsAgo(40),
    status: 'RESOLVED',
    reporter: 'Student Kiosk',
    description: 'Blue screen of death (BSOD) on Windows boot. Error: DRIVER_IRQL_NOT_LESS_OR_EQUAL.',
    priority: 'HIGH',
    assignee: 'Tech. Rivera',
    resolvedAt: minsAgo(15),
    notes: 'Updated NIC driver and disabled Fast Boot. System stable after 3 reboots.',
  },
  {
    ticket_id: 'TKT-2407',
    lab_id: 'LAB-205',
    pc_num: 'PC-22',
    category: 'PERIPHERALS',
    key: 'B',
    timestamp: minsAgo(47),
    status: 'PENDING',
    reporter: 'Student Kiosk',
    description: 'Mouse cursor jumps erratically. Optical sensor appears dirty.',
    priority: 'LOW',
  },
  {
    ticket_id: 'TKT-2408',
    lab_id: 'LAB-302',
    pc_num: 'PC-18',
    category: 'POWER/UPS',
    key: 'C',
    timestamp: minsAgo(55),
    status: 'PENDING',
    reporter: 'Student Kiosk',
    description: 'PC does not power on. Power button LED not lighting. Surge protector checked.',
    priority: 'HIGH',
  },
  {
    ticket_id: 'TKT-2409',
    lab_id: 'LAB-401',
    pc_num: 'PC-11',
    category: 'NET/SOFTWARE',
    key: 'D',
    timestamp: minsAgo(62),
    status: 'DISPATCHED',
    reporter: 'Student Kiosk',
    description: 'Cannot access university portal (LMS). Other PCs in same lab work fine.',
    priority: 'MEDIUM',
    assignee: 'Tech. Lim',
  },
  {
    ticket_id: 'TKT-2410',
    lab_id: 'LAB-204',
    pc_num: 'PC-06',
    category: 'DISPLAY',
    key: 'A',
    timestamp: minsAgo(74),
    status: 'RESOLVED',
    reporter: 'Student Kiosk',
    description: 'Projector connection broken. No display output on classroom screen.',
    priority: 'MEDIUM',
    assignee: 'Tech. Cruz',
    resolvedAt: minsAgo(30),
    notes: 'VGA adapter was loose. Secured connection and cable-tied properly.',
  },
  {
    ticket_id: 'TKT-2411',
    lab_id: 'LAB-101',
    pc_num: 'PC-19',
    category: 'PERIPHERALS',
    key: 'B',
    timestamp: minsAgo(85),
    status: 'PENDING',
    reporter: 'Student Kiosk',
    description: 'Headphone jack not recognized. Audio drivers may need reinstall.',
    priority: 'LOW',
  },
  {
    ticket_id: 'TKT-2412',
    lab_id: 'LAB-205',
    pc_num: 'PC-04',
    category: 'POWER/UPS',
    key: 'C',
    timestamp: minsAgo(98),
    status: 'RESOLVED',
    reporter: 'Student Kiosk',
    description: 'UPS failed to provide backup during brownout. Students lost unsaved work.',
    priority: 'HIGH',
    assignee: 'Tech. Santos',
    resolvedAt: minsAgo(55),
    notes: 'UPS battery replaced (model: APC BE600M1). Calibration test passed.',
  },
];

export const LAB_ROOMS = ['All Labs', 'LAB-101', 'LAB-204', 'LAB-205', 'LAB-302', 'LAB-401'];

export const MOCK_USER = {
  name: 'Alex Reyes',
  email: 'alex.reyes@campus.edu',
  role: 'IT Technician',
  avatar: 'AR',
  department: 'Campus IT Services',
};

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

export type WorkstationStatus = 'ONLINE' | 'OCCUPIED' | 'UNDER_REPAIR';

export interface Workstation {
  id: string; // e.g. PC-01
  labId: string; // e.g. LAB-302
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

export const MOCK_WORKSTATIONS: Record<string, Workstation[]> = {
  'LAB-302': Array.from({ length: 24 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = `PC-${num}`;
    let status: WorkstationStatus = 'ONLINE';
    let user: string | undefined = undefined;
    let activeIssue: string | undefined = undefined;

    if (i === 6) {
      status = 'UNDER_REPAIR';
      activeIssue = 'Monitor no signal (TKT-2401)';
    } else if (i === 17) {
      status = 'UNDER_REPAIR';
      activeIssue = 'Power supply fault (TKT-2408)';
    } else if ([1, 3, 4, 8, 11, 14, 19, 21].includes(i)) {
      status = 'OCCUPIED';
      user = `Student_${1000 + i}`;
    }

    return {
      id,
      labId: 'LAB-302',
      status,
      user,
      ip: `10.12.30.${10 + i}`,
      specs: 'Core i7-13700 · 32GB RAM · RTX 4070',
      lastPing: '2s ago',
      activeIssue,
    };
  }),
  'LAB-101': Array.from({ length: 20 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = `PC-${num}`;
    let status: WorkstationStatus = 'ONLINE';
    let user: string | undefined = undefined;
    let activeIssue: string | undefined = undefined;

    if (i === 11) {
      status = 'OCCUPIED';
      user = 'Student_1012';
      activeIssue = 'Network DHCP warning (TKT-2402)';
    } else if (i === 18) {
      status = 'UNDER_REPAIR';
      activeIssue = 'Headphone jack broken (TKT-2411)';
    } else if ([0, 2, 5, 9, 13, 16].includes(i)) {
      status = 'OCCUPIED';
      user = `Student_${2000 + i}`;
    }

    return {
      id,
      labId: 'LAB-101',
      status,
      user,
      ip: `10.12.10.${10 + i}`,
      specs: 'Core i5-12600 · 16GB RAM · GTX 1660',
      lastPing: '3s ago',
      activeIssue,
    };
  }),
  'LAB-204': Array.from({ length: 18 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = `PC-${num}`;
    let status: WorkstationStatus = 'ONLINE';
    let user: string | undefined = undefined;
    let activeIssue: string | undefined = undefined;

    if (i === 2) {
      status = 'UNDER_REPAIR';
      activeIssue = 'UPS beeping fault (TKT-2403)';
    } else if ([1, 4, 7, 10, 15].includes(i)) {
      status = 'OCCUPIED';
      user = `Student_${3000 + i}`;
    }

    return {
      id,
      labId: 'LAB-204',
      status,
      user,
      ip: `10.12.20.${10 + i}`,
      specs: 'Ryzen 7 5800X · 32GB RAM · RTX 3060',
      lastPing: '1s ago',
      activeIssue,
    };
  }),
  'LAB-205': Array.from({ length: 24 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = `PC-${num}`;
    let status: WorkstationStatus = 'ONLINE';
    let user: string | undefined = undefined;
    let activeIssue: string | undefined = undefined;

    if (i === 21) {
      status = 'UNDER_REPAIR';
      activeIssue = 'Mouse sensor glitch (TKT-2407)';
    } else if ([3, 6, 8, 12, 17, 20].includes(i)) {
      status = 'OCCUPIED';
      user = `Student_${4000 + i}`;
    }

    return {
      id,
      labId: 'LAB-205',
      status,
      user,
      ip: `10.12.25.${10 + i}`,
      specs: 'Core i7-12700 · 32GB RAM · RTX 3070',
      lastPing: '4s ago',
      activeIssue,
    };
  }),
  'LAB-401': Array.from({ length: 16 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const id = `PC-${num}`;
    let status: WorkstationStatus = 'ONLINE';
    let user: string | undefined = undefined;
    let activeIssue: string | undefined = undefined;

    if (i === 8) {
      status = 'OCCUPIED';
      user = 'Student_4009';
      activeIssue = 'Screen tear glitch (TKT-2405)';
    } else if ([0, 2, 5, 7, 11].includes(i)) {
      status = 'OCCUPIED';
      user = `Student_${5000 + i}`;
    }

    return {
      id,
      labId: 'LAB-401',
      status,
      user,
      ip: `10.12.40.${10 + i}`,
      specs: 'Apple Mac Studio M2 Max · 64GB Unified',
      lastPing: '2s ago',
      activeIssue,
    };
  }),
};

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
    labRoom: 'LAB-302',
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
    labRoom: 'LAB-101',
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
    id: 'ESP-NODE-302A',
    name: 'Lab 302 South Cluster Hub',
    labRoom: 'LAB-302',
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
    id: 'ESP-NODE-302B',
    name: 'Lab 302 North Cluster Hub',
    labRoom: 'LAB-302',
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
    id: 'ESP-NODE-101A',
    name: 'Lab 101 Main Gateway',
    labRoom: 'LAB-101',
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
    id: 'ESP-NODE-204A',
    name: 'Lab 204 Embedded Master Hub',
    labRoom: 'LAB-204',
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
    id: 'ESP-NODE-205A',
    name: 'Lab 205 Electronics Cluster',
    labRoom: 'LAB-205',
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
    id: 'ESP-NODE-401A',
    name: 'Lab 401 Apple Studio Hub',
    labRoom: 'LAB-401',
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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TECHNICIAN' | 'ADMIN';
  department: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive: string;
}

export const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: 'USR-01',
    name: 'Alex Reyes',
    email: 'alex.reyes@campus.edu',
    role: 'TECHNICIAN',
    department: 'Campus IT Services',
    status: 'ACTIVE',
    lastActive: 'Active Now',
  },
  {
    id: 'USR-02',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@campus.edu',
    role: 'ADMIN',
    department: 'Dept. of Electrical & Computer Eng.',
    status: 'ACTIVE',
    lastActive: '5m ago',
  },
  {
    id: 'USR-03',
    name: 'Carlos Rivera',
    email: 'carlos.rivera@campus.edu',
    role: 'TECHNICIAN',
    department: 'Hardware Maintenance Div.',
    status: 'ACTIVE',
    lastActive: '12m ago',
  },
  {
    id: 'USR-04',
    name: 'Samantha Lim',
    email: 'samantha.lim@campus.edu',
    role: 'TECHNICIAN',
    department: 'Network & Lab Ops',
    status: 'ACTIVE',
    lastActive: '1h ago',
  },
  {
    id: 'USR-05',
    name: 'Liam Zhang',
    email: 'liam.zhang@student.campus.edu',
    role: 'STUDENT',
    department: 'Computer Science Dept.',
    status: 'ACTIVE',
    lastActive: '18m ago',
  },
  {
    id: 'USR-06',
    name: 'Maya Patel',
    email: 'maya.patel@student.campus.edu',
    role: 'STUDENT',
    department: 'Robotics Engineering',
    status: 'ACTIVE',
    lastActive: '2h ago',
  },
  {
    id: 'USR-07',
    name: 'Prof. David Vance',
    email: 'david.vance@campus.edu',
    role: 'ADMIN',
    department: 'Campus Infrastructure & IoT',
    status: 'ACTIVE',
    lastActive: '1d ago',
  },
];

export interface LabRoomConfig {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  activeStations: number;
  mappedMacs: string[];
  clusterMaster: string;
  status: 'OPERATIONAL' | 'MAINTENANCE';
}

export const MOCK_LAB_ROOMS_CONFIG: LabRoomConfig[] = [
  {
    id: 'ROOM-302',
    code: 'LAB-302',
    name: 'Embedded Systems & IoT Lab',
    building: 'Turing Engineering Hall',
    floor: '3rd Floor',
    capacity: 24,
    activeStations: 22,
    mappedMacs: ['24:6F:28:B1:3C:4E', '24:6F:28:B1:3C:5F'],
    clusterMaster: 'ESP-NODE-302A',
    status: 'OPERATIONAL',
  },
  {
    id: 'ROOM-101',
    code: 'LAB-101',
    name: 'Introductory Computing Lab',
    building: 'Turing Engineering Hall',
    floor: '1st Floor',
    capacity: 20,
    activeStations: 19,
    mappedMacs: ['A0:B7:65:F4:11:2D'],
    clusterMaster: 'ESP-NODE-101A',
    status: 'OPERATIONAL',
  },
  {
    id: 'ROOM-204',
    code: 'LAB-204',
    name: 'Digital Logic & Circuitry',
    building: 'Shannon Tech Center',
    floor: '2nd Floor',
    capacity: 18,
    activeStations: 17,
    mappedMacs: ['3C:71:BF:8E:22:90'],
    clusterMaster: 'ESP-NODE-204A',
    status: 'OPERATIONAL',
  },
  {
    id: 'ROOM-205',
    code: 'LAB-205',
    name: 'Microcontroller Design Lab',
    building: 'Shannon Tech Center',
    floor: '2nd Floor',
    capacity: 24,
    activeStations: 23,
    mappedMacs: ['58:BF:25:AA:99:1C'],
    clusterMaster: 'ESP-NODE-205A',
    status: 'OPERATIONAL',
  },
  {
    id: 'ROOM-401',
    code: 'LAB-401',
    name: 'AI & High Performance Studio',
    building: 'Von Neumann Center',
    floor: '4th Floor',
    capacity: 16,
    activeStations: 16,
    mappedMacs: ['84:CC:A8:54:E3:7A'],
    clusterMaster: 'ESP-NODE-401A',
    status: 'OPERATIONAL',
  },
];
