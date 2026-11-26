import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const inputPath = path.join(projectRoot, 'Criação do Perfil Web CCST 2026-2027 (respostas).xlsx');
const outputPath = path.join(
  projectRoot,
  'Criação do Perfil Web CCST 2026-2027 (respostas).sanitized.xlsx',
);

const raw = await fs.readFile(inputPath);
const zip = await JSZip.loadAsync(raw);

// 1. Clear column D data cells (rows >= 2) and column D hyperlinks in sheet1.xml
const sheetFile = zip.file('xl/worksheets/sheet1.xml');
if (!sheetFile) {
  throw new Error('xl/worksheets/sheet1.xml não encontrado na planilha.');
}
let sheetXml = await sheetFile.async('string');
const removedRelIds = new Set();

sheetXml = sheetXml.replace(
  /<hyperlink\b([^>]*\bref="D(?:[2-9]|[1-9]\d+)"[^>]*)\/>/g,
  (_, attrs) => {
    const idMatch = attrs.match(/\br:id="([^"]+)"/);
    if (idMatch) removedRelIds.add(idMatch[1]);
    return '';
  },
);
sheetXml = sheetXml.replace(
  /<c\b([^>]*\br="D(?:[2-9]|[1-9]\d+)"[^>]*)>[\s\S]*?<\/c>/g,
  '',
);
zip.file('xl/worksheets/sheet1.xml', sheetXml);

// 2. Remove matching / Drive external hyperlink relationships from sheet1.xml.rels
const relsFile = zip.file('xl/worksheets/_rels/sheet1.xml.rels');
if (relsFile) {
  let relsXml = await relsFile.async('string');
  relsXml = relsXml.replace(/<Relationship\b[^>]*\/>/g, (tag) => {
    const idMatch = tag.match(/\bId="([^"]+)"/);
    if ((idMatch && removedRelIds.has(idMatch[1])) || /drive\.google\.com/i.test(tag)) {
      return '';
    }
    return tag;
  });
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', relsXml);
}

// 3. Scrub drive.google.com strings in xl/sharedStrings.xml while preserving indices
const sstFile = zip.file('xl/sharedStrings.xml');
if (sstFile) {
  let sstXml = await sstFile.async('string');
  sstXml = sstXml.replace(/<si\b[^>]*>[\s\S]*?<\/si>/g, (entry) =>
    /drive\.google\.com/i.test(entry) ? '<si><t></t></si>' : entry,
  );
  zip.file('xl/sharedStrings.xml', sstXml);
}

// 4. Verify zero drive.google.com references remain anywhere in the sanitized archive
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const content = await entry.async('string');
  if (/drive\.google\.com/i.test(content)) {
    throw new Error(`Falha na sanitização: referência drive.google.com permanece em ${name}`);
  }
}

const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await fs.writeFile(outputPath, outBuf);

console.log(
  `[sanitize-xlsx] Cópia sanitizada (0 links Google Drive) salva em: ${path.basename(outputPath)}`,
);
