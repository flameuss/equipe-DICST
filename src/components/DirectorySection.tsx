import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { RoleFilter, TeamMember } from '../types/team';
import { ROLE_FILTER_ORDER, ROLE_PLURAL_LABELS } from '../utils/search';
import { MemberAvatar } from './Avatar';
import { ArrowRightIcon, SearchIcon } from './Icons';

interface DirectorySectionProps {
  totalMembers: number;
  filteredMembers: TeamMember[];
  roleCounts: Record<RoleFilter, number>;
  query: string;
  activeRole: RoleFilter;
  onQueryChange: (value: string) => void;
  onRoleChange: (role: RoleFilter) => void;
  onResetFilters: () => void;
  onSelectMember: (member: TeamMember) => void;
}

function getRoleChipClass(role: string): string {
  switch (role) {
    case 'Servidor':
      return 'role-chip role-chip-servidor';
    case 'Bolsista':
      return 'role-chip role-chip-bolsista';
    case 'Terceirizado':
      return 'role-chip role-chip-terceirizado';
    default:
      return 'role-chip role-chip-estagiario';
  }
}

export function DirectorySection({
  totalMembers,
  filteredMembers,
  roleCounts,
  query,
  activeRole,
  onQueryChange,
  onRoleChange,
  onResetFilters,
  onSelectMember,
}: DirectorySectionProps) {
  const hasActiveFilter = query.trim().length > 0 || activeRole !== 'Todos';

  return (
    <section
      id="sec-diretorio"
      className="page-section directory-section"
      aria-labelledby="sec-diretorio-heading"
    >
      <div className="section-header">
        <h2 id="sec-diretorio-heading" className="section-title">
          Servidores, Bolsistas e Colaboradores
        </h2>
        <p className="section-subtitle">
          Perfis compilados da planilha oficial 2026–2027 do CCST/DIIAV. Consulte também o{' '}
          <a
            href="http://www.inpe.br/institucional/sobre_inpe/organograma/orgUnidade.php?siglaUnidade=COCST"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
          >
            Organograma
          </a>{' '}
          e os{' '}
          <a
            href="http://www.inpe.br/institucional/quem_quem/colaboradores/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
          >
            Colaboradores INPE
          </a>
          .
        </p>
      </div>

      <div className="directory-controls">
        <div className="search-field-wrap">
          <TextInput
            type="search"
            label="Pesquisar integrante"
            isLabelHidden
            value={query}
            onChange={(value) => onQueryChange(value)}
            placeholder="Pesquisar por nome, vínculo, linha de pesquisa ou e-mail..."
            startIcon={<SearchIcon width={16} height={16} />}
            hasClear
            size="md"
            width="100%"
          />
        </div>

        <div
          className="role-filter-row"
          role="group"
          aria-label="Filtrar por vínculo"
        >
          {ROLE_FILTER_ORDER.map((roleKey) => {
            const count = roleCounts[roleKey] ?? 0;
            const isSelected = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                type="button"
                className={`role-filter-pill${isSelected ? ' is-selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onRoleChange(roleKey)}
              >
                <span>{ROLE_PLURAL_LABELS[roleKey]}</span>
                <span className="role-filter-count tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="directory-status-bar">
          <p className="directory-count tabular-nums" aria-live="polite">
            {`Exibindo ${filteredMembers.length} de ${totalMembers} integrantes`}
          </p>
          <div className="directory-status-right">
            {hasActiveFilter && filteredMembers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                label="Limpar filtros"
                onClick={onResetFilters}
              />
            )}
            <span className="directory-hint">
              Clique no cartão para abrir o perfil detalhado
            </span>
          </div>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="directory-empty">
          <EmptyState
            title="Nenhum integrante encontrado"
            description="Tente ajustar os termos da sua pesquisa ou selecionar outra categoria de vínculo."
            icon={<SearchIcon width={28} height={28} />}
            actions={
              <Button
                variant="primary"
                label="Limpar filtros"
                onClick={onResetFilters}
              />
            }
          />
        </div>
      ) : (
        <div className="directory-grid" data-testid="directory-grid">
          {filteredMembers.map((member) => {
            const summaryText = member.researchLine || member.description || 'Integrante CCST / DIIAV';
            const linkLabels = member.links.map((l) =>
              l.label === 'Currículo Lattes' ? 'Lattes' : l.label,
            );

            return (
              <button
                key={member.id}
                type="button"
                className="member-card"
                onClick={() => onSelectMember(member)}
                aria-label={`${member.name} — ${member.role}. Abrir perfil detalhado`}
              >
                <div className="member-card-header">
                  <MemberAvatar
                    name={member.name}
                    initials={member.initials}
                    photo={member.photo}
                    role={member.role}
                    size="md"
                  />
                  <div className="member-card-identity">
                    <h3 className="member-card-name">{member.name}</h3>
                    <div className="member-card-badge">
                      <span className={getRoleChipClass(member.role)}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="member-card-line">{summaryText}</p>

                <div className="member-card-footer">
                  <span className="member-card-links-summary">
                    {linkLabels.length > 0
                      ? linkLabels.join(' · ')
                      : member.email || 'Contato institucional'}
                  </span>
                  <span className="member-card-cta" aria-hidden="true">
                    <span>Perfil</span>
                    <ArrowRightIcon width={14} height={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
