# plus-mfe-auth

Microfrontend de autenticação do projeto **Plus**.

Expõe o componente `LoginPage` via **Module Federation** para ser consumido pelo `plus-shell`. Construído com React + Vite.

---

## Tecnologias

- React 18
- Vite 5
- `@originjs/vite-plugin-federation` — Module Federation
- `@vitejs/plugin-react`

---

## Module Federation

Este microfrontend atua como **remote**:

| Propriedade | Valor |
|---|---|
| Nome | `mfe_auth` |
| Entry point | `http://localhost:4001/assets/remoteEntry.js` |
| Expõe | `./LoginPage` → `src/pages/LoginPage.jsx` |
| Shared | `react`, `react-dom` |

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_MS_AUTH_URL` | URL do `plus-ms-auth` (ex: `http://localhost:3001`) |

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento na porta 4001 |
| `npm run build` | Gera o bundle em `dist/` |
| `npm run preview` | Serve o build na porta 4001 |

---

## Desenvolvimento local (sem Docker)

```bash
npm install
npm run dev
```

Acesse: http://localhost:4001

---

## Executando com a stack completa

Este serviço é orquestrado pelo `plus-infra`. Consulte o [README do plus-infra](https://github.com/pucrs-sweii-2026-1-30/plus-infra).
