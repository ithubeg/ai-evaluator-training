// ======================== APP STATE ========================
const APP = {
  lang: "en",
  mode: "training",
  config: null,
  tasks: [],
  evaluations: [],
  currentIndex: 0,
  currentIssues: [],
  useCustom: false,
  timeRemaining: 0,
  timerInterval: null,
  locked: false,
  sessionLoadTime: null,
  currentFileName: null
};

// i18n strings (DRY)
const i18n = {
  en: { response:"Response Content", quiz:"Issue Editor", rationale:"Your Issues", evidence:"Evidence:", behavior:"Behavior:", sub:"Explanation:", impact:"Impact:", add:"Add Issue", history:"Issues List", rationaleHeader:"Your evaluation:" },
  ar: { response:"محتوى الاستجابة", quiz:"محرر المشكلة", rationale:"مشاكلك", evidence:"الدليل:", behavior:"السلوك:", sub:"الشرح:", impact:"الأثر:", add:"أضف مشكلة", history:"قائمة المشاكل", rationaleHeader:"تقييمك:" }
};

// Helpers
const $ = id => document.getElementById(id);
const getBehaviors = () => APP.config?.behaviors ? Object.fromEntries(APP.config.behaviors.map(b=>[b.key,b])) : {};
const getImpacts = () => APP.config?.impacts ? Object.fromEntries(APP.config.impacts.map(i=>[i.key,i])) : {};

let STORAGE_KEY_PREFIX = "accurater_session_";
let RECENT_FILES_KEY = "accurater_recent_files";

// ======================== STORAGE ========================
function saveState() {
  if (!APP.currentFileName) return;
  const state = { lang:APP.lang, mode:APP.mode, config:APP.config, tasks:APP.tasks, evaluations:APP.evaluations, currentIndex:APP.currentIndex, useCustom:APP.useCustom, timeRemaining:APP.timeRemaining, locked:APP.locked, sessionLoadTime:APP.sessionLoadTime, currentFileName:APP.currentFileName };
  localStorage.setItem(STORAGE_KEY_PREFIX+APP.currentFileName, JSON.stringify(state));
  updateRecentFiles(APP.currentFileName);
}
function updateRecentFiles(fileName){
  let recent = JSON.parse(localStorage.getItem(RECENT_FILES_KEY)||"[]");
  recent = recent.filter(f=>f.name!==fileName);
  recent.unshift({name:fileName, timestamp:Date.now()});
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent.slice(0,5)));
}
function loadStateByFileName(fileName){
  let raw = localStorage.getItem(STORAGE_KEY_PREFIX+fileName);
  if(!raw) return false;
  try{
    let s=JSON.parse(raw);
    if(!s.config||!s.tasks) return false;
    Object.assign(APP, s);
    return true;
  }catch(e){ return false; }
}
function deleteSession(fileName){
  localStorage.removeItem(STORAGE_KEY_PREFIX+fileName);
  let recent = JSON.parse(localStorage.getItem(RECENT_FILES_KEY)||"[]");
  recent = recent.filter(f=>f.name!==fileName);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
}

// ======================== UI HELPERS ========================
function updateUILanguage(){
  let t = i18n[APP.lang];
  ["lbl-response","lbl-quiz","lbl-rationale","lbl-evidence","lbl-behavior","lbl-sub","lbl-impact","lbl-history"].forEach(id=>{ if($(id)) $(id).textContent = t[id.replace("lbl-","")]; });
  if($("add-issue-btn")) $("add-issue-btn").textContent = t.add;
  document.body.classList.toggle("rtl", APP.lang==="ar");
}
function closeModal(id){ $(id).style.display="none"; }

