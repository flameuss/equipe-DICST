export interface NavSectionItem {
  id: string;
  label: string;
  count?: number;
}

interface SectionNavProps {
  items: NavSectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function SectionNav({ items, activeId, onSelect }: SectionNavProps) {
  return (
    <div className="section-nav-shell">
      <div className="page-container">
        <nav className="section-nav" aria-label="Navegação da equipe">
          <ul className="section-nav-list">
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`section-nav-pill${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="pill-count">{item.count}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
