# Documentación Técnica: Sansol Pos Web

## Arquitectura del Proyecto
El proyecto `SansolPos` es una aplicación web transaccional diseñada con arquitectura **Multi-tenant** aislando la información a nivel de *Tienda* (Store).

### Tech Stack
- **Frontend / Backend**: Next.js 16 (App Router)
- **Estilos**: Tailwind CSS v4
- **Base de Datos & Auth**: Supabase (PostgreSQL)
- **Testing**: Playwright y Vitest (Planeado)
- **Infraestructura**: Despliegue en Vercel (Recomendado)

## Estructura de Datos (Supabase RLS)
El aislamiento multi-tenant se logra mediante **Row Level Security (RLS)**.
Todas las tablas principales incluyen la clave foránea `store_id` apuntando a la tabla `stores`.
Una función `user_in_store(check_store_id UUID)` valida que el usuario actual tenga permisos sobre dicha tienda mediante la tabla puente `store_users`.

### Esquema Resumido
1. `stores`: Contiene la información general de la tienda.
2. `users`: Enlazado a la autenticación de Supabase (`auth.users`).
3. `store_users`: Maneja roles locales en la tienda (admin, manager, cashier).
4. `products`: CRUD de inventario. Almacena precio normal, costo y control de stock mínimo.
5. `sales` & `sale_items`: Registro maestro-detalle de transacciones POS.
6. `stock_movements`: Log de auditoría inmutable del inventario (IN, OUT, SALE).
7. `expenses`: Registro de tickets de gastos menores por tienda.
8. `store_settings`: Configuración de impresión de la tienda (Logos, CUIT).

## Estructura de Componentes Clave
- `src/app/`: Estructura del enrutador App Router.
- `src/components/shared/Receipt.tsx`: Generador paramétrico de componentes React para comprobantes listos para impresoras térmicas y hojas A4, exportables a PDF.
- `src/lib/supabase/`: Clientes y Middleware de SSR para manejo de sesiones seguras.
