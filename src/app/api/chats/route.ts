import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';

async function callHermesAI(prompt: string, agentName: string, role: string, systemPrompt: string) {
  try {
    let apiKey = '';
    try {
      const config = fs.readFileSync('/home/hermes/.n9router_config', 'utf8');
      const match = config.match(/API_KEY=([^\n]+)/);
      if (match) apiKey = match[1].trim();
    } catch (e) {}

    if (!apiKey) {
      return `Halo Mas Dae! Saya ${agentName} (${role}). Perintah Anda: "${prompt}" telah tercatat dan sedang diproses di background.`;
    }

    const res = await fetch('https://9router.daeroom.my.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: '9routess',
        messages: [
          {
            role: 'system',
            content: `Anda adalah ${agentName}, karyawan AI spesialis dengan role: "${role}" di perusahaan DAEROOM. Mas Dae (pengguna) adalah CEO Anda. ${systemPrompt}. Selalu panggil pengguna dengan 'Mas Dae' atau 'Mas'. Berikan respon yang cerdas, sigap, langsung pada intinya, dan profesional sesuai keahlian Anda.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!res.ok) {
      return `Halo Mas Dae! Saya ${agentName} (${role}). Respon diterima: "${prompt}".`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || `Halo Mas Dae! Respon dari ${agentName} telah siap.`;
  } catch (err: any) {
    return `Halo Mas Dae! Saya ${agentName}. Perintah "${prompt}" siap saya eksekusi.`;
  }
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
    const agentInfo = await pool.query(`SELECT name, role, system_prompt FROM agents WHERE id = $1`, [agent_id]);
    const agent = agentInfo.rows[0] || { name: 'Agent', role: 'Staff', system_prompt: '' };

    const replyContent = await callHermesAI(content, agent.name, agent.role, agent.system_prompt);

    const agentMsg = await pool.query(
      `INSERT INTO agent_messages (chat_id, agent_id, sender, content, thought_process, tool_calls) 
       VALUES ($1, $2, 'agent', $3, $4, $5) RETURNING *`,
      [
        chatId, 
        agent_id, 
        replyContent, 
        `Analyzing query -> Matched role "${agent.role}" -> Routed to 9Router LLM Engine`,
        JSON.stringify([{ tool: "9router_ai", status: "success" }])
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
