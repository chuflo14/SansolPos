import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjgtfrmolpjfcuzrcaum.supabase.co';
const supabaseKey = 'sb_publishable_jqBuKf8q54U7Vmk3tv6U5Q__0OpKU50';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    const { data, error } = await supabase.auth.signUp({
        email: 'sole@sansol.com',
        password: 'sole2026',
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully:', data.user?.email);
    }
}

createUser();
