;(function () {
  let tablesState = null
  let activeTabIndex = 0

  const vscode = acquireVsCodeApi()
  const tableEditDialog = document.getElementById('tableEditDialog')
  const tableNameField = tableEditDialog.querySelector('#tableNameField')
  const columnListArea = tableEditDialog.querySelector('#columnListArea')
  const columnMovableArea = tableEditDialog.querySelector('#columnMovableArea')
  const addColumnBtn = tableEditDialog.querySelector('#addColumnBtn')
  addColumnBtn.addEventListener('click', (event) => {
    event.preventDefault()
    const columnRowElem = createColumnRowElem('')
    columnListArea.appendChild(columnRowElem)
  })
  function createColumnRowElem(columnName, hideDeleteBtn) {
    const columnRowElem = document.createElement('div')
    const inputElem = document.createElement('input')
    inputElem.className = 'columnNameField'
    inputElem.setAttribute('type', 'text')
    inputElem.value = columnName
    columnRowElem.appendChild(inputElem)
    if (!hideDeleteBtn) {
      const delBtnElem = document.createElement('button')
      delBtnElem.className = 'deleteColumnBtn'
      delBtnElem.innerText = ' - '
      delBtnElem.addEventListener('click', (event) => {
        event.preventDefault()
        columnListArea.removeChild(event.target.parentNode)
      })
      columnRowElem.appendChild(delBtnElem)
    }
    return columnRowElem
  }
  const deleteColumnBtns = tableEditDialog.querySelectorAll('.deleteColumnBtn')
  deleteColumnBtns.forEach((deleteColumnBtn) => {
    deleteColumnBtn.addEventListener('click', (event) => {
      event.preventDefault()
      columnListArea.removeChild(event.target.parentNode)
    })
  })
  const confirmBtn = tableEditDialog.querySelector('#confirmBtn')
  confirmBtn.addEventListener('click', (event) => {
    event.preventDefault()
    tableEditDialog.close(
      JSON.stringify({
        tableName: tableNameField.value.trim(),
        editMode: confirmBtn.value,
      })
    )
  })

  tableEditDialog.addEventListener('close', (e) => {
    const result = tableEditDialog.returnValue
    if (result == '') {
      clearModalField()
      return
    }

    const { tableName, editMode } = JSON.parse(result)
    const { tables, xmlFormat } = vscode.getState()

    const columnNameFields =
      tableEditDialog.querySelectorAll('.columnNameField')
    const columnNames = [...columnNameFields].map((it) => it.value)
    const data = [
      columnNames.reduce((acc, name) => {
        acc[name] = ''
        return acc
      }, {}),
    ]

    if (editMode === 'create') {
      tables.push({
        tableName,
        columnNames,
        data,
      })
      activeTabIndex = tables.length - 1

      vscode.postMessage({
        type: 'apply',
        text: serialize(tables, xmlFormat),
      })
    } else if (editMode === 'update') {
      const tableModified = (() => {
        const original = structuredClone(tables[activeTabIndex])
        const { added, keep } = columnNames.reduce(
          (acc, name) => {
            if (original.columnNames.includes(name)) {
              acc.keep.push(name)
            } else {
              acc.added.push(name)
            }
            return acc
          },
          { added: [], keep: [] }
        )

        const data = original.data.map((row) => {
          return columnNames.reduce((acc, name) => {
            if (added.includes(name)) {
              acc[name] = ''
            } else if (keep.includes(name)) {
              acc[name] = row[name] || ''
            }
            return acc
          }, {})
        })

        return Object.assign({}, original, { columnNames, data })
      })()

      tables.splice(activeTabIndex, 1, tableModified)

      vscode.postMessage({
        type: 'apply',
        text: serialize(tables, xmlFormat),
      })
    } else if (editMode === 'rename') {
      const tableModified = (() => {
        const original = structuredClone(tables[activeTabIndex])
        const mapping = original.columnNames.reduce((acc, org, i) => {
          acc[org] = columnNames[i]
          return acc
        }, {})

        const data = original.data.map((row) => {
          return original.columnNames.reduce((acc, org) => {
            const value = row[org] || ''
            acc[mapping[org]] = value
            return acc
          }, {})
        })

        return Object.assign({}, original, { columnNames, data })
      })()

      tables.splice(activeTabIndex, 1, tableModified)

      vscode.postMessage({
        type: 'apply',
        text: serialize(tables, xmlFormat),
      })
    } else if (editMode === 'move') {
      const columnsReplaced = [
        ...columnMovableArea.querySelectorAll('.movableColumnName'),
      ].map((it) => it.dataset.name)

      const tableModified = (() => {
        const original = tables[activeTabIndex]
        const data = original.data.map((row) => {
          return columnsReplaced.reduce((acc, name) => {
            acc[name] = row[name] || ''
            return acc
          }, {})
        })

        return Object.assign({}, original, {
          columnNames: columnsReplaced,
          data,
        })
      })()

      tables.splice(activeTabIndex, 1, tableModified)

      vscode.postMessage({
        type: 'apply',
        text: serialize(tables, xmlFormat),
      })
    }

    clearModalField(columnNameFields)
  })

  function clearModalField() {
    tableEditDialog
      .querySelectorAll('input')
      .forEach((elemm) => (elemm.value = ''))

    columnListArea.style.display = 'block'
    addColumnBtn.style.visibility = 'visible'
    tableEditDialog.querySelector('#tableNameField').readOnly = false
  }

  Sortable.create(columnMovableArea, {
    animation: 150,
  })

  const container = document.querySelector('#container')

  const header = document.createElement('div')
  header.className = 'header'
  container.appendChild(header)

  const formatLabel = document.createElement('label')
  formatLabel.className = 'format-selectbox'
  header.appendChild(formatLabel)
  const selectElem = document.createElement('select')
  selectElem.id = 'xml-format'
  selectElem.addEventListener('change', () => {
    const state = vscode.getState()
    const index = selectElem.selectedIndex
    const value = selectElem.options[index].value
    selectElem.dataset.selected = value

    vscode.postMessage({
      type: 'apply',
      text: serialize(state.tables, value),
    })
  })
  formatLabel.appendChild(selectElem)
  const optionElem1 = document.createElement('option')
  optionElem1.innerText = 'Flat XML'
  optionElem1.value = 'flat'
  selectElem.appendChild(optionElem1)
  const optionElem2 = document.createElement('option')
  optionElem2.value = 'standard'
  optionElem2.innerText = 'Standard XML'
  selectElem.appendChild(optionElem2)

  const tabContainer = document.createElement('div')
  tabContainer.className = 'tab-container'
  container.appendChild(tabContainer)

  const tab = document.createElement('ul')
  tab.className = 'tab-list'
  tabContainer.appendChild(tab)

  const addTableBtn = document.createElement('button')
  addTableBtn.className = 'add-table-button'
  addTableBtn.innerText = 'Add table'
  addTableBtn.addEventListener('click', () => {
    confirmBtn.value = 'create'
    confirmBtn.innerText = 'Create'
    tableEditDialog.querySelectorAll('.columnNameField').forEach((it) => {
      columnListArea.removeChild(it.parentNode)
    })
    const columnRowElem = createColumnRowElem('')
    columnListArea.appendChild(columnRowElem)

    tableEditDialog.showModal()
  })
  tabContainer.appendChild(addTableBtn)

  const tabContents = document.createElement('div')
  tabContents.className = 'tab-contents'
  container.appendChild(tabContents)

  function updateContent(tables, xmlFormat) {
    if (tables == null) {
      return
    }

    const indexOfXmlOption = [...selectElem.options].findIndex((it) => {
      return it.value === xmlFormat
    })
    selectElem.selectedIndex = indexOfXmlOption

    while (tab.firstChild) {
      tab.removeChild(tab.firstChild)
    }
    for (let i = 0; i < tables.length; i++) {
      const li = document.createElement('li')
      const activeClass = i == activeTabIndex ? 'active' : ''
      li.className = `tab-list-item ${activeClass}`
      li.innerText = tables[i].tableName
      tab.appendChild(li)
    }

    while (tabContents.firstChild) {
      tabContents.removeChild(tabContents.firstChild)
    }
    for (let i = 0; i < tables.length; i++) {
      const content = document.createElement('div')
      const showClass = i == activeTabIndex ? 'show' : ''
      content.className = `tab-contents-item ${showClass}`

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
            maxWidth: 300,
            headerSort: false,
            editor: 'input',
            cellEdited: function (event, b) {
              tablesState = structuredClone(tables)
              vscode.postMessage({
                type: 'apply',
                text: serialize(tables, selectElem.dataset.selected),
              })
            },
            headerContextMenu: [
              {
                label: 'Rename',
                action: function (e, column) {
                  tableNameField.value = tables[i].tableName
                  confirmBtn.value = 'rename'
                  confirmBtn.innerText = 'Update'

                  tableEditDialog
                    .querySelectorAll('.columnNameField')
                    .forEach((it) => {
                      columnListArea.removeChild(it.parentNode)
                    })

                  tables[i].columnNames.forEach((name) => {
                    const columnRowElem = createColumnRowElem(name, true)
                    columnListArea.appendChild(columnRowElem)
                  })

                  addColumnBtn.style.visibility = 'hidden'

                  tableEditDialog.showModal()
                },
              },
              {
                label: 'Add/Delete columns',
                action: function (e, column) {
                  tableNameField.value = tables[i].tableName
                  confirmBtn.value = 'update'
                  confirmBtn.innerText = 'Update'

                  tableEditDialog
                    .querySelectorAll('.columnNameField')
                    .forEach((it) => {
                      columnListArea.removeChild(it.parentNode)
                    })

                  tables[i].columnNames.forEach((name) => {
                    const columnRowElem = createColumnRowElem(name)
                    columnListArea.appendChild(columnRowElem)
                  })

                  tableNameField.readOnly = true

                  tableEditDialog
                    .querySelectorAll('.columnNameField')
                    .forEach((it) => (it.readOnly = true))

                  tableEditDialog.showModal()
                },
              },
              {
                label: 'Move columns',
                action: function (e, column) {
                  tableNameField.value = tables[i].tableName
                  confirmBtn.value = 'move'
                  confirmBtn.innerText = 'Update'

                  columnListArea.style.display = 'none'
                  columnMovableArea.style.visibility = 'visible'
                  addColumnBtn.style.visibility = 'hidden'
                  tableNameField.readOnly = true

                  tables[i].columnNames.forEach((name) => {
                    const columnRowElem = document.createElement('div')
                    columnRowElem.className = 'movableColumnName'
                    columnRowElem.innerText = name
                    columnRowElem.dataset.name = name
                    columnMovableArea.appendChild(columnRowElem)
                  })

                  tableEditDialog.showModal()
                },
              },
            ],
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
                text: serialize(tables, selectElem.dataset.selected),
              })
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
                text: serialize(tables, selectElem.dataset.selected),
              })
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
                text: serialize(tables, selectElem.dataset.selected),
              })
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
                text: serialize(tables, selectElem.dataset.selected),
              })
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
      activeTabIndex = index
    }

    selectElem.dataset.selected = xmlFormat
  }

  function areSame(tables1, tables2) {
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
        const columnNames = table1.columnNames

        for (let name of columnNames) {
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

        vscode.setState(xmlObj)
        updateContent(structuredClone(xmlObj.tables), xmlObj.xmlFormat)

        return
    }
  })

  const state = vscode.getState()
  if (state) {
    updateContent(structuredClone(state.tables), state.xmlFormat)
  }
})()
