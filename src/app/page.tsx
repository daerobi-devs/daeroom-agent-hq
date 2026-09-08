'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Database, 
  Sparkles, 
  Send, 
  Bot, 
  MessageSquare,
  Calendar,
  FolderLock,
  ShieldCheck,
  BarChart3,
  Check,
  X,
  FileText,
  AlertTriangle,
  Play,
  Pause,
  Download,
  Flame
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  system_prompt: string;
  model: string;
  status: string;
  is_active: boolean;
  assigned_skills: string[];
}

interface Task {
  id: string;
  agent_id: string;
  agent_name?: string;
  title: string;
  prompt: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  agent_id: string;
  sender: 'user' | 'agent';
  content: string;
  thought_process?: string;
  tool_calls?: any[];
  created_at: string;
}

interface Schedule {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_role: string;
  name: string;
  cron_expression: string;
  description: string;
  task_payload: string;
  is_active: boolean;
  last_run_at: string;
}

interface Artifact {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_role: string;
  title: string;
  file_type: string;
  file_path: string;
  content: string;
  metadata: any;
  created_at: string;
}

interface Approval {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_role: string;
  action_name: string;
  description: string;
  risk_level: string;
  payload: any;
  status: string;
  created_at: string;
  reviewer_note?: string;
}

interface TelemetrySummary {
  total_prompt_tokens: string;
  total_completion_tokens: string;
  grand_total_tokens: string;
  grand_saved_tokens: string;
  total_cost_usd: string;
}

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState<'agents' | 'chat' | 'schedules' | 'artifacts' | 'approvals' | 'telemetry' | 'dispatcher' | 'logs'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [telemetry, setTelemetry] = useState<{ records: any[]; summary: TelemetrySummary | null }>({ records: [], summary: null });
  const [loading, setLoading] = useState(true);

  // Chat State
  const [selectedAgentForChat, setSelectedAgentForChat] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputChatMessage, setInputChatMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    role: '',
    description: '',
    system_prompt: '',
    model: '9routess',
    assigned_skills: [] as string[],
  });

  // Task Dispatcher State
  const [newTask, setNewTask] = useState({
    agent_id: '',
    title: '',
    prompt: '',
    priority: 'medium',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agRes, schRes, artRes, appRes, telRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/schedules'),
        fetch('/api/artifacts'),
        fetch('/api/approvals'),
        fetch('/api/telemetry')
      ]);

      const agData = await agRes.json();
      const schData = await schRes.json();
      const artData = await artRes.json();
      const appData = await appRes.json();
      const telData = await telRes.json();

      if (agData.success) {
        setAgents(agData.data.agents || []);
        setSkills(agData.data.installed_skills || []);
        setTasks(agData.data.tasks || []);
        if (agData.data.agents?.length > 0 && !selectedAgentForChat) {
          setSelectedAgentForChat(agData.data.agents[0]);
        }
      }
      if (schData.success) setSchedules(schData.data || []);
      if (artData.success) setArtifacts(artData.data || []);
      if (appData.success) setApprovals(appData.data || []);
      if (telData.success) setTelemetry(telData.data || { records: [], summary: null });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch messages when selected chat agent changes
  useEffect(() => {
    if (selectedAgentForChat) {
      fetch(`/api/chats?agent_id=${selectedAgentForChat.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChatMessages(data.data || []);
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        });
    }
  }, [selectedAgentForChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChatMessage.trim() || !selectedAgentForChat || isSendingChat) return;

    const userText = inputChatMessage;
    setInputChatMessage('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgentForChat.id,
          content: userText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, data.data.user_message, data.data.agent_message]);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleApprovalAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reviewer_note: `Reviewed by Mas Dae at ${new Date().toLocaleTimeString()}` }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSchedule = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      const data = await res.json();
      if (data.success) {
        setIsRecruitModalOpen(false);
        setNewAgent({
          name: '',
          role: '',
          description: '',
          system_prompt: '',
          model: '9routess',
          assigned_skills: [],
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (data.success) {
        setNewTask({ agent_id: '', title: '', prompt: '', priority: 'medium' });
        setActiveTab('agents');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSkillSelection = (skillName: string) => {
    setNewAgent(prev => {
      const exists = prev.assigned_skills.includes(skillName);
      if (exists) {
        return { ...prev, assigned_skills: prev.assigned_skills.filter(s => s !== skillName) };
      } else {
        return { ...prev, assigned_skills: [...prev.assigned_skills, skillName] };
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/50 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">DAEROOM CORE</h1>
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                24/7 Enterprise Fleet
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'agents' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Agent Fleet Roster
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'chat' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Agent 1-on-1 Chat Room
            </button>

            <button
              onClick={() => setActiveTab('schedules')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'schedules' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Work Shifts & Cron
            </button>

            <button
              onClick={() => setActiveTab('artifacts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'artifacts' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FolderLock className="w-4 h-4" />
              Output Locker (Deliverables)
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'approvals' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                CEO Approval Gates
              </div>
              {approvals.filter(a => a.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                  {approvals.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'telemetry' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Token & Cost Telemetry
            </button>

            <button
              onClick={() => setActiveTab('dispatcher')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dispatcher' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-4 h-4" />
              Mission Dispatcher
            </button>
          </nav>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Supreme CEO</span>
            <span className="text-slate-200 font-medium">Mas Dae</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>PostgreSQL DB</span>
            <span className="text-emerald-400 font-mono">192.168.1.8:5432</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Discord Engine</span>
            <span className="text-indigo-400 font-medium">Live Synced ✓</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">
              {activeTab === 'agents' && 'AI Employee Fleet & Active Workforce'}
              {activeTab === 'chat' && 'Direct Agent 1-on-1 Discussion & Execution'}
              {activeTab === 'schedules' && 'Autonomous Work Shifts & Cron Orchestration'}
              {activeTab === 'artifacts' && 'Output Locker (Agent Deliverables & Vault Synced)'}
              {activeTab === 'approvals' && 'CEO Authority & Production Risk Approval Gates'}
              {activeTab === 'telemetry' && 'Token Consumption & LLMTrim Optimization Telemetry'}
              {activeTab === 'dispatcher' && 'Mission Task Dispatcher'}
            </h2>
            <p className="text-xs text-slate-400">Supreme Commander: Mas Dae (CEO & Mahasiswa UNPAM)</p>
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
              onClick={() => setIsRecruitModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              Recruit New Agent
            </button>
          </div>
        </header>

        {/* VIEW BODIES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: AGENTS ROSTER */}
          {activeTab === 'agents' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Total Active Fleet</div>
                  <div className="text-2xl font-bold text-white">{agents.length} Agents</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Active Shifts (24/7)</div>
                  <div className="text-2xl font-bold text-emerald-400">{schedules.filter(s => s.is_active).length} Crons</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Deliverables Stored</div>
                  <div className="text-2xl font-bold text-indigo-400">{artifacts.length} Files</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Efficiency Standard</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">Ponytail + Taste-Skill</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div 
                    key={agent.id}
                    className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold border border-slate-700">
                            {agent.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                              {agent.name}
                            </h3>
                            <p className="text-xs text-slate-400">{agent.role}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                          agent.status === 'idle' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {agent.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                        {agent.description || 'Tidak ada deskripsi pekerjaan khusus.'}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="text-[11px] text-slate-400 font-medium">Assigned Skills:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.assigned_skills && agent.assigned_skills.length > 0 ? (
                            agent.assigned_skills.map((skill, idx) => (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 text-[10px] font-mono border border-slate-700/60"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No skills assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">{agent.model || '9routess'}</span>
                      <button
                        onClick={() => {
                          setSelectedAgentForChat(agent);
                          setActiveTab('chat');
                        }}
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat 1-on-1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: AGENT LIVE CHAT */}
          {activeTab === 'chat' && (
            <div className="flex h-full gap-6">
              {/* Agent selector column */}
              <div className="w-72 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-3 space-y-2 shrink-0">
                <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
                  Select Employee
                </div>
                {agents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgentForChat(a)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selectedAgentForChat?.id === a.id
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-white'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                      {a.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold">{a.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{a.role}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat Stream & Input */}
              <div className="flex-1 bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden">
                {selectedAgentForChat ? (
                  <>
                    <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                          {selectedAgentForChat.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{selectedAgentForChat.name}</h3>
                          <p className="text-[11px] text-emerald-400 font-mono">Status: Connected to Hermes Engine</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-xs">
                          Belum ada riwayat percakapan. Mulai perintahkan atau diskusikan tugas dengan {selectedAgentForChat.name}.
                        </div>
                      ) : (
                        chatMessages.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div className="text-[10px] text-slate-400 mb-1 font-mono">
                              {msg.sender === 'user' ? 'Mas Dae (CEO)' : selectedAgentForChat.name}
                            </div>
                            <div
                              className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-600/20'
                                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                              }`}
                            >
                              {msg.thought_process && (
                                <div className="mb-2 p-2 bg-slate-950/60 rounded border border-slate-800 text-[10px] text-slate-400 font-mono">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
                                    <Sparkles className="w-3 h-3" />
                                    Internal Thought Process:
                                  </div>
                                  {msg.thought_process}
                                </div>
                              )}
                              {msg.content}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex gap-2">
                      <input
                        type="text"
                        placeholder={`Kirim instruksi langsung ke ${selectedAgentForChat.name}...`}
                        value={inputChatMessage}
                        onChange={e => setInputChatMessage(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingChat}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Kirim
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="m-auto text-slate-400 text-xs">Pilih karyawan di sebelah kiri untuk mulai chat.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORK SHIFTS & CRON */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Autonomous 24/7 Shift Manager</h3>
                  <p className="text-xs text-slate-400">Jadwal kerja otomatis tanpa perlu perintah manual dari Mas Dae.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map(sch => (
                  <div key={sch.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{sch.name}</h4>
                          <p className="text-xs text-emerald-400 font-medium">{sch.agent_name} ({sch.agent_role})</p>
                        </div>
                        <button
                          onClick={() => handleToggleSchedule(sch.id, sch.is_active)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                            sch.is_active
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {sch.is_active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          {sch.is_active ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </div>

                      <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-3 font-mono text-xs text-slate-300 flex items-center justify-between">
                        <span>Cron: {sch.cron_expression}</span>
                        <span className="text-[10px] text-slate-400">Shift Otomatis</span>
                      </div>

                      <p className="text-xs text-slate-300 mb-3">{sch.description}</p>
                      <div className="text-[11px] text-slate-400 font-mono bg-slate-900/90 p-2 rounded border border-slate-800">
                        Payload: {sch.task_payload}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OUTPUT LOCKER & ARTIFACTS */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Deliverables & Output Locker</h3>
                <p className="text-xs text-slate-400">Loker berkas hasil kerja karyawan AI (Otomatis terhubung ke Obsidian & Disk).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {artifacts.map(art => (
                  <div key={art.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{art.title}</h4>
                            <p className="text-xs text-slate-400">Dibuat oleh: {art.agent_name}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                          {art.file_type}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 my-3 text-xs text-slate-300 font-mono break-all">
                        {art.file_path}
                      </div>

                      <p className="text-xs text-slate-300">{art.content}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>{new Date(art.created_at).toLocaleDateString()}</span>
                      <span className="text-emerald-400 font-medium">Ready in Storage ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CEO APPROVAL GATES */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">CEO Production Approval Gates</h3>
                <p className="text-xs text-slate-400">Tindakan berisiko tinggi yang membutuhkan otorisasi resmi dari Mas Dae.</p>
              </div>

              <div className="space-y-3">
                {approvals.map(app => (
                  <div key={app.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-white">{app.action_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          app.risk_level === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          Risk: {app.risk_level}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          app.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{app.description}</p>
                      <p className="text-[11px] text-slate-400">Requested by: <span className="text-emerald-400 font-medium">{app.agent_name}</span></p>
                    </div>

                    {app.status === 'pending' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprovalAction(app.id, 'approved')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Action
                        </button>
                        <button
                          onClick={() => handleApprovalAction(app.id, 'rejected')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/20"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        {app.reviewer_note || `Status: ${app.status}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TOKEN & TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Total Prompt Tokens</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {Number(telemetry.summary?.total_prompt_tokens || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Total Completion Tokens</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {Number(telemetry.summary?.total_completion_tokens || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1 text-emerald-400">
                    <Flame className="w-3.5 h-3.5" />
                    Tokens Saved (LLMTrim/Ponytail)
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {Number(telemetry.summary?.grand_saved_tokens || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Estimated Cost (USD)</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    ${Number(telemetry.summary?.total_cost_usd || 0).toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <h4 className="text-sm font-semibold text-white mb-4">Agent Consumption Breakdown</h4>
                <div className="divide-y divide-slate-800/80">
                  {telemetry.records.map(rec => (
                    <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{rec.agent_name}</div>
                        <div className="text-slate-400 font-mono">{rec.model_name}</div>
                      </div>
                      <div className="flex items-center gap-6 font-mono">
                        <div className="text-slate-300">Total: {Number(rec.total_tokens).toLocaleString()} tokens</div>
                        <div className="text-emerald-400 font-semibold">Saved: -{Number(rec.saved_tokens).toLocaleString()} tokens</div>
                        <div className="text-slate-400">${Number(rec.cost_usd).toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MISSION DISPATCHER */}
          {activeTab === 'dispatcher' && (
            <div className="max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-1">Dispatch Mission to Agent</h3>
              <p className="text-xs text-slate-400 mb-6">Beri tugas baru ke salah satu karyawan AI Anda.</p>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Pilih Karyawan AI</label>
                  <select
                    value={newTask.agent_id}
                    onChange={e => setNewTask({ ...newTask, agent_id: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Agent --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} — ({a.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Judul Tugas / Mission</label>
                  <input
                    type="text"
                    placeholder="Contoh: Audit Keamanan Kontainer Coolify & PostgreSQL"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Instruksi Lengkap (Prompt)</label>
                  <textarea
                    rows={4}
                    placeholder="Rincikan langkah kerja dan hasil yang diharapkan..."
                    value={newTask.prompt}
                    onChange={e => setNewTask({ ...newTask, prompt: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Tingkat Prioritas</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent (Immediate Action)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                >
                  🚀 Dispatch Mission
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* RECRUIT AGENT MODAL */}
      {isRecruitModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Recruit New AI Employee</h3>
              <button onClick={() => setIsRecruitModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Agent</label>
                <input
                  type="text"
                  placeholder="Contoh: DaeSec"
                  value={newAgent.name}
                  onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role / Job Title</label>
                <input
                  type="text"
                  placeholder="Contoh: Cyber Security & Vulnerability Auditor"
                  value={newAgent.role}
                  onChange={e => setNewAgent({ ...newAgent, role: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deskripsi Tugas (Jobdesk)</label>
                <textarea
                  rows={2}
                  placeholder="Rincian wewenang dan tugas sehari-hari..."
                  value={newAgent.description}
                  onChange={e => setNewAgent({ ...newAgent, description: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Soul & System Prompt (Persona)</label>
                <textarea
                  rows={3}
                  placeholder="Instruksi perilaku dan batasan wewenang..."
                  value={newAgent.system_prompt}
                  onChange={e => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Assign Skills Matrix</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {skills.map((skill, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={newAgent.assigned_skills.includes(skill)}
                        onChange={() => toggleSkillSelection(skill)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                      />
                      <span className="font-mono text-[11px] truncate">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                >
                  🚀 Resmikan & Rekrut Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
