'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Plus, 
  RefreshCw, 
  Layers, 
  Cpu, 
  Server, 
  Database, 
  Send, 
  Sparkles, 
  Radio, 
  ShieldCheck, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  system_prompt: string;
  status: string;
  active_tasks_count?: number;
  completed_tasks_count?: number;
  configuration?: any;
}

interface Task {
  id: string;
  agent_id: string;
  agent_name?: string;
  agent_role?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  progress: number;
  created_at: string;
}

interface LogEntry {
  id: string;
  agent_name?: string;
  step_name: string;
  action: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'dispatch' | 'logs' | 'skills'>('roster');

  // Form states for Hiring Agent
  const [isHiringModalOpen, setIsHiringModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Form state for Task Dispatch
  const [dispatchTitle, setDispatchTitle] = useState('');
  const [dispatchDesc, setDispatchDesc] = useState('');
  const [targetAgentId, setTargetAgentId] = useState('');
  const [dispatchPriority, setDispatchPriority] = useState('medium');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/agents');
      const json = await res.json();
      if (json.success) {
        setAgents(json.data.agents || []);
        setTasks(json.data.tasks || []);
        setLogs(json.data.logs || []);
        setAvailableSkills(json.data.availableSkills || []);
        if (json.data.agents.length > 0 && !targetAgentId) {
          setTargetAgentId(json.data.agents[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleHireAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentRole) return;
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          role: newAgentRole,
          description: newAgentDesc,
          systemPrompt: newAgentPrompt,
          assignedSkills: selectedSkills,
          status: 'idle'
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsHiringModalOpen(false);
        setNewAgentName('');
        setNewAgentRole('');
        setNewAgentDesc('');
        setNewAgentPrompt('');
        setSelectedSkills([]);
        fetchData();
      }
    } catch (err) {
      console.error('Error creating agent:', err);
    }
  };

  const handleDispatchTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTitle || !targetAgentId) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dispatchTitle,
          description: dispatchDesc,
          agentId: targetAgentId,
          priority: dispatchPriority
        })
      });
      const json = await res.json();
      if (json.success) {
        setDispatchTitle('');
        setDispatchDesc('');
        fetchData();
      }
    } catch (err) {
      console.error('Error dispatching task:', err);
    }
  };

  const toggleSkillSelection = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/50 flex flex-col justify-between p-4">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">DAEROOM CORE</h1>
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                24/7 Fleet Online
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('roster')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Agent Fleet Roster
            </button>
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dispatch'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-4 h-4" />
              Mission Dispatcher
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Live Action Logs
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'skills'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Skills Matrix ({availableSkills.length})
            </button>
          </nav>
        </div>

        {/* System Meta */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Orchestrator</span>
            <span className="text-slate-200 font-medium">Cindy Core</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>PostgreSQL DB</span>
            <span className="text-emerald-400 font-mono">192.168.1.8:5432</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Discord Gateway</span>
            <span className="text-indigo-400 font-medium">Synced ✓</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md px-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {activeTab === 'roster' && 'AI Employee Fleet & Active Workforce'}
              {activeTab === 'dispatch' && 'Task Creation & Assignment Board'}
              {activeTab === 'logs' && 'Real-time System Action Feed'}
              {activeTab === 'skills' && 'Hermes Repertoire & Skills Knowledge'}
            </h2>
            <p className="text-xs text-slate-400">
              Supreme Command: Mas Dae (CEO & Mahasiswa UNPAM)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsHiringModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              Recruit New Agent
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: AGENT FLEET ROSTER */}
          {activeTab === 'roster' && (
            <div>
              {/* Stat Counters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Total Active Fleet</div>
                  <div className="text-2xl font-bold text-white">{agents.length} Agents</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Tasks in Progress</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {tasks.filter(t => t.status === 'in_progress').length} Running
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Completed Missions</div>
                  <div className="text-2xl font-bold text-slate-200">
                    {tasks.filter(t => t.status === 'completed').length} Tasks
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">AI Engine Standard</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">
                    Ponytail + Taste-Skill
                  </div>
                </div>
              </div>

              {/* Agent Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white text-base">{agent.name}</h3>
                          <span className="text-xs text-emerald-400 font-medium">{agent.role}</span>
                        </div>
                        <span
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-full uppercase ${
                            agent.status === 'working'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                        {agent.description || 'Dedicated autonomous worker ready for mission assignments.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <span>Tasks: {agent.completed_tasks_count || 0} done</span>
                      <button
                        onClick={() => {
                          setTargetAgentId(agent.id);
                          setActiveTab('dispatch');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        Assign Task →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MISSION DISPATCHER & KANBAN */}
          {activeTab === 'dispatch' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  Dispatch New Task
                </h3>
                <form onSubmit={handleDispatchTask} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Target Agent</label>
                    <select
                      value={targetAgentId}
                      onChange={e => setTargetAgentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Task Title / Mission</label>
                    <input
                      type="text"
                      value={dispatchTitle}
                      onChange={e => setDispatchTitle(e.target.value)}
                      placeholder="e.g. Audit Metopen Paper or Deploy Backend Fix"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Task Instructions & Context</label>
                    <textarea
                      rows={4}
                      value={dispatchDesc}
                      onChange={e => setDispatchDesc(e.target.value)}
                      placeholder="Detailed instructions for the agent..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Priority</label>
                    <select
                      value={dispatchPriority}
                      onChange={e => setDispatchPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent / Blocker</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20"
                  >
                    Execute Task Dispatch
                  </button>
                </form>
              </div>

              {/* Task Board */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Live Task Queue ({tasks.length})</h3>
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              task.priority === 'urgent'
                                ? 'bg-red-950 text-red-400 border border-red-800/50'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <h4 className="text-sm font-medium text-white">{task.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{task.description}</p>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span>Assigned to: <strong className="text-slate-300">{task.agent_name || 'Agent'}</strong></span>
                          <span>•</span>
                          <span>{new Date(task.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-full uppercase ${
                          task.status === 'in_progress'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ACTION LOGS */}
          {activeTab === 'logs' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Agent Execution Feed
              </h3>
              <div className="space-y-2 font-mono text-xs max-h-[600px] overflow-y-auto pr-2">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-900 flex items-start gap-3"
                  >
                    <span className="text-slate-500 text-[11px]">
                      [{new Date(log.created_at).toLocaleTimeString()}]
                    </span>
                    <span className="text-emerald-400 font-semibold">{log.agent_name || 'System'}:</span>
                    <span className="text-slate-300 flex-1">{log.action}</span>
                    <span className="text-slate-500 text-[10px] px-2 py-0.5 bg-slate-800 rounded">
                      {log.step_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS MATRIX */}
          {activeTab === 'skills' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Installed Hermes Skills Catalog
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {availableSkills.map(skill => (
                  <div
                    key={skill}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between"
                  >
                    <span className="font-mono text-slate-300">{skill}</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* HIRING MODAL */}
      {isHiringModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Recruit New AI Employee</h3>
            <p className="text-xs text-slate-400 mb-4">
              Define the identity, responsibilities, and skill capabilities for your new agent.
            </p>

            <form onSubmit={handleHireAgent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={e => setNewAgentName(e.target.value)}
                    placeholder="e.g. Marcus (SRE Lead)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Role / Jobdesk</label>
                  <input
                    type="text"
                    value={newAgentRole}
                    onChange={e => setNewAgentRole(e.target.value)}
                    placeholder="e.g. Site Reliability Engineer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Job Description</label>
                <textarea
                  rows={2}
                  value={newAgentDesc}
                  onChange={e => setNewAgentDesc(e.target.value)}
                  placeholder="Primary duties and responsibilities..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">System Instructions (SOUL / Persona)</label>
                <textarea
                  rows={3}
                  value={newAgentPrompt}
                  onChange={e => setNewAgentPrompt(e.target.value)}
                  placeholder="You are Marcus, an expert SRE. You follow the Ponytail principle..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assign Skills ({selectedSkills.length} selected)</label>
                <div className="max-h-32 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-2 gap-1.5">
                  {availableSkills.map(skill => (
                    <label
                      key={skill}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={() => toggleSkillSelection(skill)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                      />
                      <span className="truncate text-slate-300">{skill.split('/')[1] || skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHiringModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-emerald-600/20"
                >
                  Deploy Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
