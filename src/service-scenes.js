import * as THREE from 'three';

const colors={slate:0x2e4147,metal:0x91a9ae,wall:0xc0b6a0,wood:0xa47a50,
  solar:0x233d61,heat:0xff9d39,water:0x5cd5ff,leaf:0x55975b,soil:0x4f3628};

function mesh(parent,geometry,color,x,y,z,options={}){
  const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.55,...options}));
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}

function box(parent,size,position,color,options){
  return mesh(parent,new THREE.BoxGeometry(...size),color,...position,options);
}

function cylinder(parent,radius,height,position,color,options){
  return mesh(parent,new THREE.CylinderGeometry(radius,radius,height,24),color,...position,options);
}

function route(parent,coordinates,color,radius=.048){
  const points=coordinates.map(point=>new THREE.Vector3(...point));
  const group=new THREE.Group();
  parent.add(group);
  for(let i=1;i<points.length;i++){
    const delta=points[i].clone().sub(points[i-1]);
    const center=points[i-1].clone().addScaledVector(delta,.5);
    const pipe=cylinder(group,radius,delta.length(),center.toArray(),color);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  const path=linePath(points);
  path.pipes=group.children;
  return path;
}

function linePath(points){
  const line=new THREE.CurvePath();
  for(let i=1;i<points.length;i++)line.add(new THREE.LineCurve3(points[i-1],points[i]));
  return line;
}

function platform(group){
  box(group,[9,.25,5.4],[0,-.12,0],colors.slate);
  box(group,[8.8,.04,5.2],[0,.02,0],0x83938e);
}

function solarScene(){
  const group=new THREE.Group();
  platform(group);
  box(group,[5.2,3.35,.16],[-1.55,1.7,-2],colors.wall);
  box(group,[5.2,.18,2.55],[-1.55,3.35,-1],colors.slate);
  const collector=new THREE.Group();
  collector.position.set(-1.7,3.85,-1);
  collector.rotation.x=.37;
  group.add(collector);
  box(collector,[3.15,.12,1.65],[0,0,0],colors.metal);
  for(let x=-2;x<=2;x++){
    box(collector,[.55,.05,1.48],[x*.59,.08,0],colors.solar,{metalness:.55});
    cylinder(collector,.024,1.36,[x*.59,.117,0],0xca8356).rotation.x=Math.PI/2;
  }
  mesh(group,new THREE.SphereGeometry(.29,20,12),0xffcc71,-3.66,5.1,-.45,{emissive:0xffa52b,emissiveIntensity:.8});

  box(group,[5.2,.17,1.45],[.9,1.28,.82],colors.wood);
  for(const x of [-1.55,3.35])box(group,[.16,1.22,1.25],[x,.63,.82],colors.slate);
  box(group,[.75,.85,.59],[-1.8,1.98,-.9],colors.metal);
  for(let i=0;i<6;i++)box(group,[.78,.039,.62],[-1.8,1.68+i*.118,-.9],colors.slate);
  cylinder(group,.58,1.4,[.12,2.12,-.45],0xb6d2d9,{metalness:.42});
  cylinder(group,.59,.09,[.12,2.82,-.45],colors.slate);
  box(group,[1.37,.19,1.12],[2.47,1.46,.65],colors.slate);
  box(group,[1.24,.81,.29],[2.47,1.9,.18],0x63443c);
  box(group,[1.36,.26,1.03],[2.47,2.44,.64],0xd0baa5);
  cylinder(group,.13,.14,[2.47,2.25,.83],colors.slate);
  mesh(group,new THREE.CylinderGeometry(.245,.185,.33,24,1,true),0xf2e3ca,2.47,1.73,.83,{side:THREE.DoubleSide});
  cylinder(group,.193,.045,[2.47,1.568,.83],0xf2e3ca);
  mesh(group,new THREE.TorusGeometry(.115,.037,8,20),0xf2e3ca,2.72,1.75,.83);
  const coffee=cylinder(group,.217,.022,[2.47,1.81,.83],0x77391e);

  const paths=[
    [[[-3.6,4.92,-.42],[-2.48,3.98,-.6]],[[-3.55,4.99,-.47],[-1.48,4.01,-.82]],[[-3.5,5.02,-.5],[-.52,4.05,-1.06]]].map(p=>linePath(p.map(v=>new THREE.Vector3(...v)))),
    [route(group,[[-.36,3.94,-1],[-.36,3.05,-.95],[-1.8,3.05,-.95],[-1.8,2.35,-.95]],0x9d532d),
      route(group,[[-2.04,1.6,-.95],[-2.65,1.6,-.95],[-2.65,3.73,-.95],[-2.84,3.93,-.95]],0x726361)],
    [route(group,[[-1.4,1.95,-.9],[-.83,1.95,-.9],[-.83,2.42,-.45],[-.46,2.42,-.45]],0xb77648)],
    [route(group,[[.72,2.3,-.45],[1.33,2.3,-.45],[1.33,2.5,.6],[2.46,2.5,.6]],0xa87847),
      linePath([[2.47,2.18,.83],[2.47,1.83,.83]].map(v=>new THREE.Vector3(...v)))]
  ];
  return {group,paths,color:colors.heat,setStep(step){coffee.visible=step===3;}};
}

function rainScene(){
  const group=new THREE.Group();
  platform(group);
  for(const x of [-4.05,-.55])for(const z of [-1.78,.32]){
    box(group,[.13,3.3,.13],[x,1.67,z],colors.wood);
  }
  box(group,[4.1,.14,3.25],[-2.31,3.52,-.6],0x556e74).rotation.x=.23;
  for(let i=0;i<6;i++)box(group,[.038,.045,3.22],[-4.1+i*.71,3.61,-.59],colors.metal).rotation.x=.23;
  box(group,[4.21,.13,.17],[-2.31,3.14,.99],colors.metal);
  cylinder(group,.18,.77,[-.95,1.75,1.21],colors.slate);
  cylinder(group,.21,.48,[-.05,1.48,1.22],0xc5cfb5);
  cylinder(group,.23,.08,[-.05,1.75,1.22],colors.slate);
  cylinder(group,.79,1.64,[1.02,.9,-.64],0x77abbe,{opacity:.42,transparent:true,depthWrite:false});
  cylinder(group,.81,.12,[1.02,1.76,-.64],colors.slate);
  const water=cylinder(group,.74,1,[1.02,.58,-.64],0x3e96b1);
  box(group,[2.48,.51,1.41],[2.85,.67,1.18],colors.wood);
  box(group,[2.31,.05,1.25],[2.85,.945,1.18],colors.soil);
  for(const x of [1.95,2.53,3.1,3.68]) for(const z of [.84,1.52]){
    cylinder(group,.027,.35,[x,1.12,z],0x477147);
    const leaf=mesh(group,new THREE.SphereGeometry(.17,9,6),colors.leaf,x+.08,1.31,z);
    leaf.scale.set(1.2,.66,.85);
    mesh(group,new THREE.SphereGeometry(.12,9,6),0x83b46a,x-.07,1.19,z+.05);
  }
  box(group,[2.28,.075,1.23],[2.85,.36,1.18],colors.metal);
  cylinder(group,.17,.32,[1.69,.21,1.19],0x8ea7ac);
  const pipe=0x4b8394;
  const rain=[-3.85,-3,-2.14,-1.3].map(x=>linePath([[x,5.15,-.12],[x,3.52,-.03]].map(v=>new THREE.Vector3(...v))));
  const paths=[
    [...rain,route(group,[[-3.94,3.18,.99],[-.46,3.18,.99],[-.46,2.53,1.19],[-.95,2.53,1.19],[-.95,.28,1.19]],pipe)],
    [route(group,[[-.46,2.53,1.19],[-.05,2.53,1.19],[-.05,1.68,1.19]],pipe)],
    [route(group,[[-.05,1.28,1.19],[.48,1.28,1.19],[.48,1.27,-.62],[.62,1.27,-.62]],pipe),
     route(group,[[1.66,1.61,-.66],[2,1.61,-.66],[2,.24,-.66]],0x536f75,.037)],
    [route(group,[[1.58,.58,-.64],[3.93,.58,-.64],[3.93,1.17,1.21],[1.78,1.17,1.21]],pipe),
     ...[2,2.65,3.3,3.78].map(x=>linePath([[x,1.16,1.21],[x,.97,1.21]].map(v=>new THREE.Vector3(...v))))],
    [route(group,[[3.48,.36,1.18],[3.48,.21,1.18],[1.69,.21,1.18],[1.69,.22,-.65],[1.53,.22,-.65]],pipe)]
  ];
  return {group,paths,color:colors.water,setStep(step){
    const level=[.12,.18,1,.71,.84][step];
    water.scale.y=level;
    water.position.y=.09+level*.5;
  }};
}

export function createServiceScenes(parent){
  const scenes={SOLAR:solarScene(),RAINWATER:rainScene()};
  const markers=new THREE.Group();
  const geometry=new THREE.SphereGeometry(.088,9,7);
  const material=new THREE.MeshBasicMaterial();
  const markerCount=4*Math.max(...Object.values(scenes).flatMap(scene=>scene.paths.map(paths=>paths.length)));
  for(let i=0;i<markerCount;i++)markers.add(new THREE.Mesh(geometry,material));
  parent.add(markers);
  for(const scene of Object.values(scenes)){
    scene.group.visible=false;
    parent.add(scene.group);
  }
  markers.visible=false;
  let active;
  let step;
  let animate;
  let initialized=false;
  function highlight(scene,index,on){
    for(const path of scene.paths[index]){
      for(const pipe of path.pipes??[]){
        pipe.material.emissive.setHex(scene.color);
        pipe.material.emissiveIntensity=on?.55:0;
      }
    }
  }
  function tick(now){
    if(!active)return;
    const paths=active.paths[step];
    markers.children.forEach((marker,i)=>{
      const path=paths[Math.floor(i/4)];
      marker.visible=!!path;
      if(path&&(animate||!initialized))path.getPoint(((animate?now*.00044:0)+(i%4)*.25)%1,marker.position);
    });
    initialized=true;
  }
  return {
    show(name,index,moving){
      const changed=active!==scenes[name]||step!==index;
      if(active){
        highlight(active,step,false);
        active.group.visible=false;
      }
      active=scenes[name];
      markers.visible=!!active;
      if(!active)return;
      active.group.visible=true;
      material.color.setHex(active.color);
      step=index;
      animate=moving;
      highlight(active,step,true);
      if(changed){
        active.setStep(step);
        initialized=false;
        tick(performance.now());
      }
    },
    tick,
    isActive:()=>!!active,
    bounds(){return active?new THREE.Box3().setFromObject(active.group):null;}
  };
}

