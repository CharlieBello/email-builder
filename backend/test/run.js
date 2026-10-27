import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { compile } from '../src/compiler/index.js';
import { defaultTheme } from '../src/theme.js';

const input = JSON.parse(readFileSync(new URL('./example.json', import.meta.url)));
const { html, warnings } = await compile(input);
writeFileSync(new URL('./output.html', import.meta.url), html);

// Variables: la clave es el nombre real de la cadena de Marketing Cloud
assert.ok(html.includes('%%Primer nombre%%'), 'falta %%Primer nombre%%');
assert.ok(html.includes('%%member_busname%%'), 'falta %%member_busname%%');
assert.ok(html.includes('%%plan%%'), 'falta campo propio %%plan%%');
assert.ok(html.includes('%%unsub_center_url%%'), 'falta %%unsub_center_url%%');
assert.ok(!html.includes('{{'), 'quedaron variables sin traducir');
// {{plan}} no está en el catálogo: debe avisar, pero solo de esa
assert.equal(warnings.length, 1);
assert.match(warnings[0], /plan/);
const txt = (content) => compile({ blocks: [{ type: 'text', props: { content } }] });
// Espacios dentro de las llaves y nombres con espacios/tildes
const sp = await txt('Hola {{  Primer nombre  }} y {{ _subscriberkey }}');
assert.ok(sp.html.includes('%%Primer nombre%%') && sp.html.includes('%%_subscriberkey%%'));
assert.equal(sp.warnings.length, 0);
// Mayúsculas: advierte y sugiere, pero no altera el nombre
const mayus = await txt('Hola {{primer nombre}}');
assert.ok(mayus.html.includes('%%primer nombre%%'));
assert.match(mayus.warnings[0], /distinguen mayúsculas.*Primer nombre/);
// Espacio alrededor de la cadena
assert.match((await txt('Hola{{Primer nombre}}')).warnings[0], /espacio/);
assert.equal((await txt('Hola, {{Primer nombre}}!')).warnings.length, 0);
// Datos personales en enlaces: advertencia (no bloquea)
const pii = await compile({ blocks: [{ type: 'button', props: { label: 'Ir', url: 'https://x.com/?e={{Email Address}}' } }] });
assert.ok(pii.html.includes('%%Email Address%%'));
assert.match(pii.warnings[0], /dato personal dentro de un enlace/);
const sk = await txt('{{_subscriberkey}} {{emailaddr}}');
assert.ok(sk.html.includes('%%_subscriberkey%%') && sk.html.includes('%%emailaddr%%'));
assert.equal(sk.warnings.length, 0, 'variables del catálogo no deben dar advertencia');
// Marcadores: tracking y header sí; footer NO por defecto (Marketing Cloud ya lo agrega)
assert.ok(html.includes('<custom type="header" />'), 'falta header');
assert.ok(html.includes('name="opencounter"'), 'falta tracking');
assert.ok(!html.includes('<custom type="footer"'), 'el footer no debe insertarse por defecto');
const conFooter = await compile(input, { ...defaultTheme, useDefaultFooter: true });
assert.ok(conFooter.html.includes('<custom type="footer" />'), 'la bandera del footer no funciona');
const sinMarcadores = await compile(input, { ...defaultTheme, useDefaultHeader: false, useTracking: false });
assert.ok(!sinMarcadores.html.includes('<custom'), 'quedaron marcadores con todo desactivado');
// HTML del usuario escapado
assert.ok(!html.includes('<a href="x">'), 'HTML del usuario sin escapar');
// Modo oscuro y enlaces de imagen
assert.ok(html.includes('prefers-color-scheme: dark'), 'falta modo oscuro');
assert.ok(html.includes('conversion="true"'), 'falta atributo de conversión');
// Ampersand escapado en URL
assert.ok(html.includes('a=1&amp;b=2'), 'URL sin escapar');

// Errores de entrada
await assert.rejects(() => compile({ blocks: [{ type: 'nope' }] }), /tipo desconocido/);
await assert.rejects(() => compile({ blocks: [] }), /al menos un bloque/);
await assert.rejects(
  () => compile({ blocks: [{ type: 'button', props: { label: 'x', url: 'javascript:alert(1)' } }] }),
  /URL no permitida/
);

// Validación de dominio de imágenes
process.env.IMAGE_HOSTS = 'img.ejemplo.com, cdn.ejemplo.com';
const img = (src) => compile({ blocks: [{ type: 'image', props: { src } }] });
await img('https://img.ejemplo.com/a.jpg');
await img('https://CDN.ejemplo.com/a.jpg');
await assert.rejects(() => img('https://otro.com/a.jpg'), /alojada en/);
await assert.rejects(() => img('https://img.ejemplo.com.malo.com/a.jpg'), /alojada en/);
await assert.rejects(() => img('http://img.ejemplo.com/a.jpg'), /https/);
await assert.rejects(() => img('texto-suelto'), /no válida/);
delete process.env.IMAGE_HOSTS;
await img('https://cualquiera.com/a.jpg'); // sin lista, se acepta cualquier https

console.log('OK - todas las pruebas pasaron.');
console.log('HTML generado en test/output.html');
