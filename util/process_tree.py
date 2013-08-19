import xml.etree.ElementTree as ET
import json

#-------------------------------------------------------------------------------

def run(in_filename, out_filename):
    root_node = ET.parse(in_filename).getroot()

    sections = list()
    for section_node in root_node:
        section_items = list()
        for item_node in section_node:
            section_items.append({'title': item_node.attrib['title'],
                                  'url': item_node.attrib['style'][23:-2]})

        sections.append({'title': section_node.attrib['title'],
                         'items': section_items})

    json.dump(sections, open(out_filename, 'w'), indent=4)


#-------------------------------------------------------------------------------

if __name__ == '__main__':
    run('catalog.txt', 'portfolio.json')
