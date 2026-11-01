# Modelo del cuerpo

`cuerpo-v1.glb` procede de `base_basic_shaded.glb`, entregado por el usuario
en `401ed0eb-9694-4ff9-835c-242fa309f4bb.zip`.

Versión para web preparada en Blender: 126.262 triángulos (30 % de la malla
original), con la textura original convertida a JPEG de calidad 88. Conserva
los colores y las proporciones del personaje. Pesa aproximadamente 5,3 MB.

Los puntos interactivos se calibran en `src/components/bodyScene.js`.
El archivo y el motor de Three.js se solicitan únicamente al abrir la actividad
del cuerpo. No se descargan en la página de inicio.
