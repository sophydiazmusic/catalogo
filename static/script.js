// Configuración de rutas dinámica
const isGitHub = window.location.hostname.includes('github.io');
const isLocalFile = window.location.protocol === 'file:';

// Si es archivo local, intentamos conectar al servidor Flask en localhost:5000
const API_URL = isGitHub ? '' : (isLocalFile ? 'http://localhost:5000' : '');
const DATA_SOURCE = isGitHub ? 'data.json' : '/api/data';

let productosFull = []; // Base de datos local para filtrar rápido

async function cargarCatalogo() {
    const grid = document.getElementById('catalogGrid');
    const downloadBtn = document.getElementById('downloadBtn');

    // Si estamos en local (o file), aseguramos que el link de descarga apunte al servidor
    if (downloadBtn && !isGitHub) {
        downloadBtn.href = `${API_URL}/api/download`;
    }

    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">⏳ Cargando catálogo digital 2026...</p>';

    try {
        const response = await fetch(`${API_URL}${DATA_SOURCE}`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        productosFull = await response.json();

        generarFiltrosDeMarca();
        renderizarProductos(productosFull);

    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color:#ff4444;">📡 Error de conexión. <br><small>Asegurate de que el motor Thania (Flask) esté activo en tu PC.</small></p>`;
    }
}

function generarFiltrosDeMarca() {
    const filterGroup = document.getElementById('brandFilters');
    if (!filterGroup) return;

    const marcas = [...new Set(productosFull.map(p => p.Marca).filter(m => m))];

    filterGroup.innerHTML = '<button class="filter-btn active" onclick="filtrarPorMarca(\'Todos\', this)">Todos</button>';
    marcas.forEach(m => {
        filterGroup.innerHTML += `<button class="filter-btn" onclick="filtrarPorMarca('${m}', this)">${m}</button>`;
    });
}

function renderizarProductos(lista) {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">📭 No se encontraron productos con ese nombre.</p>';
        return;
    }

    lista.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const precioDisplay = p['Precio x 1'] || p['Precio x 1 Visible'] || '0';
        const hasMultiple = p.Fotos && p.Fotos.length > 1;

        let fotosHtml = p.Fotos && p.Fotos.length > 0
            ? `<div class="gallery-container">
                ${hasMultiple ? `<button class="nav-btn prev" onclick="moveGallery(this, -1)">❮</button>` : ''}
                <div class="product-gallery ${hasMultiple ? 'multi' : ''}">
                    ${p.Fotos.map(f => {
                const fullUrl = f.startsWith('/') ? `${API_URL}${f}` : f;
                return `<img src="${fullUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x200?text=Thania'">`;
            }).join('')}
                </div>
                ${hasMultiple ? `<button class="nav-btn next" onclick="moveGallery(this, 1)">❯</button>` : ''}
               </div>`
            : `<img src="https://via.placeholder.com/300x200?text=Thania" class="product-img">`;

        card.innerHTML = `
            ${fotosHtml}
            <div class="product-name">${p.Marca || ''} ${p.Modelo || ''}</div>
            <div class="product-price">$${precioDisplay}</div>
            <div class="product-talle">Talles: ${p['Rango de talles'] || '-'}</div>
            <button class="btn-ws" onclick="compartirWhatsApp('${p.Marca}', '${p.Modelo}', '${p.Calidad}', '${p.Colores ? p.Colores.join(', ') : ''}', '${p['Rango de talles']}', '${precioDisplay}', '${p['Foto Url'] || (p.Fotos && p.Fotos.length > 0 ? p.Fotos[0] : '')}')">
                Compartir WhatsApp
            </button>
        `;
        grid.appendChild(card);
    });
}

function filtrarPorMarca(marca, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (marca === 'Todos') {
        renderizarProductos(productosFull);
    } else {
        const filtrados = productosFull.filter(p => p.Marca === marca);
        renderizarProductos(filtrados);
    }
}

// Buscador en tiempo real
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = productosFull.filter(p =>
        (p.Marca && p.Marca.toLowerCase().includes(busqueda)) ||
        (p.Modelo && p.Modelo.toLowerCase().includes(busqueda))
    );
    renderizarProductos(filtrados);
});

// Nueva función de la Skill Web Dev para el deslizamiento
function moveGallery(btn, direction) {
    const container = btn.parentElement.querySelector('.product-gallery');
    const scrollAmount = container.clientWidth;
    container.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

document.getElementById('refreshBtn').addEventListener('click', async () => {
    if (window.location.hostname.includes('github.io')) {
        alert("⚠️ La sincronización automática solo funciona desde tu computadora (modo local). Para actualizar los datos en la web pública, debés volver a generar el archivo data.json y subirlo a GitHub.");
        return;
    }
    const status = document.getElementById('status');
    status.innerText = "⏳ Sincronizando con Excel y enviando a GitHub...";

    try {
        const response = await fetch(`${API_URL}/api/refresh`, { method: 'POST' });
        const data = await response.json();

        if (data.status === 'success') {
            status.innerText = "✅ " + data.message;
            status.style.color = "#38bdf8";
            cargarCatalogo(); // Recargar el preview
        } else {
            status.innerText = "❌ Error: " + data.message;
        }
    } catch (error) {
        status.innerText = "📡 Error de conexión con el motor de Thania.";
    }
});

function compartirWhatsApp(marca, modelo, calidad, color, talles, precio, fotoUrl) {
    // Usamos escapes Unicode para asegurar compatibilidad total de codificación (UTF-8)
    // 🔥, 🎁, ✅, 📍, 👟, 🚀
    const eFuego = "\uD83D\uDD25";
    const eRegalo = "\uD83C\uDF81";
    const eCheck = "\u2705";
    const ePin = "\uD83D\uDCCD";
    const eShoe = "\uD83D\uDC5F";
    const eRocket = "\uD83D\uDE80";

    // Limpiamos espacios extras y aseguramos mayúsculas
    const m = (marca || '').trim().toUpperCase();
    const mod = (modelo || '').trim().toUpperCase();
    const cal = (calidad || 'TRIPLE A').trim().toUpperCase();
    const tal = (talles || '34-43').trim();

    // Aseguramos URL absoluta. WhatsApp prefiere el link limpio al principio 
    // y solo (sin texto 'Ver producto') para generar la tarjeta de vista previa (card).
    let absoluteFotoUrl = fotoUrl.startsWith('/') ? window.location.origin + fotoUrl : fotoUrl;

    // Si la URL es de Google, removemos el ?.jpg si existiera (limpiamos)
    if (absoluteFotoUrl.includes('googleusercontent.com')) {
        // Limpiamos parámetros previos y agregamos w=800 para forzar imagen directa de calidad
        const baseUrl = absoluteFotoUrl.split('?')[0];
        absoluteFotoUrl = baseUrl + "?w=800";
    }

    const textoMensaje =
        absoluteFotoUrl + "\n\n" +
        eFuego + eRegalo + " *LLEV\u00C1TE SURTIDO* " + eRegalo + eFuego + "\n" +
        "*" + m + " " + mod + "*\n" +
        eFuego + " *" + cal + "* " + eFuego + "\n" +
        eCheck + " Surtido a elecci\u00F3n $" + precio + " c/par\n" +
        ePin + " Talle en " + tal + "\n\n" +
        "#THANIABUSINESS " + eShoe + eRocket;

    const url = "https://wa.me/?text=" + encodeURIComponent(textoMensaje);
    window.open(url, '_blank');
}

// Cargar al inicio
window.onload = cargarCatalogo;
