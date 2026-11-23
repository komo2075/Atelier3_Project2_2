import { createServiceScenes } from './service-scenes.js';
import { buildVehicleExterior } from './vehicle-exterior.js';
import { createServiceCycles } from './service-cycles.js';
import { applyPanelPalette } from './panel-materials.js';
import { buildSurfacePanels } from './surface-panels.js';
import { SCENE_SIZING } from './scene-sizing.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Application envelopes use complete source geometry or conforming surface tessellations.
export function createAdaptiveSystem({scene, domeRoot, onApplicationView}) {
  const root = new THREE.Group(); scene.add(root); root.visible = false;
  const habitat = new THREE.Group(); root.add(habitat);
  const originalHabitat = new THREE.Group(); habitat.add(originalHabitat);
  let fullDomeLoaded=false,originalPanelMaterial=null;
  const detail = new THREE.Group(); root.add(detail);
  const serviceStage=new THREE.Group(); root.add(serviceStage);
  const serviceScenes=createServiceScenes(serviceStage);
  const fittings = new THREE.Group(); habitat.add(fittings);
  const surfacePanels=new THREE.Group();habitat.add(surfacePanels);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [];
  const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.25,...extra});
  const palette = {ROOFTOP:0x8ad7d7, WINTER:0xe8e1cf, PARK:0xb1c79c, HIGHWAY:0xb4c6ce};
  let mode = 'ROOFTOP', active = false, view = 'home', selected = -1, response = 0;
  let lastTime = 0;
  const shape = new THREE.Shape();
  for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;const x=Math.cos(a),y=Math.sin(a);k?shape.lineTo(x,y):shape.moveTo(x,y)}
  shape.closePath();
  let cellGeometry = new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025});
  cellGeometry.translate(0,0,-.065);
  const seamMat = new THREE.LineBasicMaterial({color:0x4b777c,transparent:true,opacity:.7});
  const outlineGeometry = new THREE.EdgesGeometry(cellGeometry,35);

  function mesh(geometry,material,x,y,z,parent=fittings){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m}
  function disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});group.clear()}
  function fit(type){
    disposeGroup(fittings);
    const s=SCENE_SIZING[type],w=s.halfWidth,d=s.halfDepth,h=s.height;
    const dark=mat(0x152d35),warm=mat(0xd2bb8a);
    if(type==='HIGHWAY'){
      buildVehicleExterior(mesh,s);
    }else if(type==='PARK'){
      mesh(new THREE.BoxGeometry(w*2+.4,.18,d*2+.4),warm,0,.02,0);
      const entrance=new THREE.Shape();entrance.moveTo(-w*.52,.15);entrance.lineTo(0,h*.75);entrance.lineTo(w*.52,.15);entrance.closePath();
      mesh(new THREE.ShapeGeometry(entrance),mat(0x183c3c,{side:THREE.DoubleSide}),0,0,d+.02);
      const ridge=mesh(new THREE.CylinderGeometry(.055,.055,d*2+.3,8),dark,0,h+.15,0);ridge.rotation.x=Math.PI/2;
    }else{
      if(type==='WINTER'){
        const insulation=mesh(new THREE.SphereGeometry(w*.87,48,24,0,Math.PI*2,0,Math.PI/2),mat(0x798980),0,0,0);
        insulation.scale.y=h/w;

      }
      mesh(new THREE.CylinderGeometry(w+.05,w+.05,.25,80),dark,0,-.04,0);
      mesh(new THREE.CylinderGeometry(w*.97,w*.97,.06,80),mat(0xa99b86),0,.08,0);
      mesh(new THREE.BoxGeometry(1.25,2.4,.2),mat(0x23414b),0,1.25,d*.94);
      mesh(new THREE.BoxGeometry(.9,1.35,.22),mat(0xe8c689,{emissive:0x9d6b24,emissiveIntensity:.5}),0,1.55,d*.94+.12);
    }
  }
  function setMode(type){
    mode=type;
    disposeGroup(surfacePanels);
    buildSurfacePanels(surfacePanels,type,originalPanelMaterial);
    fit(type);
  }
  setMode('ROOFTOP');

  // Five individually selectable construction layers, outside to inside.
  detail.position.set(0,2.3,0);detail.rotation.set(-.1,-.2,0);detail.scale.setScalar(1.2);
  const specs=[
    {name:'RESPONSIVE OUTER SKIN',label:'01 / OUTER SKIN',color:0x91d8db,description:'A faceted, raised weather skin replaces the single flat sheet. In winter it closes into a deeper cap; in warm conditions the cap lifts to expose the cavity.'},
    {name:'SEALED AIR CAVITY',label:'02 / AIR CAVITY',color:0x75bcc8,description:'A visible separation between skins creates a proposed still-air buffer. Winter mode closes the perimeter; warm mode opens it for ventilation.'},
    {name:'INSULATING CASSETTE',label:'03 / INSULATION',color:0xdec690,description:'An opaque honeycomb cassette is proposed for cold conditions. It illustrates a replaceable insulation layer; its performance requires material and thermal testing.'},
    {name:'INNER GLAZING',label:'04 / INNER GLAZING',color:0x94c9d8,description:'An inner transparent layer preserves the interior boundary when the outer skin moves. Daylight and insulated cassettes can be distributed across different cells.'},
    {name:'STRUCTURAL FRAME',label:'05 / STRUCTURAL FRAME',color:0x437680,description:'A hexagonal perimeter frame connects adjacent cells. Seals and thermally separated joints are proposed at the edges, rather than assuming glass alone provides insulation.'}
  ];
  function hexPlate(depth,color,opacity=1){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.02,bevelSegments:2,steps:1});g.translate(0,0,-depth/2);return new THREE.Mesh(g,mat(color,{transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1}))}
  for(let i=0;i<5;i++){
    const g=new THREE.Group();g.userData.layer=i;detail.add(g);
    if(i===0){
      const positions=[],indices=[];
      positions.push(0,0,.5);
      for(let j=0;j<6;j++){let a=j*Math.PI/3+Math.PI/6;positions.push(Math.cos(a),Math.sin(a),0)}
      for(let j=0;j<6;j++)indices.push(0,j+1,(j+1)%6+1);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
      const cap=new THREE.Mesh(geo,mat(specs[i].color,{transparent:true,opacity:.78,side:THREE.DoubleSide}));g.add(cap);g.userData.cap=cap;
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xc2ffff})));
    }else if(i===1||i===4){
      const outer=new THREE.Shape();for(let k=0;k<6;k++){let a=k*Math.PI/3+Math.PI/6;k?outer.lineTo(Math.cos(a),Math.sin(a)):outer.moveTo(Math.cos(a),Math.sin(a))}outer.closePath();
      const hole=new THREE.Path();for(let k=5;k>=0;k--){let a=k*Math.PI/3+Math.PI/6;k===5?hole.moveTo(Math.cos(a)*.88,Math.sin(a)*.88):hole.lineTo(Math.cos(a)*.88,Math.sin(a)*.88)}hole.closePath();outer.holes.push(hole);
      const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth:i===1?.22:.12,bevelEnabled:false}),mat(specs[i].color,{transparent:i===1,opacity:i===1?.45:1}));g.add(frame);
      if(i===1){const air=hexPlate(.01,specs[i].color,.1);g.add(air)}
    }else{g.add(hexPlate(i===2?.18:.05,specs[i].color,i===3?.3:1));}
    if(i===2){for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++){const px=x*.23,py=y*.26+(x%2)*.13;if(Math.hypot(px,py)>.77)continue;const honey=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:6},(_,j)=>new THREE.Vector3(px+Math.cos(j*Math.PI/3)*.125,py+Math.sin(j*Math.PI/3)*.125,.11))),new THREE.LineBasicMaterial({color:0x8b774e}));g.add(honey)}}
    g.scale.setScalar(1.8);layers.push(g);
  }
  const controls=document.createElement('section');controls.id='adaptive-controls';controls.hidden=true;
  controls.innerHTML=`<div class="control-heading"><span id="adaptive-label">CONSTRUCTION</span><span class="live-dot">LIVE MODEL</span></div><div id="layer-controls"><button id="show-all-layers" class="thermal-toggle" aria-pressed="true">ALL LAYERS</button><div id="layer-inspection"><div class="layer-list">${specs.map((s,i)=>`<button data-layer="${i}" aria-pressed="false"><i style="background:#${s.color.toString(16)}"></i><span>${s.label}</span><small>${s.name}</small></button>`).join('')}</div><p id="layer-description" hidden aria-live="polite"></p><button id="thermal-toggle" class="thermal-toggle" aria-pressed="false">WINTER RESPONSE</button></div></div><div id="context-controls"><div id="form-name"></div><p id="form-description"></p><div class="form-tags" id="form-tags"></div><button id="inspect-envelope" class="thermal-toggle">INSPECT ENVELOPE</button></div><p class="concept-note">CONCEPT PROTOTYPE. Thermal performance is not engineering-validated.</p>`;
  document.body.appendChild(controls);
  const cycles=createServiceCycles(controls.querySelector("#layer-controls"),serviceScenes.show);
  const layerInspection=controls.querySelector('#layer-inspection');
  const layerDescription=controls.querySelector('#layer-description');
  const allLayers=controls.querySelector('#show-all-layers');
  const formInfo={
    ROOFTOP:['COMMUNITY DOME','A shared rooftop habitat with a green, blue and teal glass envelope.',['SHARED SPACE','GLASS ENVELOPE','METAL FRAME']],
    WINTER:['THERMAL POD','An enclosed winter shell with insulated lining.',['ENCLOSED FORM','INSULATED LINING']],
    PARK:['PARK SHELTER','An A-frame shelter with a continuous tiled roof, ridge and weather-protected entrance.',['A-FRAME','TILED ENVELOPE']],
    HIGHWAY:['MOBILE HABITAT','A mobile habitat with a separate driving cab, sloped windshield and four wheels. The modular shell wraps the rear living compartment.',['DRIVING CAB','MODULAR REAR SHELL']]
  };
  function selectLayer(index,service=null){
    selected=index;
    document.body.dataset.layerView=service??String(index);
    allLayers.setAttribute('aria-pressed',String(index<0));
    layerInspection.hidden=!!service;
    layerDescription.hidden=index<0;
    layerDescription.textContent=specs[index]?.description??'';
    controls.querySelectorAll('[data-layer]').forEach((button,i)=>{
      button.classList.toggle('active',i===index);
      button.setAttribute('aria-pressed',String(i===index));
    });
    if(service)cycles.show(service);else cycles.hide();
    if(!service)document.querySelectorAll('#modes button').forEach(button=>button.classList.remove('active'));
    controls.scrollTop=0;
  }
  function selectFunction(name){
    selectLayer(0,name);
  }
  controls.querySelectorAll('[data-layer]').forEach(button=>button.onclick=()=>selectLayer(+button.dataset.layer));
  allLayers.onclick=()=>selectLayer(-1);
  function syncThermalButton(){const button=controls.querySelector('#thermal-toggle');button.setAttribute('aria-pressed',String(!!response));button.textContent=response?'WINTER CLOSED':'WARM OPEN'}
  controls.querySelector('#thermal-toggle').onclick=()=>{response=response?0:1;syncThermalButton()};
  controls.querySelector('#inspect-envelope').onclick=()=>document.querySelector('[data-view="structure"]').click();
  function context(type){
    setMode(type);
    document.body.dataset.applicationView='exterior';
    onApplicationView?.(mode);
    document.getElementById('form-name').textContent=formInfo[type][0];document.getElementById('form-description').textContent=formInfo[type][1];document.getElementById('form-tags').replaceChildren(...formInfo[type][2].map(t=>{const el=document.createElement('span');el.textContent=t;return el}));
    response=type==='WINTER'?1:0;syncThermalButton();
  }
  function setView(next){
    cycles.hide();
    if(next!=='applications')delete document.body.dataset.applicationView;
    if(next!=='structure')delete document.body.dataset.layerView;
    view=next;active=next==='structure'||next==='applications';root.visible=active;domeRoot.visible=!active;
    habitat.visible=next==='applications';detail.visible=next==='structure';controls.hidden=!active;
    document.getElementById('layer-controls').hidden=next!=='structure';document.getElementById('context-controls').hidden=next!=='applications';
    document.getElementById('adaptive-label').textContent=next==='structure'?'CONSTRUCTION':'ENVIRONMENT ADAPTATION';
    if(next==='structure'){selectLayer(-1);syncThermalButton();}
    if(next==='applications')context(mode);
  }
  function layerOffset(index){return selected<0?2-index:0;}
  function layerBounds(){
    const bounds=new THREE.Box3();
    detail.updateWorldMatrix(true,false);
    layers.forEach((layer,i)=>{
      if(selected>=0&&selected!==i)return;
      const offset=layerOffset(i);
      const position=new THREE.Vector3(offset*1.24,0,offset*1.05);
      const scale=layer.scale.clone();
      const rotation=new THREE.Quaternion();
      if(i===0){
        scale.z=2.6;
        rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),-.26);
      }
      const layerMatrix=new THREE.Matrix4().compose(position,rotation,scale).premultiply(detail.matrixWorld);
      layer.traverse(object=>{
        if(!object.geometry)return;
        object.geometry.computeBoundingBox();
        object.updateMatrix();
        bounds.union(object.geometry.boundingBox.clone().applyMatrix4(layerMatrix.clone().multiply(object.matrix)));
      });
    });
    return bounds;
  }
  function tick(now){
    const dt=Math.min(.05,(now-lastTime)/1000||.016);lastTime=now;
    if(!active)return;
    cycles.tick(now);
    serviceScenes.tick(now);
    detail.visible=view==='structure'&&!serviceScenes.isActive();
    if(view==='applications'){
      const showOriginal=(mode==='ROOFTOP'||mode==='WINTER')&&fullDomeLoaded;
      const sizing=SCENE_SIZING[mode];originalHabitat.scale.set(sizing.halfWidth/5,sizing.height/4.9,sizing.halfDepth/5);
      surfacePanels.visible=!showOriginal;
      originalHabitat.visible=showOriginal;
    }else{
      layers.forEach((layer,i)=>{
        layer.visible=selected<0||selected===i;
        const offset=layerOffset(i);
        layer.position.z=reducedMotion.matches?offset*1.05:THREE.MathUtils.damp(layer.position.z,offset*1.05,8,dt);
        layer.position.x=reducedMotion.matches?offset*1.24:THREE.MathUtils.damp(layer.position.x,offset*1.24,8,dt);
        layer.traverse(m=>{if(m.userData.selectionOutline)m.visible=selected===i});
      });
      layers[0].scale.z=THREE.MathUtils.damp(layers[0].scale.z,response?2.6:1.15,5,dt);
      layers[0].rotation.y=THREE.MathUtils.damp(layers[0].rotation.y,response?0:-.26,5,dt);
    }
  }
  let down=null;
  rendererCanvas().addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  rendererCanvas().addEventListener('pointerup',e=>{
    if(view!=='structure'||!detail.visible||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
    const rect=rendererCanvas().getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,window.ADAPT_DEBUG.camera);
    const hits=raycaster.intersectObjects(layers.filter(layer=>layer.visible),true);if(hits.length){let obj=hits[0].object;while(obj.parent!==detail)obj=obj.parent;selectLayer(obj.userData.layer)}
  });
  function rendererCanvas(){return document.getElementById('world')}
  // The three supplied Blender parts keep their evaluated Solidify / Array geometry.
  // Two proposed environmental layers supplement this source assembly.
  let sourceLoaded=false;
  async function loadSourceModule(){
    const gltf=await new GLTFLoader().loadAsync('./public/models/single-module.glb');
    gltf.scene.updateMatrixWorld(true);
    const sourceParts=new Map();
    gltf.scene.traverse(object=>{if(object.isMesh)sourceParts.set(object.name,object)});
    const mappings=[['Dome_Frame009',4],['Dome_Frame010',0],['Dome_Frame012',3]];
    let paneMaterial=null;
    const cloneMaterial=material=>Array.isArray(material)?material.map(m=>m.clone()):material.clone();
    for(const [name,layerIndex] of mappings){
      const original=sourceParts.get(name)||[...sourceParts.values()].find(m=>m.name.replaceAll('.','')===name);
      if(!original)throw new Error('Missing source part '+name);
      const geometry=original.geometry.clone().applyMatrix4(original.matrixWorld);
      geometry.computeBoundingBox();geometry.translate(...geometry.boundingBox.getCenter(new THREE.Vector3()).negate().toArray());
      geometry.rotateX(Math.PI/2);geometry.rotateY(-.25);geometry.computeBoundingBox();
      const size=geometry.boundingBox.getSize(new THREE.Vector3());geometry.scale(2/Math.max(size.x,size.y),2/Math.max(size.x,size.y),2/Math.max(size.x,size.y));
      const group=layers[layerIndex];disposeGroup(group);
      group.add(new THREE.Mesh(geometry,cloneMaterial(original.material)));
      const selectionOutline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.65}));
      selectionOutline.userData.selectionOutline=true;selectionOutline.visible=false;group.add(selectionOutline);
      if(layerIndex===0){
        paneMaterial=original.material;
      }
    }
    originalPanelMaterial=paneMaterial;
    disposeGroup(surfacePanels);buildSurfacePanels(surfacePanels,mode,originalPanelMaterial);
    sourceLoaded=true;
    window.dispatchEvent(new Event('adapt-module-ready'));
    controls.querySelector('.live-dot').textContent='BLENDER SOURCE';
  }
  loadSourceModule().catch(error=>{console.error('Source module could not load:',error);controls.querySelector('.live-dot').textContent='CONCEPT FALLBACK'});
  new GLTFLoader().loadAsync('./public/models/source-dome.glb').then(gltf=>{
    const model=gltf.scene;
    model.traverse(o=>{if(o.isMesh&&o.name.toLowerCase().includes('panels'))applyPanelPalette(o)});
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
    model.scale.setScalar(10/Math.max(size.x,size.z));
    const normalized=new THREE.Box3().setFromObject(model),center=normalized.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-normalized.min.y,-center.z);
    originalHabitat.add(model);fullDomeLoaded=true;
  }).catch(error=>console.error('Original complete dome could not load:',error));
  return {setView,context,tick,selectFunction,root,detail,layerBounds,serviceBounds:serviceScenes.bounds,mode:()=>mode,sourceLoaded:()=>sourceLoaded,refitView:()=>onApplicationView?.(mode)};
}
