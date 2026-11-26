// Window 3.11 desktop. All geometry, interaction and application state live
// here.
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
#define EXPORT(name) __attribute__((export_name(#name)))
IMPORT(rect) void rect(int, int, int, int, int);
IMPORT(label) void label(int, int, const char *, int, int);
IMPORT(clip) void clip(int, int, int, int);
IMPORT(unclip) void unclip(void);
IMPORT(random) int random_below(int);
IMPORT(clock) void clock_text(char *);
IMPORT(number) void number(char *, double);
IMPORT(fileName) int filename(int, char *);
IMPORT(readFile) int read_file(const char *, char *, int);
IMPORT(saveFile) int save_file(const char *, const char *);
IMPORT(ask) int ask(char *, int);
IMPORT(notify) void notify(const char *);
IMPORT(discard) int discard(void);
IMPORT(paintStore) int paint_store(void *, int, int);
IMPORT(pixels) void pixels(int, int, int, int, void *);
IMPORT(legacy) void legacy(void);

enum {
  DESK,
  GRAY,
  WHITE,
  BLACK,
  NAVY,
  SHADOW,
  YELLOW,
  BLUE,
  AQUA,
  RED,
  GREEN,
  PAPER,
  GOLD,
  SLATE,
  PINK,
  INK
};
enum {
  MANAGER,
  FILES,
  CONTROL,
  TERMINAL,
  HELP,
  NOTES,
  PAINT,
  CALC,
  CLOCK,
  MINES,
  COUNT
};
static const char *titles[] = {"Gerenciador de Programas",
                               "Arquivos",
                               "Painel de Controle",
                               "MS-DOS",
                               "Ajuda",
                               "Bloco de Notas",
                               "Paintbrush",
                               "Calculadora",
                               "Relógio",
                               "Campo Minado"};
typedef struct {
  int x, y, w, h, shown, min, max, z, ox, oy, ow, oh;
} Window;
static Window win[COUNT];
static int sw, sh, top, active, gesture, dx, dy, menu = -1, selected = 1,
                                                 bg = DESK;
static int imin(int a, int b) { return a < b ? a : b; }
static int imax(int a, int b) { return a > b ? a : b; }
static int clamp(int v, int lo, int hi) { return imax(lo, imin(v, hi)); }
static int len(const char *s) {
  int n = 0;
  while (s[n])
    n++;
  return n;
}
static void copy(char *d, const char *s, int cap) {
  int i = 0;
  while (s[i] && i < cap - 1) {
    d[i] = s[i];
    i++;
  }
  d[i] = 0;
}
static void bevel(int x, int y, int w, int h, int fill) {
  rect(x, y, w, h, BLACK);
  rect(x + 1, y + 1, w - 2, h - 2, SHADOW);
  rect(x + 1, y + 1, w - 3, h - 3, WHITE);
  rect(x + 3, y + 3, w - 5, h - 5, fill);
}
static void button(int x, int y, int w, const char *s) {
  bevel(x, y, w, 23, GRAY);
  label(x + 6, y + 4, s, BLACK, 0);
}
static void fit(Window *w) {
  w->w = imin(w->w, sw);
  w->h = imin(w->h, sh);
  w->x = clamp(w->x, 0, sw - w->w);
  w->y = clamp(w->y, 0, sh - w->h);
}
static void open_app(int id) {
  Window *w = win + id;
  if (!w->shown) {
    int widths[] = {620, 380, 335, 460, 430, 520, 380, 248, 225, 285};
    int heights[] = {405, 295, 170, 290, 235, 330, 265, 295, 130, 316};
    w->w = widths[id];
    w->h = heights[id];
    w->x = (sw - w->w) / 2 + id * 3;
    w->y = (sh - w->h) / 3 + id * 3;
    w->shown = 1;
    w->max = 0;
    fit(w);
  }
  w->min = 0;
  w->z = ++top;
  active = id;
  menu = -1;
}
static void refocus(void) {
  active = -1;
  for (int i = 0; i < COUNT; i++)
    if (win[i].shown && !win[i].min && (active < 0 || win[i].z > win[active].z))
      active = i;
}
static char doc[32768], docname[256] = "SEM-TITULO.TXT", scratch[256],
                        line[512], timebuf[32];
