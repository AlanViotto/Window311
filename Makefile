CC = clang
CFLAGS = --target=wasm32 -Oz -nostdlib -fno-builtin
desktop.wasm: src/desktop.c
	$(CC) $(CFLAGS) -Wl,--no-entry,--export-memory,--strip-all -o $@ $<
