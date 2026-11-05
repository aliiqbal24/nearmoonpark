import {mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
const sandboxTemp=resolve('.sites-runtime/sandbox-temp');await mkdir(sandboxTemp,{recursive:true});process.env.TMPDIR=sandboxTemp;
const {Sandbox,DEFAULT_ACCOUNT_ID,DEFAULT_PRIVATE_KEY}=await import('near-sandbox');
import {Account,JsonRpcProvider,KeyPair,KeyPairSigner} from 'near-api-js';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const sandbox=await Sandbox.start({});
try{
 const p=new JsonRpcProvider({url:sandbox.rpcUrl});const root=new Account(DEFAULT_ACCOUNT_ID,p,KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY));
 const accounts=[];
 for(const prefix of ['colony','alice','bob']){const key=KeyPair.fromRandom('ed25519');const id=`${prefix}.${root.accountId}`;await root.createAccount({newAccountId:id,publicKey:key.getPublicKey(),nearToTransfer:20000000000000000000000000n});accounts.push(new Account(id,p,new KeyPairSigner(key)))}
 const [contract,alice,bob]=accounts;
 await contract.deployContract(new Uint8Array(await readFile('target/wasm32-unknown-unknown/release/last_signal_contract.wasm')));
 const call=(account,methodName,args)=>account.callFunction({contractId:contract.accountId,methodName,args,gas:250000000000000n,waitUntil:'FINAL'});
 await call(contract,'new',{sponsor:root.accountId});await call(root,'register_player',{account_id:alice.accountId});
 let state=await call(alice,'create_run',{scenario_id:'last-signal-v1',seed:42,request_id:'sandbox'});
 assert.deepEqual(await call(alice,'create_run',{scenario_id:'last-signal-v1',seed:42,request_id:'sandbox'}),state);
 await assert.rejects(()=>call(bob,'step',{run_id:state.run_id,expected_revision:0,command:{kind:'choice',option:0,target:0},max_sols:3}));
 for(const option of [0,1,0,0,0,0,2,0]){state=await call(alice,'step',{run_id:state.run_id,expected_revision:state.run.revision,command:{kind:'choice',option,target:0},max_sols:3});}
 assert.equal(state.run.ending,'A New Dawn');
 await assert.rejects(()=>call(alice,'step',{run_id:state.run_id,expected_revision:0,command:{kind:'advance'},max_sols:1}));
 console.log('Sandbox: admission, duplicate creation, unauthorized owner, eight choices, 24 sols, ending, stale revision passed.');
}finally{await sandbox.tearDown()}
