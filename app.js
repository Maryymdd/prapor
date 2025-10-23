// --- Model ---
const model = {
  rods: [],                    // [{id,L,A,E,sigma}]
  loads: { q: [], F: [] },     // q: [{rodIndex,value}], F: [{nodeIndex,Fx}]
  bc: { fixedLeft: true, fixedRight: false },
};

// --- DOM ---
const els = {
  rodsList: document.getElementById('rodsList'),
  rodsEmpty: document.getElementById('rodsEmpty'),
  qList: document.getElementById('qList'),
  fList: document.getElementById('fList'),
  diag: document.getElementById('diag'),
  canvas: document.getElementById('canvas'),
  rodForm: document.getElementById('rodForm'),
  qForm: document.getElementById('qForm'),
  fForm: document.getElementById('fForm'),
  bcLeft: document.getElementById('bcLeft'),
  bcRight: document.getElementById('bcRight'),
  loadDemoBtn: document.getElementById('loadDemoBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
};

// --- Utils ---
function uid(){ return Math.random().toString(36).slice(2,9) }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)) }

// --- Rendering (SVG) ---
const pad = 30, midY = 150, rodH = 40, pxPerMeter = 120;

function lengthBefore(i){ return model.rods.slice(0,i).reduce((s,r)=>s+r.L,0) }
function rodX(i){ return pad + lengthBefore(i)*pxPerMeter }
function rodW(r){ return r.L*pxPerMeter }
function nodeX(nodeIndex){
  if(nodeIndex===0) return pad;
  const i = nodeIndex-1;
  return pad + lengthBefore(i+1)*pxPerMeter;
}
function calcTotalLengthPx(){ return lengthBefore(model.rods.length)*pxPerMeter + pad*2 }

function hatchPath(x,y,w,h){
  const step = 6; let d = '';
  for(let yy=y; yy<y+h; yy+=step){ d += `M ${x} ${yy} l ${w} ${step} `; }
  return d;
}

function clearSVG(svg){ while(svg.lastChild && svg.lastChild.nodeName!=='defs') svg.removeChild(svg.lastChild); }

function draw(){
  const vbW = Math.max(900, calcTotalLengthPx()+120);
  els.canvas.setAttribute('viewBox', `0 0 ${vbW} 300`);
  clearSVG(els.canvas);

  // axis x
  addLine(pad, pad, pad+100, pad, { 'stroke-dasharray':'4 4' });
  addText(pad+102, pad+4, 'x', { 'font-size':10 });

  // rods & nodes
  model.rods.forEach((r,i)=>{
    addRect(rodX(i), midY-rodH/2, rodW(r), rodH, {class:'rod'});
    addText(rodX(i)+rodW(r)/2, midY, String(i+1), { 'font-size':12, 'dominant-baseline':'middle', 'text-anchor':'middle' });
    addCircle(rodX(i), midY, 4, {class:'node'});
  });
  if(model.rods.length){
    const last = model.rods[model.rods.length-1];
    addCircle(rodX(model.rods.length-1)+rodW(last), midY, 4, {class:'node'});
  }

  // q loads
  model.loads.q.forEach(q=>{
    const i = q.rodIndex, r = model.rods[i];
    if(!r) return;
    const y = midY-rodH/2-14;
    addLine(rodX(i)+6, y, rodX(i)+rodW(r)-6, y, { 'marker-start':'url(#arrow)', 'marker-end':'url(#arrow)' });
    addText(rodX(i)+rodW(r)/2, y-4, `q=${q.value}`, { 'font-size':10, 'text-anchor':'middle' });
  });

  // concentrated F
  model.loads.F.forEach(F=>{
    const nx = nodeX(F.nodeIndex);
    const dir = Math.sign(F.Fx) || 1;
    addLine(nx, midY, nx + 30*dir, midY, { 'marker-end':'url(#arrow)' });
    addText(nx + 30*dir + 4*dir, midY-4, `F=${F.Fx}`, { 'font-size':10, 'text-anchor': dir>=0 ? 'start':'end' });
  });

  // supports
  if(model.bc.fixedLeft){
    addRect(pad-14, midY-rodH/2-10, 10, rodH+20, {class:'support'});
    addPath(hatchPath(pad-14, midY-rodH/2-10, 10, rodH+20), {class:'hatch'});
  }
  if(model.bc.fixedRight && model.rods.length){
    const x0 = rodX(model.rods.length-1)+rodW(model.rods.at(-1))+4;
    addRect(x0, midY-rodH/2-10, 10, rodH+20, {class:'support'});
    addPath(hatchPath(x0, midY-rodH/2-10, 10, rodH+20), {class:'hatch'});
  }
}

