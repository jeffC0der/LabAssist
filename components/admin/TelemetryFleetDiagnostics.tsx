'use client';
import React, { useState } from 'react';
import { Cpu, Wifi, Zap, Activity, RefreshCw, RotateCcw, ArrowUpCircle, CheckCircle2, AlertTriangle, Search, Radio } from 'lucide-react';
import { MOCK_ESP32_FLEET, type ESP32Node } from '@/lib/mockData';
import { useToast } from '@/context/ToastContext';

export default function TelemetryFleetDiagnostics() {
  const toast = useToast();
  const [nodes, setNodes] = useState<ESP32Node[]>(MOCK_ESP32_FLEET);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'DEGRADED'>('ALL');
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);

  const filteredNodes = nodes.filter(node => {
    if (statusFilter !== 'ALL' && node.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.macAddress.toLowerCase().includes(q) ||
        node.labRoom.toLowerCase().includes(q) ||
        node.cluster.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePingNode = async (node: ESP32Node) => {
    setPingingId(node.id);
    await new Promise(r => setTimeout(r, 500));
    const randomLatency = Math.floor(8 + Math.random() * 12);
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, pingMs: randomLatency, lastSeen: 'Just now' } : n));
    toast.success('Ping Echo Received', `${node.id} (${node.macAddress}) latency: ${randomLatency}ms`);
    setPingingId(null);
  };

  const handleReboot = async (node: ESP32Node) => {
    setRebootingId(node.id);
    toast.info('Reboot Command Dispatched', `Broadcasting soft-reset to ${node.id}...`);
    await new Promise(r => setTimeout(r, 1200));
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'ONLINE', uptime: '0d 00h 01m', lastSeen: 'Just now' } : n));
    toast.success('ESP32 Reboot Completed', `${node.id} back online with clean heap allocation.`);
    setRebootingId(null);
  };

  const handleOtaUpdate = (node: ESP32Node) => {
    toast.info('OTA Flash Initiated', `Flashing firmware v2.4.3-security to ${node.macAddress}...`);
    setTimeout(() => {
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, firmware: 'v2.4.3-iot', lastSeen: 'Just now' } : n));
      toast.success('OTA Flash Success', `${node.id} successfully updated to v2.4.3-iot.`);
    }, 1500);
  };

  const getRssiColor = (rssi: number) => {
    if (rssi >= -60) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Excellent' };
    if (rssi >= -75) return { text: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Good' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', label: 'Degraded' };
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
            <Radio size={17} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              ESP32 Fleet Diagnostics & Telemetry
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                MQTT Live
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time hardware heartbeat, Wi-Fi RSSI signal quality, & remote microcontroller controls
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search MAC, Hub, Room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none w-44"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Nodes</option>
            <option value="ONLINE">Online Only</option>
            <option value="DEGRADED">Degraded</option>
          </select>
        </div>
      </div>

      {/* Fleet Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const rssiInfo = getRssiColor(node.rssi);
          const isRebooting = rebootingId === node.id;
          const isPinging = pingingId === node.id;

          return (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all duration-200 flex flex-col justify-between space-y-3.5 group"
            >
              {/* Top Node Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {node.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      node.status === 'ONLINE'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="text-cyan-400 font-semibold">{node.labRoom}</span>
                  <span>·</span>
                  <span>{node.cluster}</span>
                </div>
              </div>

              {/* Telemetry Metrics Card */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                {/* RSSI Signal */}
                <div>
                  <span className="text-slate-500 block text-[10px]">Wi-Fi RSSI (Signal)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Wifi size={12} className={rssiInfo.text} />
                    <span className={`font-mono font-bold ${rssiInfo.text}`}>{node.rssi} dBm</span>
                    <span className="text-[10px] text-slate-400">({rssiInfo.label})</span>
                  </div>
                </div>

                {/* Ping Latency */}
                <div>
                  <span className="text-slate-500 block text-[10px]">Ping Latency</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Activity size={12} className="text-cyan-400" />
                    <span className="font-mono font-bold text-slate-200">{node.pingMs} ms</span>
                  </div>
                </div>

                {/* Power Status */}
                <div>
                  <span className="text-slate-500 block text-[10px]">Power Supply</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Zap size={12} className={node.powerSource.includes('Battery') ? 'text-amber-400' : 'text-emerald-400'} />
                    <span className="text-slate-300 font-medium truncate">{node.powerSource}</span>
                  </div>
                </div>

                {/* Uptime */}
                <div>
                  <span className="text-slate-500 block text-[10px]">System Uptime</span>
                  <span className="font-mono text-slate-300 block mt-0.5">{node.uptime}</span>
                </div>

                {/* Hardware MAC & Firmware */}
                <div className="col-span-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>MAC: <strong className="text-slate-300">{node.macAddress}</strong></span>
                  <span>FW: <strong className="text-slate-300">{node.firmware}</strong></span>
                </div>
              </div>

              {/* Station Mapping */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Mapped Workstations:</span>
                <span className="font-mono text-indigo-300 font-semibold">{node.assignedStations}</span>
              </div>

              {/* Diagnostics Actions Bar */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={isPinging}
                  onClick={() => handlePingNode(node)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-60"
                  title="Send ICMP Ping packet"
                >
                  <Activity size={12} className={isPinging ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
                  <span>Ping</span>
                </button>

                <button
                  type="button"
                  disabled={isRebooting}
                  onClick={() => handleReboot(node)}
                  className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-60"
                  title="Trigger remote ESP32 hardware reboot"
                >
                  <RotateCcw size={12} className={isRebooting ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                  <span>Reboot</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOtaUpdate(node)}
                  className="py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                  title="Check and flash latest firmware via OTA"
                >
                  <ArrowUpCircle size={12} className="text-cyan-400" />
                  <span>OTA</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
