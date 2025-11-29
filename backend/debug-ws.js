const WebSocket = require('ws');
console.log('WebSocket:', WebSocket);
console.log('WebSocket.WebSocketServer:', WebSocket.WebSocketServer);
console.log('WebSocket.Server:', WebSocket.Server);
try {
    new WebSocket.WebSocketServer({ noServer: true });
    console.log('WebSocket.WebSocketServer is a constructor');
} catch (e) {
    console.log('WebSocket.WebSocketServer error:', e.message);
}
try {
    new WebSocket.Server({ noServer: true });
    console.log('WebSocket.Server is a constructor');
} catch (e) {
    console.log('WebSocket.Server error:', e.message);
}
