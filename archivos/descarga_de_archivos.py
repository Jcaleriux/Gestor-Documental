# import pandas as pd
# import requests
# import os
# from urllib.parse import urlparse

# # ---------------- CONFIGURACIÓN ----------------
# EXCEL_PATH = "Data.xlsx"
# SHEET_NAME = 0  # primera hoja
# START_ROW = 1   # fila 2 (pandas empieza en 0)
# END_ROW = 500   # fila 501
# OUTPUT_DIR = "archivos"
# # -----------------------------------------------

# # Crear carpeta si no existe
# os.makedirs(OUTPUT_DIR, exist_ok=True)

# # Leer el Excel
# df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)

# # Columnas Y, Z y AA (por índice)
# # Y = 24, Z = 25, AA = 26
# url_columns = [26]

# def download_file(url, folder):
#     if pd.isna(url):
#         return

#     try:
#         parsed_url = urlparse(url)
#         filename = os.path.basename(parsed_url.path)
#         file_path = os.path.join(folder, filename)

#         response = requests.get(url, timeout=30)
#         response.raise_for_status()

#         with open(file_path, "wb") as f:
#             f.write(response.content)

#         print(f"✔ Descargado: {filename}")

#     except Exception as e:
#         print(f"❌ Error al descargar {url}: {e}")

# # Recorrer filas y columnas
# for row in range(START_ROW, END_ROW + 1):
#     for col in url_columns:
#         url = df.iloc[row, col]
#         download_file(url, OUTPUT_DIR)

# print("✅ Proceso finalizado")
import pandas as pd
import requests
import os
from urllib.parse import urlparse

# ---------------- CONFIGURACIÓN ----------------
EXCEL_PATH = "Data.xlsx"
SHEET_NAME = 0       # primera hoja
START_ROW = 1        # fila 2
END_ROW = 500        # fila 501
OUTPUT_DIR = "archivos1"
COLUMN_AA = 26       # Columna AA (Respuesta Hacienda)
# -----------------------------------------------

# Crear carpeta si no existe
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Leer el Excel
df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)

def download_hacienda_xml(url, folder):
    if pd.isna(url):
        return

    try:
        parsed_url = urlparse(url)
        original_name = os.path.basename(parsed_url.path)

        # Separar nombre y extensión
        name, ext = os.path.splitext(original_name)

        # Nuevo nombre con RH
        new_filename = f"{name}RH{ext}"
        file_path = os.path.join(folder, new_filename)

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        with open(file_path, "wb") as f:
            f.write(response.content)

        print(f"✔ Descargado: {new_filename}")

    except Exception as e:
        print(f"❌ Error al descargar {url}: {e}")

# Recorrer solo la columna AA
for row in range(START_ROW, END_ROW + 1):
    url = df.iloc[row, COLUMN_AA]
    download_hacienda_xml(url, OUTPUT_DIR)

print("✅ Descarga de respuestas de Hacienda finalizada")
