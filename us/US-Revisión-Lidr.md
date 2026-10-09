# Revisión LIDR — arranque, pruebas y límite de login

**Refinado:** `/enrich-us` 2026-10-09, instrucción `ai-specs/.commands/enrich-us.md`.  
**Jira:** no hay ticket ni MCP de Jira. Los pasos 1, 6 y 7 de esa instrucción no tienen destino en Jira. El refinamiento queda en este archivo: el texto `[original]` se conserva y el `[enhanced]` va después. Estado local equivalente a **Pending refinement validation**.  
**Contexto técnico:** `docs/base-standards.mdc`, `docs/backend-standards.mdc`, `docs/documentation-standards.mdc`, `readme.md`, `docker-compose.yml`.  
**No implementar** hasta que se pida cada historia. **No tocar** `C:\Despliegues`, su `.env`, su Compose en ejecución ni su base.

Orden: **HU-01 → HU-02 → HU-03 → HU-04 → HU-05 → HU-06**.

Fuera de alcance de esta revisión: `ai-specs`, CI/CD, Enter en el login, CSP y `COOKIE_SECURE`.

---

## HU-01 — Configuración de variables de entorno

Prioridad: Alta.

## [original] Historia de Usuario

**Como** desarrollador que clona el repositorio,  
**quiero** un `.env.docker.example` completo y coherente con Docker Compose,  
**para** configurar las variables necesarias y levantar el sistema sin errores de configuración.

## [original] Criterios de Aceptación

- [ ] El ejemplo incluye todas las variables que exige `docker-compose.yml`, incluyendo `POSTGRES_*`, `GRAFANA_*` y las del bootstrap del administrador.
- [ ] Se documenta cómo crear `.env` a partir del ejemplo.
- [ ] El stack arranca sin exigir variables no documentadas, incluso con el perfil `observability` apagado.
- [ ] El ejemplo no contiene secretos reales ni contraseñas presentadas como seguras para producción.

## [enhanced] Historia de Usuario

**Como** quien clona el repositorio y levanta MecaTrack con Docker Compose,  
**quiero** copiar un ejemplo que liste todas las variables del stack y no bloquee el arranque por Grafana,  
**para** crear `.env` sin usar los placeholders que la API rechaza cuando `NODE_ENV=production`.

Hoy [`.env.docker.example`](../.env.docker.example) solo define dos JWT `mecatrack-docker-*` y afirma que Compose arranca solo. No es así: `POSTGRES_*` y los JWT son obligatorios, y `GRAFANA_ADMIN_PASSWORD` usa `:?` aunque Grafana esté en el perfil `observability`. Compose interpola el archivo entero antes de filtrar perfiles.

## [enhanced] Criterios de Aceptación

- [ ] `.env.docker.example` declara las variables de la tabla de campos, con placeholders marcados como no válidos para producción.
- [ ] `docker compose config` sin perfil `observability` termina en éxito aunque `GRAFANA_ADMIN_PASSWORD` no esté definida.
- [ ] `docker compose --profile observability config` sigue pudiendo exigir `GRAFANA_ADMIN_PASSWORD`.
- [ ] El README indica copiar el ejemplo a `.env` en la raíz antes de `docker compose up`. El texto largo de la sección 1.4 queda en HU-04.
- [ ] No se modifica el `.env` ni el Compose de `C:\Despliegues`.

## [enhanced] Especificación técnica

### Campos

| Variable | Valor en el ejemplo | Notas |
|----------|---------------------|--------|
| `POSTGRES_USER` | placeholder, no `mecatrack` como si fuera seguro | Compose lo exige con `:?` |
| `POSTGRES_PASSWORD` | placeholder distinto de `mecatrack`, `postgres` y `password` | HU-02 no relaja esa regla |
| `POSTGRES_DB` | nombre de base del despliegue | Lo elige quien despliega |
| `JWT_ACCESS_SECRET` | placeholder de 32+ caracteres, no `change-me-*` ni `mecatrack-docker-*` | Rechazado por `validate-environment.ts` |
| `JWT_REFRESH_SECRET` | igual que el access | Distinto del access |
| `GRAFANA_ADMIN_USER` | `admin` | Solo con perfil `observability` |
| `GRAFANA_ADMIN_PASSWORD` | placeholder | No `:?` en el arranque sin perfil |
| `ENABLE_ADMIN_BOOTSTRAP` | `false` | HU-03 |
| `BOOTSTRAP_ADMIN_EMAIL` | vacío o comentado | HU-03 |
| `BOOTSTRAP_ADMIN_PASSWORD` | vacío o comentado | Mínimo 8 si se usa |
| `BOOTSTRAP_ADMIN_NAME` | vacío o comentado | HU-03 |
| `ENABLE_HSTS` | `false` | Ya tiene default en Compose |
| `WEB_PORT` | comentado | Quien despliega elige el puerto; no fijar 3000 ni 3010 |

