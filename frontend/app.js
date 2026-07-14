// ---- state (in-memory only, matches artifact/browser constraints) ----
let state = {
  token: null,
  user: null,
  courses: [],
  currentCourse: null,
  currentQuiz: null,
  answers: {}
};

// ---- API helper ----
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  setTimeout(() => (t.hidden = true), 2500);
}

// ---- view switching ----
function showView(id) {
  document.querySelectorAll('.view').forEach(v => (v.hidden = true));
  document.getElementById(id).hidden = false;
}

function showCatalog() {
  showView('view-catalog');
  loadCourses();
}

function showAuth() {
  showView('view-auth');
}

// ---- nav rendering ----
function renderNav() {
  const nav = document.getElementById('nav-auth');
  if (state.user) {
    nav.innerHTML = `
      <span class="who">${state.user.name} · ${state.user.role}</span>
      <button class="btn-outline" onclick="logout()">Log out</button>
    `;
  } else {
    nav.innerHTML = `<button class="btn-outline" onclick="showAuth()">Log in / Register</button>`;
  }
}

function logout() {
  state.token = null;
  state.user = null;
  renderNav();
  showCatalog();
  toast('Logged out');
}

// ---- auth ----
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('form-login').hidden = tab !== 'login';
  document.getElementById('form-register').hidden = tab !== 'register';
  document.getElementById('auth-error').hidden = true;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    state.token = data.token;
    state.user = data.user;
    renderNav();
    showCatalog();
    toast(`Welcome back, ${data.user.name}`);
  } catch (err) {
    showAuthError(err.message);
  }
  return false;
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
    state.token = data.token;
    state.user = data.user;
    renderNav();
    showCatalog();
    toast(`Account created — welcome, ${data.user.name}`);
  } catch (err) {
    showAuthError(err.message);
  }
  return false;
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.hidden = false;
}

// ---- courses ----
async function loadCourses() {
  const list = document.getElementById('course-list');
  list.innerHTML = '<p>Loading courses…</p>';
  try {
    state.courses = await api('/api/courses');
    if (state.courses.length === 0) {
      list.innerHTML = '<p>No courses yet.</p>';
      return;
    }
    list.innerHTML = state.courses.map(c => `
      <div class="course-card" onclick="openCourse('${c.id}')">
        <div class="eyebrow">Course</div>
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.description || '')}</p>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="error">Couldn't load courses — is the API running at ${API_BASE_URL}?</p>`;
  }
}

async function openCourse(id) {
  const course = state.courses.find(c => c.id === id) || await api(`/api/courses/${id}`);
  state.currentCourse = course;
  state.currentQuiz = null;
  state.answers = {};

  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-desc').textContent = course.description || '';
  showView('view-course');
  renderEnrollPanel();
  renderInstructorUpload();
  loadVideo();
  document.getElementById('quiz-panel').innerHTML = '';
}

// ---- video playback ----
async function loadVideo() {
  const frame = document.getElementById('video-frame');

  if (!state.user) {
    frame.innerHTML = `<div class="video-placeholder"><span>Log in to watch this course's video</span></div>`;
    return;
  }

  try {
    const { url } = await api(`/api/courses/${state.currentCourse.id}/video-url`);
    frame.innerHTML = `<video controls style="inline-size:100%;display:block;" src="${url}"></video>`;
  } catch (err) {
    // no video uploaded yet, or not enrolled - show a clear placeholder instead of failing silently
    frame.innerHTML = `<div class="video-placeholder"><span>${escapeHtml(err.message || 'No video uploaded for this course yet')}</span></div>`;
  }
}

// ---- instructor: upload a video ----
function renderInstructorUpload() {
  const panel = document.getElementById('instructor-upload');
  if (!state.user || state.user.role !== 'instructor') {
    panel.innerHTML = '';
    return;
  }
  panel.innerHTML = `
    <div style="margin:16px 0;">
      <label style="font-size:13px;color:var(--ink-soft);">
        Upload course video
        <input type="file" id="video-file" accept="video/*" style="display:block;margin-block-start:6px;">
      </label>
      <button class="btn-gold" style="margin-block-start:10px;" onclick="uploadVideo()">Upload</button>
      <p id="upload-status" style="font-size:13px;color:var(--ink-soft);margin-block-start:8px;"></p>
    </div>
  `;
}

async function uploadVideo() {
  const fileInput = document.getElementById('video-file');
  const file = fileInput.files[0];
  const status = document.getElementById('upload-status');
  if (!file) { status.textContent = 'Choose a file first.'; return; }

  try {
    status.textContent = 'Requesting upload URL…';
    const { uploadUrl } = await api(`/api/courses/${state.currentCourse.id}/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4' })
    });

    status.textContent = 'Uploading to S3…';
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'video/mp4' },
      body: file
    });
    if (!putRes.ok) throw new Error('Upload to S3 failed');

    status.textContent = 'Upload complete.';
    toast('Video uploaded');
    loadVideo();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

function renderEnrollPanel() {
  const panel = document.getElementById('enroll-panel');
  if (!state.user) {
    panel.innerHTML = `<button class="btn-primary" onclick="showAuth()">Log in to enroll</button>`;
    return;
  }
  panel.innerHTML = `<button class="btn-primary" onclick="enroll()">Enroll in this course</button>`;
}

async function enroll() {
  try {
    await api(`/api/courses/${state.currentCourse.id}/enroll`, { method: 'POST' });
    toast('Enrolled');
    document.getElementById('enroll-panel').innerHTML = `<span class="status-pill">Enrolled</span>`;
    loadQuiz();
  } catch (err) {
    toast(err.message);
  }
}

// ---- quiz ----
async function loadQuiz() {
  const panel = document.getElementById('quiz-panel');
  try {
    const quiz = await api(`/api/courses/${state.currentCourse.id}/quiz`);
    state.currentQuiz = quiz;
    state.answers = {};
    renderQuiz();
  } catch (err) {
    panel.innerHTML = '';
  }
}

function renderQuiz() {
  const quiz = state.currentQuiz;
  const panel = document.getElementById('quiz-panel');
  panel.innerHTML = `
    <h2 style="font-family:'Fraunces',serif;font-weight:500;font-size:22px;">Assessment</h2>
    ${quiz.questions.map((q, qi) => `
      <div class="quiz-question">
        <h4>${qi + 1}. ${escapeHtml(q.text)}</h4>
        ${q.options.map((opt, oi) => `
          <label class="quiz-option">
            <input type="radio" name="q_${q.id}" value="${oi}" onchange="setAnswer('${q.id}', ${oi})">
            ${escapeHtml(opt)}
          </label>
        `).join('')}
      </div>
    `).join('')}
    <button class="btn-gold" onclick="submitQuiz()">Submit assessment</button>
    <div id="quiz-result"></div>
  `;
}

function setAnswer(qid, idx) {
  state.answers[qid] = idx;
}

async function submitQuiz() {
  try {
    const result = await api(`/api/courses/${state.currentCourse.id}/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: state.answers })
    });
    const pct = Math.round((result.score / result.total) * 100);
    const pass = pct >= 50;
    document.getElementById('quiz-result').innerHTML = `
      <div class="result-banner ${pass ? 'pass' : 'fail'}">
        Score: ${result.score} / ${result.total} (${pct}%) — ${pass ? 'Passed' : 'Try again'}
      </div>
    `;
  } catch (err) {
    toast(err.message);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---- boot ----
renderNav();
showCatalog();