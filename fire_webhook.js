const https = require('https');

const data = JSON.stringify({
    action: "create",
    Order_ID: "0999999",
    Customer_Name: "AI_NODEJS_UTF8_TEST",
    Deposit: 500,
    Balance: 1500,
    Additional_Fee: 0,
    Raw_Form_State: '{"momName":"AI_NODEJS_UTF8_TEST"}',
    Order_Items_List: [
        { Order_Item_Key: "0999999_P_MAIN", Product_Name: "木框套裝 (4肢)", Quantity: 1, Notes: "Node.js UTF8 Test" }
    ]
});

const options = {
    hostname: 'yanhei.synology.me',
    port: 8443,
    path: '/webhook/1444800b-1397-4154-b2da-a4d328c6c51b',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
    },
    rejectUnauthorized: false // Skip SSL for test
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (d) => { responseBody += d; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${responseBody}`);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(data);
req.end();
