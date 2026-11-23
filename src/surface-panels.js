import * as THREE from 'three';
import { clip, clippedHexagons } from './shell-topology.js';
import { PANEL_COLORS } from './panel-materials.js';
import { SCENE_SIZING } from './scene-sizing.js';

export function buildSurfacePanels(group,type,sourceMaterial){
  const {halfWidth:w,halfDepth:d,height:h,floorY:y}=SCENE_SIZING[type];
  if(type==='ROOFTOP'||type==='WINTER'){
    const fallback=new THREE.Mesh(new THREE.SphereGeometry(w,48,24,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshStandardMaterial({color:0x275e63,metalness:.35,roughness:.42,side:THREE.DoubleSide}));
    fallback.scale.y=h/w;
    fallback.position.y=y;
    group.add(fallback);
    return;
  }

  const skin=(Array.isArray(sourceMaterial)?sourceMaterial[0]:sourceMaterial)?.clone() ??
    new THREE.MeshStandardMaterial({metalness:.35,roughness:.3});
  skin.color.set(0xffffff);
  skin.vertexColors=true;
  skin.side=THREE.DoubleSide;
  const colors=PANEL_COLORS.map(hex=>new THREE.Color(hex));

  // Model each strip on the same piecewise planar profile used for the end walls.
  const profile=type==='PARK'?[[-w,y],[0,y+h],[w,y]]:[[-w,y]];
  if(type==='HIGHWAY'){
    for(let i=0;i<=16;i++){
      const a=Math.PI*(1-i/16);
      const x=i===0?-w:i===16?w:w*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.55;
      const rise=i===0||i===16?0:Math.sin(a)**.55;
      profile.push([x,y+h*(.42+.58*rise)]);
    }
    profile.push([w,y]);
  }
  const breaks=[0];
  for(let i=1;i<profile.length;i++){
    const [x0,y0]=profile[i-1], [x1,y1]=profile[i];
    breaks.push(breaks[i-1]+Math.hypot(x1-x0,y1-y0));
  }
  const positions=[], vertexColors=[], lines=[];
  for(const [index,polygon] of clippedHexagons(breaks.at(-1),2*d).entries()){
    for(let i=1;i<breaks.length;i++){
      const start=breaks[i-1],end=breaks[i];
      const piece=clip(clip(polygon,0,start,1),0,end,-1);
      if(piece.length<3)continue;
      const [x0,y0]=profile[i-1], [x1,y1]=profile[i];
      const map=([u,v])=>{
        const t=(u-start)/(end-start);
        return [THREE.MathUtils.lerp(x0,x1,t),THREE.MathUtils.lerp(y0,y1,t),v-d];
      };
      const points=piece.map(map);
      const color=colors[index%colors.length].toArray();
      for(let j=1;j<points.length-1;j++){
        positions.push(...points[0],...points[j],...points[j+1]);
        vertexColors.push(...color,...color,...color);
      }
      for(let j=0;j<piece.length;j++){
        const k=(j+1)%piece.length;
        // Never draw the subdivision as a tile joint.
        const onBreak=[start,end].some(u=>Math.abs(piece[j][0]-u)<1e-8&&Math.abs(piece[k][0]-u)<1e-8);
        if(!onBreak)lines.push(...points[j],...points[k]);
      }
    }
  }
  const panels=new THREE.BufferGeometry();
  panels.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  panels.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  panels.computeVertexNormals();
  group.add(new THREE.Mesh(panels,skin));
  const joints=new THREE.BufferGeometry();
  joints.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  group.add(new THREE.LineSegments(joints,new THREE.LineBasicMaterial({color:0x456d69})));

  const outline=new THREE.Shape(profile.map(([x,height])=>new THREE.Vector2(x,height)));
  outline.closePath();
  const wall=new THREE.MeshStandardMaterial({color:0x24544f,roughness:.5,metalness:.2,side:THREE.DoubleSide});
  for (const z of [-d,d]){
    const end=new THREE.Mesh(new THREE.ShapeGeometry(outline),wall);
    end.position.z=z;
    group.add(end);
  }
}
