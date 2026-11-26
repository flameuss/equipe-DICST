import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import {
  normalizeName,
  sanitizeAcademicUrl,
  isTestRow,
  isValidRasterBuffer,
  matchPhotoForMember,
  buildTeamDataset,
} from '../scripts/lib/team-parser.mjs';

describe('team-parser: normalizeName', () => {
  it('converts ALL-CAPS Brazilian names to proper title case preserving prepositions', () => {
    expect(normalizeName('ALINE ANDERSON DE CASTRO')).toBe('Aline Anderson de Castro');
  });

  it('preserves already properly cased names including nobiliary particles and initials', () => {
    expect(normalizeName('Liana O. Anderson')).toBe('Liana O. Anderson');
    expect(normalizeName('Celso von Randow')).toBe('Celso von Randow');
    expect(normalizeName('  Dirceu   Luís Herdies  ')).toBe('Dirceu Luís Herdies');
  });
});

describe('team-parser: sanitizeAcademicUrl', () => {
  it('normalizes Lattes URLs, prefixed text, and bare 16-digit IDs', () => {
    expect(sanitizeAcademicUrl('lattes', 'ID Lattes: 2784565221562809')).toEqual({
      kind: 'lattes',
      label: 'Currículo Lattes',
      url: 'http://lattes.cnpq.br/2784565221562809',
    });
    expect(sanitizeAcademicUrl('lattes', 'CV: http://lattes.cnpq.br/8678564148136140')).toEqual({
      kind: 'lattes',
      label: 'Currículo Lattes',
      url: 'http://lattes.cnpq.br/8678564148136140',
    });
    expect(sanitizeAcademicUrl('lattes', 'lattes.cnpq.br/4717570864086836')).toEqual({
      kind: 'lattes',
      label: 'Currículo Lattes',
      url: 'http://lattes.cnpq.br/4717570864086836',
    });
  });

  it('normalizes ORCID IDs, dotted formats, and my-orcid links while rejecting scientific notation', () => {
    expect(sanitizeAcademicUrl('orcid', '0000-0001-5541-6677')).toEqual({
      kind: 'orcid',
      label: 'ORCID',
      url: 'https://orcid.org/0000-0001-5541-6677',
    });
    expect(sanitizeAcademicUrl('orcid', '0000.0002.7446-3994')).toEqual({
      kind: 'orcid',
      label: 'ORCID',
      url: 'https://orcid.org/0000-0002-7446-3994',
    });
    expect(
      sanitizeAcademicUrl('orcid', 'https://orcid.org/my-orcid?orcid=0000-0002-2872-8453'),
    ).toEqual({
      kind: 'orcid',
      label: 'ORCID',
      url: 'https://orcid.org/0000-0002-2872-8453',
    });
    expect(sanitizeAcademicUrl('orcid', 'orcid.org/0000-0002-7818-2081')).toEqual({
      kind: 'orcid',
      label: 'ORCID',
      url: 'https://orcid.org/0000-0002-7818-2081',
    });
    expect(sanitizeAcademicUrl('orcid', '2.19859005E8')).toBeNull();
  });

  it('normalizes LinkedIn typos, missing protocols, and bare slugs', () => {
    expect(
      sanitizeAcademicUrl('linkedin', 'hhttps://www.linkedin.com/in/dra-cassia-lemos/'),
    ).toEqual({
      kind: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/dra-cassia-lemos/',
    });
    expect(sanitizeAcademicUrl('linkedin', 'www.linkedin.com/in/andrerogon')).toEqual({
      kind: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/andrerogon',
    });
    expect(sanitizeAcademicUrl('linkedin', 'linkedin.com/in/gilney-bezerra-8726192a6')).toEqual({
      kind: 'linkedin',
      label: 'LinkedIn',
      url: 'https://linkedin.com/in/gilney-bezerra-8726192a6',
    });
    const bareSlug = sanitizeAcademicUrl('linkedin', 'glícia-garcia-833015125');
    expect(bareSlug).not.toBeNull();
    expect(bareSlug?.url).toBe('https://www.linkedin.com/in/gl%C3%ADcia-garcia-833015125');
  });

  it('decodes HTML entities in Google Scholar URLs and labels Scopus links accurately', () => {
    expect(
      sanitizeAcademicUrl(
        'scholar',
        'https://scholar.google.com/citations?hl=en&amp;user=Q0v4V4UAAAAJ',
      ),
    ).toEqual({
      kind: 'scholar',
      label: 'Google Scholar',
      url: 'https://scholar.google.com/citations?hl=en&user=Q0v4V4UAAAAJ',
    });
    expect(
      sanitizeAcademicUrl('scholar', 'https://www.scopus.com/authid/detail.uri?authorId=6506068752'),
    ).toEqual({
      kind: 'scholar',
      label: 'Scopus',
      url: 'https://www.scopus.com/authid/detail.uri?authorId=6506068752',
    });
  });

  it('strictly rejects XSS protocols, HTML payloads, and Excel formula injections', () => {
    const payloads = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '=HYPERLINK("https://evil.example","Click")',
      '<script>alert(1)</script>',
    ];
    for (const payload of payloads) {
      expect(sanitizeAcademicUrl('lattes', payload)).toBeNull();
      expect(sanitizeAcademicUrl('linkedin', payload)).toBeNull();
      expect(sanitizeAcademicUrl('orcid', payload)).toBeNull();
      expect(sanitizeAcademicUrl('scholar', payload)).toBeNull();
    }
  });

  it('blocks lookalike domain bypasses on lattes and scholar and upgrades ResearchGate to HTTPS', () => {
    expect(sanitizeAcademicUrl('lattes', 'https://evilcnpq.br/123')).toBeNull();
    expect(sanitizeAcademicUrl('lattes', 'https://phish-cnpq.br/profile')).toBeNull();
    expect(sanitizeAcademicUrl('scholar', 'https://scholar.google.attacker.com/citations')).toBeNull();
    expect(sanitizeAcademicUrl('scholar', 'http://www.researchgate.net/profile/Test')).toEqual({
      kind: 'scholar',
      label: 'ResearchGate',
      url: 'https://www.researchgate.net/profile/Test',
    });
  });

  it('does not crash on out-of-range numeric XML entities', async () => {
    const { decodeEntities } = await import('../scripts/lib/team-parser.mjs');
    expect(() => decodeEntities('&#99999999; &#x110000; ok')).not.toThrow();
    expect(decodeEntities('&#99999999; ok')).toContain('ok');
  });
});

