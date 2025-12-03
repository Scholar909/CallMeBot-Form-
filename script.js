// script.js - shared by index.html and form.html

// tiny helpers
const $ = (sel) => document.querySelector(sel);
const qs = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);

// Storage helpers
function loadForms(){
  try { return JSON.parse(localStorage.getItem('forms')||'{}') }
  catch(e){ return {} }
}
function saveForms(forms){ localStorage.setItem('forms', JSON.stringify(forms)) }

// --- Builder logic (index.html) ---
if (location.pathname.endsWith('index.html') || location.pathname === '/' ){
  const formsList = $('#formsList');
  const createFormBtn = $('#createFormBtn');
  const builder = $('#builder');
  const dashboard = $('#dashboard');
  const addQuestionBtn = $('#addQuestionBtn');
  const questionsArea = $('#questionsArea');
  const formTitle = $('#formTitle');
  const cm_phone = $('#cm_phone');
  const cm_apikey = $('#cm_apikey');
  const saveFormBtn = $('#saveFormBtn');
  const cancelEditBtn = $('#cancelEditBtn');
  const publishBtn = $('#publishBtn');

  let editingId = null;
  let forms = loadForms();

  function renderFormsList(){
    formsList.innerHTML = '';
    const keys = Object.keys(forms);
    if (!keys.length){
      formsList.innerHTML = `<div class="muted">No forms yet — create one to get started.</div>`;
      return;
    }
    keys.forEach(id=>{
      const f = forms[id];
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div>
          <div class="prompt">${escapeHtml(f.title||'Untitled')}</div>
          <div class="muted">${(f.questions||[]).length} questions</div>
        </div>
        <div>
          <button data-id="${id}" class="btn view">View</button>
          <button data-id="${id}" class="btn edit">Edit</button>
          <button data-id="${id}" class="btn publish">Publish</button>
          <button data-id="${id}" class="btn danger delete">Delete</button>
        </div>
      `;
      formsList.appendChild(div);
    });
    // hook buttons
    qs('.view', formsList).forEach(b=>b.onclick = (e)=>{
      const id = e.target.dataset.id;
      alert('Preview not implemented: open the share link after publishing.');
    });
    qs('.edit', formsList).forEach(b=>b.onclick = (e)=>{
      editingId = e.target.dataset.id;
      openBuilder(forms[editingId]);
    });
    qs('.publish', formsList).forEach(b=>b.onclick = (e)=>{
      const id = e.target.dataset.id;
      const url = location.origin + '/form.html?form=' + id;
      prompt('Shareable public link (copy):', url);
    });
    qs('.delete', formsList).forEach(b=>b.onclick = (e)=>{
      const id = e.target.dataset.id;
      if (confirm('Delete this form?')){ delete forms[id]; saveForms(forms); renderFormsList(); }
    });
  }

  function openBuilder(form = null){
    dashboard.classList.add('hidden');
    builder.classList.remove('hidden');
    questionsArea.innerHTML = '';
    if (!form) {
      editingId = uid();
      formTitle.value = '';
      cm_phone.value = '';
      cm_apikey.value = '';
      forms[editingId] = { id: editingId, title:'', questions:[], callmebot:{} };
    } else {
      editingId = form.id;
      formTitle.value = form.title || '';
      cm_phone.value = form.callmebot?.phone||'';
      cm_apikey.value = form.callmebot?.apikey||'';
      (form.questions||[]).forEach(q => pushQuestionCard(q));
    }
  }

  function pushQuestionCard(q){
    const li = document.createElement('li');
    li.className = 'questionCard';
    li.dataset.qid = q.id;
    li.innerHTML = `
      <div style="flex:1">
        <input class="q-text" placeholder="Question text" value="${escapeHtml(q.text||'')}" />
        <div style="display:flex;gap:8px;margin-top:8px">
          <select class="q-type">
            <option ${q.type==='short'?'selected':''} value="short">Short answer</option>
            <option ${q.type==='paragraph'?'selected':''} value="paragraph">Paragraph</option>
            <option ${q.type==='mc'?'selected':''} value="mc">Multiple choice</option>
            <option ${q.type==='checkbox'?'selected':''} value="checkbox">Checkboxes</option>
            <option ${q.type==='dropdown'?'selected':''} value="dropdown">Dropdown</option>
            <option ${q.type==='date'?'selected':''} value="date">Date</option>
            <option ${q.type==='file'?'selected':''} value="file">Upload (optional)</option>
          </select>
          <label class="small"><input type="checkbox" class="q-required" ${q.required?'checked':''}/> Required</label>
          <button class="btn small edit-options">Options</button>
        </div>
        <div class="q-options small muted">${(q.options||[]).join(', ')}</div>
      </div>
      <div class="q-controls">
        <button class="btn up">↑</button>
        <button class="btn down">↓</button>
        <button class="btn delete">✕</button>
      </div>
    `;
    questionsArea.appendChild(li);

    // hook controls
    li.querySelector('.delete').onclick = ()=>{ li.remove(); }
    li.querySelector('.up').onclick = ()=>{ if (li.previousElementSibling) questionsArea.insertBefore(li, li.previousElementSibling); }
    li.querySelector('.down').onclick = ()=>{ if (li.nextElementSibling) questionsArea.insertBefore(li.nextElementSibling, li); }
    li.querySelector('.edit-options').onclick = ()=>{
      const type = li.querySelector('.q-type').value;
      if (['mc','checkbox','dropdown'].includes(type)){
        const val = prompt('Comma-separated options', (q.options||[]).join(', '));
        if (val!==null) {
          q.options = val.split(',').map(s=>s.trim()).filter(Boolean);
          li.querySelector('.q-options').textContent = q.options.join(', ');
        }
      } else {
        q.options = [];
        li.querySelector('.q-options').textContent = '';
        alert('Options only for multiple choice / checkboxes / dropdown.');
      }
    };
    // keep q object in sync on inputs
    li.querySelector('.q-text').oninput = (e)=> q.text = e.target.value;
    li.querySelector('.q-type').onchange = (e)=> { q.type = e.target.value; }
    li.querySelector('.q-required').onchange = (e)=> q.required = e.target.checked;
  }

  addQuestionBtn.onclick = ()=>{
    const q = { id: uid(), text:'', type:'short', required:false, options:[] };
    forms[editingId].questions.push(q);
    pushQuestionCard(q);
  };

  createFormBtn.onclick = ()=> openBuilder();

  cancelEditBtn.onclick = ()=>{
    builder.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderFormsList();
  };

  saveFormBtn.onclick = ()=>{
    const f = forms[editingId];
    f.title = formTitle.value.trim() || 'Untitled form';
    f.callmebot = { phone: cm_phone.value.trim(), apikey: cm_apikey.value.trim() };
    // collect questions from DOM to preserve order and latest changes
    const qsNodes = qs('.questionCard', questionsArea);
    f.questions = qsNodes.map(node=>{
      const id = node.dataset.qid;
      const qText = node.querySelector('.q-text').value.trim();
      const qType = node.querySelector('.q-type').value;
      const qReq = node.querySelector('.q-required').checked;
      // find existing options stored in forms (if any)
      const existing = (f.questions||[]).find(x=>x.id===id);
      return { id, text: qText, type: qType, required: qReq, options: existing?.options || [] };
    });
    forms[editingId] = f;
    saveForms(forms);
    alert('Form saved locally.');
    builder.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderFormsList();
  };

  publishBtn.onclick = ()=>{
    if (!editingId) return alert('Save the form first.');
    saveFormBtn.onclick(); // quick save
    const url = location.origin + '/form.html?form=' + editingId;
    prompt('Publish — share this URL:', url);
  };

  function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // initialise
  renderFormsList();
}

// --- Public form logic (form.html) ---
if (location.pathname.endsWith('form.html')){
  const qParams = new URLSearchParams(location.search);
  const formId = qParams.get('form');
  const forms = loadForms();
  const form = forms[formId];
  const publicForm = $('#publicForm');
  const submitBtn = $('#submitResponseBtn');
  const titleEl = $('#formTitleDisplay');
  const statusEl = $('#statusMsg');
  const thanks = $('#thanks');

  if (!form){
    $('#publicFormCard').innerHTML = '<div class="muted">Form not found or not published yet.</div>';
  } else {
    titleEl.textContent = form.title || 'Form';
    // render questions
    form.questions.forEach(q=>{
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = q.text + (q.required ? ' *' : '');
      wrapper.appendChild(label);

      let input;
      if (q.type === 'paragraph'){
        input = document.createElement('textarea');
      } else if (q.type === 'short'){
        input = document.createElement('input'); input.type = 'text';
      } else if (q.type === 'date'){
        input = document.createElement('input'); input.type = 'date';
      } else if (q.type === 'file'){
        input = document.createElement('input'); input.type = 'file';
      } else if (q.type === 'mc' || q.type === 'checkbox' || q.type === 'dropdown'){
        if (q.type === 'dropdown'){
          input = document.createElement('select');
          const empty = document.createElement('option'); empty.value=''; empty.textContent='Choose...'; input.appendChild(empty);
          (q.options||[]).forEach(opt=>{
            const o = document.createElement('option'); o.value = opt; o.textContent = opt; input.appendChild(o);
          });
        } else {
          input = document.createElement('div');
          (q.options||[]).forEach((opt, idx)=>{
            const id = 'opt-' + q.id + '-' + idx;
            const el = document.createElement('label');
            el.style.display='block';
            const inp = document.createElement('input');
            inp.type = (q.type==='checkbox') ? 'checkbox' : 'radio';
            inp.name = q.id;
            inp.value = opt;
            inp.id = id;
            el.appendChild(inp);
            const txt = document.createTextNode(' ' + opt);
            el.appendChild(txt);
            input.appendChild(el);
          });
        }
      } else {
        input = document.createElement('input'); input.type='text';
      }
      input.dataset.qid = q.id;
      wrapper.appendChild(input);
      publicForm.appendChild(wrapper);
    });
  }

  submitBtn.onclick = async (e)=>{
    e.preventDefault();
    if (!form) return;
    // collect answers
    const answers = [];
    let ok = true;
    for (const q of form.questions){
      const node = publicForm.querySelector(`[data-qid="${q.id}"]`);
      let value = '';
      if (!node) { value = ''; }
      else if (q.type === 'paragraph' || q.type === 'short' || q.type === 'date'){
        value = node.value || '';
      } else if (q.type === 'file'){
        const f = node.files && node.files[0];
        value = f ? `uploaded:${f.name}` : '';
      } else if (q.type === 'dropdown'){
        value = node.value || '';
      } else if (q.type === 'mc'){
        const sel = publicForm.querySelector(`input[name="${q.id}"]:checked`);
        value = sel ? sel.value : '';
      } else if (q.type === 'checkbox'){
        const sels = Array.from(publicForm.querySelectorAll(`input[name="${q.id}"]:checked`)).map(i=>i.value);
        value = sels.join(', ');
      } else {
        value = node.value || '';
      }
      if (q.required && (!value || value.trim()==='')){ ok=false; alert('Please answer required question: ' + q.text); break; }
      answers.push({ question: q.text, answer: value });
    }
    if (!ok) return;

    // store responses in localStorage
    const key = 'responses_' + form.id;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ id: uid(), timestamp: new Date().toISOString(), answers });
    localStorage.setItem(key, JSON.stringify(arr));

    // build message for CallMeBot: include title, questions + answers
    const lines = [];
    lines.push(`New response for: ${form.title}`);
    answers.forEach(a => lines.push(`${a.question}: ${a.answer}`));
    const message = lines.join('\n');

    // attempt to send to CallMeBot if credentials exist
    if (form.callmebot && form.callmebot.phone && form.callmebot.apikey){
      statusEl.textContent = 'Sending WhatsApp notification...';
      try {
        await sendCallMeBot(form.callmebot.phone, form.callmebot.apikey, message);
        statusEl.textContent = 'Notification sent.';
      } catch(err){
        console.error(err);
        statusEl.textContent = 'Notification failed (see console).';
      }
    } else {
      statusEl.textContent = 'No CallMeBot credentials configured for this form.';
    }

    // show thanks
    $('#publicFormCard').classList.add('hidden');
    thanks.classList.remove('hidden');
  };

  async function sendCallMeBot(phone, apikey, message){
    // NOTE: In production, don't call this from the browser. Use a server to keep the API key secret.
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(message)}`;
    // Try GET fetch (may be blocked by CORS)
    const resp = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!resp.ok) throw new Error('CallMeBot request failed: ' + resp.status);
    return resp;
  }
}