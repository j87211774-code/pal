import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import { getPresignedUploadUrl } from '../lib/s3';

const router = Router();

// Generate presigned URL for clients to upload attachments
router.post('/presign', requireAuth, async (req, res) => {
  const { key, contentType } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    const url = await getPresignedUploadUrl(key, contentType);
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a report (attachments expected as array of keys)
router.post('/', requireAuth, async (req: any, res) => {
  const { projectId, type, date, hours, location, content, attachments } = req.body;
  if (!projectId || !type) return res.status(400).json({ error: 'projectId and type are required' });

  const report = await prisma.report.create({ data: {
    projectId,
    authorId: req.user.sub,
    authorName: req.user.email,
    type,
    date: date ? new Date(date) : new Date(),
    hours: hours || 0,
    location,
    content,
    attachments: attachments ? JSON.stringify(attachments) : null,
    status: 'pending'
  }});

  res.status(201).json(report);
});

export default router;
