const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreNameSpace: true,
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false
});

function parseXML(xmlString) {
  const json = parser.parse(xmlString);

  // Obtener raíz real (FacturaElectronica, TiqueteElectronico, etc)
  const rootKey = Object.keys(json).find(k => !k.startsWith("?"));
  return {
    tipo: rootKey,
    data: json[rootKey]
  };
}

module.exports = { parseXML };
