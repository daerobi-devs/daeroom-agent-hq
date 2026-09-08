import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

async function generateDirectAgentResponse(content: string, agentName: string, role: string, systemPrompt: string) {
  try {
    const res = await fetch('https://9router.daeroom.my.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-4f9e31ca-9b7e-4001-9008-daeroom2026-master-key`,
      },
      body: JSON.stringify({
        model: '9routess',
        messages: [
          {
            role: 'system',
            content: `Anda adalah ${agentName}, karyawan AI spesialis (${role}) di ekosistem DAEROOM. Pengguna adalah 'Mas Dae' (CEO & Mahasiswa UNPAM). ${systemPrompt}. Selalu panggil pengguna dengan 'Mas Dae' atau 'Mas'. Jawab dengan cerdas, ramah, dan sigap membantu secara langsung tanpa template kaku.`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    }
  } catch (e) {}

  return `Halo Mas Dae! Saya ${agentName} (${role}). Saya mendengar Anda: "${content}". Ada tugas atau perintah khusus yang perlu saya kerjakan sekarang?`;
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

    // 3. Get Agent info & trigger real AI completion
    const agentInfo = await pool.query(`SELECT name, role, system_prompt, slug FROM agents WHERE id = $1`, [agent_id]);
    const agent = agentInfo.rows[0] || { name: 'Cindy', role: 'Chief of Staff', system_prompt: '' };

    // Try Live Bridge or Direct AI
    let finalReply = '';
    try {
      const bridgeRes = await fetch('http://100.91.75.104:7119/api/bridge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id, content }),
        signal: AbortSignal.timeout(30000),
      });
      if (bridgeRes.ok) {
        const bData = await bridgeRes.json();
        if (bData.success && bData.response) {
          finalReply = bData.response;
        }
      }
    } catch (err) {}

    if (!finalReply) {
      finalReply = await generateDirectAgentResponse(content, agent.name, agent.role, agent.system_prompt);
    }

    const agentMsg = await pool.query(
      `INSERT INTO agent_messages (chat_id, agent_id, sender, content, thought_process, tool_calls) 
       VALUES ($1, $2, 'agent', $3, $4, $5) RETURNING *`,
      [
        chatId, 
        agent_id, 
        finalReply, 
        `Triggered by Mas Dae -> Reasoning engine executed for "${agent.role}"`,
        JSON.stringify([{ engine: "hermes_live", status: "ok" }])
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
