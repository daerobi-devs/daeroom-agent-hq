import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const artifacts = await pool.query(`
      SELECT art.*, a.name as agent_name, a.role as agent_role
      FROM agent_artifacts art
      JOIN agents a ON art.agent_id = a.id
      ORDER BY art.created_at DESC
    `);
    return NextResponse.json({ success: true, data: artifacts.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
