const awarenessProtocol = require('y-protocols/awareness');
console.log('awarenessProtocol:', awarenessProtocol);
console.log('Awareness:', awarenessProtocol.Awareness);

const Y = require('yjs');
const doc = new Y.Doc();
const awareness = new awarenessProtocol.Awareness(doc);
console.log('Awareness instance:', awareness);
console.log('getStates:', awareness.getStates());
console.log('getStates type:', typeof awareness.getStates());
console.log('getStates is Map:', awareness.getStates() instanceof Map);
