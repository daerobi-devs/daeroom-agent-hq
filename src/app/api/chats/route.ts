import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    // 3. Simulated intelligent agent response based on role
    const agentInfo = await pool.query(`SELECT name, role FROM agents WHERE id = $1`, [agent_id]);
    const agent = agentInfo.rows[0];

    const replyContent = `Halo Mas Dae! Saya ${agent?.name || 'Agent'}. Perintah "${content}" telah saya terima dan sedang diproses sesuai SOP (${agent?.role || 'Karyawan AI'}).`;
    
    const agentMsg = await pool.query(
      `INSERT INTO agent_messages (chat_id, agent_id, sender, content, thought_process, tool_calls) 
       VALUES ($1, $2, 'agent', $3, $4, $5) RETURNING *`,
      [
        chatId, 
        agent_id, 
        replyContent, 
        `Analyzing prompt from Mas Dae -> Dispatching to internal sub-routine for ${agent?.role}`,
        JSON.stringify([{ tool: "hermes_orchestrator", status: "success" }])
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