static int dirty, existing;
static void save(void) {
  if (!existing && !ask(docname, sizeof docname))
    return;
  if (save_file(docname, doc)) {
    dirty = 0;
    existing = 1;
  } else
    notify("Não foi possível salvar.");
}
static int can_replace(void) { return !dirty || discard(); }
static void close_app(int id) {
  if (id == NOTES && !can_replace())
    return;
  if (id == NOTES) {
    dirty = existing = 0;
    doc[0] = 0;
    copy(docname, "SEM-TITULO.TXT", 256);
  }
  if (id == MANAGER)
    win[id].min = 1;
  else
    win[id].shown = 0;
  menu = -1;
  refocus();
}
static void maximize(Window *w) {
  if (w->max) {
    w->x = w->ox;
    w->y = w->oy;
    w->w = w->ow;
    w->h = w->oh;
  } else {
    w->ox = w->x;
    w->oy = w->y;
    w->ow = w->w;
    w->oh = w->h;
    w->x = w->y = 0;
    w->w = sw;
    w->h = sh;
  }
  w->max = !w->max;
  fit(w);
}
static void icon(int id, int x, int y) {
  if (id == FILES) {
    rect(x + 2, y + 5, 13, 6, BLACK);
    rect(x + 3, y + 6, 11, 5, YELLOW);
    bevel(x + 1, y + 10, 30, 20, YELLOW);
    return;
  }
  if (id == CLOCK || id == MINES) {
    for (int j = -14; j <= 14; j++)
      for (int i = -14; i <= 14; i++)
        if (i * i + j * j < 195)
          rect(x + 16 + i, y + 16 + j, 1, 1,
               (id == CLOCK && i * i + j * j < 146) ? WHITE : BLACK);
    if (id == CLOCK) {
      rect(x + 15, y + 6, 2, 12, NAVY);
      rect(x + 15, y + 16, 9, 2, NAVY);
    } else {
      rect(x + 14, y, 3, 32, BLACK);
      rect(x, y + 14, 32, 3, BLACK);
      rect(x + 9, y + 9, 4, 4, WHITE);
    }
    return;
  }
  if (id == TERMINAL) {
    bevel(x, y + 3, 32, 23, INK);
    label(x + 4, y + 6, "C:>", WHITE, 1);
    rect(x + 9, y + 27, 15, 3, SHADOW);
    return;
  }
  if (id == PAINT) {
    bevel(x + 1, y + 8, 26, 23, WHITE);
    for (int i = 0; i < 20; i++)
      rect(x + 8 + i, y + 23 - i, 4, 4, i < 5 ? BLUE : GOLD);
    return;
  }
  if (id == CALC || id == CONTROL) {
    bevel(x + 4, y + 1, 24, 30, GRAY);
    if (id == CALC) {
      rect(x + 8, y + 5, 16, 6, GREEN);
      for (int j = 14; j < 28; j += 5)
        for (int i = 8; i < 25; i += 6)
          rect(x + i, y + j, 4, 3, BLACK);
    } else
      for (int i = 8; i < 25; i += 7) {
        rect(x + i, y + 6, 2, 20, BLACK);
        bevel(x + i - 2, y + 8 + i % 8, 6, 6, AQUA);
      }
    return;
  }
  bevel(x + 5, y + 1, 23, 30, id == HELP ? NAVY : WHITE);
  if (id == HELP)
    label(x + 12, y + 7, "?", WHITE, 1);
  else
    for (int j = 7; j < 27; j += 4)
      rect(x + 9, y + j, 15, 1, BLUE);
}
static int cols(Window *w) { return imax(2, (w->w - 28) / 113); }
static int tile_y(Window *w, int id) {
  int c = cols(w), g = id <= 4 ? 0 : id <= 8 ? 1 : 2, base = 0;
  for (int i = 0; i < g; i++)
    base += 28 + ((4 + c - 1) / c) * 60;
  int k = g == 2 ? 0 : (id - 1) % 4;
  return base + 25 + (k / c) * 60;
}
static int tile_x(Window *w, int id) {
  int k = id == MINES ? 0 : (id - 1) % 4;
  return 14 + (k % cols(w)) * 113;
}
static const char *sections[] = {"Principal", "Acessórios", "Jogos"};
static int offset;
static void manager(Window *w, int x, int y) {
  for (int i = 1; i < COUNT; i++) {
    int tx = x + tile_x(w, i), ty = y + tile_y(w, i) - offset;
    if (i == 1 || i == 5 || i == 9) {
      rect(x + 6, ty - 22, w->w - 24, 20, SLATE);
      label(x + 13, ty - 20, sections[(i - 1) / 4], WHITE, 1);
    }
    icon(i, tx + 28, ty);
    if (i == selected)
      rect(tx, ty + 32, 108, 18, NAVY);
    label(tx + 2, ty + 33, titles[i], i == selected ? WHITE : BLACK, 0);
  }
}
static char display[48] = "0";
static double acc;
static int operation, fresh = 1;
static const char *keys[] = {"C", "⌫", "±", "÷", "7", "8", "9", "×", "4", "5",
                             "6", "−", "1", "2", "3", "+", "0", ".", "="};
