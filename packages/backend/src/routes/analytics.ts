import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { queryByPk } from '../db/operations';

const router = Router();

router.use(requireRole('admin', 'manager'));

router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const period = (req.query.period as string) || '30d';
  const userIdFilter = req.query.userId as string;
  const teamIdFilter = req.query.teamId as string;

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[period] || 30;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { items: allChecklists } = await queryByPk(`ORG#${orgId}`, 'CL#', { limit: 500 });

  let checklists = allChecklists.filter((c: any) => c.createdAt >= cutoff);
  if (userIdFilter) {
    checklists = checklists.filter(
      (c: any) => c.assigneeId === userIdFilter || (c.ownerIds || []).includes(userIdFilter),
    );
  }
  if (teamIdFilter) {
    checklists = checklists.filter((c: any) => c.teamId === teamIdFilter);
  }

  const total = checklists.length;
  const byStatus: Record<string, number> = {};
  for (const c of checklists) {
    const st = (c as any).status || 'unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
  }

  const completed = byStatus['completed'] || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const perUser: Record<string, { total: number; completed: number }> = {};
  for (const c of checklists) {
    const uid = (c as any).assigneeId || (c as any).createdBy;
    if (!uid) continue;
    if (!perUser[uid]) perUser[uid] = { total: 0, completed: 0 };
    perUser[uid].total++;
    if ((c as any).status === 'completed') perUser[uid].completed++;
  }

  const perTeam: Record<string, { total: number; completed: number }> = {};
  for (const c of checklists) {
    const tid = (c as any).teamId;
    if (!tid) continue;
    if (!perTeam[tid]) perTeam[tid] = { total: 0, completed: 0 };
    perTeam[tid].total++;
    if ((c as any).status === 'completed') perTeam[tid].completed++;
  }

  res.json({
    data: {
      period,
      total,
      completionRate,
      byStatus,
      perUser,
      perTeam,
    },
  });
}));

router.get('/performance', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const period = (req.query.period as string) || '30d';

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[period] || 30;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { items: allChecklists } = await queryByPk(`ORG#${orgId}`, 'CL#', { limit: 500 });
  const checklists = allChecklists.filter((c: any) => c.createdAt >= cutoff);

  const userScores: Record<string, { completed: number; total: number; deviations: number }> = {};
  const teamScores: Record<string, { completed: number; total: number }> = {};

  for (const c of checklists) {
    const uid = (c as any).assigneeId || (c as any).createdBy;
    if (uid) {
      if (!userScores[uid]) userScores[uid] = { completed: 0, total: 0, deviations: 0 };
      userScores[uid].total++;
      if ((c as any).status === 'completed') userScores[uid].completed++;
    }
    const tid = (c as any).teamId;
    if (tid) {
      if (!teamScores[tid]) teamScores[tid] = { completed: 0, total: 0 };
      teamScores[tid].total++;
      if ((c as any).status === 'completed') teamScores[tid].completed++;
    }
  }

  const topUsers = Object.entries(userScores)
    .map(([userId, s]) => ({ userId, ...s, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  const topTeams = Object.entries(teamScores)
    .map(([teamId, s]) => ({ teamId, ...s, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  let totalDeviations = 0;
  for (const c of checklists) {
    const { items } = await queryByPk(`CL#${(c as any).checklistId}`, 'ITEM#');
    for (const item of items) {
      if ((item as any).hasDeviation) totalDeviations++;
    }
  }

  res.json({
    data: {
      period,
      topUsers,
      topTeams,
      totalDeviations,
    },
  });
}));

export { router as analyticsRouter };
