'use client';
import React, { useState } from 'react';
import TelemetryFleetDiagnostics from './TelemetryFleetDiagnostics';
import FailureAnalytics from './FailureAnalytics';
import UserAccessControl from './UserAccessControl';
import LabStationManager from './LabStationManager';
import { Shield, Radio, BarChart3, Users, Layers, Sparkles } from 'lucide-react';

type AdminTab = 'FLEET' | 'ANALYTICS' | 'RBAC' | 'ROOMS';

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: string }> = [
  { id: 'FLEET', label: 'ESP32 Fleet Telemetry', icon: <Radio size={15} />, badge: '6 Nodes Live' },
  { id: 'ANALYTICS', label: 'Failure Analytics', icon: <BarChart3 size={15} /> },
  { id: 'RBAC', label: 'User & Access Control', icon: <Users size={15} /> },
  { id: 'ROOMS', label: 'Lab & Station Manager', icon: <Layers size={15} />, badge: '5 Labs' },
];

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState<AdminTab>('FLEET');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Admin Operations Console Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-violet-500/20 p-5 sm:p-6 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
              <Shield size={13} />
              <span>Campus IT Admin Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Centralized Infrastructure & IoT Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Monitor remote ESP32 hardware clusters, audit campus failure metrics, provision technician access keys, and configure physical lab station topologies.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-bold">Admin Root Access</span>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        {ADMIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Views */}
      <div className="transition-all duration-300">
        {activeTab === 'FLEET' && <TelemetryFleetDiagnostics />}
        {activeTab === 'ANALYTICS' && <FailureAnalytics />}
        {activeTab === 'RBAC' && <UserAccessControl />}
        {activeTab === 'ROOMS' && <LabStationManager />}
      </div>
    </div>
  );
}
