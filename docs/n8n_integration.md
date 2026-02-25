# Manual de Integración n8n: SansolPos

## Introducción
SansolPos expone una API REST moderna asegurada mediante llaves API estáticas (API Keys). Está diseñada específicamente para que n8n o herramientas de automatización similares puedan extraer datos o reaccionar ante eventos en tiempo real mediante Webhooks.

## 1. Configurar Autenticación
Cada tienda (store_id) dispondrá de un `API_KEY` único.
1. Incluya en las peticiones HTTP el encabezado:
   `Authorization: Bearer <API_KEY>`

## 2. Endpoints Disponibles

### GET /api/sales
Retorna la sumatoria de las ventas, o el detalle si se especifican las fechas.
**Respuesta (Ejemplo):**
```json
{
  "totalVentas": 150000.50,
  "moneda": "ARS",
  "ventas": [
     {
       "id": "abc-123",
       "fecha": "2026-02-25T10:00:00Z",
       "total": 5000,
       "estado": "COMPLETED"
     }
  ]
}
```

### GET /api/products
Lista el inventario activo.
```json
[
  { "id": "1", "nombre": "Coca Cola 2L", "precio_venta": 3500, "stock": 40 }
]
```

### GET /api/stock
Consulta el stock crítico o bajo el mínimo. Utilidad clave para crear tickets Automáticos de "Pedido al Proveedor".

### GET /api/dashboard
Resumen consolidado listo para informes PDF (Ventas, Gastos y Margen).

### GET /api/sales/by-phone
Usado frecuentemente junto a un trigger HTTP de chat. Si se recibe un WhatsApp pidiendo "Mi último recibo", este endpoint buscará mediante el `customer_phone`.

---

## 3. Webhooks

SansolPos dispara Webhooks HTTP POST a una URL pre-configurada (el Webhook URL de su flujo n8n).

1. `sale_created`: Gatillado al cobrar. Payload incluye detalle de la compra. Útil para CRM.
2. `sale_canceled`: Gatillado al cancelar facturas. Útil para contabilidad.
3. `stock_low`: Gatillado tras una venta que redujo el stock de un item por debajo del mínimo indicado. Útil para enviar Email de resurtido automático.
4. `expense_created`: Gatillado al asentar un gasto de caja chica.
