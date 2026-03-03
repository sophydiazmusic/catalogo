import pandas as pd
import os

class LectorLocal:
    def __init__(self, file_path='catalogo_thania.xlsx'):
        self.file_path = file_path

    def leer_datos(self):
        # Buscamos si existe .xlsx o .csv
        archivo_final = self.file_path
        if not os.path.exists(archivo_final):
            # Intentamos con .csv si el default falló
            archivo_csv = self.file_path.replace('.xlsx', '.csv')
            if os.path.exists(archivo_csv):
                archivo_final = archivo_csv
            else:
                raise FileNotFoundError(f"No se encontró catalogo_thania.xlsx ni catalogo_thania.csv")
        
        # Lectura según extensión
        if archivo_final.endswith('.csv'):
            df = pd.read_csv(archivo_final, sep=None, engine='python') # sep=None detecta coma o punto y coma
        else:
            try:
                df = pd.read_excel(archivo_final, sheet_name='Catalogo_visible')
            except Exception:
                df = pd.read_excel(archivo_final)
            
        # Limpiamos nombres de columnas y convertimos todo a string
        df.columns = [str(col).strip() for col in df.columns]
        
        # Mapeo de posibles errores tipográficos y variantes
        mapeo_columnas = {
            'Marca ': 'Marca',
            'Modelo ': 'Modelo',
            'Color ': 'Color',
            'Precop x 6': 'Precio x 6',
            'Precop x 6 Visible': 'Precio x 6 Visible',
            'Foto Url': 'Foto Url',
            'Calidad\n': 'Calidad'
        }
        df = df.rename(columns=mapeo_columnas)
        
        # Opcional: Asegurar que precios sean numéricos limpios (ej. quitar $)
        for col in ['Precio x 12', 'Precio x 6', 'Precio x 1']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace('$', '', regex=False).str.replace('.', '', regex=False).str.replace(',', '.', regex=False).str.strip()
        
        return df.to_dict(orient='records')
