# Checklist de configuración PWA

Seguí estos pasos para que Intercambio CR funcione como una PWA instalable.

## 1. Instalar Node.js localmente

Instalá la versión LTS de Node.js desde:

https://nodejs.org/

Después abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
npm install
npm run build
```

Si el build pasa, ejecutá:

```bash
npm run dev
```

URL local:

```text
http://localhost:3000
```

Nota: el service worker solo se registra en producción para evitar problemas de caché durante desarrollo.

## 2. Crear el proyecto en Supabase

En Supabase, usa el proyecto correcto:

```text
Nombre: Intercambio CR
Project ref: tu-project-ref
Project URL: https://tu-project-ref.supabase.co
```

1. Creá un proyecto nuevo.
2. Copiá el Project URL en `NEXT_PUBLIC_SUPABASE_URL`.
3. Copiá la anon public key en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copiá la service role key en `SUPABASE_SERVICE_ROLE_KEY`.

Creá `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pegar_publishable_key
SUPABASE_SERVICE_ROLE_KEY=pegar_secret_key_solo_en_backend
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Ejecutar scripts de base de datos

En Supabase SQL Editor:

1. Ejecutá `supabase/schema.sql`.
2. Ejecutá `supabase/storage-policies.sql`.

Después activá proveedores de autenticación:

- Email.
- Google.
- Apple.

Para desarrollo local, agregá esta URL de redirección en Supabase Auth:

```text
http://localhost:3000/auth/callback
```

Para producción, agregá:

```text
https://tu-dominio.com/auth/callback
```

## 4. Desplegar producción

Recomendado: Vercel.

1. Sube el proyecto a GitHub.
2. Creá un proyecto en Vercel.
3. Agregá las mismas variables de entorno.
4. Configura `NEXT_PUBLIC_SITE_URL` con tu dominio de producción.
5. Desplegá.

Importante: la instalación como PWA requiere HTTPS. Localhost sirve para pruebas, pero los dispositivos reales necesitan HTTPS en producción.

## 5. Probar instalación PWA

En Chrome de escritorio:

1. Abrí la URL de producción.
2. Abrí DevTools.
3. Entra a Application.
4. Revisa Manifest.
5. Revisa Service Workers.
6. Confirmá que no haya errores de instalación.
7. Usa el ícono de instalación del navegador.

En Android Chrome:

1. Abrí la URL de producción.
2. Tocá el menú del navegador.
3. Tocá Instalar app o Agregar a pantalla principal.
4. Abrí la app desde la pantalla principal.
5. Confirmá que abra en modo standalone.

En iPhone Safari:

1. Abrí la URL de producción en Safari.
2. Tocá Compartir.
3. Tocá Agregar a pantalla de inicio.
4. Abrí la app desde la pantalla de inicio.

iOS no siempre muestra el mismo prompt automático de instalación que Android.

## 6. Probar modo offline

1. Abrí la app de producción una vez.
2. Visitá `/`, `/explorar`, `/ayuda` y `/legal`.
3. Apagá la conexión.
4. Recargá.
5. Confirmá que aparezcan páginas cacheadas o `/offline`.

Comportamiento esperado:

- Algunas páginas informativas pueden estar disponibles sin conexión.
- Datos de Supabase, solicitudes, créditos, chat, reportes y administración requieren conexión.
- Los movimientos de créditos nunca deben ejecutarse sin conexión.

## 7. Revisar con Lighthouse

En Chrome DevTools:

1. Abrí Lighthouse.
2. Seleccioná Progressive Web App.
3. Ejecutá la auditoría.

Resultado esperado:

- Instalable.
- Tiene manifest.
- Tiene service worker.
- Usa HTTPS.
- Tiene íconos.
- Tiene fallback offline.

## 8. Antes de lanzar

Completá estos puntos manuales:

- Adquirir y configurar dominio de producción.
- Usar despliegue con HTTPS.
- Reemplazar `NEXT_PUBLIC_SITE_URL` por el dominio de producción.
- Agregar URLs de redirección de producción en Supabase.
- Revisar `docs/legal-cr.md` con abogado y contador en Costa Rica.
- Probar manualmente el rol de administrador en Supabase.
- Probar un flujo completo:
  - Registrarse.
  - Enviar artículo a Intercambio CR.
  - Administración ofrece créditos.
  - Administración emite créditos después de inspección física.
  - Un usuario ofrece un artículo.
  - Otro usuario lo solicita con créditos retenidos.
  - La persona oferente acepta.
  - Ambas partes confirman.
  - Los créditos se liberan y el ledger registra los movimientos.
