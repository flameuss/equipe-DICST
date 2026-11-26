import type { RoleFilter, TeamMember } from '../types/team';

export const ROLE_FILTER_ORDER: RoleFilter[] = [
  'Todos',
  'Servidor',
  'Bolsista',
  'Terceirizado',
  'Estagiário',
];

export const ROLE_PLURAL_LABELS: Record<RoleFilter, string> = {
  Todos: 'Todos',
  Servidor: 'Servidores',
  Bolsista: 'Bolsistas',
  Terceirizado: 'Terceirizados',
  Estagiário: 'Estagiários',
};

export function normalizeSearchText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterMembers(
  members: TeamMember[],
  query: string,
  role: RoleFilter,
): TeamMember[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  return members.filter((member) => {
    if (role !== 'Todos' && member.role !== role) {
      return false;
    }
    if (tokens.length === 0) {
      return true;
    }
    const haystack = normalizeSearchText(
      `${member.name} ${member.role} ${member.email} ${member.description} ${member.researchLine}`,
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

export function getRoleCounts(members: TeamMember[]): Record<RoleFilter, number> {
  const counts: Record<RoleFilter, number> = {
    Todos: members.length,
    Servidor: 0,
    Bolsista: 0,
    Terceirizado: 0,
    Estagiário: 0,
  };

  for (const member of members) {
    if (Object.hasOwn(counts, member.role) && member.role !== 'Todos') {
      counts[member.role as Exclude<RoleFilter, 'Todos'>] += 1;
    }
  }

  return counts;
}
