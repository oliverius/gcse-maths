import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLoader } from '../src/js/lesson-loader.js';
import { validateLesson, validateManifest, createLessonEngine, operations } from '../src/js/lesson-engine.js';
import { createPresentation } from '../src/js/presentation.js';
const fetchJSON = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
const areas = await createLoader(fetchJSON).load();
const lessons = areas.flatMap(a => a.lessons.filter(l => l.available));
test('six subjects load with globally unique IDs and forty-four implemented lessons', () => {
  assert.equal(areas.length, 6);
  assert.deepEqual(areas.flatMap(a => a.errors), []);
  const ids = areas.flatMap(a => a.lessons.map(l => l.id));
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(lessons.length, 44);
  for (const lesson of lessons) {
    assert.ok(lesson.curriculum.every(r => r.url.startsWith('https://www.aqa.org.uk/')));
    assert.ok(lesson.steps.every(s => operations.has(s.operation.type)));
    assert.equal(validateLesson(lesson, lesson.subjectArea), lesson);
  }
});
test('subject files are cached and all URLs retain a repository subpath', async () => {
  const requests = [];
  const loader = createLoader(async url => {
    requests.push(url.pathname);
    const file = url.pathname.split('/').at(-1);
    return fetchJSON(new URL(`../src/data/${file}`, import.meta.url));
  }, new URL('https://example.com/gcse-maths/data/manifest.json'));
  await loader.load(); await loader.load();
  assert.equal(requests.length, 7);
  assert.ok(requests.every(url => url.startsWith('/gcse-maths/data/')));
});
test('invalid JSON file, invalid lesson, and duplicate ID are isolated', async () => {
  const loader = createLoader(async url => {
    if (url.href.endsWith('/geometry.json')) throw new Error('Invalid JSON');
    const result = await fetchJSON(url);
    const data = await result.json();
    if (data.id === 'algebra') {
      data.lessons.push({...data.lessons[0], id:'broken', steps:[]});
      data.lessons.push(data.lessons[0]);
    }
    return {ok:true,json:async()=>data};
  });
  const loaded = await loader.load();
  assert.equal(loaded.find(a=>a.id==='geometry').errors.length,1);
  assert.equal(loaded.find(a=>a.id==='algebra').errors.length,2);
  assert.equal(loaded.find(a=>a.id==='algebra').lessons.length,8);
  assert.equal(loaded.find(a=>a.id==='number').lessons.filter(l=>l.available).length,15);
});
test('validation rejects false equality, unsupported operations, unsafe URLs and malformed state', () => {
  const original = lessons.find(l=>l.id==='add-both');
  const invalid = mutate => { const copy=structuredClone(original); mutate(copy); assert.throws(()=>validateLesson(copy,'algebra')); };
  invalid(l=>{l.steps[1].balance=0;l.steps[1].unbalanced=false;});
  invalid(l=>{l.steps[0].math.right.constant=99;});
  invalid(l=>{l.steps[0].right[0].text='99';});
  invalid(l=>{l.steps[0].operation.type='execute-code';});
  invalid(l=>{l.curriculum[0].url='javascript:alert(1)';});
  invalid(l=>{l.steps[0].highlight=['unknown'];});
  assert.throws(()=>validateManifest({areas:[]}));
});
test('every equation state is equivalent at its solution or deliberately unequal', () => {
  for (const lesson of lessons.filter(l=>l.kind==='balance')) for(const state of lesson.steps) {
    const value = side => side.coefficient * lesson.solution + side.constant;
    assert.equal(Math.abs(value(state.math.left)-value(state.math.right))<1e-9,!state.unbalanced);
    if (!state.unbalanced) assert.equal((state.math.right.constant-state.math.left.constant)/(state.math.left.coefficient-state.math.right.coefficient),lesson.solution);
  }
});
test('number-line and fraction states preserve numerical meaning', () => {
  for (const [id,start,end] of [['subtract-five',2,-3],['add-negative',4,1]]) {
    const lesson=lessons.find(l=>l.id===id);
    assert.equal(lesson.steps[0].position,start);
    assert.equal(lesson.steps.at(-1).position,end);
    for(let i=1;i<lesson.steps.length-1;i++) assert.equal(lesson.steps[i].position,lesson.steps[i-1].position-1);
  }
  const fractions=lessons.find(l=>l.id==='equivalent-halves');
  assert.ok(fractions.steps.every(s=>s.bars.every(b=>b.shaded/b.parts===.5)));
});
test('engine serializes taps, restores Back/Replay, rejects invalid indices and rolls back errors', async () => {
  const engine=createLessonEngine(lessons[0]);
  let finish;
  const first=engine.go(1,async(s,forward,commit)=>{assert.ok(forward); await new Promise(resolve=>{finish=resolve;});commit();});
  assert.equal(engine.busy,true);
  assert.equal(await engine.go(2),false);
  finish(); await first;
  assert.equal(engine.index,1);
  const present=async(s,f,commit)=>commit();
  await engine.go(0,present); assert.equal(engine.index,0);
  await engine.go(2,present); await engine.go(0,present); assert.equal(engine.index,0);
  assert.equal(await engine.go(-1),false);
  assert.equal(await engine.go(999),false);
  await assert.rejects(engine.go(1,async(s,f,commit)=>{commit();throw new Error('animation');}));
  assert.equal(engine.index,0);assert.equal(engine.busy,false);
});
test('fullscreen supported, unsupported, rejection and Escape all preserve an exit route', async () => {
  for(const mode of ['supported','unsupported','rejected']) {
    const listeners={};const changes=[];
    const doc={documentElement:{},addEventListener:(name,fn)=>{listeners[name]=fn;}};
    if(mode!=='unsupported') doc.documentElement.requestFullscreen=async()=>{if(mode==='rejected')throw new Error();doc.fullscreenElement={};listeners.fullscreenchange();};
    doc.exitFullscreen=async()=>{doc.fullscreenElement=null;listeners.fullscreenchange();};
    const presentation=createPresentation(doc,active=>changes.push(active));
    await presentation.toggle();assert.equal(presentation.active,true);assert.equal(changes.at(-1),true);
    await presentation.toggle();assert.equal(presentation.active,false);
    if(mode!=='supported'){await presentation.toggle();listeners.keydown({key:'Escape'});assert.equal(presentation.active,false);}
    else {await presentation.toggle();doc.fullscreenElement=null;listeners.fullscreenchange();assert.equal(changes.at(-1),false);}
  }
});
