
class Producto {
    constructor(id, nombre, precio, categoria, stock) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.categoria = categoria;
        this.stock = stock;
    }

    vender(cantidad) {
        if (cantidad > 0 && cantidad <= this.stock) {
            this.stock -= cantidad;
            return true;
        }
        return false;
    }

    aplicarDescuento(porcentaje) {
        this.precio = Math.round(this.precio - (this.precio * porcentaje) / 100);
    }

    sumarIva() {
        return Math.round(this.precio * 1.21);
    }
}

const categorias = ["Frenos", "Filtros", "Suspensión", "Motor", "Eléctrico"];

const producto1 = new Producto(1, "Pastillas de freno", 18500, "Frenos", 12);
const producto2 = new Producto(2, "Filtro de aceite", 4200, "Filtros", 30);
const producto3 = new Producto(3, "Amortiguador delantero", 62000, "Suspensión", 6);
const producto4 = new Producto(4, "Bujía", 3800, "Motor", 40);
const producto5 = new Producto(5, "Batería 12V", 95000, "Eléctrico", 5);

const catalogo = [producto1, producto2, producto3, producto4, producto5]; // array de objetos
const carrito = [];
let proximoId = 6;

function pedirTexto(mensaje) {
    let texto = (prompt(mensaje) ?? "").trim();
    while (texto === "") {
        texto = (prompt("Dato inválido. " + mensaje) ?? "").trim();
    }
    return texto;
}

function pedirNumero(mensaje, minimo) {
    let valor = parseFloat(prompt(mensaje));
    while (isNaN(valor) || valor < minimo) {
        valor = parseFloat(prompt("Valor inválido. " + mensaje));
    }
    return valor;
}

function pedirOpcion(mensaje, minimo, maximo) {
    let opcion = parseInt(prompt(mensaje));
    while (isNaN(opcion) || opcion < minimo || opcion > maximo) {
        opcion = parseInt(prompt("Opción inválida.\n" + mensaje));
    }
    return opcion;
}

function pedirCategoria(listaCategorias) {
    let texto = "Elegí la categoría:\n";
    for (const categoria of listaCategorias) {
        texto += (listaCategorias.indexOf(categoria) + 1) + ": " + categoria + "\n";
    }
    const opcion = pedirOpcion(texto, 1, listaCategorias.length);
    return listaCategorias[opcion - 1];
}

function pedirProducto(listaCategorias) {
    const nombre = pedirTexto("Nombre del producto:");
    const precio = pedirNumero("Precio:", 1);
    const categoria = pedirCategoria(listaCategorias);
    const stock = pedirNumero("Stock:", 0);
    return new Producto(proximoId++, nombre, precio, categoria, stock);
}

const obtenerNombres = (lista) => lista.map((p) => p.nombre.toLowerCase());
const buscarPorId = (lista, id) => lista.find((p) => p.id === id);
const filtrarPorPrecioMaximo = (lista, maximo) => lista.filter((p) => p.precio <= maximo);
const topMasCaros = (lista, cantidad) =>
    [...lista].sort((a, b) => b.precio - a.precio).slice(0, cantidad);
const calcularTotal = (items) =>
    items.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);

function buscarIndicePorNombre(lista, nombre) {
    const nombres = obtenerNombres(lista);
    const buscado = nombre.toLowerCase();
    if (!nombres.includes(buscado)) {
        return -1;
    }
    return nombres.indexOf(buscado);
}


function agregarAlFinal(lista, producto) {
    lista.push(producto);
}

function agregarAlPrincipio(lista, producto) {
    lista.unshift(producto);
}

function eliminarUltimo(lista) {
    return lista.pop();
}

function reemplazarPorIndice(lista, indice, productoNuevo) {
    return lista.splice(indice, 1, productoNuevo)[0];
}

function mostrarMensaje(texto) {
    alert(texto);
    console.log(texto);
}

const formatearProducto = (p) =>
    `ID ${p.id} | Producto: ${p.nombre} | $${p.precio} (c/IVA $${p.sumarIva()}) | ${p.categoria} | Stock: ${p.stock}`;

function reporteLista(titulo, lista) {
    if (lista.length === 0) {
        return titulo + "\n(sin productos)";
    }
    let texto = titulo + "\n";
    for (const producto of lista) {
        texto += formatearProducto(producto) + "\n";
    }
    return texto;
}

function reporteCarrito(items) {
    if (items.length === 0) {
        return "El carrito está vacío.";
    }
    let texto = "Carrito:\n";
    for (const item of items) {
        texto += `${item.cantidad} x ${item.nombre} = $${item.precio * item.cantidad}\n`;
    }
    texto += "TOTAL: $" + calcularTotal(items);
    return texto;
}

function verificarObjetos(prod1, prod2, prod3) {
    prod1.vender(2);
    prod2.aplicarDescuento(10);
    console.log("Verificación de objetos:");
    console.log(prod1.nombre + " -> stock: " + prod1.stock);
    console.log(prod2.nombre + " -> precio con 10% off: $" + prod2.precio);
    console.log(prod3.nombre + " -> precio con IVA: $" + prod3.sumarIva());
}


