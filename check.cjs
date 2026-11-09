const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8');
const context={URL,Intl,Date,console,document:{getElementById:()=>({value:'score'})}};vm.createContext(context);
vm.runInContext(source.slice(0,source.indexOf('let installPrompt;')),context);
vm.runInContext(`
const old={schema_version:1,cars:[{id:'a',price:6000,history:[{date:'2026-11-01',price:6000}]},{id:'b',price:6500}],favorites:['a','b'],events:[],settings:{maxPrice:17000,cityFilter:'city:рига'}};
const deleted=withoutCar(old,'a');valid(deleted);
const imported=merge(old,deleted);
if(imported.cars.some(c=>c.id==='a')||imported.favorites.includes('a'))throw Error('Resurrected deleted car');
if(imported.cars.length!==1||imported.favorites[0]!=='b'||imported.settings.cityFilter!=='city:рига')throw Error('Lost surviving data');
const restored=merge(JSON.parse(JSON.stringify(deleted)),old);
if(restored.cars.some(c=>c.id==='a'))throw Error('Lost deletion on transfer');
const fresh=merge({...old,cars:[{id:'c',price:7000}]},deleted);
if(!fresh.cars.some(c=>c.id==='c'))throw Error('New import broken');
if(SEARCH_PROFILE.maxPrice!==7000||SEARCH_PROFILE.minYear!==2014)throw Error('Profile mismatch');
let rejected=false;try{valid({...old,settings:{deletedIds:[42]}})}catch{rejected=true}if(!rejected)throw Error('Invalid deletion accepted');
`,context);
console.log('PASS: delete, favorites, repeated import, export transfer, new records, profile, validation');
for(const p of ['index.html','app.js','sw.js'])assert(fs.readFileSync(p,'utf8').includes('2.0.4'));
