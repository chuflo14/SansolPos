import * as fs from 'fs';
import * as Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjgtfrmolpjfcuzrcaum.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jqBuKf8q54U7Vmk3tv6U5Q__0OpKU50';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const csvPath = 'C:\\Users\\chuflo\\Downloads\\export_items.csv';
const storeId = '3cf37499-4a02-4332-b590-1231679da41f';

async function run() {
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
            name: name,
            category: category,
            sku: sku,
            sale_price: salePrice,
            cost_price: cost,
            current_stock: Math.round(stock)
        });
    }

    console.log(`Found ${uniqueCategories.size} categories and ${products.length} products.`);

    // insert categories
    const categoriesArray = Array.from(uniqueCategories).map(name => ({ store_id: storeId, name }));
    for (const cat of categoriesArray) {
        // use upsert or just ignore errors on conflict
        const { error } = await supabase.from('categories').insert([cat]);
        if (error && !error.message.includes('duplicate key value')) {
            console.error('Error inserting category:', error);
        }
    }
    console.log('Categories inserted.');

    // insert products in chunks
    const chunk = 50;
    for (let i = 0; i < products.length; i += chunk) {
        const pChunk = products.slice(i, i + chunk);
        const { error } = await supabase.from('products').insert(pChunk);
        if (error) {
            console.error('Error inserting products:', error);
        } else {
            console.log(`Inserted products ${i} to ${i + pChunk.length}`);
        }
    }
    console.log('Done!');
}

run().catch(console.dir);
