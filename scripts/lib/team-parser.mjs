import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const LOWERCASE_PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'von', 'van', 'del', 'la']);
const IGNORED_PHOTO_PATTERNS = [/gemini_generated_image/i, /diiav[\s_-]+inpe/i];
const DANGEROUS_URL_PATTERN = /(?:javascript|vbscript|data|file)\s*:/i;
const HTML_TAG_PATTERN = /[<>]/;
const SCHOLAR_HOST_REGEX = /^scholar\.google\.(?:com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2})$/;
const STRICT_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const MAX_XML_BYTES = 20 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'tostring', 'valueof']);

function safeFromCodePoint(cp) {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) {
    return '';
  }
  return String.fromCodePoint(cp);
}

export function decodeEntities(raw) {
  if (!raw) return '';
  let text = String(raw);
  for (let i = 0; i < 2; i++) {
    text = text
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)));
  }
  return text;
}

export function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function slugify(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function computeInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !LOWERCASE_PARTICLES.has(w.toLowerCase()));
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function normalizeName(raw) {
  const cleaned = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const lettersOnly = cleaned.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const isAllUpper = lettersOnly.length > 3 && lettersOnly === lettersOnly.toUpperCase();
  if (!isAllUpper) {
    return cleaned;
  }

  return cleaned
    .split(' ')
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}

export function normalizeRole(raw) {
  const cleaned = String(raw || '').trim();
  const key = stripDiacritics(cleaned).toLowerCase();
  if (key.startsWith('serv')) return 'Servidor';
  if (key.startsWith('bols')) return 'Bolsista';
  if (key.startsWith('terc')) return 'Terceirizado';
  if (key.startsWith('estag')) return 'Estagiário';
  if (!cleaned || FORBIDDEN_KEYS.has(key)) return 'Colaborador';
  return cleaned;
}

export function isTestRow(row) {
  const nameKey = stripDiacritics(row.name || '').trim().toLowerCase();
  const emailKey = String(row.email || '').trim().toLowerCase();
  const line = String(row.researchLine || '').trim();

  if (!nameKey || nameKey === 'diiav inpe' || nameKey === 'teste' || nameKey === 'test') {
    return true;
  }
  if (emailKey === 'webccst@gmail.com') {
    return true;
  }
  if (/[a-z]{40,}/i.test(line) && !line.includes(' ')) {
    return true;
  }
  return false;
}

function validateHttpUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sanitizeAcademicUrl(kind, raw) {
  if (!raw) return null;
  const decoded = decodeEntities(String(raw)).trim();
  if (!decoded) return null;
  if (decoded.startsWith('=') || HTML_TAG_PATTERN.test(decoded) || DANGEROUS_URL_PATTERN.test(decoded)) {
    return null;
  }

  if (kind === 'lattes') {
    const idMatch = decoded.match(/(?:lattes\.cnpq\.br\/|id\s*lattes\s*:?\s*)?(\d{16})\b/i);
    if (idMatch) {
      return {
        kind: 'lattes',
        label: 'Currículo Lattes',
        url: `http://lattes.cnpq.br/${idMatch[1]}`,
      };
    }
    const candidate = /^https?:\/\//i.test(decoded) ? decoded : `http://${decoded}`;
    const parsed = validateHttpUrl(candidate);
    if (!parsed) return null;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'cnpq.br' && !host.endsWith('.cnpq.br')) {
      return null;
    }
    return { kind: 'lattes', label: 'Currículo Lattes', url: parsed.toString() };
  }

  if (kind === 'orcid') {
    if (/^\d+(?:\.\d+)?e[+-]?\d+$/i.test(decoded)) {
      return null;
    }
    const orcidMatch = decoded.match(/(\d{4})[-.\s](\d{4})[-.\s](\d{4})[-.\s](\d{3}[\dXx])/);
    if (!orcidMatch) {
      return null;
    }
    const normalizedId = `${orcidMatch[1]}-${orcidMatch[2]}-${orcidMatch[3]}-${orcidMatch[4].toUpperCase()}`;
    return {
      kind: 'orcid',
      label: 'ORCID',
      url: `https://orcid.org/${normalizedId}`,
    };
  }

  if (kind === 'linkedin') {
    let cleaned = decoded.replace(/^h+ttps:\/\//i, 'https://').replace(/^h+ttp:\/\//i, 'http://');
    if (/^(?:www\.)?linkedin\.com\//i.test(cleaned)) {
      cleaned = `https://${cleaned}`;
    } else if (!/^https?:\/\//i.test(cleaned)) {
      if (/\s/.test(cleaned) || cleaned.includes('/') || cleaned.includes(':')) {
        return null;
      }
      cleaned = `https://www.linkedin.com/in/${encodeURIComponent(cleaned)}`;
    }
    const parsed = validateHttpUrl(cleaned);
    if (!parsed) return null;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return null;
    }
    parsed.protocol = 'https:';
    return { kind: 'linkedin', label: 'LinkedIn', url: parsed.toString() };
  }

  if (kind === 'scholar') {
    let cleaned = decoded.replace(/^h+ttps:\/\//i, 'https://').replace(/^h+ttp:\/\//i, 'http://');
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = `https://${cleaned}`;
    }
    const parsed = validateHttpUrl(cleaned);
    if (!parsed) return null;
    const host = parsed.hostname.toLowerCase();
    const isScopus = host === 'scopus.com' || host.endsWith('.scopus.com');
    const isScholar = SCHOLAR_HOST_REGEX.test(host);
    const isResearchGate = host === 'researchgate.net' || host.endsWith('.researchgate.net');
    if (!isScopus && !isScholar && !isResearchGate) {
      return null;
    }
    parsed.protocol = 'https:';
    const label = isScopus ? 'Scopus' : isResearchGate ? 'ResearchGate' : 'Google Scholar';
    return { kind: 'scholar', label, url: parsed.toString() };
  }

  return null;
}

