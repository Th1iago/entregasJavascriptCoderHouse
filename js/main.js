// =====================================================
// TIENDA DE REPUESTOS - Simulador
// Pre-entrega 10: APIs, Peticiones y Librerías
// (fetch + async/await + Toastify + SweetAlert2)
// =====================================================

// ---------- Datos ----------
const IVA = 1.21;
const CLAVE_CATALOGO = "catalogo";
const CLAVE_CARRITO = "carrito";
const URL_DATA = "./data.json";
const URL_DOLAR = "https://dolarapi.com/v1/dolares/oficial";

const categorias = ["Frenos", "Filtros", "Suspensión", "Motor", "Eléctrico"];

// ---------- Estado ----------
let catalogo = [];
let carrito = [];
let filtros = { texto: "", maximo: null };
let soloTop = false;
let idResaltado = null;

// ---------- Elementos del DOM ----------
const $ = (selector) => document.querySelector(selector);

const form = $("#form-producto");
const listaProductos = $("#lista-productos");
const listaCarrito = $("#lista-carrito");
const totalCarrito = $("#total-carrito");
const estado = $("#estado");
const aviso = $("#aviso");

// =====================================================
// FUNCIONES FLECHA (procesos simples, devuelven un valor)
// =====================================================
const sumarIva = (precio) => Math.round(precio * IVA);
const calcularPrecioConDescuento = (precio, porcentaje) =>
    Math.round(precio - (precio * porcentaje) / 100);
const calcularTotal = (items) =>
    items.reduce((acumulado, { precio, cantidad }) => acumulado + precio * cantidad, 0);
const buscarPorId = (lista, id) => lista.find((p) => p.id === id);
const topMasCaros = (lista, cantidad) =>
    [...lista].sort((a, b) => b.precio - a.precio).slice(0, cantidad);
const generarId = (lista) => Math.max(0, ...lista.map((p) => p.id)) + 1;
const formatearPrecio = (valor) => "$" + valor.toLocaleString("es-AR");

// =====================================================
// STORAGE
// =====================================================
function leerStorage(clave, porDefecto) {
    try {
        return JSON.parse(localStorage.getItem(clave) ?? "null") ?? porDefecto;
    } catch (error) {
        return porDefecto; // JSON corrupto: arrancamos con el valor por defecto
    }
}

function guardarStorage(clave, datos) {
    localStorage.setItem(clave, JSON.stringify(datos));
}

const persistir = () => {
    guardarStorage(CLAVE_CATALOGO, catalogo);
    guardarStorage(CLAVE_CARRITO, carrito);
};

// =====================================================
// LIBRERÍAS: Toastify (avisos) y SweetAlert2 (confirmaciones / errores)
// =====================================================
const COLORES_TOAST = {
    ok: "linear-gradient(to right, #16a34a, #22c55e)",
    error: "linear-gradient(to right, #b91c1c, #ef4444)",
    info: "linear-gradient(to right, #1d4ed8, #3b82f6)"
};

// Mantiene la misma firma que antes, pero ahora usa Toastify
function mostrarFeedback(texto, tipo = "ok") {
    Toastify({
        text: texto,
        duration: 3500,
        gravity: "top",
        position: "right",
        close: true,
        stopOnFocus: true,
        style: { background: COLORES_TOAST[tipo] ?? COLORES_TOAST.info }
    }).showToast();
}

// Devuelve true/false según lo que elija el usuario
async function confirmar(titulo, texto, textoBoton) {
    const { isConfirmed } = await Swal.fire({
        title: titulo,
        text: texto,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: textoBoton,
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#b91c1c"
    });
    return isConfirmed;
}

// =====================================================
// ASINCRONISMO: fetch + async/await
// =====================================================

// Pide el catálogo al archivo data.json local
async function obtenerCatalogo() {
    const respuesta = await fetch(URL_DATA);
    if (!respuesta.ok) {
        throw new Error(`Error ${respuesta.status} al pedir ${URL_DATA}`);
    }
    return await respuesta.json();
}

// Muestra / oculta el feedback de carga en pantalla
function mostrarCargando(cargando) {
    listaProductos.setAttribute("aria-busy", String(cargando));
    estado.textContent = cargando ? "⏳ Cargando productos..." : "";
}

