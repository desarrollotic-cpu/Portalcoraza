const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testExportRealAuth() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://duxpqkldgdnfcabpkogl.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('Logging in / getting session token...');
  // Let's test calling the API using service role / anon or admin login
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  
  if (uErr) {
    console.error('Supabase admin error:', uErr);
    return;
  }
  
  console.log('Found users:', users.length);
  const adminUser = users.find(u => u.email.includes('admin')) || users[0];
  console.log('Using admin user:', adminUser.email, adminUser.id);
  
  // Generate session / token for adminUser
  // Or test endpoint directly
  const res = await fetch(`https://portalcoraza.onrender.com/api/v1/scheduling/monthly/payroll-recargos/export-excel?year=2026&month=8`, {
    headers: {
      'Authorization': `Bearer ${adminUser.id}` // Wait! How is the JWT structured in NestJS?
    }
  });

  console.log('Endpoint response status:', res.status);
  const body = await res.text();
  console.log('Endpoint response body:', body.slice(0, 300));
}

testExportRealAuth().catch(console.error);
