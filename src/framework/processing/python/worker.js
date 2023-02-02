let pyScript

onmessage = (event) => {
  const { eventType } = event.data
  switch (eventType) {
    case 'initialise':
      initialise().then(() => {
        self.postMessage({ eventType: 'initialiseDone' })
      })
      break

    case 'loadScript':
      loadScript(event.data.script)
      self.postMessage({ eventType: 'loadScriptDone' })
      break

    case 'firstRunCycle':
      pyScript = self.pyodide.runPython(pyWorker(event.data.sessionId))
      runCycle(null)
      break

    case 'nextRunCycle':
      const { response } = event.data
      unwrap(response).then((userInput) => {
        runCycle(userInput)
      })
      break

    default:
      console.log('[ProcessingWorker] Received unsupported event: ', eventType)
  }
}

function runCycle (payload) {
  console.log('[ProcessingWorker] runCycle ' + JSON.stringify(payload))
  scriptEvent = pyScript.send(payload)
  self.postMessage({
    eventType: 'runCycleDone',
    scriptEvent: scriptEvent.toJs({
      create_proxies: false,
      dict_converter: Object.fromEntries
    })
  })
}

function unwrap (response) {
  console.log('[ProcessingWorker] unwrap response: ' + JSON.stringify(response.payload))
  return new Promise((resolve) => {
    switch (response.payload.__type__) {
      case 'PayloadFile':
        copyFileToPyFS(response.payload.value, resolve)
        break

      default:
        resolve(response.payload)
    }
  })
}

function copyFileToPyFS (file, resolve) {
  const reader = file.stream().getReader()
  const pyFile = self.pyodide.FS.open(file.name, 'w')

  const writeToPyFS = ({ done, value }) => {
    if (done) {
      resolve({ __type__: 'PayloadString', value: file.name })
    } else {
      self.pyodide.FS.write(pyFile, value, 0, value.length)
      reader.read().then(writeToPyFS)
    }
  }
  reader.read().then(writeToPyFS)
}

function initialise () {
  console.log('[ProcessingWorker] initialise')
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.21.2/full/pyodide.js')

  console.log('[ProcessingWorker] loading Pyodide')
  return loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.2/full/'
  }).then((pyodide) => {
    console.log('[ProcessingWorker] loading packages')
    self.pyodide = pyodide
    return self.pyodide.loadPackage(['micropip', 'python-magic', 'pandas', 'beautifulsoup4'])
  }).then((pyodide) => {
    return self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install("https://d3i-infra.github.io/ddp-inspector/ddpinspect/dist/ddpinspect-0.0.0-py3-none-any.whl", deps=False)
    `);
  })
  
}

function loadScript (script) {
  console.log('[ProcessingWorker] loadScript')
  self.pyodide.runPython(pyPortApi)
  self.pyodide.runPython(script)
}

const pyPortApi = `
class CommandUIRender:
  __slots__ = "page"
  def __init__(self, page):
    self.page = page
  def toDict(self):
    dict = {}
    dict["__type__"] = "CommandUIRender"
    dict["page"] = self.page.toDict()
    return dict

class CommandSystemDonate:
  __slots__ = "key", "json_string"
  def __init__(self, key, json_string):
    self.key = key
    self.json_string = json_string
  def toDict(self):
    dict = {}
    dict["__type__"] = "CommandSystemDonate"
    dict["key"] = self.key
    dict["json_string"] = self.json_string
    return dict

      
class PropsUIHeader:
  __slots__ = "title"
  def __init__(self, title):
    self.title = title
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIHeader"
    dict["title"] = self.title.toDict()
    return dict


class PropsUIFooter:
  __slots__ = "progress_percentage"
  def __init__(self, progress_percentage):
    self.progress_percentage = progress_percentage
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIFooter"
    dict["progressPercentage"] = self.progress_percentage
    return dict


class PropsUIPromptConfirm:
  __slots__ = "text", "ok", "cancel"
  def __init__(self, text, ok, cancel):
    self.text = text
    self.ok = ok
    self.cancel = cancel
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPromptConfirm"
    dict["text"] = self.text.toDict()
    dict["ok"] = self.ok.toDict()
    dict["cancel"] = self.cancel.toDict()
    return dict


class PropsUIPromptConsentForm:
  __slots__ = "tables", "meta_tables"
  def __init__(self, tables, meta_tables):
    self.tables = tables
    self.meta_tables = meta_tables
  def translate_tables(self):
    output = []
    for table in self.tables:
      output.append(table.toDict())
    return output
  def translate_meta_tables(self):
    output = []
    for table in self.meta_tables:
      output.append(table.toDict())
    return output
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPromptConsentForm"
    dict["tables"] = self.translate_tables()
    dict["metaTables"] = self.translate_meta_tables()
    return dict


class PropsUIPromptConsentFormTable:
  __slots__ = "id", "title", "data_frame"
  def __init__(self, id, title, data_frame):
    self.id = id
    self.title = title
    self.data_frame = data_frame
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPromptConsentFormTable"
    dict["id"] = self.id
    dict["title"] = self.title.toDict()
    dict["data_frame"] = self.data_frame.to_json()
    return dict


class PropsUIPromptFileInput:
  __slots__ = "description", "extensions"
  def __init__(self, description, extensions):
    self.description = description
    self.extensions = extensions
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPromptFileInput"
    dict["description"] = self.description.toDict()
    dict["extensions"] = self.extensions
    return dict


class PropsUIPromptRadioInput:
  __slots__ = "title", "description", "items"
  def __init__(self, title, description, items):
    self.title = title
    self.description = description
    self.items = items
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPromptRadioInput"
    dict["title"] = self.title.toDict()
    dict["description"] = self.description.toDict()
    dict["items"] = self.items
    return dict


class PropsUIPageDonation:
  __slots__ = "platform", "header", "body", "footer"
  def __init__(self, platform, header, body, footer):
    self.platform = platform
    self.header = header
    self.body = body
    self.footer = footer
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPageDonation"
    dict["platform"] = self.platform
    dict["header"] = self.header.toDict()
    dict["body"] = self.body.toDict()
    dict["footer"] = self.footer.toDict()
    return dict


class PropsUIPageEnd:
  def toDict(self):
    dict = {}
    dict["__type__"] = "PropsUIPageEnd"
    return dict


class Translatable:
  __slots__ = "translations"
  def __init__(self, translations):
    self.translations = translations
  def toDict(self):
    dict = {}
    dict["translations"] = self.translations
    return dict  
`

function pyWorker (sessionId) {
  return `
  from collections.abc import Generator
  import json
  import html
  import pandas as pd


  class ScriptWrapper(Generator):
    def __init__(self, script):
        self.script = script
    def send(self, data):
        command = self.script.send(data)
        return command.toDict()
    def throw(self, type=None, value=None, traceback=None):
        raise StopIteration
  script = process('${sessionId}')
  ScriptWrapper(script)
  `
}
