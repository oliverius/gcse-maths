import {element} from './balance.js';
import {mathRow,mathSVG} from './notation.js';
import {pythagorasGeometry,isPrime} from './learning-geometry.js';

function label(svg,text,x,y){svg.append(element('text',{x,y,'text-anchor':'middle',class:'diagram-label'},text));}
function math(svg,latex,spoken,x,y,width=100,size=28,background=false){
  if(background)svg.append(element('rect',{x:x-width/2,y:y-21,width,height:42,rx:5,fill:'#fff','fill-opacity':.94}));
  svg.append(mathSVG({latex,spoken},{x:x-width/2,y:y-28,width,height:56,size}));
}
function entity(id,x,y){return element('g',{'data-entity':id,x,y});}

function tileArray(svg,s){
  const cell=Math.min(42,185/s.rows),gap=82;
  const total=s.columns*cell*s.layers+gap*(s.layers-1);
  for(let layer=0;layer<s.visibleLayers;layer++){
    const x0=400-total/2+layer*(s.columns*cell+gap),y0=145;
    if(s.layers>1)label(svg,`Layer ${layer+1}`,x0+s.columns*cell/2,120);
    for(let row=0;row<s.rows;row++)for(let col=0;col<s.columns;col++){
      const x=x0+col*cell,y=y0+row*cell;
      const node=entity(`array-${layer}-${row}-${col}`,x,y);
      const visible=row<s.visibleRows;
      node.append(element('rect',{x,y,width:cell,height:cell,fill:visible?(row===s.highlightRow?'#f4d789':layer?'#eee5f7':'#dceaf5'):'#fff',stroke:visible?'#6740a0':'#b6c8bd','stroke-width':2}));svg.append(node);
    }
    if(s.edges){
      math(svg,String(s.columns),`${s.columns} tiles across`,x0+s.columns*cell/2,y0+s.rows*cell+26,70,27);
      math(svg,String(s.rows),`${s.rows} tiles high`,x0-30,y0+s.rows*cell/2,50,27);
    }
  }
}
function powerPattern(svg,s){
  const gap=180;
  for(let i=0;i<s.visible;i++){
    const x=130+i*gap;
    const node=entity(`power-${s.exponents[i]}`,x,206);
    node.append(element('rect',{x:x-64,y:145,width:128,height:130,rx:12,fill:i===s.visible-1?'#fff3d7':'#f4f7f2',stroke:i===s.visible-1?'#6740a0':'#759386','stroke-width':2}));
    math(node,`${s.base}^{${s.exponents[i]}}`,`${s.base} to the power ${s.exponents[i]}`,x,176,110,31);
    math(node,String(s.base**s.exponents[i]),String(s.base**s.exponents[i]),x,238,110,32);
    svg.append(node);
    if(i>0){const arrow=entity(`divide-${i}`,x-90,206);math(arrow,`\\div${s.base}`,`divide by ${s.base}`,x-90,207,70,25);svg.append(arrow);}
  }
}
export function pythagorasLayout(a,b){
  const geometry=pythagorasGeometry(a,b);
  const points=Object.values(geometry.squares).flatMap(s=>s.points);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(540/(maxX-minX),238/(maxY-minY));
  const map=p=>[400+(p[0]-(minX+maxX)/2)*scale,244+(p[1]-(minY+maxY)/2)*scale];
  return {...geometry,scale,map};
}
function pythagoras(svg,s){
  const g=pythagorasLayout(s.a,s.b);
  const points=Object.values(g.vertices).map(g.map);
  label(svg,'c is the hypotenuse, opposite the right angle',400,108);
  const triangle=entity('right-triangle',...points[0]);
  triangle.append(element('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:'#f4f7f2',stroke:'#213b35','stroke-width':3}));svg.append(triangle);
  for(const id of s.squares){
    const square=g.squares[id],mapped=square.points.map(g.map);
    const node=entity(`square-${id}`,...mapped[0]);
    node.append(element('polygon',{points:mapped.map(p=>p.join(',')).join(' '),fill:s.unitTiles?'#fff':s.knownAreas.includes(id)?(id==='c'?'#eee5f7':'#dceaf5'):'#fff',stroke:id==='c'?'#6740a0':'#174f7a','stroke-width':2}));svg.append(node);
  }
  if(s.unitTiles){
    const ids=s.transfer?['c']:s.squares.filter(id=>id!=='c');
    for(const id of ids){
      const square=g.squares[id],side=Math.round(square.length);
      for(let row=0;row<side;row++)for(let col=0;col<side;col++){
        const index=row*side+col+(id==='b'?s.a*s.a:0);
        const origin=[square.origin[0]+square.e[0]*col+square.n[0]*row,square.origin[1]+square.e[1]*col+square.n[1]*row];
        const [x,y]=g.map(origin),node=entity(`area-unit-${index}`,x,y);
        node.setAttribute('data-angle',square.angle);
        node.setAttribute('style',`transform-origin:${x}px ${y}px;transform:rotate(${square.angle}deg)`);
        node.append(element('rect',{x,y,width:g.scale,height:g.scale,fill:index<s.a*s.a?'#dceaf5':'#eee5f7',stroke:index<s.a*s.a?'#174f7a':'#6740a0','stroke-width':1.2}));svg.append(node);
      }
    }
  }
  const [ax,ay]=points[0];
  svg.append(element('path',{d:`M ${ax+10} ${ay} v -10 h -10`,fill:'none',stroke:'#213b35','stroke-width':2,'data-right-angle':'90'}));
  for(const id of ['a','b','c']){
    const sq=g.squares[id],along=id==='a'?.5:.2;
    const mid=[sq.origin[0]+sq.e[0]*sq.length*along,sq.origin[1]+sq.e[1]*sq.length*along];
    const mapped=g.map(mid),offset=id==='c'?14:-12;
    const x=mapped[0]+sq.n[0]*offset,y=mapped[1]+sq.n[1]*offset;
    math(svg,s.knownSides.includes(id)?String(s[id]):id,s.knownSides.includes(id)?`${id} is ${s[id]}`:`unknown side ${id}`,x,y,42,22,!s.unitTiles);
    if(s.squares.includes(id)){
      const [cx,cy]=g.map(sq.centre);
      math(svg,s.knownAreas.includes(id)?String(s[id]**2):`${id}^{2}`,s.knownAreas.includes(id)?`square area ${s[id]**2}`:`square area ${id} squared`,cx,cy,58,28,!s.unitTiles);
    }
  }
}
function factorTree(svg,s){
  const nodes=new Map(s.nodes.map(n=>[n.id,n])),positions=new Map();
  const root=s.nodes.find(n=>!s.nodes.some(p=>p.children.includes(n.id)));
  function position(n,x,y,spread){positions.set(n.id,[x,y]);n.children.forEach((id,i)=>position(nodes.get(id),x+(i?spread:-spread),y+86,spread/2));}
  position(root,400,145,155);
  for(const node of s.nodes)if(s.visible.includes(node.id)){
    const [x,y]=positions.get(node.id);
    for(const child of node.children)if(s.visible.includes(child)){
      const [cx,cy]=positions.get(child);
      svg.append(element('line',{x1:x,y1:y+23,x2:cx,y2:cy-23,stroke:'#759386','stroke-width':3,'data-object':`branch-${child}`}));
    }
    const wrapper=entity(node.id,x,y),selected=s.selected.includes(node.id);
    wrapper.append(element('circle',{cx:x,cy:y,r:27,fill:selected?'#f4d789':'#fff',stroke:selected?'#6740a0':'#174f7a','stroke-width':selected?4:2}));
    math(wrapper,String(node.value),String(node.value),x,y,50,29);
    if(selected&&isPrime(node.value))label(wrapper,'prime',x,y+48);
    svg.append(wrapper);
  }
}
function placeValue(svg,s){
  const names=['Hundreds','Tens','Ones','Tenths','Hundredths'];
  const powers=[2,1,0,-1,-2];
  powers.forEach((place,i)=>{
    const x=180+i*110;
    svg.append(element('rect',{x:x-54,y:146,width:108,height:153,fill:'#f4f7f2',stroke:'#ccd7ce'}));
    label(svg,names[i],x,134);
  });
  // The decimal boundary is fixed; only digit identities change columns.
  svg.append(element('line',{x1:455,x2:455,y1:144,y2:300,stroke:'#a45100','stroke-width':3,'data-decimal-boundary':'fixed'}));
  svg.append(element('circle',{cx:455,cy:259,r:5,fill:'#a45100'}));
  for(const digit of s.digits){
    const x=180+powers.indexOf(digit.place)*110,y=224,node=entity(digit.id,x,y);
    node.append(element('rect',{x:x-34,y:y-36,width:68,height:72,rx:8,fill:s.shift?'#fff3d7':'#fff',stroke:s.shift?'#6740a0':'#174f7a','stroke-width':3}));
    math(node,String(digit.digit),`${digit.digit} in place ten to power ${digit.place}`,x,y,62,39);svg.append(node);
  }
}
function outcomeGrid(svg,s){
  const x0=270,y0=142,w=120,h=83;
  s.columns.forEach((c,i)=>math(svg,c,s.columnNames[c],x0+(i+.5)*w,116,75,28));
  s.rows.forEach((r,row)=>{
    math(svg,r,s.rowNames[r],x0-47,y0+(row+.5)*h,75,28);
    s.columns.forEach((c,col)=>{
      const id=`${r}-${c}`,x=x0+col*w,y=y0+row*h;
      svg.append(element('rect',{x,y,width:w,height:h,fill:'#fff',stroke:'#b6c8bd','stroke-width':2}));
      if(row*s.columns.length+col<s.revealed){
        const node=entity(`outcome-${id}`,x,y);
        node.append(element('rect',{x:x+4,y:y+4,width:w-8,height:h-8,rx:6,fill:s.selected.includes(id)?'#f4d789':'#dceaf5',stroke:s.selected.includes(id)?'#6740a0':'#174f7a','stroke-width':2}));
        math(node,`(${r},${c})`,`${s.rowNames[r]} and ${s.columnNames[c]}`,x+w/2,y+h/2,104,27);svg.append(node);
      }
    });
  });
  label(svg,s.rows.map(r=>`${r} = ${s.rowNames[r]}`).join(' · '),450,345);
}
const renderers={'tile-array':tileArray,'power-pattern':powerPattern,pythagoras,'factor-tree':factorTree,'place-value':placeValue,'outcome-grid':outcomeGrid};
export const learningKinds=Object.keys(renderers);
export function drawLearningDiagram(lesson,state){
  const svg=element('svg',{viewBox:'0 0 800 400','aria-hidden':'true'});
  mathRow(svg,state.left,400,53,state.highlight,{size:38,height:94});
  renderers[lesson.kind](svg,state.scene);
  if(state.scene.caption)label(svg,state.scene.caption,400,386);
  return svg;
}