static double value(void) {
  int i = display[0] == '-', negative = i;
  double d = 0, scale = 1;
  int decimal = 0;
  for (; display[i]; i++) {
    if (display[i] == '.') {
      decimal = 1;
      continue;
    }
    if (display[i] < '0' || display[i] > '9')
      break;
    if (decimal) {
      scale *= .1;
      d += (display[i] - 48) * scale;
    } else
      d = d * 10 + display[i] - 48;
  }
  return negative ? -d : d;
}
static void calculate(int k) {
  int n = len(display);
  if (k == 0) {
    display[0] = '0';
    display[1] = 0;
    operation = 0;
    fresh = 1;
    return;
  }
  if (k == 1) {
    if (n > 1)
      display[n - 1] = 0;
    else
      copy(display, "0", 48);
    return;
  }
  if (k == 2) {
    number(display, -value());
    return;
  }
  if (k == 3 || k == 7 || k == 11 || k == 15 || k == 18) {
    double v = value();
    if (operation && !fresh) {
      if (operation == 3)
        v = acc / v;
      if (operation == 7)
        v = acc * v;
      if (operation == 11)
        v = acc - v;
      if (operation == 15)
        v = acc + v;
      number(display, v);
    }
    acc = v;
    operation = k == 18 ? 0 : k;
    fresh = 1;
    return;
  }
  char c = keys[k][0];
  if (fresh) {
    copy(display, "0", 48);
    fresh = 0;
  }
  n = len(display);
  if (c == '.') {
    for (int i = 0; i < n; i++)
      if (display[i] == '.')
        return;
  } else if (n == 1 && display[0] == '0')
    n = 0;
  if (n < 15) {
    display[n] = c;
    display[n + 1] = 0;
  }
}
#define PW 320
#define PH 155
static unsigned char bitmap[PW * PH];
static int ink = BLACK, lastx, lasty;
static void stroke(int x, int y) {
  int ax = lastx, ay = lasty, sx = ax < x ? 1 : -1, sy = ay < y ? 1 : -1;
  int a = (x - ax) * sx, b = -(y - ay) * sy, err = a + b;
  for (;;) {
    bitmap[ay * PW + ax] = ink;
    if (ax < PW - 1)
      bitmap[ay * PW + ax + 1] = ink;
    if (ax == x && ay == y)
      break;
    int e = 2 * err;
    if (e >= b) {
      err += b;
      ax += sx;
    }
    if (e <= a) {
      err += a;
      ay += sy;
    }
  }
  lastx = x;
  lasty = y;
}
static unsigned char bombs[81], opened[81], flags[81];
static int playing, ended, revealed;
static void reset_game(void) {
  for (int i = 0; i < 81; i++)
    bombs[i] = opened[i] = flags[i] = 0;
  playing = ended = revealed = 0;
}
static int near(int a, int b) {
  int x = a % 9 - b % 9, y = a / 9 - b / 9;
  return a != b && x * x <= 1 && y * y <= 1;
}
static int adjacent(int a) {
  int n = 0;
  for (int i = 0; i < 81; i++)
    if (near(a, i) && bombs[i])
      n++;
  return n;
}
static void reveal(int cell) {
  if (opened[cell] || flags[cell] || ended)
    return;
  opened[cell] = 1;
  if (bombs[cell]) {
    ended = 1;
    return;
  }
  revealed++;
  if (!adjacent(cell))
    for (int i = 0; i < 81; i++)
      if (near(cell, i))
        reveal(i);
  if (revealed == 71)
    ended = 2;
}
static char command[120],
    output[2048] = "Window 3.11\nDigite HELP para ver os comandos.";