### Endpoints

Ninguno.

### Archivos

| Archivo | Cambio |
|---------|--------|
| [`.env.docker.example`](../.env.docker.example) | Sustituir el contenido por la tabla de campos y un comentario de que no son secretos de producción |
| [`docker-compose.yml`](../docker-compose.yml) | Quitar `:?` de `GRAFANA_ADMIN_PASSWORD` para el arranque sin perfil. Mantener `:?` en `POSTGRES_*` y `JWT_*` |
| [`readme.md`](../readme.md) | Una instrucción de copia `.env.docker.example` → `.env`. No reescribir 1.4 aquí |

No editar `apps/api/src/common/utils/validate-environment.ts`.

### Pasos para darla por cerrada

1. Actualizar el ejemplo y Compose.
2. Ejecutar `docker compose config` sin `GRAFANA_ADMIN_PASSWORD` y comprobar que no falla por esa variable.
3. Ejecutar `docker compose --profile observability config` y comprobar que Grafana sigue dependiendo de su contraseña.
4. Confirmar que el `.env` de `C:\Despliegues` no cambió.

### Documentación y pruebas

No hay test unitario. La prueba es `docker compose config`. La frase de copia a `.env` se amplía en HU-04.

### Requisitos no funcionales

- Seguridad: el ejemplo no contiene secretos reales ni valores que la validación de producción acepte como si fueran seguros.
- El cambio de interpolación no altera el volumen de Postgres ni levanta Grafana si el perfil está apagado.

---

## HU-02 — Validación de configuración y contraseñas

Prioridad: Alta. Depende de HU-01 solo en el ejemplo; esta historia no cambia el código de validación.

## [original] Historia de Usuario

**Como** desarrollador,  
**quiero** que la configuración de base de datos cumpla los requisitos de seguridad documentados,  
**para** evitar reinicios continuos del API por valores inválidos.

## [original] Criterios de Aceptación

- [ ] Las variables obligatorias se validan antes de iniciar el API.
- [ ] Si una contraseña incumple las reglas, el sistema muestra un error claro y termina con un código distinto de cero.
- [ ] Docker Compose y el README documentan los requisitos mínimos de las contraseñas.
- [ ] Se distingue una configuración inválida de un fallo de conexión con la base de datos.
- [ ] Esta historia no elimina ni relaja la validación existente.

## [enhanced] Historia de Usuario

**Como** quien configura el stack Docker,  
**quiero** ver documentados los mínimos que el API ya exige al arrancar,  
**para** no copiar un ejemplo que provoque reinicios, sin debilitar esas reglas.

La validación ya está en [`validate-environment.ts`](../apps/api/src/common/utils/validate-environment.ts) y corre al inicio de [`main.ts`](../apps/api/src/main.ts) si `NODE_ENV=production` o `ENFORCE_SECURE_CONFIG=true`. Compose ya pone `NODE_ENV=production` en `api`. Un valor inválido lanza `InvalidEnvironmentError` (`Invalid production configuration: ...`) y el proceso termina antes de escuchar el puerto. Un Postgres inalcanzable ocurre después y es otro error. El README 2.5 ya lo describe; la instalación (1.4) no.

## [enhanced] Criterios de Aceptación

- [ ] `validate-environment.ts` y `validate-environment.spec.ts` no cambian de comportamiento.
- [ ] Comentarios de Compose y la instalación listan los mínimos de la tabla de campos.
- [ ] Sigue existiendo la diferencia entre `Invalid production configuration` y un error posterior de conexión Prisma.
- [ ] No se cambia el `.env` real ni los datos de producción.

