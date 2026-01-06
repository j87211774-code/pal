import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateExcel, generatePdf, generateWord } from '../lib/exports';

const router = Router();

// Utility: classify project status based on dates
function projectStatus(project: any) {
  const now = new Date();
  if (project.endDate && new Date(project.endDate) < now) return 'completed';
  if (project.startDate && new Date(project.startDate) > now) return 'not_started';
  return 'in_progress';
}

// GET counts: total, byYear, byUser, byStatus
router.get('/projects/counts', requireAuth, requireRole('super_admin', 'project_manager', 'financial_officer'), async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { users: true } });
  const total = projects.length;

  const byYear: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const byStatus: Record<string, number> = { completed: 0, in_progress: 0, not_started: 0 };

  for (const p of projects) {
    const yr = new Date(p.startDate).getFullYear().toString();
    byYear[yr] = (byYear[yr] || 0) + 1;
    const st = projectStatus(p);
    byStatus[st] = (byStatus[st] || 0) + 1;
    for (const u of p.users) {
      byUser[u.id] = (byUser[u.id] || 0) + 1;
    }
  }

  // Resolve user ids to names
  const users = await prisma.user.findMany({ where: { id: { in: Object.keys(byUser) } } });
  const byUserNamed = users.map(u => ({ id: u.id, name: u.name || u.email, count: byUser[u.id] }));

  res.json({ total, byYear, byUser: byUserNamed, byStatus });
});

// GET paginated projects with filters and sort
router.get('/projects', requireAuth, requireRole('super_admin', 'project_manager', 'financial_officer', 'viewer'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(200, Number(req.query.perPage) || 25);
  const { filterYear, filterUser, filterStatus, sortBy, order, search } = req.query as any;

  let where: any = {};
  if (search) where.title = { contains: String(search), mode: 'insensitive' };
  if (filterYear) {
    const year = Number(filterYear);
    where.startDate = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }
  if (filterUser) {
    where.users = { some: { id: String(filterUser) } };
  }

  // If filterStatus is requested or sortBy is a derived field (e.g., numActivities),
  // fetch all matching projects and apply filtering/sorting in JS, then paginate.
  const needsClientSideProcessing = !!filterStatus || ['numActivities'].includes(String(sortBy));

  if (needsClientSideProcessing) {
    const all = await prisma.project.findMany({ where, include: { users: true, reports: true, ngo: true } });
    let rows = all.map(p => ({ id: p.id, title: p.title, users: p.users.map((u:any)=>u.name || u.email), year: new Date(p.startDate).getFullYear(), region: p.region || null, status: projectStatus(p), numActivities: p.reports.length, numSurveys: p.reports.filter((r:any)=>r.type === 'survey').length, ngo: p.ngo ? p.ngo.name : null }));

    if (filterStatus) {
      rows = rows.filter((r:any) => r.status === String(filterStatus));
    }

    // client-side sort if requested
    if (sortBy) {
      const dir = order === 'desc' ? -1 : 1;
      rows.sort((a:any,b:any) => {
        if (sortBy === 'numActivities') return dir * ((a.numActivities || 0) - (b.numActivities || 0));
        if (sortBy === 'title') return dir * a.title.localeCompare(b.title);
        if (sortBy === 'year') return dir * (a.year - b.year);
        return 0;
      });
    }

    const total = rows.length;
    const paged = rows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
    return res.json({ page, perPage, total, rows: paged });
  }

  // Database-supported ordering and pagination
  const projects = await prisma.project.findMany({ where, include: { users: true, reports: true, ngo: true }, orderBy: sortBy ? { [String(sortBy)]: order === 'desc' ? 'desc' : 'asc' } : undefined, skip: (page -1)* perPage, take: perPage });
  const total = await prisma.project.count({ where });

  const rows = projects.map(p => ({ id: p.id, title: p.title, users: p.users.map((u:any)=>u.name || u.email), year: new Date(p.startDate).getFullYear(), region: p.region || null, status: projectStatus(p), numActivities: p.reports.length, numSurveys: p.reports.filter((r:any)=>r.type === 'survey').length, ngo: p.ngo ? p.ngo.name : null }));
  res.json({ page, perPage, total, rows });
});

// Export helpers are provided by ../lib/exports

// Export route
router.get('/projects/export', requireAuth, requireRole('super_admin', 'project_manager', 'financial_officer'), async (req, res) => {
  const { format = 'excel', year, userId, status } = req.query as any;
  const where: any = {};
  if (year) {
    const y = Number(year);
    where.startDate = { gte: new Date(y, 0, 1), lt: new Date(y+1,0,1) };
  }
  if (userId) where.users = { some: { id: String(userId) } };
  let projects = await prisma.project.findMany({ where, include: { users: true, reports: true, ngo: true } });
  if (status) {
    projects = projects.filter(p => projectStatus(p) === String(status));
  }

  if (format === 'excel') {
    const buf = await generateExcel(projects);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.xlsx"');
    return res.send(Buffer.from(buf));
  }

  if (format === 'pdf') {
    const buf = await generatePdf(projects);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.pdf"');
    return res.send(buf);
  }

// Preview route (no auth) - useful for local demo/mock UIs. Remove or protect in production.
  if (format === 'word') {
    const buf = await generateWord(projects);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.docx"');
    return res.send(Buffer.from(buf));
  }

  res.status(400).json({ error: 'Unsupported format' });
});

// Preview route (no auth) - useful for local demo/mock UIs. Remove or protect in production.
router.get('/preview', async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { users: true, reports: true, ngo: true }, take: 200 });
  const total = projects.length;
  const byYear: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const byStatus: Record<string, number> = { completed: 0, in_progress: 0, not_started: 0 };
  for (const p of projects) {
    const yr = new Date(p.startDate).getFullYear().toString();
    byYear[yr] = (byYear[yr] || 0) + 1;
    const st = projectStatus(p);
    byStatus[st] = (byStatus[st] || 0) + 1;
    for (const u of p.users) {
      byUser[u.id] = (byUser[u.id] || 0) + 1;
    }
  }
  const users = await prisma.user.findMany({ where: { id: { in: Object.keys(byUser) } }, select: { id: true, name: true, email: true } });
  const byUserNamed = users.map(u => ({ id: u.id, name: u.name || u.email, count: byUser[u.id] }));

  const rows = projects.map(p => ({ id: p.id, title: p.title, users: p.users.map((u:any)=>u.name || u.email), year: new Date(p.startDate).getFullYear(), region: p.region || null, status: projectStatus(p), numActivities: p.reports.length, ngo: p.ngo ? p.ngo.name : null }));

  res.json({ counts: { total, byYear, byUser: byUserNamed, byStatus }, rows });
});

export default router;
