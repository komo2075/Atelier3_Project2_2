export function clip(poly,axis,bound,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=sign*(a[axis]-bound)>=-1e-9,next=sign*(b[axis]-bound)>=-1e-9;if(inside)out.push(a);if(inside!==next){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}

// Clip a regular hexagonal tessellation to a rectangular surface domain.
export function clippedHexagons(width,height,radius=.48){
  const result=[],dx=Math.sqrt(3)*radius,dy=1.5*radius;
  for(let row=-1;row<=Math.ceil(height/dy)+1;row++)for(let col=-1;col<=Math.ceil(width/dx)+1;col++){
    const x=col*dx+(row%2)*dx/2,y=row*dy;
    let poly=Array.from({length:6},(_,i)=>[x+radius*Math.cos(Math.PI/6+i*Math.PI/3),y+radius*Math.sin(Math.PI/6+i*Math.PI/3)]);
    for(const [axis,bound,sign] of [[0,0,1],[0,width,-1],[1,0,1],[1,height,-1]])poly=clip(poly,axis,bound,sign);
    if(poly.length>=3)result.push(poly);
  }return result;
}
