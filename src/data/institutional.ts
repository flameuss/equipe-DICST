import type {
  InstitutionalSectionConfig,
  ResolvedInstitutionalSection,
  TeamMember,
} from '../types/team';
import { isSafeExternalUrl } from '../utils/security';

const LOWERCASE_PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'von', 'van']);

function computeInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !LOWERCASE_PARTICLES.has(w.toLowerCase()));
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export const INSTITUTIONAL_SECTIONS: InstitutionalSectionConfig[] = [
  {
    id: 'sec-chefia',
    navLabel: 'Chefia',
    title: 'Chefia da Divisão de Impactos, Adaptação e Vulnerabilidades (DIIAV)',
    subtitle: 'CGCT — Coordenação Geral de Ciências da Terra',
    contactEmails: [{ label: 'Contato geral', email: 'chefia.diiav@inpe.br' }],
    featured: true,
    people: [
      {
        id: 'laura-de-simone-borma',
        name: 'Laura de Simone Borma',
        roleTitle: 'Chefe da Divisão',
        email: 'laura.borma@inpe.br',
        phone: '7927 / 12 3208-7790',
        fallbackLattesUrl: 'http://lattes.cnpq.br/1192267190424956',
      },
      {
        id: 'jussara-rafael-angelo',
        name: 'Jussara Rafael Angelo',
        roleTitle: 'Chefe-Substituto',
        email: 'jussara.angelo@inpe.br',
        phone: '12 3208-7798',
        fallbackLattesUrl: 'http://lattes.cnpq.br/0590217220934956',
      },
    ],
  },
  {
    id: 'sec-secretaria',
    navLabel: 'Secretaria',
    title: 'Secretaria',
    subtitle: 'Atendimento administrativo e suporte institucional da DIIAV',
    contactEmails: [{ label: 'Contato institucional', email: 'secretaria-diiav@inpe.br' }],
    people: [
      {
        id: 'franciele-silveira',
        name: 'Franciele Silveira',
        email: 'franciele.silveira@inpe.br',
        phone: '12 3208-7792',
      },
      {
        id: 'ana-beatriz-moya-e-silva',
        name: 'Ana Beatriz Moya e Silva',
        email: 'ana.moya@inpe.br',
        phone: '12 3186-9459',
      },
    ],
  },
  {
    id: 'sec-posgrad',
    navLabel: 'Pós-Graduação',
    title: 'Pós-Graduação em Ciência do Sistema Terrestre (PGCST)',
    subtitle: 'Coordenação e secretaria do programa de mestrado e doutorado',
    contactEmails: [{ label: 'Secretaria PGCST', email: 'pgcst@inpe.br' }],
    contactPhone: '12 3208-7064',
    featured: true,
    people: [
      {
        id: 'andre-rodrigues-goncalves',
        name: 'Andre Rodrigues Goncalves',
        roleTitle: 'Coordenação da Pós-Graduação',
        email: 'andre.goncalves@inpe.br',
        phone: '12 3208-7908',
        fallbackLattesUrl: 'http://lattes.cnpq.br/0304036440634904',
      },
    ],
  },
  {
    id: 'sec-web',
    navLabel: 'Web e Divulgação',
    title: 'Grupo de Web e Divulgação',
    subtitle: 'Comunicação científica, portais institucionais e suporte web',
    contactEmails: [
      { label: 'Apoio web', email: 'web-diiav@inpe.br' },
      { label: 'Dúvidas gerais', email: 'cienciasdaterra@inpe.br' },
    ],
    people: [
      {
        id: 'viviane-regina-algarve',
        name: 'Viviane Regina Algarve',
        email: 'viviane.algarve@inpe.br',
        phone: '12 3186-9497',
        fallbackLattesUrl: 'http://lattes.cnpq.br/2936325388376401',
      },
      {
        id: 'luis-campos',
        name: 'Luis Campos',
        email: 'luis.campos@inpe.br',
      },
    ],
  },
];

export function resolveInstitutionalSections(
  members: TeamMember[],
): ResolvedInstitutionalSection[] {
  const byEmail = new Map<string, TeamMember>();
  for (const member of members) {
    if (member.email) {
      byEmail.set(member.email.trim().toLowerCase(), member);
    }
  }

  return INSTITUTIONAL_SECTIONS.map((section) => ({
    ...section,
    people: section.people.map((person) => {
      const linkedMember = byEmail.get(person.email.trim().toLowerCase()) ?? null;
      const spreadsheetLattes =
        linkedMember?.links.find((l) => l.kind === 'lattes')?.url ?? null;
      const candidateLattes = spreadsheetLattes ?? person.fallbackLattesUrl ?? null;
      const lattesUrl =
        candidateLattes && isSafeExternalUrl(candidateLattes) ? candidateLattes : null;

      return {
        id: person.id,
        name: person.name,
        initials: linkedMember?.initials ?? computeInitials(person.name),
        roleTitle: person.roleTitle,
        email: person.email,
        phone: person.phone,
        lattesUrl,
        photo: linkedMember?.photo ?? null,
        linkedMember,
      };
    }),
  }));
}
