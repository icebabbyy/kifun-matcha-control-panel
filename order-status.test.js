import test from 'node:test';
import assert from 'node:assert/strict';
import {orderButtons} from './order-status.js';
const id='6ea8336e-4e90-4e83-b9df-62e8cdb71f02';
test('Telegram actions fit callback limits and never offer paid before handoff',()=>{
 const actions=state=>orderButtons(id,state).inline_keyboard.flat().map(b=>b.callback_data.split(':')[1]);
 assert.deepEqual(actions('awaiting'),['accept','decline']);
 assert.deepEqual(actions('accepted'),['ready']);
 assert.deepEqual(actions('ready'),['complete']);
 for(const state of ['completed','declined'])assert.deepEqual(actions(state),[]);
 for(const state of ['awaiting','accepted','ready'])for(const b of orderButtons(id,state).inline_keyboard.flat())assert(Buffer.byteLength(b.callback_data)<=64);
});
