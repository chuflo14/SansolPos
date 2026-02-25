# Documento de Preparación: Facturación Electrónica AFIP

## Propósito
Este documento certifica que el modelo de datos de **SansolPos** fue planificado arquitectónicamente para integrar la facturación automática hacia AFIP WSFEv1 (Web Service Factura Electrónica API) cuando el negocio lo determine.

## Estructura Actual en Base de Datos
La tabla `sales` ya posee campos dedicados exclusivament a AFIP que permanecen nulos o vacíos en la primera etapa del proyecto:
- `afip_type`: (Ej: 'Factura B', 'Factura C')
- `afip_point_of_sale`: Punto de venta registrado en AFIP (Ej: 0001).
- `afip_invoice_number`: Número correlativo de la factura (Ej: 00000045).
- `afip_cae`: Código de Autorización Electrónico emitido por AFIP. Única prueba de validez legal.
- `afip_cae_expiration`: Fecha de vencimiento del CAE emitido.
- `afip_status`: 'PENDING', 'APPROVED', 'REJECTED'.

## La Tabla de Configuraciones
La tabla `store_settings` contiene los datos tributarios paramétricos que figurarán en el comprobante:
- `receipt_business_name`: Nombre o Razón Social (Ej: Sansol S.A.).
- `receipt_cuit`: Número de CUIT de la organización que emite la factura (20-XXXXXXXX-X).
- `receipt_address`: Domicilio Comercial completo declarado en AFIP.

## Flujo Futuro Recomendado de Implementación
1.  **Frontend**: Agregar en el Checkout la opción de seleccionar "Facturar (B/C)" o "Solo Recibo Interno".
2.  **Backend**: Instalar un SDK para AFIP en Node (ej. `afip.js`). Cargar en el entorno de producción los certificados `.crt` y la clave `.key` emitidos a nombre de SansolPos.
3.  **Proceso**: Al hacer click en "Cobrar", si la facturación AFIP está activada, el Backend enviará el lote al *WSFEv1*. Retornará el CAE de forma síncrona.
4.  **Guardado**: Modificará los campos `afip_*` en la tabla `sales`.
5.  **Impresión**: El componente `Receipt` leerá estos campos. Si no son nulos, inyectará el número de CAE, Vencimiento y generará el formato estándar legalizado por AFIP con el QR interbancario de validación fiscal vigente a partir de 2021.