static int eq(const char *a, const char *b) {
  while (*a && *b && *a == *b) {
    a++;
    b++;
  }
  return *a == *b;
}
static void append(char *s, const char *tail, int cap) {
  int n = len(s);
  copy(s + n, tail, cap - n);
}
static void execute(void) {
  for (int i = 0; command[i]; i++)
    if (command[i] >= 'a' && command[i] <= 'z')
      command[i] -= 32;
  if (eq(command, "DIR")) {
    output[0] = 0;
    for (int i = 0; filename(i, scratch) && len(output) < 1750; i++) {
      append(output, scratch, sizeof output);
      append(output, "\n", sizeof output);
    }
  } else if (eq(command, "CLS"))
    output[0] = 0;
  else if (eq(command, "HELP"))
    copy(output,
         "DIR   CLS   VER   EXIT\nNOTEPAD   CALC   PBRUSH   WINFILE   WINMINE",
         sizeof output);
  else if (eq(command, "VER"))
    copy(output, "Window 3.11 / WebAssembly", sizeof output);
  else if (eq(command, "EXIT"))
    close_app(TERMINAL);
  else {
    const char *aliases[] = {"PROGMAN", "WINFILE", "CONTROL", "COMMAND",
                             "WINHELP", "NOTEPAD", "PBRUSH",  "CALC",
                             "CLOCK",   "WINMINE"};
    int id = 0;
    while (id < COUNT && !eq(command, aliases[id]))
      id++;
    if (id < COUNT)
      open_app(id);
    else
      copy(output, "Comando desconhecido.", sizeof output);
  }
  command[0] = 0;
}
static void lines(const char *s, int x, int y, int width, int rows, int color) {
  int limit = clamp(width / 8, 8, 120), used = 0, row = 0, start = 0;
  for (int i = 0;; i++) {
    unsigned char c = s[i];
    if (!c || c == '\n' || (used >= limit && (c & 192) != 128)) {
      row++;
      used = 0;
    }
    if ((c & 192) != 128 && c != '\n')
      used++;
    if (!c)
      break;
  }
  int skip = imax(0, row - rows);
  used = row = 0;
  for (int i = 0;; i++) {
    unsigned char c = s[i];
    if (!c || c == '\n' || (used >= limit && (c & 192) != 128)) {
      if (row >= skip) {
        int size = imin(i - start, 510);
        for (int j = 0; j < size; j++)
          line[j] = s[start + j];
        line[size] = 0;
        label(x, y + (row - skip) * 18, line, color, 0);
      }
      row++;
      used = 0;
      start = i + (c == '\n');
    }
    if ((c & 192) != 128 && c != '\n')
      used++;
    if (!c)
      break;
  }
}
static int filepage;
static void body(int id, Window *w, int x, int y) {
  switch (id) {
  case MANAGER:
    manager(w, x, y);
    break;
  case FILES:
    button(x + 5, y + 4, 60, "Acima");
    button(x + 67, y + 4, 72, "Abaixo");
    label(x + 150, y + 8, "C:\\", BLACK, 1);
    for (int i = 0; i < (w->h - 90) / 23 && filename(filepage + i, scratch);
         i++) {
      label(x + 12, y + 36 + i * 23, scratch, NAVY, 0);
    }
    break;
  case CONTROL:
    label(x + 10, y + 10, "Cor da área de trabalho", BLACK, 1);
    for (int i = 0; i < 8; i++)
      bevel(x + 10 + i * 34, y + 38, 30, 27, i);
    break;
  case TERMINAL:
    rect(x, y, w->w, w->h, INK);
    lines(output, x + 8, y + 8, w->w - 22, (w->h - 110) / 18, WHITE);
    label(x + 8, y + w->h - 82, "C:\\>", WHITE, 0);
    label(x + 44, y + w->h - 82, command, WHITE, 0);
    break;
  case HELP:
    lines("Window 3.11\nClique em um programa para abrir. Arraste a barra de "
          "título para mover ou o canto inferior direito para redimensionar. "
          "Tab seleciona programas e Enter abre. Alt+F4 fecha a janela.",
          x + 8, y + 8, w->w - 30, 10, BLACK);
    break;
  case NOTES:
    button(x + 4, y + 3, 65, "Salvar");
    label(x + 80, y + 7, docname, BLACK, 0);
    if (dirty)
      label(x + w->w - 35, y + 7, "*", RED, 1);
    lines(doc, x + 6, y + 34, w->w - 25, (w->h - 96) / 18, BLACK);
    break;
  case PAINT:
    for (int i = 0; i < 16; i++)
      rect(x + 4 + i * 14, y + 4, 13, 18, i);
    rect(x + 4 + ink * 14, y + 23, 13, 2, BLACK);
    button(x + 234, y + 2, 69, "Salvar");
    pixels(x + 4, y + 32, PW, PH, bitmap);
    break;
  case CALC:
    rect(x + 6, y + 4, 218, 30, WHITE);
    label(x + 15, y + 12, display, BLACK, 1);
    for (int i = 0; i < 19; i++)
      button(x + 7 + i % 4 * 55, y + 41 + i / 4 * 33, 51, keys[i]);
    break;
  case CLOCK:
    clock_text(timebuf);
    label(x + 50, y + 20, timebuf, NAVY, 1);
    break;
  case MINES:
    button(x + 6, y + 3, 75, "Reiniciar");
    label(x + 90, y + 7,
          ended == 1   ? "Fim de jogo"
          : ended == 2 ? "Você venceu!"
                       : "10 minas",
          BLACK, 1);
    for (int i = 0; i < 81; i++) {
      int a = x + 8 + i % 9 * 25, b = y + 32 + i / 9 * 25;
      if (opened[i])
        rect(a, b, 24, 24, PAPER);
      else
        bevel(a, b, 25, 25, GRAY);
      if (ended && bombs[i])
        label(a + 7, b + 4, "*", RED, 1);
      else if (flags[i])
        label(a + 7, b + 4, "F", RED, 1);
      else if (opened[i] && adjacent(i)) {
        char s[] = {48 + adjacent(i), 0};
        label(a + 7, b + 4, s, BLUE, 1);
      }
    }
    break;
  }
}
static const char *items[] = {"Restaurar / maximizar", "Minimizar", "Fechar",
                              "Abrir Ajuda", "Interface clássica anterior"};
