const axios = require('axios');

async function testServerAPI() {
  console.log('🔍 Debugging Server API Endpoints');
  console.log('=================================\n');

  const tests = [
    {
      name: 'Internal Server Status',
      url: 'http://localhost:3050/api/internal/server-status'
    },
    {
      name: 'Internal Server Players', 
      url: 'http://localhost:3050/api/internal/server-players'
    },
    {
      name: 'Authenticated Server Status',
      url: 'http://localhost:3050/api/status'
    },
    {
      name: 'Direct RedM Server Info',
      url: 'http://131.196.197.140:30120/info.json'
    },
    {
      name: 'Direct RedM Players',
      url: 'http://131.196.197.140:30120/players.json'
    }
  ];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    try {
      const response = await axios.get(test.url, { 
        timeout: 10000,
        validateStatus: () => true // Don't throw on HTTP errors
      });
      
      console.log(`✅ Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log(`📄 Data type: ${typeof response.data}`);
        if (typeof response.data === 'object') {
          console.log(`🔑 Keys: ${Object.keys(response.data).slice(0, 5).join(', ')}${Object.keys(response.data).length > 5 ? '...' : ''}`);
          
          // Show sample data for server status
          if (test.name.includes('Server Status') || test.name.includes('RedM Server Info')) {
            const data = response.data;
            console.log(`📊 Sample data:`);
            console.log(`   - Online: ${data.online}`);
            console.log(`   - Hostname: ${data.hostname || data.vars?.sv_hostname}`);
            console.log(`   - Players: ${data.players || 'N/A'}`);
            console.log(`   - Max Players: ${data.maxPlayers || data.vars?.sv_maxClients || 'N/A'}`);
          }
        }
      } else {
        console.log(`❌ Error: ${response.status} - ${response.statusText}`);
        if (response.data) {
          console.log(`📄 Error data: ${JSON.stringify(response.data).substring(0, 200)}`);
        }
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ HTTP Error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          console.log(`📄 Error data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused - service not running`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    console.log(''); // Empty line between tests
  }

  console.log('🎯 DIAGNOSIS:');
  console.log('If Internal Server Status fails but Direct RedM works:');
  console.log('  → Bot internal API has issues');
  console.log('If Direct RedM fails:');
  console.log('  → RedM server connection problems');
  console.log('If all fail:');
  console.log('  → Network/firewall issues');
}

testServerAPI().catch(error => {
  console.error('Script failed:', error.message);
});