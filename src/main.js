import { CAB_EXTENSION } from './vehicle-exterior.js';
import { SCENE_SIZING } from './scene-sizing.js';
import { applyPanelPalette } from './panel-materials.js';
import { createAdaptiveSystem } from './adaptive-system.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
const compactDevice=matchMedia('(pointer: coarse)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!compactDevice,alpha:false});
renderer.transmissionResolutionScale=compactDevice?.5:1;
renderer.setPixelRatio(Math.min(devicePixelRatio,compactDevice?1.25:2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.AgXToneMapping;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#07121d');scene.fog=new THREE.FogExp2('#07121d',0.006);
// Neutral studio reflections reveal the Blender glass and metal without recoloring them.
const pmrem=new THREE.PMREMGenerator(renderer);
const studio=new RoomEnvironment();
scene.environment=pmrem.fromScene(studio,.04).texture;
studio.dispose();pmrem.dispose();
new RGBELoader().load('./public/environments/blender-forest.hdr',texture=>{
  const generator=new THREE.PMREMGenerator(renderer);
  const previous=scene.environment;
  scene.environment=generator.fromEquirectangular(texture).texture;
  previous?.dispose();texture.dispose();generator.dispose();
},undefined,error=>console.error('Blender material-preview lighting unavailable:',error));
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.035,300);camera.position.set(10,6,15);
scene.add(new THREE.HemisphereLight(0xffffff,0x424242,.2));const sun=new THREE.DirectionalLight(0xffffff,.6);sun.position.set(8,14,7);scene.add(sun);
const domeRoot=new THREE.Group();scene.add(domeRoot);const environment=new THREE.Group();scene.add(environment);
const radius=5; const panelMeshes=[]; let importedDome=null; let importedPanels=null;
const glass=new THREE.MeshPhysicalMaterial({color:0x70c9dc,metalness:.12,roughness:.19,transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false});
const rimMat=new THREE.MeshBasicMaterial({color:0x74e6ec,transparent:true,opacity:.8,side:THREE.DoubleSide});
const metal=new THREE.MeshStandardMaterial({color:0x164452,metalness:.75,roughness:.28});
const floor=new THREE.Mesh(new THREE.CylinderGeometry(5.04,5.04,.13,96),new THREE.MeshStandardMaterial({color:0x12333d,metalness:.5,roughness:.35}));floor.position.y=-.1;domeRoot.add(floor);
const floorRings=new THREE.GridHelper(10,20,0x31747d,0x18404a);floorRings.position.y=.01;domeRoot.add(floorRings);
// A hemisphere of spherical hexagonal cells. The caps near the top are intentionally stylized.
function addCell(theta,phi,sz,index){const center=new THREE.Vector3(radius*Math.sin(theta)*Math.cos(phi),radius*Math.cos(theta),radius*Math.sin(theta)*Math.sin(phi));const n=center.clone().normalize();const tangent=new THREE.Vector3(-Math.sin(phi),0,Math.cos(phi));const bitangent=new THREE.Vector3().crossVectors(n,tangent).normalize();const verts=[];for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;const p=center.clone().addScaledVector(tangent,Math.cos(a)*sz).addScaledVector(bitangent,Math.sin(a)*sz).normalize().multiplyScalar(radius);verts.push(p)}const positions=[];for(let i=0;i<6;i++)positions.push(...center.toArray(),...verts[i].toArray(),...verts[(i+1)%6].toArray());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,glass.clone());mesh.userData={panel:index,center:center.clone(),normal:n.clone()};domeRoot.add(mesh);panelMeshes.push(mesh);const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(verts),new THREE.LineBasicMaterial({color:0x75dce7,transparent:true,opacity:.67}));domeRoot.add(outline)}
let index=0;for(let row=0;row<8;row++){const theta=.14+row*.192;const count=Math.max(6,Math.round(2*Math.PI*Math.sin(theta)*radius/1.38));for(let i=0;i<count;i++)addCell(theta,(i+(row%2)*.5)*Math.PI*2/count,Math.min(.71,Math.PI*radius*Math.sin(theta)/count*.83),index++)}
const proceduralShell=new THREE.Group();
// The procedural shell remains as an offline fallback.
for (const child of [...domeRoot.children]) { if (child!==floor && child!==floorRings) proceduralShell.add(child); }
domeRoot.add(proceduralShell);


