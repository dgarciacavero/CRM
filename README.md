# Setter CRM

Frontend estático para que un setter llame a clientes del CRM. Lee/escribe contra Google Sheets vía Google Apps Script. Sin servidores, sin coste. Se hostea gratis en GitHub Pages con URL token + contraseña.

## Estructura

```
setter-crm/
├─ xK9mQr7vNp4wLs2j/      ← token URL (renombrar si se quiere)
│  └─ index.html          ← frontend
├─ apps-script/
│  └─ Code.gs             ← pegar en script.google.com
├─ scripts/
│  ├─ migrate_add_estado.py  ← añade columna Estado al Excel local
│  └─ hash_password.py       ← genera hash SHA-256 para la contraseña
├─ .nojekyll              ← evita render Jekyll en GitHub Pages
└─ README.md
```

## Setup paso a paso

### 1. Preparar Excel
```bash
python scripts/migrate_add_estado.py
```
Esto añade columna `Estado` = "Sin contactar" a todas las filas existentes de `CRM.xlsx`.

### 2. Subir a Google Sheets
- Abrir Google Drive → carpeta CRM
- Click derecho sobre `CRM.xlsx` → **Abrir con → Hojas de cálculo de Google**
- Se crea una copia como Google Sheet. Renombrar pestaña a `CRM` si no se llama así.
- Copiar el ID del sheet de la URL: `docs.google.com/spreadsheets/d/[ESTE_ID]/edit`

### 3. Apps Script
- En el Sheet: **Extensiones → Apps Script**
- Borrar contenido por defecto, pegar `apps-script/Code.gs`
- Guardar (Ctrl+S)
- **Desplegar → Nuevo despliegue**
  - Tipo: **Aplicación web**
  - Ejecutar como: **Yo**
  - Acceso: **Cualquier usuario**
- Copiar la **URL del despliegue** (acaba en `/exec`)

### 4. Configurar frontend
Editar `xK9mQr7vNp4wLs2j/index.html`, en `CONFIG`:

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
  PASSWORD_HASH: 'HASH_AQUI'
};
```

Generar `PASSWORD_HASH`:
```bash
python scripts/hash_password.py
```
Pegar el hash que escupe.

### 5. Cambiar token URL (opcional pero recomendado)
Renombrar carpeta `xK9mQr7vNp4wLs2j` por otro string largo aleatorio. Ese será el path "secreto".

### 6. Publicar en GitHub Pages
```bash
git init
git add .
git commit -m "Initial setter CRM frontend"
gh repo create setter-crm --public --source=. --push
```
Después en el repo en GitHub: **Settings → Pages → Source: main / root → Save**

URL final: `https://<usuario>.github.io/setter-crm/xK9mQr7vNp4wLs2j/`

## Seguridad

Dos capas de oscuridad + contraseña:
1. **URL token**: `/xK9mQr7vNp4wLs2j/` — root del repo da 404, sólo el token sirve la app
2. **Apps Script URL**: también unguessable (ID de despliegue largo)
3. **Password hash**: gate en el frontend, hash SHA-256 en código (no plaintext)

**No es seguridad real**: cualquiera que vea el código JS ve la URL del Apps Script. Para 1 setter de confianza es práctico. Si los datos fueran muy sensibles, migrar a Cloudflare Pages + Access (gratis, auth de verdad).

## Características

- Buscar por nombre / teléfono / comentario / tipo
- Chips filtro acumulables:
  - **Reservas**: Sin reservas, Booksy, Treatwell, Fresha, Calendly, Con reservas
  - **Estado**: Sin contactar, Contactado, No interesa, Interesado, Reunión agendada
- Tlfn clickable (`tel:`) + botón copiar
- Estado dropdown con auto-save al cambiar
- Modal de edición completa (todos los campos)
- Stats en vivo (total / sin contactar / interesados / reunión)
- Indicador "Guardando..." mientras escribe al Sheet

## Modificar contraseña

```bash
python scripts/hash_password.py
```
Pegar nuevo hash en `index.html` → `CONFIG.PASSWORD_HASH`, commit, push.

Sesión activa se persiste en `localStorage`. "Cerrar sesión" limpia y vuelve al gate.
