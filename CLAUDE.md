# Setter CRM

Frontend estático single-page para que un setter llame a clientes y registre estados. Cero backend propio: lee/escribe Google Sheet directamente vía Google Apps Script. Hosteado gratis en GitHub Pages.

## URL en vivo

**https://dgarciacavero.github.io/CRM/xK9mQr7vNp4wLs2j/**

Password gate (SHA-256 hash en cliente). Default password: `mihueco`.

Root del repo (`/CRM/`) devuelve 404 — solo el path con token sirve la app.

## Arquitectura

```
[Setter browser]
      │
      ├─► GitHub Pages (HTML/CSS/JS estático)
      │
      └─► fetch GET → Google Apps Script
                            │
                            └── Google Sheet "CRM" (en Drive del owner)
```

Sin servidor, sin DB, sin coste. Apps Script desplegado como Web App con "Acceso: Cualquier usuario" para evitar OAuth en el cliente.

## Stack

- HTML monolítico + Tailwind CDN + JS vanilla (sin frameworks ni build step)
- Auth: SHA-256 password hash en `CONFIG.PASSWORD_HASH`, sesión en `localStorage`
- API: GET requests al Apps Script (evita CORS preflight de POST)
- Tema oscuro, desktop-first (no mobile)

## Estructura

```
setter-crm/
├─ xK9mQr7vNp4wLs2j/      ← path token, único punto entrada
│  └─ index.html          ← app entera (HTML+CSS+JS embebido)
├─ apps-script/
│  └─ Code.gs             ← código del backend (subir manual a script.google.com)
├─ scripts/
│  ├─ migrate_add_estado.py  ← (1 vez) añade columna Estado al CRM.xlsx local
│  └─ hash_password.py       ← genera SHA-256 de una password nueva
├─ .nojekyll              ← evita render Jekyll, root 404
├─ .gitignore
├─ README.md              ← setup paso a paso para nuevo deploy
└─ CLAUDE.md              ← este archivo
```

## CONFIG actual (`xK9mQr7vNp4wLs2j/index.html`)

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbza6lBNwESi2WXwSNDeh3ejAGjg2PrFcOCXXuAz4kaoQSImF7ayszE07VNeZtyTv9L0/exec',
  PASSWORD_HASH:   'd91f28ae72577f374b82ef9a3498ea8fe90a62605b05231ddb752fc1087ad8c1'
                   // = SHA-256('mihueco')
};
```

Sheet ID detrás del Apps Script: `1El_jPkvmne7bUcOrYDF0qS6aA0xyIDgwl7gP4-2nY2I`

## Funcionalidad

**Search + filtros acumulables (chips):**
- Reservas: Sin reservas, Booksy, Treatwell, Fresha, Calendly, Con reservas
- Estado: Sin contactar, Contactado, No interesa, Interesado, Reunión agendada

Lógica: dentro de misma categoría = OR, entre categorías = AND, junto con búsqueda libre (Nombre/Tlfn/Comentario/Otro contacto/Tipo).

**Tabla columnas:**
Nombre | Tipo | Tlfn (tel: + copiar) | Reservas (badge color) | Estado (dropdown auto-save) | Comentario | Editar

**Estado dropdown:**
Cambio guarda inmediatamente vía Apps Script `update` action. Color cambia in-place según valor.

**Modal Edit:**
Edita todos los campos incluido `Otro contacto`, link a Google Maps. Save → guardado en Sheet.

**Stats header:**
Total, Sin contactar, Interesados, Reunión agendada — calculados local sobre `state.rows`.

## API Apps Script

Una sola URL (`/exec`), distingue por `?action=`:

| Action | Params | Devuelve |
|--------|--------|----------|
| `getData` | — | `{ok, rows[], headers[]}` con `_row` = índice 1-based |
| `update` | `row=N&data=ENCODED_JSON` | `{ok}` |
| `append` | `rows=ENCODED_JSON` | `{ok, added, skipped, total_rows}` — dedup por Link |
| `delete` | `link=URL` | `{ok, deleted}` |

Todas GET para evitar CORS preflight. `data` es JSON URL-encoded.

Código en `apps-script/Code.gs`. Para actualizar:
1. Sheet → Extensiones → Apps Script
2. Pegar nuevo código
3. **Implementar → Administrar implementaciones** (NO Nueva) → editar versión → Implementar
4. URL se mantiene

## Seguridad

Tres capas de oscuridad/gating:

1. **URL token** `/xK9mQr7vNp4wLs2j/` — root `/CRM/` 404
2. **Apps Script URL** — `AKfycbza6...VeZtyTv9L0/exec` también unguessable
3. **Password gate** — SHA-256, sesión `localStorage`

**No es seguridad real:**
- Repo es público → HTML+JS visibles → Apps Script URL pública
- Atacante con la URL puede fuerza-brutar el hash localmente (password débil = crackeable)
- Apps Script con acceso "Cualquier usuario" = quien tenga la URL escribe el Sheet

Para un setter de confianza es práctico. Si datos fueran sensibles: migrar a Cloudflare Pages + Access (gratis, auth real por email).

## Workflow de cambios

Cambios al HTML → commit → push → GitHub Pages rebuilds (~1-2 min):

```bash
git add . && git commit -m "..." && git push
gh api repos/dgarciacavero/CRM/pages/builds/latest  # check status
```

Cambios al Apps Script → editar en script.google.com → Administrar implementaciones → editar deploy.

Cambio de password:
```bash
python scripts/hash_password.py
# pegar hash en CONFIG.PASSWORD_HASH, commit, push
```

## Proyecto hermano: CRM (scraper)

`../CRM/` — proyecto del scraper de Google Maps + servidor local del owner. Comparte el **mismo Google Sheet**. Cuando el owner añade negocios desde el scraper (modo Normal), aparecen en este frontend al refrescar. Cuando el setter cambia un Estado/Comentario aquí, el owner lo ve en su CRM viewer también.

Modo Josep del CRM principal NO toca el Sheet → no aparece en setter-crm.

## Estructura de datos esperada (Sheet)

Columnas en orden exacto:
```
Nombre | Tipo | Reservas | Tlfn | Link | Otro contacto | Comentario | Estado
```

Si se reordena/renombra, romper el frontend porque acceso es por nombre de columna (header) pero algunas lógicas (badges, dropdowns) usan los valores exactos como aparecen aquí. Cambiar también los arrays `ESTADOS`, `RESERVAS_VALUES` en JS.

## Detalles técnicos varios

- Las requests al Apps Script siguen un redirect 302 a `script.googleusercontent.com` — `fetch` lo hace solo con `redirect: 'follow'`.
- Apps Script `setValue` flush con `SpreadsheetApp.flush()` para escritura síncrona.
- `_row` devuelto desde Apps Script = `index + 2` (header en fila 1, datos desde fila 2).
- Login persiste en `localStorage` key `setter_crm_auth = '1'`. Botón "Cerrar sesión" limpia y recarga.
- Toast notifications con auto-hide a 2.5s, queue básico (timer reset).

## Gotchas conocidos

- Apps Script deploy nuevo (vs editar) cambia URL → hay que actualizar `CONFIG.APPS_SCRIPT_URL`.
- Si el Sheet pierde la columna `Estado`, el frontend asume "Sin contactar" pero los guardados a `Estado` se ignoran silenciosamente (Apps Script salta cols inexistentes).
- Latencia Apps Script ~1-2s por request. Indicador "Guardando..." mientras escribe.
- GitHub Pages tarda ~1-2 min en propagar tras push.
