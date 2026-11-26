import { ArrowUpIcon, ExternalLinkIcon } from './Icons';

interface FooterProps {
  matchedPhotosCount: number;
  totalMembers: number;
}

export function Footer({ matchedPhotosCount, totalMembers }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="page-container footer-inner">
        <div className="footer-brand">
          <p className="footer-title">
            DIIAV / CCST — Instituto Nacional de Pesquisas Espaciais (INPE)
          </p>
          <p className="footer-note tabular-nums">
            Diretório compilado automaticamente da planilha oficial 2026–2027 ({totalMembers}{' '}
            perfis ativos · {matchedPhotosCount} com fotografia local).
          </p>
        </div>

        <div className="footer-actions">
          <a
            href="https://www.ccst.inpe.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <span>Portal CCST/DIIAV</span>
            <ExternalLinkIcon width={14} height={14} />
          </a>
          <a
            href="http://www.inpe.br/institucional/sobre_inpe/organograma/orgUnidade.php?siglaUnidade=COCST"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <span>Organograma</span>
            <ExternalLinkIcon width={14} height={14} />
          </a>
          <a href="#topo" className="footer-top-link">
            <ArrowUpIcon width={14} height={14} />
            <span>Voltar ao topo</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
