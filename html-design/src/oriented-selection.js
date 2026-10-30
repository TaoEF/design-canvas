import {elementGeometry, normalizedAngle} from './geometry.js';
import {isGroup, groupRoots, visibleMember} from './groups.js';

// UI reference only: actual member CSS owns all rendered geometry. The versioned
// scalar is relative to the real CSS parent, never to a contents group's hint.
export const GROUP_ANGLE = 'data-group-angle-v1';
export const sameSelection = (a,b) => a.length===b.length && a.every(n=>b.includes(n));
export function groupLocalAngle(group) {
  const raw=group.getAttribute(GROUP_ANGLE);
  return raw?.trim() && raw.length<=64 && Number.isFinite(Number(raw)) ? normalizedAngle(Number(raw)) : 0;
}
export function parentAngle(group) {
  let parent=group.parentElement;
  while(parent && getComputedStyle(parent).display==='contents')parent=parent.parentElement;
  return parent ? elementGeometry(parent).angle : 0;
}
// Stop at ordinary boxes: rotating their CSS already rotates the inner basis.
export function rotationGroups(nodes) {
  return nodes.flatMap(node=>isGroup(node)?[node,...rotationGroups([...node.children])]:[]);
}
export function writeGroupAngle(group, angle) {
  const value=Math.round(normalizedAngle(angle)*1e4)/1e4;
  if(Math.abs(value)<1e-4)group.removeAttribute(GROUP_ANGLE);
  else group.setAttribute(GROUP_ANGLE,String(value));
}
export function orientedBounds(points,angle) {
  if(!points.length)return null;
  const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  const local=points.map(p=>({x:c*p.x+s*p.y,y:-s*p.x+c*p.y}));
  const left=Math.min(...local.map(p=>p.x)),right=Math.max(...local.map(p=>p.x));
  const top=Math.min(...local.map(p=>p.y)),bottom=Math.max(...local.map(p=>p.y));
  const x=(left+right)/2,y=(top+bottom)/2;
  return {cx:c*x-s*y,cy:s*x+c*y,width:right-left,height:bottom-top,angle};
}
export function selectionFrame(nodes,multiAngle=0) {
  if(nodes.length===1&&!isGroup(nodes[0])) {
    const g=elementGeometry(nodes[0]);
    return g.supported?{cx:g.cx,cy:g.cy,width:g.w*g.scale,height:g.h*g.scale,angle:g.angle}:null;
  }
  const points=[];
  for(const node of groupRoots(nodes).filter(visibleMember)) {
    const g=elementGeometry(node);
    if(!g.supported)return null;
    for(const x of [-g.w/2,g.w/2])for(const y of [-g.h/2,g.h/2])
      points.push({x:g.cx+g.matrix.a*x+g.matrix.c*y,y:g.cy+g.matrix.b*x+g.matrix.d*y});
  }
  const group=nodes.length===1&&isGroup(nodes[0])?nodes[0]:null;
  const board=nodes[0]?.closest('[data-artboard]');
  const angle=group?parentAngle(group)+groupLocalAngle(group):(board?elementGeometry(board).angle:0)+multiAngle;
  return orientedBounds(points,angle);
}
export function frameCorner(frame,x,y) {
  const r=frame.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {x:frame.cx+c*x*frame.width/2-s*y*frame.height/2,y:frame.cy+s*x*frame.width/2+c*y*frame.height/2};
}
export function resizeCursor(handle,angle) {
  const base={e:0,se:45,s:90,sw:135,w:180,nw:225,n:270,ne:315}[handle];
  return ['ew-resize','nwse-resize','ns-resize','nesw-resize'][((Math.round((base+angle)/45)%4)+4)%4];
}
