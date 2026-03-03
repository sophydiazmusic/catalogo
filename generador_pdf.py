from fpdf import FPDF
import os

class GeneradorPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)
        # Colores de marca
        self.negro = (26, 26, 26)
        self.oro = (212, 175, 55)
        self.gris_suave = (245, 245, 245)

    def header(self):
        if self.page_no() > 1:
            self.set_font('helvetica', 'B', 10)
            self.set_text_color(*self.negro)
            self.cell(0, 10, 'THANIA - COLECCIÓN 2026', 0, 1, 'R')
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Página {self.page_no()}', 0, 0, 'C')

    def crear_portada(self):
        self.add_page()
        # Fondo minimalista o detalles decorativos
        self.set_fill_color(*self.gris_suave)
        self.rect(0, 0, 210, 297, 'F')
        
        self.set_y(100)
        self.set_font('helvetica', 'B', 40)
        self.set_text_color(*self.negro)
        self.cell(0, 20, 'THANIA', 0, 1, 'C')
        
        self.set_font('helvetica', '', 18)
        self.set_draw_color(*self.oro)
        self.line(70, 125, 140, 125)
        
        self.ln(10)
        self.cell(0, 10, 'CATÁLOGO OFICIAL 2026', 0, 1, 'C')
        self.set_font('helvetica', 'I', 12)
        self.cell(0, 10, 'CALIDAD Y ESTILO EN CADA PASO', 0, 1, 'C')

    def agregar_producto(self, p):
        self.add_page()
        
        # Título del producto
        self.set_font('helvetica', 'B', 22)
        self.set_text_color(*self.negro)
        self.cell(0, 15, f"{p.get('Marca', '')} - {p.get('Modelo', '')}", 0, 1, 'L')
        
        # Línea decorativa
        self.set_draw_color(*self.oro)
        self.set_line_width(1)
        self.line(10, 25, 60, 25)
        self.ln(10)

        # Espacio para Imagen (Placeholder o real si existe el path)
        y_inicial = self.get_y()
        self.set_fill_color(250, 250, 250)
        self.rect(10, y_inicial, 190, 120, 'F')
        
        # Intentar cargar imagen si el campo existe y es un path válido
        img_path = p.get('Imagen Local', '') # El usuario deberá mapear las imágenes
        if img_path and os.path.exists(img_path):
            self.image(img_path, x=10, y=y_inicial, w=190, h=120)
        else:
            self.set_xy(10, y_inicial + 50)
            self.set_font('helvetica', 'I', 10)
            self.set_text_color(150, 150, 150)
            self.cell(190, 10, '[ Imagen del Producto ]', 0, 1, 'C')

        self.set_y(y_inicial + 130)
        
        # Detalles: Color y Talles
        self.set_font('helvetica', 'B', 12)
        self.set_text_color(*self.negro)
        self.cell(40, 10, 'COLOR:', 0, 0)
        self.set_font('helvetica', '', 12)
        self.cell(0, 10, str(p.get('Color', '-')), 0, 1)

        self.set_font('helvetica', 'B', 12)
        self.cell(40, 10, 'TALLES:', 0, 0)
        self.set_font('helvetica', '', 12)
        self.cell(0, 10, str(p.get('Rango de talles', '-')), 0, 1)

        self.ln(5)
        
        # Caja de Precios Gold (Usando las columnas "Visible")
        if str(p.get('Cajas disponibles', '0')) != '0' or str(p.get('Unidades Sueltas', '0')) != '0':
            self.set_fill_color(*self.gris_suave)
            self.rect(10, self.get_y(), 190, 35, 'F')
            
            self.set_y(self.get_y() + 5)
            self.set_font('helvetica', 'B', 10)
            self.set_text_color(100, 100, 100)
            self.cell(63, 10, 'PRECIO X 12', 0, 0, 'C')
            self.cell(63, 10, 'PRECIO X 6', 0, 0, 'C')
            self.cell(63, 10, 'PRECIO X 1', 0, 1, 'C')

            self.set_font('helvetica', 'B', 18)
            self.set_text_color(*self.oro)
            self.cell(63, 10, f"${p.get('Precio x 12', '0')}", 0, 0, 'C')
            self.cell(63, 10, f"${p.get('Precio x 6', '0')}", 0, 0, 'C')
            self.cell(63, 10, f"${p.get('Precio x 1', '0')}", 0, 1, 'C')
        else:
            self.set_font('helvetica', 'B', 14)
            self.set_text_color(200, 0, 0)
            self.cell(0, 20, 'SIN STOCK DISPONIBLE', 0, 1, 'C')

        # Pie de página del producto
        self.set_y(260)
        self.set_font('helvetica', '', 9)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 5, "Para consultas o pedidos, hacé clic en el botón de WhatsApp desde nuestra web.", 0, 'C')
