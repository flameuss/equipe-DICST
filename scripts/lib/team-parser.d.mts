export interface SanitizedLink {
  kind: 'lattes' | 'orcid' | 'linkedin' | 'scholar';
  label: string;
  url: string;
}

export interface BuildSummary {
  generatedAt: string;
  sourceFile: string;
  totalMembers: number;
  roleCounts: Record<string, number>;
  matchedPhotosCount: number;
  warnings: string[];
}

export function decodeEntities(raw: string): string;
export function normalizeName(raw: string): string;
export function sanitizeAcademicUrl(
  kind: 'lattes' | 'orcid' | 'linkedin' | 'scholar',
  raw: string,
): SanitizedLink | null;
export function isTestRow(row: {
  name: string;
  email: string;
  researchLine: string;
}): boolean;
export function isValidRasterBuffer(buf: Uint8Array, ext: string): boolean;
export function matchPhotoForMember(
  name: string,
  email: string,
  imageFiles: string[],
): string | null;
export function buildTeamDataset(options: {
  xlsxPath: string;
  imagesDir: string;
  outputJsonPath: string;
  outputPhotosDir: string;
}): Promise<BuildSummary>;
