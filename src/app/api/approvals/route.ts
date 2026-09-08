import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const approvals = await pool.query(`
      SELECT app.*, a.name as agent_name, a.role as agent_role
      FROM approval_requests app
      JOIN agents a ON app.agent_id = a.id
      ORDER BY app.created_at DESC
    `);
    return NextResponse.json({ success: true, data: approvals.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, status, reviewer_note } = body;

    const result = await pool.query(
      `UPDATE approval_requests 
       SET status = $1, reviewer_note = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, reviewer_note || null, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