function rebuildAllSelectors(){
  buildBehaviorSelect();
  buildImpactSelect();
  updateSubInput();
}
function buildBehaviorSelect(){
  let sel=$("behavior-select"); sel.innerHTML="";
  let opt=document.createElement("option"); opt.value=""; opt.textContent="-- Select --"; sel.appendChild(opt);
  let behaviors=getBehaviors();
  for(let k in behaviors){ let o=document.createElement("option"); o.value=k; o.textContent=behaviors[k][APP.lang]; sel.appendChild(o); }
  if(APP.useCustom){ let o=document.createElement("option"); o.value="__other__"; o.textContent="Other..."; sel.appendChild(o); }
}
function buildImpactSelect(){
  let sel=$("impact-select"); sel.innerHTML="";
  let def=document.createElement("option"); def.value=""; def.textContent="-- Select --"; sel.appendChild(def);
  let impacts=getImpacts();
  let behaviorKey=$("behavior-select").value;
  let allowed = (behaviorKey && behaviorKey!=="__other__") ? (getBehaviors()[behaviorKey]?.impact_keys || Object.keys(impacts)) : Object.keys(impacts);
  allowed.forEach(k=>{ if(impacts[k]){ let o=document.createElement("option"); o.value=k; o.textContent=impacts[k][APP.lang]; sel.appendChild(o); } });
  if(APP.useCustom){ let o=document.createElement("option"); o.value="__other__"; o.textContent="Other..."; sel.appendChild(o); }
  $("impact-other-area").style.display="none";
}
function updateSubInput(){
  let key=$("behavior-select").value;
  let container=$("sub-input-area"); container.innerHTML="";
  if(!key || key==="__other__") return;
  let behav=getBehaviors()[key]; if(!behav) return;
  let sel=document.createElement("select"); sel.id="sub-select"; sel.className="input-field";
  behav.subs.forEach(s=>{ let o=document.createElement("option"); o.value=s; o.textContent=s; sel.appendChild(o); });
  if(APP.useCustom){ let o=document.createElement("option"); o.value="__other__"; o.textContent="Other..."; sel.appendChild(o); }
  sel.addEventListener("change",()=>{
    if(sel.value==="__other__"){ container.innerHTML=""; let inp=document.createElement("input"); inp.type="text"; inp.id="sub-other"; inp.className="input-field"; inp.placeholder="Custom explanation"; container.appendChild(inp); }
  });
  container.appendChild(sel);
}

function captureEvidence(){ let sel=window.getSelection().toString().trim(); if(sel) $("evidence-box").value=sel; }
function addIssue(){
  if(APP.locked) return;
  let behaviorKey=$("behavior-select").value; if(!behaviorKey) return alert("Select a behavior.");
  let finalBehaviorKey=behaviorKey, behaviorName="";
  let behaves=getBehaviors();
  if(behaviorKey==="__other__"){ let other=$("behavior-other").value.trim(); if(!other) return; finalBehaviorKey="__custom__"; behaviorName=other; }
  else behaviorName=behaves[behaviorKey][APP.lang];
  let evidence=$("evidence-box").value.trim(); if(!evidence) return alert("Highlight evidence first.");
  let subDesc="";
  let subSel=document.getElementById("sub-select");
  if(subSel){
    if(subSel.value==="__other__") subDesc=document.getElementById("sub-other")?.value.trim()||"";
    else subDesc=subSel.value;
  }
  if(!subDesc) return alert("Explanation required.");
  let impactSel=$("impact-select");
  let impactKey=impactSel.value, impactText="";
  if(impactKey==="__other__"){ impactText=$("impact-other").value.trim(); if(!impactText) return; impactKey="__other__"; }
  else if(impactKey){ let impacts=getImpacts(); impactText=impacts[impactKey][APP.lang]; }
  else return alert("Select an impact.");
  let correction = (behaviorKey!=="__other__" && behaves[behaviorKey]) ? behaves[behaviorKey].correction[APP.lang] : "Manual review needed.";
  let newIssue={ evidence, behaviorKey:finalBehaviorKey, behaviorName, subDesc, impactKey, impactText, correction };
  if(APP.currentIssues.some(i=>i.evidence===evidence && i.behaviorKey===finalBehaviorKey && i.subDesc===subDesc && i.impactKey===impactKey)) return alert("Duplicate issue.");
  APP.currentIssues.push(newIssue);
  refreshCurrentIssuesUI();
  updateLiveScore();
  saveState();
}
function removeIssue(idx){ APP.currentIssues.splice(idx,1); refreshCurrentIssuesUI(); updateLiveScore(); saveState(); }
function refreshCurrentIssuesUI(){
  let list=$("issues-list"); list.innerHTML="";
  let txt = i18n[APP.lang].rationaleHeader+"\n\n";
  APP.currentIssues.forEach((iss,i)=>{
    txt+=`${i+1}. [${iss.evidence}] → ${iss.behaviorName||iss.behaviorKey} (${iss.subDesc}), impact: ${iss.impactText||iss.impactKey}.\n`;
    let tag=document.createElement("span"); tag.className="issue-tag";
    tag.appendChild(document.createTextNode(`${iss.behaviorName||iss.behaviorKey} `));
    let actions=document.createElement("span"); actions.className="issue-actions";
    let delBtn=document.createElement("button"); delBtn.textContent="×"; delBtn.onclick=()=>removeIssue(i);
    actions.appendChild(delBtn); tag.appendChild(actions); list.appendChild(tag);
  });
  $("rationale-display").textContent=txt;
}

