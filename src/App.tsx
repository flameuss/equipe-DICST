import { useEffect, useMemo, useState } from 'react';
import rawTeamData from './data/team.generated.json';
import { resolveInstitutionalSections } from './data/institutional';
import type { RoleFilter, TeamDataset, TeamMember } from './types/team';
import { filterMembers, getRoleCounts } from './utils/search';
import { Masthead } from './components/Masthead';
import { SectionNav, type NavSectionItem } from './components/SectionNav';
import { InstitutionalSections } from './components/InstitutionalSections';
import { DirectorySection } from './components/DirectorySection';
import { ProfileDialog } from './components/ProfileDialog';
import { Footer } from './components/Footer';

const dataset = rawTeamData as TeamDataset;

export default function App() {
  const [query, setQuery] = useState('');
  const [activeRole, setActiveRole] = useState<RoleFilter>('Todos');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeSectionId, setActiveSectionId] = useState('sec-chefia');

  const institutionalSections = useMemo(
    () => resolveInstitutionalSections(dataset.members),
    [],
  );

  const chefiaSections = useMemo(
    () => institutionalSections.filter((s) => s.id === 'sec-chefia'),
    [institutionalSections],
  );

  const supportSections = useMemo(
    () => institutionalSections.filter((s) => s.id !== 'sec-chefia'),
    [institutionalSections],
  );

  const roleCounts = useMemo(() => getRoleCounts(dataset.members), []);

  const filteredMembers = useMemo(
    () => filterMembers(dataset.members, query, activeRole),
    [query, activeRole],
  );

  const navItems: NavSectionItem[] = useMemo(
    () => [
      { id: 'sec-chefia', label: 'Chefia' },
      {
        id: 'sec-diretorio',
        label: 'Servidores e Bolsistas',
        count: dataset.totalMembers,
      },
      ...supportSections.map((sec) => ({
        id: sec.id,
        label: sec.navLabel,
      })),
    ],
    [supportSections],
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = navItems.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0.05 },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [navItems]);

  function handleResetFilters() {
    setQuery('');
    setActiveRole('Todos');
  }

  return (
    <div className="app-shell">
      <Masthead />
      <SectionNav
        items={navItems}
        activeId={activeSectionId}
        onSelect={setActiveSectionId}
      />

      <main id="conteudo-principal" className="page-main">
        <div className="page-container">
          <InstitutionalSections
            sections={chefiaSections}
            onSelectMember={setSelectedMember}
          />
          <DirectorySection
            totalMembers={dataset.totalMembers}
            filteredMembers={filteredMembers}
            roleCounts={roleCounts}
            query={query}
            activeRole={activeRole}
            onQueryChange={setQuery}
            onRoleChange={setActiveRole}
            onResetFilters={handleResetFilters}
            onSelectMember={setSelectedMember}
          />
          <div className="support-sections-wrap">
            <InstitutionalSections
              sections={supportSections}
              onSelectMember={setSelectedMember}
            />
          </div>
        </div>
      </main>

      <Footer
        matchedPhotosCount={dataset.matchedPhotosCount}
        totalMembers={dataset.totalMembers}
      />

      <ProfileDialog
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
