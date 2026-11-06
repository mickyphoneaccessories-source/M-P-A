const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function setup(){
 const calls=[],messages=[];
 const ctx=vm.createContext({document:{getElementById:()=>({value:'Habari wateja'}),querySelectorAll:()=>[]},navigator:{userAgent:'Android'},location:{href:''},toast:m=>messages.push(m),translateText:t=>t,confirm:()=>true,v96sendDarsms:async to=>{calls.push(to);return true},v94closeModal:()=>{}});
 vm.runInContext(html.slice(html.indexOf('let v99SmsRecipients='),html.indexOf('function openBulkSms(){')),ctx);
 vm.runInContext(html.slice(html.indexOf('function v95sendBulk(){'),html.indexOf('function v95copyBulk()')),ctx);
 vm.runInContext(html.slice(html.indexOf('async function v96bulkDarsms(){'),html.indexOf('async function v96remDarsms(){')),ctx);
 vm.runInContext(`v99SmsRecipients=[{name:'Asha',phone:'0711111111'},{name:'Juma',phone:'0722222222'},{name:'Rehema',phone:'0733333333'}]`,ctx);
 return {ctx,calls,messages};
}
test('SMS ya simu inatumwa kwa waliomakiwa pekee',()=>{const {ctx}=setup();vm.runInContext('v99toggleRecipient(1,true);v95sendBulk()',ctx);assert.equal(ctx.location.href,'sms:0722222222?body=Habari%20wateja')});
test('DarSMS inatumwa kwa waliomakiwa pekee',async()=>{const {ctx,calls}=setup();await vm.runInContext('v99toggleRecipient(0,true);v99toggleRecipient(2,true);v96bulkDarsms()',ctx);assert.deepEqual(Array.from(calls[0]),['0711111111','0733333333'])});
test('Chagua wote huchagua wote na kuondoa tiki moja huondoa mpokeaji huyo',()=>{const {ctx}=setup();vm.runInContext('v99selectAll(true);v99toggleRecipient(1,false)',ctx);assert.deepEqual(Array.from(vm.runInContext('v99selectedPhones().map(c=>c.phone)',ctx)),['0711111111','0733333333']);vm.runInContext('v99selectAll(false)',ctx);assert.equal(vm.runInContext('v99selectedPhones().length',ctx),0)});
test('Hakuna SMS inayotumwa bila wapokeaji',async()=>{const {ctx,calls}=setup();vm.runInContext('v95sendBulk()',ctx);await vm.runInContext('v96bulkDarsms()',ctx);assert.equal(ctx.location.href,'');assert.equal(calls.length,0)});
