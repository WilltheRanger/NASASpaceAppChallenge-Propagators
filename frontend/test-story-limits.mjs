import {createServer} from 'vite';
import assert from 'node:assert/strict';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {regionData,verdictHeadline}=await server.ssrLoadModule('/src/r2/data.ts');
 const cases=[['br-amazon',2024,'close',4.5],['br-amazon',2025,'outside',24.2],['br-cerrado',2024,'outside',15.5],['br-cerrado',2025,'outside',8.6],['ar-argentina',2022,'close',0.8],['ar-argentina',2024,'outside',10.7],['ar-argentina',2025,'close',7.3],['in-punjab-haryana',2022,'close',1.4]];
 for(const [id,year,label,dist] of cases){const y=regionData(id).years.find(y=>y.year===year);assert.equal(y.verdict,label);assert.equal(Number(y.pointsPast.toFixed(1)),dist);console.log(id,year,label,y.gap,y.edge,y.pointsPast);}
 for(const year of [2023,2024,2025]) {const y=regionData('in-punjab-haryana').years.find(y=>y.year===year);assert.equal(y.verdict,'na');assert.equal(y.pointsPast,null);}
 assert.match(verdictHeadline(regionData('ar-argentina')),/close call/);
 const ids=['br-amazon','br-cerrado','br-pantanal','ar-argentina','in-punjab-haryana','us-california'];
 assert.deepEqual(ids.filter(id=>regionData(id).years.find(y=>y.year===2025)?.verdict==='outside'),['br-amazon','br-cerrado']);
 const {ask}=await server.ssrLoadModule('/src/r2/si.ts');
 const response=ask('Was this year unusual?',{region:'ar-argentina',place:null,view:null,fire:null});
 assert.match(JSON.stringify(response),/close call/);
 console.log('Ask Anchor response passed');
 console.log('12 classification/headline checks and 8 distances passed');
}finally{await server.close();}
