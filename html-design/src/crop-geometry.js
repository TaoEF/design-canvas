// Read actual CSS, never infer clipping from a data marker alone. Self-contained
// so the trusted export browser can use exactly the same contract as QA/editor.
export function cropGeometry(frame, geometry) {
  const img = frame?.querySelector(':scope > img[data-crop-image]');
  const fail = reason => ({ supported: false, reason });
  if (!frame?.matches('[data-crop-frame="1"]') || !img) return fail('invalid crop structure');
  const cs = getComputedStyle(frame), s = getComputedStyle(img), g = geometry(frame), inner = geometry(img);
  if (cs.filter!=='none' || cs.clipPath!=='none' || cs.maskImage!=='none') return fail('unsupported frame clip or effect');
  if (!g.supported || !inner.supported) return fail('unsupported crop transform');
  if (!['clip','hidden'].includes(cs.overflowX) || !['clip','hidden'].includes(cs.overflowY)) return fail('crop frame does not clip');
  const insets = ['Left','Top','Right','Bottom'].map(side => (parseFloat(cs[`border${side}Width`])||0)+(parseFloat(cs[`padding${side}`])||0));
  if (['Top','Right','Bottom','Left'].some(side => parseFloat(cs[`padding${side}`])>0) && (cs.overflowClipMargin!=='content-box' || cs.overflowX!=='clip' || cs.overflowY!=='clip')) return fail('unsupported padded crop clip');
  const w=g.w-insets[0]-insets[2],h=g.h-insets[1]-insets[3],z=Number(s.scale),position=s.objectPosition.split(/\s+/);
  if (!['cover','contain'].includes(s.objectFit) || position.length!==2 || position.some(v=>!/^[-\d.]+%$/.test(v))) return fail('unsupported image fit or position');
  const [x,y]=position.map(v=>parseFloat(v)/100);
  if (![w,h,z,x,y].every(Number.isFinite) || Math.min(w,h,img.naturalWidth,img.naturalHeight)<=0 || z<1 || z>20 || Math.min(x,y)<0 || Math.max(x,y)>1) return fail('invalid crop dimensions');
  if (Number(s.opacity)!==1 || ['Top','Right','Bottom','Left'].some(side => parseFloat(s[`padding${side}`])>0 || parseFloat(s[`border${side}Width`])>0)) return fail('unsupported internal padding, stroke or opacity');
  if (s.transform!=='none' || !['none','0deg'].includes(s.rotate) || s.transformOrigin!=='0px 0px' || s.position!=='static' || Number(s.zoom)!==1 || s.filter!=='none' || s.clipPath!=='none' || s.maskImage!=='none') return fail('unsupported internal image CSS');
  if (Math.abs(inner.w-w)>.1 || Math.abs(inner.h-h)>.1 || Math.abs(inner.scale/g.scale-z)>.001 || Math.abs(inner.angle-g.angle)>.001) return fail('image viewport differs from crop content box');
  const translate=s.translate==='none'?['0px','0px']:s.translate.split(/\s+/);
  const value=(v,size)=>v?.endsWith('%')?parseFloat(v)*size/100:v?.endsWith('px')?parseFloat(v):NaN;
  const tx=value(translate[0],w),ty=value(translate[1]||'0px',h);
  if (!Number.isFinite(tx+ty) || Math.abs(tx+x*(z-1)*w)>.1 || Math.abs(ty+y*(z-1)*h)>.1) return fail('image translation differs from crop focus');
  const ox=insets[0]-g.w/2,oy=insets[1]-g.h/2;
  const expectedX=g.cx+g.matrix.a*ox+g.matrix.c*oy+g.matrix.a*(tx+z*w/2)+g.matrix.c*(ty+z*h/2);
  const expectedY=g.cy+g.matrix.b*ox+g.matrix.d*oy+g.matrix.b*(tx+z*w/2)+g.matrix.d*(ty+z*h/2);
  if (Math.abs(inner.cx-expectedX)>.2 || Math.abs(inner.cy-expectedY)>.2) return fail('image offset differs from crop content box');
  return {supported:true,w,h,z,x,y,insets};
}
