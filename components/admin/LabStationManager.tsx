'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Cpu, MapPin, X, RefreshCw } from 'lucide-react';
import type { LabRoom } from '@/app/api/admin/labs/route';
import { useToast } from '@/context/ToastContext';
import ModalPortal from '@/components/shared/ModalPortal';

export default function LabStationManager() {
  const toast = useToast();
  const [rooms, setRooms] = useState<LabRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New room modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBuilding, setNewBuilding] = useState('Turing Engineering Hall');
  const [newFloor, setNewFloor] = useState('1st Floor');
  const [newCapacity, setNewCapacity] = useState(24);
  const [newMac, setNewMac] = useState('');

  // Mapping MAC to existing room
  const [selectedRoomForMac, setSelectedRoomForMac] = useState<string | null>(null);
  const [macInput, setMacInput] = useState('');

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/labs', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load lab rooms');
      setRooms(data.rooms || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load lab rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Send a change to the API, then reload so the cards always show what the database holds
  const save = async (method: string, body?: any, query = ''): Promise<boolean> => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/labs${query}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Save Failed', data.error || 'The change could not be saved.');
        return false;
      }
      if (data.warning) toast.warning('Saved With Warning', data.warning);
      await loadRooms();
      return true;
    } catch {
      toast.error('Save Failed', 'Could not reach the server.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      toast.warning('Missing Fields', 'Please provide a Room Code and Name.');
      return;
    }
    const code = newCode.toUpperCase().trim();
    const ok = await save('POST', {
      action: 'create_room',
      code,
      name: newName.trim(),
      building: newBuilding,
      floor: newFloor,
      pcCount: Number(newCapacity),
      mac: newMac.trim(),
    });
    if (!ok) return;

    toast.success('Lab Room Registered', `${code} (${newName.trim()}) created with ${newCapacity} PCs.`);
    setIsAddModalOpen(false);
    setNewCode('');
    setNewName('');
    setNewMac('');
  };

  const handleAddMacToRoom = async (room: LabRoom) => {
    if (!macInput.trim()) return;
    const formattedMac = macInput.toUpperCase().trim();
    const ok = await save('POST', { action: 'add_mac', code: room.code, mac: formattedMac });
    if (!ok) return;
    toast.success('ESP32 MAC Mapped', `Mapped ${formattedMac} to ${room.code}.`);
    setMacInput('');
    setSelectedRoomForMac(null);
  };

  const handleRemoveMac = async (room: LabRoom, mac: string) => {
    const ok = await save('DELETE', undefined, `?mac=${encodeURIComponent(mac)}`);
    if (ok) toast.info('MAC Unmapped', `Removed ${mac} from ${room.code}.`);
  };

  const handleToggleStatus = async (room: LabRoom) => {
    if (isSaving) return;
    const nextStatus = room.status === 'OPERATIONAL' ? 'MAINTENANCE' : 'OPERATIONAL';
    const ok = await save('PATCH', { code: room.code, status: nextStatus });
    if (ok) toast.info('Room Status Updated', `${room.code} set to ${nextStatus}`);
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers size={17} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Lab Room & Station Capacity Manager
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Hardware Topology
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Register physical lab spaces, allocate PC capacities, and map ESP32 MAC addresses to clusters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => loadRooms()}
          className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh from database"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
        </button>

        {/* Add Room Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-cyan/30 transition-all self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Register New Lab Room</span>
        </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          Could not load lab rooms from the database: {loadError}
        </div>
      )}
      {!isLoading && !loadError && rooms.length === 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No lab rooms registered yet.
        </div>
      )}

      {/* Grid of Lab Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
          >
            {/* Top Room Header */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-cyan-400">{room.code}</span>
                    <span
                      onClick={() => handleToggleStatus(room)}
                      className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        room.status === 'OPERATIONAL'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                      title="Click to toggle status"
                    >
                      {room.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-200 mt-1">{room.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                <MapPin size={12} className="text-slate-500" />
                <span>{room.building} · {room.floor}</span>
              </div>
            </div>

            {/* Capacity & Active Stations */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Operational PCs:</span>
                <span className="font-mono font-bold text-slate-200">{room.operationalPcs} / {room.totalPcs} PCs</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                  style={{ width: `${room.totalPcs > 0 ? Math.round((room.operationalPcs / room.totalPcs) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                <span>Cluster Master:</span>
                <span className="text-indigo-400 font-semibold">{room.clusterMaster || '—'}</span>
              </div>
            </div>

            {/* Mapped ESP32 MAC Addresses */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Cpu size={12} className="text-cyan-400" /> Mapped ESP32 MACs:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRoomForMac(selectedRoomForMac === room.id ? null : room.id)}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] flex items-center gap-0.5"
                >
                  + Add MAC
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {room.mappedMacs.length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">No ESP32 boards mapped yet</span>
                )}
                {room.mappedMacs.map((mac) => (
                  <span
                    key={mac}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                  >
                    <span>{mac}</span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleRemoveMac(room, mac)}
                      className="text-slate-500 hover:text-rose-400 disabled:opacity-40"
                      title="Unmap MAC"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Inline Add MAC Input */}
              {selectedRoomForMac === room.id && (
                <div className="flex gap-1 pt-1 animate-fade-in">
                  <input
                    type="text"
                    placeholder="e.g. 24:6F:28:B1:3C:99"
                    value={macInput}
                    onChange={(e) => setMacInput(e.target.value)}
                    className="flex-1 px-2 py-1 rounded text-[11px] font-mono bg-slate-950 text-slate-200 border border-cyan-500/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleAddMacToRoom(room)}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Register Lab Room Modal */}
      {isAddModalOpen && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Register New Lab Room</h3>
                  <p className="text-xs text-slate-400">Add physical room & bind ESP32 cluster hub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Room Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAB-502"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Number of PCs *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Lab Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Robotics & Embedded Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Building</label>
                  <select
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none"
                  >
                    <option value="Turing Engineering Hall">Turing Engineering Hall</option>
                    <option value="Shannon Tech Center">Shannon Tech Center</option>
                    <option value="Von Neumann Center">Von Neumann Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Floor</label>
                  <select
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none"
                  >
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="4th Floor">4th Floor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Primary ESP32 MAC Address <span className="text-slate-500 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. 24:6F:28:B1:3C:99"
                  value={newMac}
                  onChange={(e) => setNewMac(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-glow-cyan disabled:opacity-50"
                >
                  {isSaving ? 'Registering…' : 'Register Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
