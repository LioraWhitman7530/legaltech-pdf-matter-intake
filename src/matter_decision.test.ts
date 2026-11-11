import assert from 'node:assert/strict';
import {intakeSchema} from './matter_service.js';
const valid = {matterId:'m-1', clientName:'Example Legal', signedPdfBase64:'pdf', deadline:'2026-12-01'};
assert.equal(intakeSchema.parse(valid).deadline, '2026-12-01');
assert.throws(() => intakeSchema.parse({...valid, deadline:'tomorrow'}));
console.log('matter intake validation: pass');
