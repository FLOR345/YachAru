// Notificaciones de YachAru con React-Toastify (librería especializada en avisos).
// Misma forma de uso que antes: toast('Título', { description, action, id }), toast.success(...), toast.error(...).
// Aparecen arriba a la derecha, con barra de tiempo, pausa al pasar el mouse y se pueden deslizar para cerrarlas.
import { toast as toastify } from 'react-toastify';

const Content = ({ title, description, action, closeToast }) => (
  <div className="min-w-0 flex-1">
    <p className="font-black leading-snug text-stone-900">{title}</p>
    {description && <p className="mt-0.5 text-sm text-stone-600 leading-snug">{description}</p>}
    {action && (
      <button
        type="button"
        onClick={() => {
          action.onClick?.();
          closeToast?.();
        }}
        className="mt-2 inline-flex items-center rounded-lg bg-stone-900 px-3 py-1 text-sm font-bold text-white hover:bg-stone-700"
      >
        {action.label}
      </button>
    )}
  </div>
);

const show =
  (type) =>
  (title, { description, action, id, duration } = {}) => {
    const options = { type, toastId: id, autoClose: duration ?? (action ? 6000 : 4500) };
    const render = (props) => <Content title={title} description={description} action={action} {...props} />;
    // Si ya hay un aviso con ese id (por ejemplo, "Guardado en favoritos"), se actualiza en vez de apilarse
    if (id && toastify.isActive(id)) {
      toastify.update(id, { ...options, render });
      return id;
    }
    return toastify(render, options);
  };

export const toast = Object.assign(show('default'), {
  success: show('success'),
  error: show('error'),
  info: show('info'),
  warning: show('warning'),
  dismiss: toastify.dismiss,
});
