;(function () {
  let tablesState = null
  const vscode = acquireVsCodeApi()

  const container = document.querySelector('#dataset-tables')

  const tab = document.createElement('ul')
  tab.className = 'tab-list'
  container.appendChild(tab)

  const tabContents = document.createElement('div')
  tabContents.className = 'tab-contents'
  container.appendChild(tabContents)

  const hidden = document.createElement('hidden')
  hidden.value = false
  container.appendChild(hidden)

  function updateContent(tables, isFlatXml) {
    while (tab.firstChild) {
      tab.removeChild(tab.firstChild)
    }
    for (let i = 0; i < tables.length; i++) {
      const li = document.createElement('li')
      const activeClass = i == 0 ? 'active' : ''
      li.className = `tab-list-item ${activeClass}`
      li.innerText = tables[i].tableName
      tab.appendChild(li)
    }

    while (tabContents.firstChild) {
      tabContents.removeChild(tabContents.firstChild)
    }
    for (let i = 0; i < tables.length; i++) {
      const content = document.createElement('div')
      const showClass = i == 0 ? 'show' : ''
      content.className = `tab-contents-item ${showClass}`

      const showColumnModalButton = document.createElement('button')
      showColumnModalButton.innerText = 'Edit columns...'
      showColumnModalButton.addEventListener('click', () => {
        // TODO: カラム編集モーダルを開く
      })
      content.appendChild(showColumnModalButton)

      const tableElem = document.createElement('table')
      tableElem.id = `editable-table_${tables[i].tableName}`
      content.appendChild(tableElem)
      tabContents.appendChild(content)

      var $table = new Tabulator(`#editable-table_${tables[i].tableName}`, {
        data: tables[i].data,
        rowContextMenu: createContextMenu(),
        // movableRows: true,
        columns: tables[i].columnNames.map((name) => {
          return {
            title: name,
            field: name,
            resizable: true,
            headerSort: false,
            editor: 'input',
            cellEdited: function (event, b) {
              tablesState = structuredClone(tables)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, hidden.value),
              })
            },
          }
        }),
      })

      function createContextMenu() {
        return [
          {
            label: 'Insert row above',
            action: function (e, row) {
              const rowData = row.getData()
              const index = tables[i].data.findIndex((it) => it === rowData)
              if (index < 0) {
                return
              }
              const rowCreated = tables[i].columnNames.reduce((acc, column) => {
                acc[column] = ''
                return acc
              }, {})
              tables[i].data.splice(index, 0, rowCreated)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, hidden.value),
              })

              //   // テーブルの見た目とデータを一致させるために必要
              //   $table.addRow(rowCreated, false, index)
            },
          },
          {
            label: 'Insert row below',
            action: function (e, row) {
              const rowData = row.getData()
              const index = tables[i].data.findIndex((it) => it === rowData)
              if (index < 0) {
                return
              }
              const rowCreated = tables[i].columnNames.reduce((acc, column) => {
                acc[column] = ''
                return acc
              }, {})
              tables[i].data.splice(index + 1, 0, rowCreated)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, hidden.value),
              })

              // テーブルの見た目とデータを一致させるために必要
              //   $table.addRow(rowCreated, false, index + 1)
            },
          },
          {
            label: 'Clone row',
            action: function (e, row) {
              const rowData = row.getData()
              const index = tables[i].data.findIndex((it) => it === rowData)
              if (index < 0) {
                return
              }
              const clone = Object.assign({}, rowData)
              tables[i].data.splice(index, 0, clone)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, hidden.value),
              })

              // テーブルの見た目とデータを一致させるために必要
              //   $table.addRow(clone, false, index + 1)
            },
          },
          {
            label: 'Delete row',
            action: function (e, row) {
              const rowData = row.getData()
              const index = tables[i].data.findIndex((it) => it === rowData)
              if (index < 0) {
                console.log('notfound')
                console.log(row)
                return
              }
              tables[i].data.splice(index, 1)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, hidden.value),
              })
              // テーブルの見た目とデータを一致させるために必要
              //   row.delete()
            },
          },
        ]
      }
    }

    const tabList = document.querySelectorAll('.tab-list-item')
    const tabContent = document.querySelectorAll('.tab-contents-item')

    for (let i = 0; i < tabList.length; i++) {
      tabList[i].addEventListener('click', tabSwitch)
    }

    function tabSwitch(event) {
      document.querySelectorAll('.active')[0].classList.remove('active')
      this.classList.add('active')
      document.querySelectorAll('.show')[0].classList.remove('show')
      const aryTabs = Array.prototype.slice.call(tabList)
      const index = aryTabs.indexOf(event.currentTarget)
      tabContent[index].classList.add('show')
    }

    hidden.value = isFlatXml
  }

  function areSame(tables1, tables2) {
    console.log(tables1)
    console.log(tables2)

    if (tables1 == null || tables2 == null) {
      return false
    }

    if (tables1.length !== tables2.length) {
      return false
    }

    for (let i = 0; i < tables1.length; i++) {
      const table1 = tables1[i]
      const table2 = tables2[i]

      if (table1.tableName !== table2.tableName) {
        return false
      }

      if (
        JSON.stringify(table1.columnNames) !==
        JSON.stringify(table2.columnNames)
      ) {
        return false
      }

      for (let j = 0; j < table1.data.length; j++) {
        const row1 = table1.data[j]
        const row2 = table2.data[j]
        const columnNaames = table1.columnNames

        for (let name of columnNaames) {
          if (row1[name] !== row2[name]) {
            return false
          }
        }
      }
    }

    return true
  }

  window.addEventListener('message', (event) => {
    const message = event.data
    switch (message.type) {
      case 'update':
        const xmlObj = parseXmlString(message.text)

        // データ編集時にフォーカスを失わないよう変更内容を比較
        if (areSame(xmlObj.tables, tablesState)) {
          return
        }

        // 編集内容が伝播しないようにdeepCloneを作成
        vscode.setState({ xmlObj: structuredClone(xmlObj) })

        console.log('update')
        updateContent(structuredClone(xmlObj.tables), xmlObj.isFlatXml)

        return
    }
  })

  const state = vscode.getState()
  if (state) {
    updateContent(state.xmlObj.tables, state.xmlObj.isFlatXml)
  }
})()