// Carga inicial: loading -> datos o error -> render
async function cargarProductos() {
    mostrarCargando(true);
    try {
        const datosApi = await obtenerCatalogo();
        // Si el usuario ya tenía cambios guardados, se respetan; si no, usa data.json
        catalogo = leerStorage(CLAVE_CATALOGO, null) ?? datosApi;
        carrito = leerStorage(CLAVE_CARRITO, []);
        persistir();
        renderTodo();
        mostrarFeedback(`✔️ ${catalogo.length} productos cargados`);
    } catch (error) {
        console.error(error);
        await manejarErrorDeCarga();
    } finally {
        mostrarCargando(false);
    }
}

// Si falla el fetch: avisa con SweetAlert2 y permite reintentar
async function manejarErrorDeCarga() {
    listaProductos.replaceChildren(
        crearElemento("p", "sin-stock", "⚠️ No se pudieron cargar los productos.")
    );

    const { isConfirmed } = await Swal.fire({
        title: "No pudimos cargar los productos",
        text: "Revisá tu conexión o que exista el archivo data.json e intentá de nuevo.",
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "Reintentar",
        cancelButtonText: "Cerrar"
    });
    if (isConfirmed) cargarProductos();
}

// Segunda petición: cotización del dólar desde una API pública (opcional, no rompe nada si falla)
async function cargarCotizacionDolar() {
    try {
        const respuesta = await fetch(URL_DOLAR);
        if (!respuesta.ok) throw new Error("API del dólar no disponible");
        const { venta } = await respuesta.json();
        aviso.textContent = `🔔 Cotización del dólar oficial hoy: ${formatearPrecio(venta)}`;
        aviso.hidden = false;
    } catch (error) {
        console.error(error);
        aviso.hidden = true; // si falla, simplemente no se muestra
    }
}

// =====================================================
// LÓGICA DEL SIMULADOR (entrada -> procesamiento -> salida)
// =====================================================

function leerFormulario(formulario) {
    const { nombre, precio, categoria, stock, destacado } = formulario.elements;
    const datos = {
        nombre: nombre.value.trim(),
        precio: Number(precio.value),
        categoria: categoria.value,
        stock: Number(stock.value)
    };

    if (datos.nombre === "") throw new Error("El nombre no puede estar vacío.");
    if (!(datos.precio > 0)) throw new Error("El precio tiene que ser mayor a 0.");
    if (!Number.isInteger(datos.stock) || datos.stock < 0) {
        throw new Error("El stock tiene que ser un número entero, 0 o más.");
    }
    return { datos, alPrincipio: destacado.checked };
}

function agregarProducto(datos, alPrincipio) {
    const nuevo = { id: generarId(catalogo), ...datos };
    alPrincipio ? catalogo.unshift(nuevo) : catalogo.push(nuevo);
    idResaltado = nuevo.id;
    return nuevo;
}

function eliminarProducto(id) {
    const indice = catalogo.findIndex((p) => p.id === id);
    if (indice === -1) throw new Error("El producto no existe.");
    const [eliminado] = catalogo.splice(indice, 1);
    return eliminado;
}

function eliminarUltimo(lista) {
    if (lista.length === 0) throw new Error("No hay productos para eliminar.");
    return lista.pop();
}

function comprarProducto(id, cantidad) {
    const producto = buscarPorId(catalogo, id);
    if (!producto) throw new Error("El producto no existe.");
    if (!Number.isInteger(cantidad) || cantidad < 1) throw new Error("La cantidad no es válida.");

    const { nombre, precio, stock } = producto;
    if (cantidad > stock) throw new Error(`Stock insuficiente. Disponible: ${stock}`);

    producto.stock -= cantidad;
    const enCarrito = carrito.find((item) => item.id === id);
    enCarrito
        ? (enCarrito.cantidad += cantidad)
        : carrito.push({ id, nombre, precio, cantidad });
    return { nombre, cantidad };
}

function aplicarDescuento(id, porcentaje) {
    const producto = buscarPorId(catalogo, id);
    if (!producto) throw new Error("El producto no existe.");
    if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 90) {
        throw new Error("El descuento tiene que ser un entero entre 1 y 90.");
    }
    producto.precio = calcularPrecioConDescuento(producto.precio, porcentaje);
    return producto;
}

