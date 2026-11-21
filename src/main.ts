import './styles.css';
import { Game } from './game/Game';

function showFallback(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.remove('hidden', 'done');
  const loader = boot.querySelector('.boot-loader');
  if (loader) loader.remove();
  const text = boot.querySelector('p');
  if (text) {
    text.textContent = 'Este dispositivo no ha podido abrir el prado 3D. Prueba con otro navegador.';
  }
}

try {
  const canvas = document.getElementById('scene');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas no disponible');
  }
  const game = new Game(canvas);
  game.start();
} catch (error) {
  console.error(error);
  showFallback();
}

document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (event) => event.preventDefault());
