# Análisis y Equivalencia de Diseño (Stitch vs Current)

Este documento detalla el análisis del diseño propuesto en `/design-references/stitich/code.html` y su mapeo a los componentes actuales en Next.js (`/src`). El objetivo es adoptar estrictamente **la estética visual (UI/UX)** sin alterar el backend, esquema de Supabase, ni la lógica multi-tenant.

## 1. Tabla de Equivalencias: Componentes Principales

| Componente Actual (Next.js) | Componente Visual en Stitch | Acción Propuesta para Reinterpretación |
| :--- | :--- | :--- |
| **`AppLayout.tsx` (Sidebar Lateral)** | Top Header + Bottom Footer NavBar. | **Adaptación Mixta**: Mantendremos el `AppLayout` actual para no romper rutas, pero re-estilizaremos el `Sidebar` para que use la misma paleta oscura/clara (`bg-slate-900`) y fuentes propuestas en Stitch. |
| **`pos/page.tsx` (Contenedor Principal)** | Contenedor flex con fondo `bg-background-light`. | Se ajustará el fondo general en `globals.css` a las variables root (`--background-light`). |
| **Barra de Búsqueda de Productos** | `<input>` redondeado con ícono `qr_code_scanner` y borde dinámico. | Portar clases de Tailwind (e.g., focus ring primario, bordes suaves `rounded-2xl`) al input actual en `pos/page.tsx`. |
| **Filtros de Categoría (No implementado)** | Botones de desplazamiento horizontal (`All Items`, `Cases`). | **Nuevo sub-componente visual**: Se agregarán los botones visuales de categorías encima de la grilla de productos, filtrando en memoria el objeto estático (para el MVP). |
| **Grilla de Productos** | `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`. | Actualizar responsividad del CSS actual a este comportamiento más fluido y apretado. |
| **Tarjeta de Producto (`Product Card`)** | Card con `aspect-[4/3]`, imagen en hover (`hover:scale-105`), etiquetas de stock de colores. | Re-escribir las clases del botón-tarjeta en React. Incorporar el badge inferior (`text-[11px] font-bold text-red-600 bg-red-50...`) para el stock, reemplazando nuestros badges actuales. |
| **Barra Lateral del Carrito (`Cart Sidebar`)**| Panel derecho de `w-[420px]` con sombra fuerte (`shadow-2xl`). | Reemplazar clases de bordes rígidos por sombras integradas y el ancho a `420px`. Adoptar la cabecera del carrito. |
| **Item del Carrito** | Layout con imagen en recuadro miniatura (`w-14 h-14`), botones `+`/`-` cuadrados. | Modificar la lista `<ul>` en `pos/page.tsx` para agregar las miniaturas de imágenes y el control de cantidad como botones grises. |
| **Resumen del Carrito (Footer de Sidebar)**| Subtotal, Impuestos, Descuentos explícitos y botón azul gigante. | Integrar la vista desglosada y el botón principal `bg-primary` ("Cobrar" en lugar de "Proceed to Pay"). Se conservará el llamado al Modal actual. |

## 2. Paleta de Colores y Tipografía a Portar
Como no copiaremos el HTML/CSS, los "tokens de diseño" de Stitch serán trasladados a nuestro `tailwind.config.ts` o variables en `globals.css`:
- **Color Primario**: `#137fec` (Reemplazará nuestro tono Esmeralda actual en la caja).
- **Fondos**: `background-light` (`#f6f7f8`) y `background-dark` (`#101922`).
- **Fuente**: `Inter` (ya usada, pero se forzará `font-display`).
- **Iconos**: Se mantendrá `lucide-react` para no ensuciar dependencias, mapeando los iconos de `material-symbols-outlined` a sus equivalentes exactos en Lucide.

## 3. Restricciones a Respetar en la Reescritura
- **Cero cambios en API o Supabase**: La lógica de cálculo `cart.reduce`, manejo de estado `useState`, y funciones de agregar/quitar quedan intactas.
- **Rutas intactas**: Seguirá viviendo todo en `/src/app/pos/page.tsx`.
- **Performance**: Las clases pesadas de hover y animaciones no agregarán scripts extra, solo directivas estrictamente de CSS (Tailwind).

---
*Este documento fue creado como paso preliminar. A la espera de confirmación del operario antes de efectuar los cambios en el código Next.js.*
