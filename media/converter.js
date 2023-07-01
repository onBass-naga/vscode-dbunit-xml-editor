
function parseXmlString(xml) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xml.trim(), 'text/xml');

    // TODO: エラー処理をまじめに実装する
    console.log(xmlDoc.nodeName === "parsererror" ? "パース中にエラー発生" : xmlDoc.nodeName);

    const result = convertXmlToObject(xmlDoc);
    if (result.length > 0) {
        return { tables: result, isFlatXml: false };
    }

    return { 
        tables: convertFlatXmlToObject(xmlDoc),
        isFlatXml: true
    }
}

function convertFlatXmlToObject(doc) {

    function parseNode(node) {
        const tableName = node.nodeName;
        const attributes = node.attributes;
        const columnNames = (() => {
            const array = [];
            for (let attr of attributes) {
                array.push(attr.name);
            }
            return array;
        })();
        const values = (() => {
            const array = [];
            for (let column of columnNames) {
                array.push(node.getAttribute(column));
            }
            return array;
        })();
        return {tableName, columnNames, values};
    }

    // main ------------------------------------------------------------------
    const elements = doc.getElementsByTagName('dataset')[0].children;
    const tables = [];
    for (let elem of elements) {
        const result = parseNode(elem);
        const foundOne = tables.find(it => it.tableName === result.tableName);
        if (foundOne) {
            foundOne.values.push(result.values);
        } else {
            tables.push({
                tableName: result.tableName,
                columnNames: result.columnNames,
                values: [result.values]
            });
        }

    }
    return tables;
}

function convertXmlToObject(doc) {
    function getTable(node) {
        const tableName = node.getAttribute("name");
        const columnNames = (() => {
            const array = [];
            const columns = node.getElementsByTagName('column');
            for (let elem of columns) {
                array.push(elem.textContent);
            }
            return array;
        })();
        const values = (() => {
            const rows = node.getElementsByTagName('row');
            const array = [];
            for (let elem of rows) {
                array.push(getValues(elem));
            }
            return array;
        })();
        return {tableName, columnNames, values};
    }
    
    function getValues(rowElem) {
        const values = rowElem.getElementsByTagName('value');
        const array = [];
        for (let elem of values) {
            array.push(elem.textContent);
        }
        return array;
    }

    // main --------------------------------------------------------------
    var elements = doc.getElementsByTagName('table');
    const tables = [];
    for (let elem of elements) {
        tables.push(getTable(elem));
    }
    return tables;
}

function serialize(xmlObj, isFlatXml) {

    function serializeToFlatXml(tableObjects) {
        const xmlDoc = document.implementation.createDocument(null, 'dataset');
    
        for (let obj of tableObjects) {
            const columnNames = obj.columnNames;
            for (let row of obj.values) {
                const element = xmlDoc.createElement(obj.tableName);
                for (let i = 0; i < columnNames.length; i++) {
                    element.setAttribute(columnNames[i], row[i]);
                    xmlDoc.documentElement.appendChild(element);
                }
            }
        }
    
        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString(xmlDoc)
            .replaceAll("><", ">\n  <")
            .replaceAll("  </dataset>", "</dataset>");
    
        return "<?xml version='1.0' encoding='UTF-8'?>\n" + xmlString;
    }

    function serializeToXml(tableObjects) {
        const xmlDoc = document.implementation.createDocument(null, 'dataset');
    
        for (let obj of tableObjects) {
            const tableElem = xmlDoc.createElement("table");
            tableElem.setAttribute("name", obj.tableName);
            
            for(let columnName of obj.columnNames) {
                const columnElem = xmlDoc.createElement("column");
                columnElem.textContent = columnName;
                tableElem.appendChild(columnElem);
            }

            for (let row of obj.values) {
                const rowElem = xmlDoc.createElement("row");
                for (let value of row) {
                    const valueElem = xmlDoc.createElement("value");
                    valueElem.textContent = value;
                    rowElem.appendChild(valueElem);
                }
                tableElem.appendChild(rowElem);
            }
            xmlDoc.documentElement.appendChild(tableElem);
        }
    
        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString(xmlDoc)
            .replaceAll(`<table`, "\n  <table")
            .replaceAll(`</table`, "\n  </table")
            .replaceAll("<column", "\n    <column")
            .replaceAll("<row", "\n    <row")
            .replaceAll("</row", "\n    </row")
            .replaceAll("<value", "\n      <value")
            .replaceAll("</dataset>", "\n</dataset>");
    
        return "<?xml version='1.0' encoding='UTF-8'?>\n" + xmlString
    }

    // main --------------------------------------------------------------

    return isFlatXml ? serializeToFlatXml(xmlObj) : serializeToXml(xmlObj);
}