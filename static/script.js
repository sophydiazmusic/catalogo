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

        // Soporte para búsqueda por URL (viniendo de una landing page)
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = searchParam;
            const filtrados = productosFull.filter(p =>
                (p.Marca && p.Marca.toLowerCase().includes(searchParam.toLowerCase())) ||
                (p.Modelo && p.Modelo.toLowerCase().includes(searchParam.toLowerCase()))
            );
            renderizarProductos(filtrados);
        } else {
            renderizarProductos(productosFull);
        }

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
        const hasMultiple = p.Fotos && p.Fotos.length > 0;

        const codigo = p.Codigo || p.ID || (idx + 1);

        let fotosHtml = hasMultiple
            ? `<div class="gallery-container">
                ${p.Fotos.length > 1 ? `<button class="nav-btn prev" onclick="moveGallery(this, -1)">❮</button>` : ''}
                <div class="product-gallery ${p.Fotos.length > 1 ? 'multi' : ''}">
                    ${p.Fotos.map(f => {
                const fullUrl = f.startsWith('/') ? `${API_URL}${f}` : f;
                return `<img src="${fullUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x200?text=Thania'">`;
            }).join('')}
                </div>
                ${p.Fotos.length > 1 ? `<button class="nav-btn next" onclick="moveGallery(this, 1)">❯</button>` : ''}
               </div>`
            : `<img src="https://via.placeholder.com/300x200?text=Thania" class="product-img">`;

        card.innerHTML = `
            ${fotosHtml}
            <div class="product-name">${p.Marca || ''} ${p.Modelo || ''}</div>
            <div class="product-price">$${precioDisplay}</div>
            <div class="product-talle">Talles: ${p['Rango de talles'] || '-'}</div>
            <button class="btn-ws" onclick="compartirWhatsApp('${p.Marca}', '${p.Modelo}', '${p.Calidad}', '${p.Colores ? p.Colores.join(', ') : ''}', '${p['Rango de talles']}', '${precioDisplay}', '${codigo}')">
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

// Deslizamiento de galería
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
    status.innerText = "⏳ Sincronizando con Excel y generando catálogo Pro...";

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

function compartirWhatsApp(marca, modelo, calidad, color, talles, precio, codigo) {
    // Emojis literales (soportados por charset="UTF-8")
    const eFuego = "🔥";
    const eRegalo = "🎁";
    const eCheck = "✅";
    const ePin = "📍";
    const eShoe = "👟";
    const eRocket = "🚀";

    // Link a la Landing Page del producto (para que WhatsApp muestre la tarjeta con foto)
    let baseUrl = window.location.href.split('?')[0].split('#')[0];
    if (baseUrl.endsWith('index.html')) baseUrl = baseUrl.replace('index.html', '');
    if (!baseUrl.endsWith('/')) baseUrl += '/';

    const landingUrl = baseUrl + "p/" + codigo + ".html";

    const m = (marca || '').trim().toUpperCase();
    const mod = (modelo || '').trim().toUpperCase();
    const cal = (calidad || 'TRIPLE A').trim().toUpperCase();
    const tal = (talles || '34-43').trim();

    const textoMensaje =
        landingUrl + "\n\n" +
        eFuego + eRegalo + " *LLEV\u00C1TE SURTIDO* " + eRegalo + eFuego + "\n" +
        "*" + m + " " + mod + "*\n" +
        eFuego + " *" + cal + "* " + eFuego + "\n" +
        eCheck + " Surtido a elecci\u00F3n $" + precio + " c/par\n" +
        ePin + " Talle en " + tal + "\n\n" +
        "#THANIABUSINESS " + eShoe + " " + eRocket;

    // DETECCIÓN DE MÓVIL VS DESKTOP
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // En escritorio (WhatsApp Web), 'web.whatsapp.com/send' es mucho más confiable que 'wa.me'
    const waBase = isMobile ? "https://wa.me/?text=" : "https://web.whatsapp.com/send?text=";

    const url = waBase + encodeURIComponent(textoMensaje);
    window.open(url, '_blank');
}

// Cargar al inicio
window.onload = cargarCatalogo;
