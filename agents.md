# agents.md

## Regla obligatoria de entrega

Después de **cualquier cambio**, por pequeño que sea, hay que dejar la versión desplegada:

1. Ejecutar `npm run typecheck`, `npm run test` y `npm run build`.
2. Revisar `git status` y `git diff` para confirmar que solo se incluye el cambio previsto.
3. Hacer un commit atómico con un mensaje claro en español.
4. Hacer push a `main` con `git push origin main`.
5. Comprobar que el workflow **Deploy GitHub Pages** termina en verde y que responde la URL de prueba.

No se acumulan cambios sin commit. No se usa `--force` ni se reescribe el historial.

## URL de prueba en móvil

https://andreulaguarda.github.io/caca-de-vaca/

Cada push a `main` dispara el despliegue automático en GitHub Pages. El juego debe probarse en vertical desde esa URL.
