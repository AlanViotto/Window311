<?php
declare(strict_types=1);

namespace Windows;

/** @author Alan Viotto | Viotto & Co. */
final class Desktop
{
    public const AUTHOR = 'Alan Viotto | Viotto & Co.';

    public static function render(bool $classic = false, bool $static = false): void
    {
        $style = $classic ? 'classic' : 'screen';
        $script = $classic ? 'classic' : 'host';
        ?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="<?= htmlspecialchars(self::AUTHOR, ENT_QUOTES, 'UTF-8') ?>">
  <title>Window 3.11</title>
  <link rel="stylesheet" href="dist/css/<?= $style ?>.css">
  <script defer src="dist/js/<?= $script ?>.js"></script>
</head>
<body data-classic="classic.<?= $static ? 'html' : 'php' ?>">
<?php if ($classic): ?>
  <main id="desktop" aria-label="Área de trabalho"></main>
  <div id="minimized"></div>
<?php else: ?>
  <canvas id="screen" tabindex="0" aria-label="Window 3.11. Tab alterna programas. Enter abre o programa selecionado. F1 abre a Ajuda."></canvas>
  <output id="message" hidden>Inicializando Window 3.11…</output>
<?php endif; ?>
</body>
</html>
<?php
    }
}
