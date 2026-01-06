import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Project summaries: total reports, approved, pending, total hours
router.get('/projects/summary', requireAuth, async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { reports: true } });
  const summary = projects.map((p) => {
    const totalReports = p.reports.length;
    const approved = p.reports.filter((r) => r.status === 'approved').length;
    const pending = p.reports.filter((r) => r.status === 'pending').length;
    const totalHours = p.reports.reduce((s, r) => s + (r.hours || 0), 0);
    return { projectId: p.id, title: p.title, totalReports, approved, pending, totalHours };
  });
  res.json(summary);
});

// Employee summaries: reports count & total hours
router.get('/employees/summary', requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany();
  const result = await Promise.all(users.map(async (u) => {
    const reports = await prisma.report.findMany({ where: { authorId: u.id } });
    const totalHours = reports.reduce((s, r) => s + (r.hours || 0), 0);
    return { userId: u.id, email: u.email, reports: reports.length, totalHours };
  }));
  res.json(result);
});

export default router;