function addRect(x,y,w,h,attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg','rect'); el.setAttribute('x',x);el.setAttribute('y',y);el.setAttribute('width',w);el.setAttribute('height',h); setAttrs(el,attrs); els.canvas.appendChild(el); }
function addLine(x1,y1,x2,y2,attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg','line'); el.setAttribute('x1',x1);el.setAttribute('y1',y1);el.setAttribute('x2',x2);el.setAttribute('y2',y2); setAttrs(el,attrs); els.canvas.appendChild(el); }
function addText(x,y,text,attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg','text'); el.setAttribute('x',x);el.setAttribute('y',y); el.textContent=text; setAttrs(el,attrs); els.canvas.appendChild(el); }
function addCircle(cx,cy,r,attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg','circle'); el.setAttribute('cx',cx);el.setAttribute('cy',cy);el.setAttribute('r',r); setAttrs(el,attrs); els.canvas.appendChild(el); }
function addPath(d,attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg','path'); el.setAttribute('d',d); setAttrs(el,attrs); els.canvas.appendChild(el); }
function setAttrs(el,attrs){ for(const k in attrs){ el.setAttribute(k, attrs[k]); } if(attrs.class){ el.setAttribute('class', attrs.class); } }

// --- UI Lists ---
function renderLists(){
  els.rodsEmpty.style.display = model.rods.length? 'none':'block';
  els.rodsList.innerHTML = '';
  model.rods.forEach((r,idx)=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="card-head">
        <strong>№ ${idx+1}</strong>
        <button class="danger" data-id="${r.id}">удалить</button>
      </div>
      <div class="grid small">
        <div>L = ${r.L}</div>
        <div>A = ${r.A}</div>
        <div>E = ${r.E}</div>
        <div>[σ] = ${r.sigma}</div>
      </div>`;
    card.querySelector('button').addEventListener('click',()=>{
      model.rods = model.rods.filter(x=>x.id!==r.id);
      // также удаляем нагрузки, связанные с этим стержнем
      model.loads.q = model.loads.q.filter(q=>q.rodIndex!==idx);
      draw(); renderLists(); diagnose(); saveLocal();
    });
    els.rodsList.appendChild(card);
  });

  els.qList.innerHTML = '';
  model.loads.q.forEach((q,i)=>{
    const pill = document.createElement('div'); pill.className='pill';
    pill.innerHTML = `<span>q: стержень ${q.rodIndex+1}, ${q.value} Н/м</span>
      <button class="link" data-i="${i}">удалить</button>`;
    pill.querySelector('button').addEventListener('click',()=>{
      model.loads.q.splice(i,1); draw(); renderLists(); diagnose(); saveLocal();
    });
    els.qList.appendChild(pill);
  });

  els.fList.innerHTML = '';
  model.loads.F.forEach((F,i)=>{
    const pill = document.createElement('div'); pill.className='pill';
    pill.innerHTML = `<span>F: узел ${F.nodeIndex+1}, Fx = ${F.Fx} Н</span>
      <button class="link" data-i="${i}">удалить</button>`;
    pill.querySelector('button').addEventListener('click',()=>{
      model.loads.F.splice(i,1); draw(); renderLists(); diagnose(); saveLocal();
    });
    els.fList.appendChild(pill);
  });
}

// --- Diagnostics ---
function diagnose(){
  let ok = true, msg = 'OK: входные данные выглядят корректно.';
  if(model.rods.length===0){ ok=false; msg='Добавьте хотя бы один стержень.'; }
  if(ok){
    for(let i=0;i<model.rods.length;i++){
      const r = model.rods[i];
      if(!(r.L>0&&r.A>0&&r.E>0&&r.sigma>0)){ ok=false; msg=`Стержень №${i+1}: параметры должны быть > 0.`; break; }
    }
  }
  if(ok && !model.bc.fixedLeft && !model.bc.fixedRight){ ok=false; msg='Не задана ни одна жёсткая опора.'; }
  if(ok){
    for(let i=0;i<model.rods.length;i++){
      const r = model.rods[i];
      const sumF = model.loads.F.filter(F=>F.nodeIndex===i || F.nodeIndex===i+1).reduce((s,f)=>s+f.Fx,0);
      const sumQ = model.loads.q.filter(q=>q.rodIndex===i).reduce((s,q)=>s+q.value*r.L,0);
      const N = Math.abs(sumF + sumQ);
      const sigma = N / r.A;
      if(sigma > r.sigma){ ok=false; msg=`Стержень №${i+1}: оценка σ≈${sigma.toExponential(2)} > [σ]=${r.sigma.toExponential(2)}`; break; }
    }
  }
  els.diag.className = 'diagnostics ' + (ok? 'ok':'bad');
  els.diag.textContent = msg;
  return ok;
}

// --- Forms ---
els.rodForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(els.rodForm);
  model.rods.push({
    id: uid(),
    L: Number(fd.get('L')),
    A: Number(fd.get('A')),
    E: Number(fd.get('E')),
    sigma: Number(fd.get('sigma')),
  });
  draw(); renderLists(); diagnose(); saveLocal();
});

els.qForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(els.qForm);
  const rodIndex = clamp(Number(fd.get('rodIndex'))-1, 0, Math.max(0, model.rods.length-1));
  const value = Number(fd.get('value'));
  model.loads.q.push({ rodIndex, value });
  draw(); renderLists(); diagnose(); saveLocal();
});

els.fForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(els.fForm);
  const nodeIndex = clamp(Number(fd.get('nodeIndex'))-1, 0, model.rods.length);
  const Fx = Number(fd.get('Fx'));
  model.loads.F.push({ nodeIndex, Fx });
  draw(); renderLists(); diagnose(); saveLocal();
});

els.bcLeft.addEventListener('change', ()=>{ model.bc.fixedLeft = els.bcLeft.checked; draw(); diagnose(); saveLocal(); });
els.bcRight.addEventListener('change', ()=>{ model.bc.fixedRight = els.bcRight.checked; draw(); diagnose(); saveLocal(); });

// --- Import/Export ---
els.exportBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(model,null,2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'project.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
});

els.importInput.addEventListener('change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const data = JSON.parse(fr.result);
      if(!data || !Array.isArray(data.rods)) throw new Error('Некорректный формат');
      model.rods = data.rods; model.loads = data.loads || {q:[],F:[]}; model.bc = data.bc || {fixedLeft:true,fixedRight:false};
      // очистим id если их нет
      model.rods.forEach(r=> r.id = r.id || uid());
      draw(); renderLists(); diagnose(); saveLocal();
    }catch(err){ alert('Ошибка импорта: '+err.message); }
  };
  fr.readAsText(file);
});

// --- Demo & Persistence ---
els.loadDemoBtn.addEventListener('click', ()=>{
  Object.assign(model, {
    rods: [
      {id:uid(), L: 1.0, A: 0.01, E: 2e11, sigma: 2e8},
      {id:uid(), L: 0.5, A: 0.015, E: 2e11, sigma: 2e8},
      {id:uid(), L: 1.2, A: 0.02, E: 2e11, sigma: 2e8},
    ],
    loads: { q: [{rodIndex:0,value:100}], F: [{nodeIndex:3,Fx:500}] },
    bc: { fixedLeft: true, fixedRight: false },
  });
  draw(); renderLists(); diagnose(); saveLocal();
});

function saveLocal(){ try{ localStorage.setItem('rod_project', JSON.stringify(model)); }catch{} }
function loadLocal(){ try{ const s = localStorage.getItem('rod_project'); if(s){ const d = JSON.parse(s); model.rods=d.rods||[]; model.loads=d.loads||{q:[],F:[]}; model.bc=d.bc||{fixedLeft:true,fixedRight:false}; } }catch{} }

// --- Init ---
loadLocal();
draw(); renderLists(); diagnose();
