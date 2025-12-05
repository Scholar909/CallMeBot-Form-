// script.js - shared by index.html and form.html

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyDkDF1_MSfBDf5LkqtYL3wo2Ic72rSBaps",
  authDomain: "callmebot-form.firebaseapp.com",
  projectId: "callmebot-form",
  storageBucket: "callmebot-form.firebasestorage.app",
  messagingSenderId: "134486558762",
  appId: "1:134486558762:web:3b64f2ba9d245eacb19b53",
  measurementId: "G-4E3274FQBJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- HELPERS ----------------
const $ = (sel) => document.querySelector(sel);
const qs = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2, 9);

async function loadForms() {
  const formsCol = collection(db, "forms");
  const snapshot = await getDocs(formsCol);
  const forms = {};
  snapshot.forEach(docSnap => {
    forms[docSnap.id] = docSnap.data();
  });
  return forms;
}

async function saveForms(forms) {
  const promises = Object.values(forms).map(f => setDoc(doc(db, "forms", f.id), f));
  await Promise.all(promises);
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------- DASHBOARD / BUILDER LOGIC ----------------
document.addEventListener('DOMContentLoaded', async () => {
  let forms = await loadForms();

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

  function renderFormsList() {
    formsList.innerHTML = '';
    const keys = Object.keys(forms);
    if (!keys.length) {
      formsList.innerHTML = `<div class="muted">No forms yet — create one to get started.</div>`;
      return;
    }
    keys.forEach(id => {
      const f = forms[id];
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <div>
          <div class="prompt">${escapeHtml(f.title || 'Untitled')}</div>
          <div class="muted">${(f.questions || []).length} questions</div>
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

    qs('.view', formsList).forEach(b => b.onclick = (e) => {
      alert('Preview not implemented: open the share link after publishing.');
    });
    qs('.edit', formsList).forEach(b => b.onclick = (e) => {
      editingId = e.target.dataset.id;
      openBuilder(forms[editingId]);
    });
    qs('.publish', formsList).forEach(b => b.onclick = (e) => {
      const id = e.target.dataset.id;
      const url = location.origin + '/CallMeBot-Form-/form.html?form=' + id;
      prompt('Shareable public link (copy):', url);
    });
    qs('.delete', formsList).forEach(b => b.onclick = async (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this form?')) {
        delete forms[id];
        await saveForms(forms);
        renderFormsList();
      }
    });
  }

  function openBuilder(form = null) {
    dashboard.classList.add('hidden');
    builder.classList.remove('hidden');
    questionsArea.innerHTML = '';
    if (!form) {
      editingId = uid();
      formTitle.value = '';
      cm_phone.value = '';
      cm_apikey.value = '';
      forms[editingId] = { id: editingId, title: '', questions: [], callmebot: {} };
    } else {
      editingId = form.id;
      formTitle.value = form.title || '';
      cm_phone.value = form.callmebot?.phone || '';
      cm_apikey.value = form.callmebot?.apikey || '';
      (form.questions || []).forEach(q => pushQuestionCard(q));
    }
  }

  function pushQuestionCard(q) {
    const li = document.createElement('li');
    li.className = 'questionCard';
    li.dataset.qid = q.id;
    li.innerHTML = `
      <div style="flex:1">
        <input class="q-text" placeholder="Question text" value="${escapeHtml(q.text || '')}" />
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
        <div class="q-options small muted">${escapeHtml((q.options||[]).join(', '))}</div>
      </div>
      <div class="q-controls">
        <button class="btn up">↑</button>
        <button class="btn down">↓</button>
        <button class="btn delete">✕</button>
      </div>
    `;
    questionsArea.appendChild(li);

    li.querySelector('.delete').onclick = () => { li.remove(); };
    li.querySelector('.up').onclick = () => { if (li.previousElementSibling) questionsArea.insertBefore(li, li.previousElementSibling); };
    li.querySelector('.down').onclick = () => { if (li.nextElementSibling) questionsArea.insertBefore(li.nextElementSibling, li); };
    li.querySelector('.edit-options').onclick = () => {
      const type = li.querySelector('.q-type').value;
      if (['mc','checkbox','dropdown'].includes(type)){
        const val = prompt('Comma-separated options', (q.options||[]).join(', '));
        if (val!==null){
          q.options = val.split(',').map(s=>s.trim()).filter(Boolean);
          li.querySelector('.q-options').textContent = q.options.join(', ');
        }
      } else {
        q.options = [];
        li.querySelector('.q-options').textContent = '';
        alert('Options only for multiple choice / checkboxes / dropdown.');
      }
    };
    li.querySelector('.q-text').oninput = (e) => q.text = e.target.value;
    li.querySelector('.q-type').onchange = (e) => { q.type = e.target.value; };
    li.querySelector('.q-required').onchange = (e) => q.required = e.target.checked;
  }

  addQuestionBtn.onclick = () => {
    const q = { id: uid(), text:'', type:'short', required:false, options:[] };
    forms[editingId].questions.push(q);
    pushQuestionCard(q);
  };

  createFormBtn.onclick = () => openBuilder();

  cancelEditBtn.onclick = () => {
    builder.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderFormsList();
  };

  saveFormBtn.onclick = async () => {
    const f = forms[editingId];
    f.title = formTitle.value.trim() || 'Untitled form';
    f.callmebot = { phone: cm_phone.value.trim(), apikey: cm_apikey.value.trim() };
    const qsNodes = qs('.questionCard', questionsArea);
    f.questions = qsNodes.map(node => {
      const id = node.dataset.qid;
      const qText = node.querySelector('.q-text').value.trim();
      const qType = node.querySelector('.q-type').value;
      const qReq = node.querySelector('.q-required').checked;
      const existing = (f.questions||[]).find(x=>x.id===id);
      return { id, text: qText, type: qType, required: qReq, options: existing?.options || [] };
    });
    forms[editingId] = f;
    await saveForms(forms);
    alert('Form saved locally.');
    builder.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderFormsList();
  };

  publishBtn.onclick = async () => {
    if (!editingId) return alert('Save the form first.');
    await saveFormBtn.onclick();
    const url = location.origin + '/CallMeBot-Form-/form.html?form=' + editingId;
    prompt('Publish — share this URL:', url);
  };

  renderFormsList();

}); // DOMContentLoaded ends here

// ---------------- PUBLIC FORM LOGIC ----------------
if (location.pathname.endsWith('form.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    const forms = await loadForms();
    const qParams = new URLSearchParams(location.search);
    const formId = qParams.get('form');
    const form = forms[formId];
    const publicForm = $('#publicForm');
    const submitBtn = $('#submitResponseBtn');
    const titleEl = $('#formTitleDisplay');
    const statusEl = $('#statusMsg');
    const thanks = $('#thanks');

    if (!form) {
      $('#publicFormCard').innerHTML = '<div class="muted">Form not found or not published yet.</div>';
      return;
    }

    titleEl.textContent = form.title || 'Form';

    form.questions.forEach(q => {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = q.text + (q.required ? ' *' : '');
      wrapper.appendChild(label);

      let input;
      if (q.type === 'paragraph') {
        input = document.createElement('textarea');
        input.dataset.qid = q.id;
      } else if (q.type === 'short') {
        input = document.createElement('input'); input.type = 'text'; input.dataset.qid = q.id;
      } else if (q.type === 'date') {
        input = document.createElement('input'); input.type = 'date'; input.dataset.qid = q.id;
      } else if (q.type === 'file') {
        input = document.createElement('input'); input.type = 'file'; input.dataset.qid = q.id;
      } else if (q.type === 'dropdown') {
        input = document.createElement('select'); input.dataset.qid = q.id;
        const empty = document.createElement('option'); empty.value=''; empty.textContent='Choose...'; input.appendChild(empty);
        (q.options||[]).forEach(opt => {
          const o = document.createElement('option'); o.value = opt; o.textContent = opt; input.appendChild(o);
        });
      } else if (q.type === 'mc' || q.type === 'checkbox') {
        input = document.createElement('div'); input.className='options'; input.dataset.qid=q.id;
        (q.options||[]).forEach((opt, idx)=>{
          const id = 'opt-' + q.id + '-' + idx;
          const el = document.createElement('label');
          el.style.display='flex'; el.style.alignItems='center'; el.style.gap='8px'; el.style.marginBottom='4px';
          const inp = document.createElement('input');
          inp.type = (q.type==='checkbox')?'checkbox':'radio';
          inp.name = q.id; inp.value = opt; inp.id = id;
          inp.style.width='18px'; inp.style.height='18px'; inp.style.flexShrink='0';
          el.appendChild(inp); el.appendChild(document.createTextNode(opt));
          input.appendChild(el);
        });
      } else {
        input = document.createElement('input'); input.type='text'; input.dataset.qid = q.id;
      }

      wrapper.appendChild(input);
      publicForm.appendChild(wrapper);
    });

    submitBtn.onclick = async (e) => {
      e.preventDefault();
      const answers = [];
      let ok = true;

      for (const q of form.questions) {
        const node = publicForm.querySelector(`[data-qid="${q.id}"]`);
        let value = '';
        if (!node) value = '';
        else if (['paragraph','short','date'].includes(q.type)) value = node.value || '';
        else if (q.type==='file') value = node.files && node.files[0] ? `uploaded:${node.files[0].name}` : '';
        else if (q.type==='dropdown') value = node.value || '';
        else if (q.type==='mc') {
          const sel = node.querySelector(`input[name="${q.id}"]:checked`);
          value = sel ? sel.value : '';
        } else if (q.type==='checkbox') {
          value = Array.from(node.querySelectorAll(`input[name="${q.id}"]:checked`)).map(i=>i.value).join(', ');
        } else value = node.value || '';

        if (q.required && (!value || value.trim()==='')) { ok=false; alert('Please answer required question: ' + q.text); break; }
        answers.push({ question: q.text, answer: value });
      }

      if (!ok) return;

      await addDoc(collection(db, "responses_" + form.id), { id: uid(), timestamp: new Date().toISOString(), answers });

      const lines = [`New response for: ${form.title}`];
      answers.forEach(a=>lines.push(`${a.question}: ${a.answer}`));
      const message = lines.join('\n');

      if (form.callmebot?.phone && form.callmebot?.apikey) {
        statusEl.textContent = 'Sending WhatsApp notification...';
        try {
          await sendLongMessage(form.callmebot.phone, form.callmebot.apikey, message);
          statusEl.textContent = 'Notification sent.';
        } catch(err) {
          console.error(err);
          statusEl.textContent = 'Notification failed (see console).';
        }
      } else statusEl.textContent = 'No CallMeBot credentials configured for this form.';

      $('#publicFormCard').classList.add('hidden');
      thanks.classList.remove('hidden');
    };
    
    async function sendLongMessage(phone, apikey, fullMessage) {
    
      const MAX = 350;       // Ultra-safe size
      const delay = 12000;  // 12 seconds delay
    
      function sendViaImage(url) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // even on error, continue
          img.src = url + "&_=" + Date.now(); // prevent caching
        });
      }
    
      if (fullMessage.length <= MAX) {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(fullMessage)}`;
        await sendViaImage(url);
        return;
      }
    
      const chunks = [];
      for (let i = 0; i < fullMessage.length; i += MAX) {
        chunks.push(fullMessage.slice(i, i + MAX));
      }
    
      const total = chunks.length;
    
      for (let i = 0; i < total; i++) {
        const msg = `Part ${i + 1}/${total}\n${chunks[i]}`;
    
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(msg)}`;
    
        await sendViaImage(url);
    
        if (i < total - 1) {
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
  });
}