function devolverStock(id, cantidad) {
    const producto = buscarPorId(catalogo, id);
    if (producto) producto.stock += cantidad;
}

function quitarDelCarrito(id) {
    const indice = carrito.findIndex((item) => item.id === id);
    if (indice === -1) throw new Error("El producto no está en el carrito.");
    const [{ nombre, cantidad }] = carrito.splice(indice, 1);
    devolverStock(id, cantidad);
    return nombre;
}

function vaciarCarrito() {
    if (carrito.length === 0) throw new Error("El carrito ya está vacío.");
    carrito.forEach(({ id, cantidad }) => devolverStock(id, cantidad));
    carrito = [];
}

function obtenerVista(lista, { texto, maximo }, mostrarTop) {
    const resultado = lista.filter(
        ({ nombre, precio }) =>
            nombre.toLowerCase().includes(texto.toLowerCase()) && precio <= (maximo ?? Infinity)
    );
    return mostrarTop ? topMasCaros(resultado, 3) : resultado;
}

// =====================================================
// RENDER (salida en pantalla)
// =====================================================
function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function crearTarjeta(producto) {
    const { id, nombre, precio, categoria, stock } = producto;
    const tarjeta = crearElemento("article", "tarjeta");
    tarjeta.dataset.id = id;
    if (id === idResaltado) tarjeta.classList.add("resaltado");

    tarjeta.append(
        crearElemento("h3", "", nombre),
        crearElemento("p", "", `${formatearPrecio(precio)} (c/IVA ${formatearPrecio(sumarIva(precio))})`),
        crearElemento("p", stock > 0 ? "" : "sin-stock", `${categoria} · ${stock > 0 ? "Stock: " + stock : "Sin stock"}`)
    );

    const comprar = crearElemento("div", "acciones");
    const cantidad = crearElemento("input", "cantidad");
    cantidad.type = "number";
    cantidad.min = 1;
    cantidad.value = 1;
    cantidad.setAttribute("aria-label", "Cantidad");
    const btnComprar = crearElemento("button", "", "Comprar");
    btnComprar.dataset.accion = "comprar";
    comprar.append(cantidad, btnComprar);

    const descuento = crearElemento("div", "acciones");
    const porcentaje = crearElemento("input", "porcentaje");
    porcentaje.type = "number";
    porcentaje.min = 1;
    porcentaje.max = 90;
    porcentaje.placeholder = "%";
    porcentaje.setAttribute("aria-label", "Porcentaje de descuento");
    const btnDescuento = crearElemento("button", "secundario", "Descuento");
    btnDescuento.dataset.accion = "descuento";
    descuento.append(porcentaje, btnDescuento);

    const btnEliminar = crearElemento("button", "peligro", "Eliminar");
    btnEliminar.dataset.accion = "eliminar";

    tarjeta.append(comprar, descuento, btnEliminar);
    return tarjeta;
}

function renderCatalogo() {
    const vista = obtenerVista(catalogo, filtros, soloTop);
    listaProductos.replaceChildren(...vista.map(crearTarjeta));
    if (vista.length === 0) {
        listaProductos.append(crearElemento("p", "", "No hay productos para mostrar."));
    }
    idResaltado = null;
    $("#btn-top").textContent = soloTop ? "Ver todos" : "Ver los 3 más caros";
}

function renderCarrito() {
    listaCarrito.replaceChildren();
    if (carrito.length === 0) {
        listaCarrito.append(crearElemento("li", "vacio", "El carrito está vacío."));
    }
    for (const { id, nombre, precio, cantidad } of carrito) {
        const item = crearElemento("li", "", `${cantidad} x ${nombre} = ${formatearPrecio(precio * cantidad)}`);
        const quitar = crearElemento("button", "secundario", "Quitar");
        quitar.dataset.id = id;
        item.append(quitar);
        listaCarrito.append(item);
    }
    totalCarrito.textContent = formatearPrecio(calcularTotal(carrito));
}

function renderTodo() {
    renderCatalogo();
    renderCarrito();
}

function sincronizar() {
    persistir();
    renderTodo();
}

// =====================================================
// EVENTOS
// =====================================================

