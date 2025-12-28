import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// List users (admin only)
router.get('/', requireAuth, requireRole('super_admin', 'project_manager'), async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } });
  res.json(users);
});

// Create user (admin)
router.post('/', requireAuth, requireRole('super_admin', 'project_manager'), async (req: AuthRequest, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // For admin-created users, we store password as provided (should force reset on first login in real system)
  const user = await prisma.user.create({ data: { email, name, role: role || 'employee', password } });
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