//2.4 version
proceduralShell.visible = false;


const baseRing=new THREE.Mesh(new THREE.TorusGeometry(radius,.065,10,120),metal);baseRing.rotation.x=Math.PI/2;domeRoot.add(baseRing);
const edgeLights=new THREE.PointLight(0xffffff,0,17);edgeLights.position.set(0,3,0);domeRoot.add(edgeLights);

//1.3 version update: Added interior mode switching and environment switching. The interior is now a separate group, and the procedural shell is hidden when the Blender model is loaded. The camera controls have been refined for better user experience, especially on mobile devices with motion controls.
const inside = new THREE.Group();
domeRoot.add(inside);

let livingRoom = null;


//1.4 version update: Added fitness model loading and interior mode switching. The fitness model is loaded asynchronously and added to the scene when the user selects the "FITNESS" mode. The interior modes can be switched between "LIVING", "GARDEN", and "FITNESS", each with its own unique setup.
let fitnessModel = null;


//1.4 version
let gardenModel = null;

async function loadGarden() {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(
      './public/models/Garden.glb'
    );

    gardenModel = gltf.scene;
    gardenModel.name = 'GardenComplete';

    // 保留 Blender 原始坐标和比例
    gardenModel.position.set(0, 0, 0);
    gardenModel.scale.set(1, 1, 1);

    gardenModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    domeRoot.add(gardenModel);

    syncExperienceModel();

    console.log('Garden loaded successfully');

  } catch (error) {
    console.error('Failed to load Garden:', error);
    toast('Garden model failed to load');
  }
}


async function loadFitness() {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(
      './public/models/FitnessShell.glb'
    );

    fitnessModel = gltf.scene;
    fitnessModel.name = 'FitnessComplete';

    // 保留 Blender 中的原始比例和位置
    fitnessModel.position.set(0, 0, 0);
    fitnessModel.scale.set(1, 1, 1);

    fitnessModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    domeRoot.add(fitnessModel);

    syncExperienceModel();

    console.log('Fitness loaded successfully');

  } catch (error) {
    console.error('Failed to load Fitness:', error);
    toast('Fitness model failed to load');
  }
}


//1.4 version
function syncExperienceModel() {
  const isLiving = currentInteriorMode === 'LIVING';
  const isGarden = currentInteriorMode === 'GARDEN';
  const isFitness = currentInteriorMode === 'FITNESS';

  // 三个完整空间，只显示选中的一个
  if (livingRoom) {
    livingRoom.visible = isLiving;
  }

  if (gardenModel) {
    gardenModel.visible = isGarden;
  }

  if (fitnessModel) {
    fitnessModel.visible = isFitness;
  }

  // 旧半球和备用结构不再参与视角 1
  if (importedDome) {
    importedDome.visible = false;
  }

  proceduralShell.visible = false;
  floor.visible = false;
  floorRings.visible = false;
  baseRing.visible = false;
}


let currentInteriorMode = 'LIVING';


function box(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,metalness:.18,roughness:.66}));m.position.set(x,y,z);inside.add(m);return m}



//1.4 version update: Added interior mode switching and environment switching. The interior is now a separate group, and the procedural shell is hidden when the Blender model is loaded. The camera controls have been refined for better user experience, especially on mobile devices with motion controls.
function makeInterior(mode) {
  currentInteriorMode = mode;

  // 清除旧的代码生成室内设施
  inside.clear();

  // 切换完整 GLB
  syncExperienceModel();

  console.log('Current experience:', mode);
}



