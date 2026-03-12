process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

https.get('https://yanhei.synology.me:8443/webhook/fetch-global-review?year=2026', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            if (parsedData.orders && parsedData.orders.length > 0) {
                console.log("First order keys:", Object.keys(parsedData.orders[0]));
                if (parsedData.orders[0].Raw_Form_State) {
                    console.log("Raw_Form_State is present!");
                } else {
                    console.log("Raw_Form_State is MISSING.");
                }
            } else {
                console.log("No orders found.");
            }
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
