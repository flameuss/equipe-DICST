import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import type { AcademicLink, TeamMember } from '../types/team';
import { getSafeMailto, isSafeExternalUrl } from '../utils/security';
import { MemberAvatar } from './Avatar';
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  GoogleScholarIcon,
  LattesIcon,
  LinkedInIcon,
  MailIcon,
  OrcidIcon,
  ScopusIcon,
} from './Icons';

interface ProfileDialogProps {
  member: TeamMember | null;
  onClose: () => void;
}

function getAcademicIcon(link: AcademicLink): ReactNode {
  if (link.kind === 'lattes') return <LattesIcon width={16} height={16} />;
  if (link.kind === 'orcid') return <OrcidIcon width={16} height={16} />;
  if (link.kind === 'linkedin') return <LinkedInIcon width={16} height={16} />;
  if (link.label === 'Scopus') return <ScopusIcon width={16} height={16} />;
  return <GoogleScholarIcon width={16} height={16} />;
}

export function ProfileDialog({ member, onClose }: ProfileDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [member?.id]);

  if (!member) {
    return null;
  }

  const mailto = getSafeMailto(member.email);
  const safeLinks = member.links.filter((link) => isSafeExternalUrl(link.url));

  async function handleCopyEmail() {
    if (!member?.email) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(member.email);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog
      isOpen={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={620}
      maxHeight="85dvh"
      purpose="info"
      padding={0}
    >
      <div className="profile-dialog-inner">
        <div className="profile-dialog-header-wrap">
          <DialogHeader
            startContent={
              <MemberAvatar
                name={member.name}
                initials={member.initials}
                photo={member.photo}
                role={member.role}
                size="md"
              />
            }
            title={member.name}
            subtitle={member.role}
            hasDivider={false}
            onOpenChange={(open) => {
              if (!open) onClose();
            }}
          />
        </div>

        <div className="profile-dialog-content">
          {member.email && (
            <div className="profile-contact-bar">
              {mailto ? (
                <a href={mailto} className="profile-email-link">
                  <MailIcon width={16} height={16} />
                  <span>{member.email}</span>
                </a>
              ) : (
                <span className="profile-email-link">
                  <MailIcon width={16} height={16} />
                  <span>{member.email}</span>
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                label={copied ? 'E-mail copiado' : 'Copiar e-mail'}
                icon={copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
                onClick={handleCopyEmail}
              />
              <span className="sr-only" role="status" aria-live="polite">
                {copied ? 'Endereço transferido para a área de transferência.' : ''}
              </span>
            </div>
          )}

          {member.description && (
            <div className="profile-block">
              <h3 className="profile-block-title">Sobre</h3>
              <p className="profile-block-text">{member.description}</p>
            </div>
          )}

          {member.researchLine && (
            <div className="profile-block">
              <h3 className="profile-block-title">Linha de atuação / Pesquisa</h3>
              <p className="profile-block-text">{member.researchLine}</p>
            </div>
          )}

          <div className="profile-links-section">
            <h3 className="profile-block-title">Perfis acadêmicos e profissionais</h3>
            {safeLinks.length > 0 ? (
              <div className="profile-links-grid">
                {safeLinks.map((link, index) => (
                  <Button
                    key={`${link.kind}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant={index === 0 ? 'primary' : 'secondary'}
                    size="sm"
                    label={link.label}
                    icon={getAcademicIcon(link)}
                    endContent={<ExternalLinkIcon width={13} height={13} />}
                  />
                ))}
              </div>
            ) : (
              <p className="profile-empty-note">
                Nenhum perfil acadêmico externo informado na planilha 2026–2027.
              </p>
            )}
          </div>
        </div>

        <div className="profile-dialog-footer">
          <Button variant="secondary" label="Fechar" onClick={onClose} />
        </div>
      </div>
    </Dialog>
  );
}