makeInterior('LIVING');
const stars=new THREE.BufferGeometry();const pts=[];for(let i=0;i<900;i++)pts.push((Math.random()-.5)*150,Math.random()*65-5,(Math.random()-.5)*150);stars.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0x77a7b4,size:.045,transparent:true,opacity:.6})));
function clearEnvironment(){while(environment.children.length){const m=environment.children[0];environment.remove(m);m.geometry?.dispose();if(m.material){(Array.isArray(m.material)?m.material:[m.material]).forEach(v=>v.dispose())}}}
function makeEnvironment(type){clearEnvironment();let color=0x123443,ground=0x193c47; if(type==='WINTER'){color=0x9bbbd2;ground=0xc4d8e0}else if(type==='PARK'){color=0x34594b;ground=0x345344}else if(type==='ROOFTOP'){color=0x262c28;ground=0x343c33}if(type==='HIGHWAY'){color=0x54717f;ground=0x35474b}scene.background=new THREE.Color(color);scene.fog.color.setHex(color);const land=new THREE.Mesh(new THREE.CylinderGeometry(70,70,.45,80),new THREE.MeshStandardMaterial({color:ground,roughness:.95}));land.position.y=-.45;environment.add(land);if(type==='HIGHWAY'){
  const road=new THREE.Mesh(new THREE.BoxGeometry(13,.08,140),new THREE.MeshStandardMaterial({color:0x263139,roughness:.95}));road.position.y=-.16;environment.add(road);
  for(let i=-12;i<=12;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,2.5),new THREE.MeshBasicMaterial({color:0xe9deaa}));mark.position.set(0,-.105,i*5.2);environment.add(mark)}
  for(const x of [-6,6]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,140),new THREE.MeshBasicMaterial({color:0xd4dfdc}));edge.position.set(x,-.105,0);environment.add(edge)}
}if(type==='ROOFTOP'){for(let i=0;i<34;i++){let a=i*2.4,r=14+(i%5)*5;const h=3+(i*7%18);const m=new THREE.Mesh(new THREE.BoxGeometry(2+(i%3),h,2+(i%4)),new THREE.MeshStandardMaterial({color:0x343a35,metalness:.2}));m.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);environment.add(m)}}if(type==='PARK'){for(let i=0;i<60;i++){let a=i*2.4,r=9+(i%9)*3;const m=new THREE.Mesh(new THREE.ConeGeometry(.5+(i%3)*.2,2+(i%5),6),new THREE.MeshStandardMaterial({color:0x25554c}));m.position.set(Math.cos(a)*r,1,Math.sin(a)*r);environment.add(m)}}if(type==='WINTER'){for(let i=0;i<26;i++){let a=i*2.4,r=10+(i%7)*3;const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1+(i%3),0),new THREE.MeshStandardMaterial({color:0xe3f4fa,roughness:.9}));m.scale.y=.35;m.position.set(Math.cos(a)*r,.2,Math.sin(a)*r);environment.add(m)}}}
makeEnvironment('ROOFTOP');
const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.dampingFactor=.065;orbit.minDistance=7;orbit.maxDistance=35;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,1,0);orbit.enabled=false;
let view='home',transition=null,gyroEnabled=false,gyroBase=null,deviceAngles=null,interiorYaw=0,interiorPitch=0,dragging=false,lastPointer=null,gyroOrbitOffset=0;
const adaptive=createAdaptiveSystem({scene,domeRoot,onApplicationView:applicationCamera});
const targets={home:{p:[11,6,16],t:[0,1.7,0]},interior:{p:[0,1.75,.2],t:[0,1.75,-3]},structure:{p:[5.3,4.2,8],t:[0,2.3,0]},applications:{p:[12,7.5,16],t:[0,2,0]}};
function applicationCamera(mode){
  const s=SCENE_SIZING[mode];
  const bounds=new THREE.Box3(
    new THREE.Vector3(-s.halfWidth-.4,-.2,-s.halfDepth-.4),
    new THREE.Vector3(s.halfWidth+.4,s.floorY+s.height+.2,s.halfDepth+.4+(mode==='HIGHWAY'?CAB_EXTENSION:0))
  );
  const center=bounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(.62,.66,.86).normalize();
  targets.applications=fitCamera(bounds,center,direction,7);
  if(view==='applications')moveCamera('applications',800);
}
function fitCamera(bounds,center,direction,minimumDistance){
  const right=new THREE.Vector3(0,1,0).cross(direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right);
  const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*.88;
  const horizontal=vertical*camera.aspect;
  let distance=minimumDistance;
  for(const x of [bounds.min.x,bounds.max.x]){
    for(const y of [bounds.min.y,bounds.max.y]){
      for(const z of [bounds.min.z,bounds.max.z]){
        const point=new THREE.Vector3(x,y,z).sub(center);
        const extent=Math.max(Math.abs(point.dot(right))/horizontal,Math.abs(point.dot(up))/vertical);
        distance=Math.max(distance,extent+point.dot(direction));
      }
    }
  }
  return {p:center.clone().addScaledVector(direction,distance).toArray(),t:center.toArray()};
}
function moveCamera(key,duration=1450){if(matchMedia('(prefers-reduced-motion: reduce)').matches)duration=0;const t=targets[key];transition={start:performance.now(),duration,fromP:camera.position.clone(),toP:new THREE.Vector3(...t.p),fromT:orbit.target.clone(),toT:new THREE.Vector3(...t.t)};orbit.enabled=false}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500)}
const descriptions={interior:['01 / INTERIOR','INSIDE THE DOME','Look around with your phone or drag. Change the activity mode.'],structure:['02 / TECHNOLOGY','MODULAR SYSTEM','One hexagonal module. Five working layers. Choose a layer to inspect it, or select a function to follow its cycle.'],applications:['03 / APPLICATIONS','ONE SYSTEM. MANY FORMS.','Change the environment. Watch the same modular skin reconfigure into a habitat, tent or mobile cabin.']};


