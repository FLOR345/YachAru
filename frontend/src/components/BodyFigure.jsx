// El motor 3D se descarga al abrir esta actividad, separado del inicio.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Loader2, RotateCw, RotateCcw, ZoomIn, ZoomOut, Scan, RefreshCw } from 'lucide-react';
import './BodyFigure.css';

const BodyFigure = forwardRef(({ parts, vista = 'frente', onFlip, active, flash, onPick, onReady, label, color = '#15803d', showDots = true, placed, className = '', hint }, ref) => {
  const host = useRef(null);
  const scene = useRef(null);
  const markers = useRef(new Map());
  const latest = useRef({ vista, onFlip, onReady });
  latest.current = { vista, onFlip, onReady };
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [side, setSide] = useState(vista);

  useImperativeHandle(ref, () => ({
    getPartScreenPosition: (id) => scene.current?.getPartScreenPosition(id),
    isReady: () => !!scene.current?.ready,
  }), []);

  useEffect(() => {
    let cancelled = false;
    let viewer;
    setStatus('loading');
    latest.current.onReady?.(false);
    import('./bodyScene').then(({ createBodyScene }) => {
      if (cancelled) return;
      viewer = createBodyScene(host.current, {
        markers: markers.current,
        vista: latest.current.vista,
        onLoad: () => { if (!cancelled) { setStatus('ready'); latest.current.onReady?.(true); } },
        onError: () => { if (!cancelled) { setStatus('error'); latest.current.onReady?.(false); } },
        onSideChange: (next) => {
          if (cancelled) return;
          setSide(next);
          if (latest.current.vista !== next) latest.current.onFlip?.(next);
        },
      });
      scene.current = viewer;
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => {
      cancelled = true;
      viewer?.dispose();
      scene.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    if (scene.current?.side !== vista) scene.current?.setView(vista);
    setSide(vista);
  }, [vista, status]);

  useEffect(() => { scene.current?.render(); }, [parts, active, flash, placed, label, status]);
  useEffect(() => { scene.current?.trackActive(active); }, [active, status]);

  const turn = () => {
    const next = side === 'frente' ? 'espalda' : 'frente';
    scene.current?.setView(next);
    setSide(next);
    onFlip?.(next);
  };
  const keyControl = (event) => {
    const actions = {
      ArrowLeft: () => scene.current?.rotate(-0.2),
      ArrowRight: () => scene.current?.rotate(0.2),
      '+': () => scene.current?.zoom(0.85),
      '=': () => scene.current?.zoom(0.85),
      '-': () => scene.current?.zoom(1.18),
      Home: () => scene.current?.setView(vista),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  };

  return (
    <div className={`body-viewer ${className}`} style={{ '--body-color': color }}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-stone-500">
        <span className="flex items-center gap-1.5"><Box className="h-4 w-4" aria-hidden="true" /> Explora en 3D</span>
        <span>{side === 'frente' ? 'De frente' : 'De espalda'}</span>
      </div>
      <div className="body-viewer-stage" aria-busy={status === 'loading'}>
        <div ref={host} className="body-viewer-canvas" role="group" aria-label="Cuerpo humano en 3D. Arrastra para girar; usa dos dedos para acercar. Con teclado: flechas para girar, más y menos para zoom, Inicio para restablecer." tabIndex={status === 'ready' ? 0 : -1} onKeyDown={keyControl} />
        {parts.map((p) => {
          const selected = active === p.id;
          const feedback = flash?.id === p.id ? (flash.ok ? 'correct' : 'wrong') : '';
          const text = placed?.[p.id] || (selected && label ? label(p) : null);
          return (
            <button key={p.id} ref={(el) => el ? markers.current.set(p.id, el) : markers.current.delete(p.id)} type="button" data-part={p.id}
              className={`body-hotspot ${selected ? 'is-active' : ''} ${feedback} ${placed?.[p.id] ? 'is-placed' : ''}`}
              style={{ visibility: 'hidden' }} aria-label={label ? label(p) : p.es} aria-pressed={selected}
              disabled={status !== 'ready' || !!placed?.[p.id]} onClick={() => onPick?.(p)} hidden={!showDots && !text}>
              <span className="body-hotspot-dot" />
              {text && <span className="body-hotspot-label">{text}</span>}
            </button>
          );
        })}
        {status !== 'ready' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-3xl bg-stone-50/95 px-5 text-center" role="status">
            {status === 'loading' ? <><Loader2 className="h-8 w-8 animate-spin text-green-700" aria-hidden="true" /><p className="font-bold text-stone-700">Preparando tu modelo 3D…</p><p className="text-sm text-stone-500">La primera vez puede tardar unos segundos.</p></> : <><Box className="h-8 w-8 text-stone-400" aria-hidden="true" /><p className="font-bold text-stone-700">No se pudo abrir el modelo 3D.</p><p className="text-sm text-stone-500">Comprueba tu conexión y que tu navegador admita WebGL.</p><button type="button" className="toque flex min-h-11 items-center gap-2 rounded-full bg-white px-4 font-bold ring-1 ring-stone-300" onClick={() => setAttempt((n) => n + 1)}><RefreshCw className="h-4 w-4" /> Volver a intentar</button></>}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label="Controles del modelo 3D">
        <button type="button" className="body-control" title="Girar a la izquierda" aria-label="Girar a la izquierda" disabled={status !== 'ready'} onClick={() => scene.current?.rotate(-Math.PI / 6)}><RotateCcw aria-hidden="true" /></button>
        <button type="button" className="body-control" title="Alejar" aria-label="Alejar" disabled={status !== 'ready'} onClick={() => scene.current?.zoom(1.18)}><ZoomOut aria-hidden="true" /></button>
        <button type="button" className="body-control" title="Acercar" aria-label="Acercar" disabled={status !== 'ready'} onClick={() => scene.current?.zoom(0.85)}><ZoomIn aria-hidden="true" /></button>
        <button type="button" className="body-control" title="Restablecer vista" aria-label="Restablecer vista" disabled={status !== 'ready'} onClick={() => scene.current?.setView(vista)}><Scan aria-hidden="true" /></button>
        <button type="button" className={`body-control ${hint ? 'needs-turn' : ''}`} title="Ver el otro lado" aria-label="Ver el otro lado" disabled={status !== 'ready'} onClick={turn}><RotateCw aria-hidden="true" /></button>
      </div>
      {active && <button type="button" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-40" disabled={status !== 'ready'} onClick={() => scene.current?.focusPart(active)}><ZoomIn className="h-4 w-4" aria-hidden="true" /> Ver detalle de esta parte</button>}
      <p className="mt-3 text-center text-xs font-semibold text-stone-500">Arrastra para girar · Pellizca para acercar · Toca los puntos</p>
    </div>
  );
});
BodyFigure.displayName = 'BodyFigure';
export default BodyFigure;
