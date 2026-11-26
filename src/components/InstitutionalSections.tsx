import { Button } from '@astryxdesign/core/Button';
import type { ResolvedInstitutionalSection, TeamMember } from '../types/team';
import { getSafeMailto, isSafeExternalUrl } from '../utils/security';
import { MemberAvatar } from './Avatar';
import { ArrowRightIcon, ExternalLinkIcon, MailIcon, PhoneIcon } from './Icons';

interface InstitutionalSectionsProps {
  sections: ResolvedInstitutionalSection[];
  onSelectMember: (member: TeamMember) => void;
}

export function InstitutionalSections({
  sections,
  onSelectMember,
}: InstitutionalSectionsProps) {
  return (
    <div className="institutional-stack">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          data-testid={section.id}
          className="page-section"
          aria-labelledby={`${section.id}-heading`}
        >
          <div className="section-header">
            <h2 id={`${section.id}-heading`} className="section-title">
              {section.title}
            </h2>
            <p className="section-subtitle">
              <span>{section.subtitle}</span>
              {section.contactEmails?.map((contact) => {
                const mailto = getSafeMailto(contact.email);
                if (!mailto) return null;
                return (
                  <span key={contact.email} className="section-contact-item">
                    {' · '}
                    {contact.label}:{' '}
                    <a href={mailto} className="inline-link">
                      {contact.email}
                    </a>
                  </span>
                );
              })}
              {section.contactPhone && (
                <span className="section-contact-item tabular-nums">
                  {' · '}Telefone: {section.contactPhone}
                </span>
              )}
            </p>
          </div>

          <div className="institutional-grid">
            {section.people.map((person) => {
              const mailto = getSafeMailto(person.email);
              const safeLattes =
                person.lattesUrl && isSafeExternalUrl(person.lattesUrl)
                  ? person.lattesUrl
                  : null;

              return (
                <article
                  key={person.id}
                  className={`inst-card${section.featured ? ' is-featured' : ''}`}
                >
                  <div className="inst-card-main">
                    <MemberAvatar
                      name={person.name}
                      initials={person.initials}
                      photo={person.photo}
                      role={person.linkedMember?.role ?? 'Servidor'}
                      size={section.featured ? 'lg' : 'md'}
                    />
                    <div className="inst-card-body">
                      <h3 className="inst-person-name">{person.name}</h3>
                      {person.roleTitle && (
                        <div className="inst-role-badge">
                          <span className="role-chip role-chip-lideranca">
                            {person.roleTitle}
                          </span>
                        </div>
                      )}
                      <div className="inst-meta-list">
                        {mailto && (
                          <a href={mailto} className="inst-meta-link">
                            <MailIcon width={14} height={14} />
                            <span>{person.email}</span>
                          </a>
                        )}
                        {person.phone && (
                          <span className="inst-meta-text tabular-nums">
                            <PhoneIcon width={14} height={14} />
                            <span>{person.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="inst-card-actions">
                    {safeLattes ? (
                      <a
                        href={safeLattes}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-action-link"
                      >
                        <span>Currículo Lattes</span>
                        <ExternalLinkIcon width={14} height={14} />
                      </a>
                    ) : (
                      <span className="card-action-muted">Atendimento institucional</span>
                    )}
                    {person.linkedMember && (
                      <Button
                        variant="ghost"
                        size="sm"
                        label={`Ver perfil completo de ${person.name}`}
                        onClick={() => onSelectMember(person.linkedMember!)}
                        endContent={<ArrowRightIcon width={14} height={14} />}
                      >
                        Ver perfil completo
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}

            {section.id === 'sec-posgrad' && (
              <aside className="inst-card inst-info-card" aria-label="Informações da Secretaria PGCST">
                <div className="inst-info-body">
                  <h3 className="inst-person-name">Secretaria e Linhas do Programa</h3>
                  <p className="inst-info-desc">
                    Mestrado e Doutorado em Ciência do Sistema Terrestre nas linhas de
                    Diagnósticos e Cenários, Modelagem do Sistema Terrestre e Observação
                    do Sistema Terrestre.
                  </p>
                  <div className="inst-meta-list">
                    <a href="mailto:pgcst@inpe.br" className="inst-meta-link">
                      <MailIcon width={14} height={14} />
                      <span>pgcst@inpe.br</span>
                    </a>
                    <span className="inst-meta-text tabular-nums">
                      <PhoneIcon width={14} height={14} />
                      <span>12 3208-7064</span>
                    </span>
                  </div>
                </div>
                <div className="inst-card-actions">
                  <a
                    href="https://www.gov.br/inpe/pt-br/area-conhecimento/posgraduacao/cst"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-action-link"
                  >
                    <span>Página oficial da PGCST</span>
                    <ExternalLinkIcon width={14} height={14} />
                  </a>
                </div>
              </aside>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