//1.4 version update: Added interior mode switching and environment switching. The interior is now a separate group, and the procedural shell is hidden when the Blender model is loaded. The camera controls have been refined for better user experience, especially on mobile devices with motion controls.
const actions={
  interior:['LIVING','GARDEN','FITNESS'],
  structure:['SOLAR','RAINWATER'],
  applications:['ROOFTOP','WINTER','PARK','HIGHWAY']
};


function setView(next){view=next;syncExperienceModel();adaptive.setView(next);if(next==='applications')makeEnvironment(adaptive.mode());else makeEnvironment(next==='structure'?'TECHNOLOGY':'ROOFTOP');document.body.classList.toggle('exploring',next!=='home');$('hud').hidden=next==='home';$('home').hidden=next==='home';gyroBase=null;const t=descriptions[next];if(t){$('view-index').textContent=t[0];$('view-title').textContent=t[1];$('view-desc').textContent=t[2];$('modes').replaceChildren();for(const action of actions[next]){const b=document.createElement('button');b.textContent=action;b.onclick=()=>selectAction(action,b);$('modes').appendChild(b)}if(next==='interior')$('modes').firstChild?.classList.add('active');if(next==='applications')for(const b of $('modes').children)b.classList.toggle('active',b.textContent===adaptive.mode())}moveCamera(next);$('hint').textContent=next==='interior'?'DRAG TO LOOK · ENABLE MOTION ON MOBILE':next==='structure'?'SELECT A LAYER · DRAG TO ORBIT':'DRAG TO ORBIT · PINCH TO ZOOM · ENABLE MOTION';}
function selectAction(action,button){button.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active'));button.classList.add('active');if(view==='interior'){makeInterior(action);toast(`Interior mode: ${action}. Transition animation placeholder.`)}else if(view==='applications'){makeEnvironment(action);adaptive.context(action)}else{adaptive.selectFunction(action)}}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('home').onclick=()=>{setView('home');window.scrollTo(0,0)};$('brand').onclick=()=>{setView('home');window.scrollTo(0,0)};
canvas.addEventListener('pointerdown',e=>{if(view!=='interior'||transition)return;dragging=true;lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging||view!=='interior'||transition||!lastPointer)return;interiorYaw-=(e.clientX-lastPointer[0])*.004;interiorPitch=THREE.MathUtils.clamp(interiorPitch-(e.clientY-lastPointer[1])*.004,-1.2,1.2);lastPointer=[e.clientX,e.clientY]});canvas.addEventListener('pointerup',()=>{dragging=false;lastPointer=null});canvas.addEventListener('pointercancel',()=>{dragging=false;lastPointer=null});
$('gyro').onclick=async()=>{if(gyroEnabled){gyroEnabled=false;gyroBase=null;$('gyro').textContent='ENABLE MOTION';toast('Motion control disabled');return}if(typeof DeviceOrientationEvent==='undefined'){toast('Device orientation is not available in this browser');return}try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted'){toast('Motion permission was not granted');return}}gyroEnabled=true;gyroBase=null;$('gyro').textContent='MOTION ON';toast('Motion enabled. Rotate the phone to look around.')}catch(e){toast('Motion permission failed: '+e.message)}};
window.addEventListener('deviceorientation',e=>{if(e.alpha===null||e.beta===null||e.gamma===null)return;deviceAngles={alpha:e.alpha,beta:e.beta,gamma:e.gamma};});
function gyroRotation(){if(!gyroEnabled||!deviceAngles)return null;const {alpha,beta,gamma}=deviceAngles;const orient=screen.orientation?.angle??window.orientation??0;const euler=new THREE.Euler(THREE.MathUtils.degToRad(beta),THREE.MathUtils.degToRad(alpha),-THREE.MathUtils.degToRad(gamma),'YXZ');const q=new THREE.Quaternion().setFromEuler(euler);q.multiply(new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)));q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-THREE.MathUtils.degToRad(orient)));if(!gyroBase){gyroBase=q.clone().invert()}return gyroBase.clone().multiply(q)}
function updateCamera(now){if(transition){const u=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1;const k=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;camera.position.lerpVectors(transition.fromP,transition.toP,k);orbit.target.lerpVectors(transition.fromT,transition.toT,k);camera.lookAt(orbit.target);if(u>=1){transition=null;gyroBase=null;if(view==='applications'||view==='structure'){orbit.enabled=true;orbit.target.copy(new THREE.Vector3(...targets[view].t));orbit.minDistance=view==='structure'?4:7;orbit.maxDistance=view==='structure'?60:120}else orbit.enabled=false;if(view==='interior'){interiorYaw=0;interiorPitch=0}}return}if(view==='home'){orbit.enabled=false;camera.lookAt(0,1.7,0);return}if(view==='interior'){const base=new THREE.Quaternion().setFromEuler(new THREE.Euler(interiorPitch,interiorYaw,0,'YXZ'));const g=gyroRotation();if(g)base.multiply(g);camera.quaternion.copy(base)}else{orbit.update();if(view==='applications'&&gyroEnabled&&deviceAngles){const g=gyroRotation();if(g){const e=new THREE.Euler().setFromQuaternion(g,'YXZ');const desired=THREE.MathUtils.clamp(e.y,-.6,.6);const delta=desired-gyroOrbitOffset;camera.position.sub(orbit.target).applyAxisAngle(new THREE.Vector3(0,1,0),delta*.12).add(orbit.target);gyroOrbitOffset+=delta*.12;camera.lookAt(orbit.target)}}}}
function render(now){requestAnimationFrame(render);adaptive.tick(now);updateCamera(now);if(view==='home'&&!transition){const scroll=Math.min(1,scrollY/Math.max(1,innerHeight));camera.position.set(11+scroll*3,6+scroll*2,16+scroll*4);camera.lookAt(0,1.7,0)}renderer.render(scene,camera)}requestAnimationFrame(render);



