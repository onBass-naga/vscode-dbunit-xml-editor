function parseXmlString(xml) {
  const parser = new DOMParser()
  const xmlReplaced = xml.trim().replaceAll('<null/>', '<value>[null]</value>')
  const xmlDoc = parser.parseFromString(xmlReplaced, 'text/xml')

  // TODO: エラー処理をまじめに実装する
  if (xmlDoc.nodeName === 'parsererror') {
    console.error('parsererror')
  }

  const result = convertXmlToObject(xmlDoc)
  if (result.length > 0) {
    return { tables: result, xmlFormat: 'standard' }
  }

  return {
    tables: convertFlatXmlToObject(xmlDoc),
    xmlFormat: 'flat',
  }
}

function convertFlatXmlToObject(doc) {
  function parseNode(node) {
    const tableName = node.nodeName
    const attributes = node.attributes
    const columnNames = (() => {
      const array = []
      for (let attr of attributes) {
        array.push(attr.name)
      }
      return array
    })()
    const data = (() => {
      const obj = {}
      for (let attr of attributes) {
        obj[attr.name] = attr.value
      }
      return obj
    })()

    return { tableName, columnNames, data }
  }

  // main ------------------------------------------------------------------
  const elements = doc.getElementsByTagName('dataset')[0].children
  const tables = []
  for (let elem of elements) {
    const result = parseNode(elem)
    const foundOne = tables.find((it) => it.tableName === result.tableName)
    if (foundOne) {
      foundOne.data.push(result.data)
    } else {
      tables.push({
        tableName: result.tableName,
        columnNames: result.columnNames,
        data: [result.data],
      })
    }
  }
  return tables
}

function convertXmlToObject(doc) {
  function getTable(node) {
    const tableName = node.getAttribute('name')
    const columnNames = (() => {
      const array = []
      const columns = node.getElementsByTagName('column')
      for (let elem of columns) {
        array.push(elem.textContent)
      }
      return array
    })()
    const values = (() => {
      const rows = node.getElementsByTagName('row')
      const array = []
      for (let elem of rows) {
        array.push(getValues(elem))
      }
      return array
    })()
    const data = (() => {
      const array = []
      for (let row of values) {
        const obj = {}
        for (let i = 0; i < columnNames.length; i++) {
          obj[columnNames[i]] = row[i]
        }
        array.push(obj)
      }
      return array
    })()
    return { tableName, columnNames, data }
  }

  function getValues(rowElem) {
    const values = rowElem.getElementsByTagName('value')
    const array = []
    for (let elem of values) {
      array.push(elem.textContent)
    }
    return array
  }

  // main --------------------------------------------------------------
  var elements = doc.getElementsByTagName('table')
  const tables = []
  for (let elem of elements) {
    tables.push(getTable(elem))
  }
  return tables
}

function serialize(xmlObj, xmlFormat) {
  function serializeToFlatXml(tableObjects) {
    const xmlDoc = document.implementation.createDocument(null, 'dataset')

    for (let obj of tableObjects) {
      const columnNames = obj.columnNames
      for (let row of obj.data) {
        const element = xmlDoc.createElement(obj.tableName)
        for (let columnName of obj.columnNames) {
          element.setAttribute(columnName, row[columnName])
          xmlDoc.documentElement.appendChild(element)
        }
      }
    }

    var serializer = new XMLSerializer()
    var xmlString = serializer
      .serializeToString(xmlDoc)
      .replaceAll('><', '>\n  <')
      .replaceAll('  </dataset>', '</dataset>')

    return "<?xml version='1.0' encoding='UTF-8'?>\n" + xmlString
  }

  function serializeToXml(tableObjects) {
    const xmlDoc = document.implementation.createDocument(null, 'dataset')

    for (let obj of tableObjects) {
      const tableElem = xmlDoc.createElement('table')
      tableElem.setAttribute('name', obj.tableName)

      for (let columnName of obj.columnNames) {
        const columnElem = xmlDoc.createElement('column')
        columnElem.textContent = columnName
        tableElem.appendChild(columnElem)
      }

      for (let row of obj.data) {
        const rowElem = xmlDoc.createElement('row')
        for (let column of obj.columnNames) {
          const value = row[column]
          if (value === '[null]') {
            const nullElem = xmlDoc.createElement('null')
            rowElem.appendChild(nullElem)
          } else {
            const valueElem = xmlDoc.createElement('value')
            valueElem.textContent = value
            rowElem.appendChild(valueElem)
          }
        }

        tableElem.appendChild(rowElem)
      }
      xmlDoc.documentElement.appendChild(tableElem)
    }

    var serializer = new XMLSerializer()
    var xmlString = serializer
      .serializeToString(xmlDoc)
      .replaceAll(`<table`, '\n  <table')
      .replaceAll(`</table`, '\n  </table')
      .replaceAll('<column', '\n    <column')
      .replaceAll('<row', '\n    <row')
      .replaceAll('</row', '\n    </row')
      .replaceAll('<value', '\n      <value')
      .replaceAll('</dataset>', '\n</dataset>')
      .replaceAll('><null/', '>\n      <null/')

    return "<?xml version='1.0' encoding='UTF-8'?>\n" + xmlString
  }

  // main --------------------------------------------------------------

  return xmlFormat == 'flat'
    ? serializeToFlatXml(xmlObj)
    : serializeToXml(xmlObj)
}
