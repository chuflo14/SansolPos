import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing insert connection...");
    const { data, error } = await supabase.from('sales').insert([{
        store_id: '15408544-d830-4e3d-8bb3-419b48b99bb3', // test id
        cashier_id: '4f6e7032-8615-4e0b-88fc-e87316c5dfd4',
        total: 100,
        payment_method: 'Efectivo',
        status: 'COMPLETED'
    }]).select('id').single();

    console.log("Result:", data, error);
}
test();