static void draw_window(int id) {
  Window *w = win + id;
  int x = w->x, y = w->y;
  bevel(x, y, w->w, w->h, GRAY);
  rect(x + 4, y + 4, w->w - 8, 23, active == id ? NAVY : SHADOW);
  label(x + 32, y + 8, titles[id], WHITE, 1);
  bevel(x + 5, y + 5, 21, 20, GRAY);
  rect(x + 10, y + 14, 11, 2, BLACK);
  bevel(x + w->w - 48, y + 5, 21, 20, GRAY);
  bevel(x + w->w - 26, y + 5, 21, 20, GRAY);
  label(x + w->w - 45, y + 7, "▼", BLACK, 0);
  label(x + w->w - 24, y + 7, "▲", BLACK, 0);
  rect(x + 5, y + 28, w->w - 10, 20, WHITE);
  label(x + 10, y + 30, "Janela", BLACK, 0);
  label(x + 73, y + 30, "Ajuda", BLACK, 0);
  int bx = x + 6, by = y + 50;
  rect(bx, by, w->w - 12, w->h - 57,
       id == MANAGER || id == FILES || id == HELP || id == NOTES ? WHITE
                                                                 : GRAY);
  clip(bx, by, w->w - 12, w->h - 57);
  body(id, w, bx, by);
  unclip();
  if (id == active && menu == id) {
    bevel(x + 5, y + 47, 182, 112, WHITE);
    for (int i = 0; i < 5; i++)
      label(x + 11, y + 51 + 21 * i, items[i], BLACK, 0);
  }
}
EXPORT(draw) void draw(void) {
  rect(0, 0, sw, sh, bg);
  int slot = 0;
  for (int i = 0; i < COUNT; i++)
    if (win[i].shown && win[i].min) {
      icon(i, 10 + slot * 105, sh - 60);
      label(5 + slot * 105, sh - 25, titles[i], WHITE, 1);
      slot++;
    }
  int prev = 0;
  for (;;) {
    int best = -1;
    for (int i = 0; i < COUNT; i++)
      if (win[i].shown && !win[i].min && win[i].z > prev &&
          (best < 0 || win[i].z < win[best].z))
        best = i;
    if (best < 0)
      break;
    draw_window(best);
    prev = win[best].z;
  }
}
EXPORT(init) void init(void) {
  sw = 800;
  sh = 600;
  for (int i = 0; i < PW * PH; i++)
    bitmap[i] = WHITE;
  paint_store(bitmap, PW * PH, 0);
  open_app(MANAGER);
}
EXPORT(resize) void resize(int width, int height) {
  sw = width;
  sh = height;
  for (int i = 0; i < COUNT; i++)
    if (win[i].shown) {
      if (win[i].max) {
        win[i].w = sw;
        win[i].h = sh;
      }
      fit(win + i);
    }
}
static void scroll_manager(int d) {
  Window *w = win + MANAGER;
  offset = clamp(offset + d, 0, imax(0, tile_y(w, MINES) + 118 - w->h));
}
EXPORT(wheel) void wheel(int d) {
  if (active == MANAGER)
    scroll_manager(d);
  else if (active == FILES)
    filepage = imax(0, filepage + (d > 0 ? 1 : -1));
}
static void action(int id, int x, int y, int right) {
  Window *w = win + id;
  if (x < 0 || y < 0)
    return;
  switch (id) {
  case MANAGER:
    for (int i = 1; i < COUNT; i++) {
      int tx = tile_x(w, i), ty = tile_y(w, i) - offset;
      if (x >= tx && x < tx + 110 && y >= ty && y < ty + 54) {
        selected = i;
        open_app(i);
        break;
      }
    }
    break;
  case FILES:
    if (y < 29) {
      if (x < 66)
        filepage = imax(0, filepage - 1);
      else if (x < 140 && filename(filepage + 1, scratch))
        filepage++;
    } else if (y >= 32 && filename(filepage + (y - 32) / 23, scratch) &&
               can_replace()) {
      if (read_file(scratch, doc, sizeof doc) < 0) {
        notify("Documento grande demais para o editor.");
        break;
      }
      copy(docname, scratch, 256);
      existing = 1;
      dirty = 0;
      open_app(NOTES);
    }
    break;
  case CONTROL:
    if (y >= 38 && y < 65 && x >= 10 && x < 282)
      bg = (x - 10) / 34;
    break;
  case NOTES:
    if (y < 29 && x < 72)
      save();
    break;
  case PAINT:
    if (y < 27 && x >= 4 && x < 228)
      ink = (x - 4) / 14;
    else if (y < 27 && x >= 234 && x < 304) {
      if (!paint_store(bitmap, PW * PH, 1))
        notify("Falha ao salvar o desenho.");
    } else if (x >= 4 && x < PW + 4 && y >= 32 && y < PH + 32) {
      lastx = x - 4;
      lasty = y - 32;
      stroke(lastx, lasty);
      gesture = 3;
    }
    break;
  case CALC:
    if (x >= 7 && x < 225 && y >= 41 && (y - 41) % 33 < 24) {
      int k = (x - 7) / 55 + 4 * ((y - 41) / 33);
      if (k < 19)
        calculate(k);
    }
    break;
  case MINES:
    if (y < 28 && x < 83) {
      reset_game();
      break;
    }
    if (x >= 8 && x < 233 && y >= 32 && y < 257 && !ended) {
      int k = (x - 8) / 25 + 9 * ((y - 32) / 25);
      if (right) {
        if (!opened[k])
          flags[k] = !flags[k];
        break;
      }
      if (flags[k])
        break;
      if (!playing) {
        for (int n = 0; n < 10;) {
          int c = random_below(81);
          if (!bombs[c] && c != k) {
            bombs[c] = 1;
            n++;
          }
        }
        playing = 1;
      }
      reveal(k);
    }
    break;
  }
}
EXPORT(pointer) void pointer(int kind, int x, int y, int button_id) {
  if (kind == 0) {
    gesture = 0;
    return;
  }
  if (kind == 2) {
    if (active < 0)
      return;
    Window *w = win + active;
    if (gesture == 1) {
      w->x = x - dx;
      w->y = y - dy;
      fit(w);
    }
    if (gesture == 2) {
      w->w = clamp(x - w->x + 3, 220, sw - w->x);
      w->h = clamp(y - w->y + 3, 130, sh - w->y);
    }
    if (gesture == 3)
      stroke(clamp(x - w->x - 10, 0, PW - 1), clamp(y - w->y - 82, 0, PH - 1));
    return;
  }
  int id = -1;
  for (int i = 0; i < COUNT; i++) {
    Window *w = win + i;
    if (w->shown && !w->min && x >= w->x && x < w->x + w->w && y >= w->y &&
        y < w->y + w->h && (id < 0 || w->z > win[id].z))
      id = i;
  }
  if (id < 0) {
    menu = -1;
    if (y >= sh - 65) {
      int slot = 0;
      for (int i = 0; i < COUNT; i++)
        if (win[i].shown && win[i].min && slot++ == x / 105) {
          open_app(i);
          break;
        }
    }
    return;
  }
  int old = menu;
  open_app(id);
  Window *w = win + id;
  x -= w->x;
  y -= w->y;
  if (old == id && x >= 5 && x < 187 && y >= 47 && y < 159) {
    int item = (y - 47) / 21;
    if (item == 0)
      maximize(w);
    if (item == 1) {
      w->min = 1;
      refocus();
    }
    if (item == 2)
      close_app(id);
    if (item == 3)
      open_app(HELP);
    if (item == 4 && can_replace())
      legacy();
    return;
  }
  if (x > w->w - 15 && y > w->h - 15 && !w->max) {
    gesture = 2;
    return;
  }
  if (y <= 27) {
    if (x < 29)
      menu = old == id ? -1 : id;
    else if (x > w->w - 27)
      maximize(w);
    else if (x > w->w - 50) {
      w->min = 1;
      refocus();
    } else if (!w->max) {
      gesture = 1;
      dx = x;
      dy = y;
    }
    return;
  }
  if (y < 49) {
    if (x < 65)
      menu = old == id ? -1 : id;
    else if (x < 123)
      open_app(HELP);
    return;
  }
  action(id, x - 6, y - 50, button_id == 2);
}
static void type(char *s, int cap, int c) {
  int n = len(s);
  if (c == 8) {
    if (n) {
      do {
        n--;
      } while (n && ((unsigned char)s[n] & 192) == 128);
      s[n] = 0;
    }
    return;
  }
  if (c == 13)
    c = 10;
  if (c < 32 && c != 10)
    return;
  int size = c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  if (n + size >= cap)
    return;
  for (int i = size - 1; i > 0; i--) {
    s[n + i] = 128 + (c & 63);
    c >>= 6;
  }
  s[n] = size == 1 ? c : (size == 2 ? 192 : size == 3 ? 224 : 240) | c;
  s[n + size] = 0;
}
EXPORT(key) void key(int c, int ctrl, int alt) {
  if (alt && c == 4 && active >= 0) {
    close_app(active);
    return;
  }
  if (c == 1) {
    open_app(HELP);
    return;
  }
  if (c == 27) {
    menu = -1;
    return;
  }
  if (ctrl) {
    if (active == NOTES && (c == 's' || c == 'S'))
      save();
    return;
  }
  if (active == MANAGER) {
    if (c == 9) {
      selected = selected % 9 + 1;
      offset = 0;
      if (tile_y(win, selected) + 115 > win[0].h)
        scroll_manager(tile_y(win, selected));
    }
    if (c == 13)
      open_app(selected);
  } else if (active == NOTES) {
    type(doc, sizeof doc, c);
    dirty = 1;
  } else if (active == TERMINAL) {
    if (c == 13)
      execute();
    else
      type(command, sizeof command, c);
  } else if (active == CALC) {
    if (c == 13 || c == '=')
      calculate(18);
    else if (c == 8)
      calculate(1);
    else if (c == '/')
      calculate(3);
    else if (c == '*')
      calculate(7);
    else if (c == '-')
      calculate(11);
    else
      for (int i = 0; i < 19; i++)
        if (keys[i][0] == c)
          calculate(i);
  }
}
