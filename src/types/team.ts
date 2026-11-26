export type MemberRole = 'Servidor' | 'Bolsista' | 'Terceirizado' | 'Estagiário' | string;

export type RoleFilter = 'Todos' | 'Servidor' | 'Bolsista' | 'Terceirizado' | 'Estagiário';

export interface AcademicLink {
  kind: 'lattes' | 'orcid' | 'linkedin' | 'scholar';
  label: string;
  url: string;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: MemberRole;
  email: string;
  description: string;
  researchLine: string;
  photo: string | null;
  links: AcademicLink[];
}

export interface TeamDataset {
  generatedAt: string;
  sourceFile: string;
  totalMembers: number;
  roleCounts: Record<string, number>;
  matchedPhotosCount: number;
  members: TeamMember[];
}

export interface InstitutionalPersonConfig {
  id: string;
  name: string;
  roleTitle?: string;
  email: string;
  phone?: string;
  fallbackLattesUrl?: string;
}

export interface InstitutionalSectionConfig {
  id: string;
  navLabel: string;
  title: string;
  subtitle: string;
  contactEmails?: { label: string; email: string }[];
  contactPhone?: string;
  featured?: boolean;
  people: InstitutionalPersonConfig[];
}

export interface ResolvedInstitutionalPerson {
  id: string;
  name: string;
  initials: string;
  roleTitle?: string;
  email: string;
  phone?: string;
  lattesUrl: string | null;
  photo: string | null;
  linkedMember: TeamMember | null;
}

export interface ResolvedInstitutionalSection {
  id: string;
  navLabel: string;
  title: string;
  subtitle: string;
  contactEmails?: { label: string; email: string }[];
  contactPhone?: string;
  featured?: boolean;
  people: ResolvedInstitutionalPerson[];
}