// Agregar producto (submit del formulario)
form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    try {
        const { datos, alPrincipio } = leerFormulario(form);
        const { nombre } = agregarProducto(datos, alPrincipio);
        sincronizar();
        form.reset();
        mostrarFeedback(`✔️ Agregaste "${nombre}" al catálogo.`);
    } catch (error) {
        mostrarFeedback("⚠️ " + error.message, "error");
    } finally {
        form.elements.nombre.focus();
    }
});

// Acciones de cada tarjeta (delegación de eventos)
listaProductos.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    const tarjeta = boton.closest(".tarjeta");
    const id = Number(tarjeta.dataset.id);
    const { accion } = boton.dataset;
    const cantidadIngresada = Number(tarjeta.querySelector(".cantidad").value);
    const descuentoIngresado = Number(tarjeta.querySelector(".porcentaje").value);

    try {
        if (accion === "eliminar") {
            const producto = buscarPorId(catalogo, id);
            const ok = await confirmar(
                "¿Eliminar producto?",
                `Vas a eliminar "${producto?.nombre}" del catálogo.`,
                "Sí, eliminar"
            );
            if (!ok) return;
            const { nombre } = eliminarProducto(id);
            mostrarFeedback(`🗑️ Se eliminó "${nombre}".`);
        } else if (accion === "comprar") {
            const { nombre, cantidad } = comprarProducto(id, cantidadIngresada);
            mostrarFeedback(`✔️ Agregaste ${cantidad} x ${nombre} al carrito.`);
        } else if (accion === "descuento") {
            const { nombre, precio } = aplicarDescuento(id, descuentoIngresado);
            idResaltado = id;
            mostrarFeedback(`✔️ Nuevo precio de ${nombre}: ${formatearPrecio(precio)}`);
        }
    } catch (error) {
        mostrarFeedback("⚠️ " + error.message, "error");
    } finally {
        sincronizar();
    }
});

// Quitar un ítem del carrito
listaCarrito.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-id]");
    if (!boton) return;
    try {
        const nombre = quitarDelCarrito(Number(boton.dataset.id));
        mostrarFeedback(`🗑️ Quitaste "${nombre}" del carrito.`);
    } catch (error) {
        mostrarFeedback("⚠️ " + error.message, "error");
    } finally {
        sincronizar();
    }
});

$("#btn-vaciar").addEventListener("click", async () => {
    try {
        if (carrito.length > 0) {
            const ok = await confirmar(
                "¿Vaciar carrito?",
                "Se van a quitar todos los productos y se devuelve el stock.",
                "Sí, vaciar"
            );
            if (!ok) return;
        }
        vaciarCarrito();
        mostrarFeedback("🗑️ Carrito vaciado.");
    } catch (error) {
        mostrarFeedback("⚠️ " + error.message, "error");
    } finally {
        sincronizar();
    }
});

$("#btn-eliminar-ultimo").addEventListener("click", async () => {
    try {
        if (catalogo.length > 0) {
            const ok = await confirmar(
                "¿Eliminar el último producto?",
                `Se va a eliminar "${catalogo[catalogo.length - 1].nombre}".`,
                "Sí, eliminar"
            );
            if (!ok) return;
        }
        const { nombre } = eliminarUltimo(catalogo);
        mostrarFeedback(`🗑️ Se eliminó el último producto: "${nombre}".`);
    } catch (error) {
        mostrarFeedback("⚠️ " + error.message, "error");
    } finally {
        sincronizar();
    }
});

// Filtros
$("#buscador").addEventListener("keyup", (evento) => {
    filtros.texto = evento.target.value.trim();
    renderCatalogo();
});

$("#precio-max").addEventListener("input", (evento) => {
    const valor = parseFloat(evento.target.value);
    filtros.maximo = isNaN(valor) ? null : valor;
    renderCatalogo();
});

$("#btn-top").addEventListener("click", () => {
    soloTop = !soloTop;
    renderCatalogo();
});

// =====================================================
// INICIO
// =====================================================
function iniciar() {
    categorias.forEach((categoria) => {
        form.elements.categoria.append(new Option(categoria, categoria));
    });
    cargarProductos();       // fetch a data.json
    cargarCotizacionDolar(); // fetch a API pública
}

iniciar();