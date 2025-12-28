import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit } from '../middleware/audit';

const router = Router();

// Create project
router.post('/', requireAuth, requireRole('super_admin', 'project_manager'), audit('create', 'project'), async (req, res) => {
  const { title, startDate, endDate, budget, ngoId, objectives } = req.body;
  if (!title || !startDate || !endDate) return res.status(400).json({ error: 'title/startDate/endDate required' });
  const project = await prisma.project.create({ data: { title, startDate: new Date(startDate), endDate: new Date(endDate), budget: budget || 0, ngoId, objectives } });
  (res as any).locals.entityId = project.id;
  res.status(201).json(project);
});

// List projects with simple filters
router.get('/', requireAuth, async (req, res) => {
  const { ngoId } = req.query;
  const where: any = {};
  if (ngoId) where.ngoId = String(ngoId);
  const projects = await prisma.project.findMany({ where, include: { ngo: true } });
  res.json(projects);
});

// Get project
router.get('/:id', requireAuth, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { ngo: true, users: true } });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// Update project
router.put('/:id', requireAuth, requireRole('super_admin', 'project_manager'), audit('update', 'project'), async (req, res) => {
  const data = { ...req.body };
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const project = await prisma.project.update({ where: { id: req.params.id }, data });
  (res as any).locals.entityId = project.id;
  res.json(project);
});

// Delete project
router.delete('/:id', requireAuth, requireRole('super_admin'), audit('delete', 'project'), async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  (res as any).locals.entityId = req.params.id;
  res.status(204).send();
});

// Assign users to project (array of userIds)
router.post('/:id/assign', requireAuth, requireRole('super_admin', 'project_manager'), audit('assign_users', 'project'), async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds array required' });
  const connects = userIds.map((id: string) => ({ id }));
  const project = await prisma.project.update({ where: { id: req.params.id }, data: { users: { connect: connects } }, include: { users: true } });
  (res as any).locals.entityId = project.id;
  res.json(project);
});

export default router;
