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
        const hasMultiple = p.Fotos && p.Fotos.length > 0;

        // Priorizamos los links de fotos procesados (lh3) sobre el Foto Url original (drive)
        const principalFoto = (p.Fotos && p.Fotos.length > 0) ? p.Fotos[0] : (p['Foto Url'] || '');

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
            <button class="btn-ws" onclick="compartirWhatsApp('${p.Marca}', '${p.Modelo}', '${p.Calidad}', '${p.Colores ? p.Colores.join(', ') : ''}', '${p['Rango de talles']}', '${precioDisplay}', '${principalFoto}')">
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
    // Definimos los emojis YA codificados para URL (esto evita errores de codificación del navegador)
    const eFuego = '%F0%9F%94%A5'; // 🔥
    const eRegalo = '%F0%9F%8E%81'; // 🎁
    const eCheck = '%E2%9C%85';     // ✅
    const ePin = '%F0%9F%93%8D'; // 📍
    const eShoe = '%F0%9F%91%9F'; // 👟
    const eRocket = '%F0%9F%9A%80'; // 🚀

    let finalUrl = fotoUrl;

    // Failsafe: Conversión de link de Drive a link de imagen directa (lh3)
    if (finalUrl.includes('drive.google.com')) {
        let fileId = "";
        if (finalUrl.includes('/file/d/')) {
            fileId = finalUrl.split('/file/d/')[1].split('/')[0];
        } else if (finalUrl.includes('id=')) {
            fileId = finalUrl.split('id=')[1].split('&')[0];
        }
        if (fileId) {
            finalUrl = "https://lh3.googleusercontent.com/d/" + fileId;
        }
    }

    // Optimización de la URL para que WhatsApp la detecte mejor como imagen
    // Usamos el formato "=s800" que es más estándar para previsualización
    if (finalUrl.includes('googleusercontent.com')) {
        finalUrl = finalUrl.split('?')[0] + "=s800";
    }

    // Aseguramos URL absoluta
    if (finalUrl.startsWith('/')) {
        finalUrl = window.location.origin + finalUrl;
    }

    // Limpieza de campos
    const m = (marca || '').trim().toUpperCase();
    const mod = (modelo || '').trim().toUpperCase();
    const cal = (calidad || 'TRIPLE A').trim().toUpperCase();
    const tal = (talles || '34-43').trim();

    // Construimos el mensaje por partes codificadas para asegurar perfección
    const nl = '%0A'; // Salto de línea codificado
    const space = '%20';

    const textoMensaje =
        encodeURIComponent(finalUrl) + nl + nl +
        eFuego + eRegalo + space + encodeURIComponent("*LLEV\u00C1TE SURTIDO*") + space + eRegalo + eFuego + nl +
        encodeURIComponent("*" + m + " " + mod + "*") + nl +
        eFuego + space + encodeURIComponent("*" + cal + "*") + space + eFuego + nl +
        eCheck + space + encodeURIComponent("Surtido a elecci\u00F3n $" + precio + " c/par") + nl +
        ePin + space + encodeURIComponent("Talle en " + tal) + nl + nl +
        encodeURIComponent("#THANIABUSINESS") + space + eShoe + space + eRocket;

    const url = "https://wa.me/?text=" + textoMensaje;
    window.open(url, '_blank');
}

// Cargar al inicio
window.onload = cargarCatalogo;
