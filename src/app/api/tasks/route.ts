import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, agentId, priority = 'medium', inputData } = body;

    if (!title || !agentId) {
      return NextResponse.json({ success: false, error: 'Title and target agent are required' }, { status: 400 });
    }

    const client = await pool.connect();
    const taskResult = await client.query(
      `INSERT INTO tasks (agent_id, title, description, priority, status, progress, input, created_at, started_at)
       VALUES ($1, $2, $3, $4, 'in_progress', 10, $5, NOW(), NOW())
       RETURNING *`,
      [agentId, title, description || '', priority, JSON.stringify(inputData || {})]
    );
    const newTask = taskResult.rows[0];

    // Log action
    await client.query(
      `INSERT INTO agent_logs (agent_id, step_name, action, status, details, created_at)
       VALUES ($1, 'TASK_DISPATCH', $2, 'info', $3, NOW())`,
      [agentId, `Task assigned: "${title}" [Priority: ${priority}]`, JSON.stringify({ taskId: newTask.id })]
    );

    // Update agent status to working
    await client.query(`UPDATE agents SET status = 'working', updated_at = NOW() WHERE id = $1`, [agentId]);

    client.release();

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