//
// LivingRoom GLB Model
//

async function loadLivingRoom() {

  const loader = new GLTFLoader();

  try {

    const gltf = await loader.loadAsync(
      './public/models/LivingRoom.glb'
    );

    livingRoom = gltf.scene;
    livingRoom.name = 'LivingRoom';

    livingRoom.position.set(0, 0, 0);
    livingRoom.scale.set(1, 1, 1);

    livingRoom.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Keep imported signage out of the English-only experience.
        if(child.material?.name==='Material.013'){
          child.material=child.material.clone();
          child.material.map=null;
          child.material.color.setHex(0xb9a58c);
          child.material.needsUpdate=true;
        }
      }
    });

    domeRoot.add(livingRoom);

    
    //1.4 version update: Sync the visibility of the LivingRoom model based on the current interior mode.
    syncExperienceModel();

    console.log('LivingRoom loaded successfully');

  } catch (error) {

    console.error('Failed to load LivingRoom:', error);

  }
}



// Blender model integration. All three meshes remain independent for later interactions.
export async function loadDomeGLB(url='./public/models/source-dome.glb') {
  const gltf=await new GLTFLoader().loadAsync(url);
  const model=gltf.scene;
  // The supplied model is already ~10m wide and Y-up, but normalize future replacements.
  const bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3());
  if (size.x<0.01 || size.y<0.01 || size.z<0.01) throw new Error('Empty model bounds');
  const scale=10/Math.max(size.x,size.z);
  model.scale.setScalar(scale);
  const normalized=new THREE.Box3().setFromObject(model);
  const center=normalized.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-normalized.min.y,-center.z);
  model.traverse(object=>{
    if (!object.isMesh) return;
    const name=object.name.toLowerCase();
    if (name.includes('panels')) {
      importedPanels=object;applyPanelPalette(object);
    }
  });
  if(importedDome) domeRoot.remove(importedDome);
  importedDome=model;
  domeRoot.add(model);


  //1.4 version update: Hide the procedural shell and floor components when the Blender model is loaded, as they are no longer needed.
  proceduralShell.visible=false;
  floor.visible=false;
  floorRings.visible=false;
  baseRing.visible=false;

  syncExperienceModel();

  return model;


}


