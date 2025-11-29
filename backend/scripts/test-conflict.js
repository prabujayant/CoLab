const Y = require('yjs');

function testConflictResolution() {
    console.log('--- Testing CRDT Conflict Resolution ---');

    // 1. Setup two clients starting with same state
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText('monaco');
    const textB = docB.getText('monaco');

    textA.insert(0, 'Hello World');
    const update = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, update);

    console.log('Initial State:');
    console.log('Client A:', textA.toString());
    console.log('Client B:', textB.toString());

    // 2. Simulate concurrent edits (offline)
    console.log('\n--- Simulating Concurrent Edits ---');

    // Client A inserts "Beautiful " at index 6
    textA.insert(6, 'Beautiful ');
    console.log('Client A types: "Beautiful "');

    // Client B inserts "Cruel " at index 6 (same position!)
    textB.insert(6, 'Cruel ');
    console.log('Client B types: "Cruel "');

    console.log('\nState before sync:');
    console.log('Client A:', textA.toString());
    console.log('Client B:', textB.toString());

    // 3. Sync updates
    console.log('\n--- Syncing Clients ---');

    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docA, updateB);

    // 4. Verify convergence
    console.log('\nFinal State:');
    console.log('Client A:', textA.toString());
    console.log('Client B:', textB.toString());

    if (textA.toString() === textB.toString()) {
        console.log('\n✅ SUCCESS: Documents converged to identical state!');
        console.log('Result:', textA.toString());
    } else {
        console.error('\n❌ FAILURE: Documents diverged!');
    }
}

testConflictResolution();
