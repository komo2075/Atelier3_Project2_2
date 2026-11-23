import * as THREE from 'three';

export const CAB_EXTENSION=2.8;

export function buildVehicleExterior(mesh,sizing){
  const {halfWidth:w,halfDepth:d,floorY}=sizing;
  const dark=new THREE.MeshStandardMaterial({color:0x172a31,roughness:.75});
  const body=new THREE.MeshStandardMaterial({color:0x4f776f,roughness:.34,metalness:.45});
  const glass=new THREE.MeshStandardMaterial({color:0x17323d,roughness:.29,metalness:.27,envMapIntensity:.5,side:THREE.DoubleSide});
  const trim=new THREE.MeshStandardMaterial({color:0xb2c3bd,roughness:.36,metalness:.55});
  const lamps=new THREE.MeshStandardMaterial({color:0xffefd1,emissive:0xffdaa1,emissiveIntensity:.9});
  const tail=new THREE.MeshStandardMaterial({color:0xaa362d,emissive:0xcc2d1c,emissiveIntensity:.55});
  const box=(size,x,y,z,material)=>mesh(new THREE.BoxGeometry(...size),material,x,y,z);
  const nose=d+CAB_EXTENSION;
  const width=w*.87;
  box([2*w+.13,.28,2*d+CAB_EXTENSION-.22],0,floorY-.13,CAB_EXTENSION/2-.05,dark);

  // Extruded side profile joins the habitat to the lower driving cab.
  const cab=new THREE.Shape();
  cab.moveTo(0,.88);
  cab.lineTo(0,3.73);
  cab.lineTo(.65,3.73);
  cab.lineTo(1.66,2.59);
  cab.lineTo(2.32,2.47);
  cab.lineTo(2.65,2.15);
  cab.lineTo(2.65,.88);
  cab.closePath();
  const cabMesh=mesh(new THREE.ExtrudeGeometry(cab,{depth:2*width,bevelSize:.11,bevelThickness:.09,bevelSegments:2,steps:1}),body,width,0,d);
  cabMesh.rotation.y=-Math.PI/2;

  const windshield=box([2*width-.26,.044,1.4],0,3.25,d+1.19,glass);
  windshield.rotation.x=.85;
  const divider=box([.074,.055,1.42],0,3.28,d+1.19,body);
  divider.rotation.x=.85;
  for(const sign of [-1,1]){
    const x=sign*(width+.095);
    const side=new THREE.Shape([new THREE.Vector2(.24,2.57),new THREE.Vector2(.24,3.49),new THREE.Vector2(.62,3.49),new THREE.Vector2(1.42,2.57)]);
    const sideGlass=mesh(new THREE.ShapeGeometry(side),glass,x,0,d);
    sideGlass.rotation.y=-Math.PI/2;
    box([.045,.045,.2],x,2.38,d+.45,trim);
    box([.3,.065,.11],sign*(width+.19),2.6,d+1.30,dark);
    box([.17,.36,.23],sign*(width+.34),2.68,d+1.30,glass);
    box([.71,.28,.07],sign*width*.7,1.98,nose-.045,lamps);
    box([.25,.5,.09],sign*w*.85,1.55,-d-.06,tail);

    for(const z of [-d*.64,d+1.51]){
      const tire=mesh(new THREE.CylinderGeometry(.91,.91,.53,26),dark,sign*(w-.05),.91,z);
      tire.rotation.z=Math.PI/2;
      const hub=mesh(new THREE.CylinderGeometry(.43,.43,.08,22),trim,sign*(w+.245),.91,z);
      hub.rotation.z=Math.PI/2;
      const center=mesh(new THREE.CylinderGeometry(.145,.145,.09,16),dark,sign*(w+.29),.91,z);
      center.rotation.z=Math.PI/2;
    }
  }
  box([2.22,.45,.15],0,1.81,nose-.055,dark);
  for(let i=0;i<4;i++)box([2.02,.028,.04],0,1.68+i*.08,nose+.025,trim);
  box([2*width+.03,.27,.25],0,1.14,nose,dark);
  box([.63,.22,.04],0,1.16,nose+.14,trim);
  box([2*w,.23,.14],0,1.1,-d-.095,dark);
}