## [enhanced] Especificación técnica

### Campos

No se añaden variables. Se documentan las reglas ya aplicadas a:

| Campo | Regla actual, no modificar |
|-------|----------------------------|
| `JWT_ACCESS_SECRET` | Obligatorio, ≥ 32 caracteres, no `change-me-*` ni `mecatrack-docker-*` |
| `JWT_REFRESH_SECRET` | Igual |
| `DATABASE_URL` | URL válida con password distinto de `mecatrack`, `postgres` y `password` |
| `NODE_ENV` | `production` activa el modo estricto |
| `ENFORCE_SECURE_CONFIG` | `true` también lo activa |

### Endpoints

Ninguno. El fallo ocurre antes de `app.listen`.

### Archivos

| Archivo | Cambio |
|---------|--------|
| [`docker-compose.yml`](../docker-compose.yml) | Comentario junto al servicio `api` con los mínimos |
| [`readme.md`](../readme.md) | Párrafo corto de mínimos en la instalación, sin contradecir HU-04 |
| [`apps/api/src/common/utils/validate-environment.ts`](../apps/api/src/common/utils/validate-environment.ts) | Sin cambios de reglas |
| [`apps/api/src/common/utils/validate-environment.spec.ts`](../apps/api/src/common/utils/validate-environment.spec.ts) | Sin relajar casos; ejecutarlos como regresión |

### Pasos para darla por cerrada

1. Añadir los comentarios y el párrafo.
2. Ejecutar el spec de `validate-environment` y confirmar que los casos de placeholder y password trivial siguen en rojo si alguien los debilita.
3. No arrancar ni reconfigurar el API de `C:\Despliegues`.

### Documentación y pruebas

La prueba existente es la unidad de `validate-environment.spec.ts`. No hace falta un test nuevo si las aserciones actuales cubren JWT cortos, placeholders y passwords triviales.

### Requisitos no funcionales

- Seguridad: prohibido ampliar `PLACEHOLDER_SECRETS` al revés o aceptar `mecatrack` como password para “hacer arrancar” el ejemplo.
- El proceso debe salir con código distinto de cero. No capturar `InvalidEnvironmentError` para seguir escuchando el puerto.

---

## HU-03 — Creación del administrador inicial

Prioridad: Alta. Depende de HU-01 para que las variables existan en el ejemplo.

## [original] Historia de Usuario

**Como** administrador del sistema,  
**quiero** crear el usuario administrador inicial mediante un bootstrap configurable,  
**para** poder acceder a MecaTrack después de una instalación nueva.

## [original] Criterios de Aceptación

- [ ] Docker Compose transmite `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`.
- [ ] El entrypoint ejecuta el bootstrap desde la ruta correcta dentro de la imagen.
- [ ] El proceso crea el administrador inicial cuando corresponde y permite iniciar sesión con esas credenciales.
- [ ] Ejecutarlo de nuevo no crea administradores duplicados ni sobrescribe credenciales existentes.
- [ ] Las credenciales no se imprimen en los logs.

## [enhanced] Historia de Usuario

**Como** quien instala MecaTrack en una base vacía,  
**quiero** que el contenedor `api` reciba las credenciales de bootstrap solo si el flag está activo,  
**para** crear el primer administrador sin duplicarlo y sin que un arranque normal toque usuarios existentes.

El entrypoint ya llama a `prisma/dist-seed/bootstrap-admin.js` solo si `ENABLE_ADMIN_BOOTSTRAP=true`. Si la tabla `User` no está vacía, [`assertUserTableEmpty`](../apps/api/src/common/utils/admin-bootstrap.ts) se niega. Compose pasa el flag con default `false` y no pasa `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` ni `BOOTSTRAP_ADMIN_NAME`. El log actual incluye el email.

## [enhanced] Criterios de Aceptación

- [ ] El servicio `api` recibe las tres variables `BOOTSTRAP_ADMIN_*`.
- [ ] El default de `ENABLE_ADMIN_BOOTSTRAP` sigue siendo `false`.
- [ ] Con el flag en `false`, no se crea ningún usuario.
- [ ] Con el flag en `true`, tabla vacía y credenciales válidas, se crea un solo `ADMIN` y el login funciona. La prueba es una base vacía de desarrollo.
- [ ] Una segunda ejecución no crea ni sobrescribe usuarios.
- [ ] Los logs no contienen el email ni la contraseña.
- [ ] No se pone `ENABLE_ADMIN_BOOTSTRAP=true` en `C:\Despliegues`.