function updateLiveScore(){
  if(APP.useCustom){ $("task-score-badge").style.display="none"; return; }
  let task=APP.tasks[APP.currentIndex];
  if(!task||!task.expected_issues){ $("task-score-badge").style.display="none"; return; }
  let score=computeTaskScore(task, APP.currentIssues);
  $("task-score-badge").style.display="inline-block";
  $("task-score-badge").textContent=`Score: ${Math.round(score*100)}%`;
}
function computeTaskScore(task, added){
  let expected=task.expected_issues;
  if(expected.length===0) return 1;
  let total=0, used=new Array(added.length).fill(false);
  expected.forEach(exp=>{
    let bestIdx=-1, bestScore=0;
    for(let j=0;j<added.length;j++){
      if(used[j]) continue;
      let pts=matchScore(exp, added[j]);
      if(pts>bestScore){ bestScore=pts; bestIdx=j; }
    }
    if(bestIdx!==-1){ used[bestIdx]=true; total+=bestScore; }
  });
  return total/expected.length;
}
function matchScore(expected, added){
  let score=0;
  let evLower=added.evidence.toLowerCase();
  let matchCount=expected.evidence_keywords.filter(kw=>evLower.includes(kw.toLowerCase())).length;
  let evRatio=expected.evidence_keywords.length ? matchCount/expected.evidence_keywords.length : 0;
  if(evRatio>0 && added.impactKey===expected.impact_key) score+=0.5*evRatio;
  if(added.behaviorKey===expected.behavior_key) score+=0.3;
  if(added.subDesc===expected.sub_description) score+=0.2;
  return score;
}
function computeOverallScores(){
  let total=0, count=0;
  APP.tasks.forEach((task,idx)=>{
    if(APP.evaluations[idx].useCustom) return;
    let sc=computeTaskScore(task, APP.evaluations[idx].issues);
    total+=sc; count++;
  });
  return { overall: count ? total/count : 1 };
}

