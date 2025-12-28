import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { sign } from '../lib/jwt';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = sign({ sub: user.id, email: user.email, role: user.role });
  res.json({ token });
});

// Register (for initial setup or invite flows)
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name, role: role || 'employee' } });

  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
