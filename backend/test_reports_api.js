const axios = require('axios');

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

async function test() {
  try {
    // Login
    console.log('1. Logging in...');
    const loginRes = await api.post('/auth/login', {
      email: 'admin@mssrf.org',
      password: 'admin123'
    });
    console.log('✓ Login successful');
    const token = loginRes.data.token;
    console.log('Token:', token.substring(0, 50) + '...');

    // Set token for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Test demographic KPI
    console.log('\n2. Testing /reports/demographic-kpi...');
    const kpiRes = await api.get('/reports/demographic-kpi');
    console.log('✓ Demographic KPI:', JSON.stringify(kpiRes.data, null, 2));

    // Test social category
    console.log('\n3. Testing /reports/social-category...');
    const socialRes = await api.get('/reports/social-category');
    console.log('✓ Social Category:', JSON.stringify(socialRes.data, null, 2));

    // Test population pyramid
    console.log('\n4. Testing /reports/population-pyramid...');
    const pyramidRes = await api.get('/reports/population-pyramid');
    console.log('✓ Population Pyramid:', JSON.stringify(pyramidRes.data, null, 2));

    // Test income bracket
    console.log('\n5. Testing /reports/income-bracket...');
    const incomeRes = await api.get('/reports/income-bracket');
    console.log('✓ Income Bracket:', JSON.stringify(incomeRes.data, null, 2));

    // Test community KPI
    console.log('\n6. Testing /reports/community-kpi...');
    const commRes = await api.get('/reports/community-kpi');
    console.log('✓ Community KPI:', JSON.stringify(commRes.data, null, 2));

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

test();
