"use strict";
const require$$3 = require("electron");
const path = require("path");
const require$$0 = require("events");
const fs$1 = require("fs");
const fs = require("node:fs");
require("node:buffer");
const require$$1 = require("tty");
const require$$1$1 = require("util");
const require$$0$1 = require("os");
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main$1 = {};
var server = { exports: {} };
var objectsRegistry = {};
Object.defineProperty(objectsRegistry, "__esModule", { value: true });
const getOwnerKey = (webContents, contextId) => {
  return `${webContents.id}-${contextId}`;
};
class ObjectsRegistry {
  constructor() {
    this.nextId = 0;
    this.storage = {};
    this.owners = {};
    this.electronIds = /* @__PURE__ */ new WeakMap();
  }
  // Register a new object and return its assigned ID. If the object is already
  // registered then the already assigned ID would be returned.
  add(webContents, contextId, obj) {
    const id = this.saveToStorage(obj);
    const ownerKey = getOwnerKey(webContents, contextId);
    let owner = this.owners[ownerKey];
    if (!owner) {
      owner = this.owners[ownerKey] = /* @__PURE__ */ new Map();
      this.registerDeleteListener(webContents, contextId);
    }
    if (!owner.has(id)) {
      owner.set(id, 0);
      this.storage[id].count++;
    }
    owner.set(id, owner.get(id) + 1);
    return id;
  }
  // Get an object according to its ID.
  get(id) {
    const pointer = this.storage[id];
    if (pointer != null)
      return pointer.object;
  }
  // Dereference an object according to its ID.
  // Note that an object may be double-freed (cleared when page is reloaded, and
  // then garbage collected in old page).
  remove(webContents, contextId, id) {
    const ownerKey = getOwnerKey(webContents, contextId);
    const owner = this.owners[ownerKey];
    if (owner && owner.has(id)) {
      const newRefCount = owner.get(id) - 1;
      if (newRefCount <= 0) {
        owner.delete(id);
        this.dereference(id);
      } else {
        owner.set(id, newRefCount);
      }
    }
  }
  // Clear all references to objects refrenced by the WebContents.
  clear(webContents, contextId) {
    const ownerKey = getOwnerKey(webContents, contextId);
    const owner = this.owners[ownerKey];
    if (!owner)
      return;
    for (const id of owner.keys())
      this.dereference(id);
    delete this.owners[ownerKey];
  }
  // Saves the object into storage and assigns an ID for it.
  saveToStorage(object) {
    let id = this.electronIds.get(object);
    if (!id) {
      id = ++this.nextId;
      this.storage[id] = {
        count: 0,
        object
      };
      this.electronIds.set(object, id);
    }
    return id;
  }
  // Dereference the object from store.
  dereference(id) {
    const pointer = this.storage[id];
    if (pointer == null) {
      return;
    }
    pointer.count -= 1;
    if (pointer.count === 0) {
      this.electronIds.delete(pointer.object);
      delete this.storage[id];
    }
  }
  // Clear the storage when renderer process is destroyed.
  registerDeleteListener(webContents, contextId) {
    const processHostId = contextId.split("-")[0];
    const listener = (_, deletedProcessHostId) => {
      if (deletedProcessHostId && deletedProcessHostId.toString() === processHostId) {
        webContents.removeListener("render-view-deleted", listener);
        this.clear(webContents, contextId);
      }
    };
    webContents.on("render-view-deleted", listener);
  }
}
objectsRegistry.default = new ObjectsRegistry();
var typeUtils = {};
Object.defineProperty(typeUtils, "__esModule", { value: true });
typeUtils.deserialize = typeUtils.serialize = typeUtils.isSerializableObject = typeUtils.isPromise = void 0;
const electron_1 = require$$3;
function isPromise(val) {
  return val && val.then && val.then instanceof Function && val.constructor && val.constructor.reject && val.constructor.reject instanceof Function && val.constructor.resolve && val.constructor.resolve instanceof Function;
}
typeUtils.isPromise = isPromise;
const serializableTypes = [
  Boolean,
  Number,
  String,
  Date,
  Error,
  RegExp,
  ArrayBuffer
];
function isSerializableObject(value) {
  return value === null || ArrayBuffer.isView(value) || serializableTypes.some((type) => value instanceof type);
}
typeUtils.isSerializableObject = isSerializableObject;
const objectMap = function(source, mapper) {
  const sourceEntries = Object.entries(source);
  const targetEntries = sourceEntries.map(([key, val]) => [key, mapper(val)]);
  return Object.fromEntries(targetEntries);
};
function serializeNativeImage(image) {
  const representations = [];
  const scaleFactors = image.getScaleFactors();
  if (scaleFactors.length === 1) {
    const scaleFactor = scaleFactors[0];
    const size = image.getSize(scaleFactor);
    const buffer = image.toBitmap({ scaleFactor });
    representations.push({ scaleFactor, size, buffer });
  } else {
    for (const scaleFactor of scaleFactors) {
      const size = image.getSize(scaleFactor);
      const dataURL = image.toDataURL({ scaleFactor });
      representations.push({ scaleFactor, size, dataURL });
    }
  }
  return { __ELECTRON_SERIALIZED_NativeImage__: true, representations };
}
function deserializeNativeImage(value) {
  const image = electron_1.nativeImage.createEmpty();
  if (value.representations.length === 1) {
    const { buffer, size, scaleFactor } = value.representations[0];
    const { width, height } = size;
    image.addRepresentation({ buffer, scaleFactor, width, height });
  } else {
    for (const rep of value.representations) {
      const { dataURL, size, scaleFactor } = rep;
      const { width, height } = size;
      image.addRepresentation({ dataURL, scaleFactor, width, height });
    }
  }
  return image;
}
function serialize(value) {
  if (value && value.constructor && value.constructor.name === "NativeImage") {
    return serializeNativeImage(value);
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, serialize);
  } else {
    return value;
  }
}
typeUtils.serialize = serialize;
function deserialize(value) {
  if (value && value.__ELECTRON_SERIALIZED_NativeImage__) {
    return deserializeNativeImage(value);
  } else if (Array.isArray(value)) {
    return value.map(deserialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, deserialize);
  } else {
    return value;
  }
}
typeUtils.deserialize = deserialize;
var getElectronBinding$1 = {};
Object.defineProperty(getElectronBinding$1, "__esModule", { value: true });
getElectronBinding$1.getElectronBinding = void 0;
const getElectronBinding = (name) => {
  if (process._linkedBinding) {
    return process._linkedBinding("electron_common_" + name);
  } else if (process.electronBinding) {
    return process.electronBinding(name);
  } else {
    return null;
  }
};
getElectronBinding$1.getElectronBinding = getElectronBinding;
server.exports;
(function(module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.initialize = exports.isInitialized = exports.enable = exports.isRemoteModuleEnabled = void 0;
  const events_1 = require$$0;
  const objects_registry_1 = __importDefault(objectsRegistry);
  const type_utils_1 = typeUtils;
  const electron_12 = require$$3;
  const get_electron_binding_1 = getElectronBinding$1;
  const { Promise: Promise2 } = commonjsGlobal;
  const v8Util = get_electron_binding_1.getElectronBinding("v8_util");
  const hasWebPrefsRemoteModuleAPI = (() => {
    var _a, _b;
    const electronVersion = Number((_b = (_a = process.versions.electron) === null || _a === void 0 ? void 0 : _a.split(".")) === null || _b === void 0 ? void 0 : _b[0]);
    return Number.isNaN(electronVersion) || electronVersion < 14;
  })();
  const FUNCTION_PROPERTIES = [
    "length",
    "name",
    "arguments",
    "caller",
    "prototype"
  ];
  const rendererFunctionCache = /* @__PURE__ */ new Map();
  const finalizationRegistry = new FinalizationRegistry((fi) => {
    const mapKey = fi.id[0] + "~" + fi.id[1];
    const ref = rendererFunctionCache.get(mapKey);
    if (ref !== void 0 && ref.deref() === void 0) {
      rendererFunctionCache.delete(mapKey);
      if (!fi.webContents.isDestroyed()) {
        try {
          fi.webContents.sendToFrame(fi.frameId, "REMOTE_RENDERER_RELEASE_CALLBACK", fi.id[0], fi.id[1]);
        } catch (error) {
          console.warn(`sendToFrame() failed: ${error}`);
        }
      }
    }
  });
  function getCachedRendererFunction(id) {
    const mapKey = id[0] + "~" + id[1];
    const ref = rendererFunctionCache.get(mapKey);
    if (ref !== void 0) {
      const deref = ref.deref();
      if (deref !== void 0)
        return deref;
    }
  }
  function setCachedRendererFunction(id, wc, frameId, value) {
    const wr = new WeakRef(value);
    const mapKey = id[0] + "~" + id[1];
    rendererFunctionCache.set(mapKey, wr);
    finalizationRegistry.register(value, {
      id,
      webContents: wc,
      frameId
    });
    return value;
  }
  const locationInfo = /* @__PURE__ */ new WeakMap();
  const getObjectMembers = function(object) {
    let names = Object.getOwnPropertyNames(object);
    if (typeof object === "function") {
      names = names.filter((name) => {
        return !FUNCTION_PROPERTIES.includes(name);
      });
    }
    return names.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      let type;
      let writable = false;
      if (descriptor.get === void 0 && typeof object[name] === "function") {
        type = "method";
      } else {
        if (descriptor.set || descriptor.writable)
          writable = true;
        type = "get";
      }
      return { name, enumerable: descriptor.enumerable, writable, type };
    });
  };
  const getObjectPrototype = function(object) {
    const proto = Object.getPrototypeOf(object);
    if (proto === null || proto === Object.prototype)
      return null;
    return {
      members: getObjectMembers(proto),
      proto: getObjectPrototype(proto)
    };
  };
  const valueToMeta = function(sender, contextId, value, optimizeSimpleObject = false) {
    let type;
    switch (typeof value) {
      case "object":
        if (value instanceof Buffer) {
          type = "buffer";
        } else if (value && value.constructor && value.constructor.name === "NativeImage") {
          type = "nativeimage";
        } else if (Array.isArray(value)) {
          type = "array";
        } else if (value instanceof Error) {
          type = "error";
        } else if (type_utils_1.isSerializableObject(value)) {
          type = "value";
        } else if (type_utils_1.isPromise(value)) {
          type = "promise";
        } else if (Object.prototype.hasOwnProperty.call(value, "callee") && value.length != null) {
          type = "array";
        } else if (optimizeSimpleObject && v8Util.getHiddenValue(value, "simple")) {
          type = "value";
        } else {
          type = "object";
        }
        break;
      case "function":
        type = "function";
        break;
      default:
        type = "value";
        break;
    }
    if (type === "array") {
      return {
        type,
        members: value.map((el) => valueToMeta(sender, contextId, el, optimizeSimpleObject))
      };
    } else if (type === "nativeimage") {
      return { type, value: type_utils_1.serialize(value) };
    } else if (type === "object" || type === "function") {
      return {
        type,
        name: value.constructor ? value.constructor.name : "",
        // Reference the original value if it's an object, because when it's
        // passed to renderer we would assume the renderer keeps a reference of
        // it.
        id: objects_registry_1.default.add(sender, contextId, value),
        members: getObjectMembers(value),
        proto: getObjectPrototype(value)
      };
    } else if (type === "buffer") {
      return { type, value };
    } else if (type === "promise") {
      value.then(function() {
      }, function() {
      });
      return {
        type,
        then: valueToMeta(sender, contextId, function(onFulfilled, onRejected) {
          value.then(onFulfilled, onRejected);
        })
      };
    } else if (type === "error") {
      return {
        type,
        value,
        members: Object.keys(value).map((name) => ({
          name,
          value: valueToMeta(sender, contextId, value[name])
        }))
      };
    } else {
      return {
        type: "value",
        value
      };
    }
  };
  const throwRPCError = function(message) {
    const error = new Error(message);
    error.code = "EBADRPC";
    error.errno = -72;
    throw error;
  };
  const removeRemoteListenersAndLogWarning = (sender, callIntoRenderer) => {
    const location = locationInfo.get(callIntoRenderer);
    let message = `Attempting to call a function in a renderer window that has been closed or released.
Function provided here: ${location}`;
    if (sender instanceof events_1.EventEmitter) {
      const remoteEvents = sender.eventNames().filter((eventName) => {
        return sender.listeners(eventName).includes(callIntoRenderer);
      });
      if (remoteEvents.length > 0) {
        message += `
Remote event names: ${remoteEvents.join(", ")}`;
        remoteEvents.forEach((eventName) => {
          sender.removeListener(eventName, callIntoRenderer);
        });
      }
    }
    console.warn(message);
  };
  const fakeConstructor = (constructor, name) => new Proxy(Object, {
    get(target, prop, receiver) {
      if (prop === "name") {
        return name;
      } else {
        return Reflect.get(target, prop, receiver);
      }
    }
  });
  const unwrapArgs = function(sender, frameId, contextId, args) {
    const metaToValue = function(meta) {
      switch (meta.type) {
        case "nativeimage":
          return type_utils_1.deserialize(meta.value);
        case "value":
          return meta.value;
        case "remote-object":
          return objects_registry_1.default.get(meta.id);
        case "array":
          return unwrapArgs(sender, frameId, contextId, meta.value);
        case "buffer":
          return Buffer.from(meta.value.buffer, meta.value.byteOffset, meta.value.byteLength);
        case "promise":
          return Promise2.resolve({
            then: metaToValue(meta.then)
          });
        case "object": {
          const ret = meta.name !== "Object" ? /* @__PURE__ */ Object.create({
            constructor: fakeConstructor(Object, meta.name)
          }) : {};
          for (const { name, value } of meta.members) {
            ret[name] = metaToValue(value);
          }
          return ret;
        }
        case "function-with-return-value": {
          const returnValue = metaToValue(meta.value);
          return function() {
            return returnValue;
          };
        }
        case "function": {
          const objectId = [contextId, meta.id];
          const cachedFunction = getCachedRendererFunction(objectId);
          if (cachedFunction !== void 0) {
            return cachedFunction;
          }
          const callIntoRenderer = function(...args2) {
            let succeed = false;
            if (!sender.isDestroyed()) {
              try {
                succeed = sender.sendToFrame(frameId, "REMOTE_RENDERER_CALLBACK", contextId, meta.id, valueToMeta(sender, contextId, args2)) !== false;
              } catch (error) {
                console.warn(`sendToFrame() failed: ${error}`);
              }
            }
            if (!succeed) {
              removeRemoteListenersAndLogWarning(this, callIntoRenderer);
            }
          };
          locationInfo.set(callIntoRenderer, meta.location);
          Object.defineProperty(callIntoRenderer, "length", { value: meta.length });
          setCachedRendererFunction(objectId, sender, frameId, callIntoRenderer);
          return callIntoRenderer;
        }
        default:
          throw new TypeError(`Unknown type: ${meta.type}`);
      }
    };
    return args.map(metaToValue);
  };
  const isRemoteModuleEnabledImpl = function(contents) {
    const webPreferences = contents.getLastWebPreferences() || {};
    return webPreferences.enableRemoteModule != null ? !!webPreferences.enableRemoteModule : false;
  };
  const isRemoteModuleEnabledCache = /* @__PURE__ */ new WeakMap();
  const isRemoteModuleEnabled = function(contents) {
    if (hasWebPrefsRemoteModuleAPI && !isRemoteModuleEnabledCache.has(contents)) {
      isRemoteModuleEnabledCache.set(contents, isRemoteModuleEnabledImpl(contents));
    }
    return isRemoteModuleEnabledCache.get(contents);
  };
  exports.isRemoteModuleEnabled = isRemoteModuleEnabled;
  function enable(contents) {
    isRemoteModuleEnabledCache.set(contents, true);
  }
  exports.enable = enable;
  const handleRemoteCommand = function(channel, handler) {
    electron_12.ipcMain.on(channel, (event, contextId, ...args) => {
      let returnValue;
      if (!exports.isRemoteModuleEnabled(event.sender)) {
        event.returnValue = {
          type: "exception",
          value: valueToMeta(event.sender, contextId, new Error('@electron/remote is disabled for this WebContents. Call require("@electron/remote/main").enable(webContents) to enable it.'))
        };
        return;
      }
      try {
        returnValue = handler(event, contextId, ...args);
      } catch (error) {
        returnValue = {
          type: "exception",
          value: valueToMeta(event.sender, contextId, error)
        };
      }
      if (returnValue !== void 0) {
        event.returnValue = returnValue;
      }
    });
  };
  const emitCustomEvent = function(contents, eventName, ...args) {
    const event = { sender: contents, returnValue: void 0, defaultPrevented: false };
    electron_12.app.emit(eventName, event, contents, ...args);
    contents.emit(eventName, event, ...args);
    return event;
  };
  const logStack = function(contents, code, stack) {
    if (stack) {
      console.warn(`WebContents (${contents.id}): ${code}`, stack);
    }
  };
  let initialized = false;
  function isInitialized() {
    return initialized;
  }
  exports.isInitialized = isInitialized;
  function initialize() {
    if (initialized)
      throw new Error("@electron/remote has already been initialized");
    initialized = true;
    handleRemoteCommand("REMOTE_BROWSER_WRONG_CONTEXT_ERROR", function(event, contextId, passedContextId, id) {
      const objectId = [passedContextId, id];
      const cachedFunction = getCachedRendererFunction(objectId);
      if (cachedFunction === void 0) {
        return;
      }
      removeRemoteListenersAndLogWarning(event.sender, cachedFunction);
    });
    handleRemoteCommand("REMOTE_BROWSER_REQUIRE", function(event, contextId, moduleName, stack) {
      logStack(event.sender, `remote.require('${moduleName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-require", moduleName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.require('${moduleName}')`);
        } else {
          if (process.mainModule) {
            customEvent.returnValue = process.mainModule.require(moduleName);
          } else {
            let mainModule = module;
            while (mainModule.parent) {
              mainModule = mainModule.parent;
            }
            customEvent.returnValue = mainModule.require(moduleName);
          }
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_BUILTIN", function(event, contextId, moduleName, stack) {
      logStack(event.sender, `remote.getBuiltin('${moduleName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-builtin", moduleName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.getBuiltin('${moduleName}')`);
        } else {
          customEvent.returnValue = require$$3[moduleName];
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_GLOBAL", function(event, contextId, globalName, stack) {
      logStack(event.sender, `remote.getGlobal('${globalName}')`, stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-global", globalName);
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error(`Blocked remote.getGlobal('${globalName}')`);
        } else {
          customEvent.returnValue = commonjsGlobal[globalName];
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_CURRENT_WINDOW", function(event, contextId, stack) {
      logStack(event.sender, "remote.getCurrentWindow()", stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-current-window");
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error("Blocked remote.getCurrentWindow()");
        } else {
          customEvent.returnValue = event.sender.getOwnerBrowserWindow();
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_GET_CURRENT_WEB_CONTENTS", function(event, contextId, stack) {
      logStack(event.sender, "remote.getCurrentWebContents()", stack);
      const customEvent = emitCustomEvent(event.sender, "remote-get-current-web-contents");
      if (customEvent.returnValue === void 0) {
        if (customEvent.defaultPrevented) {
          throw new Error("Blocked remote.getCurrentWebContents()");
        } else {
          customEvent.returnValue = event.sender;
        }
      }
      return valueToMeta(event.sender, contextId, customEvent.returnValue);
    });
    handleRemoteCommand("REMOTE_BROWSER_CONSTRUCTOR", function(event, contextId, id, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const constructor = objects_registry_1.default.get(id);
      if (constructor == null) {
        throwRPCError(`Cannot call constructor on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, new constructor(...args));
    });
    handleRemoteCommand("REMOTE_BROWSER_FUNCTION_CALL", function(event, contextId, id, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const func = objects_registry_1.default.get(id);
      if (func == null) {
        throwRPCError(`Cannot call function on missing remote object ${id}`);
      }
      try {
        return valueToMeta(event.sender, contextId, func(...args), true);
      } catch (error) {
        const err = new Error(`Could not call remote function '${func.name || "anonymous"}'. Check that the function signature is correct. Underlying error: ${error}
` + (error instanceof Error ? `Underlying stack: ${error.stack}
` : ""));
        err.cause = error;
        throw err;
      }
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_CONSTRUCTOR", function(event, contextId, id, method, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const object = objects_registry_1.default.get(id);
      if (object == null) {
        throwRPCError(`Cannot call constructor '${method}' on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, new object[method](...args));
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_CALL", function(event, contextId, id, method, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const object = objects_registry_1.default.get(id);
      if (object == null) {
        throwRPCError(`Cannot call method '${method}' on missing remote object ${id}`);
      }
      try {
        return valueToMeta(event.sender, contextId, object[method](...args), true);
      } catch (error) {
        const err = new Error(`Could not call remote method '${method}'. Check that the method signature is correct. Underlying error: ${error}` + (error instanceof Error ? `Underlying stack: ${error.stack}
` : ""));
        err.cause = error;
        throw err;
      }
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_SET", function(event, contextId, id, name, args) {
      args = unwrapArgs(event.sender, event.frameId, contextId, args);
      const obj = objects_registry_1.default.get(id);
      if (obj == null) {
        throwRPCError(`Cannot set property '${name}' on missing remote object ${id}`);
      }
      obj[name] = args[0];
      return null;
    });
    handleRemoteCommand("REMOTE_BROWSER_MEMBER_GET", function(event, contextId, id, name) {
      const obj = objects_registry_1.default.get(id);
      if (obj == null) {
        throwRPCError(`Cannot get property '${name}' on missing remote object ${id}`);
      }
      return valueToMeta(event.sender, contextId, obj[name]);
    });
    handleRemoteCommand("REMOTE_BROWSER_DEREFERENCE", function(event, contextId, id) {
      objects_registry_1.default.remove(event.sender, contextId, id);
    });
    handleRemoteCommand("REMOTE_BROWSER_CONTEXT_RELEASE", (event, contextId) => {
      objects_registry_1.default.clear(event.sender, contextId);
      return null;
    });
  }
  exports.initialize = initialize;
})(server, server.exports);
var serverExports = server.exports;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.enable = exports.isInitialized = exports.initialize = void 0;
  var server_1 = serverExports;
  Object.defineProperty(exports, "initialize", { enumerable: true, get: function() {
    return server_1.initialize;
  } });
  Object.defineProperty(exports, "isInitialized", { enumerable: true, get: function() {
    return server_1.isInitialized;
  } });
  Object.defineProperty(exports, "enable", { enumerable: true, get: function() {
    return server_1.enable;
  } });
})(main$1);
var main = main$1;
const remoteMain = /* @__PURE__ */ getDefaultExportFromCjs(main);
fs.existsSync;
fs.createReadStream;
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs)
    return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon)
    return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self2 = debug;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      let i;
      const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
      const len = split.length;
      for (i = 0; i < len; i++) {
        if (!split[i]) {
          continue;
        }
        namespaces = split[i].replace(/\*/g, ".*?");
        if (namespaces[0] === "-") {
          createDebug.skips.push(new RegExp("^" + namespaces.slice(1) + "$"));
        } else {
          createDebug.names.push(new RegExp("^" + namespaces + "$"));
        }
      }
    }
    function disable() {
      const namespaces = [
        ...createDebug.names.map(toNamespace),
        ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      if (name[name.length - 1] === "*") {
        return true;
      }
      let i;
      let len;
      for (i = 0, len = createDebug.skips.length; i < len; i++) {
        if (createDebug.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = createDebug.names.length; i < len; i++) {
        if (createDebug.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }
    function toNamespace(regexp) {
      return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser)
    return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag)
    return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor)
    return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os = require$$0$1;
  const tty = require$$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode)
    return node.exports;
  hasRequiredNode = 1;
  (function(module, exports) {
    const tty = require$$1;
    const util = require$$1$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
const initDebug = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
var DataType$2;
(function(DataType2) {
  DataType2[DataType2["string"] = 0] = "string";
  DataType2[DataType2["uint"] = 1] = "uint";
  DataType2[DataType2["uid"] = 2] = "uid";
  DataType2[DataType2["bool"] = 3] = "bool";
  DataType2[DataType2["binary"] = 4] = "binary";
  DataType2[DataType2["float"] = 5] = "float";
})(DataType$2 || (DataType$2 = {}));
var TargetType;
(function(TargetType2) {
  TargetType2[TargetType2["shot"] = 10] = "shot";
  TargetType2[TargetType2["scene"] = 20] = "scene";
  TargetType2[TargetType2["track"] = 30] = "track";
  TargetType2[TargetType2["part"] = 40] = "part";
  TargetType2[TargetType2["album"] = 50] = "album";
  TargetType2[TargetType2["edition"] = 60] = "edition";
  TargetType2[TargetType2["collection"] = 70] = "collection";
})(TargetType || (TargetType = {}));
var TrackType;
(function(TrackType2) {
  TrackType2[TrackType2["video"] = 1] = "video";
  TrackType2[TrackType2["audio"] = 2] = "audio";
  TrackType2[TrackType2["complex"] = 3] = "complex";
  TrackType2[TrackType2["logo"] = 4] = "logo";
  TrackType2[TrackType2["subtitle"] = 17] = "subtitle";
  TrackType2[TrackType2["button"] = 18] = "button";
  TrackType2[TrackType2["control"] = 32] = "control";
})(TrackType || (TrackType = {}));
initDebug("music-metadata:collector");
var AttachedPictureType;
(function(AttachedPictureType2) {
  AttachedPictureType2[AttachedPictureType2["Other"] = 0] = "Other";
  AttachedPictureType2[AttachedPictureType2["32x32 pixels 'file icon' (PNG only)"] = 1] = "32x32 pixels 'file icon' (PNG only)";
  AttachedPictureType2[AttachedPictureType2["Other file icon"] = 2] = "Other file icon";
  AttachedPictureType2[AttachedPictureType2["Cover (front)"] = 3] = "Cover (front)";
  AttachedPictureType2[AttachedPictureType2["Cover (back)"] = 4] = "Cover (back)";
  AttachedPictureType2[AttachedPictureType2["Leaflet page"] = 5] = "Leaflet page";
  AttachedPictureType2[AttachedPictureType2["Media (e.g. label side of CD)"] = 6] = "Media (e.g. label side of CD)";
  AttachedPictureType2[AttachedPictureType2["Lead artist/lead performer/soloist"] = 7] = "Lead artist/lead performer/soloist";
  AttachedPictureType2[AttachedPictureType2["Artist/performer"] = 8] = "Artist/performer";
  AttachedPictureType2[AttachedPictureType2["Conductor"] = 9] = "Conductor";
  AttachedPictureType2[AttachedPictureType2["Band/Orchestra"] = 10] = "Band/Orchestra";
  AttachedPictureType2[AttachedPictureType2["Composer"] = 11] = "Composer";
  AttachedPictureType2[AttachedPictureType2["Lyricist/text writer"] = 12] = "Lyricist/text writer";
  AttachedPictureType2[AttachedPictureType2["Recording Location"] = 13] = "Recording Location";
  AttachedPictureType2[AttachedPictureType2["During recording"] = 14] = "During recording";
  AttachedPictureType2[AttachedPictureType2["During performance"] = 15] = "During performance";
  AttachedPictureType2[AttachedPictureType2["Movie/video screen capture"] = 16] = "Movie/video screen capture";
  AttachedPictureType2[AttachedPictureType2["A bright coloured fish"] = 17] = "A bright coloured fish";
  AttachedPictureType2[AttachedPictureType2["Illustration"] = 18] = "Illustration";
  AttachedPictureType2[AttachedPictureType2["Band/artist logotype"] = 19] = "Band/artist logotype";
  AttachedPictureType2[AttachedPictureType2["Publisher/Studio logotype"] = 20] = "Publisher/Studio logotype";
})(AttachedPictureType || (AttachedPictureType = {}));
var DataType$1;
(function(DataType2) {
  DataType2[DataType2["text_utf8"] = 0] = "text_utf8";
  DataType2[DataType2["binary"] = 1] = "binary";
  DataType2[DataType2["external_info"] = 2] = "external_info";
  DataType2[DataType2["reserved"] = 3] = "reserved";
})(DataType$1 || (DataType$1 = {}));
initDebug("music-metadata:parser:APEv2");
initDebug("music-metadata:parser:ID3v1");
initDebug("music-metadata:id3v2:frame-parser");
initDebug("music-metadata:parser:aiff");
var DataType;
(function(DataType2) {
  DataType2[DataType2["UnicodeString"] = 0] = "UnicodeString";
  DataType2[DataType2["ByteArray"] = 1] = "ByteArray";
  DataType2[DataType2["Bool"] = 2] = "Bool";
  DataType2[DataType2["DWord"] = 3] = "DWord";
  DataType2[DataType2["QWord"] = 4] = "QWord";
  DataType2[DataType2["Word"] = 5] = "Word";
})(DataType || (DataType = {}));
initDebug("music-metadata:parser:ASF");
initDebug("music-metadata:parser:ID3");
initDebug("music-metadata:parser:ogg:vorbis1");
initDebug("music-metadata:parser:FLAC");
var BlockType;
(function(BlockType2) {
  BlockType2[BlockType2["STREAMINFO"] = 0] = "STREAMINFO";
  BlockType2[BlockType2["PADDING"] = 1] = "PADDING";
  BlockType2[BlockType2["APPLICATION"] = 2] = "APPLICATION";
  BlockType2[BlockType2["SEEKTABLE"] = 3] = "SEEKTABLE";
  BlockType2[BlockType2["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
  BlockType2[BlockType2["CUESHEET"] = 5] = "CUESHEET";
  BlockType2[BlockType2["PICTURE"] = 6] = "PICTURE";
})(BlockType || (BlockType = {}));
initDebug("music-metadata:parser:MP4:atom");
initDebug("music-metadata:parser:MP4:Atom");
initDebug("music-metadata:parser:MP4");
var NameCode;
(function(NameCode2) {
  NameCode2[NameCode2["not_set"] = 0] = "not_set";
  NameCode2[NameCode2["radio"] = 1] = "radio";
  NameCode2[NameCode2["audiophile"] = 2] = "audiophile";
})(NameCode || (NameCode = {}));
var ReplayGainOriginator;
(function(ReplayGainOriginator2) {
  ReplayGainOriginator2[ReplayGainOriginator2["unspecified"] = 0] = "unspecified";
  ReplayGainOriginator2[ReplayGainOriginator2["engineer"] = 1] = "engineer";
  ReplayGainOriginator2[ReplayGainOriginator2["user"] = 2] = "user";
  ReplayGainOriginator2[ReplayGainOriginator2["automatic"] = 3] = "automatic";
  ReplayGainOriginator2[ReplayGainOriginator2["rms_average"] = 4] = "rms_average";
})(ReplayGainOriginator || (ReplayGainOriginator = {}));
initDebug("music-metadata:parser:mpeg");
initDebug("music-metadata:parser:musepack:sv8");
initDebug("music-metadata:parser:musepack");
initDebug("music-metadata:parser:musepack");
initDebug("music-metadata:parser:musepack");
initDebug("music-metadata:parser:ogg:speex");
initDebug("music-metadata:parser:ogg:theora");
initDebug("music-metadata:parser:ogg");
var WaveFormat;
(function(WaveFormat2) {
  WaveFormat2[WaveFormat2["PCM"] = 1] = "PCM";
  WaveFormat2[WaveFormat2["ADPCM"] = 2] = "ADPCM";
  WaveFormat2[WaveFormat2["IEEE_FLOAT"] = 3] = "IEEE_FLOAT";
  WaveFormat2[WaveFormat2["MPEG_ADTS_AAC"] = 5632] = "MPEG_ADTS_AAC";
  WaveFormat2[WaveFormat2["MPEG_LOAS"] = 5634] = "MPEG_LOAS";
  WaveFormat2[WaveFormat2["RAW_AAC1"] = 255] = "RAW_AAC1";
  WaveFormat2[WaveFormat2["DOLBY_AC3_SPDIF"] = 146] = "DOLBY_AC3_SPDIF";
  WaveFormat2[WaveFormat2["DVM"] = 8192] = "DVM";
  WaveFormat2[WaveFormat2["RAW_SPORT"] = 576] = "RAW_SPORT";
  WaveFormat2[WaveFormat2["ESST_AC3"] = 577] = "ESST_AC3";
  WaveFormat2[WaveFormat2["DRM"] = 9] = "DRM";
  WaveFormat2[WaveFormat2["DTS2"] = 8193] = "DTS2";
  WaveFormat2[WaveFormat2["MPEG"] = 80] = "MPEG";
})(WaveFormat || (WaveFormat = {}));
initDebug("music-metadata:parser:RIFF");
initDebug("music-metadata:parser:WavPack");
var ChannelType;
(function(ChannelType2) {
  ChannelType2[ChannelType2["mono"] = 1] = "mono";
  ChannelType2[ChannelType2["stereo"] = 2] = "stereo";
  ChannelType2[ChannelType2["channels"] = 3] = "channels";
  ChannelType2[ChannelType2["quad"] = 4] = "quad";
  ChannelType2[ChannelType2["4 channels"] = 5] = "4 channels";
  ChannelType2[ChannelType2["5 channels"] = 6] = "5 channels";
  ChannelType2[ChannelType2["5.1 channels"] = 7] = "5.1 channels";
})(ChannelType || (ChannelType = {}));
initDebug("music-metadata:parser:DSF");
initDebug("music-metadata:parser:aiff");
({
  440786851: {
    name: "ebml",
    container: {
      17030: { name: "ebmlVersion", value: DataType$2.uint },
      // 5.1.1
      17143: { name: "ebmlReadVersion", value: DataType$2.uint },
      // 5.1.2
      17138: { name: "ebmlMaxIDWidth", value: DataType$2.uint },
      // 5.1.3
      17139: { name: "ebmlMaxSizeWidth", value: DataType$2.uint },
      // 5.1.4
      17026: { name: "docType", value: DataType$2.string },
      // 5.1.5
      17031: { name: "docTypeVersion", value: DataType$2.uint },
      // 5.1.6
      17029: { name: "docTypeReadVersion", value: DataType$2.uint }
      // 5.1.7
    }
  },
  // Matroska segments
  408125543: {
    name: "segment",
    container: {
      // Meta Seek Information
      290298740: {
        name: "seekHead",
        container: {
          19899: {
            name: "seek",
            container: {
              21419: { name: "seekId", value: DataType$2.binary },
              21420: { name: "seekPosition", value: DataType$2.uint }
            }
          }
        }
      },
      // Segment Information
      357149030: {
        name: "info",
        container: {
          29604: { name: "uid", value: DataType$2.uid },
          29572: { name: "filename", value: DataType$2.string },
          3979555: { name: "prevUID", value: DataType$2.uid },
          3965867: { name: "prevFilename", value: DataType$2.string },
          4110627: { name: "nextUID", value: DataType$2.uid },
          4096955: { name: "nextFilename", value: DataType$2.string },
          2807729: { name: "timecodeScale", value: DataType$2.uint },
          17545: { name: "duration", value: DataType$2.float },
          17505: { name: "dateUTC", value: DataType$2.uint },
          31657: { name: "title", value: DataType$2.string },
          19840: { name: "muxingApp", value: DataType$2.string },
          22337: { name: "writingApp", value: DataType$2.string }
        }
      },
      // Cluster
      524531317: {
        name: "cluster",
        multiple: true,
        container: {
          231: { name: "timecode", value: DataType$2.uid },
          163: { name: "unknown", value: DataType$2.binary },
          167: { name: "position", value: DataType$2.uid },
          171: { name: "prevSize", value: DataType$2.uid }
        }
      },
      // Track
      374648427: {
        name: "tracks",
        container: {
          174: {
            name: "entries",
            multiple: true,
            container: {
              215: { name: "trackNumber", value: DataType$2.uint },
              29637: { name: "uid", value: DataType$2.uid },
              131: { name: "trackType", value: DataType$2.uint },
              185: { name: "flagEnabled", value: DataType$2.bool },
              136: { name: "flagDefault", value: DataType$2.bool },
              21930: { name: "flagForced", value: DataType$2.bool },
              // extended
              156: { name: "flagLacing", value: DataType$2.bool },
              28135: { name: "minCache", value: DataType$2.uint },
              28136: { name: "maxCache", value: DataType$2.uint },
              2352003: { name: "defaultDuration", value: DataType$2.uint },
              2306383: { name: "timecodeScale", value: DataType$2.float },
              21358: { name: "name", value: DataType$2.string },
              2274716: { name: "language", value: DataType$2.string },
              134: { name: "codecID", value: DataType$2.string },
              25506: { name: "codecPrivate", value: DataType$2.binary },
              2459272: { name: "codecName", value: DataType$2.string },
              3839639: { name: "codecSettings", value: DataType$2.string },
              3883072: { name: "codecInfoUrl", value: DataType$2.string },
              2536e3: { name: "codecDownloadUrl", value: DataType$2.string },
              170: { name: "codecDecodeAll", value: DataType$2.bool },
              28587: { name: "trackOverlay", value: DataType$2.uint },
              // Video
              224: {
                name: "video",
                container: {
                  154: { name: "flagInterlaced", value: DataType$2.bool },
                  21432: { name: "stereoMode", value: DataType$2.uint },
                  176: { name: "pixelWidth", value: DataType$2.uint },
                  186: { name: "pixelHeight", value: DataType$2.uint },
                  21680: { name: "displayWidth", value: DataType$2.uint },
                  21690: { name: "displayHeight", value: DataType$2.uint },
                  21683: { name: "aspectRatioType", value: DataType$2.uint },
                  3061028: { name: "colourSpace", value: DataType$2.uint },
                  3126563: { name: "gammaValue", value: DataType$2.float }
                }
              },
              // Audio
              225: {
                name: "audio",
                container: {
                  181: { name: "samplingFrequency", value: DataType$2.float },
                  30901: { name: "outputSamplingFrequency", value: DataType$2.float },
                  159: { name: "channels", value: DataType$2.uint },
                  // https://www.matroska.org/technical/specs/index.html
                  148: { name: "channels", value: DataType$2.uint },
                  32123: { name: "channelPositions", value: DataType$2.binary },
                  25188: { name: "bitDepth", value: DataType$2.uint }
                }
              },
              // Content Encoding
              28032: {
                name: "contentEncodings",
                container: {
                  25152: {
                    name: "contentEncoding",
                    container: {
                      20529: { name: "order", value: DataType$2.uint },
                      20530: { name: "scope", value: DataType$2.bool },
                      20531: { name: "type", value: DataType$2.uint },
                      20532: {
                        name: "contentEncoding",
                        container: {
                          16980: { name: "contentCompAlgo", value: DataType$2.uint },
                          16981: { name: "contentCompSettings", value: DataType$2.binary }
                        }
                      },
                      20533: {
                        name: "contentEncoding",
                        container: {
                          18401: { name: "contentEncAlgo", value: DataType$2.uint },
                          18402: { name: "contentEncKeyID", value: DataType$2.binary },
                          18403: { name: "contentSignature ", value: DataType$2.binary },
                          18404: { name: "ContentSigKeyID  ", value: DataType$2.binary },
                          18405: { name: "contentSigAlgo ", value: DataType$2.uint },
                          18406: { name: "contentSigHashAlgo ", value: DataType$2.uint }
                        }
                      },
                      25188: { name: "bitDepth", value: DataType$2.uint }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Cueing Data
      475249515: {
        name: "cues",
        container: {
          187: {
            name: "cuePoint",
            container: {
              179: { name: "cueTime", value: DataType$2.uid },
              183: {
                name: "positions",
                container: {
                  247: { name: "track", value: DataType$2.uint },
                  241: { name: "clusterPosition", value: DataType$2.uint },
                  21368: { name: "blockNumber", value: DataType$2.uint },
                  234: { name: "codecState", value: DataType$2.uint },
                  219: {
                    name: "reference",
                    container: {
                      150: { name: "time", value: DataType$2.uint },
                      151: { name: "cluster", value: DataType$2.uint },
                      21343: { name: "number", value: DataType$2.uint },
                      235: { name: "codecState", value: DataType$2.uint }
                    }
                  },
                  240: { name: "relativePosition", value: DataType$2.uint }
                  // extended
                }
              }
            }
          }
        }
      },
      // Attachment
      423732329: {
        name: "attachments",
        container: {
          24999: {
            name: "attachedFiles",
            multiple: true,
            container: {
              18046: { name: "description", value: DataType$2.string },
              18030: { name: "name", value: DataType$2.string },
              18016: { name: "mimeType", value: DataType$2.string },
              18012: { name: "data", value: DataType$2.binary },
              18094: { name: "uid", value: DataType$2.uid }
            }
          }
        }
      },
      // Chapters
      272869232: {
        name: "chapters",
        container: {
          17849: {
            name: "editionEntry",
            container: {
              182: {
                name: "chapterAtom",
                container: {
                  29636: { name: "uid", value: DataType$2.uid },
                  145: { name: "timeStart", value: DataType$2.uint },
                  146: { name: "timeEnd", value: DataType$2.uid },
                  152: { name: "hidden", value: DataType$2.bool },
                  17816: { name: "enabled", value: DataType$2.uid },
                  143: {
                    name: "track",
                    container: {
                      137: { name: "trackNumber", value: DataType$2.uid },
                      128: {
                        name: "display",
                        container: {
                          133: { name: "string", value: DataType$2.string },
                          17276: { name: "language ", value: DataType$2.string },
                          17278: { name: "country ", value: DataType$2.string }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Tagging
      307544935: {
        name: "tags",
        container: {
          29555: {
            name: "tag",
            multiple: true,
            container: {
              25536: {
                name: "target",
                container: {
                  25541: { name: "tagTrackUID", value: DataType$2.uid },
                  25540: { name: "tagChapterUID", value: DataType$2.uint },
                  25542: { name: "tagAttachmentUID", value: DataType$2.uid },
                  25546: { name: "targetType", value: DataType$2.string },
                  // extended
                  26826: { name: "targetTypeValue", value: DataType$2.uint },
                  // extended
                  25545: { name: "tagEditionUID", value: DataType$2.uid }
                  // extended
                }
              },
              26568: {
                name: "simpleTags",
                multiple: true,
                container: {
                  17827: { name: "name", value: DataType$2.string },
                  17543: { name: "string", value: DataType$2.string },
                  17541: { name: "binary", value: DataType$2.binary },
                  17530: { name: "language", value: DataType$2.string },
                  // extended
                  17531: { name: "languageIETF", value: DataType$2.string },
                  // extended
                  17540: { name: "default", value: DataType$2.bool }
                  // extended
                }
              }
            }
          }
        }
      }
    }
  }
});
initDebug("music-metadata:parser:matroska");
initDebug("music-metadata:parser:factory");
initDebug("music-metadata:parser");
async function loadMusic(path2) {
  return new Promise((resolve, reject) => {
    fs$1.readFile(path2, (err, data) => {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
}
async function loadLyric(path2) {
  return new Promise((resolve, reject) => {
    fs$1.readFile(path2, (err, data) => {
      if (err)
        reject(void 0);
      else
        resolve(data.toString());
    });
  });
}
remoteMain.initialize();
let window$1;
const createWindows = () => {
  const window2 = new require$$3.BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 875,
    minHeight: 660,
    webPreferences: {
      contextIsolation: false,
      //是否隔离上下文
      nodeIntegration: true,
      //进程使用node api
      preload: path.join(__dirname, "./preload")
    }
  });
  if (process.env.NODE_ENV !== "development") {
    window2.loadFile(path.join(__dirname, "index.html"));
    window2.webContents.openDevTools();
  } else {
    window2.loadURL("http://localhost:4396");
    window2.webContents.openDevTools();
  }
  remoteMain.enable(window2.webContents);
  return window2;
};
require$$3.app.whenReady().then(() => {
  window$1 = createWindows();
  require$$3.app.on("activate", () => {
    if (require$$3.BrowserWindow.getAllWindows.length === 0)
      window$1 = createWindows();
  });
});
require$$3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    require$$3.app.quit();
});
require$$3.ipcMain.on("doLoadLyric", async (_event, args) => {
  const res = await loadLyric(args);
  window$1.webContents.send("loadLyric", res);
});
require$$3.ipcMain.on("doLoadMusic", async (_event, args) => {
  const res = await loadMusic(args);
  window$1.webContents.send("loadMusic", { buffer: res, originPath: args });
});
require$$3.ipcMain.on("progressUpdate", (_event, progress) => {
  window$1.setProgressBar(progress);
});
