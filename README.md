# Intercambio CR

Aplicación web responsive para Costa Rica donde las personas pueden intercambiar
artículos entre usuarios, recibir ofertas en créditos y conseguir lo que
necesitan usando créditos internos.

## Principios de la plataforma

- Los créditos no son dinero, no equivalen a colones y no son redimibles por efectivo.
- Intercambio CR emite créditos solo cuando recibe y aprueba artículos físicos.
- Entre usuarios, los créditos solo se mueven mediante ofertas asociadas a publicaciones.
- Cada oferta retiene créditos hasta que ambas partes aprueben el proceso.
- Los reportes o disputas pueden congelar créditos y transacciones.
- Todo movimiento queda registrado en un ledger auditable.

## Arquitectura

- Frontend: Next.js App Router, React, Tailwind CSS.
- Distribución inicial: PWA instalable en móvil y escritorio.
- Backend: Supabase Auth, PostgreSQL, Row Level Security y Storage.
- Imágenes: buckets separados para publicaciones, entregas, chat y avatares.
- Admin: panel para revisar usuarios, ofertas, reportes, publicaciones y créditos.

## PWA

La primera versión está pensada como Progressive Web App:

- Manifest en `app/manifest.ts`.
- Service worker en `public/sw.js`.
- Íconos instalables en `public/icons`.
- Fallback offline en `/offline`.
- Prompt de instalación en la interfaz.

Por seguridad, el service worker no cachea Supabase ni acciones sensibles. Las
solicitudes, movimientos de créditos, reportes, chat y administración requieren
conexión para evitar estados inconsistentes.

La guía manual completa está en `docs/pwa-setup.md`.

## Flujos principales

### Publicar un artículo para intercambio

1. El usuario sube fotos y especificaciones.
2. La comunidad puede ofrecer créditos u otros artículos.
3. La persona dueña del artículo elige la mejor oferta.
4. Si Intercambio CR recibe el artículo en Escazú, lo inspecciona antes de emitir créditos.
5. Si se aprueba, los créditos quedan registrados en la billetera del usuario.

### Intercambiar entre usuarios

1. Una persona hace una oferta por un artículo publicado.
2. Puede ofrecer créditos o proponer otro artículo.
3. La persona que publicó acepta la oferta que más le convenga.
4. Se abre chat privado.
5. Ambas partes coordinan la entrega.
6. Ambas partes confirman.
7. Si hubo créditos retenidos, el sistema los libera a la persona oferente.

## Configuración local

```bash
npm install
npm run dev
```

Crea un archivo `.env.local` usando `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pegar_publishable_key
SUPABASE_SERVICE_ROLE_KEY=pegar_secret_key_solo_en_backend
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Base de datos

1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar `supabase/schema.sql`.
4. Ejecutar `supabase/storage-policies.sql` o crear los buckets descritos en `supabase/storage.md`.
5. Activar proveedores de autenticación: email, Google y Apple.

Las funciones principales del sistema de créditos están documentadas en
`supabase/credit-flows.md`.

## Despliegue

Recomendado:

1. Subir el repositorio a GitHub.
2. Conectar el proyecto en Vercel.
3. Agregar variables de entorno.
4. Ejecutar migración SQL en Supabase.
5. Configurar dominios autorizados para Supabase Auth.

## Pendientes para producción

- Instalar dependencias y correr build local con Node/npm.
- Agregar moderación de imágenes y revisión manual de artículos de alto valor.
- Crear políticas RLS de admin mediante claims o tabla de roles reforzada.
- Reemplazar datos demo de portada por consultas editoriales reales.
