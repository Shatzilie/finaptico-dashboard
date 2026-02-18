# Finaptico Dashboard

Panel de control para clientes de servicios de fiscalidad, finanzas y contabilidad.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Edge Functions + Auth)
- **Deploy:** Vercel (clientes.finaptico.com)

## Estructura del proyecto

```
src/                    # Código fuente del frontend (React)
public/                 # Archivos estáticos
supabase/
  config.toml           # Configuración del proyecto Supabase
  functions/            # Edge Functions (código fuente)
```

## Edge Functions

| Función | Descripción |
|---|---|
| `dashboard` | Proxy principal del dashboard. Sirve widgets por cliente. |
| `treasury-feed` | Saldos de tesorería por cliente e instancia. |
| `treasury-timeseries` | Serie temporal de tesorería para gráficos. |
| `tax-events-feed` | Calendario fiscal por cliente. |
| `control-tasks` | Kanban de gestiones (CRUD + historial). |
| `client-tax-payments-list` | Pagos de impuestos liquidados del año en curso. |
| `client-actions-feed` | (Stub) Será reemplazada por control-tasks. |
| `admin-tax-filings-list` | Admin: listado de declaraciones fiscales. |
| `admin-tax-filing-upsert` | Admin: crear/editar declaraciones fiscales. |
| `admin-tax-filing-delete` | Admin: eliminar declaraciones en borrador. |
| `admin-tax-liquidity-upsert` | Admin: upsert de liquidez fiscal. |

## Notas

- Las Edge Functions se despliegan vía Supabase MCP. El código en `supabase/functions/` es referencia versionada, no se despliega automáticamente desde GitHub.
- La base de datos usa el schema `erp_core` con RLS y acceso multi-tenant.
- Las migraciones se gestionan desde Supabase (integración GitHub activa para `supabase/migrations/`).