export function isValidRasterBuffer(buf, ext) {
  if (!buf || buf.length < 3) return false;
  const lowerExt = String(ext || '').toLowerCase();
  if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (lowerExt === '.png') {
    if (buf.length < 8) return false;
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (lowerExt === '.webp') {
    if (buf.length < 12) return false;
    return (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    );
  }
  return false;
}

function tokenizeNormalized(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !LOWERCASE_PARTICLES.has(t));
}

function extractDateRecencyScore(filename) {
  const yyyymmdd = filename.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
  if (yyyymmdd) return Number(`${yyyymmdd[1]}${yyyymmdd[2]}${yyyymmdd[3]}`);
  const mmyyyy = filename.match(/\b(\d{2})(20\d{2})\b/);
  if (mmyyyy) return Number(`${mmyyyy[2]}${mmyyyy[1]}01`);
  const yyyy = filename.match(/\b(20\d{2})\b/);
  if (yyyy) return Number(`${yyyy[1]}0101`);
  return 0;
}

export function matchPhotoForMember(name, email, imageFiles) {
  const nameTokens = tokenizeNormalized(name);
  const emailLocal = String(email || '').split('@')[0] || '';
  const emailTokens = tokenizeNormalized(emailLocal);
  const allMemberTokens = Array.from(new Set([...nameTokens, ...emailTokens]));
  if (allMemberTokens.length === 0) return null;

  const firstName = nameTokens[0];
  const lastName = nameTokens[nameTokens.length - 1];

  const candidates = [];

  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;
    if (IGNORED_PHOTO_PATTERNS.some((rx) => rx.test(file))) continue;

    const baseNoExt = file.slice(0, file.length - ext.length);
    const fileTokenSet = new Set(tokenizeNormalized(baseNoExt));

    const matchedNameTokens = nameTokens.filter((t) => fileTokenSet.has(t));
    const matchedAllTokens = allMemberTokens.filter((t) => fileTokenSet.has(t));
    const hasFirstAndLast = firstName && lastName && firstName !== lastName
      ? fileTokenSet.has(firstName) && fileTokenSet.has(lastName)
      : matchedNameTokens.length >= 1;

    if (matchedAllTokens.length >= 2 && (hasFirstAndLast || matchedNameTokens.length >= 2)) {
      const score =
        matchedNameTokens.length * 100 +
        (hasFirstAndLast ? 50 : 0) +
        matchedAllTokens.length * 10;
      candidates.push({
        file,
        score,
        recency: extractDateRecencyScore(baseNoExt),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.recency !== a.recency) return b.recency - a.recency;
    return b.file.length - a.file.length;
  });

  return candidates[0].file;
}

function parseSharedStrings(xml) {
  const strings = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let siMatch;
  while ((siMatch = siRegex.exec(xml)) !== null) {
    const content = siMatch[1];
    let combined = '';
    let tMatch;
    while ((tMatch = tRegex.exec(content)) !== null) {
      combined += decodeEntities(tMatch[1]);
    }
    strings.push(combined);
  }
  return strings;
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const rowObj = Object.create(null);
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] || '';
      const refMatch = attrs.match(/\br="([A-Z]+)\d+"/);
      if (!refMatch) continue;
      const col = refMatch[1];
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : '';

      let value = '';
      if (cellType === 's') {
        const vMatch = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) {
          const idx = Number.parseInt(vMatch[1].trim(), 10);
          value = Number.isFinite(idx) ? (sharedStrings[idx] ?? '') : '';
        }
      } else if (cellType === 'inlineStr') {
        const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tMatch;
        while ((tMatch = tRegex.exec(body)) !== null) {
          value += decodeEntities(tMatch[1]);
        }
      } else {
        const vMatch = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) {
          value = decodeEntities(vMatch[1]);
        }
      }
      rowObj[col] = value;
    }
    rows.push(rowObj);
  }

  return rows;
}

