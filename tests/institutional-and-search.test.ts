import { describe, it, expect } from 'vitest';
import { isSafeExternalUrl, getSafeMailto, isSafeLocalPhotoPath } from '../src/utils/security';
import { normalizeSearchText, filterMembers, getRoleCounts } from '../src/utils/search';
import { resolveInstitutionalSections } from '../src/data/institutional';
import teamData from '../src/data/team.generated.json';
import type { TeamDataset } from '../src/types/team';

const dataset = teamData as TeamDataset;

describe('security utils', () => {
  it('allows only http and https external URLs', () => {
    expect(isSafeExternalUrl('https://orcid.org/0000-0003-2019-4546')).toBe(true);
    expect(isSafeExternalUrl('http://lattes.cnpq.br/2936325388376401')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('//evil.example')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
  });

  it('builds safe mailto URIs and rejects header/query injection characters', () => {
    expect(getSafeMailto('viviane.algarve@inpe.br')).toBe('mailto:viviane.algarve@inpe.br');
    expect(getSafeMailto('bad email@inpe.br')).toBeNull();
    expect(getSafeMailto('evil@inpe.br\r\nBcc:x@y.z')).toBeNull();
    expect(getSafeMailto('victim@inpe.br?cc=attacker@evil.com&subject=Phish')).toBeNull();
    expect(getSafeMailto('not-an-email')).toBeNull();
  });

  it('validates local photo paths strictly', () => {
    expect(isSafeLocalPhotoPath('./photos/jussara-rafael-angelo.jpg')).toBe(true);
    expect(isSafeLocalPhotoPath('./photos/paulo-nobre.png')).toBe(true);
    expect(isSafeLocalPhotoPath('https://evil.example/a.png')).toBe(false);
    expect(isSafeLocalPhotoPath('./photos/../../secret.png')).toBe(false);
    expect(isSafeLocalPhotoPath('./photos/test.svg')).toBe(false);
    expect(isSafeLocalPhotoPath(null)).toBe(false);
  });
});

describe('search and filter utils', () => {
  it('normalizes PT-BR accents and case', () => {
    expect(normalizeSearchText('Adaptação Climática — Amazônia')).toBe('adaptacao climatica — amazonia');
  });

  it('filters members by accent-insensitive name, email, and research line', () => {
    const marcios = filterMembers(dataset.members, 'marcio', 'Todos');
    expect(marcios.map((m) => m.name)).toEqual(
      expect.arrayContaining(['Marcio Malacarne', 'Márcio de Morisson Valeriano']),
    );

    const angelica = filterMembers(dataset.members, 'angelica', 'Todos');
    expect(angelica.map((m) => m.name)).toContain('Angélica Giarolla');

    const energia = filterMembers(dataset.members, 'energia', 'Servidor');
    expect(energia.map((m) => m.name)).toEqual(
      expect.arrayContaining(['Andre Rodrigues Goncalves', 'Rodrigo Santos Costa']),
    );
  });

  it('computes accurate counts across all roles and ignores prototype property names', () => {
    expect(getRoleCounts(dataset.members)).toEqual({
      Todos: 40,
      Servidor: 26,
      Bolsista: 11,
      Terceirizado: 2,
      Estagiário: 1,
    });
    const malicious = [
      { ...dataset.members[0], role: 'toString' },
      { ...dataset.members[1], role: 'constructor' },
      { ...dataset.members[2], role: '__proto__' },
    ];
    expect(getRoleCounts(malicious)).toEqual({
      Todos: 3,
      Servidor: 0,
      Bolsista: 0,
      Terceirizado: 0,
      Estagiário: 0,
    });
  });
});

describe('institutional section binding', () => {
  it('binds overlapping members by email to authoritative 2026-2027 spreadsheet data', () => {
    const sections = resolveInstitutionalSections(dataset.members);
    expect(sections.map((s) => s.id)).toEqual([
      'sec-chefia',
      'sec-secretaria',
      'sec-posgrad',
      'sec-web',
    ]);

    const chefia = sections.find((s) => s.id === 'sec-chefia')!;
    const laura = chefia.people.find((p) => p.email === 'laura.borma@inpe.br')!;
    const jussara = chefia.people.find((p) => p.email === 'jussara.angelo@inpe.br')!;
    expect(laura.lattesUrl).toBe('http://lattes.cnpq.br/1192267190424956');
    expect(laura.linkedMember).toBeNull();
    expect(jussara.linkedMember).not.toBeNull();
    expect(jussara.photo).toMatch(/^\.\/photos\//);

    const posgrad = sections.find((s) => s.id === 'sec-posgrad')!;
    const andre = posgrad.people.find((p) => p.email === 'andre.goncalves@inpe.br')!;
    expect(andre.lattesUrl).toBe('http://lattes.cnpq.br/0304036440634904');
    expect(andre.linkedMember?.email).toBe('andre.goncalves@inpe.br');

    const web = sections.find((s) => s.id === 'sec-web')!;
    const viviane = web.people.find((p) => p.email === 'viviane.algarve@inpe.br')!;
    expect(viviane.lattesUrl).toBe('http://lattes.cnpq.br/2936325388376401');
    expect(viviane.photo).toMatch(/^\.\/photos\//);
    expect(viviane.linkedMember?.email).toBe('viviane.algarve@inpe.br');
  });
});
