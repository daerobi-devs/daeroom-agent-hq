import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const telemetry = await pool.query(`
      SELECT t.*, a.name as agent_name, a.role as agent_role
      FROM token_telemetry t
      JOIN agents a ON t.agent_id = a.id
      ORDER BY t.recorded_at DESC
    `);

    // Calculate totals
    const totals = await pool.query(`
      SELECT 
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as grand_total_tokens,
        SUM(saved_tokens) as grand_saved_tokens,
        SUM(cost_usd) as total_cost_usd
      FROM token_telemetry
    `);

    return NextResponse.json({ 
      success: true, 
      data: {
        records: telemetry.rows,
        summary: totals.rows[0]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
