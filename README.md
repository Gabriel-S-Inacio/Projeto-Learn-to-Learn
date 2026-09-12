# Learn to Learn English

Implementação React do protótipo público Learn to Learn English, construída a partir da auditoria visual do Manus.

## Stack

- React
- Vite
- React Router
- JavaScript ES6+
- CSS estruturado e CSS custom properties
- SVGs inline locais

## Como executar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Rotas

- `/`
- `/metodo`
- `/como-funciona`
- `/conteudos`
- `/sobre`
- `/agendar`
- `/minhas-aulas`
- `/admin/agenda`
- `/404` e fallback

## Estrutura

O código está dividido em `components` de layout/UI/compartilhados, `pages`, `data`, `services`, `routes`, `styles` e assets locais.

## Status atual

Páginas públicas e estados deslogados implementados. A agenda usa uma camada de serviço local e inicia no estado vazio auditado.

## Reference gaps

- `REFERENCE GAP — AVAILABLE SCHEDULE STATE`: agenda populada não foi validada visualmente.
- `REFERENCE GAP — AUTHENTICATED ADMIN DASHBOARD`: dashboard autenticado não está implementado.
- Estados autenticados de Minhas Aulas não estão implementados.
- `TEMPORARY EXTERNAL FONT DEPENDENCY`: DM Serif Display e Inter são carregadas do Google Fonts.
- Mobile abaixo de 500 px segue as regras responsivas auditadas, mas ainda requer comparação visual dedicada.
- `KNOWN VISUAL INCONSISTENCY — 404`: a página preserva o estilo genérico azul/cinza do protótipo.

## Próximas etapas

Executar uma auditoria de fidelidade visual lado a lado em todos os breakpoints e corrigir medidas, tipografia, espaçamento, crops, alinhamentos, hovers e animações antes de avançar para autenticação ou backend.
