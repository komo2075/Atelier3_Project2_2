import assert from 'node:assert/strict';
import {clippedHexagons} from '../src/shell-topology.js';
for(const [width,height] of [[4.6,9],[17.98,9.6],[1.806,9.6]]){
 const polygons=clippedHexagons(width,height);
 let area=0;
 for(const polygon of polygons){
  for(const [x,y] of polygon){assert(Number.isFinite(x)&&Number.isFinite(y));assert(x>=-1e-8&&x<=width+1e-8&&y>=-1e-8&&y<=height+1e-8)}
  area+=Math.abs(polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a[0]*b[1]-b[0]*a[1]},0))/2;
 }
 assert(Math.abs(area-width*height)<1e-7,`Surface area mismatch: ${area} / ${width*height}`);
 console.log(`PASS: ${polygons.length} panels cover ${width} x ${height} without lost area.`);
}
