import {isPrime} from './learning-geometry.js';
export const learningOperations = {
  'tile-array':['show','partition','highlight','simplify'],
  'power-pattern':['show','replace','simplify'],
  pythagoras:['show','partition','highlight','replace','simplify','group'],
  'factor-tree':['show','split','highlight','simplify'],
  'place-value':['show','move','highlight','simplify'],
  'outcome-grid':['show','partition','highlight','simplify']
};
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const subset=(values,allowed)=>Array.isArray(values)&&new Set(values).size===values.length&&values.every(v=>allowed.includes(v));
export function validateLearningScene(lesson,state){
  const s=state.scene;
  if(lesson.kind==='tile-array'){
    ensure(integer(s.rows,1,5)&&integer(s.columns,1,5)&&integer(s.layers,1,2),'Invalid tile array.');
    ensure(integer(s.visibleRows,0,s.rows)&&integer(s.visibleLayers,1,s.layers)&&typeof s.edges==='boolean','Invalid array reveal.');
    ensure(s.highlightRow===null||integer(s.highlightRow,0,s.rows-1),'Invalid selected row.');
    const model=lesson.model;
    ensure(model&&integer(model.base,2,5)&&[2,3].includes(model.exponent)&&model.result===model.base**model.exponent,'Invalid power model.');
    ensure(s.rows===model.base&&s.columns===model.base&&s.layers===(model.exponent===3?model.base:1),'Array does not represent the power.');
  }
  if(lesson.kind==='power-pattern'){
    ensure(integer(s.base,2,9)&&Array.isArray(s.exponents)&&s.exponents.length===4&&s.exponents.every((v,i)=>v===3-i)&&integer(s.visible,1,4),'Invalid decreasing powers.');
    ensure(s.base===lesson.model.base&&lesson.model.result===1,'Invalid zero-power model.');
  }
  if(lesson.kind==='pythagoras'){
    ensure(integer(s.a,1,12)&&integer(s.b,1,12)&&s.c===Math.hypot(s.a,s.b)&&Number.isInteger(s.c),'Invalid right triangle.');
    for(const field of ['squares','knownSides','knownAreas'])ensure(subset(s[field],['a','b','c']),'Invalid triangle selection.');
    ensure(typeof s.unitTiles==='boolean'&&typeof s.transfer==='boolean','Invalid square-area state.');
    ensure(!s.unitTiles||s.c<=5,'Too many unit tiles.');
    ensure(!s.transfer||(s.unitTiles&&s.squares.length===3&&s.knownAreas.length===3),'Area transfer needs all three squares.');
    ensure(s.a===lesson.model.a&&s.b===lesson.model.b&&s.c===lesson.model.c,'Triangle changed between steps.');
  }
  if(lesson.kind==='factor-tree'){
    ensure(Array.isArray(s.nodes)&&s.nodes.length<=7&&s.nodes.length>=3,'Invalid factor tree.');
    const nodes=new Map(s.nodes.map(n=>[n.id,n]));
    ensure(nodes.size===s.nodes.length&&s.nodes.every(n=>typeof n.id==='string'&&integer(n.value,2,100)&&Array.isArray(n.children)&&[0,2].includes(n.children.length)),'Invalid factor nodes.');
    const roots=s.nodes.filter(n=>!s.nodes.some(p=>p.children.includes(n.id)));
    ensure(roots.length===1&&roots[0].value===lesson.model.value,'Invalid factor root.');
    const visited=new Set();
    function visit(node,depth){
      ensure(depth<=3&&!visited.has(node.id),'Cyclic or shared factor node.');visited.add(node.id);
      if(node.children.length){const children=node.children.map(id=>nodes.get(id));ensure(children.every(Boolean)&&children[0].value*children[1].value===node.value,'Factors do not multiply to parent.');children.forEach(child=>visit(child,depth+1));}
    }
    visit(roots[0],0);ensure(visited.size===nodes.size,'Disconnected factor tree.');
    ensure(subset(s.visible,[...nodes.keys()])&&s.visible.includes(roots[0].id)&&subset(s.selected,s.visible),'Invalid visible factors.');
    for(const n of s.nodes)if(s.visible.includes(n.id))ensure(!s.nodes.some(p=>p.children.includes(n.id)&&!s.visible.includes(p.id)),'Child revealed before parent.');
    if(state.operation.type==='simplify')ensure(s.visible.length===nodes.size&&s.nodes.filter(n=>!n.children.length).every(n=>isPrime(n.value)),'Prime factorisation is incomplete.');
  }
  if(lesson.kind==='place-value'){
    ensure([0,1].includes(s.shift)&&Array.isArray(s.digits)&&s.digits.length>=1&&s.digits.length<=5&&s.digits.every(d=>typeof d.id==='string'&&integer(d.digit,0,9)&&integer(d.place,-2,2)),'Invalid place-value digits.');
    ensure(new Set(s.digits.map(d=>d.id)).size===s.digits.length&&new Set(s.digits.map(d=>d.place)).size===s.digits.length,'Duplicate digit or place.');
    const first=lesson.steps[0].scene.digits;
    ensure(s.digits.length===first.length&&s.digits.every(d=>first.some(f=>f.id===d.id&&f.digit===d.digit&&d.place===f.place+s.shift)),'Digit identity or shift changed.');
    const value=s.digits.reduce((sum,d)=>sum+d.digit*10**d.place,0);
    ensure(Math.abs(value-lesson.model.initial*10**s.shift)<1e-9,'Incorrect place value.');
  }
  if(lesson.kind==='outcome-grid'){
    ensure(Array.isArray(s.rows)&&Array.isArray(s.columns)&&s.rows.length===2&&s.columns.length===3&&[...s.rows,...s.columns].every(v=>typeof v==='string'&&/^[A-Z0-9]$/.test(v)),'Invalid sample-space headers.');
    ensure(new Set(s.rows).size===2&&new Set(s.columns).size===3&&integer(s.revealed,0,6),'Invalid sample-space reveal.');
    ensure(s.rowNames&&s.columnNames&&s.rows.every(r=>typeof s.rowNames[r]==='string'&&s.rowNames[r].length>0)&&s.columns.every(c=>typeof s.columnNames[c]==='string'&&s.columnNames[c].length>0),'Missing outcome names.');
    const ids=s.rows.flatMap(r=>s.columns.map(c=>`${r}-${c}`));
    ensure(subset(s.selected,ids.slice(0,s.revealed)),'Unknown or hidden selected outcome.');
    ensure(lesson.model.total===ids.length,'Incorrect outcome count.');
  }
}
