import { Router } from 'express';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = Router();

// List projects for current user
router.get('/', requireAuth, async (req: any, res) => {
  const userId = req.user.sub;
  const projects = await prisma.project.findMany({ where: { users: { some: { id: userId } } }, include: { reports: true } });
  const rows = projects.map(p => ({ id: p.id, title: p.title, status: (new Date(p.endDate) < new Date() ? 'completed' : (new Date(p.startDate) > new Date() ? 'not_started' : 'in_progress')), year: new Date(p.startDate).getFullYear(), numActivities: p.reports.length, numSurveys: p.reports.filter((r:any)=>r.type==='survey').length }));
  res.json(rows);
});

// Export user's projects to PDF
router.get('/export', requireAuth, async (req: any, res) => {
  const userId = req.user.sub;
  const projects = await prisma.project.findMany({ where: { users: { some: { id: userId } } } });

  const doc = new PDFDocument({ size: 'A4' });
  const buffers: any[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.fontSize(16).text(`Projects for ${req.user.email}`);
  doc.moveDown();
  projects.forEach((p:any) => {
    doc.fontSize(12).text(`- ${p.title} (${new Date(p.startDate).getFullYear()})`);
  });
  doc.end();
  const buf = await new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(buffers))); doc.on('error', reject); });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.user.email}_projects.pdf"`);
  res.send(buf);
});

export default router;
