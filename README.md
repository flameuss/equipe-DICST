# Equipe — CCST / DIIAV (INPE)

Portal institucional moderno da equipe da **Divisão de Impactos, Adaptação e Vulnerabilidades (DIIAV / CCST — INPE)**, construído com **[Astryx](https://astryx.atmeta.com/)** (`@astryxdesign/core`), **React 19**, **TypeScript** e **Vite**, com geração automática a partir da planilha oficial e publicação contínua no **GitHub Pages via GitHub Actions**.

## Como funciona

1. **Fonte única de dados:** o script [scripts/build-team-data.mjs](./scripts/build-team-data.mjs) lê a planilha `Criação do Perfil Web CCST 2026-2027 (respostas).xlsx` e a pasta `imagens/` em tempo de build.
2. **Higienização e segurança:**
   - Remove linhas de teste (`DIIAV INPE`).
   - Normaliza nomes em caixa alta preservando preposições em português.
   - Padroniza e valida links acadêmicos (**Currículo Lattes**, **ORCID**, **Google Scholar**, **Scopus** e **LinkedIn**), rejeitando protocolos perigosos (`javascript:`, `data:`, `vbscript:`), fórmulas Excel e identificadores corrompidos.
   - Nunca expõe os links internos do Google Drive (`coluna D`) no JSON ou bundle público (`dist/`).
3. **Associação automática de fotos:**
   - Imagens `.jpg`, `.jpeg`, `.png` ou `.webp` colocadas em `imagens/` são validadas por *magic bytes* e associadas automaticamente pelo nome completo (ou e-mail) do integrante.
   - Arquivos `.zip` e imagens de teste são ignorados.
   - Integrantes ainda sem foto local exibem avatar tipográfico com iniciais — basta adicionar a foto na pasta `imagens/` com o nome da pessoa (ex.: `Maria Silva.jpg`) e fazer push para atualizar o site automaticamente.

## Requisitos locais

- **Node.js ≥ 22.13**

## Comandos

```bash
# Instalar dependências
npm install

# Gerar JSON sanitizado + copiar fotos associadas para public/photos/
npm run build:data

# Rodar servidor de desenvolvimento local
npm run dev

# Executar suíte de testes (parser, segurança, busca e UI)
npm test

# Verificar tipagem TypeScript
npm run typecheck

# Gerar build de produção estático em dist/
npm run build

# Opcional (recomendado em repositórios públicos): limpar coluna D (links Google Drive) antes do commit
npm run sanitize:xlsx
```

> **Privacidade da planilha:** antes de subir uma nova versão da planilha `.xlsx` em repositório público, execute `npm run sanitize:xlsx` e substitua o arquivo principal pela cópia `.sanitized.xlsx` (o workflow de CI bloqueia automaticamente qualquer planilha que contenha links `drive.google.com`).

## Publicação no GitHub Pages (GitHub Actions)

O workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml) já está configurado para:
- Rodar `npm ci`, `npm run build:data`, `npm test`, `npm run typecheck`, `npm audit --omit=dev --audit-level=high`, `npm run build` e verificação anti-vazamento de links do Drive em `dist/`.
- Publicar `./dist` automaticamente no GitHub Pages a cada push na branch `main` (ou execução manual via `workflow_dispatch`).

Para ativar no repositório do GitHub:
1. Acesse **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Faça push na branch `main`.
