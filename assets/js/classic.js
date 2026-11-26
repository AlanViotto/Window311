"use strict";
const desk = document.querySelector("#desktop"),
  tray = document.querySelector("#minimized");
const names = {
  manager: "Gerenciador de Programas",
  files: "Gerenciador de Arquivos",
  settings: "Painel de Controle",
  dos: "Prompt do MS-DOS",
  notes: "Bloco de Notas",
  paint: "Paintbrush",
  calc: "Calculadora",
  clock: "Relógio",
  mine: "Campo Minado",
  help: "Ajuda do Windows",
};
const groups = {
  Principal: ["files", "settings", "dos", "help"],
  Acessórios: ["notes", "paint", "calc", "clock"],
  Jogos: ["mine"],
};
const windows = new Set();
let layer = 0,
  active,
  menu;
function el(tag, parent, txt, cls) {
  let e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  if (parent) parent.append(e);
  return e;
}
function btn(p, label, fn, cls) {
  let b = el("button", p, label, cls);
  b.onclick = fn;
  return b;
}
function closeMenu() {
  menu?.remove();
  menu = null;
}
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".dropdown,.menus,.title")) closeMenu();
});
function popup(anchor, items) {
  closeMenu();
  menu = el("div", document.body, undefined, "dropdown");
  let rect = anchor.getBoundingClientRect();
  for (const [label, fn] of items)
    btn(menu, label, () => {
      closeMenu();
      fn();
    });
  menu.style.left =
    Math.max(0, Math.min(rect.left, innerWidth - menu.offsetWidth)) + "px";
  menu.style.top =
    Math.min(rect.bottom, innerHeight - menu.offsetHeight) + "px";
  menu.firstChild?.focus();
}
function question(title, value = "", confirmOnly = false) {
  return new Promise((resolve) => {
    let d = el("dialog", document.body),
      f = el("form", d);
    f.method = "dialog";
    let label = el("label", f, title),
      i = confirmOnly ? null : el("input", label);
    if (i) i.value = value;
    let m = el("menu", f);
    let ok = el("button", m, "OK");
    ok.value = "ok";
    let cancel = el("button", m, "Cancelar");
    cancel.value = "cancel";
    d.onclose = () => {
      resolve(d.returnValue === "ok" ? (i ? i.value : true) : null);
      d.remove();
    };
    d.showModal();
    i?.select();
  });
}
function notice(message) {
  let d = el("dialog", document.body);
  el("p", d, message);
  btn(d, "OK", () => d.close(), "raised");
  d.onclose = () => d.remove();
  d.showModal();
}
function focusWindow(w) {
  active?.box.classList.remove("active");
  active = w;
  w.box.hidden = false;
  w.icon?.remove();
  w.icon = null;
  w.box.classList.add("active");
  w.box.style.zIndex = ++layer;
}
function nextWindow() {
  let a = [...windows]
    .filter((w) => !w.box.hidden)
    .sort((a, b) => b.box.style.zIndex - a.box.style.zIndex);
  if (a[0]) focusWindow(a[0]);
  else active = null;
}
function move(w, x, y) {
  w.box.style.left =
    Math.max(0, Math.min(innerWidth - w.box.offsetWidth, x)) + "px";
  w.box.style.top = Math.max(0, Math.min(innerHeight - 28, y)) + "px";
}
function frame(id, width, height) {
  let box = el("section", desk, undefined, "window"),
    w = { id, box };
  windows.add(w);
  box.style.width = Math.min(width, innerWidth - 6) + "px";
  box.style.height = Math.min(height, innerHeight - 12) + "px";
  move(
    w,
    Math.max(3, (innerWidth - width) / 2) + (windows.size % 4) * 9,
    Math.max(4, (innerHeight - height) * 0.3) + (windows.size % 4) * 10,
  );
  let title = el("header", box, undefined, "title"),
    sys = btn(title, "━", () =>
      popup(sys, [
        ["Restaurar / Maximizar", maximize],
        ["Minimizar", minimize],
        ["Fechar", close],
      ]),
    );
  sys.ariaLabel = "Menu da janela";
  w.caption = el("strong", title, names[id]);
  let small = btn(title, "▼", minimize);
  small.ariaLabel = "Minimizar";
  let big = btn(title, "▲", maximize);
  big.ariaLabel = "Maximizar ou restaurar";
  function minimize() {
    box.hidden = true;
    w.icon = btn(tray, w.caption.textContent, () => focusWindow(w));
    nextWindow();
  }
  function maximize() {
    if (w.original) {
      Object.assign(box.style, w.original);
      w.original = null;
    } else {
      w.original = Object.fromEntries(
        ["width", "height", "left", "top"].map((k) => [k, box.style[k]]),
      );
      Object.assign(box.style, {
        width: "100%",
        height: "100%",
        left: "0",
        top: "0",
      });
    }
  }
  async function close() {
    if (w.dirty && !(await question("Descartar alterações?", "", true))) return;
    if (id === "manager") {
      minimize();
      return;
    }
    w.cleanup?.();
    windows.delete(w);
    box.remove();
    nextWindow();
  }
  w.close = close;
  box.onpointerdown = () => focusWindow(w);
  title.ondblclick = (e) => {
    if (e.target === w.caption) maximize();
  };
  title.onpointerdown = (e) => {
    if (e.target !== w.caption || w.original) return;
    let dx = e.clientX - box.offsetLeft,
      dy = e.clientY - box.offsetTop;
    title.setPointerCapture(e.pointerId);
    title.onpointermove = (e) => move(w, e.clientX - dx, e.clientY - dy);
    title.onlostpointercapture = () => (title.onpointermove = null);
  };
  w.bar = el("nav", box, undefined, "menus");
  w.addMenu = (label, items) => {
    let b = btn(w.bar, label, () => popup(b, items));
  };
  w.body = el("div", box, undefined, "content");
  focusWindow(w);
  return w;
}
function icon(parent, id) {
  let c = el("canvas", parent);
  c.width = c.height = 32;
  let g = c.getContext("2d");
  function r(x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }
  function tile(x, y, w, h, color) {
    r(x, y, w, h, "#171719");
    r(x + 1, y + 1, w - 2, h - 2, color);
    r(x + 1, y + 1, w - 2, 1, "white");
  }
  if (id === "files") {
    tile(2, 6, 12, 8, "#ffe66a");
    tile(2, 10, 28, 16, "#dbab23");
    tile(5, 13, 26, 14, "#ffe66a");
  }
  if (id === "notes" || id === "help") {
    tile(5, 2, 22, 28, id === "help" ? "#174aa0" : "#fff");
    if (id === "help") {
      g.fillStyle = "white";
      g.font = "bold 24px serif";
      g.fillText("?", 11, 25);
    } else for (let y = 8; y < 26; y += 4) r(9, y, 14, 1, "#4065a0");
  }
  if (id === "dos") {
    tile(1, 4, 29, 22, "#181818");
    r(10, 27, 12, 2, "#999");
    g.fillStyle = "white";
    g.font = "10px monospace";
    g.fillText("C:>", 4, 18);
  }
  if (id === "calc" || id === "settings") {
    tile(4, 2, 24, 28, "#aaa");
    if (id === "calc") {
      tile(7, 5, 18, 6, "#c5d9a6");
      for (let y = 14; y < 27; y += 5)
        for (let x = 8; x < 25; x += 6) tile(x, y, 4, 3, "white");
    } else
      for (let x = 9; x < 25; x += 6) {
        r(x, 6, 2, 19, "#222");
        tile(x - 2, (x % 7) + 9, 6, 5, "#33afaf");
      }
  }
  if (id === "paint") {
    tile(2, 8, 25, 20, "white");
    for (let n = 0; n < 15; n++) {
      r(11 + n, 19 - n, 4, 4, "#9d521b");
    }
    r(8, 21, 6, 4, "#003ca2");
    r(5, 24, 5, 2, "#005aca");
  }
  if (id === "clock" || id === "mine") {
    g.fillStyle = "#111";
    g.beginPath();
    g.arc(16, 16, id === "clock" ? 14 : 10, 0, 7);
    g.fill();
    if (id === "clock") {
      g.fillStyle = "white";
      g.beginPath();
      g.arc(16, 16, 12, 0, 7);
      g.fill();
      r(15, 6, 2, 11, "navy");
      r(15, 15, 9, 2, "navy");
    } else {
      r(15, 1, 3, 29, "black");
      r(1, 15, 29, 3, "black");
      r(10, 10, 4, 4, "white");
    }
  }
}
const filesKey = "window311.files.v1";
function files() {
  return JSON.parse(
    localStorage.getItem(filesKey) ||
      '{"LEIA-ME.TXT":"Bem-vindo ao Window 3.11! Abra os acessórios pelo Gerenciador de Programas."}',
  );
}
function store(f) {
  try {
    localStorage.setItem(filesKey, JSON.stringify(f));
    for (let w of windows) w.refresh?.();
    return true;
  } catch {
    notice("Não foi possível salvar no armazenamento do navegador.");
    return false;
  }
}
async function filename(title, def) {
  let n = (await question(title, def))?.trim().toUpperCase();
  if (!n) return;
  if (!/^[A-Z0-9_ -]{1,60}\.(TXT|PNG)$/.test(n)) {
    notice("Use um nome com extensão .TXT ou .PNG.");
    return;
  }
  return n;
}
function launch(id, name) {
  if (id === "manager" && [...windows].some((w) => w.id === id))
    return focusWindow([...windows].find((w) => w.id === id));
  let size = {
    manager: [700, 490],
    calc: [265, 330],
    mine: [300, 395],
    clock: [300, 165],
    paint: [540, 420],
  }[id] || [480, 335];
  let w = frame(id, ...size);
  apps[id](w, name);
  return w;
}
function openFile(n) {
  launch(n.endsWith(".PNG") ? "paint" : "notes", n);
}
function manager(w) {
  w.addMenu("Arquivo", [
    ["Executar…", run],
    ["Minimizar", () => w.close()],
  ]);
  w.addMenu("Opções", [["Painel de Controle", () => launch("settings")]]);
  let b = btn(w.bar, "Janela", () =>
    popup(
      b,
      [...windows].map((a) => [a.caption.textContent, () => focusWindow(a)]),
    ),
  );
  w.addMenu("Ajuda", [["Índice", () => launch("help")]]);
  w.body.classList.add("groups");
  for (let [title, ids] of Object.entries(groups)) {
    let group = el("section", w.body, undefined, "group");
    el("h2", group, title);
    let grid = el("div", group, undefined, "icons");
    for (let id of ids) {
      let b = btn(grid, "", () => launch(id), "shortcut");
      icon(b, id);
      el("span", b, names[id]);
    }
  }
  el("footer", w.box, "3 grupos de programas", "status");
}
const commands = {
  progman: "manager",
  winfile: "files",
  control: "settings",
  command: "dos",
  notepad: "notes",
  pbrush: "paint",
  calc: "calc",
  clock: "clock",
  winmine: "mine",
  winhelp: "help",
};
async function run() {
  let cmd = (await question("Executar programa", "notepad.exe"))
    ?.trim()
    .toLowerCase()
    .replace(/\.exe$/, "");
  if (cmd)
    commands[cmd] ? launch(commands[cmd]) : notice("Programa desconhecido.");
}
function notes(w, n) {
  let t = el("textarea", w.body, undefined, "editor");
  t.ariaLabel = "Texto do documento";
  t.value = n ? files()[n] : "";
  function label() {
    w.caption.textContent =
      (n || "Sem título") + (w.dirty ? " *" : "") + " - Bloco de Notas";
  }
  label();
  t.oninput = () => {
    w.dirty = true;
    label();
  };
  async function save(as) {
    let key =
      as || !n ? await filename("Salvar documento como", n || "TEXTO.TXT") : n;
    if (!key) return;
    if (!key.endsWith(".TXT")) return notice("Use a extensão .TXT.");
    let f = files();
    if (
      key !== n &&
      Object.hasOwn(f, key) &&
      !(await question("Substituir " + key + "?", "", true))
    )
      return;
    f[key] = t.value;
    if (store(f)) {
      n = key;
      w.dirty = false;
      label();
    }
  }
  w.save = () => save(false);
  w.addMenu("Arquivo", [
    ["Novo", () => launch("notes")],
    ["Abrir…", () => launch("files")],
    ["Salvar", w.save],
    ["Salvar como…", () => save(true)],
    ["Fechar", w.close],
  ]);
  w.addMenu("Editar", [
    [
      "Selecionar tudo",
      () => {
        t.focus();
        t.select();
      },
    ],
  ]);
}
function fileManager(w) {
  let list = el("div", w.body, undefined, "filelist");
  function refresh() {
    list.replaceChildren();
    for (let n of Object.keys(files()).sort())
      btn(list, "▤  " + n, () => openFile(n));
  }
  w.refresh = refresh;
  refresh();
  w.addMenu("Arquivo", [
    ["Novo texto", () => launch("notes")],
    [
      "Renomear…",
      async () => {
        let old = await filename("Nome atual", "");
        if (!old) return;
        let n = await filename("Novo nome", old),
          f = files();
        if (!n || old === n) return;
        if (
          !Object.hasOwn(f, old) ||
          Object.hasOwn(f, n) ||
          n.split(".").pop() !== old.split(".").pop()
        )
          return notice("Confira os nomes e a extensão.");
        f[n] = f[old];
        delete f[old];
        store(f);
      },
    ],
    [
      "Excluir…",
      async () => {
        let n = await filename("Excluir arquivo", "");
        if (
          n &&
          Object.hasOwn(files(), n) &&
          (await question("Excluir " + n + "?", "", true))
        ) {
          let f = files();
          delete f[n];
          store(f);
        }
      },
    ],
  ]);
  el("footer", w.box, "C:\\  •  Disco local do navegador", "status");
}
function calc(w) {
  let p = el("div", w.body, undefined, "panel"),
    out = el("input", p, undefined, "display");
  out.readOnly = true;
  out.value = "0";
  let keys = el("div", p, undefined, "keys"),
    acc = null,
    op = null,
    fresh = true;
  function key(k) {
    if (k === "C") {
      acc = op = null;
      fresh = true;
      out.value = "0";
      return;
    }
    if (k === "⌫") {
      out.value = out.value.slice(0, -1) || "0";
      return;
    }
    if (k === "±") {
      out.value = String(-Number(out.value));
      return;
    }
    if (/[0-9.]/.test(k)) {
      if (fresh) {
        out.value = "0";
        fresh = false;
      }
      if (k === "." && out.value.includes(".")) return;
      out.value = out.value === "0" && k !== "." ? k : out.value + k;
      return;
    }
    let v = Number(out.value);
    if (op && !fresh) {
      v = {
        "+": () => acc + v,
        "−": () => acc - v,
        "×": () => acc * v,
        "÷": () => acc / v,
      }[op]();
      out.value = Number.isFinite(v)
        ? String(Number(v.toPrecision(12)))
        : "Erro";
    }
    acc = v;
    op = k === "=" ? null : k;
    fresh = true;
  }
  for (let k of [
    "C",
    "⌫",
    "±",
    "÷",
    "7",
    "8",
    "9",
    "×",
    "4",
    "5",
    "6",
    "−",
    "1",
    "2",
    "3",
    "+",
    "0",
    ".",
    "=",
  ])
    btn(keys, k, () => key(k), "raised");
  w.key = (e) => {
    let k =
      { Enter: "=", Backspace: "⌫", "*": "×", "/": "÷", "-": "−", ",": "." }[
        e.key
      ] || e.key;
    if (/^[0-9.=+×÷−]$/.test(k) || k === "⌫") {
      e.preventDefault();
      key(k);
    }
  };
}
function paint(w, n) {
  let bar = el("div", w.body, undefined, "controls"),
    color = el("input", bar);
  color.type = "color";
  color.ariaLabel = "Cor do pincel";
  let width = el("select", bar);
  width.ariaLabel = "Espessura";
  for (let s of [2, 5, 10, 20]) el("option", width, s);
  let c = el("canvas", w.body, undefined, "drawing");
  c.width = 500;
  c.height = 280;
  let ctx = c.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 500, 280);
  if (n) {
    let img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = files()[n];
  }
  function point(e) {
    let r = c.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * 500) / r.width,
      ((e.clientY - r.top) * 280) / r.height,
    ];
  }
  let last;
  c.onpointerdown = (e) => {
    c.setPointerCapture(e.pointerId);
    last = point(e);
    ctx.fillStyle = color.value;
    ctx.beginPath();
    ctx.arc(...last, Number(width.value) / 2, 0, 7);
    ctx.fill();
    w.dirty = true;
  };
  c.onpointermove = (e) => {
    if (!last) return;
    let p = point(e);
    ctx.strokeStyle = color.value;
    ctx.lineWidth = Number(width.value);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(...last);
    ctx.lineTo(...p);
    ctx.stroke();
    last = p;
  };
  c.onlostpointercapture = () => (last = null);
  w.save = async () => {
    let k = n || (await filename("Salvar desenho como", "DESENHO.PNG"));
    if (!k) return;
    if (!k.endsWith(".PNG")) return notice("Use a extensão .PNG.");
    if (
      k !== n &&
      Object.hasOwn(files(), k) &&
      !(await question("Substituir " + k + "?", "", true))
    )
      return;
    let f = files();
    f[k] = c.toDataURL();
    if (store(f)) {
      n = k;
      w.dirty = false;
      w.caption.textContent = k + " - Paintbrush";
    }
  };
  w.addMenu("Arquivo", [
    ["Novo", () => launch("paint")],
    ["Abrir…", () => launch("files")],
    ["Salvar", w.save],
    ["Fechar", w.close],
  ]);
}
function settings(w) {
  let p = el("div", w.body, undefined, "panel");
  el("p", p, "Cor da área de trabalho");
  for (let [name, c] of Object.entries({
    "Verde-petróleo": "#008080",
    Azul: "#224c80",
    Cinza: "#777777",
    Preto: "#171717",
  })) {
    let b = btn(
      p,
      name,
      () => {
        document.body.style.background = c;
        localStorage.setItem("window311.background", c);
      },
      "raised",
    );
    b.style.borderBottomColor = c;
  }
}
function clock(w) {
  let t = el("div", w.body, undefined, "clock");
  function tick() {
    t.textContent = new Date().toLocaleTimeString("pt-BR");
  }
  tick();
  let timer = setInterval(tick, 1000);
  w.cleanup = () => clearInterval(timer);
}
function mine(w) {
  let p = el("div", w.body, undefined, "panel"),
    bar = el("div", p, undefined, "controls");
  btn(bar, "Novo jogo", reset, "raised");
  let flag = false,
    toggle = btn(
      bar,
      "Bandeira",
      () => {
        flag = !flag;
        toggle.setAttribute("aria-pressed", flag);
        toggle.textContent = flag ? "Bandeira ✓" : "Bandeira";
      },
      "raised",
    );
  let msg = el("div", p),
    grid = el("div", p, undefined, "mine"),
    bombs,
    opened,
    marked,
    over;
  function around(i) {
    return Array.from({ length: 81 }, (_, j) => j).filter(
      (j) =>
        j !== i &&
        Math.abs((i % 9) - (j % 9)) <= 1 &&
        Math.abs(Math.floor(i / 9) - Math.floor(j / 9)) <= 1,
    );
  }
  function mark(i) {
    if (over || opened.has(i)) return;
    if (marked.has(i)) marked.delete(i);
    else marked.add(i);
    grid.children[i].textContent = marked.has(i) ? "⚑" : "";
    msg.textContent = 10 - marked.size + " minas restantes";
  }
  function reveal(i) {
    if (over || marked.has(i) || opened.has(i)) return;
    if (!bombs.size) {
      while (bombs.size < 10) {
        let j = Math.floor(Math.random() * 81);
        if (j !== i) bombs.add(j);
      }
    }
    let b = grid.children[i];
    b.classList.add("open");
    opened.add(i);
    if (bombs.has(i)) {
      over = true;
      for (let j of bombs) grid.children[j].textContent = "✹";
      msg.textContent = "Fim de jogo";
      return;
    }
    let near = around(i),
      total = near.filter((j) => bombs.has(j)).length;
    b.textContent = total || "";
    if (!total) near.forEach(reveal);
    if (opened.size === 71) {
      over = true;
      msg.textContent = "Você venceu!";
    }
  }
  function reset() {
    bombs = new Set();
    opened = new Set();
    marked = new Set();
    over = false;
    grid.replaceChildren();
    msg.textContent = "10 minas restantes";
    for (let i = 0; i < 81; i++) {
      let b = btn(grid, "", () => (flag ? mark(i) : reveal(i)), "raised");
      b.ariaLabel = "Casa " + (i + 1);
      b.oncontextmenu = (e) => {
        e.preventDefault();
        mark(i);
      };
    }
  }
  reset();
}
function dos(w) {
  let p = el("div", w.body, undefined, "terminal"),
    out = el(
      "pre",
      p,
      "Window 3.11 [DOS virtual]\nDigite HELP para listar comandos.\n",
    ),
    f = el("form", p);
  el("span", f, "C:\\>");
  let input = el("input", f);
  input.ariaLabel = "Comando";
  input.autocomplete = "off";
  input.focus();
  f.onsubmit = (e) => {
    e.preventDefault();
    let line = input.value.trim(),
      [cmd, ...args] = line.split(/\s+/),
      arg = args.join(" ").toUpperCase(),
      c = cmd.toLowerCase().replace(/\.exe$/, "");
    input.value = "";
    let reply = "";
    if (c === "cls") {
      out.textContent = "";
      return;
    }
    if (c === "exit") {
      w.close();
      return;
    }
    if (c === "help")
      reply =
        "DIR, TYPE arquivo.txt, ECHO texto, CLS, VER, EXIT\n" +
        Object.keys(commands).join(", ");
    else if (c === "dir") reply = Object.keys(files()).join("\n");
    else if (c === "type")
      reply =
        arg.endsWith(".TXT") && Object.hasOwn(files(), arg)
          ? files()[arg]
          : "Arquivo de texto desconhecido";
    else if (c === "echo") reply = args.join(" ");
    else if (c === "ver") reply = "Window 3.11 - DOS virtual";
    else if (commands[c]) launch(commands[c]);
    else if (c) reply = "Comando desconhecido";
    out.textContent += "C:\\>" + line + "\n" + reply + "\n";
    p.scrollTop = p.scrollHeight;
  };
}
function help(w) {
  let p = el("article", w.body, undefined, "panel paper");
  el("h2", p, "Ajuda do Window 3.11");
  for (let s of [
    "Clique em um ícone para abrir o programa. Arraste a barra de título para mover a janela. O botão à esquerda abre o menu da janela.",
    "Use Ctrl+S para salvar, Alt+F4 para fechar e F1 para abrir a ajuda.",
    "O Bloco de Notas e o Paintbrush compartilham o disco C: virtual. Seus arquivos ficam neste navegador.",
    "No Campo Minado, use o botão direito ou ative Bandeira para marcar uma casa.",
  ])
    el("p", p, s);
}
const apps = {
  manager,
  files: fileManager,
  notes,
  paint,
  calc,
  clock,
  mine,
  settings,
  dos,
  help,
};
document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  if (e.key === "Escape") closeMenu();
  else if (e.key === "F1") {
    e.preventDefault();
    launch("help");
  } else if (e.altKey && e.key === "F4") {
    e.preventDefault();
    active?.close();
  } else if (e.ctrlKey && e.key.toLowerCase() === "s" && active?.save) {
    e.preventDefault();
    active.save();
  } else if (!e.ctrlKey && !e.altKey) active?.key?.(e);
});
window.addEventListener("resize", () => {
  for (let w of windows)
    if (!w.box.hidden) move(w, w.box.offsetLeft, w.box.offsetTop);
});
document.body.style.background =
  localStorage.getItem("window311.background") || "#008080";
launch("manager");
