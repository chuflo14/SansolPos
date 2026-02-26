import * as fs from 'fs';
import * as Papa from 'papaparse';

const csvPath = 'C:\\Users\\chuflo\\Downloads\\export_items.csv';
const storeId = '3cf37499-4a02-4332-b590-1231679da41f';

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(csvRaw, { header: true, skipEmptyLines: true });

const uniqueCategories = new Set<string>();
const products: any[] = [];

for (const row of parsed.data as any[]) {
    const name = row['Nombre']?.trim();
    const category = row['Categoria']?.trim() || 'Sin Categoría';
    const sku = row['REF']?.trim() || null;
    let cost = parseFloat(row['Coste']) || 0;
    
    let salePriceStr = row['Precio [Sansol]'];
    let salePrice = parseFloat(salePriceStr);
    if (isNaN(salePrice) && row['Precio por defecto'] && row['Precio por defecto'] !== 'variable') {
         salePrice = parseFloat(row['Precio por defecto']);
    }
    if (isNaN(salePrice)) salePrice = 0;
    
    let stock = parseFloat(row['En inventario [Sansol]']) || 0;
    if (isNaN(stock)) stock = 0;

    if (!name) continue;

    uniqueCategories.add(category);
    products.push({
        store_id: storeId,
        name: name.replace(/'/g, "''"),
        category: category.replace(/'/g, "''"),
        sku: sku ? sku.replace(/'/g, "''") : null,
        sale_price: salePrice,
        cost_price: cost,
        current_stock: Math.round(stock)
    });
}

let sql = '';
for (const cat of uniqueCategories) {
    const formattedCat = cat.replace(/'/g, "''");
    sql += `INSERT INTO categories (store_id, name) SELECT '${storeId}', '${formattedCat}' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '${formattedCat}' AND store_id = '${storeId}');\n`;
}

for (const p of products) {
    sql += `INSERT INTO products (store_id, name, category, sku, sale_price, cost_price, current_stock) VALUES ('${p.store_id}', '${p.name}', '${p.category}', ${p.sku ? `'${p.sku}'` : 'NULL'}, ${p.sale_price}, ${p.cost_price}, ${p.current_stock});\n`;
}

fs.writeFileSync('C:\\Users\\chuflo\\Downloads\\import.sql', sql);
console.log('SQL Generated: ' + products.length + ' products');
