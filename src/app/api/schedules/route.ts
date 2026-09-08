import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schedules = await pool.query(`
      SELECT s.*, a.name as agent_name, a.role as agent_role
      FROM agent_schedules s
      JOIN agents a ON s.agent_id = a.id
      ORDER BY s.created_at DESC
    `);
    return NextResponse.json({ success: true, data: schedules.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent_id, name, cron_expression, description, task_payload } = body;

    const result = await pool.query(
      `INSERT INTO agent_schedules (agent_id, name, cron_expression, description, task_payload, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [agent_id, name, cron_expression, description, task_payload]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active } = body;

    const result = await pool.query(
      `UPDATE agent_schedules SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