async function readZipEntryBounded(entry, label) {
  const bytes = await entry.async('uint8array');
  if (bytes.byteLength > MAX_XML_BYTES) {
    throw new Error(`Entrada XML excede o limite de segurança (${MAX_XML_BYTES} bytes): ${label}`);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function parseXlsxBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsFile = zip.file('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsFile
    ? parseSharedStrings(await readZipEntryBounded(sharedStringsFile, 'sharedStrings.xml'))
    : [];

  const sheetFile = zip.file('xl/worksheets/sheet1.xml');
  if (!sheetFile) {
    throw new Error('Planilha inválida: xl/worksheets/sheet1.xml não encontrado.');
  }

  const rawRows = parseWorksheetRows(
    await readZipEntryBounded(sheetFile, 'sheet1.xml'),
    sharedStrings,
  );
  if (rawRows.length <= 1) return [];

  return rawRows.slice(1).map((r) => ({
    timestamp: String(r.A || '').trim(),
    name: String(r.B || '').trim(),
    role: String(r.C || '').trim(),
    // Column D (Google Drive link) intentionally never persisted into output JSON
    description: String(r.E || '').trim(),
    researchLine: String(r.F || '').trim(),
    email: String(r.G || '').trim(),
    lattes: String(r.H || '').trim(),
    linkedin: String(r.I || '').trim(),
    orcid: String(r.J || '').trim(),
    scholar: String(r.K || '').trim(),
  }));
}

function sanitizeEmail(raw) {
  const cleaned = String(raw || '').trim().toLowerCase();
  if (!cleaned || !STRICT_EMAIL_REGEX.test(cleaned)) {
    return '';
  }
  return cleaned;
}

export async function buildTeamDataset({
  xlsxPath,
  imagesDir,
  outputJsonPath,
  outputPhotosDir,
}) {
  const xlsxBuffer = await fs.readFile(xlsxPath);
  const rawRows = await parseXlsxBuffer(xlsxBuffer);

  let imageFiles = [];
  try {
    const entries = await fs.readdir(imagesDir, { withFileTypes: true });
    // Strictly ignore symlinks and subdirectories to prevent path escape
    imageFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    imageFiles = [];
  }

  await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.rm(outputPhotosDir, { recursive: true, force: true });
  await fs.mkdir(outputPhotosDir, { recursive: true });

  const warnings = [];
  const members = [];
  const usedSlugs = new Set();

  for (const row of rawRows) {
    if (isTestRow(row)) {
      warnings.push(`Linha de teste ignorada: ${row.name || '(vazia)'}`);
      continue;
    }

    const name = normalizeName(row.name);
    const role = normalizeRole(row.role);
    const email = sanitizeEmail(row.email);
    const description = row.description.replace(/\s+/g, ' ').trim();
    const researchLine = row.researchLine.replace(/\s+/g, ' ').trim();

    let id = slugify(name) || `membro-${members.length + 1}`;
    let suffix = 2;
    while (usedSlugs.has(id)) {
      id = `${slugify(name)}-${suffix++}`;
    }
    usedSlugs.add(id);

    const links = [];
    const linkInputs = [
      ['lattes', row.lattes],
      ['orcid', row.orcid],
      ['scholar', row.scholar],
      ['linkedin', row.linkedin],
    ];

    for (const [kind, rawVal] of linkInputs) {
      if (!rawVal) continue;
      const sanitized = sanitizeAcademicUrl(kind, rawVal);
      if (sanitized) {
        links.push(sanitized);
      } else {
        warnings.push(`Link ${kind} inválido ignorado para ${name}: ${rawVal}`);
      }
    }

    let photo = null;
    const matchedFile = matchPhotoForMember(name, email, imageFiles);
    if (matchedFile) {
      const srcPath = path.join(imagesDir, matchedFile);
      const ext = path.extname(matchedFile).toLowerCase();
      const fileBuf = await fs.readFile(srcPath);
      if (isValidRasterBuffer(fileBuf, ext)) {
        const safeFileName = `${id}${ext}`;
        await fs.writeFile(path.join(outputPhotosDir, safeFileName), fileBuf);
        photo = `./photos/${safeFileName}`;
      } else {
        warnings.push(`Arquivo de imagem rejeitado por magic bytes inválidos: ${matchedFile}`);
      }
    }

    members.push({
      id,
      name,
      initials: computeInitials(name),
      role,
      email,
      description,
      researchLine,
      photo,
      links,
    });
  }

  members.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  const roleCountsMap = Object.create(null);
  for (const m of members) {
    roleCountsMap[m.role] = (roleCountsMap[m.role] || 0) + 1;
  }
  const roleCounts = { ...roleCountsMap };

  const matchedPhotosCount = members.filter((m) => m.photo !== null).length;

  const dataset = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(xlsxPath),
    totalMembers: members.length,
    roleCounts,
    matchedPhotosCount,
    members,
  };

  await fs.writeFile(outputJsonPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

  return {
    generatedAt: dataset.generatedAt,
    sourceFile: dataset.sourceFile,
    totalMembers: dataset.totalMembers,
    roleCounts: dataset.roleCounts,
    matchedPhotosCount: dataset.matchedPhotosCount,
    warnings,
  };
}