const textoMenu =
    "TIENDA DE REPUESTOS\n" +
    "1: Ver catálogo\n" +
    "2: Buscar producto por nombre\n" +
    "3: Agregar producto al final\n" +
    "4: Agregar oferta destacada al principio\n" +
    "5: Eliminar el último producto\n" +
    "6: Reemplazar producto por posición\n" +
    "7: Filtrar por precio máximo\n" +
    "8: Ver los 3 más caros\n" +
    "9: Comprar (agregar al carrito)\n" +
    "10: Ver carrito y total\n" +
    "11: Aplicar descuento a un producto\n" +
    "0: Salir\n\nElegí una opción:";

function menu(lista, listaCarrito, listaCategorias) {
    let opcion;

    do {
        opcion = pedirOpcion(textoMenu, 0, 11);

        switch (opcion) {
            case 1:
                mostrarMensaje(reporteLista("Catálogo:", lista));
                break;

            case 2: {
                const nombre = pedirTexto("Nombre del producto a buscar:");
                const indice = buscarIndicePorNombre(lista, nombre);
                if (indice === -1) {
                    mostrarMensaje("No existe el producto: " + nombre);
                } else {
                    mostrarMensaje(`Existe, está en la posición ${indice}:\n` + formatearProducto(lista[indice]));
                }
                break;
            }

            case 3:
                agregarAlFinal(lista, pedirProducto(listaCategorias));
                mostrarMensaje("Producto agregado al final.");
                break;

            case 4:
                agregarAlPrincipio(lista, pedirProducto(listaCategorias));
                mostrarMensaje("Oferta destacada agregada al principio.");
                break;

            case 5: {
                const eliminado = eliminarUltimo(lista);
                if (eliminado === undefined) {
                    mostrarMensaje("No hay productos para eliminar.");
                } else {
                    mostrarMensaje("Se ha eliminado el elemento: " + eliminado.nombre);
                }
                break;
            }

            case 6: {
                if (lista.length === 0) {
                    mostrarMensaje("No hay productos para reemplazar.");
                    break;
                }
                mostrarMensaje(reporteLista("Catálogo:", lista));
                const posicion = pedirOpcion("Posición a reemplazar (1 a " + lista.length + "):", 1, lista.length);
                const nuevo = pedirProducto(listaCategorias);
                const reemplazado = reemplazarPorIndice(lista, posicion - 1, nuevo);
                mostrarMensaje(`Se reemplazó "${reemplazado.nombre}" por "${nuevo.nombre}".`);
                break;
            }

            case 7: {
                const maximo = pedirNumero("Precio máximo:", 1);
                mostrarMensaje(reporteLista("Productos hasta $" + maximo + ":", filtrarPorPrecioMaximo(lista, maximo)));
                break;
            }

            case 8:
                mostrarMensaje(reporteLista("Los 3 más caros:", topMasCaros(lista, 3)));
                break;

            case 9: {
                mostrarMensaje(reporteLista("Catálogo:", lista));
                const id = pedirNumero("ID del producto a comprar:", 1);
                const producto = buscarPorId(lista, id);
                if (producto === undefined) {
                    mostrarMensaje("No existe un producto con ID " + id);
                    break;
                }
                const cantidad = pedirNumero("Cantidad:", 1);
                if (producto.vender(cantidad)) {
                    listaCarrito.push({ nombre: producto.nombre, precio: producto.precio, cantidad: cantidad });
                    mostrarMensaje(`Agregaste ${cantidad} x ${producto.nombre} al carrito.`);
                } else {
                    mostrarMensaje("Stock insuficiente. Disponible: " + producto.stock);
                }
                break;
            }

            case 10:
                mostrarMensaje(reporteCarrito(listaCarrito));
                break;

            case 11: {
                const id = pedirNumero("ID del producto:", 1);
                const producto = buscarPorId(lista, id);
                if (producto === undefined) {
                    mostrarMensaje("No existe un producto con ID " + id);
                    break;
                }
                const porcentaje = pedirOpcion("Porcentaje de descuento (1 a 90):", 1, 90);
                producto.aplicarDescuento(porcentaje);
                mostrarMensaje("Nuevo precio: " + formatearProducto(producto));
                break;
            }

            case 0:
                mostrarMensaje("Has salido del simulador.");
                break;
        }
    } while (opcion !== 0);
}

function valoracion(mensaje) {
    let respuesta = parseInt(prompt(mensaje + " (1 = sí / 2 = no)"));
    while (respuesta !== 1) {
        respuesta = parseInt(prompt("Hasta que no digas que sí, no podés salir. (1 = sí)"));
    }
    mostrarMensaje("Gracias por valorar el programa.");
}

function main() {
    verificarObjetos(producto1, producto2, producto3);
    menu(catalogo, carrito, categorias);
    valoracion("¿Te gustó el programa?");
}

main();