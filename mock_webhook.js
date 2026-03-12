const http = require('http');

const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        console.log(`[Webhook Received] ${req.method} ${req.url}`);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        try {
            const jsonBody = JSON.parse(body);
            console.log('Payload Body:', JSON.stringify(jsonBody, null, 2));
        } catch (e) {
            console.log('Raw Body:', body);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: "Mock webhook received" }));
    });
});

server.listen(8444, () => {
    console.log('Mock Webhook listening on port 8444...');
    console.log('Send test payload to http://localhost:8444/webhook/test to inspect.');
});
