from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from lector_local import LectorLocal
from generador_pdf import GeneradorPDF
import os
import requests
import pandas as pd
from io import BytesIO

app = Flask(__name__)
CORS(app)

def descargar_imagen(url, index):
    if not url or not str(url).startswith('http'):
        return None
    
    # Conversión de Google Drive (de view a download)
    if 'drive.google.com' in url:
        if '/file/d/' in url:
            file_id = url.split('/file/d/')[1].split('/')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        elif 'id=' in url:
            file_id = url.split('id=')[1].split('&')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            temp_path = f"temp_img_{index}.jpg"
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            return temp_path
    except Exception as e:
        print(f"Error descargando imagen {url}: {e}")
    return None

@app.route('/api/refresh', methods=['POST'])
def refresh_catalog():
    try:
        # 1. Leer datos del Excel local
        lector = LectorLocal('catalogo_thania.xlsx')
        datos = lector.leer_datos()
        
        # 2. Generar el PDF
        pdf = GeneradorPDF()
        pdf.crear_portada()
        
        imagenes_temp = []
        for i, producto in enumerate(datos):
            # Descargar imagen si hay URL
            url_foto = producto.get('Foto Url') or producto.get('Foto')
            if url_foto:
                path_local = descargar_imagen(url_foto, i)
                if path_local:
                    producto['Imagen Local'] = path_local
                    imagenes_temp.append(path_local)
                
            pdf.agregar_producto(producto)
        
        output_path = "catalogo_thania.pdf"
        pdf.output(output_path)
        
        # 3. Limpiar imágenes temporales
        for img in imagenes_temp:
            if os.path.exists(img):
                try:
                    os.remove(img)
                except:
                    pass
        
        return jsonify({
            "status": "success", 
            "message": f"Catálogo generado con {len(datos)} productos."
        })
    except FileNotFoundError as e:
        return jsonify({"status": "error", "message": f"Archivo no encontrado: {str(e)}"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error: {str(e)}"}), 500

@app.route('/api/download', methods=['GET'])
def download_catalog():
    path_to_pdf = "catalogo_thania.pdf"
    if os.path.exists(path_to_pdf):
        return send_file(path_to_pdf, as_attachment=True)
    else:
        return jsonify({"status": "error", "message": "El archivo no existe. Generalo primero."}), 404

@app.route('/api/proxy_image', methods=['GET'])
def proxy_image():
    url = request.args.get('url')
    if not url:
        return "URL missing", 400
    
    # Conversión de Drive (repetimos lógica por seguridad)
    if 'drive.google.com' in url:
        if '/file/d/' in url:
            file_id = url.split('/file/d/')[1].split('/')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        elif 'id=' in url:
            file_id = url.split('id=')[1].split('&')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"

    try:
        # User-Agent para evitar que Drive bloquee la petición del proxy
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=15, stream=True)
        
        # Leemos el contenido para poder enviarlo
        contenido = resp.content
        
        return send_file(
            BytesIO(contenido),
            mimetype=resp.headers.get('Content-Type', 'image/jpeg')
        )
    except Exception as e:
        print(f"Error en proxy: {e}")
        return str(e), 500

import urllib.parse

@app.route('/api/data', methods=['GET'])
def get_catalog_data():
    try:
        lector = LectorLocal('catalogo_thania.xlsx')
        datos = lector.leer_datos()
        
        agrupados = {}
        
        for p in datos:
            # Reemplazar NaN
            for key, value in p.items():
                if pd.isna(value): p[key] = None

            # Clave única por Marca y Modelo
            key = f"{p.get('Marca')}_{p.get('Modelo')}".strip().lower()
            
            url_original = p.get('Foto Url') or p.get('Foto')
            foto_preview = None
            if url_original and str(url_original).startswith('http'):
                url_encoded = urllib.parse.quote(str(url_original), safe='')
                foto_preview = f"/api/proxy_image?url={url_encoded}"

            if key not in agrupados:
                p['Fotos'] = [foto_preview] if foto_preview else []
                p['Colores'] = [p.get('Color')] if p.get('Color') else []
                agrupados[key] = p
            else:
                if foto_preview and foto_preview not in agrupados[key]['Fotos']:
                    agrupados[key]['Fotos'].append(foto_preview)
                if p.get('Color') and p.get('Color') not in agrupados[key]['Colores']:
                    agrupados[key]['Colores'].append(p.get('Color'))
        
        return jsonify(list(agrupados.values()))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/')
def index():
    return send_file('static/index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_file(f'static/{path}')

if __name__ == '__main__':
    print("Iniciando servidor Thania en http://localhost:5000")
    app.run(debug=True, port=5000)
