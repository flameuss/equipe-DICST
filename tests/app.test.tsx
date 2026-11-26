import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '../astryx-themes';
import App from '../src/App';

function renderApp() {
  return render(
    <Theme theme={themes[defaultThemeSlug]}>
      <App />
    </Theme>,
  );
}

describe('CCST / DIIAV Team Page', () => {
  it('renders institutional masthead, 5 anchor tabs, 4 institutional sections, and 40 directory cards', () => {
    renderApp();

    expect(
      screen.getByRole('heading', { level: 1, name: /Equipe — CCST \/ DIIAV \(INPE\)/i }),
    ).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: /Navegação da equipe/i });
    expect(within(nav).getByRole('link', { name: 'Chefia' })).toHaveAttribute('href', '#sec-chefia');
    expect(within(nav).getByRole('link', { name: 'Secretaria' })).toHaveAttribute('href', '#sec-secretaria');
    expect(within(nav).getByRole('link', { name: 'Pós-Graduação' })).toHaveAttribute('href', '#sec-posgrad');
    expect(within(nav).getByRole('link', { name: 'Web e Divulgação' })).toHaveAttribute('href', '#sec-web');
    expect(within(nav).getByRole('link', { name: /Servidores e Bolsistas/i })).toHaveAttribute(
      'href',
      '#sec-diretorio',
    );

    expect(screen.getByText('Laura de Simone Borma')).toBeInTheDocument();
    expect(screen.getByText('Franciele Silveira')).toBeInTheDocument();
    expect(screen.getByText('Luis Campos')).toBeInTheDocument();
    expect(screen.queryByText('DIIAV INPE')).not.toBeInTheDocument();

    const directory = screen.getByTestId('directory-grid');
    expect(within(directory).getAllByRole('button')).toHaveLength(40);
    expect(screen.getByText(/Exibindo 40 de 40 integrantes/i)).toBeInTheDocument();
  });

  it('filters by role category and by accent-insensitive search query, and recovers from empty state', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /Bolsistas\s*11/i }));
    expect(screen.getByText(/Exibindo 11 de 40 integrantes/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('directory-grid')).getAllByRole('button')).toHaveLength(11);

    await user.click(screen.getByRole('button', { name: /Todos\s*40/i }));
    const searchInput = screen.getByRole('searchbox', {
      name: /Pesquisar integrante/i,
    });
    await user.type(searchInput, 'paulo nobre');
    expect(screen.getByText(/Exibindo 1 de 40 integrantes/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('directory-grid')).getByText('Paulo Nobre')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'zzzzz-termo-inexistente');
    expect(
      screen.getByRole('heading', { name: /Nenhum integrante encontrado/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Limpar filtros/i }));
    expect(screen.getByText(/Exibindo 40 de 40 integrantes/i)).toBeInTheDocument();
  });

  it('opens an accessible profile dialog with description, copyable email, and safe external links', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderApp();

    const directory = screen.getByTestId('directory-grid');
    await user.click(within(directory).getByRole('button', { name: /Viviane Regina Algarve/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Viviane Regina Algarve')).toBeInTheDocument();
    expect(within(dialog).getByText(/Bacharel em Física pela UNESP/i)).toBeInTheDocument();

    const lattesLink = within(dialog).getByRole('link', { name: /Currículo Lattes/i });
    expect(lattesLink).toHaveAttribute('href', 'http://lattes.cnpq.br/2936325388376401');
    expect(lattesLink).toHaveAttribute('target', '_blank');
    expect(lattesLink).toHaveAttribute('rel', expect.stringContaining('noopener'));

    await user.click(within(dialog).getByRole('button', { name: /Copiar e-mail/i }));
    expect(writeText).toHaveBeenCalledWith('viviane.algarve@inpe.br');
    expect(within(dialog).getByText(/E-mail copiado/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Fechar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens full profile from an overlapping institutional card and falls back to initials when an image fails', async () => {
    const user = userEvent.setup();
    renderApp();

    const chefiaSection = screen.getByTestId('sec-chefia');
    const jussaraImg = within(chefiaSection).getByAltText('Jussara Rafael Angelo');
    fireEvent.error(jussaraImg);
    expect(within(chefiaSection).queryByAltText('Jussara Rafael Angelo')).not.toBeInTheDocument();
    expect(within(chefiaSection).getByText('JA')).toBeInTheDocument();

    await user.click(
      within(chefiaSection).getByRole('button', { name: /Ver perfil completo de Jussara Rafael Angelo/i }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Geógrafa sanitarista/i)).toBeInTheDocument();
  });
});
