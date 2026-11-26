# Window 3.11

Desktop gráfico em português escrito em **C e compilado para WebAssembly**. O módulo controla o empilhamento, foco, movimento, minimização e redimensionamento das janelas, desenha os grupos de programas e processa a entrada dos aplicativos. O navegador fornece o Canvas 2D, eventos, relógio e armazenamento local.

## Executar

O binário `desktop.wasm` acompanha o código. Na raiz do projeto, execute `python3 -m http.server 8080` e abra `http://localhost:8080`. Um servidor estático também pode servir a pasta inteira. A página principal precisa de HTTP para carregar o módulo. A execução dispensa dependências remotas.

## Usar

- Clique no ícone do programa. No Gerenciador, Tab seleciona o próximo ícone e Enter o abre. Em telas pequenas use a roda do mouse para percorrer os grupos.
- Arraste a barra de título ou o canto inferior direito da janela. Os botões com triângulos minimizam e maximizam. Clique em um ícone no desktop para restaurar uma janela minimizada.
- O Bloco de Notas aceita digitação, colagem e edição no fim do documento. Ctrl+S salva um TXT. Arquivos abre os textos salvos no mesmo navegador. O editor comporta até 32.767 bytes por documento.
- O Paintbrush oferece desenho à mão livre, paleta de 16 cores e um desenho persistente. O Campo Minado permite marcar casas com o botão direito.
- O prompt reconhece HELP, DIR, VER, CLS, EXIT e nomes de programas. A calculadora aceita mouse e teclado. O Painel de Controle muda a cor do desktop.
- F1 abre a ajuda. Alt+F4 fecha a janela ativa quando o navegador permite esse atalho.
- A implementação anterior permanece acessível por `classic.html`. As duas interfaces compartilham os documentos TXT na mesma origem.

## Recompilar

Com Clang e wasm-ld instalados, execute `make -B`. Alternativamente, use Zig com `make -B CC="zig cc" CFLAGS="-target wasm32-freestanding -Oz -nostdlib -fno-builtin"`.

A lógica está em `src/desktop.c`. O adaptador `host.js` implementa as chamadas do módulo para o navegador. A entrada HTML contém a superfície gráfica e a mensagem de inicialização.

## Escopo e licença

Recriação independente da interface e de um subconjunto dos acessórios do Windows 3.11. O projeto não implementa execução de binários Win16, drivers ou rede do Windows for Workgroups. Código e ícones próprios, sob Apache-2.0.
