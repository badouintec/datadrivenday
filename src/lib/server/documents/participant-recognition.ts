import { LineCapStyle, PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { site } from '../../../data/site';
import type { ParticipantUser } from '../../api/types';

function sanitizeText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeFileSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'participante';
}

function fitHeadline(name: string, limit = 30) {
  const words = sanitizeText(name).split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function drawBrandLogo(
  page: Parameters<typeof PDFDocument.create>[0] extends never ? never : any,
  options: {
    x: number;
    y: number;
    scale?: number;
    color?: ReturnType<typeof rgb>;
    textColor?: ReturnType<typeof rgb>;
    font: any;
  }
) {
  const { x, y, scale = 1, color = rgb(1, 1, 1), textColor = color, font } = options;
  const thickness = 8 * scale;

  const drawSegment = (fromX: number, fromY: number, toX: number, toY: number) => {
    page.drawLine({
      start: { x: x + fromX * scale, y: y + fromY * scale },
      end: { x: x + toX * scale, y: y + toY * scale },
      thickness,
      color,
      lineCap: LineCapStyle.Round,
    });
  };

  drawSegment(0, 0, 0, 36);
  drawSegment(0, 36, 12, 36);
  drawSegment(12, 36, 12, 8);

  drawSegment(28, 20, 28, 58);
  drawSegment(28, 58, 40, 58);
  drawSegment(40, 58, 40, 20);

  drawSegment(56, 30, 56, 82);
  drawSegment(56, 82, 68, 82);
  drawSegment(68, 82, 68, 30);

  drawSegment(84, 50, 84, 108);
  drawSegment(84, 108, 96, 108);
  drawSegment(96, 108, 96, 50);

  page.drawText('datadriven.day', {
    x: x + 126 * scale,
    y: y - 2 * scale,
    size: 44 * scale,
    font,
    color: textColor,
  });
}

export async function buildParticipantRecognitionPdf(participant: ParticipantUser) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reconocimiento ${participant.fullName} - ${site.title}`);
  pdf.setAuthor(site.name);
  pdf.setCreator(site.name);
  pdf.setSubject('Reconocimiento de participacion');
  pdf.setKeywords(['Data Driven Day', 'Dataller', 'Reconocimiento']);

  const page = pdf.addPage([842, 595]);
  const width = page.getWidth();
  const height = page.getHeight();
  const margin = 46;
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.03, 0.07, 0.14) });
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: rgb(0.1, 0.64, 0.95), borderWidth: 1.5 });
  page.drawRectangle({ x: margin, y: height - 122, width: width - margin * 2, height: 72, color: rgb(0.05, 0.12, 0.22) });
  page.drawRectangle({ x: margin, y: 54, width: width - margin * 2, height: 54, color: rgb(0.05, 0.12, 0.22) });
  page.drawCircle({ x: width - 104, y: height - 86, size: 32, color: rgb(0.04, 0.27, 0.43), opacity: 0.8 });
  page.drawCircle({ x: width - 132, y: height - 86, size: 32, color: rgb(0.06, 0.56, 0.8), opacity: 0.9 });

  drawBrandLogo(page, {
    x: margin + 22,
    y: height - 108,
    scale: 1.02,
    color: rgb(0.95, 0.97, 1),
    textColor: rgb(0.95, 0.97, 1),
    font: helveticaBold,
  });
  page.drawText('DATA DRIVEN DAY 2026', {
    x: margin + 22,
    y: height - 58,
    size: 10,
    font: helveticaBold,
    color: rgb(0.63, 0.76, 0.86),
  });
  page.drawText('Reconocimiento de participacion', {
    x: margin + 216,
    y: height - 58,
    size: 10,
    font: helvetica,
    color: rgb(0.63, 0.76, 0.86),
  });

  page.drawText('Se reconoce a', {
    x: margin + 18,
    y: height - 186,
    size: 18,
    font: helvetica,
    color: rgb(0.7, 0.8, 0.92),
  });

  const nameLines = fitHeadline(participant.fullName);
  nameLines.forEach((line, index) => {
    page.drawText(line, {
      x: margin + 18,
      y: height - 244 - index * 46,
      size: 34,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
  });

  page.drawText('por haber concluido y validado su participacion en el Dataller de IA,', {
    x: margin + 18,
    y: height - 346,
    size: 15,
    font: helvetica,
    color: rgb(0.84, 0.89, 0.95),
  });
  page.drawText('evento de Data Driven Day 2026 enfocado en IA aplicada, datos y ciudad.', {
    x: margin + 18,
    y: height - 370,
    size: 15,
    font: helvetica,
    color: rgb(0.84, 0.89, 0.95),
  });

  page.drawText(`Lugar: ${site.location}`, {
    x: margin + 18,
    y: height - 432,
    size: 12,
    font: helvetica,
    color: rgb(0.67, 0.78, 0.9),
  });
  page.drawText(`Fecha del evento: ${site.eventDate}`, {
    x: margin + 18,
    y: height - 452,
    size: 12,
    font: helvetica,
    color: rgb(0.67, 0.78, 0.9),
  });

  page.drawText(`Folio: ${sanitizeText(participant.recognitionFolio || `DDD-2026-${participant.id.slice(0, 8).toUpperCase()}`)}`, {
    x: width - 258,
    y: height - 432,
    size: 12,
    font: helveticaBold,
    color: rgb(0.76, 0.9, 1),
  });
  page.drawText(`Emitido: ${new Date().toISOString().slice(0, 10)}`, {
    x: width - 258,
    y: height - 452,
    size: 12,
    font: helvetica,
    color: rgb(0.67, 0.78, 0.9),
  });

  page.drawText(site.tagline, {
    x: margin + 18,
    y: 75,
    size: 10,
    font: helvetica,
    color: rgb(0.63, 0.76, 0.86),
    maxWidth: width - margin * 2 - 36,
  });

  const filename = `reconocimiento-${makeFileSlug(participant.fullName)}.pdf`;
  const bytes = await pdf.save();
  return { bytes, filename };
}