## [enhanced] Especificación técnica

### Campos

| Variable | Obligatorio cuando | Regla |
|----------|--------------------|-------|
| `ENABLE_ADMIN_BOOTSTRAP` | Siempre presente en Compose | Default `false` |
| `BOOTSTRAP_ADMIN_EMAIL` | Flag `true` | No vacío; se normaliza a minúsculas |
| `BOOTSTRAP_ADMIN_PASSWORD` | Flag `true` | Mínimo 8 caracteres |
| `BOOTSTRAP_ADMIN_NAME` | Flag `true` | No vacío |

El usuario creado usa `role = ADMIN`, `active = true` y `passwordHash` con bcrypt. No se escriben esos campos si ya existe cualquier fila en `User`.

### Endpoints

Ninguno nuevo. El acceso posterior es el existente `POST /api/auth/login`.

### Archivos

| Archivo | Cambio |
|---------|--------|
| [`docker-compose.yml`](../docker-compose.yml) | Añadir las tres variables al `environment` de `api`. No cambiar el default del flag |
| [`apps/api/prisma/bootstrap-admin.ts`](../apps/api/prisma/bootstrap-admin.ts) | Quitar el email del `console.log` de éxito |
| [`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh) | Sin cambio de ruta: ya usa `prisma/dist-seed/bootstrap-admin.js` |
| [`apps/api/src/common/utils/admin-bootstrap.spec.ts`](../apps/api/src/common/utils/admin-bootstrap.spec.ts) | Mantener los casos de tabla no vacía y de password corto |

### Pasos para darla por cerrada

1. Pasar las variables en Compose.
2. Cambiar el log de éxito a un mensaje sin credenciales.
3. En una base de desarrollo vacía, activar el flag solo en ese entorno, arrancar, iniciar sesión y volver a arrancar comprobando que no aparece un segundo admin.
4. Confirmar que el `.env` de producción sigue con el flag en `false` y que no se ejecutó el bootstrap allí.

### Documentación y pruebas

No hace falta un endpoint nuevo. Añadir o ajustar un test unitario del mensaje de log si el log se extrae a una función comprobable; si no, la comprobación de “no imprime email” es revisión del `console.log` más la prueba manual en base vacía. No usar `db:seed:dev` en esa prueba.

### Requisitos no funcionales

- Seguridad: no imprimir contraseña ni email. No sobrescribir `passwordHash` de usuarios existentes.
- Idempotencia: segunda ejecución con tabla no vacía termina sin crear filas.
- Rendimiento: una sola inserción, solo en instalación vacía.

---

## HU-04 — Documentación del inicio y acceso inicial

Prioridad: Alta. Depende de HU-01, HU-02 y HU-03 para no documentar un flujo distinto del código.

## [original] Historia de Usuario

**Como** desarrollador que instala MecaTrack por primera vez,  
**quiero** instrucciones actualizadas para iniciar el sistema y obtener acceso,  
**para** reproducir la instalación sin depender de instrucciones obsoletas.

## [original] Criterios de Aceptación

- [ ] El README describe la creación y configuración de `.env`.
- [ ] Documenta el inicio con Docker Compose, las migraciones y la creación del usuario administrador.
- [ ] Aclara que `admin@taller.com` / `AdminPass123` no están garantizados en una instalación nueva.
- [ ] Distingue el procedimiento de desarrollo del de producción.

## [enhanced] Historia de Usuario

**Como** quien instala MecaTrack,  
**quiero** que la sección 1.4 coincida con el entrypoint,  
**para** no esperar un seed automático ni unas cuentas demo, y para elegir los puertos del despliegue.

La sección 1.4 dice que el API carga datos de prueba al arrancar y publica `admin@taller.com` / `AdminPass123`. El entrypoint solo ejecuta `prisma migrate deploy` y el bootstrap si el flag está activo. Esas cuentas solo existen tras `npm run db:seed:dev`, prohibido con `NODE_ENV=production`. La sección 2.4–2.5 ya describe el arranque, pero presenta puertos de esta máquina como si fueran los del producto.

## [enhanced] Criterios de Aceptación

- [ ] 1.4 describe: copiar `.env`, `docker compose up`, migraciones automáticas, sin seed.
- [ ] 1.4 explica el administrador inicial como bootstrap opt-in con tabla `User` vacía.
- [ ] 1.4 dice que `admin@taller.com` / `AdminPass123` y `mechanic@taller.com` / `MechanicPass123` no aparecen en una instalación nueva ni en producción.
- [ ] No se fijan los puertos `3000`, `3010`, `4010`, `5434` ni `5435`. El texto dice que cada despliegue publica los suyos en Compose o en `.env`.
- [ ] Se distingue desarrollo (seed explícito, fuera de producción) de producción (migraciones y bootstrap opt-in) sin atarlos a una carpeta concreta.
- [ ] 2.5 no se reescribe. Si cita puertos fijos de este equipo como obligatorios, se ajustan al mismo criterio.
- [ ] No se cambia el Compose en ejecución de producción.

## [enhanced] Especificación técnica

### Campos

Ningún campo de base o de API. Variables que la instalación debe mencionar, sin asignarles los puertos de esta máquina: `WEB_PORT`, puerto publicado de Postgres, `PORT` del API si se expone, y las de HU-01.

### Endpoints

Ninguno. La documentación puede nombrar `POST /api/auth/login` como comprobación de acceso, sin cambiarlo.

### Archivos

| Archivo | Cambio |
|---------|--------|
| [`readme.md`](../readme.md) sección 1.4 | Sustituir el párrafo de seed automático y la tabla de usuarios de prueba como acceso garantizado |
| [`readme.md`](../readme.md) sección 2.4–2.5 | Solo si presentan puertos de este equipo como los únicos válidos |

No editar `docker-compose.yml` de `C:\Despliegues`.

### Pasos para darla por cerrada

1. Reescribir 1.4 según los criterios.
2. Buscar en el README `3000`, `3010`, `4010`, `5434`, `5435`, `AdminPass123` y `C:\Despliegues` y dejar solo lo que sea un ejemplo claramente opcional, no un requisito.
3. Leer la sección en voz alta contra `docker-entrypoint.sh`: migrar, bootstrap solo con flag, sin seed.

### Documentación y pruebas

No hay test automático. La revisión es de lectura cruzada con el entrypoint. Los comentarios de código y de documentación nueva van en inglés si se añaden frases técnicas nuevas; la sección 1.4 del README hoy está en español y se mantiene el idioma de esa sección para no mezclar el índice.

### Requisitos no funcionales

- No documentar credenciales demo como acceso de producción.
- No instruir `docker compose down -v` ni ningún borrado de volumen.

---

## HU-05 — Alineación entre el seed y las pruebas E2E

Prioridad: Alta. Puede documentarse junto con HU-04, pero el comando de preparación es independiente.

## [original] Historia de Usuario

**Como** desarrollador,  
**quiero** que las pruebas E2E dispongan de datos iniciales controlados,  
**para** ejecutarlas de forma consistente sin depender de un seed durante el arranque normal.

## [original] Criterios de Aceptación

- [ ] Se define cómo preparar los datos de prueba.
- [ ] Las pruebas E2E pueden inicializar la base desde cero.
- [ ] Las credenciales de prueba están documentadas y solo sirven para entornos de prueba.
- [ ] El seed de pruebas no puede usarse en producción.
- [ ] El procedimiento no depende de datos residuales de ejecuciones anteriores.

## [enhanced] Historia de Usuario

**Como** quien ejecuta las pruebas de la API,  
**quiero** un comando que vacíe y vuelva a sembrar solo la base de test,  
**para** que el login de prueba no dependa de un hash viejo y para que ese comando no pueda correr en producción.

El entrypoint no llama al seed. [`seed-dev.ts`](../apps/api/prisma/seed-dev.ts) lanza `DevSeedError` si `NODE_ENV=production` y, en usuarios existentes, el `upsert` no actualiza `passwordHash`. Los E2E hacen `prisma migrate deploy` y `prisma db seed` en `beforeAll`. Playwright no prepara la base. [`db:clean:destructive`](../apps/api/prisma/clean-db-admin-only.ts) no es el preparador de test y no debe apuntarse a producción.

## [enhanced] Criterios de Aceptación

- [ ] Existe un comando explícito que vacía y siembra únicamente la base indicada por el `DATABASE_URL` de test.
- [ ] Después, el login de prueba funciona con las tres cuentas demo aunque antes existieran con otro hash.
- [ ] Esas credenciales quedan documentadas como exclusivas de desarrollo y prueba.
- [ ] Con `NODE_ENV=production` el comando termina en error y no borra ni inserta.
- [ ] No se ejecuta contra la base de `C:\Despliegues`.
- [ ] El `beforeAll` de los E2E de API usa ese comando. Playwright no asume datos de otro entorno.

## [enhanced] Especificación técnica

### Campos

Cuentas que el preparador debe dejar, con hash nuevo en cada ejecución:

| Email | Password | `role` | `active` |
|-------|----------|--------|----------|
| `admin@taller.com` | `AdminPass123` | `ADMIN` | `true` |
| `mechanic@taller.com` | `MechanicPass123` | `MECHANIC` | `true` |
| `inactive@taller.com` | `InactivePass123` | `MECHANIC` | `false` |

El resto de filas demo que hoy crea `seed-dev.ts` (clientes, vehículos, órdenes) se vuelven a crear tras vaciar las tablas de dominio. No se documentan como datos de producción.

### Endpoints

Ninguno nuevo. La comprobación usa `POST /api/auth/login` en los E2E ya existentes.

### Archivos

| Archivo | Cambio |
|---------|--------|
| Nuevo script bajo `apps/api/prisma/`, invocado por un script npm distinto de `db:seed:dev` | Vacía la base de test y llama a la siembra, actualizando `passwordHash` |
| [`apps/api/package.json`](../apps/api/package.json) | Script nuevo, por ejemplo `db:prepare:test` |
| [`apps/api/src/common/utils/admin-bootstrap.ts`](../apps/api/src/common/utils/admin-bootstrap.ts) | Reutilizar `assertNotProductionSeed`; no debilitarlo |
| `apps/api/test/*.e2e-spec.ts` | Sustituir el `prisma db seed` suelto del `beforeAll` por el preparador |
| [`readme.md`](../readme.md) | Las cuentas demo solo en la sección de pruebas, alineado con HU-04 |

No llamar a `db:clean:destructive` contra producción. No cambiar `docker-entrypoint.sh`.

### Pasos para darla por cerrada

1. Implementar el comando con rechazo si `NODE_ENV=production`.
2. Apuntarlo a una base de test local, ejecutarlo dos veces y comprobar que el login demo sigue válido.
3. Ejecutar un E2E de auth contra esa base.
4. Confirmar que no se usó el `DATABASE_URL` de `C:\Despliegues`.

### Documentación y pruebas

Añadir un test unitario del rechazo en `NODE_ENV=production`. Los E2E existentes cubren el login si el `beforeAll` usa el comando. Documentar el comando y las tres credenciales como exclusivas de test.

### Requisitos no funcionales

- Seguridad: el comando es destructivo solo para la base de test. Debe fallar cerrado en producción.
- No depender de filas residuales ni conservar un `passwordHash` antiguo.
- No imprimir las contraseñas en logs más allá de lo que el seed de desarrollo ya hace en local; no añadir logs nuevos con secretos.

---

## HU-06 — Rate limiting detrás del proxy

Prioridad: Media. No depende de las historias de instalación, pero no se prueba contra producción.

## [original] Historia de Usuario

**Como** administrador del sistema,  
**quiero** que el límite de intentos de inicio de sesión identifique a cada cliente detrás del proxy de Next.js,  
**para** evitar que un usuario bloquee los intentos de autenticación de todo el taller.

## [original] Criterios de Aceptación

- [ ] Se configura la confianza en proxies y el tratamiento de `X-Forwarded-For`.
- [ ] Solo se confía en cabeceras de IP procedentes de proxies autorizados.
- [ ] Se conserva el límite de cinco intentos por cada ventana de 15 minutos.
- [ ] Los intentos de usuarios distintos no se contabilizan como una misma IP cuando la infraestructura puede distinguirlos.
- [ ] Se prueban el escenario con proxy y el acceso directo al API.

## [enhanced] Historia de Usuario

**Como** administrador del taller,  
**quiero** que `POST /api/auth/login` cuente los intentos por cliente real cuando la petición entra por Next,  
**para** que agotar el límite no bloquee al resto del taller, sin cambiar ese límite.

[`auth.controller.ts`](../apps/api/src/modules/auth/auth.controller.ts) aplica `@Throttle({ default: { limit: 5, ttl: 900_000 } })`. En [`auth.module.ts`](../apps/api/src/modules/auth/auth.module.ts) el límite global es 5 en `production` y `test`, y 1000 en desarrollo local. No hay `trust proxy`. Con `API_PROXY_TARGET`, Express ve la IP del contenedor `web` para todos los usuarios.

## [enhanced] Criterios de Aceptación

- [ ] `X-Forwarded-For` solo se acepta si el socket remoto es el proxy de la red de Compose.
- [ ] Un cliente que llama al API directamente no puede suplantar su IP con esa cabecera.
- [ ] En `production` y en `test` el límite sigue siendo 5 intentos por 15 minutos.
- [ ] Dos clientes detrás del proxy no comparten contador.
- [ ] El acceso directo se limita por la IP de esa conexión.
- [ ] Las pruebas no usan la base de `C:\Despliegues`.

## [enhanced] Especificación técnica

### Campos

No hay campos de base de datos. Identificador del throttler:

| Origen | Clave del límite |
|--------|------------------|
| Petición desde el servicio `web` de Compose | Primera IP de `X-Forwarded-For` puesta por ese proxy |
| Petición directa al API | `req.ip` / dirección del socket, ignorando `X-Forwarded-For` |

El límite no cambia:

| `NODE_ENV` | `limit` | `ttl` |
|------------|---------|-------|
| `production`, `test` | 5 | 900000 ms |
| desarrollo local | 1000 | el que ya define `auth.module.ts` |

### Endpoints

| Método y ruta | Cambio |
|---------------|--------|
| `POST /api/auth/login` | Misma respuesta `200`, `401` y `429`. Cambia solo la clave del contador |
| Resto de `/api/auth/*` | Sin cambio de límite en esta historia |

### Archivos

| Archivo | Cambio |
|---------|--------|
| [`apps/api/src/main.ts`](../apps/api/src/main.ts) | No activar `trust proxy` abierto a cualquier cliente |
| Nuevo helper, por ejemplo `apps/api/src/modules/auth/utils/client-ip.ts` | Resolver la IP según la tabla de arriba |
| Guard de login o `ThrottlerGuard` propio usado en `POST /api/auth/login` | `getTracker` usa ese helper |
| Spec unitario del helper | Proxy autorizado frente a cabecera falsa en acceso directo |
| [`apps/api/test/auth.e2e-spec.ts`](../apps/api/test/auth.e2e-spec.ts) | Dos trackers distintos no se bloquean entre sí; el sexto intento del mismo tracker responde `429` |

### Pasos para darla por cerrada

1. Implementar el helper y el tracker sin cambiar `limit` ni `ttl` de producción.
2. Cubrir con unitarias el proxy autorizado y la cabecera ignorada en acceso directo.
3. Cubrir con E2E el `429` al sexto intento del mismo cliente y la independencia de otro cliente.
4. Ejecutar esas pruebas contra la base de test de HU-05, no contra producción.

### Documentación y pruebas

Documentar en un comentario corto del helper que solo el proxy de Compose es de confianza. No hace falta un endpoint nuevo ni un cambio de OpenAPI. El cuerpo de login no cambia.

### Requisitos no funcionales

- Seguridad: no confiar en `X-Forwarded-For` de internet. Un cliente directo no elige su IP.
- El límite de 5 / 15 minutos no se amplía ni se reduce en producción.
- No registrar contraseñas ni el contenido de `Authorization` al contar intentos.

---

## Qué no reabrir

- El seed de desarrollo no corre en el arranque del contenedor.
- El bootstrap no pisa usuarios existentes.
- La validación de producción rechaza passwords triviales y JWT de ejemplo.
- El límite de login de 5 intentos / 15 minutos ya existe.
- Helmet ya está registrado.
