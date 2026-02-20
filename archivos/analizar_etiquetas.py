import os
import xml.etree.ElementTree as ET
import csv

def get_all_tags(element, tags):
    # Quitar namespace del tag
    tag_name = element.tag.split('}')[-1]
    tags.add(tag_name)
    for child in element:
        get_all_tags(child, tags)

def get_tree_string(element, indent=0):
    tag_name = element.tag.split('}')[-1]
    result = '  ' * indent + tag_name + '\n'
    for child in element:
        result += get_tree_string(child, indent + 1)
    return result

folder = 'archivos'
files = [f for f in os.listdir(folder) if f.endswith('.xml')]

type_tags = {}

for file in files:
    path = os.path.join(folder, file)
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        # Obtener tipo de documento (elemento raíz sin namespace)
        doc_type = root.tag.split('}')[-1] if '}' in root.tag else root.tag
        tags = set()
        get_all_tags(root, tags)
        tree_str = get_tree_string(root)
        if doc_type not in type_tags:
            type_tags[doc_type] = []
        type_tags[doc_type].append((file, sorted(list(tags)), tree_str))
    except Exception as e:
        print(f"Error en {file}: {e}")

with open('resultado_etiquetas.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['Tipo_Documento', 'Archivo', 'Etiquetas', 'Estructura'])
    for doc_type, file_tags in type_tags.items():
        for file, tags, tree_str in file_tags:
            writer.writerow([doc_type, file, ','.join(tags), tree_str])