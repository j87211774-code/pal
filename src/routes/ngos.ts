import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Create NGO
router.post('/', requireAuth, requireRole('super_admin', 'project_manager'), async (req, res) => {
  const { name, code } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const ngo = await prisma.nGO.create({ data: { name, code } });
  (res as any).locals.entityId = ngo.id;
  res.status(201).json(ngo);
});

// List NGOs
router.get('/', requireAuth, async (_req, res) => {
  const ngos = await prisma.nGO.findMany();
  res.json(ngos);
});

// Get NGO
router.get('/:id', requireAuth, async (req, res) => {
  const ngo = await prisma.nGO.findUnique({ where: { id: req.params.id } });
  if (!ngo) return res.status(404).json({ error: 'Not found' });
  res.json(ngo);
});

// Update NGO
router.put('/:id', requireAuth, requireRole('super_admin', 'project_manager'), async (req, res) => {
  const ngo = await prisma.nGO.update({ where: { id: req.params.id }, data: req.body });
  (res as any).locals.entityId = ngo.id;
  res.json(ngo);
});

// Delete NGO
router.delete('/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  await prisma.nGO.delete({ where: { id: req.params.id } });
  (res as any).locals.entityId = req.params.id;
  res.status(204).send();
});

export default router;
