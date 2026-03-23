import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { site } from '../../../data/site';
import type { ParticipantUser } from '../../api/types';

// ── Site palette (matches global.css vars) ──────────────────────────────────
const COLORS = {
  bg:         rgb(0.051, 0.067, 0.090),   // #0d1117
  surface:    rgb(0.086, 0.106, 0.133),   // #161b22
  surface2:   rgb(0.110, 0.137, 0.200),   // #1c2333
  border:     rgb(0.129, 0.149, 0.176),   // #21262d
  accentBlue: rgb(0.231, 0.510, 0.965),   // #3b82f6
  accentSky:  rgb(0.376, 0.647, 0.980),   // #60a5fa
  accentData: rgb(0.576, 0.773, 0.992),   // #93c5fd
  accentGo:   rgb(0.204, 0.827, 0.600),   // #34d399
  textPrimary:   rgb(0.902, 0.929, 0.953),  // #e6edf3
  textSecondary: rgb(0.788, 0.820, 0.851),  // #c9d1d9
  textMuted:     rgb(0.490, 0.522, 0.565),  // #7d8590
  white:      rgb(1, 1, 1),
};

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

function fitHeadline(name: string, limit = 28) {
  const words = sanitizeText(name).split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function buildParticipantRecognitionPdf(participant: ParticipantUser) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reconocimiento ${participant.fullName} - ${site.title}`);
  pdf.setAuthor(site.name);
  pdf.setCreator(site.name);
  pdf.setSubject('Reconocimiento de participacion — Dataller de IA');
  pdf.setKeywords(['Data Driven Day', 'Dataller', 'Reconocimiento', 'Hermosillo', '2026']);

  // Landscape A4
  const page = pdf.addPage([842, 595]);
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 40; // margin

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ── Background ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.bg });
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.surface, opacity: 0.3 });

  // ── Decorative border ─────────────────────────────────────────────────────
  page.drawRectangle({
    x: 16, y: 16, width: W - 32, height: H - 32,
    borderColor: COLORS.border, borderWidth: 0.75,
  });
  page.drawRectangle({
    x: 24, y: 24, width: W - 48, height: H - 48,
    borderColor: COLORS.accentBlue, borderWidth: 1.5, opacity: 0.6,
  });

  // ── Corner accents ────────────────────────────────────────────────────────
  const cornerSize = 6;
  const cornerOffset = 30;
  const corners = [
    { x: cornerOffset, y: cornerOffset },
    { x: W - cornerOffset, y: cornerOffset },
    { x: cornerOffset, y: H - cornerOffset },
    { x: W - cornerOffset, y: H - cornerOffset },
  ];
  for (const c of corners) {
    page.drawCircle({ x: c.x, y: c.y, size: cornerSize, color: COLORS.accentBlue, opacity: 0.5 });
    page.drawCircle({ x: c.x, y: c.y, size: cornerSize - 2, color: COLORS.accentSky, opacity: 0.8 });
  }

  // ── Header band ───────────────────────────────────────────────────────────
  const headerY = H - 120;
  const headerH = 76;
  page.drawRectangle({
    x: M, y: headerY, width: W - M * 2, height: headerH,
    color: COLORS.surface2, opacity: 0.85,
  });
  page.drawRectangle({
    x: M, y: headerY - 2, width: W - M * 2, height: 2,
    color: COLORS.accentBlue, opacity: 0.7,
  });

  // ── Text-based logo (replaces PNG to avoid CPU-heavy embedPng in Workers) ─
  page.drawText('DATA', {
    x: M + 20,
    y: headerY + headerH - 30,
    size: 20,
    font: helveticaBold,
    color: COLORS.accentBlue,
  });
  page.drawText('DRIVEN', {
    x: M + 20,
    y: headerY + headerH - 50,
    size: 20,
    font: helveticaBold,
    color: COLORS.accentSky,
  });
  page.drawText('DAY', {
    x: M + 20,
    y: headerY + headerH - 70,
    size: 20,
    font: helveticaBold,
    color: COLORS.accentGo,
  });

  // Decorative dot between logo and header text
  page.drawCircle({ x: M + 105, y: headerY + headerH / 2, size: 4, color: COLORS.accentBlue, opacity: 0.6 });

  // Header text
  page.drawText('RECONOCIMIENTO DE PARTICIPACION', {
    x: M + 120,
    y: headerY + headerH - 28,
    size: 10,
    font: helveticaBold,
    color: COLORS.accentSky,
  });
  page.drawText('Dataller de IA  ·  Hermosillo 2026', {
    x: M + 120,
    y: headerY + headerH - 46,
    size: 9,
    font: helvetica,
    color: COLORS.textMuted,
  });

  // ── Decorative circles (top-right) ────────────────────────────────────────
  page.drawCircle({ x: W - 90, y: H - 82, size: 28, color: COLORS.accentBlue, opacity: 0.12 });
  page.drawCircle({ x: W - 115, y: H - 82, size: 28, color: COLORS.accentSky, opacity: 0.15 });
  page.drawCircle({ x: W - 102, y: H - 65, size: 14, color: COLORS.accentGo, opacity: 0.10 });

  // ── Body: "Se reconoce a" ─────────────────────────────────────────────────
  const bodyStartY = headerY - 40;
  page.drawText('Se reconoce a', {
    x: M + 20,
    y: bodyStartY,
    size: 16,
    font: helvetica,
    color: COLORS.textSecondary,
  });

  // ── Participant name ──────────────────────────────────────────────────────
  const nameLines = fitHeadline(participant.fullName);
  const nameStartY = bodyStartY - 50;
  nameLines.forEach((line, i) => {
    page.drawText(line, {
      x: M + 20,
      y: nameStartY - i * 44,
      size: 36,
      font: helveticaBold,
      color: COLORS.white,
    });
  });

  // Accent underline below name
  const nameEndY = nameStartY - (nameLines.length - 1) * 44 - 14;
  page.drawRectangle({
    x: M + 20, y: nameEndY, width: 120, height: 3,
    color: COLORS.accentBlue, opacity: 0.8,
  });

  // ── Description text ──────────────────────────────────────────────────────
  const descY = nameEndY - 30;
  page.drawText('por haber concluido y validado su participacion en el Dataller de IA,', {
    x: M + 20,
    y: descY,
    size: 13,
    font: helvetica,
    color: COLORS.textSecondary,
  });
  page.drawText('evento de Data Driven Day 2026 enfocado en inteligencia aplicada, datos y ciudad.', {
    x: M + 20,
    y: descY - 20,
    size: 13,
    font: helvetica,
    color: COLORS.textSecondary,
  });

  // ── Metadata columns ─────────────────────────────────────────────────────
  const metaY = descY - 62;
  const rightCol = W - M - 240;

  page.drawText('LUGAR', {
    x: M + 20, y: metaY + 14, size: 7, font: helveticaBold, color: COLORS.accentSky,
  });
  page.drawText(site.location, {
    x: M + 20, y: metaY, size: 11, font: helvetica, color: COLORS.textPrimary,
  });

  page.drawText('FECHA DEL EVENTO', {
    x: M + 20, y: metaY - 26, size: 7, font: helveticaBold, color: COLORS.accentSky,
  });
  page.drawText(site.eventDate, {
    x: M + 20, y: metaY - 40, size: 11, font: helvetica, color: COLORS.textPrimary,
  });

  const folio = sanitizeText(
    participant.recognitionFolio || `DDD-2026-${participant.id.slice(0, 8).toUpperCase()}`
  );
  page.drawText('FOLIO', {
    x: rightCol, y: metaY + 14, size: 7, font: helveticaBold, color: COLORS.accentSky,
  });
  page.drawText(folio, {
    x: rightCol, y: metaY, size: 11, font: helveticaBold, color: COLORS.accentData,
  });

  page.drawText('FECHA DE EMISION', {
    x: rightCol, y: metaY - 26, size: 7, font: helveticaBold, color: COLORS.accentSky,
  });
  page.drawText(new Date().toISOString().slice(0, 10), {
    x: rightCol, y: metaY - 40, size: 11, font: helvetica, color: COLORS.textPrimary,
  });

  // ── Footer band ───────────────────────────────────────────────────────────
  const footerH = 44;
  const footerY = M;
  page.drawRectangle({
    x: M, y: footerY, width: W - M * 2, height: footerH,
    color: COLORS.surface2, opacity: 0.85,
  });
  page.drawRectangle({
    x: M, y: footerY + footerH, width: W - M * 2, height: 2,
    color: COLORS.accentBlue, opacity: 0.5,
  });

  page.drawText(site.tagline, {
    x: M + 16,
    y: footerY + 17,
    size: 8.5,
    font: helvetica,
    color: COLORS.textMuted,
    maxWidth: W - M * 2 - 32,
  });

  // ── Watermark-style text ──────────────────────────────────────────────────
  page.drawText('datadriven.day', {
    x: W - 180,
    y: footerY + footerH + 12,
    size: 9,
    font: helveticaBold,
    color: COLORS.accentBlue,
    opacity: 0.25,
  });

  // ── Generate ──────────────────────────────────────────────────────────────
  // useObjectStreams: false disables deflate compression on the PDF structure,
  // cutting CPU time significantly (critical for Cloudflare Workers).
  const filename = `reconocimiento-${makeFileSlug(participant.fullName)}.pdf`;
  const bytes = await pdf.save({ useObjectStreams: false });
  return { bytes, filename };
}
