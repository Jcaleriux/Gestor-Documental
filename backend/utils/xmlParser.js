const { XMLParser } = require('fast-xml-parser');

const MAX_XML_INPUT_BYTES = 5 * 1024 * 1024;
const FORBIDDEN_XML_DIRECTIVES_PATTERN = /<!DOCTYPE|<!ENTITY/i;

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreNameSpace: true,
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  htmlEntities: false,
});

const assertSafeXmlInput = (xmlString) => {
  if (typeof xmlString !== 'string') {
    throw new Error('XML invalido');
  }

  if (Buffer.byteLength(xmlString, 'utf8') > MAX_XML_INPUT_BYTES) {
    throw new Error('XML excede el tamano maximo permitido');
  }

  if (FORBIDDEN_XML_DIRECTIVES_PATTERN.test(xmlString)) {
    throw new Error('XML con DTD/ENTITY no soportado por seguridad');
  }
};

function parseXML(xmlString) {
  assertSafeXmlInput(xmlString);
  const json = parser.parse(xmlString, true);

  // Obtener raiz real (FacturaElectronica, TiqueteElectronico, etc.)
  const rootKey = Object.keys(json).find((key) => !key.startsWith('?'));
  return {
    tipo: rootKey,
    data: json[rootKey]
  };
}

module.exports = { parseXML };
