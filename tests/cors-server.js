/* Serveur de test CORS (tests C04–C06) : à lancer en local, jamais publié.
 *   node tests/cors-server.js [port]
 *   /ok.jpg        image JPEG avec « Access-Control-Allow-Origin: * » (récupérable)
 *   /ok.png        PNG transparent avec CORS
 *   /blocked.jpg   image SANS en-tête CORS (affichable, non récupérable)
 *   /page.html     page HTML (pas une image)
 *   /fake.jpg      texte déguisé en .jpg avec CORS (contenu non image)
 *   autre chemin   404 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const port = Number(process.argv[2] || 8766);
const root = path.resolve(__dirname, '..');
const jpg = fs.readFileSync(path.join(root, 'assets/sri-lanka.jpg'));
// PNG 60×40 : disque violet sur fond transparent.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADwAAAAoCAYAAACiu5n/AAAAq0lEQVR42u2Z0RGAMAxCG4bSfRzMfXQpXSGtbRoqfHsXnnwVSpEkiVkWceTYrsf77XnvRgdcAxj9Aywr6Chwyw7aG9xYQHuBgxH2y30wwn7xAVbYVj9ghm3xBXbYWn8oPxNWSLfGpxJmTdfrVwkLWMACFjA18OiOKfqdrISZU/b4VMKsKXv9YWZHPKPQw+xiPLq9RIY1ILKqRZYJJOq+lgdtS1oPufdhSVpML1HQXDofjmKdAAAAAElFTkSuQmCC', 'base64');
http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/ok.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' }); return res.end(jpg); }
  if (u === '/ok.png') { res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' }); return res.end(png); }
  if (u === '/blocked.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(jpg); }
  if (u === '/page.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); return res.end('<!doctype html><title>Page</title><p>Ceci est une page, pas une image.</p>'); }
  if (u === '/fake.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' }); return res.end('pas une image'); }
  res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end('introuvable');
}).listen(port, '127.0.0.1', () => console.log('Serveur CORS de test : http://127.0.0.1:' + port));
