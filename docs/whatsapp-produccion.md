# Activar WhatsApp Cloud API en Producción — SANSOL POS

> **Estado actual:** El botón de WhatsApp funciona correctamente en el código.
> El único bloqueante es que la cuenta de Meta está en **modo sandbox** (prueba).
> Para pasar a producción se necesita un número de teléfono dedicado para el negocio.

---

## ✅ Lo que ya está hecho

- [x] Código corregido y funcionando (`CheckoutModal.tsx`, `route.ts`, `cloud.ts`)
- [x] Token de WhatsApp Cloud activo y válido
- [x] Phone Number ID configurado: `1035309842995991`
- [x] Variables de entorno en `.env.local` configuradas
- [x] Errores de Meta correctamente manejados y mostrados al usuario

---

## 🔴 Bloqueante actual

El número que se intentó agregar ya tenía WhatsApp personal instalado.
Meta no permite usar el mismo número en dos lugares a la vez.

**Solución:** Conseguir un número dedicado para SANSOL (SIM prepaga nueva o fijo del negocio).

---

## 📋 Pasos para continuar (cuando se tenga el número)

### PASO 1 — Agregar el número en Meta Developers

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Seleccionar la app de SANSOL
3. Menú izquierdo → **"Conectar en WhatsApp" → "Configuración"**
4. Clic en **"Crear cuenta"** (sección "Crea una cuenta de WhatsApp Business")
5. Elegir la cuenta de Business Manager existente
6. Ingresar el número nuevo (que nunca tuvo WhatsApp)
7. Verificar con el código SMS (o llamada si es fijo)
8. Anotar el nuevo **Phone Number ID** que aparece después de verificar

> ⚠️ El número debe ser de Argentina (+54) y **nunca haber tenido WhatsApp instalado**.

---

### PASO 2 — Crear token de acceso permanente

El token actual **vence periódicamente**. Hay que crear uno permanente:

1. Ir a [business.facebook.com/settings](https://business.facebook.com/settings)
2. Menú izquierdo → **"Usuarios del sistema"**
3. Clic en **"Agregar"**
   - Nombre: `sansol-pos-bot`
   - Rol: `Administrador`
4. Clic en **"Generar token"**
   - Seleccionar la app de SANSOL
   - Activar permisos:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
5. Copiar el token generado (empieza con `EAA...`)

---

### PASO 3 — Actualizar `.env.local`

Reemplazar los valores actuales con los nuevos:

```env
WHATSAPP_ACCESS_TOKEN=PEGAR_TOKEN_PERMANENTE_AQUI
WHATSAPP_PHONE_NUMBER_ID=PEGAR_PHONE_NUMBER_ID_NUEVO_AQUI
WHATSAPP_GRAPH_API_VERSION=v22.0
```

---

### PASO 4 — Reiniciar y probar

```bash
# Detener el servidor actual (Ctrl+C) y reiniciar
npm run dev
```

1. Ir al POS → hacer una venta de prueba
2. En la pantalla de éxito → ingresar un número de WhatsApp real
3. Clic en **"WhatsApp"**
4. Verificar que el comprobante llegue al celular

---

### PASO 5 — Deploy a producción (Vercel)

Una vez que funcione localmente:

1. Ir a [vercel.com](https://vercel.com) → proyecto SANSOL
2. **Settings → Environment Variables**
3. Actualizar:
   - `WHATSAPP_ACCESS_TOKEN` → token permanente nuevo
   - `WHATSAPP_PHONE_NUMBER_ID` → ID del número nuevo
4. Hacer redeploy

---

## 📌 Datos actuales (modo prueba)

| Variable | Valor actual |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | `1035309842995991` |
| `WHATSAPP_GRAPH_API_VERSION` | `v22.0` |
| `WHATSAPP_ACCESS_TOKEN` | Ver `.env.local` (token temporal, puede vencer) |
| Número de prueba de Meta | `+1 (555) 155-9147` |

---

## 🛒 Opción mientras se consigue el número

Mientras no se tenga el número de producción, se pueden agregar hasta **5 números** a la lista de prueba para testear:

1. [developers.facebook.com](https://developers.facebook.com) → app → WhatsApp → **Prueba de API**
2. En el campo **"To"** → clic en **"Administrar lista de números de teléfono"**
3. Agregar el número → el dueño recibe un código por WhatsApp y lo confirma
4. ✅ Ese número puede recibir comprobantes de prueba sin ningún cambio en el código

---

## 🔧 Referencia técnica

- **API utilizada:** WhatsApp Cloud API (Meta Graph API v22.0)
- **Archivo lógica cliente:** `src/components/pos/CheckoutModal.tsx` → función `shareWhatsApp()`
- **API Route:** `src/app/api/whatsapp/send-receipt/route.ts`
- **Lógica Meta Cloud:** `src/lib/whatsapp/cloud.ts` → función `sendWhatsAppReceipt()`
- **Error sandbox:** Meta code `131030` → "Recipient phone number not in allowed list"