describe('team-parser: isTestRow & isValidRasterBuffer', () => {
  it('identifies the DIIAV INPE test row and preserves real rows', () => {
    expect(
      isTestRow({
        name: 'DIIAV INPE',
        email: 'webccst@gmail.com',
        researchLine: 'fgdthbrthdsutenbrhgdhsdhgenrhjytmubnkj',
      }),
    ).toBe(true);
    expect(
      isTestRow({
        name: 'Viviane Regina Algarve',
        email: 'viviane.algarve@inpe.br',
        researchLine: 'Mudanças e cenários climáticos',
      }),
    ).toBe(false);
  });

  it('validates real raster magic bytes and rejects disguised SVG/ZIP files', () => {
    expect(isValidRasterBuffer(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), '.jpg')).toBe(true);
    expect(
      isValidRasterBuffer(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        '.png',
      ),
    ).toBe(true);
    expect(
      isValidRasterBuffer(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
        '.webp',
      ),
    ).toBe(true);
    expect(isValidRasterBuffer(new TextEncoder().encode('<svg><script>alert(1)</script></svg>'), '.png')).toBe(false);
    expect(isValidRasterBuffer(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), '.jpg')).toBe(false);
  });
});

describe('team-parser: matchPhotoForMember', () => {
  const sampleFiles = [
    '1000567179 (1) - Jussara Angelo.jpg',
    'Evandro Albiach Branco - Evandro Albiach Branco.png',
    'Foto 3x4 Paulo Nobre 20250716 - Paulo Nobre.png',
    'Gemini_Generated_Image_ - DIIAV INPE.png',
    'Gemini_Generated_Image_.png',
    'drive-download-20261125T231753Z-1-001.zip',
    'foto - perfil 092026 - CCST-viviane.algarve CCST-viviane.algarve.jpeg',
    'foto perfil - CCST-viviane.algarve CCST-viviane.algarve.jpg',
    'foto_marcelo - Marcelo Santini.jpeg',
  ];

  it('matches all 5 real members, prefers newer 092026 photo for Viviane, and ignores non-member/zip files', () => {
    expect(matchPhotoForMember('Viviane Regina Algarve', 'viviane.algarve@inpe.br', sampleFiles)).toBe(
      'foto - perfil 092026 - CCST-viviane.algarve CCST-viviane.algarve.jpeg',
    );
    expect(matchPhotoForMember('Jussara Rafael Angelo', 'jussara.angelo@inpe.br', sampleFiles)).toBe(
      '1000567179 (1) - Jussara Angelo.jpg',
    );
    expect(matchPhotoForMember('Evandro Albiach Branco', 'evandro.albiach@inpe.br', sampleFiles)).toBe(
      'Evandro Albiach Branco - Evandro Albiach Branco.png',
    );
    expect(matchPhotoForMember('Paulo Nobre', 'paulo.nobre@inpe.br', sampleFiles)).toBe(
      'Foto 3x4 Paulo Nobre 20250716 - Paulo Nobre.png',
    );
    expect(matchPhotoForMember('Marcelo Freitas Santini', 'marcelo.santini@inpe.br', sampleFiles)).toBe(
      'foto_marcelo - Marcelo Santini.jpeg',
    );
    expect(matchPhotoForMember('Jean Pierre Ometto', 'jean.ometto@inpe.br', sampleFiles)).toBeNull();
  });
});

describe('team-parser: real workspace spreadsheet integration', () => {
  it('compiles all 40 valid members with 5 matched photos and zero leaked Drive links', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccst-team-test-'));
    const outputJsonPath = path.join(tmpDir, 'team.generated.json');
    const outputPhotosDir = path.join(tmpDir, 'photos');

    try {
      const summary = await buildTeamDataset({
        xlsxPath: path.resolve('Criação do Perfil Web CCST 2026-2027 (respostas).xlsx'),
        imagesDir: path.resolve('imagens'),
        outputJsonPath,
        outputPhotosDir,
      });

      expect(summary.totalMembers).toBe(40);
      expect(summary.roleCounts).toEqual({
        Servidor: 26,
        Bolsista: 11,
        Terceirizado: 2,
        Estagiário: 1,
      });
      expect(summary.matchedPhotosCount).toBe(5);

      const rawJson = await fs.readFile(outputJsonPath, 'utf8');
      expect(rawJson).not.toContain('drive.google.com');
      expect(rawJson).not.toContain('DIIAV INPE');

      const parsed = JSON.parse(rawJson);
      expect(parsed.members).toHaveLength(40);
      for (const member of parsed.members) {
        for (const link of member.links) {
          expect(link.url).toMatch(/^https?:\/\//);
        }
      }
      const aline = parsed.members.find((m: { email: string }) => m.email === 'aline.castro@inpe.br');
      expect(aline?.name).toBe('Aline Anderson de Castro');

      const copiedPhotos = await fs.readdir(outputPhotosDir);
      expect(copiedPhotos).toHaveLength(5);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