function loadCurrentTask(){
  let task=APP.tasks[APP.currentIndex];
  let pa=$("prompt-area");
  if(task.prompt){ pa.style.display="block"; pa.textContent="Prompt: "+task.prompt; }
  else pa.style.display="none";
  $("response-area").textContent=task.response;
  $("evidence-box").value="";
  $("item-counter").textContent=`${APP.currentIndex+1} / ${APP.tasks.length}`;
  APP.currentIssues = (APP.evaluations[APP.currentIndex].issues||[]).map(i=>({...i}));
  APP.useCustom = APP.evaluations[APP.currentIndex].useCustom||false;
  $("custom-toggle").checked=APP.useCustom;
  toggleCustom();
  refreshCurrentIssuesUI();
  $("add-issue-btn").disabled=APP.locked;
  updateLiveScore();
  let done=APP.evaluations.filter(ev=>ev.issues&&ev.issues.length>0).length;
  $("progress-fill").style.width=APP.tasks.length?`${(done/APP.tasks.length)*100}%`:"0%";
}
function saveCurrent(){
  if(!APP.tasks.length) return;
  APP.evaluations[APP.currentIndex].issues = APP.currentIssues.map(i=>({...i}));
  APP.evaluations[APP.currentIndex].useCustom = APP.useCustom;
  saveState();
}
function toggleCustom(){
  APP.useCustom=$("custom-toggle").checked;
  rebuildAllSelectors();
  $("custom-warning").style.display=APP.useCustom?"block":"none";
  $("score-btn").style.display=APP.useCustom?"none":"inline-flex";
  $("export-txt-btn").style.display=APP.useCustom?"inline-flex":"none";
  if(APP.tasks.length) APP.evaluations[APP.currentIndex].useCustom=APP.useCustom;
  saveState();
}
function startSessionTimer(){
  if(!APP.config.session_time_limit_seconds) return;
  if(APP.timerInterval) clearInterval(APP.timerInterval);
  if(APP.timeRemaining<=0) APP.timeRemaining=APP.config.session_time_limit_seconds;
  APP.locked=false;
  function tick(){
    APP.timeRemaining--;
    let m=Math.floor(Math.max(0,APP.timeRemaining)/60), s=Math.max(0,APP.timeRemaining)%60;
    $("timer-text").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    if(APP.timeRemaining<=0){ clearInterval(APP.timerInterval); APP.locked=true; $("add-issue-btn").disabled=true; alert("Time is up!"); saveState(); }
    else saveState();
  }
  APP.timerInterval=setInterval(tick,1000);
  tick();
}
function openReviewModal(){
  saveCurrent();
  let details=$("score-details"); details.innerHTML="";
  if(APP.mode==="test"){
    let overall=Math.round(computeOverallScores().overall*100);
    details.innerHTML=`<h3>Overall Score: ${overall}%</h3><p>${overall===100?"Excellent":overall>=80?"Great job":"Keep practicing"}</p>`;
  } else {
    let html="<p style='font-weight:500'>Detailed Review</p>";
    APP.tasks.forEach((task,idx)=>{
      let expected=task.expected_issues;
      let added=APP.evaluations[idx]?.issues||[];
      let matchedExpected=new Array(expected.length).fill(false), matchedAdded=new Array(added.length).fill(false), pairs=[];
      expected.forEach((exp,ei)=>{
        let bestIdx=-1,bestScore=0;
        for(let j=0;j<added.length;j++) if(!matchedAdded[j]){let pts=matchScore(exp,added[j]); if(pts>bestScore){bestScore=pts;bestIdx=j;}}
        if(bestIdx!==-1){ matchedExpected[ei]=true; matchedAdded[bestIdx]=true; pairs.push({expIdx:ei,addedIdx:bestIdx,score:bestScore});}
      });
      let table=`<table class="review-table"><tr><th>Status</th><th>Expected Issue</th><th>Your Issue</th></tr>`;
      for(let p of pairs){
        let exp=expected[p.expIdx], ad=added[p.addedIdx];
        table+=`<tr><td class="matched">Matched (${Math.round(p.score*100)}%)</td><td>Evidence: ${exp.evidence_keywords.join(", ")}<br>Behavior: ${getBehaviors()[exp.behavior_key]?.[APP.lang]||exp.behavior_key}<br>Explanation: ${exp.sub_description}<br>Impact: ${getImpacts()[exp.impact_key]?.[APP.lang]||exp.impact_key}</td><td>Evidence: ${ad.evidence}<br>Behavior: ${ad.behaviorName||ad.behaviorKey}<br>Explanation: ${ad.subDesc}<br>Impact: ${ad.impactText||ad.impactKey}</td></tr>`;
      }
      expected.forEach((exp,ei)=>{ if(!matchedExpected[ei]) table+=`<tr><td class="unmatched">Missed</td><td>Evidence: ${exp.evidence_keywords.join(", ")}<br>Behavior: ${getBehaviors()[exp.behavior_key]?.[APP.lang]||exp.behavior_key}<br>Explanation: ${exp.sub_description}<br>Impact: ${getImpacts()[exp.impact_key]?.[APP.lang]||exp.impact_key}</td><td>—</td></tr>`; });
      added.forEach((ad,aj)=>{ if(!matchedAdded[aj]) table+=`<tr class="extra-issue"><td>Extra</td><td>—</td><td>Evidence: ${ad.evidence}<br>Behavior: ${ad.behaviorName||ad.behaviorKey}<br>Explanation: ${ad.subDesc}<br>Impact: ${ad.impactText||ad.impactKey}</td></tr>`; });
      table+="</table>";
      html+=`<div><strong>Task ${idx+1} (${task.id})</strong><br><em>Prompt:</em> ${task.prompt||"None"}<br><em>Response:</em> ${task.response}</div>`+table;
    });
    details.innerHTML=html+`<h3>Overall Score: ${Math.round(computeOverallScores().overall*100)}%</h3>`;
  }
  $("score-modal").style.display="flex";
}
function exportText(){
  saveCurrent();
  let text="AccuRater – Trainee Evaluation\n\n";
  APP.tasks.forEach((task,idx)=>{
    text+=`Task ${idx+1} (${task.id})\n`;
    let issues=APP.evaluations[idx]?.issues||[];
    if(issues.length===0) text+="  No issues.\n";
    else issues.forEach((iss,i)=>{ text+=`  Issue ${i+1}:\n    Evidence: "${iss.evidence}"\n    Behavior: ${iss.behaviorName||iss.behaviorKey}\n    Explanation: ${iss.subDesc}\n    Impact: ${iss.impactText||iss.impactKey}\n    Correction: ${iss.correction||"N/A"}\n`; });
    text+="\n";
  });
  let blob=new Blob([text],{type:"text/plain"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="my_evaluation.txt"; a.click(); URL.revokeObjectURL(a.href);
}
function loadFile(e){
  let file=e.target.files[0]; if(!file) return;
  let reader=new FileReader();
  reader.onload=ev=>{
    try{
      let data=JSON.parse(ev.target.result);
      if(!data.config||!data.tasks||!data.config.behaviors||!data.config.impacts) throw new Error("Invalid JSON");
      APP.mode=document.querySelector('input[name="mode"]:checked').value;
      APP.config=data.config; APP.tasks=data.tasks;
      APP.evaluations=APP.tasks.map(()=>({issues:[], useCustom:false}));
      APP.currentIndex=0; APP.useCustom=false; APP.locked=false; APP.sessionLoadTime=Date.now(); APP.currentFileName=file.name;
      $("custom-toggle").checked=false; toggleCustom();
      $("intro-screen").style.display="none"; $("work-area").style.display="block";
      $("mode-title").textContent=APP.mode==="training"?"Training":"Test";
      rebuildAllSelectors(); loadCurrentTask(); startSessionTimer(); saveState();
    }catch(err){ alert("Error: "+err.message); }
  };
  reader.readAsText(file);
}
function goHome(){
  if(APP.timerInterval) clearInterval(APP.timerInterval);
  $("work-area").style.display="none"; $("intro-screen").style.display="block";
  $("training-file").value="";
  renderRecentSessions();
}
function renderRecentSessions(){
  let container=$("recent-sessions-container"), list=$("recent-sessions-list");
  list.innerHTML="";
  let recent=JSON.parse(localStorage.getItem(RECENT_FILES_KEY)||"[]");
  if(recent.length===0){ container.style.display="none"; return; }
  container.style.display="block";
  recent.forEach(file=>{
    let div=document.createElement("div"); div.className="session-entry";
    div.innerHTML=`<span><i class="fas fa-file"></i> ${file.name}</span><div><button class="btn btn-primary resume-btn" data-name="${file.name}">Resume</button> <button class="btn btn-danger delete-btn" data-name="${file.name}">Delete</button></div>`;
    list.appendChild(div);
  });
  document.querySelectorAll(".resume-btn").forEach(btn=>btn.addEventListener("click",e=>{
    let name=btn.dataset.name; if(loadStateByFileName(name)){ $("intro-screen").style.display="none"; $("work-area").style.display="block"; $("mode-title").textContent=APP.mode==="training"?"Training":"Test"; rebuildAllSelectors(); loadCurrentTask(); startSessionTimer(); } else alert("Cannot load session");
  }));
  document.querySelectorAll(".delete-btn").forEach(btn=>btn.addEventListener("click",e=>{ if(confirm("Delete?")){ deleteSession(btn.dataset.name); renderRecentSessions(); } }));
}
function openTaskHistory(){
  let container=$("task-list-container"); container.innerHTML="";
  APP.tasks.forEach((task,idx)=>{
    let div=document.createElement("div"); div.className="task-list-item";
    div.innerHTML=`<span>${idx+1}. ${task.id} (${APP.evaluations[idx]?.issues?.length||0} issues)</span><span><i class="fas fa-arrow-right"></i></span>`;
    div.addEventListener("click",()=>{ closeModal("history-modal"); saveCurrent(); APP.currentIndex=idx; loadCurrentTask(); });
    container.appendChild(div);
  });
  $("history-modal").style.display="flex";
}
function downloadSample(){
  let sample={ config:{ session_time_limit_seconds:900, behaviors:[{key:"factuality",en:"Factuality Error",ar:"خطأ في المعلومة",subs:["Incorrect Fact","Outdated Info"],correction:{en:"Correct fact.",ar:"صحح"},impact_keys:["trust"]},{key:"instruction",en:"Instruction Violation",ar:"مخالفة",subs:["Constraint Ignored"],correction:{en:"Follow instructions",ar:"اتبع"},impact_keys:["ux"]}], impacts:[{key:"trust",en:"Trust Erosion",ar:"تآكل الثقة"},{key:"ux",en:"User Experience",ar:"تجربة المستخدم"}] }, tasks:[{id:"t1",prompt:"Capital of Australia?",response:"Sydney is the capital.",expected_issues:[{evidence_keywords:["Sydney"],behavior_key:"factuality",sub_description:"Incorrect Fact",impact_key:"trust"}]}] };
  let blob=new Blob([JSON.stringify(sample,null,2)],{type:"application/json"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="accurater_training.json"; a.click(); URL.revokeObjectURL(a.href);
}
// Event bindings
function init(){
  $("training-file").addEventListener("change",loadFile);
  $("load-sample-btn").addEventListener("click",downloadSample);
  $("lang-switcher").addEventListener("change",()=>{ APP.lang=$("lang-switcher").value; updateUILanguage(); rebuildAllSelectors(); refreshCurrentIssuesUI(); saveState(); });
  $("prev-btn").addEventListener("click",()=>{ saveCurrent(); if(APP.currentIndex>0){ APP.currentIndex--; loadCurrentTask(); } });
  $("next-btn").addEventListener("click",()=>{ saveCurrent(); if(APP.currentIndex<APP.tasks.length-1){ APP.currentIndex++; loadCurrentTask(); } });
  $("home-btn").addEventListener("click",goHome);
  $("history-btn").addEventListener("click",openTaskHistory);
  $("behavior-select").addEventListener("change",()=>{ buildImpactSelect(); updateSubInput(); $("behavior-other-area").style.display=(APP.useCustom && $("behavior-select").value==="__other__")?"block":"none"; });
  $("add-issue-btn").addEventListener("click",addIssue);
  $("custom-toggle").addEventListener("change",toggleCustom);
  $("score-btn").addEventListener("click",openReviewModal);
  $("export-txt-btn").addEventListener("click",exportText);
  $("response-area").addEventListener("mouseup",captureEvidence);
  $("guide-link").addEventListener("click",e=>{ e.preventDefault(); $("guide-modal").style.display="flex"; });
  updateUILanguage();
  renderRecentSessions();
}
init();