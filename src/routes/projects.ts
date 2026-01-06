import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { generateExcel, generatePdf, generateWord, extForFormat } from '../lib/exports';
import { saveExport, listExports, getExportPath } from '../lib/storage';
import path from 'path';
import fs from 'fs';

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

// Project exports: generate & optionally save
router.post('/:id/export', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { format = 'excel', save } = req.body as any;
  const project = await prisma.project.findUnique({ where: { id }, include: { users: true, reports: true, ngo: true } });
  if (!project) return res.status(404).json({ error: 'Not found' });

  // authorization: admin roles or assigned users
  const actor = (req as any).user;
  const isAssigned = project.users.some((u:any) => u.id === actor.id);
  const isAdmin = ['super_admin','project_manager','financial_officer'].includes(actor.role);
  if (!isAdmin && !isAssigned) return res.status(403).json({ error: 'Forbidden' });

  const projects = [project];
  let buf: Buffer;
  if (format === 'excel') buf = Buffer.from(await generateExcel(projects));
  else if (format === 'pdf') buf = await generatePdf(projects);
  else if (format === 'word') buf = Buffer.from(await generateWord(projects));
  else return res.status(400).json({ error: 'Unsupported format' });

  if (save) {
    const ext = extForFormat(format);
    const filename = `export-${id}-${Date.now()}.${ext}`;
    const entry = await saveExport(id, filename, buf as Buffer, format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // audit
    await prisma.auditLog.create({ data: { actorId: actor.id, action: 'export_saved', entity: 'project', entityId: id, meta: JSON.stringify(entry) } });
    return res.json({ saved: true, entry });
  }

  // stream file
  const filename = `project-${id}.${extForFormat(format)}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (format === 'excel') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (format === 'pdf') res.setHeader('Content-Type', 'application/pdf');
  if (format === 'word') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  return res.send(buf);
});

// List saved exports for a project
router.get('/:id/exports', requireAuth, async (req, res) => {
  const { id } = req.params;
  const project = await prisma.project.findUnique({ where: { id }, include: { users: true } });
  if (!project) return res.status(404).json({ error: 'Not found' });
  const actor = (req as any).user;
  const isAssigned = project.users.some((u:any) => u.id === actor.id);
  const isAdmin = ['super_admin','project_manager','financial_officer'].includes(actor.role);
  if (!isAdmin && !isAssigned) return res.status(403).json({ error: 'Forbidden' });
  const list = await listExports(id);
  res.json(list);
});

// Download saved export
router.get('/:id/exports/:file', requireAuth, async (req, res) => {
  const { id, file } = req.params;
  const project = await prisma.project.findUnique({ where: { id }, include: { users: true } });
  if (!project) return res.status(404).json({ error: 'Not found' });
  const actor = (req as any).user;
  const isAssigned = project.users.some((u:any) => u.id === actor.id);
  const isAdmin = ['super_admin','project_manager','financial_officer'].includes(actor.role);
  if (!isAdmin && !isAssigned) return res.status(403).json({ error: 'Forbidden' });
  const p = await getExportPath(id, file);
  if (!p) return res.status(404).json({ error: 'File not found' });
  if (typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://'))) {
    // S3 presigned URL
    return res.redirect(p);
  }
  return res.sendFile(p as string);
});
