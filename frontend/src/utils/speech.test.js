import { describe, it, expect, vi, beforeEach } from 'vitest';
import vectors from '../../../tools/tts/audio_key_vectors.json';
import { audioKey, audioSource, speak } from './speech';

const GRABADA = 'https://res.cloudinary.com/dcuvavycy/video/upload/v1766339224/allillanchu_n5wnjx.ogg';
const MMS = 'https://res.cloudinary.com/dcuvavycy/video/upload/v1/simiaru/audio/quechua/abc.mp3';

describe('clave del audio', () => {
  it('coincide con la del proceso en Python', () => {
    for (const [text, key] of vectors) expect(audioKey(text)).toBe(key);
  });
});

describe('origen del audio', () => {
  it('una grabación nunca se presenta como voz sintética', () => {
    expect(audioSource(GRABADA)).toBe('grabado');
    expect(audioSource(MMS)).toBe('mms');
    expect(audioSource(null)).toBe('navegador');
  });
});

describe('speak', () => {
  let played;
  let browser;

  beforeEach(() => {
    played = [];
    browser = [];
    vi.stubGlobal('Audio', class {
      canPlayType() { return 'maybe'; }
      play() { played.push(this.src); return Promise.resolve(); }
    });
    vi.stubGlobal('window', { speechSynthesis: { cancel() {}, speak: (u) => browser.push(u.text) } });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  });

  it('una grabación va primero y no consulta el índice', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await speak('Allillanchu', { url: GRABADA, idioma: 'quechua' });
    expect(played).toEqual([GRABADA]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('busca en el índice de la lengua y usa el navegador solo si no hay audio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audios: { 'iskay chunka': [MMS, 'mms'] } }) }));
    await speak('Iskay chunka.', { idioma: 'quechua' });
    expect(played).toEqual([MMS]);
    await speak('Otra frase', { idioma: 'quechua' });
    expect(browser).toEqual(['Otra frase']);
  });

  it('pide al índice la voz de mujer, que reemplaza a otra voz MMS de la palabra', async () => {
    const MUJER = MMS.replace('abc', 'abc-mujer');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audios: { wasi: [MUJER, 'mms'] } }) });
    vi.stubGlobal('fetch', fetchMock);
    await speak('Wasi', { url: MMS, idioma: 'aymara' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/audios\/aymara\?voz=mujer$/);
    expect(played).toEqual([MUJER]);
  });
});
