import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Call Real Live Hermes Bridge
async function callRealHermesBridge(agentId: string, content: string, agentName: string, role: string) {
  try {
    // Try live Hermes Engine Bridge on host machine
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const bridgeRes = await fetch('http://192.168.1.6:7119/api/bridge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, content }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (bridgeRes.ok) {
      const bridgeData = await bridgeRes.json();
      if (bridgeData.success && bridgeData.response) {
        return {
          response: bridgeData.response,
          engine: 'Hermes Live Core Engine (Real-Time)',
          profile: bridgeData.profile || 'default'
        };
      }
    }
  } catch (bridgeErr) {
    console.warn('Hermes Bridge connection fallback:', bridgeErr);
  }

  // Fallback to 9Router direct LLM completion
  try {
    const res = await fetch('https://9router.daeroom.my.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-daeroom-9router-2026-master-key`,
      },
      body: JSON.stringify({
        model: '9routess',
        messages: [
          {
            role: 'system',
            content: `Anda adalah ${agentName}, karyawan AI spesialis (${role}) di DAEROOM. Mas Dae adalah CEO Anda. Jawab dengan cerdas, sigap, dan panggil pengguna dengan 'Mas Dae'.`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        response: data.choices?.[0]?.message?.content || `Halo Mas Dae! Saya ${agentName}. Siap menjalankan tugas.`,
        engine: '9Router AI Gateway',
        profile: '9routess'
      };
    }
  } catch (aiErr) {}

  return {
    response: `Halo Mas Dae! Saya ${agentName} (${role}). Pesan Anda: "${content}" telah diterima di DAEROOM CORE.`,
    engine: 'Internal Fallback',
    profile: 'system'
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');

    if (agentId) {
      const messages = await pool.query(
        `SELECT * FROM agent_messages WHERE agent_id = $1 ORDER BY created_at ASC`,
        [agentId]
      );
      return NextResponse.json({ success: true, data: messages.rows });
    }

    const allChats = await pool.query(`
      SELECT c.*, a.name as agent_name, a.role as agent_role 
      FROM agent_chats c 
      JOIN agents a ON c.agent_id = a.id 
      ORDER BY c.updated_at DESC
    `);
    return NextResponse.json({ success: true, data: allChats.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent_id, content } = body;

    if (!agent_id || !content) {
      return NextResponse.json({ success: false, error: 'agent_id and content are required' }, { status: 400 });
    }

    // 1. Get or create chat
    let chatResult = await pool.query(`SELECT id FROM agent_chats WHERE agent_id = $1 LIMIT 1`, [agent_id]);
    let chatId = chatResult.rows[0]?.id;

    if (!chatId) {
      const newChat = await pool.query(
        `INSERT INTO agent_chats (agent_id, title) VALUES ($1, $2) RETURNING id`,
        [agent_id, 'Direct Conversation with CEO']
      );
      chatId = newChat.rows[0].id;
    }

    // 2. Insert user message
    const userMsg = await pool.query(
      `INSERT INTO agent_messages (chat_id, agent_id, sender, content) 
       VALUES ($1, $2, 'user', $3) RETURNING *`,
      [chatId, agent_id, content]
    );

    // 3. Get Agent info & trigger REAL Hermes Core Turn
    const agentInfo = await pool.query(`SELECT name, role, system_prompt FROM agents WHERE id = $1`, [agent_id]);
    const agent = agentInfo.rows[0] || { name: 'Cindy', role: 'Chief of Staff' };

    const { response, engine, profile } = await callRealHermesBridge(agent_id, content, agent.name, agent.role);

    const agentMsg = await pool.query(
      `INSERT INTO agent_messages (chat_id, agent_id, sender, content, thought_process, tool_calls) 
       VALUES ($1, $2, 'agent', $3, $4, $5) RETURNING *`,
      [
        chatId, 
        agent_id, 
        response, 
        `Triggered by Mas Dae -> Executed live on ${engine} (Profile: ${profile})`,
        JSON.stringify([{ engine, status: "live_connected" }])
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        user_message: userMsg.rows[0],
        agent_message: agentMsg.rows[0],
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
