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
  function parseNode(node, tableColumnsMap) {
    const tableName = node.nodeName
    const columnValues = [...node.attributes].reduce((acc, attr) => {
      acc[attr.name] = attr.value
      return acc
    }, {})
    const columnNames = tableColumnsMap[tableName]
    const data = columnNames.reduce((acc, column) => {
      if (columnValues[column] == null) {
        acc[column] = '[null]'
      } else {
        acc[column] = columnValues[column]
      }
      return acc
    }, {})

    return { tableName, columnNames, data }
  }

  function merge(a, b) {
    const replaceable = {}
    let work = []
    for (let column of b) {
      if (a.includes(column)) {
        if (work.length > 0) {
          work.push(column)
          replaceable[column] = work
          work = []
        }
        continue
      }
      work.push(column)
    }
    const tail = work

    const merged = a.reduce((acc, it) => {
      if (replaceable[it] != null) {
        acc.push(...replaceable[it])
      } else {
        acc.push(it)
      }
      return acc
    }, [])
    merged.push(...tail)
    return merged
  }

  function addInitDataIfEmpty(columnNames) {
    return columnNames.length > 0 ? columnNames : ['column_name']
  }

  function createTableColumnsMap(elements) {
    return [...elements].reduce((acc, elem) => {
      const tableName = elem.nodeName
      const attributes = elem.attributes
      const columnNames = [...attributes].map((it) => it.name)
      if (acc[tableName] == null) {
        acc[tableName] = addInitDataIfEmpty(columnNames)
      } else {
        acc[tableName] = merge(acc[tableName], columnNames)
      }
      return acc
    }, {})
  }

  // main ------------------------------------------------------------------
  const elements = doc.getElementsByTagName('dataset')[0].children
  const tableColumnsMap = createTableColumnsMap(elements)

  const tables = []
  for (let elem of elements) {
    const result = parseNode(elem, tableColumnsMap)
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
    const columnNames = [...node.getElementsByTagName('column')].map(
      (it) => it.textContent
    )
    const values = (() => {
      const rows = [...node.getElementsByTagName('row')]
      if (rows.length == 0) {
        return [Array(columnNames.length).fill('[null]')]
      }

      return rows.map((row) => getValues(row))
    })()

    const data = values.map((row) => {
      return columnNames.reduce((acc, column, i) => {
        acc[column] = row[i]
        return acc
      }, {})
    })

    return { tableName, columnNames, data }
  }

  function getValues(rowElem) {
    return [...rowElem.getElementsByTagName('value')].map(
      (it) => it.textContent
    )
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

      const rows = obj.data.filter((row) => {
        return !Object.entries(row).every(([key, value]) => value === '[null]')
      })
      for (let row of rows) {
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