//1.4 version
// 视角1使用 LivingRoom.glb 自带的完整建筑
// 不再额外加载 source-dome.glb
// loadDomeGLB().catch(err=>{console.error('Could not load Blender dome:',err);toast('GLB load failed.')});


//1.4 version
//1.3version
// Load experience models
loadLivingRoom();
loadGarden();
loadFitness();


//1.4 version
window.ADAPT_DEBUG = {
  scene,
  camera,
  domeRoot,
  setView,
  loadDomeGLB,
  adaptive,

  inspectModels() {
    const result = [];

    scene.traverse((object) => {
      if (!object.isMesh && !object.isGroup) return;

      const name = object.name || '(unnamed)';

      if (
        object === importedDome ||
        object === proceduralShell ||
        object === fitnessModel ||
        object === livingRoom ||
        name.toLowerCase().includes('dome') ||
        name.toLowerCase().includes('shell') ||
        name.toLowerCase().includes('frame')
      ) {
        result.push({
          name,
          type: object.type,
          visible: object.visible,
          worldVisible: object.visible &&
            object.parent?.visible !== false,
          parent: object.parent?.name || '(unnamed)'
        });
      }
    });

    console.table(result);
    return result;
  }
};


// Keep the canvas between controls instead of drawing the model underneath them.
let layoutFrame=0,stageKey='';
function scheduleStage(){cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(layoutStage)}
function layoutStage(){
  const mobile=innerWidth<=700,landscape=innerHeight<540&&innerWidth>innerHeight;
  const hud=$('hud').getBoundingClientRect(),controls=$('adaptive-controls').getBoundingClientRect();
  let left=0,top=0,width=innerWidth,height=innerHeight;
  if(view!=='home'){
    if(mobile&&!landscape){top=Math.ceil(hud.bottom)+6;height=Math.max(1,($('adaptive-controls').hidden?innerHeight-32:controls.top)-top-6)}
    else {left=Math.ceil(hud.right)+8;top=Math.ceil(document.querySelector('header').getBoundingClientRect().bottom)+4;width=Math.max(1,($('adaptive-controls').hidden?innerWidth-8:controls.left)-left-8);height=Math.max(1,innerHeight-top-34)}
  }
  const key=[view,view==='structure'?document.body.dataset.layerView:'',left,top,width,height].join(',');if(key===stageKey)return;stageKey=key;
  Object.assign(canvas.style,{inset:'auto',left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  Object.assign($('cycle-flow').style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  if(view==='applications')adaptive.refitView();
  if(view==='structure'){
    const service=adaptive.serviceBounds();
    const bounds=service??adaptive.layerBounds();
    const direction=(service?new THREE.Vector3(.45,.56,1):new THREE.Vector3(-.52,.16,1)).normalize();
    targets.structure=fitCamera(bounds,bounds.getCenter(new THREE.Vector3()),direction,5);
    moveCamera('structure',300);
  }
}
const stageObserver=new ResizeObserver(scheduleStage);stageObserver.observe($('hud'));stageObserver.observe($('adaptive-controls'));
new MutationObserver(scheduleStage).observe(document.body,{attributes:true,attributeFilter:['class','data-application-view','data-layer-view']});
addEventListener('adapt-module-ready',()=>{if(view==='structure'){stageKey='';scheduleStage()}});
addEventListener('resize',scheduleStage);window.visualViewport?.addEventListener('resize',scheduleStage);scheduleStage();
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('Graphics paused. Waiting for the browser to restore the model.')});

canvas.addEventListener('webglcontextrestored',()=>{stageKey='';scheduleStage();toast('3D view restored.');});
