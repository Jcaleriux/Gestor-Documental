# EPIC-A-008 Onboarding E Instalacion Segura

## Estado

Hecho para el alcance inicial de FEAT-011. El trabajo posterior de administracion avanzada de roles/permisos queda como historia separada.

## Problema

Antes de FEAT-011, el bootstrap creaba usuarios demo con credenciales conocidas dentro de `seed.sql`. Eso servia para desarrollo local, pero no era aceptable como flujo normal de instalacion porque una base limpia debia quedar sin usuarios reales hasta que el primer administrador se registrara desde la app.

Al mismo tiempo, el sistema necesita conservar un catalogo minimo de roles y permisos para que el primer usuario pueda recibir `admin` y `acceso_total` sin depender de ediciones manuales en SQL.

## Usuario o area afectada

- administracion inicial del sistema
- seguridad operativa
- equipos que montan ambientes demo, desarrollo, preproduccion o produccion
- soporte tecnico que valida instalaciones limpias

## Resultado esperado

Una instalacion limpia permite crear el primer usuario administrador desde la UI, sin usuarios demo cargados por defecto y sin credenciales compartidas hardcodeadas. Despues de ese primer administrador, los usuarios se crean solo desde la administracion interna por usuarios con permisos suficientes.

## Decisiones de alcance

- El seed normal debe conservar roles, permisos y matriz base `roles_permisos`.
- Los usuarios demo deben salir del seed normal.
- Debe existir un seed demo opcional y explicito para ambientes donde se requiera una demo repetible.
- El primer flujo crea el primer usuario `admin` con `acceso_total`.
- El setup inicial no debe exigir crear sociedades; el admin puede crearlas despues desde la app.
- El setup inicial no debe autologuear al usuario; al terminar debe enviar al login.
- Los demas usuarios solo los crean admin o usuarios con rol/permisos suficientes.
- Las instalaciones existentes de prueba pueden resetearse; no hace falta preservar usuarios seed actuales.
- La politica de password debe ser mas fuerte que el minimo actual de 8 caracteres.
- Los smoke checks no deben depender de `admin@sendadocs.local` ni `SendaDocs2026!` por defecto.

## Fuera de alcance inicial

- Registro publico abierto de usuarios.
- Administracion completa de roles y permisos custom desde UI.
- Permisos adicionales por usuario que sobreescriban el rol.
- MFA o recuperacion de password.
- Migracion conservadora de instalaciones demo existentes.

## Trabajo posterior recomendado

Crear una historia separada para administrar roles y permisos desde UI:

- crear roles,
- asignar permisos a roles,
- asignar rol al usuario,
- y permitir excepciones de permisos por usuario si el negocio lo confirma.

Para FEAT-011 conviene mantener el catalogo base en SQL porque el sistema necesita un rol `admin` confiable antes de que exista administracion avanzada de roles.

## Nota Sobre Smoke Checks

`SMOKE_USER_EMAIL` y `SMOKE_USER_PASSWORD` son variables de entorno usadas por los smoke checks de release para iniciar sesion y probar endpoints protegidos. El script ya no cae a credenciales demo por defecto: cada entorno configurado debe entregar sus propias credenciales o, si la base esta limpia, se valida explicitamente que el onboarding esta pendiente.

## Historias candidatas

- FEAT-011: Onboarding inicial sin usuarios seed. Estado: `Hecho`.
- Historia futura: administracion avanzada de roles/permisos desde UI.

## Riesgos

- dejar una base limpia inaccesible si se retiran usuarios seed sin flujo de primer admin
- abrir un endpoint publico de setup que no se bloquee correctamente despues del primer usuario
- mezclar onboarding inicial con redisenio completo de roles/permisos
- mantener scripts de release que sigan intentando login con credenciales demo

## Validacion

- base limpia muestra pantalla de setup antes del login
- `GET /api/onboarding/status` indica si se requiere setup
- `POST /api/onboarding/setup` solo funciona si no existe admin/usuario activo
- el primer usuario queda como `admin` con `acceso_total`
- al terminar setup, la app redirige a login y permite autenticarse con las credenciales creadas
- crear usuarios posteriores requiere permisos internos
- seed normal no crea usuarios demo
- seed demo opcional solo se ejecuta de forma explicita
- smoke checks exigen credenciales por entorno o validan explicitamente el estado de onboarding
