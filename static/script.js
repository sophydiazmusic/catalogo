const API_URL = '';

let productosFull = []; // Base de datos local para filtrar rápido

async function cargarCatalogo() {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">⏳ Cargando catálogo digital...</p>';

    try {
        const response = await fetch(`${API_URL}/api/data`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        productosFull = await response.json();

        generarFiltrosDeMarca();
        renderizarProductos(productosFull);

    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color:#ff4444;">📡 Error de conexión. Asegurate de que el motor Thania esté activo.</p>`;
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
                    ${p.Fotos.map(f => `<img src="${f}" class="product-img" onerror="this.src='https://via.placeholder.com/300x200?text=Thania'">`).join('')}
                </div>
                ${hasMultiple ? `<button class="nav-btn next" onclick="moveGallery(this, 1)">❯</button>` : ''}
               </div>`
            : `<img src="https://via.placeholder.com/300x200?text=Thania" class="product-img">`;

        card.innerHTML = `
            ${fotosHtml}
            <div class="product-name">${p.Marca || ''} ${p.Modelo || ''}</div>
            <div class="product-price">$${precioDisplay}</div>
            <div class="product-talle">Talles: ${p['Rango de talles'] || '-'}</div>
            <button class="btn-ws" onclick="compartirWhatsApp('${p.Marca}', '${p.Modelo}', '${p.Calidad}', '${p.Colores ? p.Colores.join(', ') : ''}', '${p['Rango de talles']}', '${precioDisplay}')">
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
    const status = document.getElementById('status');
    status.innerText = "⏳ Sincronizando con tu archivo...";

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

function compartirWhatsApp(marca, modelo, calidad, color, talles, precio) {
    // Usamos el formato exacto solicitado por el usuario
    const textoMensaje = `🔥🎁LLEVÁTE SURTIDO🎁🔥
${marca.toUpperCase()} ${modelo.toUpperCase()}
🔥${(calidad || 'TRIPLE A').toUpperCase()}🔥
✅Surtido a elección $${precio} c/par
📍Talle en ${talles}

#THANIABUSINESS 🇧🇷🇦🇷`;

    const url = `https://wa.me/?text=${encodeURIComponent(textoMensaje)}`;
    window.open(url, '_blank');
}

// Cargar al inicio
window.onload = cargarCatalogo;
