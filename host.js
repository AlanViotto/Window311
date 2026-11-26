// Browser services for the freestanding WebAssembly desktop.
'use strict';
const screenCanvas = document.querySelector('#screen');
const ctx = screenCanvas.getContext('2d', {alpha : false});
const message = document.querySelector('#message');
const decoder = new TextDecoder();
const encoder = new TextEncoder();
let core;
const palette = [
  '#008080', '#c0c0c0', '#fff', '#101010', '#000080', '#808080', '#ffff80',
  '#104ab0', '#00a8a8', '#ca1534', '#0b752a', '#e9e9e9', '#ca8b31', '#3e7185',
  '#e100ae', '#000'
];
function stringAt(ptr) {
  const bytes = new Uint8Array(core.memory.buffer);
  return decoder.decode(bytes.subarray(ptr, bytes.indexOf(0, ptr)));
}
function copyText(ptr, capacity, value) {
  const dest = new Uint8Array(core.memory.buffer, ptr, capacity);
  const count = encoder.encodeInto(value, dest.subarray(0, -1)).written;
  dest[count] = 0;
  return count;
}
function fileTable() {
  return JSON.parse(localStorage.getItem('window311.files.v1') ||
                    '{"LEIA-ME.TXT":"Bem-vindo ao Window 3.11!"}');
}
const host = {
  rect(x, y, w, h, color) {
    ctx.fillStyle = palette[color];
    ctx.fillRect(x, y, w, h);
  },
  label(x, y, ptr, color, bold) {
    ctx.fillStyle = palette[color];
    ctx.font = (bold ? 'bold ' : '') + '14px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(stringAt(ptr), x, y);
  },
  clip(x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  },
  unclip() { ctx.restore(); },
  random(n) { return Math.floor(Math.random() * n); },
  clock(ptr) { copyText(ptr, 32, new Date().toLocaleTimeString('pt-BR')); },
  number(ptr, n) {
    copyText(ptr, 48,
             Number.isFinite(n) ? String(Number(n.toPrecision(12))) : 'Erro');
  },
  fileName(i, ptr) {
    return copyText(
        ptr, 256,
        Object.keys(fileTable()).filter(n => n.endsWith('.TXT')).sort()[i] ||
            '');
  },
  readFile(name, ptr, cap) {
    const value = fileTable()[stringAt(name)];
    if (typeof value !== 'string' || encoder.encode(value).length >= cap)
      return -1;
    return copyText(ptr, cap, value);
  },
  saveFile(name, ptr) {
    try {
      const f = fileTable();
      f[stringAt(name)] = stringAt(ptr);
      localStorage.setItem('window311.files.v1', JSON.stringify(f));
      return 1;
    } catch {
      return 0;
    }
  },
  ask(ptr, cap) {
    const name = prompt('Nome do documento (.TXT)', stringAt(ptr));
    if (!name)
      return 0;
    const key = name.trim().toUpperCase();
    if (!/^[A-Z0-9_ -]{1,60}\.TXT$/.test(key)) {
      alert('Use um nome com extensão .TXT.');
      return 0;
    }
    if (Object.hasOwn(fileTable(), key) && !confirm('Substituir ' + key + '?'))
      return 0;
    return copyText(ptr, cap, key);
  },
  notify(ptr) { alert(stringAt(ptr)); },
  discard() {
    return Number(confirm('Descartar as alterações do documento?'));
  },
  paintStore(ptr, len, save) {
    try {
      const a = new Uint8Array(core.memory.buffer, ptr, len);
      if (save)
        localStorage.setItem('window311.paint',
                             btoa(String.fromCharCode(...a)));
      else {
        const data = atob(localStorage.getItem('window311.paint') || '');
        if (data.length === len)
          for (let i = 0; i < len; i++)
            a[i] = data.charCodeAt(i);
      }
      return 1;
    } catch {
      return 0;
    }
  },
  pixels(x, y, w, h, ptr) {
    const a = new Uint8Array(core.memory.buffer, ptr, w * h);
    for (let j = 0; j < h; j++) {
      let start = 0;
      for (let i = 1; i <= w; i++) {
        if (i === w || a[j * w + i] !== a[j * w + start]) {
          ctx.fillStyle = palette[a[j * w + start]];
          ctx.fillRect(x + start, y + j, i - start, 1);
          start = i;
        }
      }
    }
  },
  legacy() { location.href = 'classic.html'; }
};
function resize() {
  screenCanvas.width = Math.max(
      360, Math.round(innerWidth / Math.max(1, Math.floor(innerWidth / 900))));
  screenCanvas.height =
      Math.max(340, Math.round(innerHeight * screenCanvas.width / innerWidth));
  core.resize(screenCanvas.width, screenCanvas.height);
  core.draw();
}
function pointer(e, kind) {
  const r = screenCanvas.getBoundingClientRect();
  core.pointer(kind,
               Math.floor((e.clientX - r.left) * screenCanvas.width / r.width),
               Math.floor((e.clientY - r.top) * screenCanvas.height / r.height),
               e.button);
  core.draw();
}
async function boot() {
  const res = await fetch('desktop.wasm');
  if (!res.ok)
    throw Error(res.status);
  core = (await WebAssembly.instantiate(await res.arrayBuffer(), {
           env : host
         })).instance.exports;
  core.init();
  resize();
  message.hidden = true;
  screenCanvas.focus();
  addEventListener('resize', resize);
  screenCanvas.onpointerdown = e => {
    screenCanvas.focus();
    screenCanvas.setPointerCapture(e.pointerId);
    pointer(e, 1);
  };
  screenCanvas.onpointermove = e => {
    if (e.buttons)
      pointer(e, 2);
  };
  screenCanvas.onpointerup = e => pointer(e, 0);
  screenCanvas.onpointercancel = e => pointer(e, 0);
  screenCanvas.onwheel = e => {
    e.preventDefault();
    core.wheel(Math.sign(e.deltaY) * 60);
    core.draw();
  };
  screenCanvas.oncontextmenu = e => e.preventDefault();
  const keys =
      {Backspace : 8, Tab : 9, Enter : 13, Escape : 27, F1 : 1, F2 : 2, F4 : 4};
  screenCanvas.onkeydown = e => {
    let code =
        keys[e.key] ?? ([...e.key ].length === 1 ? e.key.codePointAt(0) : 0);
    if (!code || e.metaKey || (e.ctrlKey && e.key.toLowerCase() !== 's'))
      return;
    e.preventDefault();
    core.key(code, Number(e.ctrlKey), Number(e.altKey));
    core.draw();
  };
  screenCanvas.onpaste = e => {
    e.preventDefault();
    for (const ch of e.clipboardData.getData('text/plain'))
      core.key(ch === '\n' ? 13 : ch.codePointAt(0), 0, 0);
    core.draw();
  };
  setInterval(() => {
    if (!document.hidden)
      core.draw();
  }, 1000);
}
boot().catch(error => {
  message.textContent =
      'Falha ao carregar o WebAssembly. Abra o projeto via HTTP. ' +
      error.message;
});
