import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTeamDataset } from './lib/team-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const xlsxPath = path.join(projectRoot, 'Criação do Perfil Web CCST 2026-2027 (respostas).xlsx');
const imagesDir = path.join(projectRoot, 'imagens');
const outputJsonPath = path.join(projectRoot, 'src', 'data', 'team.generated.json');
const outputPhotosDir = path.join(projectRoot, 'public', 'photos');

const summary = await buildTeamDataset({
  xlsxPath,
  imagesDir,
  outputJsonPath,
  outputPhotosDir,
});

console.log(
  `[build-team-data] ${summary.totalMembers} integrantes gerados (${summary.matchedPhotosCount} com foto local).`,
);
console.log('[build-team-data] Vínculos:', JSON.stringify(summary.roleCounts));
if (summary.warnings.length > 0) {
  console.log(`[build-team-data] Avisos (${summary.warnings.length}):`);
  for (const warning of summary.warnings) {
    console.log(`  - ${warning}`);
  }
}
