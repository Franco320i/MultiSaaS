# 0001 · Monolito modular con tabla compartida y RLS

Fecha: 2026-11-06 · Estado: aceptada

## Decisión

Una sola aplicación Next.js en Vercel y un solo proyecto Supabase por entorno. Todos los comercios comparten tablas, separados por `tenant_id`, con RLS y claves foráneas compuestas. El comercio se resuelve por el host (catálogo) o por la membresía del usuario (panel).

## Por qué

- Un proyecto Supabase por comercio costaría ≥ USD 10/mes de cómputo cada uno y multiplicaría migraciones y backups.
- Un esquema por comercio complica migraciones y la API de Supabase.
- Una persona puede mantener un solo código, un pipeline y una migración por cambio.

## Consecuencias

- Una política RLS mal escrita expone a todos los comercios: por eso las pruebas de aislamiento (pgTAP + integración + E2E) bloquean cualquier despliegue.
- Los módulos futuros (IA, turnos, CRM, automatizaciones) son carpetas y tablas con prefijo que se comunican por `events`.

Detalle completo: `docs/diseno-tecnico-v1.md`.
