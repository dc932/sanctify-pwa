# Sanctify

Plataforma de audio y contenido espiritual construida con React, Vite, Supabase y Cloudflare R2. Permite escuchar música, podcasts y lecturas, gestionar favoritos y listas, recibir recordatorios, y publicar contenido como creador.

## Tabla de contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Base de datos (Supabase)](#base-de-datos-supabase)
- [Almacenamiento de archivos (Cloudflare R2)](#almacenamiento-de-archivos-cloudflare-r2)
- [PWA y caché offline](#pwa-y-caché-offline)
- [Variables de entorno](#variables-de-entorno)
- [Instalación local](#instalación-local)
- [Scripts disponibles](#scripts-disponibles)
- [Guía de contribución](#guía-de-contribución)
- [Despliegue con GitHub Actions](#despliegue-con-github-actions)
- [Licencia](#licencia)

---

## Tecnologías

| Categoría | Tecnología |
|-----------|-----------|
| Framework UI | React 18 + TypeScript |
| Build tool | Vite 5 |
| Estilos | Tailwind CSS 3 (dark mode por clase) |
| Animaciones | Framer Motion |
| Iconos | Lucide React |
| Base de datos + Auth | Supabase (PostgreSQL + RLS) |
| Almacenamiento de archivos | Cloudflare R2 (vía AWS SDK S3) |
| Audio | Wavesurfer.js + HTMLAudioElement |
| Gráficas | Recharts |
| Drag & Drop | @hello-pangea/dd |
| PWA | vite-plugin-pwa + Workbox |
| Despliegue | Cloudflare Workers (GitHub Actions) |

## Arquitectura del proyecto

```
Navegador (cliente)
   │
   ├── React SPA (Vite)
   │     ├── Contextos: AudioContext, ReminderContext
   │     ├── Hooks: useTheme, useCreatorStudioData
   │     └── Componentes: catálogo, biblioteca, reproductor, creador, ajustes
   │
   ├── Supabase (PostgreSQL)
   │     ├── 17 tablas con RLS
   │     ├── 4 funciones SECURITY DEFINER (admin)
   │     └── Auth (email/password, sesión persistente)
   │
   └── Cloudflare R2
         └── Subida directa desde el cliente (audio, portadas)
```

La app habla directamente con Supabase desde el navegador usando la `anon key`. Toda la seguridad se aplica mediante políticas RLS a nivel de fila y permisos a nivel de columna. Las operaciones administrativas (aprobar creadores, publicar contenido, agradecer donaciones) se ejecutan mediante funciones `SECURITY DEFINER` que verifican `profiles.role = 'admin'`.

## Estructura de carpetas

```
sanctify/
├── .github/workflows/
│   └── deploy.yml              # Validación y despliegue a Cloudflare Workers
├── public/
│   ├── Sanctify_Icon_black.png
│   ├── Sanctify_Icon_white.png
│   └── manifest.json
├── src/
│   ├── main.tsx                # Punto de entrada + registro del service worker PWA
│   ├── App.tsx                 # Layout principal, catálogo y navegación entre vistas
│   ├── supabase.ts             # Cliente Supabase (sesión persistente)
│   ├── r2.ts                   # Cliente Cloudflare R2 (subida de archivos)
│   ├── index.css               # Estilos globales + Tailwind
│   ├── types/audio.ts          # Tipos: Track, TrackCategory, AudioState
│   ├── lib/
│   │   └── reminders.ts        # Utilidades de recordatorios (fechas, formato, validación)
│   ├── context/
│   │   ├── AudioContext.tsx    # Estado global del reproductor (cola, shuffle, repeat)
│   │   └── ReminderContext.tsx # Recordatorios sincronizados con Supabase
│   ├── hooks/
│   │   ├── useTheme.ts         # Tema claro/oscuro con persistencia
│   │   └── useCreatorStudioData.ts  # Datos del estudio de creador
│   ├── components/
│   │   ├── LandingPage.tsx         # Página de aterrizaje pública
│   │   ├── MiniPlayer.tsx          # Reproductor flotante minimizable con gestos
│   │   ├── FullScreenPlayer.tsx    # Reproductor a pantalla completa
│   │   ├── PlayerBar.tsx           # Barra de progreso interactiva
│   │   ├── TrackCard.tsx           # Tarjeta de pista
│   │   ├── LibraryScreen.tsx      # Biblioteca con carpetas jerárquicas
│   │   ├── LecturesView.tsx       # Vista de lecturas
│   │   ├── ShortsScreen.tsx       # Shorts verticales
│   │   ├── VideoDetailScreen.tsx  # Detalle de video
│   │   ├── PayItForwardScreen.tsx  # Muro de benefactores y donaciones
│   │   ├── NotificationsPopover.tsx # Campana de notificaciones
│   │   ├── CreatorStudio.tsx      # Estudio de creador (subida, analytics, earnings)
│   │   ├── AddToPlaylistModal.tsx  # Modal de listas y favoritos
│   │   ├── CalendarPicker.tsx     # Selector de fechas
│   │   ├── ReminderToast.tsx      # Notificación flotante de recordatorio
│   │   ├── DonationWidget.tsx     # Widget de donación (Mercado Pago)
│   │   ├── creator/
│   │   │   ├── AdminReviewView.tsx     # Revisión de contenido (admin)
│   │   │   ├── AnalyticsView.tsx       # Analíticas de creador
│   │   │   ├── BatchUploaderView.tsx   # Subida por lote
│   │   │   ├── EarningsView.tsx        # Ingresos de creador
│   │   │   ├── LibraryView.tsx         # Gestión de contenido
│   │   │   ├── UploadView.tsx          # Subida individual a R2
│   │   │   └── types.ts               # Tipos del módulo creador
│   │   ├── player/
│   │   │   ├── ArtistInfoTab.tsx
│   │   │   ├── LyricsCard.tsx
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── ProgressBarExtras.tsx
│   │   │   ├── QueueTab.tsx
│   │   │   └── UpNextPanel.tsx
│   │   └── settings/
│   │       ├── AccountSettings.tsx
│   │       ├── AppearanceSettings.tsx
│   │       ├── NotificationSettings.tsx
│   │       ├── PlaybackSettings.tsx
│   │       ├── ReminderForm.tsx
│   │       ├── SettingsModal.tsx
│   │       └── ToggleSwitch.tsx
│   └── vite-env.d.ts           # Tipos de Vite + PWA
├── supabase/
│   └── migrations/
│       ├── 20261029230642_create_reminders_table.sql
│       └── 20261030221143_create_all_tables_rls_indexes.sql
├── vite.config.ts              # Config Vite + PWA + Workbox
├── tailwind.config.js          # Tailwind (darkMode: 'class')
├── tsconfig.app.json           # TypeScript (strict, path alias @/)
├── package.json
└── README.md
```

## Base de datos (Supabase)

### Tablas

| Tabla | Propósito | Acceso |
|-------|-----------|--------|
| `profiles` | Espejo de `auth.users` con `role` | Lectura propia; escritura limitada a `full_name`, `avatar_url` |
| `creator_profiles` | Estado de creador (pending/approved) | Lectura propia + aprobados; `status` protegido |
| `creator_content` | Contenido subido (música, podcast, blog, video) | Lectura pública si `status='published'`; escritura del dueño |
| `tracks` | Catálogo estático | Lectura pública (anon + authenticated) |
| `lectures` | Lecturas con audio/PDF opcional | Lectura pública; inserción del dueño |
| `favorites` | Pistas favoritas por usuario | CRUD propio |
| `playlists` | Listas de reproducción | CRUD propio |
| `playlist_tracks` | Unión pista ↔ lista | Propiedad vía `playlists.user_id` |
| `user_folders` | Carpetas jerárquicas | CRUD propio |
| `folder_tracks` | Unión pista ↔ carpeta con posición | Propiedad vía `user_folders.user_id` |
| `creator_notifications` | Notificaciones de creador | Lectura propia; inserción abierta |
| `admin_notifications` | Notificaciones para administradores | Lectura/escritura solo admin |
| `donations` | Registros de donaciones | Lectura pública; `thanked` protegido |
| `creator_earnings` | Ingresos por creador | Lectura propia |
| `creator_analytics_daily` | Analíticas diarias | Lectura propia |
| `benefactor_sponsors` | Padrinos/benefactores | Lectura propia |
| `reminders` | Recordatorios por usuario | CRUD propio |

### Políticas RLS

- Cada tabla tiene RLS habilitado.
- Las tablas de usuario usan 4 políticas (SELECT, INSERT, UPDATE, DELETE) con `auth.uid() = user_id`.
- Las tablas de unión verifican propiedad a través de la tabla padre con `EXISTS (...)`.
- Las columnas de privilegio (`role`, `status`, `feedback`, `thanked`) están protegidas con permisos a nivel de columna (`GRANT UPDATE (...)` restringido).

### Funciones de administrador (SECURITY DEFINER)

| Función | Acción |
|---------|--------|
| `approve_creator(p_creator_id)` | Aprueba a un creador |
| `publish_content(p_content_id)` | Publica contenido |
| `reject_content(p_content_id, p_feedback)` | Rechaza contenido con feedback |
| `thank_donation(p_donation_id)` | Marca donación como agradecida |

Todas verifican `profiles.role = 'admin'` antes de ejecutar.

## Almacenamiento de archivos (Cloudflare R2)

La subida de audio y portadas se realiza directamente desde el navegador a Cloudflare R2 usando el AWS SDK S3. La función `uploadToR2` en `src/r2.ts` genera un nombre único, sube el archivo y devuelve la URL pública que se guarda en `creator_content`.

No hay un bucket de Supabase Storage para contenido; R2 es la única capa de almacenamiento de archivos.

## PWA y caché offline

La app usa `vite-plugin-pwa` con Workbox:

- **Interfaz**: `NetworkFirst` con timeout de 3s (fallback a caché).
- **Imágenes**: `CacheFirst` (hasta 100 entradas, 30 días).
- **Audio**: `CacheFirst` con soporte para solicitudes parciales (reproducción offline).
- **Service worker**: se registra automáticamente y se actualiza en segundo plano.

## Variables de entorno

La app no necesita variables de entorno para compilarse. No añadas credenciales privadas de R2 a variables `VITE_*`: Vite las incrusta en el JavaScript que recibe cualquier visitante. La configuración actual de la subida desde navegador debe migrarse a un endpoint de servidor/Worker antes de habilitar credenciales de R2.

## Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/sanctify.git
cd sanctify

# Instalar dependencias
npm install

# Crear el archivo .env (ver arriba)

# Iniciar el servidor de desarrollo
npm run dev
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar build de producción localmente |
| `npm run typecheck` | Verificación de tipos (tsc --noEmit) |
| `npm run lint` | ESLint |

## Guía de contribución

### Flujo de trabajo

1. **Fork** el repositorio.
2. Crea una rama desde `main`:
   ```bash
   git checkout -b feature/mi-mejora
   ```
3. Haz tus cambios siguiendo las convenciones del proyecto.
4. Verifica que todo pasa:
   ```bash
   npm run typecheck
   npm run build
   ```
5. Haz commit con mensajes descriptivos en español:
   ```bash
   git commit -m "Añade filtro por categoría en la biblioteca"
   ```
6. Abre un Pull Request hacia `main`.

### Convenciones de código

- **TypeScript estricto**: todos los parámetros, props y respuestas deben tener tipos explícitos. No uses `any` salvo en integraciones con datos externos no tipados.
- **Path alias**: usa `@/` para importar desde `src/` (ej. `import { useAudio } from '@/context/AudioContext'`).
- **Componentes**: un componente por archivo, nombrado en PascalCase.
- **Estilos**: Tailwind CSS con clases utilitarias. Tema oscuro por defecto con `dark:` para modo claro.
- **Iconos**: usar `lucide-react`.
- **Sin comentarios innecesarios**: solo comenta el "por qué", no el "qué".
- **Archivos**: mantener un tamaño manejable. Si un archivo crece demasiado, separar por responsabilidad.

### Convenciones de base de datos

- Toda nueva tabla debe tener RLS habilitado y 4 políticas (una por verbo CRUD).
- Las columnas de privilegio deben protegerse con `GRANT` a nivel de columna.
- Usar `auth.uid()` nunca `current_user`.
- Las migraciones deben ser idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- No usar `DROP` ni `DELETE` de columnas (pérdida de datos).

### Revisión de Pull Requests

- El PR debe pasar `typecheck` y `build` sin errores.
- Si se añaden tablas o columnas, incluir la migración correspondiente.
- Si se modifican políticas RLS, verificar que no abren acceso no intencionado.

## Despliegue con GitHub Actions

El archivo `.github/workflows/deploy.yml` valida cada Pull Request y publica la app en Cloudflare Workers al hacer push a `main`. Wrangler sirve `dist/` como SPA con el nombre `sanctify-pwa`, que corresponde a `https://sanctify-pwa.diego-soriano932.workers.dev`.

### Configuración inicial

1. En Cloudflare, obtén el **Account ID** desde **Workers & Pages** y crea un API Token con permisos para editar Workers.
2. En GitHub, añade `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en **Settings > Secrets and variables > Actions**.
3. Confirma que el subdominio `diego-soriano932.workers.dev` está habilitado en esa cuenta y que el Worker `sanctify-pwa` puede desplegarse allí.
4. Añade `https://sanctify-pwa.diego-soriano932.workers.dev` a las URLs permitidas de redirección de autenticación en Supabase.

Los Pull Requests ejecutan typecheck, pruebas y build sin desplegar. Los cambios en `main` hacen esas mismas verificaciones y, si pasan, despliegan a `workers.dev`. También se puede ejecutar `npm run deploy` localmente después de autenticar Wrangler con Cloudflare.

### Credenciales de R2

El pipeline no inyecta claves de R2 en el build. Las variables `VITE_*` se incluyen en el JavaScript público del navegador; por tanto, no configures `VITE_R2_ACCESS_KEY_ID` ni `VITE_R2_SECRET_ACCESS_KEY` como secretos de compilación. La subida directa a R2 requiere mover esa operación a un endpoint de servidor/Worker antes de usar credenciales privadas.

## Licencia

Proyecto privado. Todos los derechos reservados.
