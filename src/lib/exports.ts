import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function generateExcel(projects: any[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Projects');
  ws.addRow(['Project', 'Users', 'Year', 'Region', 'Status', 'Activities', 'Surveys', 'NGO']);
  for (const p of projects) {
    ws.addRow([p.title, (p.users||[]).map((u:any)=>u.name||u.email).join(', '), new Date(p.startDate).getFullYear(), p.region||'', p.status||'', p.reports?.length || 0, (p.reports||[]).filter((r:any)=>r.type==='survey').length, p.ngo?.name || '']);
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export async function generatePdf(projects: any[]) {
  const doc = new PDFDocument({ size: 'A4' });
  const buffers: any[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});
  doc.fontSize(18).text('Projects Report', { align: 'center' });
  doc.moveDown();
  for (const p of projects) {
    doc.fontSize(12).text(`${p.title} — ${p.status || ''}`);
    doc.fontSize(10).text(`Year: ${new Date(p.startDate).getFullYear()} | Region: ${p.region || '-'} | Activities: ${p.reports?.length || 0} | Surveys: ${(p.reports||[]).filter((r:any)=>r.type==='survey').length}`);
    doc.moveDown(0.5);
  }
  doc.end();
  const buf = await new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(buffers))); doc.on('error', reject); });
  return buf;
}

export async function generateWord(projects: any[]) {
  const paragraphs: Paragraph[] = [new Paragraph({ children: [ new TextRun({ text: 'Projects Report', bold: true, size: 28 }) ] })];
  projects.forEach((p:any) => {
    paragraphs.push(new Paragraph({ children: [ new TextRun({ text: p.title }) ] }));
    paragraphs.push(new Paragraph({ children: [ new TextRun({ text: `Year: ${new Date(p.startDate).getFullYear()} | Status: ${p.status || ''}` }) ] }));
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);
  return buf;
}

export function extForFormat(format: string) {
  if (format === 'excel') return 'xlsx';
  if (format === 'pdf') return 'pdf';
  if (format === 'word') return 'docx';
  return 'dat';
}
