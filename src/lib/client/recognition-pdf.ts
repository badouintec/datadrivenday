/**
 * Client-side recognition PDF generator.
 * Bundled by Vite — no CDN dependency.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const SITE = {
  name: 'Data Driven Day',
  title: 'Data Driven Day 2026',
  location: 'Hermosillo, Sonora',
  eventDate: '28 de marzo de 2026',
  tagline:
    'Una agenda local para convertir datos, ciudad e inteligencia aplicada en decisiones publicas y colaboraciones reales.',
};

const LOGO_B64 =
  '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' +
  'jmLiBYp7mx17rlij8v5HrVtpDlXPpuq5r76fT7uuXq/Dm1293uq3sOL76Rn8tOeKNVL7n92v+tlW' +
  '6Pmk6+zvr95/h7uQWre9eIHi3kbPHjPotGY3s2Y0Ih1m8JuuK9dKzaTSXayw39nfr3L2FWZd/S4k' +
  'jIiu9fff4Y6n1m0vXqCwt9G1zww6rdnNrBm9TZcZ/KbvyrVSM+my5qq1Z3670tlX+H7Hu29P47qu' +
  '7ltp/xXX6XoPy4kXKOxtOvVNz7rr/hNrdjNrRm/TaQ5P+65cq8M8Ksxl9rqzv1/l7Ct8v+Pdt6dx' +
  'XVf3rbT/iuuk19xGvEBhb9Opb3rWXfefWLObWTN6m05zeNp31Tpd5pGezdtU3VfVecz8dof9J3Tb' +
  'U7e+VfZefcar19tKvEBhb9Opb3rWo2f/NGZe83xmdug2s93u5dt0Wnf2mrO/3+3sZ367w/4Tuu2p' +
  'W9/Z+/lpVvaqvNaW4gUKe5tOfTvOd2ROmflO5zLru1Xnutu9fJtO685e77Sk59317lfdU7e+ic5V' +
  'UvlerFxrS/EChb1Np77V+83OrjPf+VxmfbfqnHe7l2+TWrvieqclPe/Od99+6neunJV7qbzWluIF' +
  'CnsTfXtll5nvdjY7zf5tdruXb9Nl7RVrnZbu9/9tVr3RnfdTrXOXrN5bpTW2Fy9Q2Juc3rdbdpj5' +
  'aecy67tV519xneRd7LL2inVOS4WZd7l/9lO7c7es3mOlNbYXL1DYm5zat2s6z/zUc5n13arnUHGd' +
  '5J10Fv3f929TYead77795Dt3zeq9Vlpje/EChb3JaX27p+PMTzib7rNPdV61TvJedlh/xRrd3/hv' +
  '0v3+v82qN7rzfpKdOyex55nfT7+dUuIFCnuTk/rukG4zdy7zvlv1TCquk7yf6Q4Vvr/TW3+SKnPv' +
  'fPdP30+qc/ck9t39vbcRL1DYm5zSd5d0mrlzqT37Cp1XrZO8o+kOFb6/23v/aarMvfPdP30/ic47' +
  'JDHv7u+9jXiBwt7khL47JTHzN+s6l3nf3eGNrloneU+rd5j13d3f/E/S/f6/zao3uvN+VnfeJamZ' +
  'z/hu+t2UEy9Q2Jvs3jeRSvsfNYdKd+C3SZ3LrO/u8EZXrZO8qxV6VDmD09L9/r/Nqje6835Wdl6d' +
  'qu9jxrozvnmseIHC3mT3vjPTYf+j5lDpDszqO2u9Wd+t+D6fdl61Tpd57H4/3ybxHqrerer9VnXc' +
  'fT+rOs/O6v2nZr7ym8eKFyjsbTr1XTmXt+un91/1jsxIule1806eT4WZd51Hosfo73U/7y5vrXq/' +
  'VR1338+qzjPS+X2MXnf0944WL1DY23Tqu3Iuv123yv6r3pGRqdKry+yr3ZVV63SZx+p5jf5ep1lW' +
  'UH0Wb5Oe7w77WdF5ZKrsvdLaI7/Fl38QfudtOvVdNZOn61Xbf9U7MiqdzuVtOr3Pp31XrdNlHqvn' +
  'Nfp7nWZZQfVZvE16vjvsaUXfUam0/+TcZ36LL/8g/M7bdOq7aiZP1qq4/6p3ZES6ncvbdHqfT/uu' +
  'WqfLPFZ3GfWd3c68w92q3m9Vx933NLvviFTce3L9Wd/h3+IFCnubTn13mEmi19uk9z2yx+pzeZtO' +
  '7/Np31XrdJnHypmN+k6Vd9ZR9Vm8TXq+O+xpdt/Z3+/8PkasP+Ib/CFeoLC32a3rijUq77/SutU6' +
  'zOrXed8juz7tu2qdne7tqC4jvlHpnXVUfRZvk57vDnua3Xf29zu/jxHrj/gGf4gXKGxEunStskbl' +
  '/Vdat1qHWf26731Uz6ddV62z070d1eftn0/330H1ObxNer4z9rRyXyu6zv5+9/fxdv23f56/iBco' +
  '7m126rlijcr7r7RutQ6pbrO/X2UOT7uuWqfy3VjdKT33t1l17tXvVvV+qzqu3tPKfa3oOvPbO7yP' +
  'VNLvpLR4geLepkPHn/ZcsUa3c0qtW61DqtuIdHifT3uuWqfy3Vjd6c2fr9K/w9lX+P6Od/+UfY1K' +
  '1zlU6ZZK+o2UFi9Q3Ijs0nHFGpX3X3UmFTqkuo1Ih/f5tOeqdSrfjfR5PUmV7h3OvsL3TzmnxNvp' +
  '0PGu58xvp/dfqcvTpN9HefECxY1I9X4/7bhijW5nlFq3WofkuaxaJ/k+n3ZctY57OyZVunc4+wrf' +
  'P+WcEm+ner+f9Jz57fT+q/V5kvT7KC9eoIERqdrrSb8Va6RmkFq/wgy6v5tV6yTf59OOq9Zxb9+n' +
  'WvfK515pjR3vfnpfs/c3Mh3Pd0Qqdkp13068QAOjUrXXT7utWKPb2aTWrdYheS4r10q8zd/0W7XO' +
  'bvd21tl9l4r9q852l/v/NivWTr+fajN/0m/2951LvveW4gUaGJmKnX7aa9U63c4luXaF9dPnsnq9' +
  '1W/zN91WrbPTvV1xhn9L1e4V57rL/X+blesm306Vef+m2+zvdz+TmWezoveW4gWaGJkqPZ52WrVO' +
  'Yg7pLp3Xr3AuiTVXvs+nvVatk5xV5W7pPVTrt7rLqnW63P2V641O+t79tteKNbqdx+ozmtl7S/EC' +
  'TcxIev2nXVautXoOFTr9dA3nct77XNln9G/nrJlV75fcQ6WOiR6r1uly97ut93b9Fe93xfoV3t3I' +
  'TlXPin+LF2hkVlav96TDzD4VZv+bLslzuuo689tdzmV1j9VZNYsuv6fV+6X3kO7ade3d7v6oVHo7' +
  'yTd716H7/R/dJd13VuctxQs0snOSM6gw7073wrnkeyWyahZdfk+r99u9/z/3sGqdXe7/2yTuQcX7' +
  'l0xi/xXmXfVNJDpvJ16gmV1j/33uRIUOq1L9LFZm1Ry6/JZ26Lhz/1VZve8O55I6/9Pu3nc5dQZV' +
  '38TqvluKF2hm19h/nztRpceKdDiPVVk1gy6/pR06Jrvv8h5W77nDmaTO/rS7911O3X/VN7G675bi' +
  'BRraMfbf505U6LAq1c9iZVbNoMvvaIeOye47vIfEnjucSersT7t/3+XU/Vd+Fyu7bileoKndYv99' +
  '7kOVHivS4Tx+mre9Vu2/y29ol57J7pXfw11S++1wHqlzP+Xu/SQn77/qu1jVc1vxAo1VyttOnff+' +
  'r6zef3ImFTr8NG87dTiPn2REp1V77/L72aVnqnfl93CX5F47nEW3u1stq+9JpVR+I6Oz6rd1G/EC' +
  'zVXIiD5d9/6vjOjT6S5U6XGX1L2sNotRfVbtu8tvZ5eeqd5V38Nd0vvscA6J807veVRS96RCOryR' +
  'UVnxjrcTL7CBZEZ16bj3f2VUl053oUqP75K+l1VmMbLLqj13+d1c1XP0HVrZu+Kb+C4V9tdh/omz' +
  'rrDvt0nfk2TSe+94X48TL7CJREb26Lb3r8FdOt2FKj2uMrpLhzP5W5JzWLVO8kxW9Rx5f1Z2rvgm' +
  'rlJpbx1m3/3uJlLlniRSZe9d7+sx4gU2sjKjO3Ta/4wOne5ClR5Pus34ZqUz+WnfWd+tOO/Z57Gq' +
  '58j7s7pzpXfxt1TcU4eZV1+v2r2rdk9WpesbeZsVb3hL8QIbmplZa++w9wr7XzGPKj2edJr57Uqz' +
  'qDKHVeskz2FVz5H3ZnXnKu/iz1TeS4dZr1yz+izedJ/5bXvv9T748g/CmUZm9po77L3S/qvMY2aP' +
  'J11WrNHhTFasUXXend7rjPuS6FzhbfwzHfpX7/em46p10neu2z0ZmRXrVr8LK+/tVuIFDvI06b72' +
  'np1Jev1Ur6rnccoc4J9+m3Rvfnem6W4/6Vi59+q9p7umz333eSwVLwAAABztbdL9W4sXAAAAjvY2' +
  '6f6txQsAAADHept0//biBQAAgGO9Tbp/e/ECAADAkUYkvYf24gUAAIAjvU26/xbiBQAAgOOMSHoP' +
  'W4gXAAAAjjMi6T1sIV4AAAA4yoik97CNeAEAAOAYo5LexzbiBQAAgO2NTHovW4kXAAAA2kokveet' +
  'xAsAAABtrU56v9uJFwAAANpanfR+txMvAAAAtLUy6b1uKV4AAABoa2XSe91SvAAAANDWqqT3ua14' +
  'AQAAoK0VSe9xa/ECAABAW7OT3t/24gUAAIC2Zia9tyPECwAAAG3NSnpfx4gXAAAA2hqd9H6OEy8A' +
  'AAC0NSrpfRzr/wF0ghWrBdFW2gAAAABJRU5ErkJggg==';

function sanitizeText(value: string) {
  // NFD normalization strips combining diacritics so Helvetica (WinAnsi) can encode all chars
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
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
    if (next.length <= limit) { current = next; continue; }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function generateRecognitionPdf(participant: {
  fullName: string;
  recognitionFolio?: string | null;
  id: string;
}) {
  const COLORS = {
    bg:            rgb(0.051, 0.067, 0.090),
    surface:       rgb(0.086, 0.106, 0.133),
    surface2:      rgb(0.110, 0.137, 0.200),
    border:        rgb(0.129, 0.149, 0.176),
    accentBlue:    rgb(0.231, 0.510, 0.965),
    accentSky:     rgb(0.376, 0.647, 0.980),
    accentData:    rgb(0.576, 0.773, 0.992),
    accentGo:      rgb(0.204, 0.827, 0.600),
    textPrimary:   rgb(0.902, 0.929, 0.953),
    textSecondary: rgb(0.788, 0.820, 0.851),
    textMuted:     rgb(0.490, 0.522, 0.565),
    white:         rgb(1, 1, 1),
  };

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reconocimiento ${participant.fullName} - ${SITE.title}`);
  pdf.setAuthor(SITE.name);
  pdf.setCreator(SITE.name);
  pdf.setSubject('Reconocimiento de participacion — Dataller de IA');
  pdf.setKeywords(['Data Driven Day', 'Dataller', 'Reconocimiento', 'Hermosillo', '2026']);

  const page = pdf.addPage([842, 595]);
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 40;

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.bg });
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.surface, opacity: 0.3 });

  // Decorative border
  page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: COLORS.border, borderWidth: 0.75 });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: COLORS.accentBlue, borderWidth: 1.5, opacity: 0.6 });

  // Corner accents
  const cornerOffset = 30;
  for (const c of [
    { x: cornerOffset, y: cornerOffset },
    { x: W - cornerOffset, y: cornerOffset },
    { x: cornerOffset, y: H - cornerOffset },
    { x: W - cornerOffset, y: H - cornerOffset },
  ]) {
    page.drawCircle({ x: c.x, y: c.y, size: 6, color: COLORS.accentBlue, opacity: 0.5 });
    page.drawCircle({ x: c.x, y: c.y, size: 4, color: COLORS.accentSky, opacity: 0.8 });
  }

  // Embed real logo PNG (900×320 RGBA, white on transparent)
  const logoPngBytes = Uint8Array.from(atob(LOGO_B64), c => c.charCodeAt(0));
  const logoImg = await pdf.embedPng(logoPngBytes);
  const logoImgW = 170;
  const logoImgH = Math.round(logoImgW / (900 / 320)); // ~60

  // Header band
  const headerY = H - 120;
  const headerH = 76;
  page.drawRectangle({ x: M, y: headerY, width: W - M * 2, height: headerH, color: COLORS.surface2, opacity: 0.85 });
  page.drawRectangle({ x: M, y: headerY - 2, width: W - M * 2, height: 2, color: COLORS.accentBlue, opacity: 0.7 });

  // Real PNG logo
  const logoX = M + 16;
  const logoY = headerY + (headerH - logoImgH) / 2;
  page.drawImage(logoImg, { x: logoX, y: logoY, width: logoImgW, height: logoImgH });

  const logoW = logoImgW;
  page.drawText('RECONOCIMIENTO DE PARTICIPACION', {
    x: M + logoW + 30, y: headerY + headerH - 28,
    size: 10, font: helveticaBold, color: COLORS.accentSky,
  });
  page.drawText('Dataller de IA  -  Hermosillo 2026', {
    x: M + logoW + 30, y: headerY + headerH - 46,
    size: 9, font: helvetica, color: COLORS.textMuted,
  });

  // Decorative circles
  page.drawCircle({ x: W - 90, y: H - 82, size: 28, color: COLORS.accentBlue, opacity: 0.12 });
  page.drawCircle({ x: W - 115, y: H - 82, size: 28, color: COLORS.accentSky, opacity: 0.15 });
  page.drawCircle({ x: W - 102, y: H - 65, size: 14, color: COLORS.accentGo, opacity: 0.10 });

  // Body
  const bodyStartY = headerY - 40;
  page.drawText('Se reconoce a', {
    x: M + 20, y: bodyStartY, size: 16, font: helvetica, color: COLORS.textSecondary,
  });

  // Participant name (sanitized — removes accents for standard font compatibility)
  const nameLines = fitHeadline(sanitizeText(participant.fullName));
  const nameStartY = bodyStartY - 50;
  for (let i = 0; i < nameLines.length; i++) {
    page.drawText(nameLines[i], {
      x: M + 20, y: nameStartY - i * 44,
      size: 36, font: helveticaBold, color: COLORS.white,
    });
  }

  const nameEndY = nameStartY - (nameLines.length - 1) * 44 - 14;
  page.drawRectangle({ x: M + 20, y: nameEndY, width: 120, height: 3, color: COLORS.accentBlue, opacity: 0.8 });

  const descY = nameEndY - 30;
  page.drawText('por haber concluido y validado su participacion en el Dataller de IA,', {
    x: M + 20, y: descY, size: 13, font: helvetica, color: COLORS.textSecondary,
  });
  page.drawText('evento de Data Driven Day 2026 enfocado en inteligencia aplicada, datos y ciudad.', {
    x: M + 20, y: descY - 20, size: 13, font: helvetica, color: COLORS.textSecondary,
  });

  // Metadata
  const metaY = descY - 62;
  const rightCol = W - M - 240;

  page.drawText('LUGAR', { x: M + 20, y: metaY + 14, size: 7, font: helveticaBold, color: COLORS.accentSky });
  page.drawText(SITE.location, { x: M + 20, y: metaY, size: 11, font: helvetica, color: COLORS.textPrimary });

  page.drawText('FECHA DEL EVENTO', { x: M + 20, y: metaY - 26, size: 7, font: helveticaBold, color: COLORS.accentSky });
  page.drawText(SITE.eventDate, { x: M + 20, y: metaY - 40, size: 11, font: helvetica, color: COLORS.textPrimary });

  const folio = sanitizeText(participant.recognitionFolio || `DDD-2026-${participant.id.slice(0, 8).toUpperCase()}`);
  page.drawText('FOLIO', { x: rightCol, y: metaY + 14, size: 7, font: helveticaBold, color: COLORS.accentSky });
  page.drawText(folio, { x: rightCol, y: metaY, size: 11, font: helveticaBold, color: COLORS.accentData });

  page.drawText('FECHA DE EMISION', { x: rightCol, y: metaY - 26, size: 7, font: helveticaBold, color: COLORS.accentSky });
  page.drawText(new Date().toISOString().slice(0, 10), { x: rightCol, y: metaY - 40, size: 11, font: helvetica, color: COLORS.textPrimary });

  // Footer
  const footerH = 44;
  const footerY = M;
  page.drawRectangle({ x: M, y: footerY, width: W - M * 2, height: footerH, color: COLORS.surface2, opacity: 0.85 });
  page.drawRectangle({ x: M, y: footerY + footerH, width: W - M * 2, height: 2, color: COLORS.accentBlue, opacity: 0.5 });
  page.drawText(SITE.tagline, {
    x: M + 16, y: footerY + 17, size: 8.5, font: helvetica, color: COLORS.textMuted,
    maxWidth: W - M * 2 - 32,
  });

  page.drawText('datadriven.day', {
    x: W - 180, y: footerY + footerH + 12,
    size: 9, font: helveticaBold, color: COLORS.accentBlue, opacity: 0.25,
  });

  // Save & download
  const pdfBytes = await pdf.save();
  const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reconocimiento-${makeFileSlug(participant.fullName)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
