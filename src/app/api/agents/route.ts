import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch agents from PostgreSQL database
    const client = await pool.connect();
    const dbAgentsResult = await client.query(`
      SELECT a.*, 
             (SELECT COUNT(*) FROM tasks t WHERE t.agent_id = a.id AND t.status = 'in_progress') as active_tasks_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.agent_id = a.id AND t.status = 'completed') as completed_tasks_count
      FROM agents a
      ORDER BY a.created_at ASC
    `);
    const dbTasksResult = await client.query(`
      SELECT t.*, a.name as agent_name, a.role as agent_role
      FROM tasks t
      LEFT JOIN agents a ON t.agent_id = a.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `);
    const dbLogsResult = await client.query(`
      SELECT l.*, a.name as agent_name
      FROM agent_logs l
      LEFT JOIN agents a ON l.agent_id = a.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    client.release();

    // 2. Discover local Hermes Skills
    const skillsDir = '/home/hermes/.hermes/skills';
    let availableSkills: string[] = [];
    try {
      if (fs.existsSync(skillsDir)) {
        const categories = fs.readdirSync(skillsDir);
        for (const cat of categories) {
          const catPath = path.join(skillsDir, cat);
          if (fs.statSync(catPath).isDirectory()) {
            const skillFolders = fs.readdirSync(catPath);
            for (const sk of skillFolders) {
              if (fs.existsSync(path.join(catPath, sk, 'SKILL.md'))) {
                availableSkills.push(`${cat}/${sk}`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error scanning skills:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        agents: dbAgentsResult.rows,
        tasks: dbTasksResult.rows,
        logs: dbLogsResult.rows,
        availableSkills,
        metrics: {
          totalAgents: dbAgentsResult.rows.length,
          activeTasks: dbTasksResult.rows.filter(t => t.status === 'in_progress').length,
          totalLogs: dbLogsResult.rows.length,
          serverUptime: '24/7 Active',
          coolifyStatus: 'Healthy',
          dbHost: '192.168.1.8 (PostgreSQL pgvector)'
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, role, description, systemPrompt, assignedSkills, status = 'idle' } = body;

    if (!name || !role) {
      return NextResponse.json({ success: false, error: 'Name and role are required' }, { status: 400 });
    }

    const client = await pool.connect();
    const insertResult = await client.query(
      `INSERT INTO agents (name, role, description, system_prompt, status, configuration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        name,
        role,
        description || '',
        systemPrompt || '',
        status,
        JSON.stringify({ skills: assignedSkills || [], discord_sync: true })
      ]
    );
    const newAgent = insertResult.rows[0];

    // Log creation event
    await client.query(
      `INSERT INTO agent_logs (agent_id, step_name, action, status, details, created_at)
       VALUES ($1, 'AGENT_RECRUITMENT', $2, 'info', $3, NOW())`,
      [newAgent.id, `Agent ${name} (${role}) was successfully onboarded by CEO.`, JSON.stringify({ skills: assignedSkills })]
    );

    client.release();

    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
