const http = require('http');

http.get('http://localhost:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const targets = JSON.parse(body);
      console.log('Targets:', targets.map(t => ({ title: t.title, url: t.url })));
      
      const pageTarget = targets.find(t => t.url.includes('localhost:8080') || t.url.includes('127.0.0.1:8080'));
      if (!pageTarget) {
        console.error('No localhost:8080 page target found!');
        process.exit(1);
      }
      
      const wsUrl = pageTarget.webSocketDebuggerUrl;
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new global.WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to debugger WebSocket!');
        ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Console.messageAdded') {
          console.log('[BROWSER CONSOLE]', msg.params.message.level, ':', msg.params.message.text);
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.exception.description);
        }
        if (msg.method === 'Log.entryAdded') {
          console.log('[BROWSER LOG]', msg.params.entry.level, ':', msg.params.entry.text);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WS ERROR:', err.message);
      };
      
      setTimeout(() => {
        console.log('Log capture finished.');
        ws.close();
        process.exit(0);
      }, 4000);
      
    } catch (err) {
      console.error('Error parsing targets:', err.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching targets:', err.message);
  process.exit(1);
});
