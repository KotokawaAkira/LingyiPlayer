"use strict";
const require$$3 = require("electron");
const path = require("path");
const require$$0 = require("events");
const fs = require("fs");
const require$$1 = require("tty");
const require$$1$1 = require("util");
const require$$0$1 = require("os");
const require$$0$2 = require("stream");
const require$$0$3 = require("buffer");
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
  return value === null || ArrayBuffer.isView(value) || serializableTypes.some((type2) => value instanceof type2);
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
      let type2;
      let writable = false;
      if (descriptor.get === void 0 && typeof object[name] === "function") {
        type2 = "method";
      } else {
        if (descriptor.set || descriptor.writable)
          writable = true;
        type2 = "get";
      }
      return { name, enumerable: descriptor.enumerable, writable, type: type2 };
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
    let type2;
    switch (typeof value) {
      case "object":
        if (value instanceof Buffer) {
          type2 = "buffer";
        } else if (value && value.constructor && value.constructor.name === "NativeImage") {
          type2 = "nativeimage";
        } else if (Array.isArray(value)) {
          type2 = "array";
        } else if (value instanceof Error) {
          type2 = "error";
        } else if (type_utils_1.isSerializableObject(value)) {
          type2 = "value";
        } else if (type_utils_1.isPromise(value)) {
          type2 = "promise";
        } else if (Object.prototype.hasOwnProperty.call(value, "callee") && value.length != null) {
          type2 = "array";
        } else if (optimizeSimpleObject && v8Util.getHiddenValue(value, "simple")) {
          type2 = "value";
        } else {
          type2 = "object";
        }
        break;
      case "function":
        type2 = "function";
        break;
      default:
        type2 = "value";
        break;
    }
    if (type2 === "array") {
      return {
        type: type2,
        members: value.map((el) => valueToMeta(sender, contextId, el, optimizeSimpleObject))
      };
    } else if (type2 === "nativeimage") {
      return { type: type2, value: type_utils_1.serialize(value) };
    } else if (type2 === "object" || type2 === "function") {
      return {
        type: type2,
        name: value.constructor ? value.constructor.name : "",
        // Reference the original value if it's an object, because when it's
        // passed to renderer we would assume the renderer keeps a reference of
        // it.
        id: objects_registry_1.default.add(sender, contextId, value),
        members: getObjectMembers(value),
        proto: getObjectPrototype(value)
      };
    } else if (type2 === "buffer") {
      return { type: type2, value };
    } else if (type2 === "promise") {
      value.then(function() {
      }, function() {
      });
      return {
        type: type2,
        then: valueToMeta(sender, contextId, function(onFulfilled, onRejected) {
          value.then(onFulfilled, onRejected);
        })
      };
    } else if (type2 === "error") {
      return {
        type: type2,
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
var lib$3 = {};
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type2 = typeof val;
    if (type2 === "string" && val.length > 0) {
      return parse2(val);
    } else if (type2 === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse2(str) {
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
    var type2 = (match[2] || "ms").toLowerCase();
    switch (type2) {
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
var common$3;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common$3;
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
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
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
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format2) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format2];
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
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
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
        createDebug.init(debug2);
      }
      return debug2;
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
  common$3 = setup;
  return common$3;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
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
var node$1 = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
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
  if (hasRequiredSupportsColor) return supportsColor_1;
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
  function getSupportLevel(stream2) {
    const level = supportsColor(stream2, stream2 && stream2.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode$1;
function requireNode$1() {
  if (hasRequiredNode$1) return node$1.exports;
  hasRequiredNode$1 = 1;
  (function(module, exports) {
    const tty = require$$1;
    const util2 = require$$1$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util2.deprecate(
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
      return process.stderr.write(util2.formatWithOptions(exports.inspectOpts, ...args) + "\n");
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
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  })(node$1, node$1.exports);
  return node$1.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode$1();
}
var srcExports = src.exports;
var core$2 = {};
var core$1 = {};
var ReadStreamTokenizer$1 = {};
var AbstractTokenizer$1 = {};
var lib$2 = {};
var EndOfFileStream = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.EndOfStreamError = exports.defaultMessages = void 0;
  exports.defaultMessages = "End-Of-Stream";
  class EndOfStreamError extends Error {
    constructor() {
      super(exports.defaultMessages);
    }
  }
  exports.EndOfStreamError = EndOfStreamError;
})(EndOfFileStream);
var StreamReader$1 = {};
var Deferred$1 = {};
Object.defineProperty(Deferred$1, "__esModule", { value: true });
Deferred$1.Deferred = void 0;
class Deferred {
  constructor() {
    this.resolve = () => null;
    this.reject = () => null;
    this.promise = new Promise((resolve2, reject2) => {
      this.reject = reject2;
      this.resolve = resolve2;
    });
  }
}
Deferred$1.Deferred = Deferred;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.StreamReader = exports.EndOfStreamError = void 0;
  const EndOfFileStream_1 = EndOfFileStream;
  const Deferred_1 = Deferred$1;
  var EndOfFileStream_2 = EndOfFileStream;
  Object.defineProperty(exports, "EndOfStreamError", { enumerable: true, get: function() {
    return EndOfFileStream_2.EndOfStreamError;
  } });
  const maxStreamReadSize = 1 * 1024 * 1024;
  class StreamReader2 {
    constructor(s) {
      this.s = s;
      this.deferred = null;
      this.endOfStream = false;
      this.peekQueue = [];
      if (!s.read || !s.once) {
        throw new Error("Expected an instance of stream.Readable");
      }
      this.s.once("end", () => this.reject(new EndOfFileStream_1.EndOfStreamError()));
      this.s.once("error", (err) => this.reject(err));
      this.s.once("close", () => this.reject(new Error("Stream closed")));
    }
    /**
     * Read ahead (peek) from stream. Subsequent read or peeks will return the same data
     * @param uint8Array - Uint8Array (or Buffer) to store data read from stream in
     * @param offset - Offset target
     * @param length - Number of bytes to read
     * @returns Number of bytes peeked
     */
    async peek(uint8Array, offset, length) {
      const bytesRead = await this.read(uint8Array, offset, length);
      this.peekQueue.push(uint8Array.subarray(offset, offset + bytesRead));
      return bytesRead;
    }
    /**
     * Read chunk from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param offset - Offset target
     * @param length - Number of bytes to read
     * @returns Number of bytes read
     */
    async read(buffer, offset, length) {
      if (length === 0) {
        return 0;
      }
      if (this.peekQueue.length === 0 && this.endOfStream) {
        throw new EndOfFileStream_1.EndOfStreamError();
      }
      let remaining = length;
      let bytesRead = 0;
      while (this.peekQueue.length > 0 && remaining > 0) {
        const peekData = this.peekQueue.pop();
        if (!peekData)
          throw new Error("peekData should be defined");
        const lenCopy = Math.min(peekData.length, remaining);
        buffer.set(peekData.subarray(0, lenCopy), offset + bytesRead);
        bytesRead += lenCopy;
        remaining -= lenCopy;
        if (lenCopy < peekData.length) {
          this.peekQueue.push(peekData.subarray(lenCopy));
        }
      }
      while (remaining > 0 && !this.endOfStream) {
        const reqLen = Math.min(remaining, maxStreamReadSize);
        const chunkLen = await this.readFromStream(buffer, offset + bytesRead, reqLen);
        bytesRead += chunkLen;
        if (chunkLen < reqLen)
          break;
        remaining -= chunkLen;
      }
      return bytesRead;
    }
    /**
     * Read chunk from stream
     * @param buffer Target Uint8Array (or Buffer) to store data read from stream in
     * @param offset Offset target
     * @param length Number of bytes to read
     * @returns Number of bytes read
     */
    async readFromStream(buffer, offset, length) {
      const readBuffer = this.s.read(length);
      if (readBuffer) {
        buffer.set(readBuffer, offset);
        return readBuffer.length;
      } else {
        const request = {
          buffer,
          offset,
          length,
          deferred: new Deferred_1.Deferred()
        };
        this.deferred = request.deferred;
        this.s.once("readable", () => {
          this.readDeferred(request);
        });
        return request.deferred.promise;
      }
    }
    /**
     * Process deferred read request
     * @param request Deferred read request
     */
    readDeferred(request) {
      const readBuffer = this.s.read(request.length);
      if (readBuffer) {
        request.buffer.set(readBuffer, request.offset);
        request.deferred.resolve(readBuffer.length);
        this.deferred = null;
      } else {
        this.s.once("readable", () => {
          this.readDeferred(request);
        });
      }
    }
    reject(err) {
      this.endOfStream = true;
      if (this.deferred) {
        this.deferred.reject(err);
        this.deferred = null;
      }
    }
  }
  exports.StreamReader = StreamReader2;
})(StreamReader$1);
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.StreamReader = exports.EndOfStreamError = void 0;
  var EndOfFileStream_1 = EndOfFileStream;
  Object.defineProperty(exports, "EndOfStreamError", { enumerable: true, get: function() {
    return EndOfFileStream_1.EndOfStreamError;
  } });
  var StreamReader_1 = StreamReader$1;
  Object.defineProperty(exports, "StreamReader", { enumerable: true, get: function() {
    return StreamReader_1.StreamReader;
  } });
})(lib$2);
Object.defineProperty(AbstractTokenizer$1, "__esModule", { value: true });
AbstractTokenizer$1.AbstractTokenizer = void 0;
const peek_readable_1$2 = lib$2;
class AbstractTokenizer {
  constructor(fileInfo) {
    this.position = 0;
    this.numBuffer = new Uint8Array(8);
    this.fileInfo = fileInfo ? fileInfo : {};
  }
  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  async readToken(token, position = this.position) {
    const uint8Array = Buffer.alloc(token.len);
    const len = await this.readBuffer(uint8Array, { position });
    if (len < token.len)
      throw new peek_readable_1$2.EndOfStreamError();
    return token.get(uint8Array, 0);
  }
  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  async peekToken(token, position = this.position) {
    const uint8Array = Buffer.alloc(token.len);
    const len = await this.peekBuffer(uint8Array, { position });
    if (len < token.len)
      throw new peek_readable_1$2.EndOfStreamError();
    return token.get(uint8Array, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async readNumber(token) {
    const len = await this.readBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new peek_readable_1$2.EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async peekNumber(token) {
    const len = await this.peekBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new peek_readable_1$2.EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }
  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  async ignore(length) {
    if (this.fileInfo.size !== void 0) {
      const bytesLeft = this.fileInfo.size - this.position;
      if (length > bytesLeft) {
        this.position += bytesLeft;
        return bytesLeft;
      }
    }
    this.position += length;
    return length;
  }
  async close() {
  }
  normalizeOptions(uint8Array, options) {
    if (options && options.position !== void 0 && options.position < this.position) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }
    if (options) {
      return {
        mayBeLess: options.mayBeLess === true,
        offset: options.offset ? options.offset : 0,
        length: options.length ? options.length : uint8Array.length - (options.offset ? options.offset : 0),
        position: options.position ? options.position : this.position
      };
    }
    return {
      mayBeLess: false,
      offset: 0,
      length: uint8Array.length,
      position: this.position
    };
  }
}
AbstractTokenizer$1.AbstractTokenizer = AbstractTokenizer;
Object.defineProperty(ReadStreamTokenizer$1, "__esModule", { value: true });
ReadStreamTokenizer$1.ReadStreamTokenizer = void 0;
const AbstractTokenizer_1$1 = AbstractTokenizer$1;
const peek_readable_1$1 = lib$2;
const maxBufferSize = 256e3;
class ReadStreamTokenizer extends AbstractTokenizer_1$1.AbstractTokenizer {
  constructor(stream2, fileInfo) {
    super(fileInfo);
    this.streamReader = new peek_readable_1$1.StreamReader(stream2);
  }
  /**
   * Get file information, an HTTP-client may implement this doing a HEAD request
   * @return Promise with file information
   */
  async getFileInfo() {
    return this.fileInfo;
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  async readBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const skipBytes = normOptions.position - this.position;
    if (skipBytes > 0) {
      await this.ignore(skipBytes);
      return this.readBuffer(uint8Array, options);
    } else if (skipBytes < 0) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }
    if (normOptions.length === 0) {
      return 0;
    }
    const bytesRead = await this.streamReader.read(uint8Array, normOptions.offset, normOptions.length);
    this.position += bytesRead;
    if ((!options || !options.mayBeLess) && bytesRead < normOptions.length) {
      throw new peek_readable_1$1.EndOfStreamError();
    }
    return bytesRead;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  async peekBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    let bytesRead = 0;
    if (normOptions.position) {
      const skipBytes = normOptions.position - this.position;
      if (skipBytes > 0) {
        const skipBuffer = new Uint8Array(normOptions.length + skipBytes);
        bytesRead = await this.peekBuffer(skipBuffer, { mayBeLess: normOptions.mayBeLess });
        uint8Array.set(skipBuffer.subarray(skipBytes), normOptions.offset);
        return bytesRead - skipBytes;
      } else if (skipBytes < 0) {
        throw new Error("Cannot peek from a negative offset in a stream");
      }
    }
    if (normOptions.length > 0) {
      try {
        bytesRead = await this.streamReader.peek(uint8Array, normOptions.offset, normOptions.length);
      } catch (err) {
        if (options && options.mayBeLess && err instanceof peek_readable_1$1.EndOfStreamError) {
          return 0;
        }
        throw err;
      }
      if (!normOptions.mayBeLess && bytesRead < normOptions.length) {
        throw new peek_readable_1$1.EndOfStreamError();
      }
    }
    return bytesRead;
  }
  async ignore(length) {
    const bufSize = Math.min(maxBufferSize, length);
    const buf = new Uint8Array(bufSize);
    let totBytesRead = 0;
    while (totBytesRead < length) {
      const remaining = length - totBytesRead;
      const bytesRead = await this.readBuffer(buf, { length: Math.min(bufSize, remaining) });
      if (bytesRead < 0) {
        return bytesRead;
      }
      totBytesRead += bytesRead;
    }
    return totBytesRead;
  }
}
ReadStreamTokenizer$1.ReadStreamTokenizer = ReadStreamTokenizer;
var BufferTokenizer$1 = {};
Object.defineProperty(BufferTokenizer$1, "__esModule", { value: true });
BufferTokenizer$1.BufferTokenizer = void 0;
const peek_readable_1 = lib$2;
const AbstractTokenizer_1 = AbstractTokenizer$1;
class BufferTokenizer extends AbstractTokenizer_1.AbstractTokenizer {
  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param fileInfo - Pass additional file information to the tokenizer
   */
  constructor(uint8Array, fileInfo) {
    super(fileInfo);
    this.uint8Array = uint8Array;
    this.fileInfo.size = this.fileInfo.size ? this.fileInfo.size : uint8Array.length;
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(uint8Array, options) {
    if (options && options.position) {
      if (options.position < this.position) {
        throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
      }
      this.position = options.position;
    }
    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
    if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
      throw new peek_readable_1.EndOfStreamError();
    } else {
      uint8Array.set(this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read), normOptions.offset);
      return bytes2read;
    }
  }
  async close() {
  }
}
BufferTokenizer$1.BufferTokenizer = BufferTokenizer;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.fromBuffer = exports.fromStream = exports.EndOfStreamError = void 0;
  const ReadStreamTokenizer_1 = ReadStreamTokenizer$1;
  const BufferTokenizer_1 = BufferTokenizer$1;
  var peek_readable_12 = lib$2;
  Object.defineProperty(exports, "EndOfStreamError", { enumerable: true, get: function() {
    return peek_readable_12.EndOfStreamError;
  } });
  function fromStream2(stream2, fileInfo) {
    fileInfo = fileInfo ? fileInfo : {};
    return new ReadStreamTokenizer_1.ReadStreamTokenizer(stream2, fileInfo);
  }
  exports.fromStream = fromStream2;
  function fromBuffer2(uint8Array, fileInfo) {
    return new BufferTokenizer_1.BufferTokenizer(uint8Array, fileInfo);
  }
  exports.fromBuffer = fromBuffer2;
})(core$1);
var ParserFactory$1 = {};
var lib$1 = {};
var ieee754 = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
ieee754.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];
  i += d;
  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
  }
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
  }
  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};
ieee754.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  value = Math.abs(value);
  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }
    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }
  for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
  }
  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
  }
  buffer[offset + i - d] |= s * 128;
};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.AnsiStringType = exports.StringType = exports.BufferType = exports.Uint8ArrayType = exports.IgnoreType = exports.Float80_LE = exports.Float80_BE = exports.Float64_LE = exports.Float64_BE = exports.Float32_LE = exports.Float32_BE = exports.Float16_LE = exports.Float16_BE = exports.INT64_BE = exports.UINT64_BE = exports.INT64_LE = exports.UINT64_LE = exports.INT32_LE = exports.INT32_BE = exports.INT24_BE = exports.INT24_LE = exports.INT16_LE = exports.INT16_BE = exports.INT8 = exports.UINT32_BE = exports.UINT32_LE = exports.UINT24_BE = exports.UINT24_LE = exports.UINT16_BE = exports.UINT16_LE = exports.UINT8 = void 0;
  const ieee754$1 = ieee754;
  function dv(array) {
    return new DataView(array.buffer, array.byteOffset);
  }
  exports.UINT8 = {
    len: 1,
    get(array, offset) {
      return dv(array).getUint8(offset);
    },
    put(array, offset, value) {
      dv(array).setUint8(offset, value);
      return offset + 1;
    }
  };
  exports.UINT16_LE = {
    len: 2,
    get(array, offset) {
      return dv(array).getUint16(offset, true);
    },
    put(array, offset, value) {
      dv(array).setUint16(offset, value, true);
      return offset + 2;
    }
  };
  exports.UINT16_BE = {
    len: 2,
    get(array, offset) {
      return dv(array).getUint16(offset);
    },
    put(array, offset, value) {
      dv(array).setUint16(offset, value);
      return offset + 2;
    }
  };
  exports.UINT24_LE = {
    len: 3,
    get(array, offset) {
      const dataView = dv(array);
      return dataView.getUint8(offset) + (dataView.getUint16(offset + 1, true) << 8);
    },
    put(array, offset, value) {
      const dataView = dv(array);
      dataView.setUint8(offset, value & 255);
      dataView.setUint16(offset + 1, value >> 8, true);
      return offset + 3;
    }
  };
  exports.UINT24_BE = {
    len: 3,
    get(array, offset) {
      const dataView = dv(array);
      return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
    },
    put(array, offset, value) {
      const dataView = dv(array);
      dataView.setUint16(offset, value >> 8);
      dataView.setUint8(offset + 2, value & 255);
      return offset + 3;
    }
  };
  exports.UINT32_LE = {
    len: 4,
    get(array, offset) {
      return dv(array).getUint32(offset, true);
    },
    put(array, offset, value) {
      dv(array).setUint32(offset, value, true);
      return offset + 4;
    }
  };
  exports.UINT32_BE = {
    len: 4,
    get(array, offset) {
      return dv(array).getUint32(offset);
    },
    put(array, offset, value) {
      dv(array).setUint32(offset, value);
      return offset + 4;
    }
  };
  exports.INT8 = {
    len: 1,
    get(array, offset) {
      return dv(array).getInt8(offset);
    },
    put(array, offset, value) {
      dv(array).setInt8(offset, value);
      return offset + 1;
    }
  };
  exports.INT16_BE = {
    len: 2,
    get(array, offset) {
      return dv(array).getInt16(offset);
    },
    put(array, offset, value) {
      dv(array).setInt16(offset, value);
      return offset + 2;
    }
  };
  exports.INT16_LE = {
    len: 2,
    get(array, offset) {
      return dv(array).getInt16(offset, true);
    },
    put(array, offset, value) {
      dv(array).setInt16(offset, value, true);
      return offset + 2;
    }
  };
  exports.INT24_LE = {
    len: 3,
    get(array, offset) {
      const unsigned = exports.UINT24_LE.get(array, offset);
      return unsigned > 8388607 ? unsigned - 16777216 : unsigned;
    },
    put(array, offset, value) {
      const dataView = dv(array);
      dataView.setUint8(offset, value & 255);
      dataView.setUint16(offset + 1, value >> 8, true);
      return offset + 3;
    }
  };
  exports.INT24_BE = {
    len: 3,
    get(array, offset) {
      const unsigned = exports.UINT24_BE.get(array, offset);
      return unsigned > 8388607 ? unsigned - 16777216 : unsigned;
    },
    put(array, offset, value) {
      const dataView = dv(array);
      dataView.setUint16(offset, value >> 8);
      dataView.setUint8(offset + 2, value & 255);
      return offset + 3;
    }
  };
  exports.INT32_BE = {
    len: 4,
    get(array, offset) {
      return dv(array).getInt32(offset);
    },
    put(array, offset, value) {
      dv(array).setInt32(offset, value);
      return offset + 4;
    }
  };
  exports.INT32_LE = {
    len: 4,
    get(array, offset) {
      return dv(array).getInt32(offset, true);
    },
    put(array, offset, value) {
      dv(array).setInt32(offset, value, true);
      return offset + 4;
    }
  };
  exports.UINT64_LE = {
    len: 8,
    get(array, offset) {
      return dv(array).getBigUint64(offset, true);
    },
    put(array, offset, value) {
      dv(array).setBigUint64(offset, value, true);
      return offset + 8;
    }
  };
  exports.INT64_LE = {
    len: 8,
    get(array, offset) {
      return dv(array).getBigInt64(offset, true);
    },
    put(array, offset, value) {
      dv(array).setBigInt64(offset, value, true);
      return offset + 8;
    }
  };
  exports.UINT64_BE = {
    len: 8,
    get(array, offset) {
      return dv(array).getBigUint64(offset);
    },
    put(array, offset, value) {
      dv(array).setBigUint64(offset, value);
      return offset + 8;
    }
  };
  exports.INT64_BE = {
    len: 8,
    get(array, offset) {
      return dv(array).getBigInt64(offset);
    },
    put(array, offset, value) {
      dv(array).setBigInt64(offset, value);
      return offset + 8;
    }
  };
  exports.Float16_BE = {
    len: 2,
    get(dataView, offset) {
      return ieee754$1.read(dataView, offset, false, 10, this.len);
    },
    put(dataView, offset, value) {
      ieee754$1.write(dataView, value, offset, false, 10, this.len);
      return offset + this.len;
    }
  };
  exports.Float16_LE = {
    len: 2,
    get(array, offset) {
      return ieee754$1.read(array, offset, true, 10, this.len);
    },
    put(array, offset, value) {
      ieee754$1.write(array, value, offset, true, 10, this.len);
      return offset + this.len;
    }
  };
  exports.Float32_BE = {
    len: 4,
    get(array, offset) {
      return dv(array).getFloat32(offset);
    },
    put(array, offset, value) {
      dv(array).setFloat32(offset, value);
      return offset + 4;
    }
  };
  exports.Float32_LE = {
    len: 4,
    get(array, offset) {
      return dv(array).getFloat32(offset, true);
    },
    put(array, offset, value) {
      dv(array).setFloat32(offset, value, true);
      return offset + 4;
    }
  };
  exports.Float64_BE = {
    len: 8,
    get(array, offset) {
      return dv(array).getFloat64(offset);
    },
    put(array, offset, value) {
      dv(array).setFloat64(offset, value);
      return offset + 8;
    }
  };
  exports.Float64_LE = {
    len: 8,
    get(array, offset) {
      return dv(array).getFloat64(offset, true);
    },
    put(array, offset, value) {
      dv(array).setFloat64(offset, value, true);
      return offset + 8;
    }
  };
  exports.Float80_BE = {
    len: 10,
    get(array, offset) {
      return ieee754$1.read(array, offset, false, 63, this.len);
    },
    put(array, offset, value) {
      ieee754$1.write(array, value, offset, false, 63, this.len);
      return offset + this.len;
    }
  };
  exports.Float80_LE = {
    len: 10,
    get(array, offset) {
      return ieee754$1.read(array, offset, true, 63, this.len);
    },
    put(array, offset, value) {
      ieee754$1.write(array, value, offset, true, 63, this.len);
      return offset + this.len;
    }
  };
  class IgnoreType {
    /**
     * @param len number of bytes to ignore
     */
    constructor(len) {
      this.len = len;
    }
    // ToDo: don't read, but skip data
    get(array, off) {
    }
  }
  exports.IgnoreType = IgnoreType;
  class Uint8ArrayType {
    constructor(len) {
      this.len = len;
    }
    get(array, offset) {
      return array.subarray(offset, offset + this.len);
    }
  }
  exports.Uint8ArrayType = Uint8ArrayType;
  class BufferType {
    constructor(len) {
      this.len = len;
    }
    get(uint8Array, off) {
      return Buffer.from(uint8Array.subarray(off, off + this.len));
    }
  }
  exports.BufferType = BufferType;
  class StringType {
    constructor(len, encoding) {
      this.len = len;
      this.encoding = encoding;
    }
    get(uint8Array, offset) {
      return Buffer.from(uint8Array).toString(this.encoding, offset, offset + this.len);
    }
  }
  exports.StringType = StringType;
  class AnsiStringType {
    constructor(len) {
      this.len = len;
    }
    static decode(buffer, offset, until) {
      let str = "";
      for (let i = offset; i < until; ++i) {
        str += AnsiStringType.codePointToString(AnsiStringType.singleByteDecoder(buffer[i]));
      }
      return str;
    }
    static inRange(a, min, max) {
      return min <= a && a <= max;
    }
    static codePointToString(cp) {
      if (cp <= 65535) {
        return String.fromCharCode(cp);
      } else {
        cp -= 65536;
        return String.fromCharCode((cp >> 10) + 55296, (cp & 1023) + 56320);
      }
    }
    static singleByteDecoder(bite) {
      if (AnsiStringType.inRange(bite, 0, 127)) {
        return bite;
      }
      const codePoint = AnsiStringType.windows1252[bite - 128];
      if (codePoint === null) {
        throw Error("invaliding encoding");
      }
      return codePoint;
    }
    get(buffer, offset = 0) {
      return AnsiStringType.decode(buffer, offset, offset + this.len);
    }
  }
  exports.AnsiStringType = AnsiStringType;
  AnsiStringType.windows1252 = [
    8364,
    129,
    8218,
    402,
    8222,
    8230,
    8224,
    8225,
    710,
    8240,
    352,
    8249,
    338,
    141,
    381,
    143,
    144,
    8216,
    8217,
    8220,
    8221,
    8226,
    8211,
    8212,
    732,
    8482,
    353,
    8250,
    339,
    157,
    382,
    376,
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
    174,
    175,
    176,
    177,
    178,
    179,
    180,
    181,
    182,
    183,
    184,
    185,
    186,
    187,
    188,
    189,
    190,
    191,
    192,
    193,
    194,
    195,
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
    210,
    211,
    212,
    213,
    214,
    215,
    216,
    217,
    218,
    219,
    220,
    221,
    222,
    223,
    224,
    225,
    226,
    227,
    228,
    229,
    230,
    231,
    232,
    233,
    234,
    235,
    236,
    237,
    238,
    239,
    240,
    241,
    242,
    243,
    244,
    245,
    246,
    247,
    248,
    249,
    250,
    251,
    252,
    253,
    254,
    255
  ];
})(lib$1);
var util$b = {};
util$b.stringToBytes = (string) => [...string].map((character) => character.charCodeAt(0));
util$b.tarHeaderChecksumMatches = (buffer, offset = 0) => {
  const readSum = parseInt(buffer.toString("utf8", 148, 154).replace(/\0.*$/, "").trim(), 8);
  if (isNaN(readSum)) {
    return false;
  }
  let sum = 8 * 32;
  for (let i = offset; i < offset + 148; i++) {
    sum += buffer[i];
  }
  for (let i = offset + 156; i < offset + 512; i++) {
    sum += buffer[i];
  }
  return readSum === sum;
};
util$b.uint32SyncSafeToken = {
  get: (buffer, offset) => {
    return buffer[offset + 3] & 127 | buffer[offset + 2] << 7 | buffer[offset + 1] << 14 | buffer[offset] << 21;
  },
  len: 4
};
var supported$1 = {
  extensions: [
    "jpg",
    "png",
    "apng",
    "gif",
    "webp",
    "flif",
    "xcf",
    "cr2",
    "cr3",
    "orf",
    "arw",
    "dng",
    "nef",
    "rw2",
    "raf",
    "tif",
    "bmp",
    "icns",
    "jxr",
    "psd",
    "indd",
    "zip",
    "tar",
    "rar",
    "gz",
    "bz2",
    "7z",
    "dmg",
    "mp4",
    "mid",
    "mkv",
    "webm",
    "mov",
    "avi",
    "mpg",
    "mp2",
    "mp3",
    "m4a",
    "oga",
    "ogg",
    "ogv",
    "opus",
    "flac",
    "wav",
    "spx",
    "amr",
    "pdf",
    "epub",
    "exe",
    "swf",
    "rtf",
    "wasm",
    "woff",
    "woff2",
    "eot",
    "ttf",
    "otf",
    "ico",
    "flv",
    "ps",
    "xz",
    "sqlite",
    "nes",
    "crx",
    "xpi",
    "cab",
    "deb",
    "ar",
    "rpm",
    "Z",
    "lz",
    "cfb",
    "mxf",
    "mts",
    "blend",
    "bpg",
    "docx",
    "pptx",
    "xlsx",
    "3gp",
    "3g2",
    "jp2",
    "jpm",
    "jpx",
    "mj2",
    "aif",
    "qcp",
    "odt",
    "ods",
    "odp",
    "xml",
    "mobi",
    "heic",
    "cur",
    "ktx",
    "ape",
    "wv",
    "dcm",
    "ics",
    "glb",
    "pcap",
    "dsf",
    "lnk",
    "alias",
    "voc",
    "ac3",
    "m4v",
    "m4p",
    "m4b",
    "f4v",
    "f4p",
    "f4b",
    "f4a",
    "mie",
    "asf",
    "ogm",
    "ogx",
    "mpc",
    "arrow",
    "shp",
    "aac",
    "mp1",
    "it",
    "s3m",
    "xm",
    "ai",
    "skp",
    "avif",
    "eps",
    "lzh",
    "pgp",
    "asar",
    "stl",
    "chm",
    "3mf",
    "zst",
    "jxl",
    "vcf"
  ],
  mimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/flif",
    "image/x-xcf",
    "image/x-canon-cr2",
    "image/x-canon-cr3",
    "image/tiff",
    "image/bmp",
    "image/vnd.ms-photo",
    "image/vnd.adobe.photoshop",
    "application/x-indesign",
    "application/epub+zip",
    "application/x-xpinstall",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/x-tar",
    "application/x-rar-compressed",
    "application/gzip",
    "application/x-bzip2",
    "application/x-7z-compressed",
    "application/x-apple-diskimage",
    "application/x-apache-arrow",
    "video/mp4",
    "audio/midi",
    "video/x-matroska",
    "video/webm",
    "video/quicktime",
    "video/vnd.avi",
    "audio/vnd.wave",
    "audio/qcelp",
    "audio/x-ms-asf",
    "video/x-ms-asf",
    "application/vnd.ms-asf",
    "video/mpeg",
    "video/3gpp",
    "audio/mpeg",
    "audio/mp4",
    // RFC 4337
    "audio/opus",
    "video/ogg",
    "audio/ogg",
    "application/ogg",
    "audio/x-flac",
    "audio/ape",
    "audio/wavpack",
    "audio/amr",
    "application/pdf",
    "application/x-msdownload",
    "application/x-shockwave-flash",
    "application/rtf",
    "application/wasm",
    "font/woff",
    "font/woff2",
    "application/vnd.ms-fontobject",
    "font/ttf",
    "font/otf",
    "image/x-icon",
    "video/x-flv",
    "application/postscript",
    "application/eps",
    "application/x-xz",
    "application/x-sqlite3",
    "application/x-nintendo-nes-rom",
    "application/x-google-chrome-extension",
    "application/vnd.ms-cab-compressed",
    "application/x-deb",
    "application/x-unix-archive",
    "application/x-rpm",
    "application/x-compress",
    "application/x-lzip",
    "application/x-cfb",
    "application/x-mie",
    "application/mxf",
    "video/mp2t",
    "application/x-blender",
    "image/bpg",
    "image/jp2",
    "image/jpx",
    "image/jpm",
    "image/mj2",
    "audio/aiff",
    "application/xml",
    "application/x-mobipocket-ebook",
    "image/heif",
    "image/heif-sequence",
    "image/heic",
    "image/heic-sequence",
    "image/icns",
    "image/ktx",
    "application/dicom",
    "audio/x-musepack",
    "text/calendar",
    "text/vcard",
    "model/gltf-binary",
    "application/vnd.tcpdump.pcap",
    "audio/x-dsf",
    // Non-standard
    "application/x.ms.shortcut",
    // Invented by us
    "application/x.apple.alias",
    // Invented by us
    "audio/x-voc",
    "audio/vnd.dolby.dd-raw",
    "audio/x-m4a",
    "image/apng",
    "image/x-olympus-orf",
    "image/x-sony-arw",
    "image/x-adobe-dng",
    "image/x-nikon-nef",
    "image/x-panasonic-rw2",
    "image/x-fujifilm-raf",
    "video/x-m4v",
    "video/3gpp2",
    "application/x-esri-shape",
    "audio/aac",
    "audio/x-it",
    "audio/x-s3m",
    "audio/x-xm",
    "video/MP1S",
    "video/MP2P",
    "application/vnd.sketchup.skp",
    "image/avif",
    "application/x-lzh-compressed",
    "application/pgp-encrypted",
    "application/x-asar",
    "model/stl",
    "application/vnd.ms-htmlhelp",
    "model/3mf",
    "image/jxl",
    "application/zstd"
  ]
};
const Token$s = lib$1;
const strtok3$5 = core$1;
const {
  stringToBytes,
  tarHeaderChecksumMatches,
  uint32SyncSafeToken
} = util$b;
const supported = supported$1;
const minimumBytes = 4100;
async function fromStream(stream2) {
  const tokenizer = await strtok3$5.fromStream(stream2);
  try {
    return await fromTokenizer(tokenizer);
  } finally {
    await tokenizer.close();
  }
}
async function fromBuffer(input) {
  if (!(input instanceof Uint8Array || input instanceof ArrayBuffer || Buffer.isBuffer(input))) {
    throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`Buffer\` or \`ArrayBuffer\`, got \`${typeof input}\``);
  }
  const buffer = input instanceof Buffer ? input : Buffer.from(input);
  if (!(buffer && buffer.length > 1)) {
    return;
  }
  const tokenizer = strtok3$5.fromBuffer(buffer);
  return fromTokenizer(tokenizer);
}
function _check(buffer, headers, options) {
  options = {
    offset: 0,
    ...options
  };
  for (const [index, header] of headers.entries()) {
    if (options.mask) {
      if (header !== (options.mask[index] & buffer[index + options.offset])) {
        return false;
      }
    } else if (header !== buffer[index + options.offset]) {
      return false;
    }
  }
  return true;
}
async function fromTokenizer(tokenizer) {
  try {
    return _fromTokenizer(tokenizer);
  } catch (error) {
    if (!(error instanceof strtok3$5.EndOfStreamError)) {
      throw error;
    }
  }
}
async function _fromTokenizer(tokenizer) {
  let buffer = Buffer.alloc(minimumBytes);
  const bytesRead = 12;
  const check = (header, options) => _check(buffer, header, options);
  const checkString = (header, options) => check(stringToBytes(header), options);
  if (!tokenizer.fileInfo.size) {
    tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
  }
  await tokenizer.peekBuffer(buffer, { length: bytesRead, mayBeLess: true });
  if (check([66, 77])) {
    return {
      ext: "bmp",
      mime: "image/bmp"
    };
  }
  if (check([11, 119])) {
    return {
      ext: "ac3",
      mime: "audio/vnd.dolby.dd-raw"
    };
  }
  if (check([120, 1])) {
    return {
      ext: "dmg",
      mime: "application/x-apple-diskimage"
    };
  }
  if (check([77, 90])) {
    return {
      ext: "exe",
      mime: "application/x-msdownload"
    };
  }
  if (check([37, 33])) {
    await tokenizer.peekBuffer(buffer, { length: 24, mayBeLess: true });
    if (checkString("PS-Adobe-", { offset: 2 }) && checkString(" EPSF-", { offset: 14 })) {
      return {
        ext: "eps",
        mime: "application/eps"
      };
    }
    return {
      ext: "ps",
      mime: "application/postscript"
    };
  }
  if (check([31, 160]) || check([31, 157])) {
    return {
      ext: "Z",
      mime: "application/x-compress"
    };
  }
  if (check([255, 216, 255])) {
    return {
      ext: "jpg",
      mime: "image/jpeg"
    };
  }
  if (check([73, 73, 188])) {
    return {
      ext: "jxr",
      mime: "image/vnd.ms-photo"
    };
  }
  if (check([31, 139, 8])) {
    return {
      ext: "gz",
      mime: "application/gzip"
    };
  }
  if (check([66, 90, 104])) {
    return {
      ext: "bz2",
      mime: "application/x-bzip2"
    };
  }
  if (checkString("ID3")) {
    await tokenizer.ignore(6);
    const id3HeaderLen = await tokenizer.readToken(uint32SyncSafeToken);
    if (tokenizer.position + id3HeaderLen > tokenizer.fileInfo.size) {
      return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
    }
    await tokenizer.ignore(id3HeaderLen);
    return fromTokenizer(tokenizer);
  }
  if (checkString("MP+")) {
    return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
  }
  if ((buffer[0] === 67 || buffer[0] === 70) && check([87, 83], { offset: 1 })) {
    return {
      ext: "swf",
      mime: "application/x-shockwave-flash"
    };
  }
  if (check([71, 73, 70])) {
    return {
      ext: "gif",
      mime: "image/gif"
    };
  }
  if (checkString("FLIF")) {
    return {
      ext: "flif",
      mime: "image/flif"
    };
  }
  if (checkString("8BPS")) {
    return {
      ext: "psd",
      mime: "image/vnd.adobe.photoshop"
    };
  }
  if (checkString("WEBP", { offset: 8 })) {
    return {
      ext: "webp",
      mime: "image/webp"
    };
  }
  if (checkString("MPCK")) {
    return {
      ext: "mpc",
      mime: "audio/x-musepack"
    };
  }
  if (checkString("FORM")) {
    return {
      ext: "aif",
      mime: "audio/aiff"
    };
  }
  if (checkString("icns", { offset: 0 })) {
    return {
      ext: "icns",
      mime: "image/icns"
    };
  }
  if (check([80, 75, 3, 4])) {
    try {
      while (tokenizer.position + 30 < tokenizer.fileInfo.size) {
        await tokenizer.readBuffer(buffer, { length: 30 });
        const zipHeader = {
          compressedSize: buffer.readUInt32LE(18),
          uncompressedSize: buffer.readUInt32LE(22),
          filenameLength: buffer.readUInt16LE(26),
          extraFieldLength: buffer.readUInt16LE(28)
        };
        zipHeader.filename = await tokenizer.readToken(new Token$s.StringType(zipHeader.filenameLength, "utf-8"));
        await tokenizer.ignore(zipHeader.extraFieldLength);
        if (zipHeader.filename === "META-INF/mozilla.rsa") {
          return {
            ext: "xpi",
            mime: "application/x-xpinstall"
          };
        }
        if (zipHeader.filename.endsWith(".rels") || zipHeader.filename.endsWith(".xml")) {
          const type2 = zipHeader.filename.split("/")[0];
          switch (type2) {
            case "_rels":
              break;
            case "word":
              return {
                ext: "docx",
                mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              };
            case "ppt":
              return {
                ext: "pptx",
                mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
              };
            case "xl":
              return {
                ext: "xlsx",
                mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              };
            default:
              break;
          }
        }
        if (zipHeader.filename.startsWith("xl/")) {
          return {
            ext: "xlsx",
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          };
        }
        if (zipHeader.filename.startsWith("3D/") && zipHeader.filename.endsWith(".model")) {
          return {
            ext: "3mf",
            mime: "model/3mf"
          };
        }
        if (zipHeader.filename === "mimetype" && zipHeader.compressedSize === zipHeader.uncompressedSize) {
          const mimeType = await tokenizer.readToken(new Token$s.StringType(zipHeader.compressedSize, "utf-8"));
          switch (mimeType) {
            case "application/epub+zip":
              return {
                ext: "epub",
                mime: "application/epub+zip"
              };
            case "application/vnd.oasis.opendocument.text":
              return {
                ext: "odt",
                mime: "application/vnd.oasis.opendocument.text"
              };
            case "application/vnd.oasis.opendocument.spreadsheet":
              return {
                ext: "ods",
                mime: "application/vnd.oasis.opendocument.spreadsheet"
              };
            case "application/vnd.oasis.opendocument.presentation":
              return {
                ext: "odp",
                mime: "application/vnd.oasis.opendocument.presentation"
              };
            default:
          }
        }
        if (zipHeader.compressedSize === 0) {
          let nextHeaderIndex = -1;
          while (nextHeaderIndex < 0 && tokenizer.position < tokenizer.fileInfo.size) {
            await tokenizer.peekBuffer(buffer, { mayBeLess: true });
            nextHeaderIndex = buffer.indexOf("504B0304", 0, "hex");
            await tokenizer.ignore(nextHeaderIndex >= 0 ? nextHeaderIndex : buffer.length);
          }
        } else {
          await tokenizer.ignore(zipHeader.compressedSize);
        }
      }
    } catch (error) {
      if (!(error instanceof strtok3$5.EndOfStreamError)) {
        throw error;
      }
    }
    return {
      ext: "zip",
      mime: "application/zip"
    };
  }
  if (checkString("OggS")) {
    await tokenizer.ignore(28);
    const type2 = Buffer.alloc(8);
    await tokenizer.readBuffer(type2);
    if (_check(type2, [79, 112, 117, 115, 72, 101, 97, 100])) {
      return {
        ext: "opus",
        mime: "audio/opus"
      };
    }
    if (_check(type2, [128, 116, 104, 101, 111, 114, 97])) {
      return {
        ext: "ogv",
        mime: "video/ogg"
      };
    }
    if (_check(type2, [1, 118, 105, 100, 101, 111, 0])) {
      return {
        ext: "ogm",
        mime: "video/ogg"
      };
    }
    if (_check(type2, [127, 70, 76, 65, 67])) {
      return {
        ext: "oga",
        mime: "audio/ogg"
      };
    }
    if (_check(type2, [83, 112, 101, 101, 120, 32, 32])) {
      return {
        ext: "spx",
        mime: "audio/ogg"
      };
    }
    if (_check(type2, [1, 118, 111, 114, 98, 105, 115])) {
      return {
        ext: "ogg",
        mime: "audio/ogg"
      };
    }
    return {
      ext: "ogx",
      mime: "application/ogg"
    };
  }
  if (check([80, 75]) && (buffer[2] === 3 || buffer[2] === 5 || buffer[2] === 7) && (buffer[3] === 4 || buffer[3] === 6 || buffer[3] === 8)) {
    return {
      ext: "zip",
      mime: "application/zip"
    };
  }
  if (checkString("ftyp", { offset: 4 }) && (buffer[8] & 96) !== 0) {
    const brandMajor = buffer.toString("binary", 8, 12).replace("\0", " ").trim();
    switch (brandMajor) {
      case "avif":
        return { ext: "avif", mime: "image/avif" };
      case "mif1":
        return { ext: "heic", mime: "image/heif" };
      case "msf1":
        return { ext: "heic", mime: "image/heif-sequence" };
      case "heic":
      case "heix":
        return { ext: "heic", mime: "image/heic" };
      case "hevc":
      case "hevx":
        return { ext: "heic", mime: "image/heic-sequence" };
      case "qt":
        return { ext: "mov", mime: "video/quicktime" };
      case "M4V":
      case "M4VH":
      case "M4VP":
        return { ext: "m4v", mime: "video/x-m4v" };
      case "M4P":
        return { ext: "m4p", mime: "video/mp4" };
      case "M4B":
        return { ext: "m4b", mime: "audio/mp4" };
      case "M4A":
        return { ext: "m4a", mime: "audio/x-m4a" };
      case "F4V":
        return { ext: "f4v", mime: "video/mp4" };
      case "F4P":
        return { ext: "f4p", mime: "video/mp4" };
      case "F4A":
        return { ext: "f4a", mime: "audio/mp4" };
      case "F4B":
        return { ext: "f4b", mime: "audio/mp4" };
      case "crx":
        return { ext: "cr3", mime: "image/x-canon-cr3" };
      default:
        if (brandMajor.startsWith("3g")) {
          if (brandMajor.startsWith("3g2")) {
            return { ext: "3g2", mime: "video/3gpp2" };
          }
          return { ext: "3gp", mime: "video/3gpp" };
        }
        return { ext: "mp4", mime: "video/mp4" };
    }
  }
  if (checkString("MThd")) {
    return {
      ext: "mid",
      mime: "audio/midi"
    };
  }
  if (checkString("wOFF") && (check([0, 1, 0, 0], { offset: 4 }) || checkString("OTTO", { offset: 4 }))) {
    return {
      ext: "woff",
      mime: "font/woff"
    };
  }
  if (checkString("wOF2") && (check([0, 1, 0, 0], { offset: 4 }) || checkString("OTTO", { offset: 4 }))) {
    return {
      ext: "woff2",
      mime: "font/woff2"
    };
  }
  if (check([212, 195, 178, 161]) || check([161, 178, 195, 212])) {
    return {
      ext: "pcap",
      mime: "application/vnd.tcpdump.pcap"
    };
  }
  if (checkString("DSD ")) {
    return {
      ext: "dsf",
      mime: "audio/x-dsf"
      // Non-standard
    };
  }
  if (checkString("LZIP")) {
    return {
      ext: "lz",
      mime: "application/x-lzip"
    };
  }
  if (checkString("fLaC")) {
    return {
      ext: "flac",
      mime: "audio/x-flac"
    };
  }
  if (check([66, 80, 71, 251])) {
    return {
      ext: "bpg",
      mime: "image/bpg"
    };
  }
  if (checkString("wvpk")) {
    return {
      ext: "wv",
      mime: "audio/wavpack"
    };
  }
  if (checkString("%PDF")) {
    await tokenizer.ignore(1350);
    const maxBufferSize2 = 10 * 1024 * 1024;
    const buffer2 = Buffer.alloc(Math.min(maxBufferSize2, tokenizer.fileInfo.size));
    await tokenizer.readBuffer(buffer2, { mayBeLess: true });
    if (buffer2.includes(Buffer.from("AIPrivateData"))) {
      return {
        ext: "ai",
        mime: "application/postscript"
      };
    }
    return {
      ext: "pdf",
      mime: "application/pdf"
    };
  }
  if (check([0, 97, 115, 109])) {
    return {
      ext: "wasm",
      mime: "application/wasm"
    };
  }
  if (check([73, 73, 42, 0])) {
    if (checkString("CR", { offset: 8 })) {
      return {
        ext: "cr2",
        mime: "image/x-canon-cr2"
      };
    }
    if (check([28, 0, 254, 0], { offset: 8 }) || check([31, 0, 11, 0], { offset: 8 })) {
      return {
        ext: "nef",
        mime: "image/x-nikon-nef"
      };
    }
    if (check([8, 0, 0, 0], { offset: 4 }) && (check([45, 0, 254, 0], { offset: 8 }) || check([39, 0, 254, 0], { offset: 8 }))) {
      return {
        ext: "dng",
        mime: "image/x-adobe-dng"
      };
    }
    buffer = Buffer.alloc(24);
    await tokenizer.peekBuffer(buffer);
    if ((check([16, 251, 134, 1], { offset: 4 }) || check([8, 0, 0, 0], { offset: 4 })) && // This pattern differentiates ARW from other TIFF-ish file types:
    check([0, 254, 0, 4, 0, 1, 0, 0, 0, 1, 0, 0, 0, 3, 1], { offset: 9 })) {
      return {
        ext: "arw",
        mime: "image/x-sony-arw"
      };
    }
    return {
      ext: "tif",
      mime: "image/tiff"
    };
  }
  if (check([77, 77, 0, 42])) {
    return {
      ext: "tif",
      mime: "image/tiff"
    };
  }
  if (checkString("MAC ")) {
    return {
      ext: "ape",
      mime: "audio/ape"
    };
  }
  if (check([26, 69, 223, 163])) {
    async function readField() {
      const msb = await tokenizer.peekNumber(Token$s.UINT8);
      let mask = 128;
      let ic = 0;
      while ((msb & mask) === 0 && mask !== 0) {
        ++ic;
        mask >>= 1;
      }
      const id = Buffer.alloc(ic + 1);
      await tokenizer.readBuffer(id);
      return id;
    }
    async function readElement() {
      const id = await readField();
      const lenField = await readField();
      lenField[0] ^= 128 >> lenField.length - 1;
      const nrLen = Math.min(6, lenField.length);
      return {
        id: id.readUIntBE(0, id.length),
        len: lenField.readUIntBE(lenField.length - nrLen, nrLen)
      };
    }
    async function readChildren(level, children) {
      while (children > 0) {
        const e = await readElement();
        if (e.id === 17026) {
          return tokenizer.readToken(new Token$s.StringType(e.len, "utf-8"));
        }
        await tokenizer.ignore(e.len);
        --children;
      }
    }
    const re = await readElement();
    const docType = await readChildren(1, re.len);
    switch (docType) {
      case "webm":
        return {
          ext: "webm",
          mime: "video/webm"
        };
      case "matroska":
        return {
          ext: "mkv",
          mime: "video/x-matroska"
        };
      default:
        return;
    }
  }
  if (check([82, 73, 70, 70])) {
    if (check([65, 86, 73], { offset: 8 })) {
      return {
        ext: "avi",
        mime: "video/vnd.avi"
      };
    }
    if (check([87, 65, 86, 69], { offset: 8 })) {
      return {
        ext: "wav",
        mime: "audio/vnd.wave"
      };
    }
    if (check([81, 76, 67, 77], { offset: 8 })) {
      return {
        ext: "qcp",
        mime: "audio/qcelp"
      };
    }
  }
  if (checkString("SQLi")) {
    return {
      ext: "sqlite",
      mime: "application/x-sqlite3"
    };
  }
  if (check([78, 69, 83, 26])) {
    return {
      ext: "nes",
      mime: "application/x-nintendo-nes-rom"
    };
  }
  if (checkString("Cr24")) {
    return {
      ext: "crx",
      mime: "application/x-google-chrome-extension"
    };
  }
  if (checkString("MSCF") || checkString("ISc(")) {
    return {
      ext: "cab",
      mime: "application/vnd.ms-cab-compressed"
    };
  }
  if (check([237, 171, 238, 219])) {
    return {
      ext: "rpm",
      mime: "application/x-rpm"
    };
  }
  if (check([197, 208, 211, 198])) {
    return {
      ext: "eps",
      mime: "application/eps"
    };
  }
  if (check([40, 181, 47, 253])) {
    return {
      ext: "zst",
      mime: "application/zstd"
    };
  }
  if (check([79, 84, 84, 79, 0])) {
    return {
      ext: "otf",
      mime: "font/otf"
    };
  }
  if (checkString("#!AMR")) {
    return {
      ext: "amr",
      mime: "audio/amr"
    };
  }
  if (checkString("{\\rtf")) {
    return {
      ext: "rtf",
      mime: "application/rtf"
    };
  }
  if (check([70, 76, 86, 1])) {
    return {
      ext: "flv",
      mime: "video/x-flv"
    };
  }
  if (checkString("IMPM")) {
    return {
      ext: "it",
      mime: "audio/x-it"
    };
  }
  if (checkString("-lh0-", { offset: 2 }) || checkString("-lh1-", { offset: 2 }) || checkString("-lh2-", { offset: 2 }) || checkString("-lh3-", { offset: 2 }) || checkString("-lh4-", { offset: 2 }) || checkString("-lh5-", { offset: 2 }) || checkString("-lh6-", { offset: 2 }) || checkString("-lh7-", { offset: 2 }) || checkString("-lzs-", { offset: 2 }) || checkString("-lz4-", { offset: 2 }) || checkString("-lz5-", { offset: 2 }) || checkString("-lhd-", { offset: 2 })) {
    return {
      ext: "lzh",
      mime: "application/x-lzh-compressed"
    };
  }
  if (check([0, 0, 1, 186])) {
    if (check([33], { offset: 4, mask: [241] })) {
      return {
        ext: "mpg",
        // May also be .ps, .mpeg
        mime: "video/MP1S"
      };
    }
    if (check([68], { offset: 4, mask: [196] })) {
      return {
        ext: "mpg",
        // May also be .mpg, .m2p, .vob or .sub
        mime: "video/MP2P"
      };
    }
  }
  if (checkString("ITSF")) {
    return {
      ext: "chm",
      mime: "application/vnd.ms-htmlhelp"
    };
  }
  if (check([253, 55, 122, 88, 90, 0])) {
    return {
      ext: "xz",
      mime: "application/x-xz"
    };
  }
  if (checkString("<?xml ")) {
    return {
      ext: "xml",
      mime: "application/xml"
    };
  }
  if (check([55, 122, 188, 175, 39, 28])) {
    return {
      ext: "7z",
      mime: "application/x-7z-compressed"
    };
  }
  if (check([82, 97, 114, 33, 26, 7]) && (buffer[6] === 0 || buffer[6] === 1)) {
    return {
      ext: "rar",
      mime: "application/x-rar-compressed"
    };
  }
  if (checkString("solid ")) {
    return {
      ext: "stl",
      mime: "model/stl"
    };
  }
  if (checkString("BLENDER")) {
    return {
      ext: "blend",
      mime: "application/x-blender"
    };
  }
  if (checkString("!<arch>")) {
    await tokenizer.ignore(8);
    const str = await tokenizer.readToken(new Token$s.StringType(13, "ascii"));
    if (str === "debian-binary") {
      return {
        ext: "deb",
        mime: "application/x-deb"
      };
    }
    return {
      ext: "ar",
      mime: "application/x-unix-archive"
    };
  }
  if (check([137, 80, 78, 71, 13, 10, 26, 10])) {
    await tokenizer.ignore(8);
    async function readChunkHeader() {
      return {
        length: await tokenizer.readToken(Token$s.INT32_BE),
        type: await tokenizer.readToken(new Token$s.StringType(4, "binary"))
      };
    }
    do {
      const chunk = await readChunkHeader();
      if (chunk.length < 0) {
        return;
      }
      switch (chunk.type) {
        case "IDAT":
          return {
            ext: "png",
            mime: "image/png"
          };
        case "acTL":
          return {
            ext: "apng",
            mime: "image/apng"
          };
        default:
          await tokenizer.ignore(chunk.length + 4);
      }
    } while (tokenizer.position + 8 < tokenizer.fileInfo.size);
    return {
      ext: "png",
      mime: "image/png"
    };
  }
  if (check([65, 82, 82, 79, 87, 49, 0, 0])) {
    return {
      ext: "arrow",
      mime: "application/x-apache-arrow"
    };
  }
  if (check([103, 108, 84, 70, 2, 0, 0, 0])) {
    return {
      ext: "glb",
      mime: "model/gltf-binary"
    };
  }
  if (check([102, 114, 101, 101], { offset: 4 }) || // `free`
  check([109, 100, 97, 116], { offset: 4 }) || // `mdat` MJPEG
  check([109, 111, 111, 118], { offset: 4 }) || // `moov`
  check([119, 105, 100, 101], { offset: 4 })) {
    return {
      ext: "mov",
      mime: "video/quicktime"
    };
  }
  if (check([73, 73, 82, 79, 8, 0, 0, 0, 24])) {
    return {
      ext: "orf",
      mime: "image/x-olympus-orf"
    };
  }
  if (checkString("gimp xcf ")) {
    return {
      ext: "xcf",
      mime: "image/x-xcf"
    };
  }
  if (check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216])) {
    return {
      ext: "rw2",
      mime: "image/x-panasonic-rw2"
    };
  }
  if (check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
    async function readHeader() {
      const guid = Buffer.alloc(16);
      await tokenizer.readBuffer(guid);
      return {
        id: guid,
        size: Number(await tokenizer.readToken(Token$s.UINT64_LE))
      };
    }
    await tokenizer.ignore(30);
    while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
      const header = await readHeader();
      let payload = header.size - 24;
      if (_check(header.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
        const typeId = Buffer.alloc(16);
        payload -= await tokenizer.readBuffer(typeId);
        if (_check(typeId, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
          return {
            ext: "asf",
            mime: "audio/x-ms-asf"
          };
        }
        if (_check(typeId, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
          return {
            ext: "asf",
            mime: "video/x-ms-asf"
          };
        }
        break;
      }
      await tokenizer.ignore(payload);
    }
    return {
      ext: "asf",
      mime: "application/vnd.ms-asf"
    };
  }
  if (check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10])) {
    return {
      ext: "ktx",
      mime: "image/ktx"
    };
  }
  if ((check([126, 16, 4]) || check([126, 24, 4])) && check([48, 77, 73, 69], { offset: 4 })) {
    return {
      ext: "mie",
      mime: "application/x-mie"
    };
  }
  if (check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 })) {
    return {
      ext: "shp",
      mime: "application/x-esri-shape"
    };
  }
  if (check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10])) {
    await tokenizer.ignore(20);
    const type2 = await tokenizer.readToken(new Token$s.StringType(4, "ascii"));
    switch (type2) {
      case "jp2 ":
        return {
          ext: "jp2",
          mime: "image/jp2"
        };
      case "jpx ":
        return {
          ext: "jpx",
          mime: "image/jpx"
        };
      case "jpm ":
        return {
          ext: "jpm",
          mime: "image/jpm"
        };
      case "mjp2":
        return {
          ext: "mj2",
          mime: "image/mj2"
        };
      default:
        return;
    }
  }
  if (check([255, 10]) || check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10])) {
    return {
      ext: "jxl",
      mime: "image/jxl"
    };
  }
  if (check([0, 0, 1, 186]) || check([0, 0, 1, 179])) {
    return {
      ext: "mpg",
      mime: "video/mpeg"
    };
  }
  if (check([0, 1, 0, 0, 0])) {
    return {
      ext: "ttf",
      mime: "font/ttf"
    };
  }
  if (check([0, 0, 1, 0])) {
    return {
      ext: "ico",
      mime: "image/x-icon"
    };
  }
  if (check([0, 0, 2, 0])) {
    return {
      ext: "cur",
      mime: "image/x-icon"
    };
  }
  if (check([208, 207, 17, 224, 161, 177, 26, 225])) {
    return {
      ext: "cfb",
      mime: "application/x-cfb"
    };
  }
  await tokenizer.peekBuffer(buffer, { length: Math.min(256, tokenizer.fileInfo.size), mayBeLess: true });
  if (checkString("BEGIN:")) {
    if (checkString("VCARD", { offset: 6 })) {
      return {
        ext: "vcf",
        mime: "text/vcard"
      };
    }
    if (checkString("VCALENDAR", { offset: 6 })) {
      return {
        ext: "ics",
        mime: "text/calendar"
      };
    }
  }
  if (checkString("FUJIFILMCCD-RAW")) {
    return {
      ext: "raf",
      mime: "image/x-fujifilm-raf"
    };
  }
  if (checkString("Extended Module:")) {
    return {
      ext: "xm",
      mime: "audio/x-xm"
    };
  }
  if (checkString("Creative Voice File")) {
    return {
      ext: "voc",
      mime: "audio/x-voc"
    };
  }
  if (check([4, 0, 0, 0]) && buffer.length >= 16) {
    const jsonSize = buffer.readUInt32LE(12);
    if (jsonSize > 12 && buffer.length >= jsonSize + 16) {
      try {
        const header = buffer.slice(16, jsonSize + 16).toString();
        const json = JSON.parse(header);
        if (json.files) {
          return {
            ext: "asar",
            mime: "application/x-asar"
          };
        }
      } catch (_) {
      }
    }
  }
  if (check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2])) {
    return {
      ext: "mxf",
      mime: "application/mxf"
    };
  }
  if (checkString("SCRM", { offset: 44 })) {
    return {
      ext: "s3m",
      mime: "audio/x-s3m"
    };
  }
  if (check([71], { offset: 4 }) && (check([71], { offset: 192 }) || check([71], { offset: 196 }))) {
    return {
      ext: "mts",
      mime: "video/mp2t"
    };
  }
  if (check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 })) {
    return {
      ext: "mobi",
      mime: "application/x-mobipocket-ebook"
    };
  }
  if (check([68, 73, 67, 77], { offset: 128 })) {
    return {
      ext: "dcm",
      mime: "application/dicom"
    };
  }
  if (check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70])) {
    return {
      ext: "lnk",
      mime: "application/x.ms.shortcut"
      // Invented by us
    };
  }
  if (check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0])) {
    return {
      ext: "alias",
      mime: "application/x.apple.alias"
      // Invented by us
    };
  }
  if (check([76, 80], { offset: 34 }) && (check([0, 0, 1], { offset: 8 }) || check([1, 0, 2], { offset: 8 }) || check([2, 0, 2], { offset: 8 }))) {
    return {
      ext: "eot",
      mime: "application/vnd.ms-fontobject"
    };
  }
  if (check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29])) {
    return {
      ext: "indd",
      mime: "application/x-indesign"
    };
  }
  await tokenizer.peekBuffer(buffer, { length: Math.min(512, tokenizer.fileInfo.size), mayBeLess: true });
  if (tarHeaderChecksumMatches(buffer)) {
    return {
      ext: "tar",
      mime: "application/x-tar"
    };
  }
  if (check([255, 254, 255, 14, 83, 0, 107, 0, 101, 0, 116, 0, 99, 0, 104, 0, 85, 0, 112, 0, 32, 0, 77, 0, 111, 0, 100, 0, 101, 0, 108, 0])) {
    return {
      ext: "skp",
      mime: "application/vnd.sketchup.skp"
    };
  }
  if (checkString("-----BEGIN PGP MESSAGE-----")) {
    return {
      ext: "pgp",
      mime: "application/pgp-encrypted"
    };
  }
  if (buffer.length >= 2 && check([255, 224], { offset: 0, mask: [255, 224] })) {
    if (check([16], { offset: 1, mask: [22] })) {
      if (check([8], { offset: 1, mask: [8] })) {
        return {
          ext: "aac",
          mime: "audio/aac"
        };
      }
      return {
        ext: "aac",
        mime: "audio/aac"
      };
    }
    if (check([2], { offset: 1, mask: [6] })) {
      return {
        ext: "mp3",
        mime: "audio/mpeg"
      };
    }
    if (check([4], { offset: 1, mask: [6] })) {
      return {
        ext: "mp2",
        mime: "audio/mpeg"
      };
    }
    if (check([6], { offset: 1, mask: [6] })) {
      return {
        ext: "mp1",
        mime: "audio/mpeg"
      };
    }
  }
}
const stream$1 = (readableStream) => new Promise((resolve, reject) => {
  const stream = eval("require")("stream");
  readableStream.on("error", reject);
  readableStream.once("readable", async () => {
    const pass = new stream.PassThrough();
    let outputStream;
    if (stream.pipeline) {
      outputStream = stream.pipeline(readableStream, pass, () => {
      });
    } else {
      outputStream = readableStream.pipe(pass);
    }
    const chunk = readableStream.read(minimumBytes) || readableStream.read() || Buffer.alloc(0);
    try {
      const fileType2 = await fromBuffer(chunk);
      pass.fileType = fileType2;
    } catch (error) {
      reject(error);
    }
    resolve(outputStream);
  });
});
const fileType = {
  fromStream,
  fromTokenizer,
  fromBuffer,
  stream: stream$1
};
Object.defineProperty(fileType, "extensions", {
  get() {
    return new Set(supported.extensions);
  }
});
Object.defineProperty(fileType, "mimeTypes", {
  get() {
    return new Set(supported.mimeTypes);
  }
});
var core = fileType;
var contentType = {};
/*!
 * content-type
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
var QUOTE_REGEXP = /([\\"])/g;
var TYPE_REGEXP$1 = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
contentType.format = format$1;
contentType.parse = parse$2;
function format$1(obj) {
  if (!obj || typeof obj !== "object") {
    throw new TypeError("argument obj is required");
  }
  var parameters = obj.parameters;
  var type2 = obj.type;
  if (!type2 || !TYPE_REGEXP$1.test(type2)) {
    throw new TypeError("invalid type");
  }
  var string = type2;
  if (parameters && typeof parameters === "object") {
    var param;
    var params = Object.keys(parameters).sort();
    for (var i = 0; i < params.length; i++) {
      param = params[i];
      if (!TOKEN_REGEXP.test(param)) {
        throw new TypeError("invalid parameter name");
      }
      string += "; " + param + "=" + qstring(parameters[param]);
    }
  }
  return string;
}
function parse$2(string) {
  if (!string) {
    throw new TypeError("argument string is required");
  }
  var header = typeof string === "object" ? getcontenttype(string) : string;
  if (typeof header !== "string") {
    throw new TypeError("argument string is required to be a string");
  }
  var index = header.indexOf(";");
  var type2 = index !== -1 ? header.slice(0, index).trim() : header.trim();
  if (!TYPE_REGEXP$1.test(type2)) {
    throw new TypeError("invalid media type");
  }
  var obj = new ContentType$1(type2.toLowerCase());
  if (index !== -1) {
    var key;
    var match;
    var value;
    PARAM_REGEXP.lastIndex = index;
    while (match = PARAM_REGEXP.exec(header)) {
      if (match.index !== index) {
        throw new TypeError("invalid parameter format");
      }
      index += match[0].length;
      key = match[1].toLowerCase();
      value = match[2];
      if (value.charCodeAt(0) === 34) {
        value = value.slice(1, -1);
        if (value.indexOf("\\") !== -1) {
          value = value.replace(QESC_REGEXP, "$1");
        }
      }
      obj.parameters[key] = value;
    }
    if (index !== header.length) {
      throw new TypeError("invalid parameter format");
    }
  }
  return obj;
}
function getcontenttype(obj) {
  var header;
  if (typeof obj.getHeader === "function") {
    header = obj.getHeader("content-type");
  } else if (typeof obj.headers === "object") {
    header = obj.headers && obj.headers["content-type"];
  }
  if (typeof header !== "string") {
    throw new TypeError("content-type header is missing from object");
  }
  return header;
}
function qstring(val) {
  var str = String(val);
  if (TOKEN_REGEXP.test(str)) {
    return str;
  }
  if (str.length > 0 && !TEXT_REGEXP.test(str)) {
    throw new TypeError("invalid parameter value");
  }
  return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
}
function ContentType$1(type2) {
  this.parameters = /* @__PURE__ */ Object.create(null);
  this.type = type2;
}
var mediaTyper = {};
/*!
 * media-typer
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */
var SUBTYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
var TYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
var TYPE_REGEXP = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
mediaTyper.format = format;
mediaTyper.parse = parse$1;
mediaTyper.test = test;
function format(obj) {
  if (!obj || typeof obj !== "object") {
    throw new TypeError("argument obj is required");
  }
  var subtype = obj.subtype;
  var suffix = obj.suffix;
  var type2 = obj.type;
  if (!type2 || !TYPE_NAME_REGEXP.test(type2)) {
    throw new TypeError("invalid type");
  }
  if (!subtype || !SUBTYPE_NAME_REGEXP.test(subtype)) {
    throw new TypeError("invalid subtype");
  }
  var string = type2 + "/" + subtype;
  if (suffix) {
    if (!TYPE_NAME_REGEXP.test(suffix)) {
      throw new TypeError("invalid suffix");
    }
    string += "+" + suffix;
  }
  return string;
}
function test(string) {
  if (!string) {
    throw new TypeError("argument string is required");
  }
  if (typeof string !== "string") {
    throw new TypeError("argument string is required to be a string");
  }
  return TYPE_REGEXP.test(string.toLowerCase());
}
function parse$1(string) {
  if (!string) {
    throw new TypeError("argument string is required");
  }
  if (typeof string !== "string") {
    throw new TypeError("argument string is required to be a string");
  }
  var match = TYPE_REGEXP.exec(string.toLowerCase());
  if (!match) {
    throw new TypeError("invalid media type");
  }
  var type2 = match[1];
  var subtype = match[2];
  var suffix;
  var index = subtype.lastIndexOf("+");
  if (index !== -1) {
    suffix = subtype.substr(index + 1);
    subtype = subtype.substr(0, index);
  }
  return new MediaType(type2, subtype, suffix);
}
function MediaType(type2, subtype, suffix) {
  this.type = type2;
  this.subtype = subtype;
  this.suffix = suffix;
}
var MetadataCollector$1 = {};
var type = {};
var types = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.TrackType = exports.TargetType = exports.DataType = void 0;
  (function(DataType) {
    DataType[DataType["string"] = 0] = "string";
    DataType[DataType["uint"] = 1] = "uint";
    DataType[DataType["uid"] = 2] = "uid";
    DataType[DataType["bool"] = 3] = "bool";
    DataType[DataType["binary"] = 4] = "binary";
    DataType[DataType["float"] = 5] = "float";
  })(exports.DataType || (exports.DataType = {}));
  (function(TargetType) {
    TargetType[TargetType["shot"] = 10] = "shot";
    TargetType[TargetType["scene"] = 20] = "scene";
    TargetType[TargetType["track"] = 30] = "track";
    TargetType[TargetType["part"] = 40] = "part";
    TargetType[TargetType["album"] = 50] = "album";
    TargetType[TargetType["edition"] = 60] = "edition";
    TargetType[TargetType["collection"] = 70] = "collection";
  })(exports.TargetType || (exports.TargetType = {}));
  (function(TrackType) {
    TrackType[TrackType["video"] = 1] = "video";
    TrackType[TrackType["audio"] = 2] = "audio";
    TrackType[TrackType["complex"] = 3] = "complex";
    TrackType[TrackType["logo"] = 4] = "logo";
    TrackType[TrackType["subtitle"] = 17] = "subtitle";
    TrackType[TrackType["button"] = 18] = "button";
    TrackType[TrackType["control"] = 32] = "control";
  })(exports.TrackType || (exports.TrackType = {}));
})(types);
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.TrackType = void 0;
  var types_12 = types;
  Object.defineProperty(exports, "TrackType", { enumerable: true, get: function() {
    return types_12.TrackType;
  } });
})(type);
var GenericTagTypes = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isUnique = exports.isSingleton = exports.commonTags = void 0;
  exports.commonTags = {
    year: { multiple: false },
    track: { multiple: false },
    disk: { multiple: false },
    title: { multiple: false },
    artist: { multiple: false },
    artists: { multiple: true, unique: true },
    albumartist: { multiple: false },
    album: { multiple: false },
    date: { multiple: false },
    originaldate: { multiple: false },
    originalyear: { multiple: false },
    comment: { multiple: true, unique: false },
    genre: { multiple: true, unique: true },
    picture: { multiple: true, unique: true },
    composer: { multiple: true, unique: true },
    lyrics: { multiple: true, unique: false },
    albumsort: { multiple: false, unique: true },
    titlesort: { multiple: false, unique: true },
    work: { multiple: false, unique: true },
    artistsort: { multiple: false, unique: true },
    albumartistsort: { multiple: false, unique: true },
    composersort: { multiple: false, unique: true },
    lyricist: { multiple: true, unique: true },
    writer: { multiple: true, unique: true },
    conductor: { multiple: true, unique: true },
    remixer: { multiple: true, unique: true },
    arranger: { multiple: true, unique: true },
    engineer: { multiple: true, unique: true },
    producer: { multiple: true, unique: true },
    technician: { multiple: true, unique: true },
    djmixer: { multiple: true, unique: true },
    mixer: { multiple: true, unique: true },
    label: { multiple: true, unique: true },
    grouping: { multiple: false },
    subtitle: { multiple: true },
    discsubtitle: { multiple: false },
    totaltracks: { multiple: false },
    totaldiscs: { multiple: false },
    compilation: { multiple: false },
    rating: { multiple: true },
    bpm: { multiple: false },
    mood: { multiple: false },
    media: { multiple: false },
    catalognumber: { multiple: true, unique: true },
    tvShow: { multiple: false },
    tvShowSort: { multiple: false },
    tvSeason: { multiple: false },
    tvEpisode: { multiple: false },
    tvEpisodeId: { multiple: false },
    tvNetwork: { multiple: false },
    podcast: { multiple: false },
    podcasturl: { multiple: false },
    releasestatus: { multiple: false },
    releasetype: { multiple: true },
    releasecountry: { multiple: false },
    script: { multiple: false },
    language: { multiple: false },
    copyright: { multiple: false },
    license: { multiple: false },
    encodedby: { multiple: false },
    encodersettings: { multiple: false },
    gapless: { multiple: false },
    barcode: { multiple: false },
    isrc: { multiple: true },
    asin: { multiple: false },
    musicbrainz_recordingid: { multiple: false },
    musicbrainz_trackid: { multiple: false },
    musicbrainz_albumid: { multiple: false },
    musicbrainz_artistid: { multiple: true },
    musicbrainz_albumartistid: { multiple: true },
    musicbrainz_releasegroupid: { multiple: false },
    musicbrainz_workid: { multiple: false },
    musicbrainz_trmid: { multiple: false },
    musicbrainz_discid: { multiple: false },
    acoustid_id: { multiple: false },
    acoustid_fingerprint: { multiple: false },
    musicip_puid: { multiple: false },
    musicip_fingerprint: { multiple: false },
    website: { multiple: false },
    "performer:instrument": { multiple: true, unique: true },
    averageLevel: { multiple: false },
    peakLevel: { multiple: false },
    notes: { multiple: true, unique: false },
    key: { multiple: false },
    originalalbum: { multiple: false },
    originalartist: { multiple: false },
    discogs_artist_id: { multiple: true, unique: true },
    discogs_release_id: { multiple: false },
    discogs_label_id: { multiple: false },
    discogs_master_release_id: { multiple: false },
    discogs_votes: { multiple: false },
    discogs_rating: { multiple: false },
    replaygain_track_peak: { multiple: false },
    replaygain_track_gain: { multiple: false },
    replaygain_album_peak: { multiple: false },
    replaygain_album_gain: { multiple: false },
    replaygain_track_minmax: { multiple: false },
    replaygain_album_minmax: { multiple: false },
    replaygain_undo: { multiple: false },
    description: { multiple: true },
    longDescription: { multiple: false },
    category: { multiple: true },
    hdVideo: { multiple: false },
    keywords: { multiple: true },
    movement: { multiple: false },
    movementIndex: { multiple: false },
    movementTotal: { multiple: false },
    podcastId: { multiple: false },
    showMovement: { multiple: false },
    stik: { multiple: false }
  };
  function isSingleton(alias) {
    return exports.commonTags.hasOwnProperty(alias) && !exports.commonTags[alias].multiple;
  }
  exports.isSingleton = isSingleton;
  function isUnique(alias) {
    return !exports.commonTags[alias].multiple || exports.commonTags[alias].unique;
  }
  exports.isUnique = isUnique;
})(GenericTagTypes);
var CombinedTagMapper$1 = {};
var ID3v1TagMap = {};
var GenericTagMapper = {};
Object.defineProperty(GenericTagMapper, "__esModule", { value: true });
GenericTagMapper.CommonTagMapper = void 0;
class CommonTagMapper {
  static toIntOrNull(str) {
    const cleaned = parseInt(str, 10);
    return isNaN(cleaned) ? null : cleaned;
  }
  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  static normalizeTrack(origVal) {
    const split = origVal.toString().split("/");
    return {
      no: parseInt(split[0], 10) || null,
      of: parseInt(split[1], 10) || null
    };
  }
  constructor(tagTypes, tagMap2) {
    this.tagTypes = tagTypes;
    this.tagMap = tagMap2;
  }
  /**
   * Process and set common tags
   * write common tags to
   * @param tag Native tag
   * @param warnings Register warnings
   * @return common name
   */
  mapGenericTag(tag, warnings) {
    tag = { id: tag.id, value: tag.value };
    this.postMap(tag, warnings);
    const id = this.getCommonName(tag.id);
    return id ? { id, value: tag.value } : null;
  }
  /**
   * Convert native tag key to common tag key
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  getCommonName(tag) {
    return this.tagMap[tag];
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag Tag e.g. {"©alb", "Buena Vista Social Club")
   * @param warnings Used to register warnings
   */
  postMap(tag, warnings) {
    return;
  }
}
CommonTagMapper.maxRatingScore = 1;
GenericTagMapper.CommonTagMapper = CommonTagMapper;
Object.defineProperty(ID3v1TagMap, "__esModule", { value: true });
ID3v1TagMap.ID3v1TagMapper = void 0;
const GenericTagMapper_1$6 = GenericTagMapper;
const id3v1TagMap = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  comment: "comment",
  track: "track",
  genre: "genre"
};
class ID3v1TagMapper extends GenericTagMapper_1$6.CommonTagMapper {
  constructor() {
    super(["ID3v1"], id3v1TagMap);
  }
}
ID3v1TagMap.ID3v1TagMapper = ID3v1TagMapper;
var ID3v24TagMapper$1 = {};
var CaseInsensitiveTagMap$1 = {};
Object.defineProperty(CaseInsensitiveTagMap$1, "__esModule", { value: true });
CaseInsensitiveTagMap$1.CaseInsensitiveTagMap = void 0;
const GenericTagMapper_1$5 = GenericTagMapper;
class CaseInsensitiveTagMap extends GenericTagMapper_1$5.CommonTagMapper {
  constructor(tagTypes, tagMap2) {
    const upperCaseMap = {};
    for (const tag of Object.keys(tagMap2)) {
      upperCaseMap[tag.toUpperCase()] = tagMap2[tag];
    }
    super(tagTypes, upperCaseMap);
  }
  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  getCommonName(tag) {
    return this.tagMap[tag.toUpperCase()];
  }
}
CaseInsensitiveTagMap$1.CaseInsensitiveTagMap = CaseInsensitiveTagMap;
var Util = {};
Object.defineProperty(Util, "__esModule", { value: true });
Util.toRatio = Util.dbToRatio = Util.ratioToDb = Util.a2hex = Util.isBitSet = Util.getBitAllignedNumber = Util.stripNulls = Util.decodeString = Util.trimRightNull = Util.findZero = Util.getBit = void 0;
function getBit(buf, off, bit) {
  return (buf[off] & 1 << bit) !== 0;
}
Util.getBit = getBit;
function findZero(uint8Array, start, end, encoding) {
  let i = start;
  if (encoding === "utf16le") {
    while (uint8Array[i] !== 0 || uint8Array[i + 1] !== 0) {
      if (i >= end)
        return end;
      i += 2;
    }
    return i;
  } else {
    while (uint8Array[i] !== 0) {
      if (i >= end)
        return end;
      i++;
    }
    return i;
  }
}
Util.findZero = findZero;
function trimRightNull(x) {
  const pos0 = x.indexOf("\0");
  return pos0 === -1 ? x : x.substr(0, pos0);
}
Util.trimRightNull = trimRightNull;
function swapBytes(uint8Array) {
  const l = uint8Array.length;
  if ((l & 1) !== 0)
    throw new Error("Buffer length must be even");
  for (let i = 0; i < l; i += 2) {
    const a = uint8Array[i];
    uint8Array[i] = uint8Array[i + 1];
    uint8Array[i + 1] = a;
  }
  return uint8Array;
}
function decodeString(uint8Array, encoding) {
  if (uint8Array[0] === 255 && uint8Array[1] === 254) {
    return decodeString(uint8Array.subarray(2), encoding);
  } else if (encoding === "utf16le" && uint8Array[0] === 254 && uint8Array[1] === 255) {
    if ((uint8Array.length & 1) !== 0)
      throw new Error("Expected even number of octets for 16-bit unicode string");
    return decodeString(swapBytes(uint8Array), encoding);
  }
  return Buffer.from(uint8Array).toString(encoding);
}
Util.decodeString = decodeString;
function stripNulls(str) {
  str = str.replace(/^\x00+/g, "");
  str = str.replace(/\x00+$/g, "");
  return str;
}
Util.stripNulls = stripNulls;
function getBitAllignedNumber(source, byteOffset, bitOffset, len) {
  const byteOff = byteOffset + ~~(bitOffset / 8);
  const bitOff = bitOffset % 8;
  let value = source[byteOff];
  value &= 255 >> bitOff;
  const bitsRead = 8 - bitOff;
  const bitsLeft = len - bitsRead;
  if (bitsLeft < 0) {
    value >>= 8 - bitOff - len;
  } else if (bitsLeft > 0) {
    value <<= bitsLeft;
    value |= getBitAllignedNumber(source, byteOffset, bitOffset + bitsRead, bitsLeft);
  }
  return value;
}
Util.getBitAllignedNumber = getBitAllignedNumber;
function isBitSet(source, byteOffset, bitOffset) {
  return getBitAllignedNumber(source, byteOffset, bitOffset, 1) === 1;
}
Util.isBitSet = isBitSet;
function a2hex(str) {
  const arr = [];
  for (let i = 0, l = str.length; i < l; i++) {
    const hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex.length === 1 ? "0" + hex : hex);
  }
  return arr.join(" ");
}
Util.a2hex = a2hex;
function ratioToDb(ratio) {
  return 10 * Math.log10(ratio);
}
Util.ratioToDb = ratioToDb;
function dbToRatio(dB) {
  return Math.pow(10, dB / 10);
}
Util.dbToRatio = dbToRatio;
function toRatio(value) {
  const ps = value.split(" ").map((p) => p.trim().toLowerCase());
  if (ps.length >= 1) {
    const v = parseFloat(ps[0]);
    return ps.length === 2 && ps[1] === "db" ? {
      dB: v,
      ratio: dbToRatio(v)
    } : {
      dB: ratioToDb(v),
      ratio: v
    };
  }
}
Util.toRatio = toRatio;
Object.defineProperty(ID3v24TagMapper$1, "__esModule", { value: true });
ID3v24TagMapper$1.ID3v24TagMapper = void 0;
const GenericTagMapper_1$4 = GenericTagMapper;
const CaseInsensitiveTagMap_1$2 = CaseInsensitiveTagMap$1;
const util$a = Util;
const id3v24TagMap = {
  // id3v2.3
  TIT2: "title",
  TPE1: "artist",
  "TXXX:Artists": "artists",
  TPE2: "albumartist",
  TALB: "album",
  TDRV: "date",
  /**
   * Original release year
   */
  TORY: "originalyear",
  TPOS: "disk",
  TCON: "genre",
  APIC: "picture",
  TCOM: "composer",
  "USLT:description": "lyrics",
  TSOA: "albumsort",
  TSOT: "titlesort",
  TOAL: "originalalbum",
  TSOP: "artistsort",
  TSO2: "albumartistsort",
  TSOC: "composersort",
  TEXT: "lyricist",
  "TXXX:Writer": "writer",
  TPE3: "conductor",
  // 'IPLS:instrument': 'performer:instrument', // ToDo
  TPE4: "remixer",
  "IPLS:arranger": "arranger",
  "IPLS:engineer": "engineer",
  "IPLS:producer": "producer",
  "IPLS:DJ-mix": "djmixer",
  "IPLS:mix": "mixer",
  TPUB: "label",
  TIT1: "grouping",
  TIT3: "subtitle",
  TRCK: "track",
  TCMP: "compilation",
  POPM: "rating",
  TBPM: "bpm",
  TMED: "media",
  "TXXX:CATALOGNUMBER": "catalognumber",
  "TXXX:MusicBrainz Album Status": "releasestatus",
  "TXXX:MusicBrainz Album Type": "releasetype",
  /**
   * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
   */
  "TXXX:MusicBrainz Album Release Country": "releasecountry",
  /**
   * Release country as implemented // ToDo: report
   */
  "TXXX:RELEASECOUNTRY": "releasecountry",
  "TXXX:SCRIPT": "script",
  TLAN: "language",
  TCOP: "copyright",
  WCOP: "license",
  TENC: "encodedby",
  TSSE: "encodersettings",
  "TXXX:BARCODE": "barcode",
  "TXXX:ISRC": "isrc",
  TSRC: "isrc",
  "TXXX:ASIN": "asin",
  "TXXX:originalyear": "originalyear",
  "UFID:http://musicbrainz.org": "musicbrainz_recordingid",
  "TXXX:MusicBrainz Release Track Id": "musicbrainz_trackid",
  "TXXX:MusicBrainz Album Id": "musicbrainz_albumid",
  "TXXX:MusicBrainz Artist Id": "musicbrainz_artistid",
  "TXXX:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
  "TXXX:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
  "TXXX:MusicBrainz Work Id": "musicbrainz_workid",
  "TXXX:MusicBrainz TRM Id": "musicbrainz_trmid",
  "TXXX:MusicBrainz Disc Id": "musicbrainz_discid",
  "TXXX:ACOUSTID_ID": "acoustid_id",
  "TXXX:Acoustid Id": "acoustid_id",
  "TXXX:Acoustid Fingerprint": "acoustid_fingerprint",
  "TXXX:MusicIP PUID": "musicip_puid",
  "TXXX:MusicMagic Fingerprint": "musicip_fingerprint",
  WOAR: "website",
  // id3v2.4
  // ToDo: In same sequence as defined at http://id3.org/id3v2.4.0-frames
  TDRC: "date",
  TYER: "year",
  TDOR: "originaldate",
  // 'TMCL:instrument': 'performer:instrument',
  "TIPL:arranger": "arranger",
  "TIPL:engineer": "engineer",
  "TIPL:producer": "producer",
  "TIPL:DJ-mix": "djmixer",
  "TIPL:mix": "mixer",
  TMOO: "mood",
  // additional mappings:
  SYLT: "lyrics",
  TSST: "discsubtitle",
  TKEY: "key",
  COMM: "comment",
  TOPE: "originalartist",
  // Windows Media Player
  "PRIV:AverageLevel": "averageLevel",
  "PRIV:PeakLevel": "peakLevel",
  // Discogs
  "TXXX:DISCOGS_ARTIST_ID": "discogs_artist_id",
  "TXXX:DISCOGS_ARTISTS": "artists",
  "TXXX:DISCOGS_ARTIST_NAME": "artists",
  "TXXX:DISCOGS_ALBUM_ARTISTS": "albumartist",
  "TXXX:DISCOGS_CATALOG": "catalognumber",
  "TXXX:DISCOGS_COUNTRY": "releasecountry",
  "TXXX:DISCOGS_DATE": "originaldate",
  "TXXX:DISCOGS_LABEL": "label",
  "TXXX:DISCOGS_LABEL_ID": "discogs_label_id",
  "TXXX:DISCOGS_MASTER_RELEASE_ID": "discogs_master_release_id",
  "TXXX:DISCOGS_RATING": "discogs_rating",
  "TXXX:DISCOGS_RELEASED": "date",
  "TXXX:DISCOGS_RELEASE_ID": "discogs_release_id",
  "TXXX:DISCOGS_VOTES": "discogs_votes",
  "TXXX:CATALOGID": "catalognumber",
  "TXXX:STYLE": "genre",
  "TXXX:REPLAYGAIN_TRACK_PEAK": "replaygain_track_peak",
  "TXXX:REPLAYGAIN_TRACK_GAIN": "replaygain_track_gain",
  "TXXX:REPLAYGAIN_ALBUM_PEAK": "replaygain_album_peak",
  "TXXX:REPLAYGAIN_ALBUM_GAIN": "replaygain_album_gain",
  "TXXX:MP3GAIN_MINMAX": "replaygain_track_minmax",
  "TXXX:MP3GAIN_ALBUM_MINMAX": "replaygain_album_minmax",
  "TXXX:MP3GAIN_UNDO": "replaygain_undo",
  MVNM: "movement",
  MVIN: "movementIndex",
  PCST: "podcast",
  TCAT: "category",
  TDES: "description",
  TDRL: "date",
  TGID: "podcastId",
  TKWD: "keywords",
  WFED: "podcasturl"
};
class ID3v24TagMapper extends CaseInsensitiveTagMap_1$2.CaseInsensitiveTagMap {
  static toRating(popm) {
    return {
      source: popm.email,
      rating: popm.rating > 0 ? (popm.rating - 1) / 254 * GenericTagMapper_1$4.CommonTagMapper.maxRatingScore : void 0
    };
  }
  constructor() {
    super(["ID3v2.3", "ID3v2.4"], id3v24TagMap);
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag to post map
   * @param warnings Wil be used to register (collect) warnings
   * @return Common value e.g. "Buena Vista Social Club"
   */
  postMap(tag, warnings) {
    switch (tag.id) {
      case "UFID":
        if (tag.value.owner_identifier === "http://musicbrainz.org") {
          tag.id += ":" + tag.value.owner_identifier;
          tag.value = util$a.decodeString(tag.value.identifier, "latin1");
        }
        break;
      case "PRIV":
        switch (tag.value.owner_identifier) {
          case "AverageLevel":
          case "PeakValue":
            tag.id += ":" + tag.value.owner_identifier;
            tag.value = tag.value.data.length === 4 ? tag.value.data.readUInt32LE(0) : null;
            if (tag.value === null) {
              warnings.addWarning(`Failed to parse PRIV:PeakValue`);
            }
            break;
          default:
            warnings.addWarning(`Unknown PRIV owner-identifier: ${tag.value.owner_identifier}`);
        }
        break;
      case "COMM":
        tag.value = tag.value ? tag.value.text : null;
        break;
      case "POPM":
        tag.value = ID3v24TagMapper.toRating(tag.value);
        break;
    }
  }
}
ID3v24TagMapper$1.ID3v24TagMapper = ID3v24TagMapper;
var AsfTagMapper$1 = {};
Object.defineProperty(AsfTagMapper$1, "__esModule", { value: true });
AsfTagMapper$1.AsfTagMapper = void 0;
const GenericTagMapper_1$3 = GenericTagMapper;
const asfTagMap = {
  Title: "title",
  Author: "artist",
  "WM/AlbumArtist": "albumartist",
  "WM/AlbumTitle": "album",
  "WM/Year": "date",
  "WM/OriginalReleaseTime": "originaldate",
  "WM/OriginalReleaseYear": "originalyear",
  Description: "comment",
  "WM/TrackNumber": "track",
  "WM/PartOfSet": "disk",
  "WM/Genre": "genre",
  "WM/Composer": "composer",
  "WM/Lyrics": "lyrics",
  "WM/AlbumSortOrder": "albumsort",
  "WM/TitleSortOrder": "titlesort",
  "WM/ArtistSortOrder": "artistsort",
  "WM/AlbumArtistSortOrder": "albumartistsort",
  "WM/ComposerSortOrder": "composersort",
  "WM/Writer": "lyricist",
  "WM/Conductor": "conductor",
  "WM/ModifiedBy": "remixer",
  "WM/Engineer": "engineer",
  "WM/Producer": "producer",
  "WM/DJMixer": "djmixer",
  "WM/Mixer": "mixer",
  "WM/Publisher": "label",
  "WM/ContentGroupDescription": "grouping",
  "WM/SubTitle": "subtitle",
  "WM/SetSubTitle": "discsubtitle",
  // 'WM/PartOfSet': 'totaldiscs',
  "WM/IsCompilation": "compilation",
  "WM/SharedUserRating": "rating",
  "WM/BeatsPerMinute": "bpm",
  "WM/Mood": "mood",
  "WM/Media": "media",
  "WM/CatalogNo": "catalognumber",
  "MusicBrainz/Album Status": "releasestatus",
  "MusicBrainz/Album Type": "releasetype",
  "MusicBrainz/Album Release Country": "releasecountry",
  "WM/Script": "script",
  "WM/Language": "language",
  Copyright: "copyright",
  LICENSE: "license",
  "WM/EncodedBy": "encodedby",
  "WM/EncodingSettings": "encodersettings",
  "WM/Barcode": "barcode",
  "WM/ISRC": "isrc",
  "MusicBrainz/Track Id": "musicbrainz_recordingid",
  "MusicBrainz/Release Track Id": "musicbrainz_trackid",
  "MusicBrainz/Album Id": "musicbrainz_albumid",
  "MusicBrainz/Artist Id": "musicbrainz_artistid",
  "MusicBrainz/Album Artist Id": "musicbrainz_albumartistid",
  "MusicBrainz/Release Group Id": "musicbrainz_releasegroupid",
  "MusicBrainz/Work Id": "musicbrainz_workid",
  "MusicBrainz/TRM Id": "musicbrainz_trmid",
  "MusicBrainz/Disc Id": "musicbrainz_discid",
  "Acoustid/Id": "acoustid_id",
  "Acoustid/Fingerprint": "acoustid_fingerprint",
  "MusicIP/PUID": "musicip_puid",
  "WM/ARTISTS": "artists",
  "WM/InitialKey": "key",
  ASIN: "asin",
  "WM/Work": "work",
  "WM/AuthorURL": "website",
  "WM/Picture": "picture"
};
class AsfTagMapper extends GenericTagMapper_1$3.CommonTagMapper {
  static toRating(rating) {
    return {
      rating: parseFloat(rating + 1) / 5
    };
  }
  constructor() {
    super(["asf"], asfTagMap);
  }
  postMap(tag) {
    switch (tag.id) {
      case "WM/SharedUserRating":
        const keys = tag.id.split(":");
        tag.value = AsfTagMapper.toRating(tag.value);
        tag.id = keys[0];
        break;
    }
  }
}
AsfTagMapper$1.AsfTagMapper = AsfTagMapper;
var ID3v22TagMapper = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ID3v22TagMapper = exports.id3v22TagMap = void 0;
  const CaseInsensitiveTagMap_12 = CaseInsensitiveTagMap$1;
  exports.id3v22TagMap = {
    TT2: "title",
    TP1: "artist",
    TP2: "albumartist",
    TAL: "album",
    TYE: "year",
    COM: "comment",
    TRK: "track",
    TPA: "disk",
    TCO: "genre",
    PIC: "picture",
    TCM: "composer",
    TOR: "originaldate",
    TOT: "originalalbum",
    TXT: "lyricist",
    TP3: "conductor",
    TPB: "label",
    TT1: "grouping",
    TT3: "subtitle",
    TLA: "language",
    TCR: "copyright",
    WCP: "license",
    TEN: "encodedby",
    TSS: "encodersettings",
    WAR: "website",
    "COM:iTunPGAP": "gapless",
    PCS: "podcast",
    TCP: "compilation",
    TDR: "date",
    TS2: "albumartistsort",
    TSA: "albumsort",
    TSC: "composersort",
    TSP: "artistsort",
    TST: "titlesort",
    WFD: "podcasturl",
    TBP: "bpm"
  };
  class ID3v22TagMapper2 extends CaseInsensitiveTagMap_12.CaseInsensitiveTagMap {
    constructor() {
      super(["ID3v2.2"], exports.id3v22TagMap);
    }
  }
  exports.ID3v22TagMapper = ID3v22TagMapper2;
})(ID3v22TagMapper);
var APEv2TagMapper$1 = {};
Object.defineProperty(APEv2TagMapper$1, "__esModule", { value: true });
APEv2TagMapper$1.APEv2TagMapper = void 0;
const CaseInsensitiveTagMap_1$1 = CaseInsensitiveTagMap$1;
const apev2TagMap = {
  Title: "title",
  Artist: "artist",
  Artists: "artists",
  "Album Artist": "albumartist",
  Album: "album",
  Year: "date",
  Originalyear: "originalyear",
  Originaldate: "originaldate",
  Comment: "comment",
  Track: "track",
  Disc: "disk",
  DISCNUMBER: "disk",
  Genre: "genre",
  "Cover Art (Front)": "picture",
  "Cover Art (Back)": "picture",
  Composer: "composer",
  Lyrics: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  Lyricist: "lyricist",
  Writer: "writer",
  Conductor: "conductor",
  // 'Performer=artist (instrument)': 'performer:instrument',
  MixArtist: "remixer",
  Arranger: "arranger",
  Engineer: "engineer",
  Producer: "producer",
  DJMixer: "djmixer",
  Mixer: "mixer",
  Label: "label",
  Grouping: "grouping",
  Subtitle: "subtitle",
  DiscSubtitle: "discsubtitle",
  Compilation: "compilation",
  BPM: "bpm",
  Mood: "mood",
  Media: "media",
  CatalogNumber: "catalognumber",
  MUSICBRAINZ_ALBUMSTATUS: "releasestatus",
  MUSICBRAINZ_ALBUMTYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  Script: "script",
  Language: "language",
  Copyright: "copyright",
  LICENSE: "license",
  EncodedBy: "encodedby",
  EncoderSettings: "encodersettings",
  Barcode: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  musicbrainz_trackid: "musicbrainz_recordingid",
  musicbrainz_releasetrackid: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  Acoustid_Id: "acoustid_id",
  ACOUSTID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  Weblink: "website",
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  MP3GAIN_MINMAX: "replaygain_track_minmax",
  MP3GAIN_UNDO: "replaygain_undo"
};
class APEv2TagMapper extends CaseInsensitiveTagMap_1$1.CaseInsensitiveTagMap {
  constructor() {
    super(["APEv2"], apev2TagMap);
  }
}
APEv2TagMapper$1.APEv2TagMapper = APEv2TagMapper;
var MP4TagMapper = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.MP4TagMapper = exports.tagType = void 0;
  const CaseInsensitiveTagMap_12 = CaseInsensitiveTagMap$1;
  const mp4TagMap = {
    "©nam": "title",
    "©ART": "artist",
    aART: "albumartist",
    /**
     * ToDo: Album artist seems to be stored here while Picard documentation says: aART
     */
    "----:com.apple.iTunes:Band": "albumartist",
    "©alb": "album",
    "©day": "date",
    "©cmt": "comment",
    "©com": "comment",
    trkn: "track",
    disk: "disk",
    "©gen": "genre",
    covr: "picture",
    "©wrt": "composer",
    "©lyr": "lyrics",
    soal: "albumsort",
    sonm: "titlesort",
    soar: "artistsort",
    soaa: "albumartistsort",
    soco: "composersort",
    "----:com.apple.iTunes:LYRICIST": "lyricist",
    "----:com.apple.iTunes:CONDUCTOR": "conductor",
    "----:com.apple.iTunes:REMIXER": "remixer",
    "----:com.apple.iTunes:ENGINEER": "engineer",
    "----:com.apple.iTunes:PRODUCER": "producer",
    "----:com.apple.iTunes:DJMIXER": "djmixer",
    "----:com.apple.iTunes:MIXER": "mixer",
    "----:com.apple.iTunes:LABEL": "label",
    "©grp": "grouping",
    "----:com.apple.iTunes:SUBTITLE": "subtitle",
    "----:com.apple.iTunes:DISCSUBTITLE": "discsubtitle",
    cpil: "compilation",
    tmpo: "bpm",
    "----:com.apple.iTunes:MOOD": "mood",
    "----:com.apple.iTunes:MEDIA": "media",
    "----:com.apple.iTunes:CATALOGNUMBER": "catalognumber",
    tvsh: "tvShow",
    tvsn: "tvSeason",
    tves: "tvEpisode",
    sosn: "tvShowSort",
    tven: "tvEpisodeId",
    tvnn: "tvNetwork",
    pcst: "podcast",
    purl: "podcasturl",
    "----:com.apple.iTunes:MusicBrainz Album Status": "releasestatus",
    "----:com.apple.iTunes:MusicBrainz Album Type": "releasetype",
    "----:com.apple.iTunes:MusicBrainz Album Release Country": "releasecountry",
    "----:com.apple.iTunes:SCRIPT": "script",
    "----:com.apple.iTunes:LANGUAGE": "language",
    cprt: "copyright",
    "©cpy": "copyright",
    "----:com.apple.iTunes:LICENSE": "license",
    "©too": "encodedby",
    pgap: "gapless",
    "----:com.apple.iTunes:BARCODE": "barcode",
    "----:com.apple.iTunes:ISRC": "isrc",
    "----:com.apple.iTunes:ASIN": "asin",
    "----:com.apple.iTunes:NOTES": "comment",
    "----:com.apple.iTunes:MusicBrainz Track Id": "musicbrainz_recordingid",
    "----:com.apple.iTunes:MusicBrainz Release Track Id": "musicbrainz_trackid",
    "----:com.apple.iTunes:MusicBrainz Album Id": "musicbrainz_albumid",
    "----:com.apple.iTunes:MusicBrainz Artist Id": "musicbrainz_artistid",
    "----:com.apple.iTunes:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
    "----:com.apple.iTunes:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
    "----:com.apple.iTunes:MusicBrainz Work Id": "musicbrainz_workid",
    "----:com.apple.iTunes:MusicBrainz TRM Id": "musicbrainz_trmid",
    "----:com.apple.iTunes:MusicBrainz Disc Id": "musicbrainz_discid",
    "----:com.apple.iTunes:Acoustid Id": "acoustid_id",
    "----:com.apple.iTunes:Acoustid Fingerprint": "acoustid_fingerprint",
    "----:com.apple.iTunes:MusicIP PUID": "musicip_puid",
    "----:com.apple.iTunes:fingerprint": "musicip_fingerprint",
    "----:com.apple.iTunes:replaygain_track_gain": "replaygain_track_gain",
    "----:com.apple.iTunes:replaygain_track_peak": "replaygain_track_peak",
    "----:com.apple.iTunes:replaygain_album_gain": "replaygain_album_gain",
    "----:com.apple.iTunes:replaygain_album_peak": "replaygain_album_peak",
    "----:com.apple.iTunes:replaygain_track_minmax": "replaygain_track_minmax",
    "----:com.apple.iTunes:replaygain_album_minmax": "replaygain_album_minmax",
    "----:com.apple.iTunes:replaygain_undo": "replaygain_undo",
    // Additional mappings:
    gnre: "genre",
    "----:com.apple.iTunes:ALBUMARTISTSORT": "albumartistsort",
    "----:com.apple.iTunes:ARTISTS": "artists",
    "----:com.apple.iTunes:ORIGINALDATE": "originaldate",
    "----:com.apple.iTunes:ORIGINALYEAR": "originalyear",
    // '----:com.apple.iTunes:PERFORMER': 'performer'
    desc: "description",
    ldes: "longDescription",
    "©mvn": "movement",
    "©mvi": "movementIndex",
    "©mvc": "movementTotal",
    "©wrk": "work",
    catg: "category",
    egid: "podcastId",
    hdvd: "hdVideo",
    keyw: "keywords",
    shwm: "showMovement",
    stik: "stik",
    rate: "rating"
  };
  exports.tagType = "iTunes";
  class MP4TagMapper2 extends CaseInsensitiveTagMap_12.CaseInsensitiveTagMap {
    constructor() {
      super([exports.tagType], mp4TagMap);
    }
    postMap(tag, warnings) {
      switch (tag.id) {
        case "rate":
          tag.value = {
            source: void 0,
            rating: parseFloat(tag.value) / 100
          };
          break;
      }
    }
  }
  exports.MP4TagMapper = MP4TagMapper2;
})(MP4TagMapper);
var VorbisTagMapper$1 = {};
Object.defineProperty(VorbisTagMapper$1, "__esModule", { value: true });
VorbisTagMapper$1.VorbisTagMapper = void 0;
const GenericTagMapper_1$2 = GenericTagMapper;
const vorbisTagMap = {
  TITLE: "title",
  ARTIST: "artist",
  ARTISTS: "artists",
  ALBUMARTIST: "albumartist",
  "ALBUM ARTIST": "albumartist",
  ALBUM: "album",
  DATE: "date",
  ORIGINALDATE: "originaldate",
  ORIGINALYEAR: "originalyear",
  COMMENT: "comment",
  TRACKNUMBER: "track",
  DISCNUMBER: "disk",
  GENRE: "genre",
  METADATA_BLOCK_PICTURE: "picture",
  COMPOSER: "composer",
  LYRICS: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  LYRICIST: "lyricist",
  WRITER: "writer",
  CONDUCTOR: "conductor",
  // 'PERFORMER=artist (instrument)': 'performer:instrument', // ToDo
  REMIXER: "remixer",
  ARRANGER: "arranger",
  ENGINEER: "engineer",
  PRODUCER: "producer",
  DJMIXER: "djmixer",
  MIXER: "mixer",
  LABEL: "label",
  GROUPING: "grouping",
  SUBTITLE: "subtitle",
  DISCSUBTITLE: "discsubtitle",
  TRACKTOTAL: "totaltracks",
  DISCTOTAL: "totaldiscs",
  COMPILATION: "compilation",
  RATING: "rating",
  BPM: "bpm",
  KEY: "key",
  MOOD: "mood",
  MEDIA: "media",
  CATALOGNUMBER: "catalognumber",
  RELEASESTATUS: "releasestatus",
  RELEASETYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  SCRIPT: "script",
  LANGUAGE: "language",
  COPYRIGHT: "copyright",
  LICENSE: "license",
  ENCODEDBY: "encodedby",
  ENCODERSETTINGS: "encodersettings",
  BARCODE: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  MUSICBRAINZ_TRACKID: "musicbrainz_recordingid",
  MUSICBRAINZ_RELEASETRACKID: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  ACOUSTID_ID: "acoustid_id",
  ACOUSTID_ID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
  WEBSITE: "website",
  NOTES: "notes",
  TOTALTRACKS: "totaltracks",
  TOTALDISCS: "totaldiscs",
  // Discogs
  DISCOGS_ARTIST_ID: "discogs_artist_id",
  DISCOGS_ARTISTS: "artists",
  DISCOGS_ARTIST_NAME: "artists",
  DISCOGS_ALBUM_ARTISTS: "albumartist",
  DISCOGS_CATALOG: "catalognumber",
  DISCOGS_COUNTRY: "releasecountry",
  DISCOGS_DATE: "originaldate",
  DISCOGS_LABEL: "label",
  DISCOGS_LABEL_ID: "discogs_label_id",
  DISCOGS_MASTER_RELEASE_ID: "discogs_master_release_id",
  DISCOGS_RATING: "discogs_rating",
  DISCOGS_RELEASED: "date",
  DISCOGS_RELEASE_ID: "discogs_release_id",
  DISCOGS_VOTES: "discogs_votes",
  CATALOGID: "catalognumber",
  STYLE: "genre",
  //
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  REPLAYGAIN_ALBUM_GAIN: "replaygain_album_gain",
  REPLAYGAIN_ALBUM_PEAK: "replaygain_album_peak",
  // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
  REPLAYGAIN_MINMAX: "replaygain_track_minmax",
  REPLAYGAIN_ALBUM_MINMAX: "replaygain_album_minmax",
  REPLAYGAIN_UNDO: "replaygain_undo"
};
class VorbisTagMapper extends GenericTagMapper_1$2.CommonTagMapper {
  static toRating(email, rating, maxScore) {
    return {
      source: email ? email.toLowerCase() : email,
      rating: parseFloat(rating) / maxScore * GenericTagMapper_1$2.CommonTagMapper.maxRatingScore
    };
  }
  constructor() {
    super(["vorbis"], vorbisTagMap);
  }
  postMap(tag) {
    if (tag.id === "RATING") {
      tag.value = VorbisTagMapper.toRating(void 0, tag.value, 100);
    } else if (tag.id.indexOf("RATING:") === 0) {
      const keys = tag.id.split(":");
      tag.value = VorbisTagMapper.toRating(keys[1], tag.value, 1);
      tag.id = keys[0];
    }
  }
}
VorbisTagMapper$1.VorbisTagMapper = VorbisTagMapper;
var RiffInfoTagMap = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.RiffInfoTagMapper = exports.riffInfoTagMap = void 0;
  const GenericTagMapper_12 = GenericTagMapper;
  exports.riffInfoTagMap = {
    IART: "artist",
    ICRD: "date",
    INAM: "title",
    TITL: "title",
    IPRD: "album",
    ITRK: "track",
    IPRT: "track",
    COMM: "comment",
    ICMT: "comment",
    ICNT: "releasecountry",
    GNRE: "genre",
    IWRI: "writer",
    RATE: "rating",
    YEAR: "year",
    ISFT: "encodedby",
    CODE: "encodedby",
    TURL: "website",
    IGNR: "genre",
    IENG: "engineer",
    ITCH: "technician",
    IMED: "media",
    IRPD: "album"
    // Product, where the file was intended for
  };
  class RiffInfoTagMapper extends GenericTagMapper_12.CommonTagMapper {
    constructor() {
      super(["exif"], exports.riffInfoTagMap);
    }
  }
  exports.RiffInfoTagMapper = RiffInfoTagMapper;
})(RiffInfoTagMap);
var MatroskaTagMapper$1 = {};
Object.defineProperty(MatroskaTagMapper$1, "__esModule", { value: true });
MatroskaTagMapper$1.MatroskaTagMapper = void 0;
const CaseInsensitiveTagMap_1 = CaseInsensitiveTagMap$1;
const ebmlTagMap = {
  "segment:title": "title",
  "album:ARTIST": "albumartist",
  "album:ARTISTSORT": "albumartistsort",
  "album:TITLE": "album",
  "album:DATE_RECORDED": "originaldate",
  "album:PART_NUMBER": "disk",
  "album:TOTAL_PARTS": "totaltracks",
  "track:ARTIST": "artist",
  "track:ARTISTSORT": "artistsort",
  "track:TITLE": "title",
  "track:PART_NUMBER": "track",
  "track:MUSICBRAINZ_TRACKID": "musicbrainz_recordingid",
  "track:MUSICBRAINZ_ALBUMID": "musicbrainz_albumid",
  "track:MUSICBRAINZ_ARTISTID": "musicbrainz_artistid",
  "track:PUBLISHER": "label",
  "track:GENRE": "genre",
  "track:ENCODER": "encodedby",
  "track:ENCODER_OPTIONS": "encodersettings",
  "edition:TOTAL_PARTS": "totaldiscs",
  picture: "picture"
};
class MatroskaTagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
  constructor() {
    super(["matroska"], ebmlTagMap);
  }
}
MatroskaTagMapper$1.MatroskaTagMapper = MatroskaTagMapper;
var AiffTagMap = {};
Object.defineProperty(AiffTagMap, "__esModule", { value: true });
AiffTagMap.AiffTagMapper = void 0;
const GenericTagMapper_1$1 = GenericTagMapper;
const tagMap = {
  NAME: "title",
  AUTH: "artist",
  "(c) ": "copyright",
  ANNO: "comment"
};
class AiffTagMapper extends GenericTagMapper_1$1.CommonTagMapper {
  constructor() {
    super(["AIFF"], tagMap);
  }
}
AiffTagMap.AiffTagMapper = AiffTagMapper;
Object.defineProperty(CombinedTagMapper$1, "__esModule", { value: true });
CombinedTagMapper$1.CombinedTagMapper = void 0;
const ID3v1TagMap_1 = ID3v1TagMap;
const ID3v24TagMapper_1 = ID3v24TagMapper$1;
const AsfTagMapper_1 = AsfTagMapper$1;
const ID3v22TagMapper_1 = ID3v22TagMapper;
const APEv2TagMapper_1 = APEv2TagMapper$1;
const MP4TagMapper_1 = MP4TagMapper;
const VorbisTagMapper_1 = VorbisTagMapper$1;
const RiffInfoTagMap_1 = RiffInfoTagMap;
const MatroskaTagMapper_1 = MatroskaTagMapper$1;
const AiffTagMap_1 = AiffTagMap;
class CombinedTagMapper {
  constructor() {
    this.tagMappers = {};
    [
      new ID3v1TagMap_1.ID3v1TagMapper(),
      new ID3v22TagMapper_1.ID3v22TagMapper(),
      new ID3v24TagMapper_1.ID3v24TagMapper(),
      new MP4TagMapper_1.MP4TagMapper(),
      new MP4TagMapper_1.MP4TagMapper(),
      new VorbisTagMapper_1.VorbisTagMapper(),
      new APEv2TagMapper_1.APEv2TagMapper(),
      new AsfTagMapper_1.AsfTagMapper(),
      new RiffInfoTagMap_1.RiffInfoTagMapper(),
      new MatroskaTagMapper_1.MatroskaTagMapper(),
      new AiffTagMap_1.AiffTagMapper()
    ].forEach((mapper) => {
      this.registerTagMapper(mapper);
    });
  }
  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @param warnings
   * @return Generic tag result (output of this function)
   */
  mapTag(tagType, tag, warnings) {
    const tagMapper = this.tagMappers[tagType];
    if (tagMapper) {
      return this.tagMappers[tagType].mapGenericTag(tag, warnings);
    }
    throw new Error("No generic tag mapper defined for tag-format: " + tagType);
  }
  registerTagMapper(genericTagMapper) {
    for (const tagType of genericTagMapper.tagTypes) {
      this.tagMappers[tagType] = genericTagMapper;
    }
  }
}
CombinedTagMapper$1.CombinedTagMapper = CombinedTagMapper;
Object.defineProperty(MetadataCollector$1, "__esModule", { value: true });
MetadataCollector$1.joinArtists = MetadataCollector$1.MetadataCollector = void 0;
const type_1$2 = type;
const debug_1$n = srcExports;
const GenericTagTypes_1 = GenericTagTypes;
const CombinedTagMapper_1 = CombinedTagMapper$1;
const GenericTagMapper_1 = GenericTagMapper;
const Util_1$1 = Util;
const FileType$1 = core;
const debug$n = (0, debug_1$n.default)("music-metadata:collector");
const TagPriority = ["matroska", "APEv2", "vorbis", "ID3v2.4", "ID3v2.3", "ID3v2.2", "exif", "asf", "iTunes", "AIFF", "ID3v1"];
class MetadataCollector {
  constructor(opts) {
    this.opts = opts;
    this.format = {
      tagTypes: [],
      trackInfo: []
    };
    this.native = {};
    this.common = {
      track: { no: null, of: null },
      disk: { no: null, of: null },
      movementIndex: {}
    };
    this.quality = {
      warnings: []
    };
    this.commonOrigin = {};
    this.originPriority = {};
    this.tagMapper = new CombinedTagMapper_1.CombinedTagMapper();
    let priority = 1;
    for (const tagType of TagPriority) {
      this.originPriority[tagType] = priority++;
    }
    this.originPriority.artificial = 500;
    this.originPriority.id3v1 = 600;
  }
  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny() {
    return Object.keys(this.native).length > 0;
  }
  addStreamInfo(streamInfo) {
    debug$n(`streamInfo: type=${type_1$2.TrackType[streamInfo.type]}, codec=${streamInfo.codecName}`);
    this.format.trackInfo.push(streamInfo);
  }
  setFormat(key, value) {
    debug$n(`format: ${key} = ${value}`);
    this.format[key] = value;
    if (this.opts.observer) {
      this.opts.observer({ metadata: this, tag: { type: "format", id: key, value } });
    }
  }
  addTag(tagType, tagId, value) {
    debug$n(`tag ${tagType}.${tagId} = ${value}`);
    if (!this.native[tagType]) {
      this.format.tagTypes.push(tagType);
      this.native[tagType] = [];
    }
    this.native[tagType].push({ id: tagId, value });
    this.toCommon(tagType, tagId, value);
  }
  addWarning(warning) {
    this.quality.warnings.push({ message: warning });
  }
  postMap(tagType, tag) {
    switch (tag.id) {
      case "artist":
        if (this.commonOrigin.artist === this.originPriority[tagType]) {
          return this.postMap("artificial", { id: "artists", value: tag.value });
        }
        if (!this.common.artists) {
          this.setGenericTag("artificial", { id: "artists", value: tag.value });
        }
        break;
      case "artists":
        if (!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) {
          if (!this.common.artists || this.common.artists.indexOf(tag.value) === -1) {
            const artists = (this.common.artists || []).concat([tag.value]);
            const value = joinArtists(artists);
            const artistTag = { id: "artist", value };
            this.setGenericTag("artificial", artistTag);
          }
        }
        break;
      case "picture":
        this.postFixPicture(tag.value).then((picture) => {
          if (picture !== null) {
            tag.value = picture;
            this.setGenericTag(tagType, tag);
          }
        });
        return;
      case "totaltracks":
        this.common.track.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "totaldiscs":
        this.common.disk.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "movementTotal":
        this.common.movementIndex.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "track":
      case "disk":
      case "movementIndex":
        const of = this.common[tag.id].of;
        this.common[tag.id] = GenericTagMapper_1.CommonTagMapper.normalizeTrack(tag.value);
        this.common[tag.id].of = of != null ? of : this.common[tag.id].of;
        return;
      case "bpm":
      case "year":
      case "originalyear":
        tag.value = parseInt(tag.value, 10);
        break;
      case "date":
        const year = parseInt(tag.value.substr(0, 4), 10);
        if (!isNaN(year)) {
          this.common.year = year;
        }
        break;
      case "discogs_label_id":
      case "discogs_release_id":
      case "discogs_master_release_id":
      case "discogs_artist_id":
      case "discogs_votes":
        tag.value = typeof tag.value === "string" ? parseInt(tag.value, 10) : tag.value;
        break;
      case "replaygain_track_gain":
      case "replaygain_track_peak":
      case "replaygain_album_gain":
      case "replaygain_album_peak":
        tag.value = (0, Util_1$1.toRatio)(tag.value);
        break;
      case "replaygain_track_minmax":
        tag.value = tag.value.split(",").map((v) => parseInt(v, 10));
        break;
      case "replaygain_undo":
        const minMix = tag.value.split(",").map((v) => parseInt(v, 10));
        tag.value = {
          leftChannel: minMix[0],
          rightChannel: minMix[1]
        };
        break;
      case "gapless":
      case "compilation":
      case "podcast":
      case "showMovement":
        tag.value = tag.value === "1" || tag.value === 1;
        break;
      case "isrc":
        if (this.common[tag.id] && this.common[tag.id].indexOf(tag.value) !== -1)
          return;
        break;
    }
    if (tag.value !== null) {
      this.setGenericTag(tagType, tag);
    }
  }
  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  toCommonMetadata() {
    return {
      format: this.format,
      native: this.native,
      quality: this.quality,
      common: this.common
    };
  }
  /**
   * Fix some common issues with picture object
   * @param picture Picture
   */
  async postFixPicture(picture) {
    if (picture.data && picture.data.length > 0) {
      if (!picture.format) {
        const fileType2 = await FileType$1.fromBuffer(picture.data);
        if (fileType2) {
          picture.format = fileType2.mime;
        } else {
          return null;
        }
      }
      picture.format = picture.format.toLocaleLowerCase();
      switch (picture.format) {
        case "image/jpg":
          picture.format = "image/jpeg";
      }
      return picture;
    }
    this.addWarning(`Empty picture tag found`);
    return null;
  }
  /**
   * Convert native tag to common tags
   */
  toCommon(tagType, tagId, value) {
    const tag = { id: tagId, value };
    const genericTag = this.tagMapper.mapTag(tagType, tag, this);
    if (genericTag) {
      this.postMap(tagType, genericTag);
    }
  }
  /**
   * Set generic tag
   */
  setGenericTag(tagType, tag) {
    debug$n(`common.${tag.id} = ${tag.value}`);
    const prio0 = this.commonOrigin[tag.id] || 1e3;
    const prio1 = this.originPriority[tagType];
    if ((0, GenericTagTypes_1.isSingleton)(tag.id)) {
      if (prio1 <= prio0) {
        this.common[tag.id] = tag.value;
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug$n(`Ignore native tag (singleton): ${tagType}.${tag.id} = ${tag.value}`);
      }
    } else {
      if (prio1 === prio0) {
        if (!(0, GenericTagTypes_1.isUnique)(tag.id) || this.common[tag.id].indexOf(tag.value) === -1) {
          this.common[tag.id].push(tag.value);
        } else {
          debug$n(`Ignore duplicate value: ${tagType}.${tag.id} = ${tag.value}`);
        }
      } else if (prio1 < prio0) {
        this.common[tag.id] = [tag.value];
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug$n(`Ignore native tag (list): ${tagType}.${tag.id} = ${tag.value}`);
      }
    }
    if (this.opts.observer) {
      this.opts.observer({ metadata: this, tag: { type: "common", id: tag.id, value: tag.value } });
    }
  }
}
MetadataCollector$1.MetadataCollector = MetadataCollector;
function joinArtists(artists) {
  if (artists.length > 2) {
    return artists.slice(0, artists.length - 1).join(", ") + " & " + artists[artists.length - 1];
  }
  return artists.join(" & ");
}
MetadataCollector$1.joinArtists = joinArtists;
var AiffParser = {};
var ID3v2Parser$1 = {};
var FrameParser$1 = {};
var ID3v2Token = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.TextEncodingToken = exports.ExtendedHeader = exports.ID3v2Header = exports.UINT32SYNCSAFE = exports.AttachedPictureType = void 0;
  const Token2 = lib$1;
  const util2 = Util;
  (function(AttachedPictureType) {
    AttachedPictureType[AttachedPictureType["Other"] = 0] = "Other";
    AttachedPictureType[AttachedPictureType["32x32 pixels 'file icon' (PNG only)"] = 1] = "32x32 pixels 'file icon' (PNG only)";
    AttachedPictureType[AttachedPictureType["Other file icon"] = 2] = "Other file icon";
    AttachedPictureType[AttachedPictureType["Cover (front)"] = 3] = "Cover (front)";
    AttachedPictureType[AttachedPictureType["Cover (back)"] = 4] = "Cover (back)";
    AttachedPictureType[AttachedPictureType["Leaflet page"] = 5] = "Leaflet page";
    AttachedPictureType[AttachedPictureType["Media (e.g. label side of CD)"] = 6] = "Media (e.g. label side of CD)";
    AttachedPictureType[AttachedPictureType["Lead artist/lead performer/soloist"] = 7] = "Lead artist/lead performer/soloist";
    AttachedPictureType[AttachedPictureType["Artist/performer"] = 8] = "Artist/performer";
    AttachedPictureType[AttachedPictureType["Conductor"] = 9] = "Conductor";
    AttachedPictureType[AttachedPictureType["Band/Orchestra"] = 10] = "Band/Orchestra";
    AttachedPictureType[AttachedPictureType["Composer"] = 11] = "Composer";
    AttachedPictureType[AttachedPictureType["Lyricist/text writer"] = 12] = "Lyricist/text writer";
    AttachedPictureType[AttachedPictureType["Recording Location"] = 13] = "Recording Location";
    AttachedPictureType[AttachedPictureType["During recording"] = 14] = "During recording";
    AttachedPictureType[AttachedPictureType["During performance"] = 15] = "During performance";
    AttachedPictureType[AttachedPictureType["Movie/video screen capture"] = 16] = "Movie/video screen capture";
    AttachedPictureType[AttachedPictureType["A bright coloured fish"] = 17] = "A bright coloured fish";
    AttachedPictureType[AttachedPictureType["Illustration"] = 18] = "Illustration";
    AttachedPictureType[AttachedPictureType["Band/artist logotype"] = 19] = "Band/artist logotype";
    AttachedPictureType[AttachedPictureType["Publisher/Studio logotype"] = 20] = "Publisher/Studio logotype";
  })(exports.AttachedPictureType || (exports.AttachedPictureType = {}));
  exports.UINT32SYNCSAFE = {
    get: (buf, off) => {
      return buf[off + 3] & 127 | buf[off + 2] << 7 | buf[off + 1] << 14 | buf[off] << 21;
    },
    len: 4
  };
  exports.ID3v2Header = {
    len: 10,
    get: (buf, off) => {
      return {
        // ID3v2/file identifier   "ID3"
        fileIdentifier: new Token2.StringType(3, "ascii").get(buf, off),
        // ID3v2 versionIndex
        version: {
          major: Token2.INT8.get(buf, off + 3),
          revision: Token2.INT8.get(buf, off + 4)
        },
        // ID3v2 flags
        flags: {
          // Unsynchronisation
          unsynchronisation: util2.getBit(buf, off + 5, 7),
          // Extended header
          isExtendedHeader: util2.getBit(buf, off + 5, 6),
          // Experimental indicator
          expIndicator: util2.getBit(buf, off + 5, 5),
          footer: util2.getBit(buf, off + 5, 4)
        },
        size: exports.UINT32SYNCSAFE.get(buf, off + 6)
      };
    }
  };
  exports.ExtendedHeader = {
    len: 10,
    get: (buf, off) => {
      return {
        // Extended header size
        size: Token2.UINT32_BE.get(buf, off),
        // Extended Flags
        extendedFlags: Token2.UINT16_BE.get(buf, off + 4),
        // Size of padding
        sizeOfPadding: Token2.UINT32_BE.get(buf, off + 6),
        // CRC data present
        crcDataPresent: util2.getBit(buf, off + 4, 31)
      };
    }
  };
  exports.TextEncodingToken = {
    len: 1,
    get: (uint8Array, off) => {
      switch (uint8Array[off]) {
        case 0:
          return { encoding: "latin1" };
        case 1:
          return { encoding: "utf16le", bom: true };
        case 2:
          return { encoding: "utf16le", bom: false };
        case 3:
          return { encoding: "utf8", bom: false };
        default:
          return { encoding: "utf8", bom: false };
      }
    }
  };
})(ID3v2Token);
var ID3v1Parser = {};
var BasicParser$1 = {};
Object.defineProperty(BasicParser$1, "__esModule", { value: true });
BasicParser$1.BasicParser = void 0;
class BasicParser {
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  init(metadata, tokenizer, options) {
    this.metadata = metadata;
    this.tokenizer = tokenizer;
    this.options = options;
    return this;
  }
}
BasicParser$1.BasicParser = BasicParser;
var APEv2Parser$1 = {};
var APEv2Token = {};
var FourCC = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.FourCcToken = void 0;
  const util2 = Util;
  const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;
  exports.FourCcToken = {
    len: 4,
    get: (buf, off) => {
      const id = buf.toString("binary", off, off + exports.FourCcToken.len);
      if (!id.match(validFourCC)) {
        throw new Error(`FourCC contains invalid characters: ${util2.a2hex(id)} "${id}"`);
      }
      return id;
    },
    put: (buffer, offset, id) => {
      const str = Buffer.from(id, "binary");
      if (str.length !== 4)
        throw new Error("Invalid length");
      return str.copy(buffer, offset);
    }
  };
})(FourCC);
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isBitSet = exports.parseTagFlags = exports.TagField = exports.TagItemHeader = exports.TagFooter = exports.Header = exports.DescriptorParser = exports.DataType = void 0;
  const Token2 = lib$1;
  const FourCC_12 = FourCC;
  (function(DataType) {
    DataType[DataType["text_utf8"] = 0] = "text_utf8";
    DataType[DataType["binary"] = 1] = "binary";
    DataType[DataType["external_info"] = 2] = "external_info";
    DataType[DataType["reserved"] = 3] = "reserved";
  })(exports.DataType || (exports.DataType = {}));
  exports.DescriptorParser = {
    len: 52,
    get: (buf, off) => {
      return {
        // should equal 'MAC '
        ID: FourCC_12.FourCcToken.get(buf, off),
        // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
        version: Token2.UINT32_LE.get(buf, off + 4) / 1e3,
        // the number of descriptor bytes (allows later expansion of this header)
        descriptorBytes: Token2.UINT32_LE.get(buf, off + 8),
        // the number of header APE_HEADER bytes
        headerBytes: Token2.UINT32_LE.get(buf, off + 12),
        // the number of header APE_HEADER bytes
        seekTableBytes: Token2.UINT32_LE.get(buf, off + 16),
        // the number of header data bytes (from original file)
        headerDataBytes: Token2.UINT32_LE.get(buf, off + 20),
        // the number of bytes of APE frame data
        apeFrameDataBytes: Token2.UINT32_LE.get(buf, off + 24),
        // the high order number of APE frame data bytes
        apeFrameDataBytesHigh: Token2.UINT32_LE.get(buf, off + 28),
        // the terminating data of the file (not including tag data)
        terminatingDataBytes: Token2.UINT32_LE.get(buf, off + 32),
        // the MD5 hash of the file (see notes for usage... it's a little tricky)
        fileMD5: new Token2.Uint8ArrayType(16).get(buf, off + 36)
      };
    }
  };
  exports.Header = {
    len: 24,
    get: (buf, off) => {
      return {
        // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
        compressionLevel: Token2.UINT16_LE.get(buf, off),
        // any format flags (for future use)
        formatFlags: Token2.UINT16_LE.get(buf, off + 2),
        // the number of audio blocks in one frame
        blocksPerFrame: Token2.UINT32_LE.get(buf, off + 4),
        // the number of audio blocks in the final frame
        finalFrameBlocks: Token2.UINT32_LE.get(buf, off + 8),
        // the total number of frames
        totalFrames: Token2.UINT32_LE.get(buf, off + 12),
        // the bits per sample (typically 16)
        bitsPerSample: Token2.UINT16_LE.get(buf, off + 16),
        // the number of channels (1 or 2)
        channel: Token2.UINT16_LE.get(buf, off + 18),
        // the sample rate (typically 44100)
        sampleRate: Token2.UINT32_LE.get(buf, off + 20)
      };
    }
  };
  exports.TagFooter = {
    len: 32,
    get: (buf, off) => {
      return {
        // should equal 'APETAGEX'
        ID: new Token2.StringType(8, "ascii").get(buf, off),
        // equals CURRENT_APE_TAG_VERSION
        version: Token2.UINT32_LE.get(buf, off + 8),
        // the complete size of the tag, including this footer (excludes header)
        size: Token2.UINT32_LE.get(buf, off + 12),
        // the number of fields in the tag
        fields: Token2.UINT32_LE.get(buf, off + 16),
        // reserved for later use (must be zero),
        flags: parseTagFlags(Token2.UINT32_LE.get(buf, off + 20))
      };
    }
  };
  exports.TagItemHeader = {
    len: 8,
    get: (buf, off) => {
      return {
        // Length of assigned value in bytes
        size: Token2.UINT32_LE.get(buf, off),
        // reserved for later use (must be zero),
        flags: parseTagFlags(Token2.UINT32_LE.get(buf, off + 4))
      };
    }
  };
  const TagField = (footer) => {
    return new Token2.Uint8ArrayType(footer.size - exports.TagFooter.len);
  };
  exports.TagField = TagField;
  function parseTagFlags(flags) {
    return {
      containsHeader: isBitSet2(flags, 31),
      containsFooter: isBitSet2(flags, 30),
      isHeader: isBitSet2(flags, 31),
      readOnly: isBitSet2(flags, 0),
      dataType: (flags & 6) >> 1
    };
  }
  exports.parseTagFlags = parseTagFlags;
  function isBitSet2(num, bit) {
    return (num & 1 << bit) !== 0;
  }
  exports.isBitSet = isBitSet2;
})(APEv2Token);
Object.defineProperty(APEv2Parser$1, "__esModule", { value: true });
APEv2Parser$1.APEv2Parser = void 0;
const debug_1$m = srcExports;
const strtok3$4 = core$1;
const token_types_1$2 = lib$1;
const util$9 = Util;
const BasicParser_1$b = BasicParser$1;
const APEv2Token_1 = APEv2Token;
const debug$m = (0, debug_1$m.default)("music-metadata:parser:APEv2");
const tagFormat$1 = "APEv2";
const preamble = "APETAGEX";
class APEv2Parser extends BasicParser_1$b.BasicParser {
  constructor() {
    super(...arguments);
    this.ape = {};
  }
  static tryParseApeHeader(metadata, tokenizer, options) {
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, tokenizer, options);
    return apeParser.tryParseApeHeader();
  }
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  static calculateDuration(ah) {
    let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
    duration += ah.finalFrameBlocks;
    return duration / ah.sampleRate;
  }
  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param reader
   * @param offset
   */
  static async findApeFooterOffset(reader, offset) {
    const apeBuf = Buffer.alloc(APEv2Token_1.TagFooter.len);
    await reader.randomRead(apeBuf, 0, APEv2Token_1.TagFooter.len, offset - APEv2Token_1.TagFooter.len);
    const tagFooter = APEv2Token_1.TagFooter.get(apeBuf, 0);
    if (tagFooter.ID === "APETAGEX") {
      debug$m(`APE footer header at offset=${offset}`);
      return { footer: tagFooter, offset: offset - tagFooter.size };
    }
  }
  static parseTagFooter(metadata, buffer, options) {
    const footer = APEv2Token_1.TagFooter.get(buffer, buffer.length - APEv2Token_1.TagFooter.len);
    if (footer.ID !== preamble)
      throw new Error("Unexpected APEv2 Footer ID preamble value.");
    strtok3$4.fromBuffer(buffer);
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, strtok3$4.fromBuffer(buffer), options);
    return apeParser.parseTags(footer);
  }
  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  async tryParseApeHeader() {
    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < APEv2Token_1.TagFooter.len) {
      debug$m(`No APEv2 header found, end-of-file reached`);
      return;
    }
    const footer = await this.tokenizer.peekToken(APEv2Token_1.TagFooter);
    if (footer.ID === preamble) {
      await this.tokenizer.ignore(APEv2Token_1.TagFooter.len);
      return this.parseTags(footer);
    } else {
      debug$m(`APEv2 header not found at offset=${this.tokenizer.position}`);
      if (this.tokenizer.fileInfo.size) {
        const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position;
        const buffer = Buffer.alloc(remaining);
        await this.tokenizer.readBuffer(buffer);
        return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
      }
    }
  }
  async parse() {
    const descriptor = await this.tokenizer.readToken(APEv2Token_1.DescriptorParser);
    if (descriptor.ID !== "MAC ")
      throw new Error("Unexpected descriptor ID");
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - APEv2Token_1.DescriptorParser.len;
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());
    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }
  async parseTags(footer) {
    const keyBuffer = Buffer.alloc(256);
    let bytesRemaining = footer.size - APEv2Token_1.TagFooter.len;
    debug$m(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);
    for (let i = 0; i < footer.fields; i++) {
      if (bytesRemaining < APEv2Token_1.TagItemHeader.len) {
        this.metadata.addWarning(`APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`);
        break;
      }
      const tagItemHeader = await this.tokenizer.readToken(APEv2Token_1.TagItemHeader);
      bytesRemaining -= APEv2Token_1.TagItemHeader.len + tagItemHeader.size;
      await this.tokenizer.peekBuffer(keyBuffer, { length: Math.min(keyBuffer.length, bytesRemaining) });
      let zero = util$9.findZero(keyBuffer, 0, keyBuffer.length);
      const key = await this.tokenizer.readToken(new token_types_1$2.StringType(zero, "ascii"));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;
      switch (tagItemHeader.flags.dataType) {
        case APEv2Token_1.DataType.text_utf8: {
          const value = await this.tokenizer.readToken(new token_types_1$2.StringType(tagItemHeader.size, "utf8"));
          const values = value.split(/\x00/g);
          for (const val of values) {
            this.metadata.addTag(tagFormat$1, key, val);
          }
          break;
        }
        case APEv2Token_1.DataType.binary:
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = Buffer.alloc(tagItemHeader.size);
            await this.tokenizer.readBuffer(picData);
            zero = util$9.findZero(picData, 0, picData.length);
            const description = picData.toString("utf8", 0, zero);
            const data = Buffer.from(picData.slice(zero + 1));
            this.metadata.addTag(tagFormat$1, key, {
              description,
              data
            });
          }
          break;
        case APEv2Token_1.DataType.external_info:
          debug$m(`Ignore external info ${key}`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;
        case APEv2Token_1.DataType.reserved:
          debug$m(`Ignore external info ${key}`);
          this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${key}"`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;
      }
    }
  }
  async parseDescriptorExpansion(lenExp) {
    await this.tokenizer.ignore(lenExp);
    return this.parseHeader();
  }
  async parseHeader() {
    const header = await this.tokenizer.readToken(APEv2Token_1.Header);
    this.metadata.setFormat("lossless", true);
    this.metadata.setFormat("container", "Monkey's Audio");
    this.metadata.setFormat("bitsPerSample", header.bitsPerSample);
    this.metadata.setFormat("sampleRate", header.sampleRate);
    this.metadata.setFormat("numberOfChannels", header.channel);
    this.metadata.setFormat("duration", APEv2Parser.calculateDuration(header));
    return {
      forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes + this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
    };
  }
}
APEv2Parser$1.APEv2Parser = APEv2Parser;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.hasID3v1Header = exports.ID3v1Parser = exports.Genres = void 0;
  const debug_12 = srcExports;
  const token_types_12 = lib$1;
  const util2 = Util;
  const BasicParser_12 = BasicParser$1;
  const APEv2Parser_12 = APEv2Parser$1;
  const debug2 = (0, debug_12.default)("music-metadata:parser:ID3v1");
  exports.Genres = [
    "Blues",
    "Classic Rock",
    "Country",
    "Dance",
    "Disco",
    "Funk",
    "Grunge",
    "Hip-Hop",
    "Jazz",
    "Metal",
    "New Age",
    "Oldies",
    "Other",
    "Pop",
    "R&B",
    "Rap",
    "Reggae",
    "Rock",
    "Techno",
    "Industrial",
    "Alternative",
    "Ska",
    "Death Metal",
    "Pranks",
    "Soundtrack",
    "Euro-Techno",
    "Ambient",
    "Trip-Hop",
    "Vocal",
    "Jazz+Funk",
    "Fusion",
    "Trance",
    "Classical",
    "Instrumental",
    "Acid",
    "House",
    "Game",
    "Sound Clip",
    "Gospel",
    "Noise",
    "Alt. Rock",
    "Bass",
    "Soul",
    "Punk",
    "Space",
    "Meditative",
    "Instrumental Pop",
    "Instrumental Rock",
    "Ethnic",
    "Gothic",
    "Darkwave",
    "Techno-Industrial",
    "Electronic",
    "Pop-Folk",
    "Eurodance",
    "Dream",
    "Southern Rock",
    "Comedy",
    "Cult",
    "Gangsta Rap",
    "Top 40",
    "Christian Rap",
    "Pop/Funk",
    "Jungle",
    "Native American",
    "Cabaret",
    "New Wave",
    "Psychedelic",
    "Rave",
    "Showtunes",
    "Trailer",
    "Lo-Fi",
    "Tribal",
    "Acid Punk",
    "Acid Jazz",
    "Polka",
    "Retro",
    "Musical",
    "Rock & Roll",
    "Hard Rock",
    "Folk",
    "Folk/Rock",
    "National Folk",
    "Swing",
    "Fast-Fusion",
    "Bebob",
    "Latin",
    "Revival",
    "Celtic",
    "Bluegrass",
    "Avantgarde",
    "Gothic Rock",
    "Progressive Rock",
    "Psychedelic Rock",
    "Symphonic Rock",
    "Slow Rock",
    "Big Band",
    "Chorus",
    "Easy Listening",
    "Acoustic",
    "Humour",
    "Speech",
    "Chanson",
    "Opera",
    "Chamber Music",
    "Sonata",
    "Symphony",
    "Booty Bass",
    "Primus",
    "Porn Groove",
    "Satire",
    "Slow Jam",
    "Club",
    "Tango",
    "Samba",
    "Folklore",
    "Ballad",
    "Power Ballad",
    "Rhythmic Soul",
    "Freestyle",
    "Duet",
    "Punk Rock",
    "Drum Solo",
    "A Cappella",
    "Euro-House",
    "Dance Hall",
    "Goa",
    "Drum & Bass",
    "Club-House",
    "Hardcore",
    "Terror",
    "Indie",
    "BritPop",
    "Negerpunk",
    "Polsk Punk",
    "Beat",
    "Christian Gangsta Rap",
    "Heavy Metal",
    "Black Metal",
    "Crossover",
    "Contemporary Christian",
    "Christian Rock",
    "Merengue",
    "Salsa",
    "Thrash Metal",
    "Anime",
    "JPop",
    "Synthpop",
    "Abstract",
    "Art Rock",
    "Baroque",
    "Bhangra",
    "Big Beat",
    "Breakbeat",
    "Chillout",
    "Downtempo",
    "Dub",
    "EBM",
    "Eclectic",
    "Electro",
    "Electroclash",
    "Emo",
    "Experimental",
    "Garage",
    "Global",
    "IDM",
    "Illbient",
    "Industro-Goth",
    "Jam Band",
    "Krautrock",
    "Leftfield",
    "Lounge",
    "Math Rock",
    "New Romantic",
    "Nu-Breakz",
    "Post-Punk",
    "Post-Rock",
    "Psytrance",
    "Shoegaze",
    "Space Rock",
    "Trop Rock",
    "World Music",
    "Neoclassical",
    "Audiobook",
    "Audio Theatre",
    "Neue Deutsche Welle",
    "Podcast",
    "Indie Rock",
    "G-Funk",
    "Dubstep",
    "Garage Rock",
    "Psybient"
  ];
  const Iid3v1Token = {
    len: 128,
    /**
     * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
     * @param off Offset in buffer in bytes
     * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
     */
    get: (buf, off) => {
      const header = new Id3v1StringType(3).get(buf, off);
      return header === "TAG" ? {
        header,
        title: new Id3v1StringType(30).get(buf, off + 3),
        artist: new Id3v1StringType(30).get(buf, off + 33),
        album: new Id3v1StringType(30).get(buf, off + 63),
        year: new Id3v1StringType(4).get(buf, off + 93),
        comment: new Id3v1StringType(28).get(buf, off + 97),
        // ID3v1.1 separator for track
        zeroByte: token_types_12.UINT8.get(buf, off + 127),
        // track: ID3v1.1 field added by Michael Mutschler
        track: token_types_12.UINT8.get(buf, off + 126),
        genre: token_types_12.UINT8.get(buf, off + 127)
      } : null;
    }
  };
  class Id3v1StringType extends token_types_12.StringType {
    constructor(len) {
      super(len, "binary");
    }
    get(buf, off) {
      let value = super.get(buf, off);
      value = util2.trimRightNull(value);
      value = value.trim();
      return value.length > 0 ? value : void 0;
    }
  }
  class ID3v1Parser2 extends BasicParser_12.BasicParser {
    static getGenre(genreIndex) {
      if (genreIndex < exports.Genres.length) {
        return exports.Genres[genreIndex];
      }
      return void 0;
    }
    async parse() {
      if (!this.tokenizer.fileInfo.size) {
        debug2("Skip checking for ID3v1 because the file-size is unknown");
        return;
      }
      if (this.options.apeHeader) {
        this.tokenizer.ignore(this.options.apeHeader.offset - this.tokenizer.position);
        const apeParser = new APEv2Parser_12.APEv2Parser();
        apeParser.init(this.metadata, this.tokenizer, this.options);
        await apeParser.parseTags(this.options.apeHeader.footer);
      }
      const offset = this.tokenizer.fileInfo.size - Iid3v1Token.len;
      if (this.tokenizer.position > offset) {
        debug2("Already consumed the last 128 bytes");
        return;
      }
      const header = await this.tokenizer.readToken(Iid3v1Token, offset);
      if (header) {
        debug2("ID3v1 header found at: pos=%s", this.tokenizer.fileInfo.size - Iid3v1Token.len);
        for (const id of ["title", "artist", "album", "comment", "track", "year"]) {
          if (header[id] && header[id] !== "")
            this.addTag(id, header[id]);
        }
        const genre = ID3v1Parser2.getGenre(header.genre);
        if (genre)
          this.addTag("genre", genre);
      } else {
        debug2("ID3v1 header not found at: pos=%s", this.tokenizer.fileInfo.size - Iid3v1Token.len);
      }
    }
    addTag(id, value) {
      this.metadata.addTag("ID3v1", id, value);
    }
  }
  exports.ID3v1Parser = ID3v1Parser2;
  async function hasID3v1Header(reader) {
    if (reader.fileSize >= 128) {
      const tag = Buffer.alloc(3);
      await reader.randomRead(tag, 0, tag.length, reader.fileSize - 128);
      return tag.toString("binary") === "TAG";
    }
    return false;
  }
  exports.hasID3v1Header = hasID3v1Header;
})(ID3v1Parser);
Object.defineProperty(FrameParser$1, "__esModule", { value: true });
FrameParser$1.FrameParser = FrameParser$1.parseGenre = void 0;
const debug_1$l = srcExports;
const Token$r = lib$1;
const util$8 = Util;
const ID3v2Token_1$3 = ID3v2Token;
const ID3v1Parser_1$3 = ID3v1Parser;
const debug$l = (0, debug_1$l.default)("music-metadata:id3v2:frame-parser");
const defaultEnc = "latin1";
function parseGenre(origVal) {
  const genres = [];
  let code;
  let word = "";
  for (const c of origVal) {
    if (typeof code === "string") {
      if (c === "(" && code === "") {
        word += "(";
        code = void 0;
      } else if (c === ")") {
        if (word !== "") {
          genres.push(word);
          word = "";
        }
        const genre = parseGenreCode(code);
        if (genre) {
          genres.push(genre);
        }
        code = void 0;
      } else
        code += c;
    } else if (c === "(") {
      code = "";
    } else {
      word += c;
    }
  }
  if (word) {
    if (genres.length === 0 && word.match(/^\d*$/)) {
      word = ID3v1Parser_1$3.Genres[word];
    }
    genres.push(word);
  }
  return genres;
}
FrameParser$1.parseGenre = parseGenre;
function parseGenreCode(code) {
  if (code === "RX")
    return "Remix";
  if (code === "CR")
    return "Cover";
  if (code.match(/^\d*$/)) {
    return ID3v1Parser_1$3.Genres[code];
  }
}
class FrameParser {
  /**
   * Create id3v2 frame parser
   * @param major - Major version, e.g. (4) for  id3v2.4
   * @param warningCollector - Used to collect decode issue
   */
  constructor(major, warningCollector) {
    this.major = major;
    this.warningCollector = warningCollector;
  }
  readData(uint8Array, type2, includeCovers) {
    if (uint8Array.length === 0) {
      this.warningCollector.addWarning(`id3v2.${this.major} header has empty tag type=${type2}`);
      return;
    }
    const { encoding, bom } = ID3v2Token_1$3.TextEncodingToken.get(uint8Array, 0);
    const length = uint8Array.length;
    let offset = 0;
    let output = [];
    const nullTerminatorLength = FrameParser.getNullTerminatorLength(encoding);
    let fzero;
    const out = {};
    debug$l(`Parsing tag type=${type2}, encoding=${encoding}, bom=${bom}`);
    switch (type2 !== "TXXX" && type2[0] === "T" ? "T*" : type2) {
      case "T*":
      case "IPLS":
      case "MVIN":
      case "MVNM":
      case "PCS":
      case "PCST":
        let text;
        try {
          text = util$8.decodeString(uint8Array.slice(1), encoding).replace(/\x00+$/, "");
        } catch (error) {
          this.warningCollector.addWarning(`id3v2.${this.major} type=${type2} header has invalid string value: ${error.message}`);
        }
        switch (type2) {
          case "TMCL":
          case "TIPL":
          case "IPLS":
            output = this.splitValue(type2, text);
            output = FrameParser.functionList(output);
            break;
          case "TRK":
          case "TRCK":
          case "TPOS":
            output = text;
            break;
          case "TCOM":
          case "TEXT":
          case "TOLY":
          case "TOPE":
          case "TPE1":
          case "TSRC":
            output = this.splitValue(type2, text);
            break;
          case "TCO":
          case "TCON":
            output = this.splitValue(type2, text).map((v) => parseGenre(v)).reduce((acc, val) => acc.concat(val), []);
            break;
          case "PCS":
          case "PCST":
            output = this.major >= 4 ? this.splitValue(type2, text) : [text];
            output = Array.isArray(output) && output[0] === "" ? 1 : 0;
            break;
          default:
            output = this.major >= 4 ? this.splitValue(type2, text) : [text];
        }
        break;
      case "TXXX":
        output = FrameParser.readIdentifierAndData(uint8Array, offset + 1, length, encoding);
        output = {
          description: output.id,
          text: this.splitValue(type2, util$8.decodeString(output.data, encoding).replace(/\x00+$/, ""))
        };
        break;
      case "PIC":
      case "APIC":
        if (includeCovers) {
          const pic = {};
          offset += 1;
          switch (this.major) {
            case 2:
              pic.format = util$8.decodeString(uint8Array.slice(offset, offset + 3), "latin1");
              offset += 3;
              break;
            case 3:
            case 4:
              fzero = util$8.findZero(uint8Array, offset, length, defaultEnc);
              pic.format = util$8.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
              offset = fzero + 1;
              break;
            default:
              throw new Error("Warning: unexpected major versionIndex: " + this.major);
          }
          pic.format = FrameParser.fixPictureMimeType(pic.format);
          pic.type = ID3v2Token_1$3.AttachedPictureType[uint8Array[offset]];
          offset += 1;
          fzero = util$8.findZero(uint8Array, offset, length, encoding);
          pic.description = util$8.decodeString(uint8Array.slice(offset, fzero), encoding);
          offset = fzero + nullTerminatorLength;
          pic.data = Buffer.from(uint8Array.slice(offset, length));
          output = pic;
        }
        break;
      case "CNT":
      case "PCNT":
        output = Token$r.UINT32_BE.get(uint8Array, 0);
        break;
      case "SYLT":
        offset += 7;
        output = [];
        while (offset < length) {
          const txt = uint8Array.slice(offset, offset = util$8.findZero(uint8Array, offset, length, encoding));
          offset += 5;
          output.push(util$8.decodeString(txt, encoding));
        }
        break;
      case "ULT":
      case "USLT":
      case "COM":
      case "COMM":
        offset += 1;
        out.language = util$8.decodeString(uint8Array.slice(offset, offset + 3), defaultEnc);
        offset += 3;
        fzero = util$8.findZero(uint8Array, offset, length, encoding);
        out.description = util$8.decodeString(uint8Array.slice(offset, fzero), encoding);
        offset = fzero + nullTerminatorLength;
        out.text = util$8.decodeString(uint8Array.slice(offset, length), encoding).replace(/\x00+$/, "");
        output = [out];
        break;
      case "UFID":
        output = FrameParser.readIdentifierAndData(uint8Array, offset, length, defaultEnc);
        output = { owner_identifier: output.id, identifier: output.data };
        break;
      case "PRIV":
        output = FrameParser.readIdentifierAndData(uint8Array, offset, length, defaultEnc);
        output = { owner_identifier: output.id, data: output.data };
        break;
      case "POPM":
        fzero = util$8.findZero(uint8Array, offset, length, defaultEnc);
        const email = util$8.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
        offset = fzero + 1;
        const dataLen = length - offset;
        output = {
          email,
          rating: Token$r.UINT8.get(uint8Array, offset),
          counter: dataLen >= 5 ? Token$r.UINT32_BE.get(uint8Array, offset + 1) : void 0
        };
        break;
      case "GEOB": {
        fzero = util$8.findZero(uint8Array, offset + 1, length, encoding);
        const mimeType = util$8.decodeString(uint8Array.slice(offset + 1, fzero), defaultEnc);
        offset = fzero + 1;
        fzero = util$8.findZero(uint8Array, offset, length - offset, encoding);
        const filename = util$8.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
        offset = fzero + 1;
        fzero = util$8.findZero(uint8Array, offset, length - offset, encoding);
        const description = util$8.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
        output = {
          type: mimeType,
          filename,
          description,
          data: uint8Array.slice(offset + 1, length)
        };
        break;
      }
      case "WCOM":
      case "WCOP":
      case "WOAF":
      case "WOAR":
      case "WOAS":
      case "WORS":
      case "WPAY":
      case "WPUB":
        output = util$8.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
        break;
      case "WXXX": {
        fzero = util$8.findZero(uint8Array, offset + 1, length, encoding);
        const description = util$8.decodeString(uint8Array.slice(offset + 1, fzero), encoding);
        offset = fzero + (encoding === "utf16le" ? 2 : 1);
        output = { description, url: util$8.decodeString(uint8Array.slice(offset, length), defaultEnc) };
        break;
      }
      case "WFD":
      case "WFED":
        output = util$8.decodeString(uint8Array.slice(offset + 1, util$8.findZero(uint8Array, offset + 1, length, encoding)), encoding);
        break;
      case "MCDI": {
        output = uint8Array.slice(0, length);
        break;
      }
      default:
        debug$l("Warning: unsupported id3v2-tag-type: " + type2);
        break;
    }
    return output;
  }
  static fixPictureMimeType(pictureType) {
    pictureType = pictureType.toLocaleLowerCase();
    switch (pictureType) {
      case "jpg":
        return "image/jpeg";
      case "png":
        return "image/png";
    }
    return pictureType;
  }
  /**
   * Converts TMCL (Musician credits list) or TIPL (Involved people list)
   * @param entries
   */
  static functionList(entries) {
    const res = {};
    for (let i = 0; i + 1 < entries.length; i += 2) {
      const names = entries[i + 1].split(",");
      res[entries[i]] = res.hasOwnProperty(entries[i]) ? res[entries[i]].concat(names) : names;
    }
    return res;
  }
  /**
   * id3v2.4 defines that multiple T* values are separated by 0x00
   * id3v2.3 defines that TCOM, TEXT, TOLY, TOPE & TPE1 values are separated by /
   * @param tag - Tag name
   * @param text - Concatenated tag value
   * @returns Split tag value
   */
  splitValue(tag, text) {
    let values;
    if (this.major < 4) {
      values = text.split(/\x00/g);
      if (values.length > 1) {
        this.warningCollector.addWarning(`ID3v2.${this.major} ${tag} uses non standard null-separator.`);
      } else {
        values = text.split(/\//g);
      }
    } else {
      values = text.split(/\x00/g);
    }
    return FrameParser.trimArray(values);
  }
  static trimArray(values) {
    return values.map((value) => value.replace(/\x00+$/, "").trim());
  }
  static readIdentifierAndData(uint8Array, offset, length, encoding) {
    const fzero = util$8.findZero(uint8Array, offset, length, encoding);
    const id = util$8.decodeString(uint8Array.slice(offset, fzero), encoding);
    offset = fzero + FrameParser.getNullTerminatorLength(encoding);
    return { id, data: uint8Array.slice(offset, length) };
  }
  static getNullTerminatorLength(enc) {
    return enc === "utf16le" ? 2 : 1;
  }
}
FrameParser$1.FrameParser = FrameParser;
Object.defineProperty(ID3v2Parser$1, "__esModule", { value: true });
ID3v2Parser$1.ID3v2Parser = void 0;
const Token$q = lib$1;
const util$7 = Util;
const FrameParser_1 = FrameParser$1;
const ID3v2Token_1$2 = ID3v2Token;
class ID3v2Parser {
  static removeUnsyncBytes(buffer) {
    let readI = 0;
    let writeI = 0;
    while (readI < buffer.length - 1) {
      if (readI !== writeI) {
        buffer[writeI] = buffer[readI];
      }
      readI += buffer[readI] === 255 && buffer[readI + 1] === 0 ? 2 : 1;
      writeI++;
    }
    if (readI < buffer.length) {
      buffer[writeI++] = buffer[readI];
    }
    return buffer.slice(0, writeI);
  }
  static getFrameHeaderLength(majorVer) {
    switch (majorVer) {
      case 2:
        return 6;
      case 3:
      case 4:
        return 10;
      default:
        throw new Error("header versionIndex is incorrect");
    }
  }
  static readFrameFlags(b) {
    return {
      status: {
        tag_alter_preservation: util$7.getBit(b, 0, 6),
        file_alter_preservation: util$7.getBit(b, 0, 5),
        read_only: util$7.getBit(b, 0, 4)
      },
      format: {
        grouping_identity: util$7.getBit(b, 1, 7),
        compression: util$7.getBit(b, 1, 3),
        encryption: util$7.getBit(b, 1, 2),
        unsynchronisation: util$7.getBit(b, 1, 1),
        data_length_indicator: util$7.getBit(b, 1, 0)
      }
    };
  }
  static readFrameData(uint8Array, frameHeader, majorVer, includeCovers, warningCollector) {
    const frameParser = new FrameParser_1.FrameParser(majorVer, warningCollector);
    switch (majorVer) {
      case 2:
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
        }
        if (frameHeader.flags.format.data_length_indicator) {
          uint8Array = uint8Array.slice(4, uint8Array.length);
        }
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      default:
        throw new Error("Unexpected majorVer: " + majorVer);
    }
  }
  /**
   * Create a combined tag key, of tag & description
   * @param tag e.g.: COM
   * @param description e.g. iTunPGAP
   * @returns string e.g. COM:iTunPGAP
   */
  static makeDescriptionTagName(tag, description) {
    return tag + (description ? ":" + description : "");
  }
  async parse(metadata, tokenizer, options) {
    this.tokenizer = tokenizer;
    this.metadata = metadata;
    this.options = options;
    const id3Header = await this.tokenizer.readToken(ID3v2Token_1$2.ID3v2Header);
    if (id3Header.fileIdentifier !== "ID3") {
      throw new Error("expected ID3-header file-identifier 'ID3' was not found");
    }
    this.id3Header = id3Header;
    this.headerType = "ID3v2." + id3Header.version.major;
    return id3Header.flags.isExtendedHeader ? this.parseExtendedHeader() : this.parseId3Data(id3Header.size);
  }
  async parseExtendedHeader() {
    const extendedHeader = await this.tokenizer.readToken(ID3v2Token_1$2.ExtendedHeader);
    const dataRemaining = extendedHeader.size - ID3v2Token_1$2.ExtendedHeader.len;
    return dataRemaining > 0 ? this.parseExtendedHeaderData(dataRemaining, extendedHeader.size) : this.parseId3Data(this.id3Header.size - extendedHeader.size);
  }
  async parseExtendedHeaderData(dataRemaining, extendedHeaderSize) {
    await this.tokenizer.ignore(dataRemaining);
    return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
  }
  async parseId3Data(dataLen) {
    const uint8Array = await this.tokenizer.readToken(new Token$q.Uint8ArrayType(dataLen));
    for (const tag of this.parseMetadata(uint8Array)) {
      if (tag.id === "TXXX") {
        if (tag.value) {
          for (const text of tag.value.text) {
            this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, tag.value.description), text);
          }
        }
      } else if (tag.id === "COM") {
        for (const value of tag.value) {
          this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value.text);
        }
      } else if (tag.id === "COMM") {
        for (const value of tag.value) {
          this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value);
        }
      } else if (Array.isArray(tag.value)) {
        for (const value of tag.value) {
          this.addTag(tag.id, value);
        }
      } else {
        this.addTag(tag.id, tag.value);
      }
    }
  }
  addTag(id, value) {
    this.metadata.addTag(this.headerType, id, value);
  }
  parseMetadata(data) {
    let offset = 0;
    const tags = [];
    while (true) {
      if (offset === data.length)
        break;
      const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.version.major);
      if (offset + frameHeaderLength > data.length) {
        this.metadata.addWarning("Illegal ID3v2 tag length");
        break;
      }
      const frameHeaderBytes = data.slice(offset, offset += frameHeaderLength);
      const frameHeader = this.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);
      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers, this.metadata);
      if (values) {
        tags.push({ id: frameHeader.id, value: values });
      }
    }
    return tags;
  }
  readFrameHeader(uint8Array, majorVer) {
    let header;
    switch (majorVer) {
      case 2:
        header = {
          id: Buffer.from(uint8Array.slice(0, 3)).toString("ascii"),
          length: Token$q.UINT24_BE.get(uint8Array, 3)
        };
        if (!header.id.match(/[A-Z0-9]{3}/g)) {
          this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
        }
        break;
      case 3:
      case 4:
        header = {
          id: Buffer.from(uint8Array.slice(0, 4)).toString("ascii"),
          length: (majorVer === 4 ? ID3v2Token_1$2.UINT32SYNCSAFE : Token$q.UINT32_BE).get(uint8Array, 4),
          flags: ID3v2Parser.readFrameFlags(uint8Array.slice(8, 10))
        };
        if (!header.id.match(/[A-Z0-9]{4}/g)) {
          this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
        }
        break;
      default:
        throw new Error("Unexpected majorVer: " + majorVer);
    }
    return header;
  }
}
ID3v2Parser$1.ID3v2Parser = ID3v2Parser;
var AiffToken$1 = {};
Object.defineProperty(AiffToken$1, "__esModule", { value: true });
AiffToken$1.Common = void 0;
const Token$p = lib$1;
const FourCC_1$a = FourCC;
class Common {
  constructor(header, isAifc) {
    this.isAifc = isAifc;
    const minimumChunkSize = isAifc ? 22 : 18;
    if (header.chunkSize < minimumChunkSize)
      throw new Error(`COMMON CHUNK size should always be at least ${minimumChunkSize}`);
    this.len = header.chunkSize;
  }
  get(buf, off) {
    const shift = buf.readUInt16BE(off + 8) - 16398;
    const baseSampleRate = buf.readUInt16BE(off + 8 + 2);
    const res = {
      numChannels: buf.readUInt16BE(off),
      numSampleFrames: buf.readUInt32BE(off + 2),
      sampleSize: buf.readUInt16BE(off + 6),
      sampleRate: shift < 0 ? baseSampleRate >> Math.abs(shift) : baseSampleRate << shift
    };
    if (this.isAifc) {
      res.compressionType = FourCC_1$a.FourCcToken.get(buf, off + 18);
      if (this.len > 22) {
        const strLen = buf.readInt8(off + 22);
        if (strLen > 0) {
          const padding = (strLen + 1) % 2;
          if (23 + strLen + padding === this.len) {
            res.compressionName = new Token$p.StringType(strLen, "binary").get(buf, off + 23);
          } else {
            throw new Error("Illegal pstring length");
          }
        } else {
          res.compressionName = void 0;
        }
      }
    } else {
      res.compressionName = "PCM";
    }
    return res;
  }
}
AiffToken$1.Common = Common;
var iff$1 = {};
Object.defineProperty(iff$1, "__esModule", { value: true });
iff$1.Header = void 0;
const Token$o = lib$1;
const FourCC_1$9 = FourCC;
iff$1.Header = {
  len: 8,
  get: (buf, off) => {
    return {
      // Chunk type ID
      chunkID: FourCC_1$9.FourCcToken.get(buf, off),
      // Chunk size
      chunkSize: Number(BigInt(Token$o.UINT32_BE.get(buf, off + 4)))
    };
  }
};
Object.defineProperty(AiffParser, "__esModule", { value: true });
AiffParser.AIFFParser = void 0;
const Token$n = lib$1;
const debug_1$k = srcExports;
const strtok3$3 = core$1;
const ID3v2Parser_1$4 = ID3v2Parser$1;
const FourCC_1$8 = FourCC;
const BasicParser_1$a = BasicParser$1;
const AiffToken = AiffToken$1;
const iff = iff$1;
const debug$k = (0, debug_1$k.default)("music-metadata:parser:aiff");
const compressionTypes = {
  NONE: "not compressed	PCM	Apple Computer",
  sowt: "PCM (byte swapped)",
  fl32: "32-bit floating point IEEE 32-bit float",
  fl64: "64-bit floating point IEEE 64-bit float	Apple Computer",
  alaw: "ALaw 2:1	8-bit ITU-T G.711 A-law",
  ulaw: "µLaw 2:1	8-bit ITU-T G.711 µ-law	Apple Computer",
  ULAW: "CCITT G.711 u-law 8-bit ITU-T G.711 µ-law",
  ALAW: "CCITT G.711 A-law 8-bit ITU-T G.711 A-law",
  FL32: "Float 32	IEEE 32-bit float "
};
class AIFFParser extends BasicParser_1$a.BasicParser {
  async parse() {
    const header = await this.tokenizer.readToken(iff.Header);
    if (header.chunkID !== "FORM")
      throw new Error("Invalid Chunk-ID, expected 'FORM'");
    const type2 = await this.tokenizer.readToken(FourCC_1$8.FourCcToken);
    switch (type2) {
      case "AIFF":
        this.metadata.setFormat("container", type2);
        this.isCompressed = false;
        break;
      case "AIFC":
        this.metadata.setFormat("container", "AIFF-C");
        this.isCompressed = true;
        break;
      default:
        throw Error("Unsupported AIFF type: " + type2);
    }
    this.metadata.setFormat("lossless", !this.isCompressed);
    try {
      while (!this.tokenizer.fileInfo.size || this.tokenizer.fileInfo.size - this.tokenizer.position >= iff.Header.len) {
        debug$k("Reading AIFF chunk at offset=" + this.tokenizer.position);
        const chunkHeader = await this.tokenizer.readToken(iff.Header);
        const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
        const bytesRead = await this.readData(chunkHeader);
        await this.tokenizer.ignore(nextChunk - bytesRead);
      }
    } catch (err) {
      if (err instanceof strtok3$3.EndOfStreamError) {
        debug$k(`End-of-stream`);
      } else {
        throw err;
      }
    }
  }
  async readData(header) {
    var _a;
    switch (header.chunkID) {
      case "COMM":
        const common2 = await this.tokenizer.readToken(new AiffToken.Common(header, this.isCompressed));
        this.metadata.setFormat("bitsPerSample", common2.sampleSize);
        this.metadata.setFormat("sampleRate", common2.sampleRate);
        this.metadata.setFormat("numberOfChannels", common2.numChannels);
        this.metadata.setFormat("numberOfSamples", common2.numSampleFrames);
        this.metadata.setFormat("duration", common2.numSampleFrames / common2.sampleRate);
        this.metadata.setFormat("codec", (_a = common2.compressionName) !== null && _a !== void 0 ? _a : compressionTypes[common2.compressionType]);
        return header.chunkSize;
      case "ID3 ":
        const id3_data = await this.tokenizer.readToken(new Token$n.Uint8ArrayType(header.chunkSize));
        const rst = strtok3$3.fromBuffer(id3_data);
        await new ID3v2Parser_1$4.ID3v2Parser().parse(this.metadata, rst, this.options);
        return header.chunkSize;
      case "SSND":
        if (this.metadata.format.duration) {
          this.metadata.setFormat("bitrate", 8 * header.chunkSize / this.metadata.format.duration);
        }
        return 0;
      case "NAME":
      case "AUTH":
      case "(c) ":
      case "ANNO":
        return this.readTextChunk(header);
      default:
        debug$k(`Ignore chunk id=${header.chunkID}, size=${header.chunkSize}`);
        return 0;
    }
  }
  async readTextChunk(header) {
    const value = await this.tokenizer.readToken(new Token$n.StringType(header.chunkSize, "ascii"));
    value.split("\0").map((v) => v.trim()).filter((v) => v && v.length > 0).forEach((v) => {
      this.metadata.addTag("AIFF", header.chunkID, v.trim());
    });
    return header.chunkSize;
  }
}
AiffParser.AIFFParser = AIFFParser;
var AsfParser$1 = {};
var GUID$1 = {};
Object.defineProperty(GUID$1, "__esModule", { value: true });
class GUID {
  static fromBin(bin, offset = 0) {
    return new GUID(this.decode(bin, offset));
  }
  /**
   * Decode GUID in format like "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
   * @param objectId Binary GUID
   * @param offset Read offset in bytes, default 0
   * @returns GUID as dashed hexadecimal representation
   */
  static decode(objectId, offset = 0) {
    const guid = objectId.readUInt32LE(offset).toString(16) + "-" + objectId.readUInt16LE(offset + 4).toString(16) + "-" + objectId.readUInt16LE(offset + 6).toString(16) + "-" + objectId.readUInt16BE(offset + 8).toString(16) + "-" + objectId.slice(offset + 10, offset + 16).toString("hex");
    return guid.toUpperCase();
  }
  /**
   * Decode stream type
   * @param mediaType Media type GUID
   * @returns Media type
   */
  static decodeMediaType(mediaType) {
    switch (mediaType.str) {
      case GUID.AudioMedia.str:
        return "audio";
      case GUID.VideoMedia.str:
        return "video";
      case GUID.CommandMedia.str:
        return "command";
      case GUID.Degradable_JPEG_Media.str:
        return "degradable-jpeg";
      case GUID.FileTransferMedia.str:
        return "file-transfer";
      case GUID.BinaryMedia.str:
        return "binary";
    }
  }
  /**
   * Encode GUID
   * @param guid GUID like: "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
   * @returns Encoded Binary GUID
   */
  static encode(str) {
    const bin = Buffer.alloc(16);
    bin.writeUInt32LE(parseInt(str.slice(0, 8), 16), 0);
    bin.writeUInt16LE(parseInt(str.slice(9, 13), 16), 4);
    bin.writeUInt16LE(parseInt(str.slice(14, 18), 16), 6);
    Buffer.from(str.slice(19, 23), "hex").copy(bin, 8);
    Buffer.from(str.slice(24), "hex").copy(bin, 10);
    return bin;
  }
  constructor(str) {
    this.str = str;
  }
  equals(guid) {
    return this.str === guid.str;
  }
  toBin() {
    return GUID.encode(this.str);
  }
}
GUID.HeaderObject = new GUID("75B22630-668E-11CF-A6D9-00AA0062CE6C");
GUID.DataObject = new GUID("75B22636-668E-11CF-A6D9-00AA0062CE6C");
GUID.SimpleIndexObject = new GUID("33000890-E5B1-11CF-89F4-00A0C90349CB");
GUID.IndexObject = new GUID("D6E229D3-35DA-11D1-9034-00A0C90349BE");
GUID.MediaObjectIndexObject = new GUID("FEB103F8-12AD-4C64-840F-2A1D2F7AD48C");
GUID.TimecodeIndexObject = new GUID("3CB73FD0-0C4A-4803-953D-EDF7B6228F0C");
GUID.FilePropertiesObject = new GUID("8CABDCA1-A947-11CF-8EE4-00C00C205365");
GUID.StreamPropertiesObject = new GUID("B7DC0791-A9B7-11CF-8EE6-00C00C205365");
GUID.HeaderExtensionObject = new GUID("5FBF03B5-A92E-11CF-8EE3-00C00C205365");
GUID.CodecListObject = new GUID("86D15240-311D-11D0-A3A4-00A0C90348F6");
GUID.ScriptCommandObject = new GUID("1EFB1A30-0B62-11D0-A39B-00A0C90348F6");
GUID.MarkerObject = new GUID("F487CD01-A951-11CF-8EE6-00C00C205365");
GUID.BitrateMutualExclusionObject = new GUID("D6E229DC-35DA-11D1-9034-00A0C90349BE");
GUID.ErrorCorrectionObject = new GUID("75B22635-668E-11CF-A6D9-00AA0062CE6C");
GUID.ContentDescriptionObject = new GUID("75B22633-668E-11CF-A6D9-00AA0062CE6C");
GUID.ExtendedContentDescriptionObject = new GUID("D2D0A440-E307-11D2-97F0-00A0C95EA850");
GUID.ContentBrandingObject = new GUID("2211B3FA-BD23-11D2-B4B7-00A0C955FC6E");
GUID.StreamBitratePropertiesObject = new GUID("7BF875CE-468D-11D1-8D82-006097C9A2B2");
GUID.ContentEncryptionObject = new GUID("2211B3FB-BD23-11D2-B4B7-00A0C955FC6E");
GUID.ExtendedContentEncryptionObject = new GUID("298AE614-2622-4C17-B935-DAE07EE9289C");
GUID.DigitalSignatureObject = new GUID("2211B3FC-BD23-11D2-B4B7-00A0C955FC6E");
GUID.PaddingObject = new GUID("1806D474-CADF-4509-A4BA-9AABCB96AAE8");
GUID.ExtendedStreamPropertiesObject = new GUID("14E6A5CB-C672-4332-8399-A96952065B5A");
GUID.AdvancedMutualExclusionObject = new GUID("A08649CF-4775-4670-8A16-6E35357566CD");
GUID.GroupMutualExclusionObject = new GUID("D1465A40-5A79-4338-B71B-E36B8FD6C249");
GUID.StreamPrioritizationObject = new GUID("D4FED15B-88D3-454F-81F0-ED5C45999E24");
GUID.BandwidthSharingObject = new GUID("A69609E6-517B-11D2-B6AF-00C04FD908E9");
GUID.LanguageListObject = new GUID("7C4346A9-EFE0-4BFC-B229-393EDE415C85");
GUID.MetadataObject = new GUID("C5F8CBEA-5BAF-4877-8467-AA8C44FA4CCA");
GUID.MetadataLibraryObject = new GUID("44231C94-9498-49D1-A141-1D134E457054");
GUID.IndexParametersObject = new GUID("D6E229DF-35DA-11D1-9034-00A0C90349BE");
GUID.MediaObjectIndexParametersObject = new GUID("6B203BAD-3F11-48E4-ACA8-D7613DE2CFA7");
GUID.TimecodeIndexParametersObject = new GUID("F55E496D-9797-4B5D-8C8B-604DFE9BFB24");
GUID.CompatibilityObject = new GUID("26F18B5D-4584-47EC-9F5F-0E651F0452C9");
GUID.AdvancedContentEncryptionObject = new GUID("43058533-6981-49E6-9B74-AD12CB86D58C");
GUID.AudioMedia = new GUID("F8699E40-5B4D-11CF-A8FD-00805F5C442B");
GUID.VideoMedia = new GUID("BC19EFC0-5B4D-11CF-A8FD-00805F5C442B");
GUID.CommandMedia = new GUID("59DACFC0-59E6-11D0-A3AC-00A0C90348F6");
GUID.JFIF_Media = new GUID("B61BE100-5B4E-11CF-A8FD-00805F5C442B");
GUID.Degradable_JPEG_Media = new GUID("35907DE0-E415-11CF-A917-00805F5C442B");
GUID.FileTransferMedia = new GUID("91BD222C-F21C-497A-8B6D-5AA86BFC0185");
GUID.BinaryMedia = new GUID("3AFB65E2-47EF-40F2-AC2C-70A90D71D343");
GUID.ASF_Index_Placeholder_Object = new GUID("D9AADE20-7C17-4F9C-BC28-8555DD98E2A2");
GUID$1.default = GUID;
var AsfObject$1 = {};
var AsfUtil$1 = {};
Object.defineProperty(AsfUtil$1, "__esModule", { value: true });
AsfUtil$1.AsfUtil = void 0;
const Token$m = lib$1;
const util$6 = Util;
class AsfUtil {
  static getParserForAttr(i) {
    return AsfUtil.attributeParsers[i];
  }
  static parseUnicodeAttr(uint8Array) {
    return util$6.stripNulls(util$6.decodeString(uint8Array, "utf16le"));
  }
  static parseByteArrayAttr(buf) {
    return Buffer.from(buf);
  }
  static parseBoolAttr(buf, offset = 0) {
    return AsfUtil.parseWordAttr(buf, offset) === 1;
  }
  static parseDWordAttr(buf, offset = 0) {
    return buf.readUInt32LE(offset);
  }
  static parseQWordAttr(buf, offset = 0) {
    return Token$m.UINT64_LE.get(buf, offset);
  }
  static parseWordAttr(buf, offset = 0) {
    return buf.readUInt16LE(offset);
  }
}
AsfUtil.attributeParsers = [
  AsfUtil.parseUnicodeAttr,
  AsfUtil.parseByteArrayAttr,
  AsfUtil.parseBoolAttr,
  AsfUtil.parseDWordAttr,
  AsfUtil.parseQWordAttr,
  AsfUtil.parseWordAttr,
  AsfUtil.parseByteArrayAttr
];
AsfUtil$1.AsfUtil = AsfUtil;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.WmPictureToken = exports.MetadataLibraryObjectState = exports.MetadataObjectState = exports.ExtendedStreamPropertiesObjectState = exports.ExtendedContentDescriptionObjectState = exports.ContentDescriptionObjectState = exports.readCodecEntries = exports.HeaderExtensionObject = exports.StreamPropertiesObject = exports.FilePropertiesObject = exports.IgnoreObjectState = exports.State = exports.HeaderObjectToken = exports.TopLevelHeaderObjectToken = exports.DataType = void 0;
  const util2 = Util;
  const Token2 = lib$1;
  const GUID_12 = GUID$1;
  const AsfUtil_1 = AsfUtil$1;
  const ID3v2Token_12 = ID3v2Token;
  (function(DataType) {
    DataType[DataType["UnicodeString"] = 0] = "UnicodeString";
    DataType[DataType["ByteArray"] = 1] = "ByteArray";
    DataType[DataType["Bool"] = 2] = "Bool";
    DataType[DataType["DWord"] = 3] = "DWord";
    DataType[DataType["QWord"] = 4] = "QWord";
    DataType[DataType["Word"] = 5] = "Word";
  })(exports.DataType || (exports.DataType = {}));
  exports.TopLevelHeaderObjectToken = {
    len: 30,
    get: (buf, off) => {
      return {
        objectId: GUID_12.default.fromBin(new Token2.BufferType(16).get(buf, off)),
        objectSize: Number(Token2.UINT64_LE.get(buf, off + 16)),
        numberOfHeaderObjects: Token2.UINT32_LE.get(buf, off + 24)
        // Reserved: 2 bytes
      };
    }
  };
  exports.HeaderObjectToken = {
    len: 24,
    get: (buf, off) => {
      return {
        objectId: GUID_12.default.fromBin(new Token2.BufferType(16).get(buf, off)),
        objectSize: Number(Token2.UINT64_LE.get(buf, off + 16))
      };
    }
  };
  class State {
    constructor(header) {
      this.len = Number(header.objectSize) - exports.HeaderObjectToken.len;
    }
    postProcessTag(tags, name, valueType, data) {
      if (name === "WM/Picture") {
        tags.push({ id: name, value: WmPictureToken.fromBuffer(data) });
      } else {
        const parseAttr = AsfUtil_1.AsfUtil.getParserForAttr(valueType);
        if (!parseAttr) {
          throw new Error("unexpected value headerType: " + valueType);
        }
        tags.push({ id: name, value: parseAttr(data) });
      }
    }
  }
  exports.State = State;
  class IgnoreObjectState extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      return null;
    }
  }
  exports.IgnoreObjectState = IgnoreObjectState;
  class FilePropertiesObject extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      return {
        fileId: GUID_12.default.fromBin(buf, off),
        fileSize: Token2.UINT64_LE.get(buf, off + 16),
        creationDate: Token2.UINT64_LE.get(buf, off + 24),
        dataPacketsCount: Token2.UINT64_LE.get(buf, off + 32),
        playDuration: Token2.UINT64_LE.get(buf, off + 40),
        sendDuration: Token2.UINT64_LE.get(buf, off + 48),
        preroll: Token2.UINT64_LE.get(buf, off + 56),
        flags: {
          broadcast: util2.getBit(buf, off + 64, 24),
          seekable: util2.getBit(buf, off + 64, 25)
        },
        // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
        minimumDataPacketSize: Token2.UINT32_LE.get(buf, off + 68),
        maximumDataPacketSize: Token2.UINT32_LE.get(buf, off + 72),
        maximumBitrate: Token2.UINT32_LE.get(buf, off + 76)
      };
    }
  }
  FilePropertiesObject.guid = GUID_12.default.FilePropertiesObject;
  exports.FilePropertiesObject = FilePropertiesObject;
  class StreamPropertiesObject extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      return {
        streamType: GUID_12.default.decodeMediaType(GUID_12.default.fromBin(buf, off)),
        errorCorrectionType: GUID_12.default.fromBin(buf, off + 8)
        // ToDo
      };
    }
  }
  StreamPropertiesObject.guid = GUID_12.default.StreamPropertiesObject;
  exports.StreamPropertiesObject = StreamPropertiesObject;
  class HeaderExtensionObject {
    constructor() {
      this.len = 22;
    }
    get(buf, off) {
      return {
        reserved1: GUID_12.default.fromBin(buf, off),
        reserved2: buf.readUInt16LE(off + 16),
        extensionDataSize: buf.readUInt32LE(off + 18)
      };
    }
  }
  HeaderExtensionObject.guid = GUID_12.default.HeaderExtensionObject;
  exports.HeaderExtensionObject = HeaderExtensionObject;
  const CodecListObjectHeader = {
    len: 20,
    get: (buf, off) => {
      return {
        entryCount: buf.readUInt16LE(off + 16)
      };
    }
  };
  async function readString(tokenizer) {
    const length = await tokenizer.readNumber(Token2.UINT16_LE);
    return (await tokenizer.readToken(new Token2.StringType(length * 2, "utf16le"))).replace("\0", "");
  }
  async function readCodecEntries(tokenizer) {
    const codecHeader = await tokenizer.readToken(CodecListObjectHeader);
    const entries = [];
    for (let i = 0; i < codecHeader.entryCount; ++i) {
      entries.push(await readCodecEntry(tokenizer));
    }
    return entries;
  }
  exports.readCodecEntries = readCodecEntries;
  async function readInformation(tokenizer) {
    const length = await tokenizer.readNumber(Token2.UINT16_LE);
    const buf = Buffer.alloc(length);
    await tokenizer.readBuffer(buf);
    return buf;
  }
  async function readCodecEntry(tokenizer) {
    const type2 = await tokenizer.readNumber(Token2.UINT16_LE);
    return {
      type: {
        videoCodec: (type2 & 1) === 1,
        audioCodec: (type2 & 2) === 2
      },
      codecName: await readString(tokenizer),
      description: await readString(tokenizer),
      information: await readInformation(tokenizer)
    };
  }
  class ContentDescriptionObjectState extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      const tags = [];
      let pos = off + 10;
      for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
        const length = buf.readUInt16LE(off + i * 2);
        if (length > 0) {
          const tagName = ContentDescriptionObjectState.contentDescTags[i];
          const end = pos + length;
          tags.push({ id: tagName, value: AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, end)) });
          pos = end;
        }
      }
      return tags;
    }
  }
  ContentDescriptionObjectState.guid = GUID_12.default.ContentDescriptionObject;
  ContentDescriptionObjectState.contentDescTags = ["Title", "Author", "Copyright", "Description", "Rating"];
  exports.ContentDescriptionObjectState = ContentDescriptionObjectState;
  class ExtendedContentDescriptionObjectState extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      const tags = [];
      const attrCount = buf.readUInt16LE(off);
      let pos = off + 2;
      for (let i = 0; i < attrCount; i += 1) {
        const nameLen = buf.readUInt16LE(pos);
        pos += 2;
        const name = AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
        pos += nameLen;
        const valueType = buf.readUInt16LE(pos);
        pos += 2;
        const valueLen = buf.readUInt16LE(pos);
        pos += 2;
        const value = buf.slice(pos, pos + valueLen);
        pos += valueLen;
        this.postProcessTag(tags, name, valueType, value);
      }
      return tags;
    }
  }
  ExtendedContentDescriptionObjectState.guid = GUID_12.default.ExtendedContentDescriptionObject;
  exports.ExtendedContentDescriptionObjectState = ExtendedContentDescriptionObjectState;
  class ExtendedStreamPropertiesObjectState extends State {
    constructor(header) {
      super(header);
    }
    get(buf, off) {
      return {
        startTime: Token2.UINT64_LE.get(buf, off),
        endTime: Token2.UINT64_LE.get(buf, off + 8),
        dataBitrate: buf.readInt32LE(off + 12),
        bufferSize: buf.readInt32LE(off + 16),
        initialBufferFullness: buf.readInt32LE(off + 20),
        alternateDataBitrate: buf.readInt32LE(off + 24),
        alternateBufferSize: buf.readInt32LE(off + 28),
        alternateInitialBufferFullness: buf.readInt32LE(off + 32),
        maximumObjectSize: buf.readInt32LE(off + 36),
        flags: {
          reliableFlag: util2.getBit(buf, off + 40, 0),
          seekableFlag: util2.getBit(buf, off + 40, 1),
          resendLiveCleanpointsFlag: util2.getBit(buf, off + 40, 2)
        },
        // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
        streamNumber: buf.readInt16LE(off + 42),
        streamLanguageId: buf.readInt16LE(off + 44),
        averageTimePerFrame: buf.readInt32LE(off + 52),
        streamNameCount: buf.readInt32LE(off + 54),
        payloadExtensionSystems: buf.readInt32LE(off + 56),
        streamNames: [],
        streamPropertiesObject: null
      };
    }
  }
  ExtendedStreamPropertiesObjectState.guid = GUID_12.default.ExtendedStreamPropertiesObject;
  exports.ExtendedStreamPropertiesObjectState = ExtendedStreamPropertiesObjectState;
  class MetadataObjectState extends State {
    constructor(header) {
      super(header);
    }
    get(uint8Array, off) {
      const tags = [];
      const buf = Buffer.from(uint8Array);
      const descriptionRecordsCount = buf.readUInt16LE(off);
      let pos = off + 2;
      for (let i = 0; i < descriptionRecordsCount; i += 1) {
        pos += 4;
        const nameLen = buf.readUInt16LE(pos);
        pos += 2;
        const dataType = buf.readUInt16LE(pos);
        pos += 2;
        const dataLen = buf.readUInt32LE(pos);
        pos += 4;
        const name = AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
        pos += nameLen;
        const data = buf.slice(pos, pos + dataLen);
        pos += dataLen;
        this.postProcessTag(tags, name, dataType, data);
      }
      return tags;
    }
  }
  MetadataObjectState.guid = GUID_12.default.MetadataObject;
  exports.MetadataObjectState = MetadataObjectState;
  class MetadataLibraryObjectState extends MetadataObjectState {
    constructor(header) {
      super(header);
    }
  }
  MetadataLibraryObjectState.guid = GUID_12.default.MetadataLibraryObject;
  exports.MetadataLibraryObjectState = MetadataLibraryObjectState;
  class WmPictureToken {
    static fromBase64(base64str) {
      return this.fromBuffer(Buffer.from(base64str, "base64"));
    }
    static fromBuffer(buffer) {
      const pic = new WmPictureToken(buffer.length);
      return pic.get(buffer, 0);
    }
    constructor(len) {
      this.len = len;
    }
    get(buffer, offset) {
      const typeId = buffer.readUInt8(offset++);
      const size = buffer.readInt32LE(offset);
      let index = 5;
      while (buffer.readUInt16BE(index) !== 0) {
        index += 2;
      }
      const format2 = buffer.slice(5, index).toString("utf16le");
      while (buffer.readUInt16BE(index) !== 0) {
        index += 2;
      }
      const description = buffer.slice(5, index).toString("utf16le");
      return {
        type: ID3v2Token_12.AttachedPictureType[typeId],
        format: format2,
        description,
        size,
        data: buffer.slice(index + 4)
      };
    }
  }
  exports.WmPictureToken = WmPictureToken;
})(AsfObject$1);
Object.defineProperty(AsfParser$1, "__esModule", { value: true });
AsfParser$1.AsfParser = void 0;
const debug_1$j = srcExports;
const type_1$1 = type;
const GUID_1 = GUID$1;
const AsfObject = AsfObject$1;
const BasicParser_1$9 = BasicParser$1;
const debug$j = (0, debug_1$j.default)("music-metadata:parser:ASF");
const headerType = "asf";
class AsfParser extends BasicParser_1$9.BasicParser {
  async parse() {
    const header = await this.tokenizer.readToken(AsfObject.TopLevelHeaderObjectToken);
    if (!header.objectId.equals(GUID_1.default.HeaderObject)) {
      throw new Error("expected asf header; but was not found; got: " + header.objectId.str);
    }
    try {
      await this.parseObjectHeader(header.numberOfHeaderObjects);
    } catch (err) {
      debug$j("Error while parsing ASF: %s", err);
    }
  }
  async parseObjectHeader(numberOfObjectHeaders) {
    let tags;
    do {
      const header = await this.tokenizer.readToken(AsfObject.HeaderObjectToken);
      debug$j("header GUID=%s", header.objectId.str);
      switch (header.objectId.str) {
        case AsfObject.FilePropertiesObject.guid.str:
          const fpo = await this.tokenizer.readToken(new AsfObject.FilePropertiesObject(header));
          this.metadata.setFormat("duration", Number(fpo.playDuration / BigInt(1e3)) / 1e4 - Number(fpo.preroll) / 1e3);
          this.metadata.setFormat("bitrate", fpo.maximumBitrate);
          break;
        case AsfObject.StreamPropertiesObject.guid.str:
          const spo = await this.tokenizer.readToken(new AsfObject.StreamPropertiesObject(header));
          this.metadata.setFormat("container", "ASF/" + spo.streamType);
          break;
        case AsfObject.HeaderExtensionObject.guid.str:
          const extHeader = await this.tokenizer.readToken(new AsfObject.HeaderExtensionObject());
          await this.parseExtensionObject(extHeader.extensionDataSize);
          break;
        case AsfObject.ContentDescriptionObjectState.guid.str:
          tags = await this.tokenizer.readToken(new AsfObject.ContentDescriptionObjectState(header));
          this.addTags(tags);
          break;
        case AsfObject.ExtendedContentDescriptionObjectState.guid.str:
          tags = await this.tokenizer.readToken(new AsfObject.ExtendedContentDescriptionObjectState(header));
          this.addTags(tags);
          break;
        case GUID_1.default.CodecListObject.str:
          const codecs = await AsfObject.readCodecEntries(this.tokenizer);
          codecs.forEach((codec) => {
            this.metadata.addStreamInfo({
              type: codec.type.videoCodec ? type_1$1.TrackType.video : type_1$1.TrackType.audio,
              codecName: codec.codecName
            });
          });
          const audioCodecs = codecs.filter((codec) => codec.type.audioCodec).map((codec) => codec.codecName).join("/");
          this.metadata.setFormat("codec", audioCodecs);
          break;
        case GUID_1.default.StreamBitratePropertiesObject.str:
          await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
          break;
        case GUID_1.default.PaddingObject.str:
          debug$j("Padding: %s bytes", header.objectSize - AsfObject.HeaderObjectToken.len);
          await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
          break;
        default:
          this.metadata.addWarning("Ignore ASF-Object-GUID: " + header.objectId.str);
          debug$j("Ignore ASF-Object-GUID: %s", header.objectId.str);
          await this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
      }
    } while (--numberOfObjectHeaders);
  }
  addTags(tags) {
    tags.forEach((tag) => {
      this.metadata.addTag(headerType, tag.id, tag.value);
    });
  }
  async parseExtensionObject(extensionSize) {
    do {
      const header = await this.tokenizer.readToken(AsfObject.HeaderObjectToken);
      const remaining = header.objectSize - AsfObject.HeaderObjectToken.len;
      switch (header.objectId.str) {
        case AsfObject.ExtendedStreamPropertiesObjectState.guid.str:
          await this.tokenizer.readToken(new AsfObject.ExtendedStreamPropertiesObjectState(header));
          break;
        case AsfObject.MetadataObjectState.guid.str:
          const moTags = await this.tokenizer.readToken(new AsfObject.MetadataObjectState(header));
          this.addTags(moTags);
          break;
        case AsfObject.MetadataLibraryObjectState.guid.str:
          const mlTags = await this.tokenizer.readToken(new AsfObject.MetadataLibraryObjectState(header));
          this.addTags(mlTags);
          break;
        case GUID_1.default.PaddingObject.str:
          await this.tokenizer.ignore(remaining);
          break;
        case GUID_1.default.CompatibilityObject.str:
          this.tokenizer.ignore(remaining);
          break;
        case GUID_1.default.ASF_Index_Placeholder_Object.str:
          await this.tokenizer.ignore(remaining);
          break;
        default:
          this.metadata.addWarning("Ignore ASF-Object-GUID: " + header.objectId.str);
          await this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
          break;
      }
      extensionSize -= header.objectSize;
    } while (extensionSize > 0);
  }
}
AsfParser$1.AsfParser = AsfParser;
var FlacParser$1 = {};
var Vorbis = {};
Object.defineProperty(Vorbis, "__esModule", { value: true });
Vorbis.IdentificationHeader = Vorbis.CommonHeader = Vorbis.VorbisPictureToken = void 0;
const Token$l = lib$1;
const ID3v2Token_1$1 = ID3v2Token;
class VorbisPictureToken {
  static fromBase64(base64str) {
    return this.fromBuffer(Buffer.from(base64str, "base64"));
  }
  static fromBuffer(buffer) {
    const pic = new VorbisPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }
  constructor(len) {
    this.len = len;
  }
  get(buffer, offset) {
    const type2 = ID3v2Token_1$1.AttachedPictureType[Token$l.UINT32_BE.get(buffer, offset)];
    const mimeLen = Token$l.UINT32_BE.get(buffer, offset += 4);
    const format2 = buffer.toString("utf-8", offset += 4, offset + mimeLen);
    const descLen = Token$l.UINT32_BE.get(buffer, offset += mimeLen);
    const description = buffer.toString("utf-8", offset += 4, offset + descLen);
    const width = Token$l.UINT32_BE.get(buffer, offset += descLen);
    const height = Token$l.UINT32_BE.get(buffer, offset += 4);
    const colour_depth = Token$l.UINT32_BE.get(buffer, offset += 4);
    const indexed_color = Token$l.UINT32_BE.get(buffer, offset += 4);
    const picDataLen = Token$l.UINT32_BE.get(buffer, offset += 4);
    const data = Buffer.from(buffer.slice(offset += 4, offset + picDataLen));
    return {
      type: type2,
      format: format2,
      description,
      width,
      height,
      colour_depth,
      indexed_color,
      data
    };
  }
}
Vorbis.VorbisPictureToken = VorbisPictureToken;
Vorbis.CommonHeader = {
  len: 7,
  get: (buf, off) => {
    return {
      packetType: buf.readUInt8(off),
      vorbis: new Token$l.StringType(6, "ascii").get(buf, off + 1)
    };
  }
};
Vorbis.IdentificationHeader = {
  len: 23,
  get: (uint8Array, off) => {
    const dataView = new DataView(uint8Array.buffer, uint8Array.byteOffset);
    return {
      version: dataView.getUint32(off + 0, true),
      channelMode: dataView.getUint8(off + 4),
      sampleRate: dataView.getUint32(off + 5, true),
      bitrateMax: dataView.getUint32(off + 9, true),
      bitrateNominal: dataView.getUint32(off + 13, true),
      bitrateMin: dataView.getUint32(off + 17, true)
    };
  }
};
var AbstractID3Parser$1 = {};
Object.defineProperty(AbstractID3Parser$1, "__esModule", { value: true });
AbstractID3Parser$1.AbstractID3Parser = void 0;
const core_1$2 = core$1;
const debug_1$i = srcExports;
const ID3v2Token_1 = ID3v2Token;
const ID3v2Parser_1$3 = ID3v2Parser$1;
const ID3v1Parser_1$2 = ID3v1Parser;
const BasicParser_1$8 = BasicParser$1;
const debug$i = (0, debug_1$i.default)("music-metadata:parser:ID3");
class AbstractID3Parser extends BasicParser_1$8.BasicParser {
  constructor() {
    super(...arguments);
    this.id3parser = new ID3v2Parser_1$3.ID3v2Parser();
  }
  static async startsWithID3v2Header(tokenizer) {
    return (await tokenizer.peekToken(ID3v2Token_1.ID3v2Header)).fileIdentifier === "ID3";
  }
  async parse() {
    try {
      await this.parseID3v2();
    } catch (err) {
      if (err instanceof core_1$2.EndOfStreamError) {
        debug$i(`End-of-stream`);
      } else {
        throw err;
      }
    }
  }
  finalize() {
    return;
  }
  async parseID3v2() {
    await this.tryReadId3v2Headers();
    debug$i("End of ID3v2 header, go to MPEG-parser: pos=%s", this.tokenizer.position);
    await this.postId3v2Parse();
    if (this.options.skipPostHeaders && this.metadata.hasAny()) {
      this.finalize();
    } else {
      const id3v1parser = new ID3v1Parser_1$2.ID3v1Parser();
      await id3v1parser.init(this.metadata, this.tokenizer, this.options).parse();
      this.finalize();
    }
  }
  async tryReadId3v2Headers() {
    const id3Header = await this.tokenizer.peekToken(ID3v2Token_1.ID3v2Header);
    if (id3Header.fileIdentifier === "ID3") {
      debug$i("Found ID3v2 header, pos=%s", this.tokenizer.position);
      await this.id3parser.parse(this.metadata, this.tokenizer, this.options);
      return this.tryReadId3v2Headers();
    }
  }
}
AbstractID3Parser$1.AbstractID3Parser = AbstractID3Parser;
var VorbisParser$1 = {};
var VorbisDecoder$1 = {};
Object.defineProperty(VorbisDecoder$1, "__esModule", { value: true });
VorbisDecoder$1.VorbisDecoder = void 0;
const Token$k = lib$1;
class VorbisDecoder {
  constructor(data, offset) {
    this.data = data;
    this.offset = offset;
  }
  readInt32() {
    const value = Token$k.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }
  readStringUtf8() {
    const len = this.readInt32();
    const value = Buffer.from(this.data).toString("utf-8", this.offset, this.offset + len);
    this.offset += len;
    return value;
  }
  parseUserComment() {
    const offset0 = this.offset;
    const v = this.readStringUtf8();
    const idx = v.indexOf("=");
    return {
      key: v.slice(0, idx).toUpperCase(),
      value: v.slice(idx + 1),
      len: this.offset - offset0
    };
  }
}
VorbisDecoder$1.VorbisDecoder = VorbisDecoder;
Object.defineProperty(VorbisParser$1, "__esModule", { value: true });
VorbisParser$1.VorbisParser = void 0;
const Token$j = lib$1;
const debug_1$h = srcExports;
const VorbisDecoder_1$1 = VorbisDecoder$1;
const Vorbis_1$1 = Vorbis;
const debug$h = (0, debug_1$h.default)("music-metadata:parser:ogg:vorbis1");
class VorbisParser {
  constructor(metadata, options) {
    this.metadata = metadata;
    this.options = options;
    this.pageSegments = [];
  }
  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  parsePage(header, pageData) {
    if (header.headerType.firstPage) {
      this.parseFirstPage(header, pageData);
    } else {
      if (header.headerType.continued) {
        if (this.pageSegments.length === 0) {
          throw new Error("Cannot continue on previous page");
        }
        this.pageSegments.push(pageData);
      }
      if (header.headerType.lastPage || !header.headerType.continued) {
        if (this.pageSegments.length > 0) {
          const fullPage = Buffer.concat(this.pageSegments);
          this.parseFullPage(fullPage);
        }
        this.pageSegments = header.headerType.lastPage ? [] : [pageData];
      }
    }
    if (header.headerType.lastPage) {
      this.calculateDuration(header);
    }
  }
  flush() {
    this.parseFullPage(Buffer.concat(this.pageSegments));
  }
  parseUserComment(pageData, offset) {
    const decoder = new VorbisDecoder_1$1.VorbisDecoder(pageData, offset);
    const tag = decoder.parseUserComment();
    this.addTag(tag.key, tag.value);
    return tag.len;
  }
  addTag(id, value) {
    if (id === "METADATA_BLOCK_PICTURE" && typeof value === "string") {
      if (this.options.skipCovers) {
        debug$h(`Ignore picture`);
        return;
      }
      value = Vorbis_1$1.VorbisPictureToken.fromBase64(value);
      debug$h(`Push picture: id=${id}, format=${value.format}`);
    } else {
      debug$h(`Push tag: id=${id}, value=${value}`);
    }
    this.metadata.addTag("vorbis", id, value);
  }
  calculateDuration(header) {
    if (this.metadata.format.sampleRate && header.absoluteGranulePosition >= 0) {
      this.metadata.setFormat("numberOfSamples", header.absoluteGranulePosition);
      this.metadata.setFormat("duration", this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
    }
  }
  /**
   * Parse first Ogg/Vorbis page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  parseFirstPage(header, pageData) {
    this.metadata.setFormat("codec", "Vorbis I");
    debug$h("Parse first page");
    const commonHeader = Vorbis_1$1.CommonHeader.get(pageData, 0);
    if (commonHeader.vorbis !== "vorbis")
      throw new Error("Metadata does not look like Vorbis");
    if (commonHeader.packetType === 1) {
      const idHeader = Vorbis_1$1.IdentificationHeader.get(pageData, Vorbis_1$1.CommonHeader.len);
      this.metadata.setFormat("sampleRate", idHeader.sampleRate);
      this.metadata.setFormat("bitrate", idHeader.bitrateNominal);
      this.metadata.setFormat("numberOfChannels", idHeader.channelMode);
      debug$h("sample-rate=%s[hz], bitrate=%s[b/s], channel-mode=%s", idHeader.sampleRate, idHeader.bitrateNominal, idHeader.channelMode);
    } else
      throw new Error("First Ogg page should be type 1: the identification header");
  }
  parseFullPage(pageData) {
    const commonHeader = Vorbis_1$1.CommonHeader.get(pageData, 0);
    debug$h("Parse full page: type=%s, byteLength=%s", commonHeader.packetType, pageData.byteLength);
    switch (commonHeader.packetType) {
      case 3:
        return this.parseUserCommentList(pageData, Vorbis_1$1.CommonHeader.len);
    }
  }
  /**
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
   */
  parseUserCommentList(pageData, offset) {
    const strLen = Token$j.UINT32_LE.get(pageData, offset);
    offset += 4;
    offset += strLen;
    let userCommentListLength = Token$j.UINT32_LE.get(pageData, offset);
    offset += 4;
    while (userCommentListLength-- > 0) {
      offset += this.parseUserComment(pageData, offset);
    }
  }
}
VorbisParser$1.VorbisParser = VorbisParser;
Object.defineProperty(FlacParser$1, "__esModule", { value: true });
FlacParser$1.FlacParser = void 0;
const token_types_1$1 = lib$1;
const debug_1$g = srcExports;
const util$5 = Util;
const Vorbis_1 = Vorbis;
const AbstractID3Parser_1$3 = AbstractID3Parser$1;
const FourCC_1$7 = FourCC;
const VorbisParser_1$3 = VorbisParser$1;
const VorbisDecoder_1 = VorbisDecoder$1;
const debug$g = (0, debug_1$g.default)("music-metadata:parser:FLAC");
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
class FlacParser extends AbstractID3Parser_1$3.AbstractID3Parser {
  constructor() {
    super(...arguments);
    this.padding = 0;
  }
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  init(metadata, tokenizer, options) {
    super.init(metadata, tokenizer, options);
    this.vorbisParser = new VorbisParser_1$3.VorbisParser(metadata, options);
    return this;
  }
  async postId3v2Parse() {
    const fourCC = await this.tokenizer.readToken(FourCC_1$7.FourCcToken);
    if (fourCC.toString() !== "fLaC") {
      throw new Error("Invalid FLAC preamble");
    }
    let blockHeader;
    do {
      blockHeader = await this.tokenizer.readToken(Metadata.BlockHeader);
      await this.parseDataBlock(blockHeader);
    } while (!blockHeader.lastBlock);
    if (this.tokenizer.fileInfo.size && this.metadata.format.duration) {
      const dataSize = this.tokenizer.fileInfo.size - this.tokenizer.position;
      this.metadata.setFormat("bitrate", 8 * dataSize / this.metadata.format.duration);
    }
  }
  parseDataBlock(blockHeader) {
    debug$g(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
    switch (blockHeader.type) {
      case BlockType.STREAMINFO:
        return this.parseBlockStreamInfo(blockHeader.length);
      case BlockType.PADDING:
        this.padding += blockHeader.length;
        break;
      case BlockType.APPLICATION:
        break;
      case BlockType.SEEKTABLE:
        break;
      case BlockType.VORBIS_COMMENT:
        return this.parseComment(blockHeader.length);
      case BlockType.CUESHEET:
        break;
      case BlockType.PICTURE:
        return this.parsePicture(blockHeader.length).then();
      default:
        this.metadata.addWarning("Unknown block type: " + blockHeader.type);
    }
    return this.tokenizer.ignore(blockHeader.length).then();
  }
  /**
   * Parse STREAMINFO
   */
  async parseBlockStreamInfo(dataLen) {
    if (dataLen !== Metadata.BlockStreamInfo.len)
      throw new Error("Unexpected block-stream-info length");
    const streamInfo = await this.tokenizer.readToken(Metadata.BlockStreamInfo);
    this.metadata.setFormat("container", "FLAC");
    this.metadata.setFormat("codec", "FLAC");
    this.metadata.setFormat("lossless", true);
    this.metadata.setFormat("numberOfChannels", streamInfo.channels);
    this.metadata.setFormat("bitsPerSample", streamInfo.bitsPerSample);
    this.metadata.setFormat("sampleRate", streamInfo.sampleRate);
    if (streamInfo.totalSamples > 0) {
      this.metadata.setFormat("duration", streamInfo.totalSamples / streamInfo.sampleRate);
    }
  }
  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  async parseComment(dataLen) {
    const data = await this.tokenizer.readToken(new token_types_1$1.Uint8ArrayType(dataLen));
    const decoder = new VorbisDecoder_1.VorbisDecoder(data, 0);
    decoder.readStringUtf8();
    const commentListLength = decoder.readInt32();
    for (let i = 0; i < commentListLength; i++) {
      const tag = decoder.parseUserComment();
      this.vorbisParser.addTag(tag.key, tag.value);
    }
  }
  async parsePicture(dataLen) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    } else {
      const picture = await this.tokenizer.readToken(new Vorbis_1.VorbisPictureToken(dataLen));
      this.vorbisParser.addTag("METADATA_BLOCK_PICTURE", picture);
    }
  }
}
FlacParser$1.FlacParser = FlacParser;
class Metadata {
}
Metadata.BlockHeader = {
  len: 4,
  get: (buf, off) => {
    return {
      lastBlock: util$5.getBit(buf, off, 7),
      type: util$5.getBitAllignedNumber(buf, off, 1, 7),
      length: token_types_1$1.UINT24_BE.get(buf, off + 1)
    };
  }
};
Metadata.BlockStreamInfo = {
  len: 34,
  get: (buf, off) => {
    return {
      // The minimum block size (in samples) used in the stream.
      minimumBlockSize: token_types_1$1.UINT16_BE.get(buf, off),
      // The maximum block size (in samples) used in the stream.
      // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
      maximumBlockSize: token_types_1$1.UINT16_BE.get(buf, off + 2) / 1e3,
      // The minimum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      minimumFrameSize: token_types_1$1.UINT24_BE.get(buf, off + 4),
      // The maximum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      maximumFrameSize: token_types_1$1.UINT24_BE.get(buf, off + 7),
      // Sample rate in Hz. Though 20 bits are available,
      // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
      // Also, a value of 0 is invalid.
      sampleRate: token_types_1$1.UINT24_BE.get(buf, off + 10) >> 4,
      // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
      // (number of channels)-1. FLAC supports from 1 to 8 channels
      channels: util$5.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
      // bits per sample)-1.
      // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
      bitsPerSample: util$5.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
      // Total samples in stream.
      // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
      // A value of zero here means the number of total samples is unknown.
      totalSamples: util$5.getBitAllignedNumber(buf, off + 13, 4, 36),
      // the MD5 hash of the file (see notes for usage... it's a littly tricky)
      fileMD5: new token_types_1$1.Uint8ArrayType(16).get(buf, off + 18)
    };
  }
};
var MP4Parser$1 = {};
var Atom$1 = {};
var AtomToken$2 = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ChapterText = exports.StcoAtom = exports.StszAtom = exports.StscAtom = exports.SampleToChunkToken = exports.SttsAtom = exports.TimeToSampleToken = exports.SoundSampleDescriptionV0 = exports.SoundSampleDescriptionVersion = exports.StsdAtom = exports.TrackHeaderAtom = exports.NameAtom = exports.DataAtom = exports.MvhdAtom = exports.MdhdAtom = exports.FixedLengthAtom = exports.mhdr = exports.tkhd = exports.ftyp = exports.ExtendedSize = exports.Header = void 0;
  const Token2 = lib$1;
  const debug_12 = srcExports;
  const FourCC_12 = FourCC;
  const debug2 = (0, debug_12.default)("music-metadata:parser:MP4:atom");
  exports.Header = {
    len: 8,
    get: (buf, off) => {
      const length = Token2.UINT32_BE.get(buf, off);
      if (length < 0)
        throw new Error("Invalid atom header length");
      return {
        length: BigInt(length),
        name: new Token2.StringType(4, "binary").get(buf, off + 4)
      };
    },
    put: (buf, off, hdr) => {
      Token2.UINT32_BE.put(buf, off, Number(hdr.length));
      return FourCC_12.FourCcToken.put(buf, off + 4, hdr.name);
    }
  };
  exports.ExtendedSize = Token2.UINT64_BE;
  exports.ftyp = {
    len: 4,
    get: (buf, off) => {
      return {
        type: new Token2.StringType(4, "ascii").get(buf, off)
      };
    }
  };
  exports.tkhd = {
    len: 4,
    get: (buf, off) => {
      return {
        type: new Token2.StringType(4, "ascii").get(buf, off)
      };
    }
  };
  exports.mhdr = {
    len: 8,
    get: (buf, off) => {
      return {
        version: Token2.UINT8.get(buf, off),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        nextItemID: Token2.UINT32_BE.get(buf, off + 4)
      };
    }
  };
  class FixedLengthAtom {
    /**
     *
     * @param {number} len Length as specified in the size field
     * @param {number} expLen Total length of sum of specified fields in the standard
     */
    constructor(len, expLen, atomId) {
      this.len = len;
      if (len < expLen) {
        throw new Error(`Atom ${atomId} expected to be ${expLen}, but specifies ${len} bytes long.`);
      } else if (len > expLen) {
        debug2(`Warning: atom ${atomId} expected to be ${expLen}, but was actually ${len} bytes long.`);
      }
    }
  }
  exports.FixedLengthAtom = FixedLengthAtom;
  const SecondsSinceMacEpoch = {
    len: 4,
    get: (buf, off) => {
      const secondsSinceUnixEpoch = Token2.UINT32_BE.get(buf, off) - 2082844800;
      return new Date(secondsSinceUnixEpoch * 1e3);
    }
  };
  class MdhdAtom extends FixedLengthAtom {
    constructor(len) {
      super(len, 24, "mdhd");
      this.len = len;
    }
    get(buf, off) {
      return {
        version: Token2.UINT8.get(buf, off + 0),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
        modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
        timeScale: Token2.UINT32_BE.get(buf, off + 12),
        duration: Token2.UINT32_BE.get(buf, off + 16),
        language: Token2.UINT16_BE.get(buf, off + 20),
        quality: Token2.UINT16_BE.get(buf, off + 22)
      };
    }
  }
  exports.MdhdAtom = MdhdAtom;
  class MvhdAtom extends FixedLengthAtom {
    constructor(len) {
      super(len, 100, "mvhd");
      this.len = len;
    }
    get(buf, off) {
      return {
        version: Token2.UINT8.get(buf, off),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
        modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
        timeScale: Token2.UINT32_BE.get(buf, off + 12),
        duration: Token2.UINT32_BE.get(buf, off + 16),
        preferredRate: Token2.UINT32_BE.get(buf, off + 20),
        preferredVolume: Token2.UINT16_BE.get(buf, off + 24),
        // ignore reserver: 10 bytes
        // ignore matrix structure: 36 bytes
        previewTime: Token2.UINT32_BE.get(buf, off + 72),
        previewDuration: Token2.UINT32_BE.get(buf, off + 76),
        posterTime: Token2.UINT32_BE.get(buf, off + 80),
        selectionTime: Token2.UINT32_BE.get(buf, off + 84),
        selectionDuration: Token2.UINT32_BE.get(buf, off + 88),
        currentTime: Token2.UINT32_BE.get(buf, off + 92),
        nextTrackID: Token2.UINT32_BE.get(buf, off + 96)
      };
    }
  }
  exports.MvhdAtom = MvhdAtom;
  class DataAtom {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      return {
        type: {
          set: Token2.UINT8.get(buf, off + 0),
          type: Token2.UINT24_BE.get(buf, off + 1)
        },
        locale: Token2.UINT24_BE.get(buf, off + 4),
        value: Buffer.from(new Token2.Uint8ArrayType(this.len - 8).get(buf, off + 8))
      };
    }
  }
  exports.DataAtom = DataAtom;
  class NameAtom {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      return {
        version: Token2.UINT8.get(buf, off),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        name: new Token2.StringType(this.len - 4, "utf-8").get(buf, off + 4)
      };
    }
  }
  exports.NameAtom = NameAtom;
  class TrackHeaderAtom {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      return {
        version: Token2.UINT8.get(buf, off),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
        modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
        trackId: Token2.UINT32_BE.get(buf, off + 12),
        // reserved 4 bytes
        duration: Token2.UINT32_BE.get(buf, off + 20),
        layer: Token2.UINT16_BE.get(buf, off + 24),
        alternateGroup: Token2.UINT16_BE.get(buf, off + 26),
        volume: Token2.UINT16_BE.get(buf, off + 28)
        // ToDo: fixed point
        // ToDo: add remaining fields
      };
    }
  }
  exports.TrackHeaderAtom = TrackHeaderAtom;
  const stsdHeader = {
    len: 8,
    get: (buf, off) => {
      return {
        version: Token2.UINT8.get(buf, off),
        flags: Token2.UINT24_BE.get(buf, off + 1),
        numberOfEntries: Token2.UINT32_BE.get(buf, off + 4)
      };
    }
  };
  class SampleDescriptionTable {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      return {
        dataFormat: FourCC_12.FourCcToken.get(buf, off),
        dataReferenceIndex: Token2.UINT16_BE.get(buf, off + 10),
        description: new Token2.Uint8ArrayType(this.len - 12).get(buf, off + 12)
      };
    }
  }
  class StsdAtom {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      const header = stsdHeader.get(buf, off);
      off += stsdHeader.len;
      const table = [];
      for (let n = 0; n < header.numberOfEntries; ++n) {
        const size = Token2.UINT32_BE.get(buf, off);
        off += Token2.UINT32_BE.len;
        table.push(new SampleDescriptionTable(size).get(buf, off));
        off += size;
      }
      return {
        header,
        table
      };
    }
  }
  exports.StsdAtom = StsdAtom;
  exports.SoundSampleDescriptionVersion = {
    len: 8,
    get(buf, off) {
      return {
        version: Token2.INT16_BE.get(buf, off),
        revision: Token2.INT16_BE.get(buf, off + 2),
        vendor: Token2.INT32_BE.get(buf, off + 4)
      };
    }
  };
  exports.SoundSampleDescriptionV0 = {
    len: 12,
    get(buf, off) {
      return {
        numAudioChannels: Token2.INT16_BE.get(buf, off + 0),
        sampleSize: Token2.INT16_BE.get(buf, off + 2),
        compressionId: Token2.INT16_BE.get(buf, off + 4),
        packetSize: Token2.INT16_BE.get(buf, off + 6),
        sampleRate: Token2.UINT16_BE.get(buf, off + 8) + Token2.UINT16_BE.get(buf, off + 10) / 1e4
      };
    }
  };
  class SimpleTableAtom {
    constructor(len, token) {
      this.len = len;
      this.token = token;
    }
    get(buf, off) {
      const nrOfEntries = Token2.INT32_BE.get(buf, off + 4);
      return {
        version: Token2.INT8.get(buf, off + 0),
        flags: Token2.INT24_BE.get(buf, off + 1),
        numberOfEntries: nrOfEntries,
        entries: readTokenTable(buf, this.token, off + 8, this.len - 8, nrOfEntries)
      };
    }
  }
  exports.TimeToSampleToken = {
    len: 8,
    get(buf, off) {
      return {
        count: Token2.INT32_BE.get(buf, off + 0),
        duration: Token2.INT32_BE.get(buf, off + 4)
      };
    }
  };
  class SttsAtom extends SimpleTableAtom {
    constructor(len) {
      super(len, exports.TimeToSampleToken);
      this.len = len;
    }
  }
  exports.SttsAtom = SttsAtom;
  exports.SampleToChunkToken = {
    len: 12,
    get(buf, off) {
      return {
        firstChunk: Token2.INT32_BE.get(buf, off),
        samplesPerChunk: Token2.INT32_BE.get(buf, off + 4),
        sampleDescriptionId: Token2.INT32_BE.get(buf, off + 8)
      };
    }
  };
  class StscAtom extends SimpleTableAtom {
    constructor(len) {
      super(len, exports.SampleToChunkToken);
      this.len = len;
    }
  }
  exports.StscAtom = StscAtom;
  class StszAtom {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      const nrOfEntries = Token2.INT32_BE.get(buf, off + 8);
      return {
        version: Token2.INT8.get(buf, off),
        flags: Token2.INT24_BE.get(buf, off + 1),
        sampleSize: Token2.INT32_BE.get(buf, off + 4),
        numberOfEntries: nrOfEntries,
        entries: readTokenTable(buf, Token2.INT32_BE, off + 12, this.len - 12, nrOfEntries)
      };
    }
  }
  exports.StszAtom = StszAtom;
  class StcoAtom extends SimpleTableAtom {
    constructor(len) {
      super(len, Token2.INT32_BE);
      this.len = len;
    }
  }
  exports.StcoAtom = StcoAtom;
  class ChapterText {
    constructor(len) {
      this.len = len;
    }
    get(buf, off) {
      const titleLen = Token2.INT16_BE.get(buf, off + 0);
      const str = new Token2.StringType(titleLen, "utf-8");
      return str.get(buf, off + 2);
    }
  }
  exports.ChapterText = ChapterText;
  function readTokenTable(buf, token, off, remainingLen, numberOfEntries) {
    debug2(`remainingLen=${remainingLen}, numberOfEntries=${numberOfEntries} * token-len=${token.len}`);
    if (remainingLen === 0)
      return [];
    if (remainingLen !== numberOfEntries * token.len)
      throw new Error("mismatch number-of-entries with remaining atom-length");
    const entries = [];
    for (let n = 0; n < numberOfEntries; ++n) {
      entries.push(token.get(buf, off));
      off += token.len;
    }
    return entries;
  }
})(AtomToken$2);
Object.defineProperty(Atom$1, "__esModule", { value: true });
Atom$1.Atom = void 0;
const debug_1$f = srcExports;
const AtomToken$1 = AtomToken$2;
const debug$f = (0, debug_1$f.default)("music-metadata:parser:MP4:Atom");
class Atom {
  static async readAtom(tokenizer, dataHandler, parent, remaining) {
    const offset = tokenizer.position;
    const header = await tokenizer.readToken(AtomToken$1.Header);
    const extended = header.length === BigInt(1);
    if (extended) {
      header.length = await tokenizer.readToken(AtomToken$1.ExtendedSize);
    }
    const atomBean = new Atom(header, header.length === BigInt(1), parent);
    const payloadLength = atomBean.getPayloadLength(remaining);
    debug$f(`parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`);
    await atomBean.readData(tokenizer, dataHandler, payloadLength);
    return atomBean;
  }
  constructor(header, extended, parent) {
    this.header = header;
    this.extended = extended;
    this.parent = parent;
    this.children = [];
    this.atomPath = (this.parent ? this.parent.atomPath + "." : "") + this.header.name;
  }
  getHeaderLength() {
    return this.extended ? 16 : 8;
  }
  getPayloadLength(remaining) {
    return (this.header.length === BigInt(0) ? remaining : Number(this.header.length)) - this.getHeaderLength();
  }
  async readAtoms(tokenizer, dataHandler, size) {
    while (size > 0) {
      const atomBean = await Atom.readAtom(tokenizer, dataHandler, this, size);
      this.children.push(atomBean);
      size -= atomBean.header.length === BigInt(0) ? size : Number(atomBean.header.length);
    }
  }
  async readData(tokenizer, dataHandler, remaining) {
    switch (this.header.name) {
      case "moov":
      case "udta":
      case "trak":
      case "mdia":
      case "minf":
      case "stbl":
      case "<id>":
      case "ilst":
      case "tref":
        return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining));
      case "meta":
        const peekHeader = await tokenizer.peekToken(AtomToken$1.Header);
        const paddingLength = peekHeader.name === "hdlr" ? 0 : 4;
        await tokenizer.ignore(paddingLength);
        return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining) - paddingLength);
      case "mdhd":
      case "mvhd":
      case "tkhd":
      case "stsz":
      case "mdat":
      default:
        return dataHandler(this, remaining);
    }
  }
}
Atom$1.Atom = Atom;
Object.defineProperty(MP4Parser$1, "__esModule", { value: true });
MP4Parser$1.MP4Parser = void 0;
const debug_1$e = srcExports;
const Token$i = lib$1;
const BasicParser_1$7 = BasicParser$1;
const ID3v1Parser_1$1 = ID3v1Parser;
const type_1 = type;
const Atom_1 = Atom$1;
const AtomToken = AtomToken$2;
const debug$e = (0, debug_1$e.default)("music-metadata:parser:MP4");
const tagFormat = "iTunes";
const encoderDict = {
  raw: {
    lossy: false,
    format: "raw"
  },
  MAC3: {
    lossy: true,
    format: "MACE 3:1"
  },
  MAC6: {
    lossy: true,
    format: "MACE 6:1"
  },
  ima4: {
    lossy: true,
    format: "IMA 4:1"
  },
  ulaw: {
    lossy: true,
    format: "uLaw 2:1"
  },
  alaw: {
    lossy: true,
    format: "uLaw 2:1"
  },
  Qclp: {
    lossy: true,
    format: "QUALCOMM PureVoice"
  },
  ".mp3": {
    lossy: true,
    format: "MPEG-1 layer 3"
  },
  alac: {
    lossy: false,
    format: "ALAC"
  },
  "ac-3": {
    lossy: true,
    format: "AC-3"
  },
  mp4a: {
    lossy: true,
    format: "MPEG-4/AAC"
  },
  mp4s: {
    lossy: true,
    format: "MP4S"
  },
  // Closed Captioning Media, https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-SW87
  c608: {
    lossy: true,
    format: "CEA-608"
  },
  c708: {
    lossy: true,
    format: "CEA-708"
  }
};
function distinct(value, index, self2) {
  return self2.indexOf(value) === index;
}
class MP4Parser extends BasicParser_1$7.BasicParser {
  constructor() {
    super(...arguments);
    this.atomParsers = {
      /**
       * Parse movie header (mvhd) atom
       * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-56313
       */
      mvhd: async (len) => {
        const mvhd = await this.tokenizer.readToken(new AtomToken.MvhdAtom(len));
        this.metadata.setFormat("creationTime", mvhd.creationTime);
        this.metadata.setFormat("modificationTime", mvhd.modificationTime);
      },
      /**
       * Parse media header (mdhd) atom
       * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25615
       */
      mdhd: async (len) => {
        const mdhd_data = await this.tokenizer.readToken(new AtomToken.MdhdAtom(len));
        const td = this.getTrackDescription();
        td.creationTime = mdhd_data.creationTime;
        td.modificationTime = mdhd_data.modificationTime;
        td.timeScale = mdhd_data.timeScale;
        td.duration = mdhd_data.duration;
      },
      chap: async (len) => {
        const td = this.getTrackDescription();
        const trackIds = [];
        while (len >= Token$i.UINT32_BE.len) {
          trackIds.push(await this.tokenizer.readNumber(Token$i.UINT32_BE));
          len -= Token$i.UINT32_BE.len;
        }
        td.chapterList = trackIds;
      },
      tkhd: async (len) => {
        const track = await this.tokenizer.readToken(new AtomToken.TrackHeaderAtom(len));
        this.tracks.push(track);
      },
      /**
       * Parse mdat atom.
       * Will scan for chapters
       */
      mdat: async (len) => {
        this.audioLengthInBytes = len;
        this.calculateBitRate();
        if (this.options.includeChapters) {
          const trackWithChapters = this.tracks.filter((track) => track.chapterList);
          if (trackWithChapters.length === 1) {
            const chapterTrackIds = trackWithChapters[0].chapterList;
            const chapterTracks = this.tracks.filter((track) => chapterTrackIds.indexOf(track.trackId) !== -1);
            if (chapterTracks.length === 1) {
              return this.parseChapterTrack(chapterTracks[0], trackWithChapters[0], len);
            }
          }
        }
        await this.tokenizer.ignore(len);
      },
      ftyp: async (len) => {
        const types2 = [];
        while (len > 0) {
          const ftype = await this.tokenizer.readToken(AtomToken.ftyp);
          len -= AtomToken.ftyp.len;
          const value = ftype.type.replace(/\W/g, "");
          if (value.length > 0) {
            types2.push(value);
          }
        }
        debug$e(`ftyp: ${types2.join("/")}`);
        const x = types2.filter(distinct).join("/");
        this.metadata.setFormat("container", x);
      },
      /**
       * Parse sample description atom
       */
      stsd: async (len) => {
        const stsd = await this.tokenizer.readToken(new AtomToken.StsdAtom(len));
        const trackDescription = this.getTrackDescription();
        trackDescription.soundSampleDescription = stsd.table.map((dfEntry) => this.parseSoundSampleDescription(dfEntry));
      },
      /**
       * sample-to-Chunk Atoms
       */
      stsc: async (len) => {
        const stsc = await this.tokenizer.readToken(new AtomToken.StscAtom(len));
        this.getTrackDescription().sampleToChunkTable = stsc.entries;
      },
      /**
       * time-to-sample table
       */
      stts: async (len) => {
        const stts = await this.tokenizer.readToken(new AtomToken.SttsAtom(len));
        this.getTrackDescription().timeToSampleTable = stts.entries;
      },
      /**
       * Parse sample-sizes atom ('stsz')
       */
      stsz: async (len) => {
        const stsz = await this.tokenizer.readToken(new AtomToken.StszAtom(len));
        const td = this.getTrackDescription();
        td.sampleSize = stsz.sampleSize;
        td.sampleSizeTable = stsz.entries;
      },
      /**
       * Parse chunk-offset atom ('stco')
       */
      stco: async (len) => {
        const stco = await this.tokenizer.readToken(new AtomToken.StcoAtom(len));
        this.getTrackDescription().chunkOffsetTable = stco.entries;
      },
      date: async (len) => {
        const date = await this.tokenizer.readToken(new Token$i.StringType(len, "utf-8"));
        this.addTag("date", date);
      }
    };
  }
  static read_BE_Integer(array, signed) {
    const integerType = (signed ? "INT" : "UINT") + array.length * 8 + (array.length > 1 ? "_BE" : "");
    const token = Token$i[integerType];
    if (!token) {
      throw new Error('Token for integer type not found: "' + integerType + '"');
    }
    return Number(token.get(array, 0));
  }
  async parse() {
    this.tracks = [];
    let remainingFileSize = this.tokenizer.fileInfo.size;
    while (!this.tokenizer.fileInfo.size || remainingFileSize > 0) {
      try {
        const token = await this.tokenizer.peekToken(AtomToken.Header);
        if (token.name === "\0\0\0\0") {
          const errMsg = `Error at offset=${this.tokenizer.position}: box.id=0`;
          debug$e(errMsg);
          this.addWarning(errMsg);
          break;
        }
      } catch (error) {
        const errMsg = `Error at offset=${this.tokenizer.position}: ${error.message}`;
        debug$e(errMsg);
        this.addWarning(errMsg);
        break;
      }
      const rootAtom = await Atom_1.Atom.readAtom(this.tokenizer, (atom, remaining) => this.handleAtom(atom, remaining), null, remainingFileSize);
      remainingFileSize -= rootAtom.header.length === BigInt(0) ? remainingFileSize : Number(rootAtom.header.length);
    }
    const formatList = [];
    this.tracks.forEach((track) => {
      const trackFormats = [];
      track.soundSampleDescription.forEach((ssd) => {
        const streamInfo = {};
        const encoderInfo = encoderDict[ssd.dataFormat];
        if (encoderInfo) {
          trackFormats.push(encoderInfo.format);
          streamInfo.codecName = encoderInfo.format;
        } else {
          streamInfo.codecName = `<${ssd.dataFormat}>`;
        }
        if (ssd.description) {
          const { description } = ssd;
          if (description.sampleRate > 0) {
            streamInfo.type = type_1.TrackType.audio;
            streamInfo.audio = {
              samplingFrequency: description.sampleRate,
              bitDepth: description.sampleSize,
              channels: description.numAudioChannels
            };
          }
        }
        this.metadata.addStreamInfo(streamInfo);
      });
      if (trackFormats.length >= 1) {
        formatList.push(trackFormats.join("/"));
      }
    });
    if (formatList.length > 0) {
      this.metadata.setFormat("codec", formatList.filter(distinct).join("+"));
    }
    const audioTracks = this.tracks.filter((track) => {
      return track.soundSampleDescription.length >= 1 && track.soundSampleDescription[0].description && track.soundSampleDescription[0].description.numAudioChannels > 0;
    });
    if (audioTracks.length >= 1) {
      const audioTrack = audioTracks[0];
      if (audioTrack.timeScale > 0) {
        const duration = audioTrack.duration / audioTrack.timeScale;
        this.metadata.setFormat("duration", duration);
      }
      const ssd = audioTrack.soundSampleDescription[0];
      if (ssd.description) {
        this.metadata.setFormat("sampleRate", ssd.description.sampleRate);
        this.metadata.setFormat("bitsPerSample", ssd.description.sampleSize);
        this.metadata.setFormat("numberOfChannels", ssd.description.numAudioChannels);
        if (audioTrack.timeScale === 0 && audioTrack.timeToSampleTable.length > 0) {
          const totalSampleSize = audioTrack.timeToSampleTable.map((ttstEntry) => ttstEntry.count * ttstEntry.duration).reduce((total, sampleSize) => total + sampleSize);
          const duration = totalSampleSize / ssd.description.sampleRate;
          this.metadata.setFormat("duration", duration);
        }
      }
      const encoderInfo = encoderDict[ssd.dataFormat];
      if (encoderInfo) {
        this.metadata.setFormat("lossless", !encoderInfo.lossy);
      }
      this.calculateBitRate();
    }
  }
  async handleAtom(atom, remaining) {
    if (atom.parent) {
      switch (atom.parent.header.name) {
        case "ilst":
        case "<id>":
          return this.parseMetadataItemData(atom);
      }
    }
    if (this.atomParsers[atom.header.name]) {
      return this.atomParsers[atom.header.name](remaining);
    } else {
      debug$e(`No parser for atom path=${atom.atomPath}, payload-len=${remaining}, ignoring atom`);
      await this.tokenizer.ignore(remaining);
    }
  }
  getTrackDescription() {
    return this.tracks[this.tracks.length - 1];
  }
  calculateBitRate() {
    if (this.audioLengthInBytes && this.metadata.format.duration) {
      this.metadata.setFormat("bitrate", 8 * this.audioLengthInBytes / this.metadata.format.duration);
    }
  }
  addTag(id, value) {
    this.metadata.addTag(tagFormat, id, value);
  }
  addWarning(message) {
    debug$e("Warning: " + message);
    this.metadata.addWarning(message);
  }
  /**
   * Parse data of Meta-item-list-atom (item of 'ilst' atom)
   * @param metaAtom
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */
  parseMetadataItemData(metaAtom) {
    let tagKey = metaAtom.header.name;
    return metaAtom.readAtoms(this.tokenizer, async (child, remaining) => {
      const payLoadLength = child.getPayloadLength(remaining);
      switch (child.header.name) {
        case "data":
          return this.parseValueAtom(tagKey, child);
        case "name":
        case "mean":
        case "rate":
          const name = await this.tokenizer.readToken(new AtomToken.NameAtom(payLoadLength));
          tagKey += ":" + name.name;
          break;
        default:
          const dataAtom = await this.tokenizer.readToken(new Token$i.BufferType(payLoadLength));
          this.addWarning("Unsupported meta-item: " + tagKey + "[" + child.header.name + "] => value=" + dataAtom.toString("hex") + " ascii=" + dataAtom.toString("ascii"));
      }
    }, metaAtom.getPayloadLength(0));
  }
  async parseValueAtom(tagKey, metaAtom) {
    const dataAtom = await this.tokenizer.readToken(new AtomToken.DataAtom(Number(metaAtom.header.length) - AtomToken.Header.len));
    if (dataAtom.type.set !== 0) {
      throw new Error("Unsupported type-set != 0: " + dataAtom.type.set);
    }
    switch (dataAtom.type.type) {
      case 0:
        switch (tagKey) {
          case "trkn":
          case "disk":
            const num = Token$i.UINT8.get(dataAtom.value, 3);
            const of = Token$i.UINT8.get(dataAtom.value, 5);
            this.addTag(tagKey, num + "/" + of);
            break;
          case "gnre":
            const genreInt = Token$i.UINT8.get(dataAtom.value, 1);
            const genreStr = ID3v1Parser_1$1.Genres[genreInt - 1];
            this.addTag(tagKey, genreStr);
            break;
          case "rate":
            const rate = dataAtom.value.toString("ascii");
            this.addTag(tagKey, rate);
            break;
          default:
            debug$e("unknown proprietary value type for: " + metaAtom.atomPath);
        }
        break;
      case 1:
      case 18:
        this.addTag(tagKey, dataAtom.value.toString("utf-8"));
        break;
      case 13:
        if (this.options.skipCovers)
          break;
        this.addTag(tagKey, {
          format: "image/jpeg",
          data: Buffer.from(dataAtom.value)
        });
        break;
      case 14:
        if (this.options.skipCovers)
          break;
        this.addTag(tagKey, {
          format: "image/png",
          data: Buffer.from(dataAtom.value)
        });
        break;
      case 21:
        this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, true));
        break;
      case 22:
        this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, false));
        break;
      case 65:
        this.addTag(tagKey, dataAtom.value.readInt8(0));
        break;
      case 66:
        this.addTag(tagKey, dataAtom.value.readInt16BE(0));
        break;
      case 67:
        this.addTag(tagKey, dataAtom.value.readInt32BE(0));
        break;
      default:
        this.addWarning(`atom key=${tagKey}, has unknown well-known-type (data-type): ${dataAtom.type.type}`);
    }
  }
  /**
   * @param sampleDescription
   * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-128916
   */
  parseSoundSampleDescription(sampleDescription) {
    const ssd = {
      dataFormat: sampleDescription.dataFormat,
      dataReferenceIndex: sampleDescription.dataReferenceIndex
    };
    let offset = 0;
    const version = AtomToken.SoundSampleDescriptionVersion.get(sampleDescription.description, offset);
    offset += AtomToken.SoundSampleDescriptionVersion.len;
    if (version.version === 0 || version.version === 1) {
      ssd.description = AtomToken.SoundSampleDescriptionV0.get(sampleDescription.description, offset);
    } else {
      debug$e(`Warning: sound-sample-description ${version} not implemented`);
    }
    return ssd;
  }
  async parseChapterTrack(chapterTrack, track, len) {
    if (!chapterTrack.sampleSize) {
      if (chapterTrack.chunkOffsetTable.length !== chapterTrack.sampleSizeTable.length)
        throw new Error("Expected equal chunk-offset-table & sample-size-table length.");
    }
    const chapters = [];
    for (let i = 0; i < chapterTrack.chunkOffsetTable.length && len > 0; ++i) {
      const chunkOffset = chapterTrack.chunkOffsetTable[i];
      const nextChunkLen = chunkOffset - this.tokenizer.position;
      const sampleSize = chapterTrack.sampleSize > 0 ? chapterTrack.sampleSize : chapterTrack.sampleSizeTable[i];
      len -= nextChunkLen + sampleSize;
      if (len < 0)
        throw new Error("Chapter chunk exceeding token length");
      await this.tokenizer.ignore(nextChunkLen);
      const title = await this.tokenizer.readToken(new AtomToken.ChapterText(sampleSize));
      debug$e(`Chapter ${i + 1}: ${title}`);
      const chapter = {
        title,
        sampleOffset: this.findSampleOffset(track, this.tokenizer.position)
      };
      debug$e(`Chapter title=${chapter.title}, offset=${chapter.sampleOffset}/${this.tracks[0].duration}`);
      chapters.push(chapter);
    }
    this.metadata.setFormat("chapters", chapters);
    await this.tokenizer.ignore(len);
  }
  findSampleOffset(track, chapterOffset) {
    let totalDuration = 0;
    track.timeToSampleTable.forEach((e) => {
      totalDuration += e.count * e.duration;
    });
    debug$e(`Total duration=${totalDuration}`);
    let chunkIndex = 0;
    while (chunkIndex < track.chunkOffsetTable.length && track.chunkOffsetTable[chunkIndex] < chapterOffset) {
      ++chunkIndex;
    }
    return this.getChunkDuration(chunkIndex + 1, track);
  }
  getChunkDuration(chunkId, track) {
    let ttsi = 0;
    let ttsc = track.timeToSampleTable[ttsi].count;
    let ttsd = track.timeToSampleTable[ttsi].duration;
    let curChunkId = 1;
    let samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
    let totalDuration = 0;
    while (curChunkId < chunkId) {
      const nrOfSamples = Math.min(ttsc, samplesPerChunk);
      totalDuration += nrOfSamples * ttsd;
      ttsc -= nrOfSamples;
      samplesPerChunk -= nrOfSamples;
      if (samplesPerChunk === 0) {
        ++curChunkId;
        samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
      } else {
        ++ttsi;
        ttsc = track.timeToSampleTable[ttsi].count;
        ttsd = track.timeToSampleTable[ttsi].duration;
      }
    }
    return totalDuration;
  }
  getSamplesPerChunk(chunkId, stcTable) {
    for (let i = 0; i < stcTable.length - 1; ++i) {
      if (chunkId >= stcTable[i].firstChunk && chunkId < stcTable[i + 1].firstChunk) {
        return stcTable[i].samplesPerChunk;
      }
    }
    return stcTable[stcTable.length - 1].samplesPerChunk;
  }
}
MP4Parser$1.MP4Parser = MP4Parser;
var MpegParser$1 = {};
var XingTag = {};
var ExtendedLameHeader = {};
var ReplayGainDataFormat = {};
Object.defineProperty(ReplayGainDataFormat, "__esModule", { value: true });
ReplayGainDataFormat.ReplayGain = void 0;
const common$2 = Util;
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
ReplayGainDataFormat.ReplayGain = {
  len: 2,
  get: (buf, off) => {
    const gain_type = common$2.getBitAllignedNumber(buf, off, 0, 3);
    const sign = common$2.getBitAllignedNumber(buf, off, 6, 1);
    const gain_adj = common$2.getBitAllignedNumber(buf, off, 7, 9) / 10;
    if (gain_type > 0) {
      return {
        type: common$2.getBitAllignedNumber(buf, off, 0, 3),
        origin: common$2.getBitAllignedNumber(buf, off, 3, 3),
        adjustment: sign ? -gain_adj : gain_adj
      };
    }
    return void 0;
  }
};
Object.defineProperty(ExtendedLameHeader, "__esModule", { value: true });
ExtendedLameHeader.ExtendedLameHeader = void 0;
const Token$h = lib$1;
const common$1 = Util;
const ReplayGainDataFormat_1 = ReplayGainDataFormat;
ExtendedLameHeader.ExtendedLameHeader = {
  len: 27,
  get: (buf, off) => {
    const track_peak = Token$h.UINT32_BE.get(buf, off + 2);
    return {
      revision: common$1.getBitAllignedNumber(buf, off, 0, 4),
      vbr_method: common$1.getBitAllignedNumber(buf, off, 4, 4),
      lowpass_filter: 100 * Token$h.UINT8.get(buf, off + 1),
      track_peak: track_peak === 0 ? void 0 : track_peak / Math.pow(2, 23),
      track_gain: ReplayGainDataFormat_1.ReplayGain.get(buf, 6),
      album_gain: ReplayGainDataFormat_1.ReplayGain.get(buf, 8),
      music_length: Token$h.UINT32_BE.get(buf, off + 20),
      music_crc: Token$h.UINT8.get(buf, off + 24),
      header_crc: Token$h.UINT16_BE.get(buf, off + 24)
    };
  }
};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.readXingHeader = exports.XingHeaderFlags = exports.LameEncoderVersion = exports.InfoTagHeaderTag = void 0;
  const Token2 = lib$1;
  const util2 = Util;
  const ExtendedLameHeader_1 = ExtendedLameHeader;
  exports.InfoTagHeaderTag = new Token2.StringType(4, "ascii");
  exports.LameEncoderVersion = new Token2.StringType(6, "ascii");
  exports.XingHeaderFlags = {
    len: 4,
    get: (buf, off) => {
      return {
        frames: util2.isBitSet(buf, off, 31),
        bytes: util2.isBitSet(buf, off, 30),
        toc: util2.isBitSet(buf, off, 29),
        vbrScale: util2.isBitSet(buf, off, 28)
      };
    }
  };
  async function readXingHeader(tokenizer) {
    const flags = await tokenizer.readToken(exports.XingHeaderFlags);
    const xingInfoTag = {};
    if (flags.frames) {
      xingInfoTag.numFrames = await tokenizer.readToken(Token2.UINT32_BE);
    }
    if (flags.bytes) {
      xingInfoTag.streamSize = await tokenizer.readToken(Token2.UINT32_BE);
    }
    if (flags.toc) {
      xingInfoTag.toc = Buffer.alloc(100);
      await tokenizer.readBuffer(xingInfoTag.toc);
    }
    if (flags.vbrScale) {
      xingInfoTag.vbrScale = await tokenizer.readToken(Token2.UINT32_BE);
    }
    const lameTag = await tokenizer.peekToken(new Token2.StringType(4, "ascii"));
    if (lameTag === "LAME") {
      await tokenizer.ignore(4);
      xingInfoTag.lame = {
        version: await tokenizer.readToken(new Token2.StringType(5, "ascii"))
      };
      const match = xingInfoTag.lame.version.match(/\d+.\d+/g);
      if (match) {
        const majorMinorVersion = xingInfoTag.lame.version.match(/\d+.\d+/g)[0];
        const version = majorMinorVersion.split(".").map((n) => parseInt(n, 10));
        if (version[0] >= 3 && version[1] >= 90) {
          xingInfoTag.lame.extended = await tokenizer.readToken(ExtendedLameHeader_1.ExtendedLameHeader);
        }
      }
    }
    return xingInfoTag;
  }
  exports.readXingHeader = readXingHeader;
})(XingTag);
Object.defineProperty(MpegParser$1, "__esModule", { value: true });
MpegParser$1.MpegParser = void 0;
const Token$g = lib$1;
const core_1$1 = core$1;
const debug_1$d = srcExports;
const common = Util;
const AbstractID3Parser_1$2 = AbstractID3Parser$1;
const XingTag_1 = XingTag;
const debug$d = (0, debug_1$d.default)("music-metadata:parser:mpeg");
const maxPeekLen = 1024;
const MPEG4 = {
  /**
   * Audio Object Types
   */
  AudioObjectTypes: [
    "AAC Main",
    "AAC LC",
    "AAC SSR",
    "AAC LTP"
    // Long Term Prediction
  ],
  /**
   * Sampling Frequencies
   * https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Sampling_Frequencies
   */
  SamplingFrequencies: [
    96e3,
    88200,
    64e3,
    48e3,
    44100,
    32e3,
    24e3,
    22050,
    16e3,
    12e3,
    11025,
    8e3,
    7350,
    void 0,
    void 0,
    -1
  ]
  /**
   * Channel Configurations
   */
};
const MPEG4_ChannelConfigurations = [
  void 0,
  ["front-center"],
  ["front-left", "front-right"],
  ["front-center", "front-left", "front-right"],
  ["front-center", "front-left", "front-right", "back-center"],
  ["front-center", "front-left", "front-right", "back-left", "back-right"],
  ["front-center", "front-left", "front-right", "back-left", "back-right", "LFE-channel"],
  ["front-center", "front-left", "front-right", "side-left", "side-right", "back-left", "back-right", "LFE-channel"]
];
class MpegFrameHeader {
  constructor(buf, off) {
    this.versionIndex = common.getBitAllignedNumber(buf, off + 1, 3, 2);
    this.layer = MpegFrameHeader.LayerDescription[common.getBitAllignedNumber(buf, off + 1, 5, 2)];
    if (this.versionIndex > 1 && this.layer === 0) {
      this.parseAdtsHeader(buf, off);
    } else {
      this.parseMpegHeader(buf, off);
    }
    this.isProtectedByCRC = !common.isBitSet(buf, off + 1, 7);
  }
  calcDuration(numFrames) {
    return numFrames * this.calcSamplesPerFrame() / this.samplingRate;
  }
  calcSamplesPerFrame() {
    return MpegFrameHeader.samplesInFrameTable[this.version === 1 ? 0 : 1][this.layer];
  }
  calculateSideInfoLength() {
    if (this.layer !== 3)
      return 2;
    if (this.channelModeIndex === 3) {
      if (this.version === 1) {
        return 17;
      } else if (this.version === 2 || this.version === 2.5) {
        return 9;
      }
    } else {
      if (this.version === 1) {
        return 32;
      } else if (this.version === 2 || this.version === 2.5) {
        return 17;
      }
    }
  }
  calcSlotSize() {
    return [null, 4, 1, 1][this.layer];
  }
  parseMpegHeader(buf, off) {
    this.container = "MPEG";
    this.bitrateIndex = common.getBitAllignedNumber(buf, off + 2, 0, 4);
    this.sampRateFreqIndex = common.getBitAllignedNumber(buf, off + 2, 4, 2);
    this.padding = common.isBitSet(buf, off + 2, 6);
    this.privateBit = common.isBitSet(buf, off + 2, 7);
    this.channelModeIndex = common.getBitAllignedNumber(buf, off + 3, 0, 2);
    this.modeExtension = common.getBitAllignedNumber(buf, off + 3, 2, 2);
    this.isCopyrighted = common.isBitSet(buf, off + 3, 4);
    this.isOriginalMedia = common.isBitSet(buf, off + 3, 5);
    this.emphasis = common.getBitAllignedNumber(buf, off + 3, 7, 2);
    this.version = MpegFrameHeader.VersionID[this.versionIndex];
    this.channelMode = MpegFrameHeader.ChannelMode[this.channelModeIndex];
    this.codec = `MPEG ${this.version} Layer ${this.layer}`;
    const bitrateInKbps = this.calcBitrate();
    if (!bitrateInKbps) {
      throw new Error("Cannot determine bit-rate");
    }
    this.bitrate = bitrateInKbps * 1e3;
    this.samplingRate = this.calcSamplingRate();
    if (this.samplingRate == null) {
      throw new Error("Cannot determine sampling-rate");
    }
  }
  parseAdtsHeader(buf, off) {
    debug$d(`layer=0 => ADTS`);
    this.version = this.versionIndex === 2 ? 4 : 2;
    this.container = "ADTS/MPEG-" + this.version;
    const profileIndex = common.getBitAllignedNumber(buf, off + 2, 0, 2);
    this.codec = "AAC";
    this.codecProfile = MPEG4.AudioObjectTypes[profileIndex];
    debug$d(`MPEG-4 audio-codec=${this.codec}`);
    const samplingFrequencyIndex = common.getBitAllignedNumber(buf, off + 2, 2, 4);
    this.samplingRate = MPEG4.SamplingFrequencies[samplingFrequencyIndex];
    debug$d(`sampling-rate=${this.samplingRate}`);
    const channelIndex = common.getBitAllignedNumber(buf, off + 2, 7, 3);
    this.mp4ChannelConfig = MPEG4_ChannelConfigurations[channelIndex];
    debug$d(`channel-config=${this.mp4ChannelConfig.join("+")}`);
    this.frameLength = common.getBitAllignedNumber(buf, off + 3, 6, 2) << 11;
  }
  calcBitrate() {
    if (this.bitrateIndex === 0 || // free
    this.bitrateIndex === 15) {
      return;
    }
    const codecIndex = `${Math.floor(this.version)}${this.layer}`;
    return MpegFrameHeader.bitrate_index[this.bitrateIndex][codecIndex];
  }
  calcSamplingRate() {
    if (this.sampRateFreqIndex === 3)
      return null;
    return MpegFrameHeader.sampling_rate_freq_index[this.version][this.sampRateFreqIndex];
  }
}
MpegFrameHeader.SyncByte1 = 255;
MpegFrameHeader.SyncByte2 = 224;
MpegFrameHeader.VersionID = [2.5, null, 2, 1];
MpegFrameHeader.LayerDescription = [0, 3, 2, 1];
MpegFrameHeader.ChannelMode = ["stereo", "joint_stereo", "dual_channel", "mono"];
MpegFrameHeader.bitrate_index = {
  1: { 11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8 },
  2: { 11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16 },
  3: { 11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24 },
  4: { 11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32 },
  5: { 11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40 },
  6: { 11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48 },
  7: { 11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56 },
  8: { 11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64 },
  9: { 11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80 },
  10: { 11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96 },
  11: { 11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112 },
  12: { 11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128 },
  13: { 11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144 },
  14: { 11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160 }
};
MpegFrameHeader.sampling_rate_freq_index = {
  1: { 0: 44100, 1: 48e3, 2: 32e3 },
  2: { 0: 22050, 1: 24e3, 2: 16e3 },
  2.5: { 0: 11025, 1: 12e3, 2: 8e3 }
};
MpegFrameHeader.samplesInFrameTable = [
  /* Layer   I    II   III */
  [0, 384, 1152, 1152],
  [0, 384, 1152, 576]
  // MPEG-2(.5
];
const FrameHeader = {
  len: 4,
  get: (buf, off) => {
    return new MpegFrameHeader(buf, off);
  }
};
function getVbrCodecProfile(vbrScale) {
  return "V" + Math.floor((100 - vbrScale) / 10);
}
class MpegParser extends AbstractID3Parser_1$2.AbstractID3Parser {
  constructor() {
    super(...arguments);
    this.frameCount = 0;
    this.syncFrameCount = -1;
    this.countSkipFrameData = 0;
    this.totalDataLength = 0;
    this.bitrates = [];
    this.calculateEofDuration = false;
    this.buf_frame_header = Buffer.alloc(4);
    this.syncPeek = {
      buf: Buffer.alloc(maxPeekLen),
      len: 0
    };
  }
  /**
   * Called after ID3 headers have been parsed
   */
  async postId3v2Parse() {
    this.metadata.setFormat("lossless", false);
    try {
      let quit = false;
      while (!quit) {
        await this.sync();
        quit = await this.parseCommonMpegHeader();
      }
    } catch (err) {
      if (err instanceof core_1$1.EndOfStreamError) {
        debug$d(`End-of-stream`);
        if (this.calculateEofDuration) {
          const numberOfSamples = this.frameCount * this.samplesPerFrame;
          this.metadata.setFormat("numberOfSamples", numberOfSamples);
          const duration = numberOfSamples / this.metadata.format.sampleRate;
          debug$d(`Calculate duration at EOF: ${duration} sec.`, duration);
          this.metadata.setFormat("duration", duration);
        }
      } else {
        throw err;
      }
    }
  }
  /**
   * Called after file has been fully parsed, this allows, if present, to exclude the ID3v1.1 header length
   */
  finalize() {
    const format2 = this.metadata.format;
    const hasID3v1 = this.metadata.native.hasOwnProperty("ID3v1");
    if (format2.duration && this.tokenizer.fileInfo.size) {
      const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
      if (format2.codecProfile && format2.codecProfile[0] === "V") {
        this.metadata.setFormat("bitrate", mpegSize * 8 / format2.duration);
      }
    } else if (this.tokenizer.fileInfo.size && format2.codecProfile === "CBR") {
      const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
      const numberOfSamples = Math.round(mpegSize / this.frame_size) * this.samplesPerFrame;
      this.metadata.setFormat("numberOfSamples", numberOfSamples);
      const duration = numberOfSamples / format2.sampleRate;
      debug$d("Calculate CBR duration based on file size: %s", duration);
      this.metadata.setFormat("duration", duration);
    }
  }
  async sync() {
    let gotFirstSync = false;
    while (true) {
      let bo = 0;
      this.syncPeek.len = await this.tokenizer.peekBuffer(this.syncPeek.buf, { length: maxPeekLen, mayBeLess: true });
      if (this.syncPeek.len <= 163) {
        throw new core_1$1.EndOfStreamError();
      }
      while (true) {
        if (gotFirstSync && (this.syncPeek.buf[bo] & 224) === 224) {
          this.buf_frame_header[0] = MpegFrameHeader.SyncByte1;
          this.buf_frame_header[1] = this.syncPeek.buf[bo];
          await this.tokenizer.ignore(bo);
          debug$d(`Sync at offset=${this.tokenizer.position - 1}, frameCount=${this.frameCount}`);
          if (this.syncFrameCount === this.frameCount) {
            debug$d(`Re-synced MPEG stream, frameCount=${this.frameCount}`);
            this.frameCount = 0;
            this.frame_size = 0;
          }
          this.syncFrameCount = this.frameCount;
          return;
        } else {
          gotFirstSync = false;
          bo = this.syncPeek.buf.indexOf(MpegFrameHeader.SyncByte1, bo);
          if (bo === -1) {
            if (this.syncPeek.len < this.syncPeek.buf.length) {
              throw new core_1$1.EndOfStreamError();
            }
            await this.tokenizer.ignore(this.syncPeek.len);
            break;
          } else {
            ++bo;
            gotFirstSync = true;
          }
        }
      }
    }
  }
  /**
   * Combined ADTS & MPEG (MP2 & MP3) header handling
   * @return {Promise<boolean>} true if parser should quit
   */
  async parseCommonMpegHeader() {
    if (this.frameCount === 0) {
      this.mpegOffset = this.tokenizer.position - 1;
    }
    await this.tokenizer.peekBuffer(this.buf_frame_header, { offset: 1, length: 3 });
    let header;
    try {
      header = FrameHeader.get(this.buf_frame_header, 0);
    } catch (err) {
      await this.tokenizer.ignore(1);
      this.metadata.addWarning("Parse error: " + err.message);
      return false;
    }
    await this.tokenizer.ignore(3);
    this.metadata.setFormat("container", header.container);
    this.metadata.setFormat("codec", header.codec);
    this.metadata.setFormat("lossless", false);
    this.metadata.setFormat("sampleRate", header.samplingRate);
    this.frameCount++;
    return header.version >= 2 && header.layer === 0 ? this.parseAdts(header) : this.parseAudioFrameHeader(header);
  }
  /**
   * @return {Promise<boolean>} true if parser should quit
   */
  async parseAudioFrameHeader(header) {
    this.metadata.setFormat("numberOfChannels", header.channelMode === "mono" ? 1 : 2);
    this.metadata.setFormat("bitrate", header.bitrate);
    if (this.frameCount < 20 * 1e4) {
      debug$d("offset=%s MP%s bitrate=%s sample-rate=%s", this.tokenizer.position - 4, header.layer, header.bitrate, header.samplingRate);
    }
    const slot_size = header.calcSlotSize();
    if (slot_size === null) {
      throw new Error("invalid slot_size");
    }
    const samples_per_frame = header.calcSamplesPerFrame();
    debug$d(`samples_per_frame=${samples_per_frame}`);
    const bps = samples_per_frame / 8;
    const fsize = bps * header.bitrate / header.samplingRate + (header.padding ? slot_size : 0);
    this.frame_size = Math.floor(fsize);
    this.audioFrameHeader = header;
    this.bitrates.push(header.bitrate);
    if (this.frameCount === 1) {
      this.offset = FrameHeader.len;
      await this.skipSideInformation();
      return false;
    }
    if (this.frameCount === 3) {
      if (this.areAllSame(this.bitrates)) {
        this.samplesPerFrame = samples_per_frame;
        this.metadata.setFormat("codecProfile", "CBR");
        if (this.tokenizer.fileInfo.size)
          return true;
      } else if (this.metadata.format.duration) {
        return true;
      }
      if (!this.options.duration) {
        return true;
      }
    }
    if (this.options.duration && this.frameCount === 4) {
      this.samplesPerFrame = samples_per_frame;
      this.calculateEofDuration = true;
    }
    this.offset = 4;
    if (header.isProtectedByCRC) {
      await this.parseCrc();
      return false;
    } else {
      await this.skipSideInformation();
      return false;
    }
  }
  async parseAdts(header) {
    const buf = Buffer.alloc(3);
    await this.tokenizer.readBuffer(buf);
    header.frameLength += common.getBitAllignedNumber(buf, 0, 0, 11);
    this.totalDataLength += header.frameLength;
    this.samplesPerFrame = 1024;
    const framesPerSec = header.samplingRate / this.samplesPerFrame;
    const bytesPerFrame = this.frameCount === 0 ? 0 : this.totalDataLength / this.frameCount;
    const bitrate = 8 * bytesPerFrame * framesPerSec + 0.5;
    this.metadata.setFormat("bitrate", bitrate);
    debug$d(`frame-count=${this.frameCount}, size=${header.frameLength} bytes, bit-rate=${bitrate}`);
    await this.tokenizer.ignore(header.frameLength > 7 ? header.frameLength - 7 : 1);
    if (this.frameCount === 3) {
      this.metadata.setFormat("codecProfile", header.codecProfile);
      if (header.mp4ChannelConfig) {
        this.metadata.setFormat("numberOfChannels", header.mp4ChannelConfig.length);
      }
      if (this.options.duration) {
        this.calculateEofDuration = true;
      } else {
        return true;
      }
    }
    return false;
  }
  async parseCrc() {
    this.crc = await this.tokenizer.readNumber(Token$g.INT16_BE);
    this.offset += 2;
    return this.skipSideInformation();
  }
  async skipSideInformation() {
    const sideinfo_length = this.audioFrameHeader.calculateSideInfoLength();
    await this.tokenizer.readToken(new Token$g.Uint8ArrayType(sideinfo_length));
    this.offset += sideinfo_length;
    await this.readXtraInfoHeader();
    return;
  }
  async readXtraInfoHeader() {
    const headerTag = await this.tokenizer.readToken(XingTag_1.InfoTagHeaderTag);
    this.offset += XingTag_1.InfoTagHeaderTag.len;
    switch (headerTag) {
      case "Info":
        this.metadata.setFormat("codecProfile", "CBR");
        return this.readXingInfoHeader();
      case "Xing":
        const infoTag = await this.readXingInfoHeader();
        const codecProfile = getVbrCodecProfile(infoTag.vbrScale);
        this.metadata.setFormat("codecProfile", codecProfile);
        return null;
      case "Xtra":
        break;
      case "LAME":
        const version = await this.tokenizer.readToken(XingTag_1.LameEncoderVersion);
        if (this.frame_size >= this.offset + XingTag_1.LameEncoderVersion.len) {
          this.offset += XingTag_1.LameEncoderVersion.len;
          this.metadata.setFormat("tool", "LAME " + version);
          await this.skipFrameData(this.frame_size - this.offset);
          return null;
        } else {
          this.metadata.addWarning("Corrupt LAME header");
          break;
        }
    }
    const frameDataLeft = this.frame_size - this.offset;
    if (frameDataLeft < 0) {
      this.metadata.addWarning("Frame " + this.frameCount + "corrupt: negative frameDataLeft");
    } else {
      await this.skipFrameData(frameDataLeft);
    }
    return null;
  }
  /**
   * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
   * @returns {Promise<string>}
   */
  async readXingInfoHeader() {
    const offset = this.tokenizer.position;
    const infoTag = await (0, XingTag_1.readXingHeader)(this.tokenizer);
    this.offset += this.tokenizer.position - offset;
    if (infoTag.lame) {
      this.metadata.setFormat("tool", "LAME " + common.stripNulls(infoTag.lame.version));
      if (infoTag.lame.extended) {
        this.metadata.setFormat("trackPeakLevel", infoTag.lame.extended.track_peak);
        if (infoTag.lame.extended.track_gain) {
          this.metadata.setFormat("trackGain", infoTag.lame.extended.track_gain.adjustment);
        }
        if (infoTag.lame.extended.album_gain) {
          this.metadata.setFormat("albumGain", infoTag.lame.extended.album_gain.adjustment);
        }
        this.metadata.setFormat("duration", infoTag.lame.extended.music_length / 1e3);
      }
    }
    if (infoTag.streamSize) {
      const duration = this.audioFrameHeader.calcDuration(infoTag.numFrames);
      this.metadata.setFormat("duration", duration);
      debug$d("Get duration from Xing header: %s", this.metadata.format.duration);
      return infoTag;
    }
    const frameDataLeft = this.frame_size - this.offset;
    await this.skipFrameData(frameDataLeft);
    return infoTag;
  }
  async skipFrameData(frameDataLeft) {
    if (frameDataLeft < 0)
      throw new Error("frame-data-left cannot be negative");
    await this.tokenizer.ignore(frameDataLeft);
    this.countSkipFrameData += frameDataLeft;
  }
  areAllSame(array) {
    const first = array[0];
    return array.every((element) => {
      return element === first;
    });
  }
}
MpegParser$1.MpegParser = MpegParser;
var musepack = {};
var MpcSv8Parser$1 = {};
var StreamVersion8 = {};
Object.defineProperty(StreamVersion8, "__esModule", { value: true });
StreamVersion8.StreamReader = void 0;
const Token$f = lib$1;
const debug_1$c = srcExports;
const util$4 = Util;
const debug$c = (0, debug_1$c.default)("music-metadata:parser:musepack:sv8");
const PacketKey = new Token$f.StringType(2, "binary");
const SH_part1 = {
  len: 5,
  get: (buf, off) => {
    return {
      crc: Token$f.UINT32_LE.get(buf, off),
      streamVersion: Token$f.UINT8.get(buf, off + 4)
    };
  }
};
const SH_part3 = {
  len: 2,
  get: (buf, off) => {
    return {
      sampleFrequency: [44100, 48e3, 37800, 32e3][util$4.getBitAllignedNumber(buf, off, 0, 3)],
      maxUsedBands: util$4.getBitAllignedNumber(buf, off, 3, 5),
      channelCount: util$4.getBitAllignedNumber(buf, off + 1, 0, 4) + 1,
      msUsed: util$4.isBitSet(buf, off + 1, 4),
      audioBlockFrames: util$4.getBitAllignedNumber(buf, off + 1, 5, 3)
    };
  }
};
class StreamReader {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
  }
  async readPacketHeader() {
    const key = await this.tokenizer.readToken(PacketKey);
    const size = await this.readVariableSizeField();
    return {
      key,
      payloadLength: size.value - 2 - size.len
    };
  }
  async readStreamHeader(size) {
    const streamHeader = {};
    debug$c(`Reading SH at offset=${this.tokenizer.position}`);
    const part1 = await this.tokenizer.readToken(SH_part1);
    size -= SH_part1.len;
    Object.assign(streamHeader, part1);
    debug$c(`SH.streamVersion = ${part1.streamVersion}`);
    const sampleCount = await this.readVariableSizeField();
    size -= sampleCount.len;
    streamHeader.sampleCount = sampleCount.value;
    const bs = await this.readVariableSizeField();
    size -= bs.len;
    streamHeader.beginningOfSilence = bs.value;
    const part3 = await this.tokenizer.readToken(SH_part3);
    size -= SH_part3.len;
    Object.assign(streamHeader, part3);
    await this.tokenizer.ignore(size);
    return streamHeader;
  }
  async readVariableSizeField(len = 1, hb = 0) {
    let n = await this.tokenizer.readNumber(Token$f.UINT8);
    if ((n & 128) === 0) {
      return { len, value: hb + n };
    }
    n &= 127;
    n += hb;
    return this.readVariableSizeField(len + 1, n << 7);
  }
}
StreamVersion8.StreamReader = StreamReader;
Object.defineProperty(MpcSv8Parser$1, "__esModule", { value: true });
MpcSv8Parser$1.MpcSv8Parser = void 0;
const debug_1$b = srcExports;
const BasicParser_1$6 = BasicParser$1;
const APEv2Parser_1$4 = APEv2Parser$1;
const FourCC_1$6 = FourCC;
const SV8 = StreamVersion8;
const debug$b = (0, debug_1$b.default)("music-metadata:parser:musepack");
class MpcSv8Parser extends BasicParser_1$6.BasicParser {
  constructor() {
    super(...arguments);
    this.audioLength = 0;
  }
  async parse() {
    const signature = await this.tokenizer.readToken(FourCC_1$6.FourCcToken);
    if (signature !== "MPCK")
      throw new Error("Invalid Magic number");
    this.metadata.setFormat("container", "Musepack, SV8");
    return this.parsePacket();
  }
  async parsePacket() {
    const sv8reader = new SV8.StreamReader(this.tokenizer);
    do {
      const header = await sv8reader.readPacketHeader();
      debug$b(`packet-header key=${header.key}, payloadLength=${header.payloadLength}`);
      switch (header.key) {
        case "SH":
          const sh = await sv8reader.readStreamHeader(header.payloadLength);
          this.metadata.setFormat("numberOfSamples", sh.sampleCount);
          this.metadata.setFormat("sampleRate", sh.sampleFrequency);
          this.metadata.setFormat("duration", sh.sampleCount / sh.sampleFrequency);
          this.metadata.setFormat("numberOfChannels", sh.channelCount);
          break;
        case "AP":
          this.audioLength += header.payloadLength;
          await this.tokenizer.ignore(header.payloadLength);
          break;
        case "RG":
        case "EI":
        case "SO":
        case "ST":
        case "CT":
          await this.tokenizer.ignore(header.payloadLength);
          break;
        case "SE":
          this.metadata.setFormat("bitrate", this.audioLength * 8 / this.metadata.format.duration);
          return APEv2Parser_1$4.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
        default:
          throw new Error(`Unexpected header: ${header.key}`);
      }
    } while (true);
  }
}
MpcSv8Parser$1.MpcSv8Parser = MpcSv8Parser;
var MpcSv7Parser$1 = {};
var BitReader$1 = {};
Object.defineProperty(BitReader$1, "__esModule", { value: true });
BitReader$1.BitReader = void 0;
const Token$e = lib$1;
class BitReader {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
    this.pos = 0;
    this.dword = void 0;
  }
  /**
   *
   * @param bits 1..30 bits
   */
  async read(bits) {
    while (this.dword === void 0) {
      this.dword = await this.tokenizer.readToken(Token$e.UINT32_LE);
    }
    let out = this.dword;
    this.pos += bits;
    if (this.pos < 32) {
      out >>>= 32 - this.pos;
      return out & (1 << bits) - 1;
    } else {
      this.pos -= 32;
      if (this.pos === 0) {
        this.dword = void 0;
        return out & (1 << bits) - 1;
      } else {
        this.dword = await this.tokenizer.readToken(Token$e.UINT32_LE);
        if (this.pos) {
          out <<= this.pos;
          out |= this.dword >>> 32 - this.pos;
        }
        return out & (1 << bits) - 1;
      }
    }
  }
  async ignore(bits) {
    if (this.pos > 0) {
      const remaining = 32 - this.pos;
      this.dword = void 0;
      bits -= remaining;
      this.pos = 0;
    }
    const remainder = bits % 32;
    const numOfWords = (bits - remainder) / 32;
    await this.tokenizer.ignore(numOfWords * 4);
    return this.read(remainder);
  }
}
BitReader$1.BitReader = BitReader;
var StreamVersion7 = {};
Object.defineProperty(StreamVersion7, "__esModule", { value: true });
StreamVersion7.Header = void 0;
const Token$d = lib$1;
const util$3 = Util;
StreamVersion7.Header = {
  len: 6 * 4,
  get: (buf, off) => {
    const header = {
      // word 0
      signature: Buffer.from(buf).toString("latin1", off, off + 3),
      // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
      streamMinorVersion: util$3.getBitAllignedNumber(buf, off + 3, 0, 4),
      streamMajorVersion: util$3.getBitAllignedNumber(buf, off + 3, 4, 4),
      // word 1
      frameCount: Token$d.UINT32_LE.get(buf, off + 4),
      // word 2
      maxLevel: Token$d.UINT16_LE.get(buf, off + 8),
      sampleFrequency: [44100, 48e3, 37800, 32e3][util$3.getBitAllignedNumber(buf, off + 10, 0, 2)],
      link: util$3.getBitAllignedNumber(buf, off + 10, 2, 2),
      profile: util$3.getBitAllignedNumber(buf, off + 10, 4, 4),
      maxBand: util$3.getBitAllignedNumber(buf, off + 11, 0, 6),
      intensityStereo: util$3.isBitSet(buf, off + 11, 6),
      midSideStereo: util$3.isBitSet(buf, off + 11, 7),
      // word 3
      titlePeak: Token$d.UINT16_LE.get(buf, off + 12),
      titleGain: Token$d.UINT16_LE.get(buf, off + 14),
      // word 4
      albumPeak: Token$d.UINT16_LE.get(buf, off + 16),
      albumGain: Token$d.UINT16_LE.get(buf, off + 18),
      // word
      lastFrameLength: Token$d.UINT32_LE.get(buf, off + 20) >>> 20 & 2047,
      trueGapless: util$3.isBitSet(buf, off + 23, 0)
    };
    header.lastFrameLength = header.trueGapless ? Token$d.UINT32_LE.get(buf, 20) >>> 20 & 2047 : 0;
    return header;
  }
};
Object.defineProperty(MpcSv7Parser$1, "__esModule", { value: true });
MpcSv7Parser$1.MpcSv7Parser = void 0;
const debug_1$a = srcExports;
const BasicParser_1$5 = BasicParser$1;
const APEv2Parser_1$3 = APEv2Parser$1;
const BitReader_1 = BitReader$1;
const SV7 = StreamVersion7;
const debug$a = (0, debug_1$a.default)("music-metadata:parser:musepack");
class MpcSv7Parser extends BasicParser_1$5.BasicParser {
  constructor() {
    super(...arguments);
    this.audioLength = 0;
  }
  async parse() {
    const header = await this.tokenizer.readToken(SV7.Header);
    if (header.signature !== "MP+")
      throw new Error("Unexpected magic number");
    debug$a(`stream-version=${header.streamMajorVersion}.${header.streamMinorVersion}`);
    this.metadata.setFormat("container", "Musepack, SV7");
    this.metadata.setFormat("sampleRate", header.sampleFrequency);
    const numberOfSamples = 1152 * (header.frameCount - 1) + header.lastFrameLength;
    this.metadata.setFormat("numberOfSamples", numberOfSamples);
    this.duration = numberOfSamples / header.sampleFrequency;
    this.metadata.setFormat("duration", this.duration);
    this.bitreader = new BitReader_1.BitReader(this.tokenizer);
    this.metadata.setFormat("numberOfChannels", header.midSideStereo || header.intensityStereo ? 2 : 1);
    const version = await this.bitreader.read(8);
    this.metadata.setFormat("codec", (version / 100).toFixed(2));
    await this.skipAudioData(header.frameCount);
    debug$a(`End of audio stream, switching to APEv2, offset=${this.tokenizer.position}`);
    return APEv2Parser_1$3.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
  }
  async skipAudioData(frameCount) {
    while (frameCount-- > 0) {
      const frameLength = await this.bitreader.read(20);
      this.audioLength += 20 + frameLength;
      await this.bitreader.ignore(frameLength);
    }
    const lastFrameLength = await this.bitreader.read(11);
    this.audioLength += lastFrameLength;
    this.metadata.setFormat("bitrate", this.audioLength / this.duration);
  }
}
MpcSv7Parser$1.MpcSv7Parser = MpcSv7Parser;
Object.defineProperty(musepack, "__esModule", { value: true });
const debug_1$9 = srcExports;
const Token$c = lib$1;
const AbstractID3Parser_1$1 = AbstractID3Parser$1;
const MpcSv8Parser_1 = MpcSv8Parser$1;
const MpcSv7Parser_1 = MpcSv7Parser$1;
const debug$9 = (0, debug_1$9.default)("music-metadata:parser:musepack");
class MusepackParser extends AbstractID3Parser_1$1.AbstractID3Parser {
  async postId3v2Parse() {
    const signature = await this.tokenizer.peekToken(new Token$c.StringType(3, "binary"));
    let mpcParser;
    switch (signature) {
      case "MP+": {
        debug$9("Musepack stream-version 7");
        mpcParser = new MpcSv7Parser_1.MpcSv7Parser();
        break;
      }
      case "MPC": {
        debug$9("Musepack stream-version 8");
        mpcParser = new MpcSv8Parser_1.MpcSv8Parser();
        break;
      }
      default: {
        throw new Error("Invalid Musepack signature prefix");
      }
    }
    mpcParser.init(this.metadata, this.tokenizer, this.options);
    return mpcParser.parse();
  }
}
musepack.default = MusepackParser;
var OggParser$1 = {};
var OpusParser$1 = {};
var Opus$1 = {};
Object.defineProperty(Opus$1, "__esModule", { value: true });
Opus$1.IdHeader = void 0;
const Token$b = lib$1;
class IdHeader {
  constructor(len) {
    this.len = len;
    if (len < 19) {
      throw new Error("ID-header-page 0 should be at least 19 bytes long");
    }
  }
  get(buf, off) {
    return {
      magicSignature: new Token$b.StringType(8, "ascii").get(buf, off + 0),
      version: buf.readUInt8(off + 8),
      channelCount: buf.readUInt8(off + 9),
      preSkip: buf.readInt16LE(off + 10),
      inputSampleRate: buf.readInt32LE(off + 12),
      outputGain: buf.readInt16LE(off + 16),
      channelMapping: buf.readUInt8(off + 18)
    };
  }
}
Opus$1.IdHeader = IdHeader;
Object.defineProperty(OpusParser$1, "__esModule", { value: true });
OpusParser$1.OpusParser = void 0;
const Token$a = lib$1;
const VorbisParser_1$2 = VorbisParser$1;
const Opus = Opus$1;
class OpusParser extends VorbisParser_1$2.VorbisParser {
  constructor(metadata, options, tokenizer) {
    super(metadata, options);
    this.tokenizer = tokenizer;
    this.lastPos = -1;
  }
  /**
   * Parse first Opus Ogg page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  parseFirstPage(header, pageData) {
    this.metadata.setFormat("codec", "Opus");
    this.idHeader = new Opus.IdHeader(pageData.length).get(pageData, 0);
    if (this.idHeader.magicSignature !== "OpusHead")
      throw new Error("Illegal ogg/Opus magic-signature");
    this.metadata.setFormat("sampleRate", this.idHeader.inputSampleRate);
    this.metadata.setFormat("numberOfChannels", this.idHeader.channelCount);
  }
  parseFullPage(pageData) {
    const magicSignature = new Token$a.StringType(8, "ascii").get(pageData, 0);
    switch (magicSignature) {
      case "OpusTags":
        this.parseUserCommentList(pageData, 8);
        this.lastPos = this.tokenizer.position - pageData.length;
        break;
    }
  }
  calculateDuration(header) {
    if (this.metadata.format.sampleRate && header.absoluteGranulePosition >= 0) {
      const pos_48bit = header.absoluteGranulePosition - this.idHeader.preSkip;
      this.metadata.setFormat("numberOfSamples", pos_48bit);
      this.metadata.setFormat("duration", pos_48bit / 48e3);
      if (this.lastPos !== -1 && this.tokenizer.fileInfo.size && this.metadata.format.duration) {
        const dataSize = this.tokenizer.fileInfo.size - this.lastPos;
        this.metadata.setFormat("bitrate", 8 * dataSize / this.metadata.format.duration);
      }
    }
  }
}
OpusParser$1.OpusParser = OpusParser;
var SpeexParser$1 = {};
var Speex$1 = {};
Object.defineProperty(Speex$1, "__esModule", { value: true });
Speex$1.Header = void 0;
const Token$9 = lib$1;
const util$2 = Util;
Speex$1.Header = {
  len: 80,
  get: (buf, off) => {
    return {
      speex: new Token$9.StringType(8, "ascii").get(buf, off + 0),
      version: util$2.trimRightNull(new Token$9.StringType(20, "ascii").get(buf, off + 8)),
      version_id: buf.readInt32LE(off + 28),
      header_size: buf.readInt32LE(off + 32),
      rate: buf.readInt32LE(off + 36),
      mode: buf.readInt32LE(off + 40),
      mode_bitstream_version: buf.readInt32LE(off + 44),
      nb_channels: buf.readInt32LE(off + 48),
      bitrate: buf.readInt32LE(off + 52),
      frame_size: buf.readInt32LE(off + 56),
      vbr: buf.readInt32LE(off + 60),
      frames_per_packet: buf.readInt32LE(off + 64),
      extra_headers: buf.readInt32LE(off + 68),
      reserved1: buf.readInt32LE(off + 72),
      reserved2: buf.readInt32LE(off + 76)
    };
  }
};
Object.defineProperty(SpeexParser$1, "__esModule", { value: true });
SpeexParser$1.SpeexParser = void 0;
const debug_1$8 = srcExports;
const VorbisParser_1$1 = VorbisParser$1;
const Speex = Speex$1;
const debug$8 = (0, debug_1$8.default)("music-metadata:parser:ogg:speex");
class SpeexParser extends VorbisParser_1$1.VorbisParser {
  constructor(metadata, options, tokenizer) {
    super(metadata, options);
    this.tokenizer = tokenizer;
  }
  /**
   * Parse first Speex Ogg page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  parseFirstPage(header, pageData) {
    debug$8("First Ogg/Speex page");
    const speexHeader = Speex.Header.get(pageData, 0);
    this.metadata.setFormat("codec", `Speex ${speexHeader.version}`);
    this.metadata.setFormat("numberOfChannels", speexHeader.nb_channels);
    this.metadata.setFormat("sampleRate", speexHeader.rate);
    if (speexHeader.bitrate !== -1) {
      this.metadata.setFormat("bitrate", speexHeader.bitrate);
    }
  }
}
SpeexParser$1.SpeexParser = SpeexParser;
var TheoraParser$1 = {};
var Theora = {};
Object.defineProperty(Theora, "__esModule", { value: true });
Theora.IdentificationHeader = void 0;
const Token$8 = lib$1;
Theora.IdentificationHeader = {
  len: 42,
  get: (buf, off) => {
    return {
      id: new Token$8.StringType(7, "ascii").get(buf, off),
      vmaj: buf.readUInt8(off + 7),
      vmin: buf.readUInt8(off + 8),
      vrev: buf.readUInt8(off + 9),
      vmbw: buf.readUInt16BE(off + 10),
      vmbh: buf.readUInt16BE(off + 17),
      nombr: Token$8.UINT24_BE.get(buf, off + 37),
      nqual: buf.readUInt8(off + 40)
    };
  }
};
Object.defineProperty(TheoraParser$1, "__esModule", { value: true });
TheoraParser$1.TheoraParser = void 0;
const debug_1$7 = srcExports;
const Theora_1 = Theora;
const debug$7 = (0, debug_1$7.default)("music-metadata:parser:ogg:theora");
class TheoraParser {
  constructor(metadata, options, tokenizer) {
    this.metadata = metadata;
    this.tokenizer = tokenizer;
  }
  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  parsePage(header, pageData) {
    if (header.headerType.firstPage) {
      this.parseFirstPage(header, pageData);
    }
  }
  flush() {
    debug$7("flush");
  }
  calculateDuration(header) {
    debug$7("duration calculation not implemented");
  }
  /**
   * Parse first Theora Ogg page. the initial identification header packet
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  parseFirstPage(header, pageData) {
    debug$7("First Ogg/Theora page");
    this.metadata.setFormat("codec", "Theora");
    const idHeader = Theora_1.IdentificationHeader.get(pageData, 0);
    this.metadata.setFormat("bitrate", idHeader.nombr);
  }
}
TheoraParser$1.TheoraParser = TheoraParser;
Object.defineProperty(OggParser$1, "__esModule", { value: true });
OggParser$1.OggParser = OggParser$1.SegmentTable = void 0;
const Token$7 = lib$1;
const core_1 = core$1;
const debug_1$6 = srcExports;
const util$1 = Util;
const FourCC_1$5 = FourCC;
const BasicParser_1$4 = BasicParser$1;
const VorbisParser_1 = VorbisParser$1;
const OpusParser_1 = OpusParser$1;
const SpeexParser_1 = SpeexParser$1;
const TheoraParser_1 = TheoraParser$1;
const debug$6 = (0, debug_1$6.default)("music-metadata:parser:ogg");
class SegmentTable {
  static sum(buf, off, len) {
    let s = 0;
    for (let i = off; i < off + len; ++i) {
      s += buf[i];
    }
    return s;
  }
  constructor(header) {
    this.len = header.page_segments;
  }
  get(buf, off) {
    return {
      totalPageSize: SegmentTable.sum(buf, off, this.len)
    };
  }
}
OggParser$1.SegmentTable = SegmentTable;
class OggParser extends BasicParser_1$4.BasicParser {
  /**
   * Parse page
   * @returns {Promise<void>}
   */
  async parse() {
    debug$6("pos=%s, parsePage()", this.tokenizer.position);
    try {
      let header;
      do {
        header = await this.tokenizer.readToken(OggParser.Header);
        if (header.capturePattern !== "OggS")
          throw new Error("Invalid Ogg capture pattern");
        this.metadata.setFormat("container", "Ogg");
        this.header = header;
        this.pageNumber = header.pageSequenceNo;
        debug$6("page#=%s, Ogg.id=%s", header.pageSequenceNo, header.capturePattern);
        const segmentTable = await this.tokenizer.readToken(new SegmentTable(header));
        debug$6("totalPageSize=%s", segmentTable.totalPageSize);
        const pageData = await this.tokenizer.readToken(new Token$7.Uint8ArrayType(segmentTable.totalPageSize));
        debug$6("firstPage=%s, lastPage=%s, continued=%s", header.headerType.firstPage, header.headerType.lastPage, header.headerType.continued);
        if (header.headerType.firstPage) {
          const id = new Token$7.StringType(7, "ascii").get(Buffer.from(pageData), 0);
          switch (id) {
            case "vorbis":
              debug$6("Set page consumer to Ogg/Vorbis");
              this.pageConsumer = new VorbisParser_1.VorbisParser(this.metadata, this.options);
              break;
            case "OpusHea":
              debug$6("Set page consumer to Ogg/Opus");
              this.pageConsumer = new OpusParser_1.OpusParser(this.metadata, this.options, this.tokenizer);
              break;
            case "Speex  ":
              debug$6("Set page consumer to Ogg/Speex");
              this.pageConsumer = new SpeexParser_1.SpeexParser(this.metadata, this.options, this.tokenizer);
              break;
            case "fishead":
            case "\0theora":
              debug$6("Set page consumer to Ogg/Theora");
              this.pageConsumer = new TheoraParser_1.TheoraParser(this.metadata, this.options, this.tokenizer);
              break;
            default:
              throw new Error("gg audio-codec not recognized (id=" + id + ")");
          }
        }
        this.pageConsumer.parsePage(header, pageData);
      } while (!header.headerType.lastPage);
    } catch (err) {
      if (err instanceof core_1.EndOfStreamError) {
        this.metadata.addWarning("Last OGG-page is not marked with last-page flag");
        debug$6(`End-of-stream`);
        this.metadata.addWarning("Last OGG-page is not marked with last-page flag");
        if (this.header) {
          this.pageConsumer.calculateDuration(this.header);
        }
      } else if (err.message.startsWith("FourCC")) {
        if (this.pageNumber > 0) {
          this.metadata.addWarning("Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag");
          this.pageConsumer.flush();
        }
      } else {
        throw err;
      }
    }
  }
}
OggParser.Header = {
  len: 27,
  get: (buf, off) => {
    return {
      capturePattern: FourCC_1$5.FourCcToken.get(buf, off),
      version: Token$7.UINT8.get(buf, off + 4),
      headerType: {
        continued: util$1.getBit(buf, off + 5, 0),
        firstPage: util$1.getBit(buf, off + 5, 1),
        lastPage: util$1.getBit(buf, off + 5, 2)
      },
      // packet_flag: buf.readUInt8(off + 5),
      absoluteGranulePosition: Number(Token$7.UINT64_LE.get(buf, off + 6)),
      streamSerialNumber: Token$7.UINT32_LE.get(buf, off + 14),
      pageSequenceNo: Token$7.UINT32_LE.get(buf, off + 18),
      pageChecksum: Token$7.UINT32_LE.get(buf, off + 22),
      page_segments: Token$7.UINT8.get(buf, off + 26)
    };
  }
};
OggParser$1.OggParser = OggParser;
var WaveParser$1 = {};
var RiffChunk = {};
Object.defineProperty(RiffChunk, "__esModule", { value: true });
RiffChunk.ListInfoTagValue = RiffChunk.Header = void 0;
const Token$6 = lib$1;
RiffChunk.Header = {
  len: 8,
  get: (buf, off) => {
    return {
      // Group-ID
      chunkID: buf.toString("binary", off, off + 4),
      // Size
      chunkSize: Token$6.UINT32_LE.get(buf, 4)
    };
  }
};
class ListInfoTagValue {
  constructor(tagHeader) {
    this.tagHeader = tagHeader;
    this.len = tagHeader.chunkSize;
    this.len += this.len & 1;
  }
  get(buf, off) {
    return new Token$6.StringType(this.tagHeader.chunkSize, "ascii").get(buf, off);
  }
}
RiffChunk.ListInfoTagValue = ListInfoTagValue;
var WaveChunk$1 = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.FactChunk = exports.Format = exports.WaveFormat = void 0;
  (function(WaveFormat) {
    WaveFormat[WaveFormat["PCM"] = 1] = "PCM";
    WaveFormat[WaveFormat["ADPCM"] = 2] = "ADPCM";
    WaveFormat[WaveFormat["IEEE_FLOAT"] = 3] = "IEEE_FLOAT";
    WaveFormat[WaveFormat["MPEG_ADTS_AAC"] = 5632] = "MPEG_ADTS_AAC";
    WaveFormat[WaveFormat["MPEG_LOAS"] = 5634] = "MPEG_LOAS";
    WaveFormat[WaveFormat["RAW_AAC1"] = 255] = "RAW_AAC1";
    WaveFormat[WaveFormat["DOLBY_AC3_SPDIF"] = 146] = "DOLBY_AC3_SPDIF";
    WaveFormat[WaveFormat["DVM"] = 8192] = "DVM";
    WaveFormat[WaveFormat["RAW_SPORT"] = 576] = "RAW_SPORT";
    WaveFormat[WaveFormat["ESST_AC3"] = 577] = "ESST_AC3";
    WaveFormat[WaveFormat["DRM"] = 9] = "DRM";
    WaveFormat[WaveFormat["DTS2"] = 8193] = "DTS2";
    WaveFormat[WaveFormat["MPEG"] = 80] = "MPEG";
  })(exports.WaveFormat || (exports.WaveFormat = {}));
  class Format {
    constructor(header) {
      if (header.chunkSize < 16)
        throw new Error("Invalid chunk size");
      this.len = header.chunkSize;
    }
    get(buf, off) {
      return {
        wFormatTag: buf.readUInt16LE(off),
        nChannels: buf.readUInt16LE(off + 2),
        nSamplesPerSec: buf.readUInt32LE(off + 4),
        nAvgBytesPerSec: buf.readUInt32LE(off + 8),
        nBlockAlign: buf.readUInt16LE(off + 12),
        wBitsPerSample: buf.readUInt16LE(off + 14)
      };
    }
  }
  exports.Format = Format;
  class FactChunk {
    constructor(header) {
      if (header.chunkSize < 4) {
        throw new Error("Invalid fact chunk size.");
      }
      this.len = header.chunkSize;
    }
    get(buf, off) {
      return {
        dwSampleLength: buf.readUInt32LE(off)
      };
    }
  }
  exports.FactChunk = FactChunk;
})(WaveChunk$1);
var BwfChunk = {};
Object.defineProperty(BwfChunk, "__esModule", { value: true });
BwfChunk.BroadcastAudioExtensionChunk = void 0;
const Token$5 = lib$1;
const Util_1 = Util;
BwfChunk.BroadcastAudioExtensionChunk = {
  len: 420,
  get: (uint8array, off) => {
    return {
      description: (0, Util_1.stripNulls)(new Token$5.StringType(256, "ascii").get(uint8array, off)).trim(),
      originator: (0, Util_1.stripNulls)(new Token$5.StringType(32, "ascii").get(uint8array, off + 256)).trim(),
      originatorReference: (0, Util_1.stripNulls)(new Token$5.StringType(32, "ascii").get(uint8array, off + 288)).trim(),
      originationDate: (0, Util_1.stripNulls)(new Token$5.StringType(10, "ascii").get(uint8array, off + 320)).trim(),
      originationTime: (0, Util_1.stripNulls)(new Token$5.StringType(8, "ascii").get(uint8array, off + 330)).trim(),
      timeReferenceLow: Token$5.UINT32_LE.get(uint8array, off + 338),
      timeReferenceHigh: Token$5.UINT32_LE.get(uint8array, off + 342),
      version: Token$5.UINT16_LE.get(uint8array, off + 346),
      umid: new Token$5.Uint8ArrayType(64).get(uint8array, off + 348),
      loudnessValue: Token$5.UINT16_LE.get(uint8array, off + 412),
      maxTruePeakLevel: Token$5.UINT16_LE.get(uint8array, off + 414),
      maxMomentaryLoudness: Token$5.UINT16_LE.get(uint8array, off + 416),
      maxShortTermLoudness: Token$5.UINT16_LE.get(uint8array, off + 418)
    };
  }
};
Object.defineProperty(WaveParser$1, "__esModule", { value: true });
WaveParser$1.WaveParser = void 0;
const strtok3$2 = core$1;
const Token$4 = lib$1;
const debug_1$5 = srcExports;
const riff = RiffChunk;
const WaveChunk = WaveChunk$1;
const ID3v2Parser_1$2 = ID3v2Parser$1;
const util = Util;
const FourCC_1$4 = FourCC;
const BasicParser_1$3 = BasicParser$1;
const BwfChunk_1 = BwfChunk;
const debug$5 = (0, debug_1$5.default)("music-metadata:parser:RIFF");
class WaveParser extends BasicParser_1$3.BasicParser {
  async parse() {
    const riffHeader = await this.tokenizer.readToken(riff.Header);
    debug$5(`pos=${this.tokenizer.position}, parse: chunkID=${riffHeader.chunkID}`);
    if (riffHeader.chunkID !== "RIFF")
      return;
    return this.parseRiffChunk(riffHeader.chunkSize).catch((err) => {
      if (!(err instanceof strtok3$2.EndOfStreamError)) {
        throw err;
      }
    });
  }
  async parseRiffChunk(chunkSize) {
    const type2 = await this.tokenizer.readToken(FourCC_1$4.FourCcToken);
    this.metadata.setFormat("container", type2);
    switch (type2) {
      case "WAVE":
        return this.readWaveChunk(chunkSize - FourCC_1$4.FourCcToken.len);
      default:
        throw new Error(`Unsupported RIFF format: RIFF/${type2}`);
    }
  }
  async readWaveChunk(remaining) {
    while (remaining >= riff.Header.len) {
      const header = await this.tokenizer.readToken(riff.Header);
      remaining -= riff.Header.len + header.chunkSize;
      if (header.chunkSize > remaining) {
        this.metadata.addWarning("Data chunk size exceeds file size");
      }
      this.header = header;
      debug$5(`pos=${this.tokenizer.position}, readChunk: chunkID=RIFF/WAVE/${header.chunkID}`);
      switch (header.chunkID) {
        case "LIST":
          await this.parseListTag(header);
          break;
        case "fact":
          this.metadata.setFormat("lossless", false);
          this.fact = await this.tokenizer.readToken(new WaveChunk.FactChunk(header));
          break;
        case "fmt ":
          const fmt = await this.tokenizer.readToken(new WaveChunk.Format(header));
          let subFormat = WaveChunk.WaveFormat[fmt.wFormatTag];
          if (!subFormat) {
            debug$5("WAVE/non-PCM format=" + fmt.wFormatTag);
            subFormat = "non-PCM (" + fmt.wFormatTag + ")";
          }
          this.metadata.setFormat("codec", subFormat);
          this.metadata.setFormat("bitsPerSample", fmt.wBitsPerSample);
          this.metadata.setFormat("sampleRate", fmt.nSamplesPerSec);
          this.metadata.setFormat("numberOfChannels", fmt.nChannels);
          this.metadata.setFormat("bitrate", fmt.nBlockAlign * fmt.nSamplesPerSec * 8);
          this.blockAlign = fmt.nBlockAlign;
          break;
        case "id3 ":
        case "ID3 ":
          const id3_data = await this.tokenizer.readToken(new Token$4.Uint8ArrayType(header.chunkSize));
          const rst = strtok3$2.fromBuffer(id3_data);
          await new ID3v2Parser_1$2.ID3v2Parser().parse(this.metadata, rst, this.options);
          break;
        case "data":
          if (this.metadata.format.lossless !== false) {
            this.metadata.setFormat("lossless", true);
          }
          let chunkSize = header.chunkSize;
          if (this.tokenizer.fileInfo.size) {
            const calcRemaining = this.tokenizer.fileInfo.size - this.tokenizer.position;
            if (calcRemaining < chunkSize) {
              this.metadata.addWarning("data chunk length exceeding file length");
              chunkSize = calcRemaining;
            }
          }
          const numberOfSamples = this.fact ? this.fact.dwSampleLength : chunkSize === 4294967295 ? void 0 : chunkSize / this.blockAlign;
          if (numberOfSamples) {
            this.metadata.setFormat("numberOfSamples", numberOfSamples);
            this.metadata.setFormat("duration", numberOfSamples / this.metadata.format.sampleRate);
          }
          if (this.metadata.format.codec === "ADPCM") {
            this.metadata.setFormat("bitrate", 352e3);
          } else {
            this.metadata.setFormat("bitrate", this.blockAlign * this.metadata.format.sampleRate * 8);
          }
          await this.tokenizer.ignore(header.chunkSize);
          break;
        case "bext":
          const bext = await this.tokenizer.readToken(BwfChunk_1.BroadcastAudioExtensionChunk);
          Object.keys(bext).forEach((key) => {
            this.metadata.addTag("exif", "bext." + key, bext[key]);
          });
          const bextRemaining = header.chunkSize - BwfChunk_1.BroadcastAudioExtensionChunk.len;
          await this.tokenizer.ignore(bextRemaining);
          break;
        case "\0\0\0\0":
          debug$5(`Ignore padding chunk: RIFF/${header.chunkID} of ${header.chunkSize} bytes`);
          this.metadata.addWarning("Ignore chunk: RIFF/" + header.chunkID);
          await this.tokenizer.ignore(header.chunkSize);
          break;
        default:
          debug$5(`Ignore chunk: RIFF/${header.chunkID} of ${header.chunkSize} bytes`);
          this.metadata.addWarning("Ignore chunk: RIFF/" + header.chunkID);
          await this.tokenizer.ignore(header.chunkSize);
      }
      if (this.header.chunkSize % 2 === 1) {
        debug$5("Read odd padding byte");
        await this.tokenizer.ignore(1);
      }
    }
  }
  async parseListTag(listHeader) {
    const listType = await this.tokenizer.readToken(new Token$4.StringType(4, "binary"));
    debug$5("pos=%s, parseListTag: chunkID=RIFF/WAVE/LIST/%s", this.tokenizer.position, listType);
    switch (listType) {
      case "INFO":
        return this.parseRiffInfoTags(listHeader.chunkSize - 4);
      case "adtl":
      default:
        this.metadata.addWarning("Ignore chunk: RIFF/WAVE/LIST/" + listType);
        debug$5("Ignoring chunkID=RIFF/WAVE/LIST/" + listType);
        return this.tokenizer.ignore(listHeader.chunkSize - 4).then();
    }
  }
  async parseRiffInfoTags(chunkSize) {
    while (chunkSize >= 8) {
      const header = await this.tokenizer.readToken(riff.Header);
      const valueToken = new riff.ListInfoTagValue(header);
      const value = await this.tokenizer.readToken(valueToken);
      this.addTag(header.chunkID, util.stripNulls(value));
      chunkSize -= 8 + valueToken.len;
    }
    if (chunkSize !== 0) {
      throw Error("Illegal remaining size: " + chunkSize);
    }
  }
  addTag(id, value) {
    this.metadata.addTag("exif", id, value);
  }
}
WaveParser$1.WaveParser = WaveParser;
var WavPackParser$1 = {};
var WavPackToken = {};
Object.defineProperty(WavPackToken, "__esModule", { value: true });
WavPackToken.WavPack = void 0;
const Token$3 = lib$1;
const FourCC_1$3 = FourCC;
const SampleRates = [
  6e3,
  8e3,
  9600,
  11025,
  12e3,
  16e3,
  22050,
  24e3,
  32e3,
  44100,
  48e3,
  64e3,
  88200,
  96e3,
  192e3,
  -1
];
class WavPack {
  static isBitSet(flags, bitOffset) {
    return WavPack.getBitAllignedNumber(flags, bitOffset, 1) === 1;
  }
  static getBitAllignedNumber(flags, bitOffset, len) {
    return flags >>> bitOffset & 4294967295 >>> 32 - len;
  }
}
WavPack.BlockHeaderToken = {
  len: 32,
  get: (buf, off) => {
    const flags = Token$3.UINT32_LE.get(buf, off + 24);
    const res = {
      // should equal 'wvpk'
      BlockID: FourCC_1$3.FourCcToken.get(buf, off),
      //  0x402 to 0x410 are valid for decode
      blockSize: Token$3.UINT32_LE.get(buf, off + 4),
      //  0x402 (1026) to 0x410 are valid for decode
      version: Token$3.UINT16_LE.get(buf, off + 8),
      //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
      totalSamples: (
        /* replace with bigint? (Token.UINT8.get(buf, off + 11) << 32) + */
        Token$3.UINT32_LE.get(buf, off + 12)
      ),
      // 40-bit block_index
      blockIndex: (
        /* replace with bigint? (Token.UINT8.get(buf, off + 10) << 32) + */
        Token$3.UINT32_LE.get(buf, off + 16)
      ),
      // 40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
      blockSamples: Token$3.UINT32_LE.get(buf, off + 20),
      // various flags for id and decoding
      flags: {
        bitsPerSample: (1 + WavPack.getBitAllignedNumber(flags, 0, 2)) * 8,
        isMono: WavPack.isBitSet(flags, 2),
        isHybrid: WavPack.isBitSet(flags, 3),
        isJointStereo: WavPack.isBitSet(flags, 4),
        crossChannel: WavPack.isBitSet(flags, 5),
        hybridNoiseShaping: WavPack.isBitSet(flags, 6),
        floatingPoint: WavPack.isBitSet(flags, 7),
        samplingRate: SampleRates[WavPack.getBitAllignedNumber(flags, 23, 4)],
        isDSD: WavPack.isBitSet(flags, 31)
      },
      // crc for actual decoded data
      crc: new Token$3.Uint8ArrayType(4).get(buf, off + 28)
    };
    if (res.flags.isDSD) {
      res.totalSamples *= 8;
    }
    return res;
  }
};
WavPack.MetadataIdToken = {
  len: 1,
  get: (buf, off) => {
    return {
      functionId: WavPack.getBitAllignedNumber(buf[off], 0, 6),
      isOptional: WavPack.isBitSet(buf[off], 5),
      isOddSize: WavPack.isBitSet(buf[off], 6),
      largeBlock: WavPack.isBitSet(buf[off], 7)
    };
  }
};
WavPackToken.WavPack = WavPack;
Object.defineProperty(WavPackParser$1, "__esModule", { value: true });
WavPackParser$1.WavPackParser = void 0;
const Token$2 = lib$1;
const APEv2Parser_1$2 = APEv2Parser$1;
const FourCC_1$2 = FourCC;
const BasicParser_1$2 = BasicParser$1;
const WavPackToken_1 = WavPackToken;
const debug_1$4 = srcExports;
const debug$4 = (0, debug_1$4.default)("music-metadata:parser:WavPack");
class WavPackParser extends BasicParser_1$2.BasicParser {
  async parse() {
    this.audioDataSize = 0;
    await this.parseWavPackBlocks();
    return APEv2Parser_1$2.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
  }
  async parseWavPackBlocks() {
    do {
      const blockId = await this.tokenizer.peekToken(FourCC_1$2.FourCcToken);
      if (blockId !== "wvpk")
        break;
      const header = await this.tokenizer.readToken(WavPackToken_1.WavPack.BlockHeaderToken);
      if (header.BlockID !== "wvpk")
        throw new Error("Invalid WavPack Block-ID");
      debug$4(`WavPack header blockIndex=${header.blockIndex}, len=${WavPackToken_1.WavPack.BlockHeaderToken.len}`);
      if (header.blockIndex === 0 && !this.metadata.format.container) {
        this.metadata.setFormat("container", "WavPack");
        this.metadata.setFormat("lossless", !header.flags.isHybrid);
        this.metadata.setFormat("bitsPerSample", header.flags.bitsPerSample);
        if (!header.flags.isDSD) {
          this.metadata.setFormat("sampleRate", header.flags.samplingRate);
          this.metadata.setFormat("duration", header.totalSamples / header.flags.samplingRate);
        }
        this.metadata.setFormat("numberOfChannels", header.flags.isMono ? 1 : 2);
        this.metadata.setFormat("numberOfSamples", header.totalSamples);
        this.metadata.setFormat("codec", header.flags.isDSD ? "DSD" : "PCM");
      }
      const ignoreBytes = header.blockSize - (WavPackToken_1.WavPack.BlockHeaderToken.len - 8);
      await (header.blockIndex === 0 ? this.parseMetadataSubBlock(header, ignoreBytes) : this.tokenizer.ignore(ignoreBytes));
      if (header.blockSamples > 0) {
        this.audioDataSize += header.blockSize;
      }
    } while (!this.tokenizer.fileInfo.size || this.tokenizer.fileInfo.size - this.tokenizer.position >= WavPackToken_1.WavPack.BlockHeaderToken.len);
    this.metadata.setFormat("bitrate", this.audioDataSize * 8 / this.metadata.format.duration);
  }
  /**
   * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf, 3.0 Metadata Sub-blocks
   * @param remainingLength
   */
  async parseMetadataSubBlock(header, remainingLength) {
    while (remainingLength > WavPackToken_1.WavPack.MetadataIdToken.len) {
      const id = await this.tokenizer.readToken(WavPackToken_1.WavPack.MetadataIdToken);
      const dataSizeInWords = await this.tokenizer.readNumber(id.largeBlock ? Token$2.UINT24_LE : Token$2.UINT8);
      const data = Buffer.alloc(dataSizeInWords * 2 - (id.isOddSize ? 1 : 0));
      await this.tokenizer.readBuffer(data);
      debug$4(`Metadata Sub-Blocks functionId=0x${id.functionId.toString(16)}, id.largeBlock=${id.largeBlock},data-size=${data.length}`);
      switch (id.functionId) {
        case 0:
          break;
        case 14:
          debug$4("ID_DSD_BLOCK");
          const mp = 1 << data.readUInt8(0);
          const samplingRate = header.flags.samplingRate * mp * 8;
          if (!header.flags.isDSD)
            throw new Error("Only expect DSD block if DSD-flag is set");
          this.metadata.setFormat("sampleRate", samplingRate);
          this.metadata.setFormat("duration", header.totalSamples / samplingRate);
          break;
        case 36:
          debug$4("ID_ALT_TRAILER: trailer for non-wav files");
          break;
        case 38:
          this.metadata.setFormat("audioMD5", data);
          break;
        case 47:
          debug$4(`ID_BLOCK_CHECKSUM: checksum=${data.toString("hex")}`);
          break;
        default:
          debug$4(`Ignore unsupported meta-sub-block-id functionId=0x${id.functionId.toString(16)}`);
          break;
      }
      remainingLength -= WavPackToken_1.WavPack.MetadataIdToken.len + (id.largeBlock ? Token$2.UINT24_LE.len : Token$2.UINT8.len) + dataSizeInWords * 2;
      debug$4(`remainingLength=${remainingLength}`);
      if (id.isOddSize)
        this.tokenizer.ignore(1);
    }
    if (remainingLength !== 0)
      throw new Error("metadata-sub-block should fit it remaining length");
  }
}
WavPackParser$1.WavPackParser = WavPackParser;
var DsfParser$1 = {};
var DsfChunk = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.FormatChunk = exports.ChannelType = exports.DsdChunk = exports.ChunkHeader = void 0;
  const Token2 = lib$1;
  const FourCC_12 = FourCC;
  exports.ChunkHeader = {
    len: 12,
    get: (buf, off) => {
      return { id: FourCC_12.FourCcToken.get(buf, off), size: Token2.UINT64_LE.get(buf, off + 4) };
    }
  };
  exports.DsdChunk = {
    len: 16,
    get: (buf, off) => {
      return {
        fileSize: Token2.INT64_LE.get(buf, off),
        metadataPointer: Token2.INT64_LE.get(buf, off + 8)
      };
    }
  };
  (function(ChannelType) {
    ChannelType[ChannelType["mono"] = 1] = "mono";
    ChannelType[ChannelType["stereo"] = 2] = "stereo";
    ChannelType[ChannelType["channels"] = 3] = "channels";
    ChannelType[ChannelType["quad"] = 4] = "quad";
    ChannelType[ChannelType["4 channels"] = 5] = "4 channels";
    ChannelType[ChannelType["5 channels"] = 6] = "5 channels";
    ChannelType[ChannelType["5.1 channels"] = 7] = "5.1 channels";
  })(exports.ChannelType || (exports.ChannelType = {}));
  exports.FormatChunk = {
    len: 40,
    get: (buf, off) => {
      return {
        formatVersion: Token2.INT32_LE.get(buf, off),
        formatID: Token2.INT32_LE.get(buf, off + 4),
        channelType: Token2.INT32_LE.get(buf, off + 8),
        channelNum: Token2.INT32_LE.get(buf, off + 12),
        samplingFrequency: Token2.INT32_LE.get(buf, off + 16),
        bitsPerSample: Token2.INT32_LE.get(buf, off + 20),
        sampleCount: Token2.INT64_LE.get(buf, off + 24),
        blockSizePerChannel: Token2.INT32_LE.get(buf, off + 32)
      };
    }
  };
})(DsfChunk);
Object.defineProperty(DsfParser$1, "__esModule", { value: true });
DsfParser$1.DsfParser = void 0;
const debug_1$3 = srcExports;
const AbstractID3Parser_1 = AbstractID3Parser$1;
const DsfChunk_1 = DsfChunk;
const ID3v2Parser_1$1 = ID3v2Parser$1;
const debug$3 = (0, debug_1$3.default)("music-metadata:parser:DSF");
class DsfParser extends AbstractID3Parser_1.AbstractID3Parser {
  async postId3v2Parse() {
    const p0 = this.tokenizer.position;
    const chunkHeader = await this.tokenizer.readToken(DsfChunk_1.ChunkHeader);
    if (chunkHeader.id !== "DSD ")
      throw new Error("Invalid chunk signature");
    this.metadata.setFormat("container", "DSF");
    this.metadata.setFormat("lossless", true);
    const dsdChunk = await this.tokenizer.readToken(DsfChunk_1.DsdChunk);
    if (dsdChunk.metadataPointer === BigInt(0)) {
      debug$3(`No ID3v2 tag present`);
    } else {
      debug$3(`expect ID3v2 at offset=${dsdChunk.metadataPointer}`);
      await this.parseChunks(dsdChunk.fileSize - chunkHeader.size);
      await this.tokenizer.ignore(Number(dsdChunk.metadataPointer) - this.tokenizer.position - p0);
      return new ID3v2Parser_1$1.ID3v2Parser().parse(this.metadata, this.tokenizer, this.options);
    }
  }
  async parseChunks(bytesRemaining) {
    while (bytesRemaining >= DsfChunk_1.ChunkHeader.len) {
      const chunkHeader = await this.tokenizer.readToken(DsfChunk_1.ChunkHeader);
      debug$3(`Parsing chunk name=${chunkHeader.id} size=${chunkHeader.size}`);
      switch (chunkHeader.id) {
        case "fmt ":
          const formatChunk = await this.tokenizer.readToken(DsfChunk_1.FormatChunk);
          this.metadata.setFormat("numberOfChannels", formatChunk.channelNum);
          this.metadata.setFormat("sampleRate", formatChunk.samplingFrequency);
          this.metadata.setFormat("bitsPerSample", formatChunk.bitsPerSample);
          this.metadata.setFormat("numberOfSamples", formatChunk.sampleCount);
          this.metadata.setFormat("duration", Number(formatChunk.sampleCount) / formatChunk.samplingFrequency);
          const bitrate = formatChunk.bitsPerSample * formatChunk.samplingFrequency * formatChunk.channelNum;
          this.metadata.setFormat("bitrate", bitrate);
          return;
        default:
          this.tokenizer.ignore(Number(chunkHeader.size) - DsfChunk_1.ChunkHeader.len);
          break;
      }
      bytesRemaining -= chunkHeader.size;
    }
  }
}
DsfParser$1.DsfParser = DsfParser;
var DsdiffParser$1 = {};
var DsdiffToken = {};
Object.defineProperty(DsdiffToken, "__esModule", { value: true });
DsdiffToken.ChunkHeader64 = void 0;
const Token$1 = lib$1;
const FourCC_1$1 = FourCC;
DsdiffToken.ChunkHeader64 = {
  len: 12,
  get: (buf, off) => {
    return {
      // Group-ID
      chunkID: FourCC_1$1.FourCcToken.get(buf, off),
      // Size
      chunkSize: Token$1.INT64_BE.get(buf, off + 4)
    };
  }
};
Object.defineProperty(DsdiffParser$1, "__esModule", { value: true });
DsdiffParser$1.DsdiffParser = void 0;
const Token = lib$1;
const debug_1$2 = srcExports;
const strtok3$1 = core$1;
const FourCC_1 = FourCC;
const BasicParser_1$1 = BasicParser$1;
const ID3v2Parser_1 = ID3v2Parser$1;
const DsdiffToken_1 = DsdiffToken;
const debug$2 = (0, debug_1$2.default)("music-metadata:parser:aiff");
class DsdiffParser extends BasicParser_1$1.BasicParser {
  async parse() {
    const header = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
    if (header.chunkID !== "FRM8")
      throw new Error("Unexpected chunk-ID");
    const type2 = (await this.tokenizer.readToken(FourCC_1.FourCcToken)).trim();
    switch (type2) {
      case "DSD":
        this.metadata.setFormat("container", `DSDIFF/${type2}`);
        this.metadata.setFormat("lossless", true);
        return this.readFmt8Chunks(header.chunkSize - BigInt(FourCC_1.FourCcToken.len));
      default:
        throw Error(`Unsupported DSDIFF type: ${type2}`);
    }
  }
  async readFmt8Chunks(remainingSize) {
    while (remainingSize >= DsdiffToken_1.ChunkHeader64.len) {
      const chunkHeader = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
      debug$2(`Chunk id=${chunkHeader.chunkID}`);
      await this.readData(chunkHeader);
      remainingSize -= BigInt(DsdiffToken_1.ChunkHeader64.len) + chunkHeader.chunkSize;
    }
  }
  async readData(header) {
    debug$2(`Reading data of chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
    const p0 = this.tokenizer.position;
    switch (header.chunkID.trim()) {
      case "FVER":
        const version = await this.tokenizer.readToken(Token.UINT32_LE);
        debug$2(`DSDIFF version=${version}`);
        break;
      case "PROP":
        const propType = await this.tokenizer.readToken(FourCC_1.FourCcToken);
        if (propType !== "SND ")
          throw new Error("Unexpected PROP-chunk ID");
        await this.handleSoundPropertyChunks(header.chunkSize - BigInt(FourCC_1.FourCcToken.len));
        break;
      case "ID3":
        const id3_data = await this.tokenizer.readToken(new Token.Uint8ArrayType(Number(header.chunkSize)));
        const rst = strtok3$1.fromBuffer(id3_data);
        await new ID3v2Parser_1.ID3v2Parser().parse(this.metadata, rst, this.options);
        break;
      default:
        debug$2(`Ignore chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
        break;
      case "DSD":
        this.metadata.setFormat("numberOfSamples", Number(header.chunkSize * BigInt(8) / BigInt(this.metadata.format.numberOfChannels)));
        this.metadata.setFormat("duration", this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
        break;
    }
    const remaining = header.chunkSize - BigInt(this.tokenizer.position - p0);
    if (remaining > 0) {
      debug$2(`After Parsing chunk, remaining ${remaining} bytes`);
      await this.tokenizer.ignore(Number(remaining));
    }
  }
  async handleSoundPropertyChunks(remainingSize) {
    debug$2(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    while (remainingSize > 0) {
      const sndPropHeader = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
      debug$2(`Sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
      const p0 = this.tokenizer.position;
      switch (sndPropHeader.chunkID.trim()) {
        case "FS":
          const sampleRate = await this.tokenizer.readToken(Token.UINT32_BE);
          this.metadata.setFormat("sampleRate", sampleRate);
          break;
        case "CHNL":
          const numChannels = await this.tokenizer.readToken(Token.UINT16_BE);
          this.metadata.setFormat("numberOfChannels", numChannels);
          await this.handleChannelChunks(sndPropHeader.chunkSize - BigInt(Token.UINT16_BE.len));
          break;
        case "CMPR":
          const compressionIdCode = (await this.tokenizer.readToken(FourCC_1.FourCcToken)).trim();
          const count = await this.tokenizer.readToken(Token.UINT8);
          const compressionName = await this.tokenizer.readToken(new Token.StringType(count, "ascii"));
          if (compressionIdCode === "DSD") {
            this.metadata.setFormat("lossless", true);
            this.metadata.setFormat("bitsPerSample", 1);
          }
          this.metadata.setFormat("codec", `${compressionIdCode} (${compressionName})`);
          break;
        case "ABSS":
          const hours = await this.tokenizer.readToken(Token.UINT16_BE);
          const minutes = await this.tokenizer.readToken(Token.UINT8);
          const seconds = await this.tokenizer.readToken(Token.UINT8);
          const samples = await this.tokenizer.readToken(Token.UINT32_BE);
          debug$2(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
          break;
        case "LSCO":
          const lsConfig = await this.tokenizer.readToken(Token.UINT16_BE);
          debug$2(`LSCO lsConfig=${lsConfig}`);
          break;
        case "COMT":
        default:
          debug$2(`Unknown sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
          await this.tokenizer.ignore(Number(sndPropHeader.chunkSize));
      }
      const remaining = sndPropHeader.chunkSize - BigInt(this.tokenizer.position - p0);
      if (remaining > 0) {
        debug$2(`After Parsing sound-property-chunk ${sndPropHeader.chunkSize}, remaining ${remaining} bytes`);
        await this.tokenizer.ignore(Number(remaining));
      }
      remainingSize -= BigInt(DsdiffToken_1.ChunkHeader64.len) + sndPropHeader.chunkSize;
      debug$2(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    }
    if (this.metadata.format.lossless && this.metadata.format.sampleRate && this.metadata.format.numberOfChannels && this.metadata.format.bitsPerSample) {
      const bitrate = this.metadata.format.sampleRate * this.metadata.format.numberOfChannels * this.metadata.format.bitsPerSample;
      this.metadata.setFormat("bitrate", bitrate);
    }
  }
  async handleChannelChunks(remainingSize) {
    debug$2(`Parsing channel-chunks, remainingSize=${remainingSize}`);
    const channels = [];
    while (remainingSize >= FourCC_1.FourCcToken.len) {
      const channelId = await this.tokenizer.readToken(FourCC_1.FourCcToken);
      debug$2(`Channel[ID=${channelId}]`);
      channels.push(channelId);
      remainingSize -= BigInt(FourCC_1.FourCcToken.len);
    }
    debug$2(`Channels: ${channels.join(", ")}`);
    return channels;
  }
}
DsdiffParser$1.DsdiffParser = DsdiffParser;
var MatroskaParser$1 = {};
var MatroskaDtd = {};
Object.defineProperty(MatroskaDtd, "__esModule", { value: true });
MatroskaDtd.elements = void 0;
const types_1$1 = types;
MatroskaDtd.elements = {
  440786851: {
    name: "ebml",
    container: {
      17030: { name: "ebmlVersion", value: types_1$1.DataType.uint },
      17143: { name: "ebmlReadVersion", value: types_1$1.DataType.uint },
      17138: { name: "ebmlMaxIDWidth", value: types_1$1.DataType.uint },
      17139: { name: "ebmlMaxSizeWidth", value: types_1$1.DataType.uint },
      17026: { name: "docType", value: types_1$1.DataType.string },
      17031: { name: "docTypeVersion", value: types_1$1.DataType.uint },
      17029: { name: "docTypeReadVersion", value: types_1$1.DataType.uint }
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
              21419: { name: "seekId", value: types_1$1.DataType.binary },
              21420: { name: "seekPosition", value: types_1$1.DataType.uint }
            }
          }
        }
      },
      // Segment Information
      357149030: {
        name: "info",
        container: {
          29604: { name: "uid", value: types_1$1.DataType.uid },
          29572: { name: "filename", value: types_1$1.DataType.string },
          3979555: { name: "prevUID", value: types_1$1.DataType.uid },
          3965867: { name: "prevFilename", value: types_1$1.DataType.string },
          4110627: { name: "nextUID", value: types_1$1.DataType.uid },
          4096955: { name: "nextFilename", value: types_1$1.DataType.string },
          2807729: { name: "timecodeScale", value: types_1$1.DataType.uint },
          17545: { name: "duration", value: types_1$1.DataType.float },
          17505: { name: "dateUTC", value: types_1$1.DataType.uint },
          31657: { name: "title", value: types_1$1.DataType.string },
          19840: { name: "muxingApp", value: types_1$1.DataType.string },
          22337: { name: "writingApp", value: types_1$1.DataType.string }
        }
      },
      // Cluster
      524531317: {
        name: "cluster",
        multiple: true,
        container: {
          231: { name: "timecode", value: types_1$1.DataType.uid },
          163: { name: "unknown", value: types_1$1.DataType.binary },
          167: { name: "position", value: types_1$1.DataType.uid },
          171: { name: "prevSize", value: types_1$1.DataType.uid }
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
              215: { name: "trackNumber", value: types_1$1.DataType.uint },
              29637: { name: "uid", value: types_1$1.DataType.uid },
              131: { name: "trackType", value: types_1$1.DataType.uint },
              185: { name: "flagEnabled", value: types_1$1.DataType.bool },
              136: { name: "flagDefault", value: types_1$1.DataType.bool },
              21930: { name: "flagForced", value: types_1$1.DataType.bool },
              156: { name: "flagLacing", value: types_1$1.DataType.bool },
              28135: { name: "minCache", value: types_1$1.DataType.uint },
              28136: { name: "maxCache", value: types_1$1.DataType.uint },
              2352003: { name: "defaultDuration", value: types_1$1.DataType.uint },
              2306383: { name: "timecodeScale", value: types_1$1.DataType.float },
              21358: { name: "name", value: types_1$1.DataType.string },
              2274716: { name: "language", value: types_1$1.DataType.string },
              134: { name: "codecID", value: types_1$1.DataType.string },
              25506: { name: "codecPrivate", value: types_1$1.DataType.binary },
              2459272: { name: "codecName", value: types_1$1.DataType.string },
              3839639: { name: "codecSettings", value: types_1$1.DataType.string },
              3883072: { name: "codecInfoUrl", value: types_1$1.DataType.string },
              2536e3: { name: "codecDownloadUrl", value: types_1$1.DataType.string },
              170: { name: "codecDecodeAll", value: types_1$1.DataType.bool },
              28587: { name: "trackOverlay", value: types_1$1.DataType.uint },
              // Video
              224: {
                name: "video",
                container: {
                  154: { name: "flagInterlaced", value: types_1$1.DataType.bool },
                  21432: { name: "stereoMode", value: types_1$1.DataType.uint },
                  176: { name: "pixelWidth", value: types_1$1.DataType.uint },
                  186: { name: "pixelHeight", value: types_1$1.DataType.uint },
                  21680: { name: "displayWidth", value: types_1$1.DataType.uint },
                  21690: { name: "displayHeight", value: types_1$1.DataType.uint },
                  21683: { name: "aspectRatioType", value: types_1$1.DataType.uint },
                  3061028: { name: "colourSpace", value: types_1$1.DataType.uint },
                  3126563: { name: "gammaValue", value: types_1$1.DataType.float }
                }
              },
              // Audio
              225: {
                name: "audio",
                container: {
                  181: { name: "samplingFrequency", value: types_1$1.DataType.float },
                  30901: { name: "outputSamplingFrequency", value: types_1$1.DataType.float },
                  159: { name: "channels", value: types_1$1.DataType.uint },
                  148: { name: "channels", value: types_1$1.DataType.uint },
                  32123: { name: "channelPositions", value: types_1$1.DataType.binary },
                  25188: { name: "bitDepth", value: types_1$1.DataType.uint }
                }
              },
              // Content Encoding
              28032: {
                name: "contentEncodings",
                container: {
                  25152: {
                    name: "contentEncoding",
                    container: {
                      20529: { name: "order", value: types_1$1.DataType.uint },
                      20530: { name: "scope", value: types_1$1.DataType.bool },
                      20531: { name: "type", value: types_1$1.DataType.uint },
                      20532: {
                        name: "contentEncoding",
                        container: {
                          16980: { name: "contentCompAlgo", value: types_1$1.DataType.uint },
                          16981: { name: "contentCompSettings", value: types_1$1.DataType.binary }
                        }
                      },
                      20533: {
                        name: "contentEncoding",
                        container: {
                          18401: { name: "contentEncAlgo", value: types_1$1.DataType.uint },
                          18402: { name: "contentEncKeyID", value: types_1$1.DataType.binary },
                          18403: { name: "contentSignature ", value: types_1$1.DataType.binary },
                          18404: { name: "ContentSigKeyID  ", value: types_1$1.DataType.binary },
                          18405: { name: "contentSigAlgo ", value: types_1$1.DataType.uint },
                          18406: { name: "contentSigHashAlgo ", value: types_1$1.DataType.uint }
                        }
                      },
                      25188: { name: "bitDepth", value: types_1$1.DataType.uint }
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
              179: { name: "cueTime", value: types_1$1.DataType.uid },
              183: {
                name: "positions",
                container: {
                  247: { name: "track", value: types_1$1.DataType.uint },
                  241: { name: "clusterPosition", value: types_1$1.DataType.uint },
                  21368: { name: "blockNumber", value: types_1$1.DataType.uint },
                  234: { name: "codecState", value: types_1$1.DataType.uint },
                  219: {
                    name: "reference",
                    container: {
                      150: { name: "time", value: types_1$1.DataType.uint },
                      151: { name: "cluster", value: types_1$1.DataType.uint },
                      21343: { name: "number", value: types_1$1.DataType.uint },
                      235: { name: "codecState", value: types_1$1.DataType.uint }
                    }
                  },
                  240: { name: "relativePosition", value: types_1$1.DataType.uint }
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
              18046: { name: "description", value: types_1$1.DataType.string },
              18030: { name: "name", value: types_1$1.DataType.string },
              18016: { name: "mimeType", value: types_1$1.DataType.string },
              18012: { name: "data", value: types_1$1.DataType.binary },
              18094: { name: "uid", value: types_1$1.DataType.uid }
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
                  29636: { name: "uid", value: types_1$1.DataType.uid },
                  145: { name: "timeStart", value: types_1$1.DataType.uint },
                  146: { name: "timeEnd", value: types_1$1.DataType.uid },
                  152: { name: "hidden", value: types_1$1.DataType.bool },
                  17816: { name: "enabled", value: types_1$1.DataType.uid },
                  143: {
                    name: "track",
                    container: {
                      137: { name: "trackNumber", value: types_1$1.DataType.uid },
                      128: {
                        name: "display",
                        container: {
                          133: { name: "string", value: types_1$1.DataType.string },
                          17276: { name: "language ", value: types_1$1.DataType.string },
                          17278: { name: "country ", value: types_1$1.DataType.string }
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
                  25541: { name: "tagTrackUID", value: types_1$1.DataType.uid },
                  25540: { name: "tagChapterUID", value: types_1$1.DataType.uint },
                  25542: { name: "tagAttachmentUID", value: types_1$1.DataType.uid },
                  25546: { name: "targetType", value: types_1$1.DataType.string },
                  26826: { name: "targetTypeValue", value: types_1$1.DataType.uint },
                  25545: { name: "tagEditionUID", value: types_1$1.DataType.uid }
                  // extended
                }
              },
              26568: {
                name: "simpleTags",
                multiple: true,
                container: {
                  17827: { name: "name", value: types_1$1.DataType.string },
                  17543: { name: "string", value: types_1$1.DataType.string },
                  17541: { name: "binary", value: types_1$1.DataType.binary },
                  17530: { name: "language", value: types_1$1.DataType.string },
                  17531: { name: "languageIETF", value: types_1$1.DataType.string },
                  17540: { name: "default", value: types_1$1.DataType.bool }
                  // extended
                }
              }
            }
          }
        }
      }
    }
  }
};
Object.defineProperty(MatroskaParser$1, "__esModule", { value: true });
MatroskaParser$1.MatroskaParser = void 0;
const token_types_1 = lib$1;
const debug_1$1 = srcExports;
const BasicParser_1 = BasicParser$1;
const types_1 = types;
const matroskaDtd = MatroskaDtd;
const debug$1 = (0, debug_1$1.default)("music-metadata:parser:matroska");
class MatroskaParser extends BasicParser_1.BasicParser {
  constructor() {
    super();
    this.padding = 0;
    this.parserMap = /* @__PURE__ */ new Map();
    this.ebmlMaxIDLength = 4;
    this.ebmlMaxSizeLength = 8;
    this.parserMap.set(types_1.DataType.uint, (e) => this.readUint(e));
    this.parserMap.set(types_1.DataType.string, (e) => this.readString(e));
    this.parserMap.set(types_1.DataType.binary, (e) => this.readBuffer(e));
    this.parserMap.set(types_1.DataType.uid, async (e) => await this.readUint(e) === 1);
    this.parserMap.set(types_1.DataType.bool, (e) => this.readFlag(e));
    this.parserMap.set(types_1.DataType.float, (e) => this.readFloat(e));
  }
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  init(metadata, tokenizer, options) {
    super.init(metadata, tokenizer, options);
    return this;
  }
  async parse() {
    const matroska = await this.parseContainer(matroskaDtd.elements, this.tokenizer.fileInfo.size, []);
    this.metadata.setFormat("container", `EBML/${matroska.ebml.docType}`);
    if (matroska.segment) {
      const info = matroska.segment.info;
      if (info) {
        const timecodeScale = info.timecodeScale ? info.timecodeScale : 1e6;
        if (typeof info.duration === "number") {
          const duration = info.duration * timecodeScale / 1e9;
          this.addTag("segment:title", info.title);
          this.metadata.setFormat("duration", duration);
        }
      }
      const audioTracks = matroska.segment.tracks;
      if (audioTracks && audioTracks.entries) {
        audioTracks.entries.forEach((entry) => {
          const stream2 = {
            codecName: entry.codecID.replace("A_", "").replace("V_", ""),
            codecSettings: entry.codecSettings,
            flagDefault: entry.flagDefault,
            flagLacing: entry.flagLacing,
            flagEnabled: entry.flagEnabled,
            language: entry.language,
            name: entry.name,
            type: entry.trackType,
            audio: entry.audio,
            video: entry.video
          };
          this.metadata.addStreamInfo(stream2);
        });
        const audioTrack = audioTracks.entries.filter((entry) => {
          return entry.trackType === types_1.TrackType.audio.valueOf();
        }).reduce((acc, cur) => {
          if (!acc) {
            return cur;
          }
          if (!acc.flagDefault && cur.flagDefault) {
            return cur;
          }
          if (cur.trackNumber && cur.trackNumber < acc.trackNumber) {
            return cur;
          }
          return acc;
        }, null);
        if (audioTrack) {
          this.metadata.setFormat("codec", audioTrack.codecID.replace("A_", ""));
          this.metadata.setFormat("sampleRate", audioTrack.audio.samplingFrequency);
          this.metadata.setFormat("numberOfChannels", audioTrack.audio.channels);
        }
        if (matroska.segment.tags) {
          matroska.segment.tags.tag.forEach((tag) => {
            const target = tag.target;
            const targetType = (target === null || target === void 0 ? void 0 : target.targetTypeValue) ? types_1.TargetType[target.targetTypeValue] : (target === null || target === void 0 ? void 0 : target.targetType) ? target.targetType : "track";
            tag.simpleTags.forEach((simpleTag) => {
              const value = simpleTag.string ? simpleTag.string : simpleTag.binary;
              this.addTag(`${targetType}:${simpleTag.name}`, value);
            });
          });
        }
        if (matroska.segment.attachments) {
          matroska.segment.attachments.attachedFiles.filter((file) => file.mimeType.startsWith("image/")).map((file) => {
            return {
              data: file.data,
              format: file.mimeType,
              description: file.description,
              name: file.name
            };
          }).forEach((picture) => {
            this.addTag("picture", picture);
          });
        }
      }
    }
  }
  async parseContainer(container, posDone, path2) {
    const tree = {};
    while (this.tokenizer.position < posDone) {
      let element;
      try {
        element = await this.readElement();
      } catch (error) {
        if (error.message === "End-Of-Stream") {
          break;
        }
        throw error;
      }
      const type2 = container[element.id];
      if (type2) {
        debug$1(`Element: name=${type2.name}, container=${!!type2.container}`);
        if (type2.container) {
          const res = await this.parseContainer(type2.container, element.len >= 0 ? this.tokenizer.position + element.len : -1, path2.concat([type2.name]));
          if (type2.multiple) {
            if (!tree[type2.name]) {
              tree[type2.name] = [];
            }
            tree[type2.name].push(res);
          } else {
            tree[type2.name] = res;
          }
        } else {
          tree[type2.name] = await this.parserMap.get(type2.value)(element);
        }
      } else {
        switch (element.id) {
          case 236:
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
            break;
          default:
            debug$1(`parseEbml: path=${path2.join("/")}, unknown element: id=${element.id.toString(16)}`);
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
        }
      }
    }
    return tree;
  }
  async readVintData(maxLength) {
    const msb = await this.tokenizer.peekNumber(token_types_1.UINT8);
    let mask = 128;
    let oc = 1;
    while ((msb & mask) === 0) {
      if (oc > maxLength) {
        throw new Error("VINT value exceeding maximum size");
      }
      ++oc;
      mask >>= 1;
    }
    const id = Buffer.alloc(oc);
    await this.tokenizer.readBuffer(id);
    return id;
  }
  async readElement() {
    const id = await this.readVintData(this.ebmlMaxIDLength);
    const lenField = await this.readVintData(this.ebmlMaxSizeLength);
    lenField[0] ^= 128 >> lenField.length - 1;
    const nrLen = Math.min(6, lenField.length);
    return {
      id: id.readUIntBE(0, id.length),
      len: lenField.readUIntBE(lenField.length - nrLen, nrLen)
    };
  }
  isMaxValue(vintData) {
    if (vintData.length === this.ebmlMaxSizeLength) {
      for (let n = 1; n < this.ebmlMaxSizeLength; ++n) {
        if (vintData[n] !== 255)
          return false;
      }
      return true;
    }
    return false;
  }
  async readFloat(e) {
    switch (e.len) {
      case 0:
        return 0;
      case 4:
        return this.tokenizer.readNumber(token_types_1.Float32_BE);
      case 8:
        return this.tokenizer.readNumber(token_types_1.Float64_BE);
      case 10:
        return this.tokenizer.readNumber(token_types_1.Float64_BE);
      default:
        throw new Error(`Invalid IEEE-754 float length: ${e.len}`);
    }
  }
  async readFlag(e) {
    return await this.readUint(e) === 1;
  }
  async readUint(e) {
    const buf = await this.readBuffer(e);
    const nrLen = Math.min(6, e.len);
    return buf.readUIntBE(e.len - nrLen, nrLen);
  }
  async readString(e) {
    const rawString = await this.tokenizer.readToken(new token_types_1.StringType(e.len, "utf-8"));
    return rawString.replace(/\00.*$/g, "");
  }
  async readBuffer(e) {
    const buf = Buffer.alloc(e.len);
    await this.tokenizer.readBuffer(buf);
    return buf;
  }
  addTag(tagId, value) {
    this.metadata.addTag("matroska", tagId, value);
  }
}
MatroskaParser$1.MatroskaParser = MatroskaParser;
Object.defineProperty(ParserFactory$1, "__esModule", { value: true });
ParserFactory$1.ParserFactory = ParserFactory$1.parseHttpContentType = void 0;
const FileType = core;
const ContentType = contentType;
const MimeType = mediaTyper;
const debug_1 = srcExports;
const MetadataCollector_1 = MetadataCollector$1;
const AiffParser_1 = AiffParser;
const APEv2Parser_1$1 = APEv2Parser$1;
const AsfParser_1 = AsfParser$1;
const FlacParser_1 = FlacParser$1;
const MP4Parser_1 = MP4Parser$1;
const MpegParser_1 = MpegParser$1;
const musepack_1 = musepack;
const OggParser_1 = OggParser$1;
const WaveParser_1 = WaveParser$1;
const WavPackParser_1 = WavPackParser$1;
const DsfParser_1 = DsfParser$1;
const DsdiffParser_1 = DsdiffParser$1;
const MatroskaParser_1 = MatroskaParser$1;
const debug = (0, debug_1.default)("music-metadata:parser:factory");
function parseHttpContentType(contentType2) {
  const type2 = ContentType.parse(contentType2);
  const mime = MimeType.parse(type2.type);
  return {
    type: mime.type,
    subtype: mime.subtype,
    suffix: mime.suffix,
    parameters: type2.parameters
  };
}
ParserFactory$1.parseHttpContentType = parseHttpContentType;
async function parse(tokenizer, parserId, opts = {}) {
  const parser = await ParserFactory.loadParser(parserId);
  const metadata = new MetadataCollector_1.MetadataCollector(opts);
  await parser.init(metadata, tokenizer, opts).parse();
  return metadata.toCommonMetadata();
}
class ParserFactory {
  /**
   * Parse metadata from tokenizer
   * @param tokenizer - Tokenizer
   * @param opts - Options
   * @returns Native metadata
   */
  static async parseOnContentType(tokenizer, opts) {
    const { mimeType, path: path2, url } = await tokenizer.fileInfo;
    const parserId = ParserFactory.getParserIdForMimeType(mimeType) || ParserFactory.getParserIdForExtension(path2) || ParserFactory.getParserIdForExtension(url);
    if (!parserId) {
      debug("No parser found for MIME-type / extension: " + mimeType);
    }
    return this.parse(tokenizer, parserId, opts);
  }
  static async parse(tokenizer, parserId, opts) {
    if (!parserId) {
      debug("Guess parser on content...");
      const buf = Buffer.alloc(4100);
      await tokenizer.peekBuffer(buf, { mayBeLess: true });
      if (tokenizer.fileInfo.path) {
        parserId = this.getParserIdForExtension(tokenizer.fileInfo.path);
      }
      if (!parserId) {
        const guessedType = await FileType.fromBuffer(buf);
        if (!guessedType) {
          throw new Error("Failed to determine audio format");
        }
        debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
        parserId = ParserFactory.getParserIdForMimeType(guessedType.mime);
        if (!parserId) {
          throw new Error("Guessed MIME-type not supported: " + guessedType.mime);
        }
      }
    }
    return parse(tokenizer, parserId, opts);
  }
  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser sub-module name
   */
  static getParserIdForExtension(filePath) {
    if (!filePath)
      return;
    const extension = this.getExtension(filePath).toLocaleLowerCase() || filePath;
    switch (extension) {
      case ".mp2":
      case ".mp3":
      case ".m2a":
      case ".aac":
        return "mpeg";
      case ".ape":
        return "apev2";
      case ".mp4":
      case ".m4a":
      case ".m4b":
      case ".m4pa":
      case ".m4v":
      case ".m4r":
      case ".3gp":
        return "mp4";
      case ".wma":
      case ".wmv":
      case ".asf":
        return "asf";
      case ".flac":
        return "flac";
      case ".ogg":
      case ".ogv":
      case ".oga":
      case ".ogm":
      case ".ogx":
      case ".opus":
      case ".spx":
        return "ogg";
      case ".aif":
      case ".aiff":
      case ".aifc":
        return "aiff";
      case ".wav":
      case ".bwf":
        return "riff";
      case ".wv":
      case ".wvp":
        return "wavpack";
      case ".mpc":
        return "musepack";
      case ".dsf":
        return "dsf";
      case ".dff":
        return "dsdiff";
      case ".mka":
      case ".mkv":
      case ".mk3d":
      case ".mks":
      case ".webm":
        return "matroska";
    }
  }
  static async loadParser(moduleName) {
    switch (moduleName) {
      case "aiff":
        return new AiffParser_1.AIFFParser();
      case "adts":
      case "mpeg":
        return new MpegParser_1.MpegParser();
      case "apev2":
        return new APEv2Parser_1$1.APEv2Parser();
      case "asf":
        return new AsfParser_1.AsfParser();
      case "dsf":
        return new DsfParser_1.DsfParser();
      case "dsdiff":
        return new DsdiffParser_1.DsdiffParser();
      case "flac":
        return new FlacParser_1.FlacParser();
      case "mp4":
        return new MP4Parser_1.MP4Parser();
      case "musepack":
        return new musepack_1.default();
      case "ogg":
        return new OggParser_1.OggParser();
      case "riff":
        return new WaveParser_1.WaveParser();
      case "wavpack":
        return new WavPackParser_1.WavPackParser();
      case "matroska":
        return new MatroskaParser_1.MatroskaParser();
      default:
        throw new Error(`Unknown parser type: ${moduleName}`);
    }
  }
  static getExtension(fname) {
    const i = fname.lastIndexOf(".");
    return i === -1 ? "" : fname.slice(i);
  }
  /**
   * @param httpContentType - HTTP Content-Type, extension, path or filename
   * @returns Parser sub-module name
   */
  static getParserIdForMimeType(httpContentType) {
    let mime;
    try {
      mime = parseHttpContentType(httpContentType);
    } catch (err) {
      debug(`Invalid HTTP Content-Type header value: ${httpContentType}`);
      return;
    }
    const subType = mime.subtype.indexOf("x-") === 0 ? mime.subtype.substring(2) : mime.subtype;
    switch (mime.type) {
      case "audio":
        switch (subType) {
          case "mp3":
          case "mpeg":
            return "mpeg";
          case "aac":
          case "aacp":
            return "adts";
          case "flac":
            return "flac";
          case "ape":
          case "monkeys-audio":
            return "apev2";
          case "mp4":
          case "m4a":
            return "mp4";
          case "ogg":
          case "opus":
          case "speex":
            return "ogg";
          case "ms-wma":
          case "ms-wmv":
          case "ms-asf":
            return "asf";
          case "aiff":
          case "aif":
          case "aifc":
            return "aiff";
          case "vnd.wave":
          case "wav":
          case "wave":
            return "riff";
          case "wavpack":
            return "wavpack";
          case "musepack":
            return "musepack";
          case "matroska":
          case "webm":
            return "matroska";
          case "dsf":
            return "dsf";
        }
        break;
      case "video":
        switch (subType) {
          case "ms-asf":
          case "ms-wmv":
            return "asf";
          case "m4v":
          case "mp4":
            return "mp4";
          case "ogg":
            return "ogg";
          case "matroska":
          case "webm":
            return "matroska";
        }
        break;
      case "application":
        switch (subType) {
          case "vnd.ms-asf":
            return "asf";
          case "ogg":
            return "ogg";
        }
        break;
    }
  }
}
ParserFactory$1.ParserFactory = ParserFactory;
var RandomUint8ArrayReader$1 = {};
Object.defineProperty(RandomUint8ArrayReader$1, "__esModule", { value: true });
RandomUint8ArrayReader$1.RandomUint8ArrayReader = void 0;
class RandomUint8ArrayReader {
  constructor(uint8Array) {
    this.uint8Array = uint8Array;
    this.fileSize = uint8Array.length;
  }
  /**
   * Read from a given position of an abstracted file or buffer.
   * @param uint8Array - Uint8Array that the data will be written to.
   * @param offset - Offset in the buffer to start writing at.
   * @param length - Integer specifying the number of bytes to read.
   * @param position - Specifies where to begin reading from in the file.
   * @return Promise providing bytes read
   */
  async randomRead(uint8Array, offset, length, position) {
    uint8Array.set(this.uint8Array.subarray(position, position + length), offset);
    return length;
  }
}
RandomUint8ArrayReader$1.RandomUint8ArrayReader = RandomUint8ArrayReader;
var Lyrics3 = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getLyricsHeaderLength = exports.endTag2 = void 0;
  exports.endTag2 = "LYRICS200";
  async function getLyricsHeaderLength(reader) {
    if (reader.fileSize >= 143) {
      const buf = Buffer.alloc(15);
      await reader.randomRead(buf, 0, buf.length, reader.fileSize - 143);
      const txt = buf.toString("binary");
      const tag = txt.substr(6);
      if (tag === exports.endTag2) {
        return parseInt(txt.substr(0, 6), 10) + 15;
      }
    }
    return 0;
  }
  exports.getLyricsHeaderLength = getLyricsHeaderLength;
})(Lyrics3);
Object.defineProperty(core$2, "__esModule", { value: true });
core$2.scanAppendingHeaders = core$2.selectCover = core$2.ratingToStars = core$2.orderTags = core$2.parseFromTokenizer = core$2.parseBuffer = core$2.parseStream = void 0;
const strtok3 = core$1;
const ParserFactory_1 = ParserFactory$1;
const RandomUint8ArrayReader_1 = RandomUint8ArrayReader$1;
const APEv2Parser_1 = APEv2Parser$1;
const ID3v1Parser_1 = ID3v1Parser;
const Lyrics3_1 = Lyrics3;
function parseStream(stream2, fileInfo, options = {}) {
  return parseFromTokenizer(strtok3.fromStream(stream2, typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo), options);
}
core$2.parseStream = parseStream;
async function parseBuffer(uint8Array, fileInfo, options = {}) {
  const bufferReader = new RandomUint8ArrayReader_1.RandomUint8ArrayReader(uint8Array);
  await scanAppendingHeaders(bufferReader, options);
  const tokenizer = strtok3.fromBuffer(uint8Array, typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo);
  return parseFromTokenizer(tokenizer, options);
}
core$2.parseBuffer = parseBuffer;
function parseFromTokenizer(tokenizer, options) {
  return ParserFactory_1.ParserFactory.parseOnContentType(tokenizer, options);
}
core$2.parseFromTokenizer = parseFromTokenizer;
function orderTags(nativeTags) {
  const tags = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = tags[tag.id] || []).push(tag.value);
  }
  return tags;
}
core$2.orderTags = orderTags;
function ratingToStars(rating) {
  return rating === void 0 ? 0 : 1 + Math.round(rating * 4);
}
core$2.ratingToStars = ratingToStars;
function selectCover(pictures) {
  return pictures ? pictures.reduce((acc, cur) => {
    if (cur.name && cur.name.toLowerCase() in ["front", "cover", "cover (front)"])
      return cur;
    return acc;
  }) : null;
}
core$2.selectCover = selectCover;
async function scanAppendingHeaders(randomReader, options = {}) {
  let apeOffset = randomReader.fileSize;
  if (await (0, ID3v1Parser_1.hasID3v1Header)(randomReader)) {
    apeOffset -= 128;
    const lyricsLen = await (0, Lyrics3_1.getLyricsHeaderLength)(randomReader);
    apeOffset -= lyricsLen;
  }
  options.apeHeader = await APEv2Parser_1.APEv2Parser.findApeFooterOffset(randomReader, apeOffset);
}
core$2.scanAppendingHeaders = scanAppendingHeaders;
var lib = {};
var readable = { exports: {} };
var stream;
var hasRequiredStream;
function requireStream() {
  if (hasRequiredStream) return stream;
  hasRequiredStream = 1;
  stream = require$$0$2;
  return stream;
}
var buffer_list;
var hasRequiredBuffer_list;
function requireBuffer_list() {
  if (hasRequiredBuffer_list) return buffer_list;
  hasRequiredBuffer_list = 1;
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      enumerableOnly && (symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })), keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      i % 2 ? ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
    return target;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    Object.defineProperty(Constructor, "prototype", { writable: false });
    return Constructor;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== void 0) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  var _require = require$$0$3, Buffer2 = _require.Buffer;
  var _require2 = require$$1$1, inspect = _require2.inspect;
  var custom = inspect && inspect.custom || "inspect";
  function copyBuffer(src2, target, offset) {
    Buffer2.prototype.copy.call(src2, target, offset);
  }
  buffer_list = /* @__PURE__ */ function() {
    function BufferList() {
      _classCallCheck(this, BufferList);
      this.head = null;
      this.tail = null;
      this.length = 0;
    }
    _createClass(BufferList, [{
      key: "push",
      value: function push(v) {
        var entry = {
          data: v,
          next: null
        };
        if (this.length > 0) this.tail.next = entry;
        else this.head = entry;
        this.tail = entry;
        ++this.length;
      }
    }, {
      key: "unshift",
      value: function unshift(v) {
        var entry = {
          data: v,
          next: this.head
        };
        if (this.length === 0) this.tail = entry;
        this.head = entry;
        ++this.length;
      }
    }, {
      key: "shift",
      value: function shift() {
        if (this.length === 0) return;
        var ret = this.head.data;
        if (this.length === 1) this.head = this.tail = null;
        else this.head = this.head.next;
        --this.length;
        return ret;
      }
    }, {
      key: "clear",
      value: function clear() {
        this.head = this.tail = null;
        this.length = 0;
      }
    }, {
      key: "join",
      value: function join(s) {
        if (this.length === 0) return "";
        var p = this.head;
        var ret = "" + p.data;
        while (p = p.next) ret += s + p.data;
        return ret;
      }
    }, {
      key: "concat",
      value: function concat(n) {
        if (this.length === 0) return Buffer2.alloc(0);
        var ret = Buffer2.allocUnsafe(n >>> 0);
        var p = this.head;
        var i = 0;
        while (p) {
          copyBuffer(p.data, ret, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      }
      // Consumes a specified amount of bytes or characters from the buffered data.
    }, {
      key: "consume",
      value: function consume(n, hasStrings) {
        var ret;
        if (n < this.head.data.length) {
          ret = this.head.data.slice(0, n);
          this.head.data = this.head.data.slice(n);
        } else if (n === this.head.data.length) {
          ret = this.shift();
        } else {
          ret = hasStrings ? this._getString(n) : this._getBuffer(n);
        }
        return ret;
      }
    }, {
      key: "first",
      value: function first() {
        return this.head.data;
      }
      // Consumes a specified amount of characters from the buffered data.
    }, {
      key: "_getString",
      value: function _getString(n) {
        var p = this.head;
        var c = 1;
        var ret = p.data;
        n -= ret.length;
        while (p = p.next) {
          var str = p.data;
          var nb = n > str.length ? str.length : n;
          if (nb === str.length) ret += str;
          else ret += str.slice(0, n);
          n -= nb;
          if (n === 0) {
            if (nb === str.length) {
              ++c;
              if (p.next) this.head = p.next;
              else this.head = this.tail = null;
            } else {
              this.head = p;
              p.data = str.slice(nb);
            }
            break;
          }
          ++c;
        }
        this.length -= c;
        return ret;
      }
      // Consumes a specified amount of bytes from the buffered data.
    }, {
      key: "_getBuffer",
      value: function _getBuffer(n) {
        var ret = Buffer2.allocUnsafe(n);
        var p = this.head;
        var c = 1;
        p.data.copy(ret);
        n -= p.data.length;
        while (p = p.next) {
          var buf = p.data;
          var nb = n > buf.length ? buf.length : n;
          buf.copy(ret, ret.length - n, 0, nb);
          n -= nb;
          if (n === 0) {
            if (nb === buf.length) {
              ++c;
              if (p.next) this.head = p.next;
              else this.head = this.tail = null;
            } else {
              this.head = p;
              p.data = buf.slice(nb);
            }
            break;
          }
          ++c;
        }
        this.length -= c;
        return ret;
      }
      // Make sure the linked list only shows the minimal necessary information.
    }, {
      key: custom,
      value: function value(_, options) {
        return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: false
        }));
      }
    }]);
    return BufferList;
  }();
  return buffer_list;
}
var destroy_1;
var hasRequiredDestroy;
function requireDestroy() {
  if (hasRequiredDestroy) return destroy_1;
  hasRequiredDestroy = 1;
  function destroy(err, cb) {
    var _this = this;
    var readableDestroyed = this._readableState && this._readableState.destroyed;
    var writableDestroyed = this._writableState && this._writableState.destroyed;
    if (readableDestroyed || writableDestroyed) {
      if (cb) {
        cb(err);
      } else if (err) {
        if (!this._writableState) {
          process.nextTick(emitErrorNT, this, err);
        } else if (!this._writableState.errorEmitted) {
          this._writableState.errorEmitted = true;
          process.nextTick(emitErrorNT, this, err);
        }
      }
      return this;
    }
    if (this._readableState) {
      this._readableState.destroyed = true;
    }
    if (this._writableState) {
      this._writableState.destroyed = true;
    }
    this._destroy(err || null, function(err2) {
      if (!cb && err2) {
        if (!_this._writableState) {
          process.nextTick(emitErrorAndCloseNT, _this, err2);
        } else if (!_this._writableState.errorEmitted) {
          _this._writableState.errorEmitted = true;
          process.nextTick(emitErrorAndCloseNT, _this, err2);
        } else {
          process.nextTick(emitCloseNT, _this);
        }
      } else if (cb) {
        process.nextTick(emitCloseNT, _this);
        cb(err2);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    });
    return this;
  }
  function emitErrorAndCloseNT(self2, err) {
    emitErrorNT(self2, err);
    emitCloseNT(self2);
  }
  function emitCloseNT(self2) {
    if (self2._writableState && !self2._writableState.emitClose) return;
    if (self2._readableState && !self2._readableState.emitClose) return;
    self2.emit("close");
  }
  function undestroy() {
    if (this._readableState) {
      this._readableState.destroyed = false;
      this._readableState.reading = false;
      this._readableState.ended = false;
      this._readableState.endEmitted = false;
    }
    if (this._writableState) {
      this._writableState.destroyed = false;
      this._writableState.ended = false;
      this._writableState.ending = false;
      this._writableState.finalCalled = false;
      this._writableState.prefinished = false;
      this._writableState.finished = false;
      this._writableState.errorEmitted = false;
    }
  }
  function emitErrorNT(self2, err) {
    self2.emit("error", err);
  }
  function errorOrDestroy(stream2, err) {
    var rState = stream2._readableState;
    var wState = stream2._writableState;
    if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream2.destroy(err);
    else stream2.emit("error", err);
  }
  destroy_1 = {
    destroy,
    undestroy,
    errorOrDestroy
  };
  return destroy_1;
}
var errors = {};
var hasRequiredErrors;
function requireErrors() {
  if (hasRequiredErrors) return errors;
  hasRequiredErrors = 1;
  const codes = {};
  function createErrorType(code, message, Base) {
    if (!Base) {
      Base = Error;
    }
    function getMessage(arg1, arg2, arg3) {
      if (typeof message === "string") {
        return message;
      } else {
        return message(arg1, arg2, arg3);
      }
    }
    class NodeError extends Base {
      constructor(arg1, arg2, arg3) {
        super(getMessage(arg1, arg2, arg3));
      }
    }
    NodeError.prototype.name = Base.name;
    NodeError.prototype.code = code;
    codes[code] = NodeError;
  }
  function oneOf(expected, thing) {
    if (Array.isArray(expected)) {
      const len = expected.length;
      expected = expected.map((i) => String(i));
      if (len > 2) {
        return `one of ${thing} ${expected.slice(0, len - 1).join(", ")}, or ` + expected[len - 1];
      } else if (len === 2) {
        return `one of ${thing} ${expected[0]} or ${expected[1]}`;
      } else {
        return `of ${thing} ${expected[0]}`;
      }
    } else {
      return `of ${thing} ${String(expected)}`;
    }
  }
  function startsWith(str, search, pos) {
    return str.substr(0, search.length) === search;
  }
  function endsWith(str, search, this_len) {
    if (this_len === void 0 || this_len > str.length) {
      this_len = str.length;
    }
    return str.substring(this_len - search.length, this_len) === search;
  }
  function includes(str, search, start) {
    if (typeof start !== "number") {
      start = 0;
    }
    if (start + search.length > str.length) {
      return false;
    } else {
      return str.indexOf(search, start) !== -1;
    }
  }
  createErrorType("ERR_INVALID_OPT_VALUE", function(name, value) {
    return 'The value "' + value + '" is invalid for option "' + name + '"';
  }, TypeError);
  createErrorType("ERR_INVALID_ARG_TYPE", function(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && startsWith(expected, "not ")) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    let msg;
    if (endsWith(name, " argument")) {
      msg = `The ${name} ${determiner} ${oneOf(expected, "type")}`;
    } else {
      const type2 = includes(name, ".") ? "property" : "argument";
      msg = `The "${name}" ${type2} ${determiner} ${oneOf(expected, "type")}`;
    }
    msg += `. Received type ${typeof actual}`;
    return msg;
  }, TypeError);
  createErrorType("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
  createErrorType("ERR_METHOD_NOT_IMPLEMENTED", function(name) {
    return "The " + name + " method is not implemented";
  });
  createErrorType("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
  createErrorType("ERR_STREAM_DESTROYED", function(name) {
    return "Cannot call " + name + " after a stream was destroyed";
  });
  createErrorType("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
  createErrorType("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
  createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
  createErrorType("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
  createErrorType("ERR_UNKNOWN_ENCODING", function(arg) {
    return "Unknown encoding: " + arg;
  }, TypeError);
  createErrorType("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
  errors.codes = codes;
  return errors;
}
var state;
var hasRequiredState;
function requireState() {
  if (hasRequiredState) return state;
  hasRequiredState = 1;
  var ERR_INVALID_OPT_VALUE = requireErrors().codes.ERR_INVALID_OPT_VALUE;
  function highWaterMarkFrom(options, isDuplex, duplexKey) {
    return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
  }
  function getHighWaterMark(state2, options, duplexKey, isDuplex) {
    var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
    if (hwm != null) {
      if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
        var name = isDuplex ? duplexKey : "highWaterMark";
        throw new ERR_INVALID_OPT_VALUE(name, hwm);
      }
      return Math.floor(hwm);
    }
    return state2.objectMode ? 16 : 16 * 1024;
  }
  state = {
    getHighWaterMark
  };
  return state;
}
var inherits = { exports: {} };
var inherits_browser = { exports: {} };
var hasRequiredInherits_browser;
function requireInherits_browser() {
  if (hasRequiredInherits_browser) return inherits_browser.exports;
  hasRequiredInherits_browser = 1;
  if (typeof Object.create === "function") {
    inherits_browser.exports = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    inherits_browser.exports = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
    };
  }
  return inherits_browser.exports;
}
var hasRequiredInherits;
function requireInherits() {
  if (hasRequiredInherits) return inherits.exports;
  hasRequiredInherits = 1;
  try {
    var util2 = require("util");
    if (typeof util2.inherits !== "function") throw "";
    inherits.exports = util2.inherits;
  } catch (e) {
    inherits.exports = requireInherits_browser();
  }
  return inherits.exports;
}
var node;
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node;
  hasRequiredNode = 1;
  node = require$$1$1.deprecate;
  return node;
}
var _stream_writable;
var hasRequired_stream_writable;
function require_stream_writable() {
  if (hasRequired_stream_writable) return _stream_writable;
  hasRequired_stream_writable = 1;
  _stream_writable = Writable;
  function CorkedRequest(state2) {
    var _this = this;
    this.next = null;
    this.entry = null;
    this.finish = function() {
      onCorkedFinish(_this, state2);
    };
  }
  var Duplex;
  Writable.WritableState = WritableState;
  var internalUtil = {
    deprecate: requireNode()
  };
  var Stream = requireStream();
  var Buffer2 = require$$0$3.Buffer;
  var OurUint8Array = (typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {}).Uint8Array || function() {
  };
  function _uint8ArrayToBuffer(chunk) {
    return Buffer2.from(chunk);
  }
  function _isUint8Array(obj) {
    return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
  }
  var destroyImpl = requireDestroy();
  var _require = requireState(), getHighWaterMark = _require.getHighWaterMark;
  var _require$codes = requireErrors().codes, ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK, ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE, ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED, ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES, ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END, ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
  var errorOrDestroy = destroyImpl.errorOrDestroy;
  requireInherits()(Writable, Stream);
  function nop() {
  }
  function WritableState(options, stream2, isDuplex) {
    Duplex = Duplex || require_stream_duplex();
    options = options || {};
    if (typeof isDuplex !== "boolean") isDuplex = stream2 instanceof Duplex;
    this.objectMode = !!options.objectMode;
    if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;
    this.highWaterMark = getHighWaterMark(this, options, "writableHighWaterMark", isDuplex);
    this.finalCalled = false;
    this.needDrain = false;
    this.ending = false;
    this.ended = false;
    this.finished = false;
    this.destroyed = false;
    var noDecode = options.decodeStrings === false;
    this.decodeStrings = !noDecode;
    this.defaultEncoding = options.defaultEncoding || "utf8";
    this.length = 0;
    this.writing = false;
    this.corked = 0;
    this.sync = true;
    this.bufferProcessing = false;
    this.onwrite = function(er) {
      onwrite(stream2, er);
    };
    this.writecb = null;
    this.writelen = 0;
    this.bufferedRequest = null;
    this.lastBufferedRequest = null;
    this.pendingcb = 0;
    this.prefinished = false;
    this.errorEmitted = false;
    this.emitClose = options.emitClose !== false;
    this.autoDestroy = !!options.autoDestroy;
    this.bufferedRequestCount = 0;
    this.corkedRequestsFree = new CorkedRequest(this);
  }
  WritableState.prototype.getBuffer = function getBuffer() {
    var current = this.bufferedRequest;
    var out = [];
    while (current) {
      out.push(current);
      current = current.next;
    }
    return out;
  };
  (function() {
    try {
      Object.defineProperty(WritableState.prototype, "buffer", {
        get: internalUtil.deprecate(function writableStateBufferGetter() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch (_) {
    }
  })();
  var realHasInstance;
  if (typeof Symbol === "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === "function") {
    realHasInstance = Function.prototype[Symbol.hasInstance];
    Object.defineProperty(Writable, Symbol.hasInstance, {
      value: function value(object) {
        if (realHasInstance.call(this, object)) return true;
        if (this !== Writable) return false;
        return object && object._writableState instanceof WritableState;
      }
    });
  } else {
    realHasInstance = function realHasInstance2(object) {
      return object instanceof this;
    };
  }
  function Writable(options) {
    Duplex = Duplex || require_stream_duplex();
    var isDuplex = this instanceof Duplex;
    if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
    this._writableState = new WritableState(options, this, isDuplex);
    this.writable = true;
    if (options) {
      if (typeof options.write === "function") this._write = options.write;
      if (typeof options.writev === "function") this._writev = options.writev;
      if (typeof options.destroy === "function") this._destroy = options.destroy;
      if (typeof options.final === "function") this._final = options.final;
    }
    Stream.call(this);
  }
  Writable.prototype.pipe = function() {
    errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
  };
  function writeAfterEnd(stream2, cb) {
    var er = new ERR_STREAM_WRITE_AFTER_END();
    errorOrDestroy(stream2, er);
    process.nextTick(cb, er);
  }
  function validChunk(stream2, state2, chunk, cb) {
    var er;
    if (chunk === null) {
      er = new ERR_STREAM_NULL_VALUES();
    } else if (typeof chunk !== "string" && !state2.objectMode) {
      er = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer"], chunk);
    }
    if (er) {
      errorOrDestroy(stream2, er);
      process.nextTick(cb, er);
      return false;
    }
    return true;
  }
  Writable.prototype.write = function(chunk, encoding, cb) {
    var state2 = this._writableState;
    var ret = false;
    var isBuf = !state2.objectMode && _isUint8Array(chunk);
    if (isBuf && !Buffer2.isBuffer(chunk)) {
      chunk = _uint8ArrayToBuffer(chunk);
    }
    if (typeof encoding === "function") {
      cb = encoding;
      encoding = null;
    }
    if (isBuf) encoding = "buffer";
    else if (!encoding) encoding = state2.defaultEncoding;
    if (typeof cb !== "function") cb = nop;
    if (state2.ending) writeAfterEnd(this, cb);
    else if (isBuf || validChunk(this, state2, chunk, cb)) {
      state2.pendingcb++;
      ret = writeOrBuffer(this, state2, isBuf, chunk, encoding, cb);
    }
    return ret;
  };
  Writable.prototype.cork = function() {
    this._writableState.corked++;
  };
  Writable.prototype.uncork = function() {
    var state2 = this._writableState;
    if (state2.corked) {
      state2.corked--;
      if (!state2.writing && !state2.corked && !state2.bufferProcessing && state2.bufferedRequest) clearBuffer(this, state2);
    }
  };
  Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    if (typeof encoding === "string") encoding = encoding.toLowerCase();
    if (!(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((encoding + "").toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
    this._writableState.defaultEncoding = encoding;
    return this;
  };
  Object.defineProperty(Writable.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState && this._writableState.getBuffer();
    }
  });
  function decodeChunk(state2, chunk, encoding) {
    if (!state2.objectMode && state2.decodeStrings !== false && typeof chunk === "string") {
      chunk = Buffer2.from(chunk, encoding);
    }
    return chunk;
  }
  Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState.highWaterMark;
    }
  });
  function writeOrBuffer(stream2, state2, isBuf, chunk, encoding, cb) {
    if (!isBuf) {
      var newChunk = decodeChunk(state2, chunk, encoding);
      if (chunk !== newChunk) {
        isBuf = true;
        encoding = "buffer";
        chunk = newChunk;
      }
    }
    var len = state2.objectMode ? 1 : chunk.length;
    state2.length += len;
    var ret = state2.length < state2.highWaterMark;
    if (!ret) state2.needDrain = true;
    if (state2.writing || state2.corked) {
      var last = state2.lastBufferedRequest;
      state2.lastBufferedRequest = {
        chunk,
        encoding,
        isBuf,
        callback: cb,
        next: null
      };
      if (last) {
        last.next = state2.lastBufferedRequest;
      } else {
        state2.bufferedRequest = state2.lastBufferedRequest;
      }
      state2.bufferedRequestCount += 1;
    } else {
      doWrite(stream2, state2, false, len, chunk, encoding, cb);
    }
    return ret;
  }
  function doWrite(stream2, state2, writev, len, chunk, encoding, cb) {
    state2.writelen = len;
    state2.writecb = cb;
    state2.writing = true;
    state2.sync = true;
    if (state2.destroyed) state2.onwrite(new ERR_STREAM_DESTROYED("write"));
    else if (writev) stream2._writev(chunk, state2.onwrite);
    else stream2._write(chunk, encoding, state2.onwrite);
    state2.sync = false;
  }
  function onwriteError(stream2, state2, sync, er, cb) {
    --state2.pendingcb;
    if (sync) {
      process.nextTick(cb, er);
      process.nextTick(finishMaybe, stream2, state2);
      stream2._writableState.errorEmitted = true;
      errorOrDestroy(stream2, er);
    } else {
      cb(er);
      stream2._writableState.errorEmitted = true;
      errorOrDestroy(stream2, er);
      finishMaybe(stream2, state2);
    }
  }
  function onwriteStateUpdate(state2) {
    state2.writing = false;
    state2.writecb = null;
    state2.length -= state2.writelen;
    state2.writelen = 0;
  }
  function onwrite(stream2, er) {
    var state2 = stream2._writableState;
    var sync = state2.sync;
    var cb = state2.writecb;
    if (typeof cb !== "function") throw new ERR_MULTIPLE_CALLBACK();
    onwriteStateUpdate(state2);
    if (er) onwriteError(stream2, state2, sync, er, cb);
    else {
      var finished = needFinish(state2) || stream2.destroyed;
      if (!finished && !state2.corked && !state2.bufferProcessing && state2.bufferedRequest) {
        clearBuffer(stream2, state2);
      }
      if (sync) {
        process.nextTick(afterWrite, stream2, state2, finished, cb);
      } else {
        afterWrite(stream2, state2, finished, cb);
      }
    }
  }
  function afterWrite(stream2, state2, finished, cb) {
    if (!finished) onwriteDrain(stream2, state2);
    state2.pendingcb--;
    cb();
    finishMaybe(stream2, state2);
  }
  function onwriteDrain(stream2, state2) {
    if (state2.length === 0 && state2.needDrain) {
      state2.needDrain = false;
      stream2.emit("drain");
    }
  }
  function clearBuffer(stream2, state2) {
    state2.bufferProcessing = true;
    var entry = state2.bufferedRequest;
    if (stream2._writev && entry && entry.next) {
      var l = state2.bufferedRequestCount;
      var buffer = new Array(l);
      var holder = state2.corkedRequestsFree;
      holder.entry = entry;
      var count = 0;
      var allBuffers = true;
      while (entry) {
        buffer[count] = entry;
        if (!entry.isBuf) allBuffers = false;
        entry = entry.next;
        count += 1;
      }
      buffer.allBuffers = allBuffers;
      doWrite(stream2, state2, true, state2.length, buffer, "", holder.finish);
      state2.pendingcb++;
      state2.lastBufferedRequest = null;
      if (holder.next) {
        state2.corkedRequestsFree = holder.next;
        holder.next = null;
      } else {
        state2.corkedRequestsFree = new CorkedRequest(state2);
      }
      state2.bufferedRequestCount = 0;
    } else {
      while (entry) {
        var chunk = entry.chunk;
        var encoding = entry.encoding;
        var cb = entry.callback;
        var len = state2.objectMode ? 1 : chunk.length;
        doWrite(stream2, state2, false, len, chunk, encoding, cb);
        entry = entry.next;
        state2.bufferedRequestCount--;
        if (state2.writing) {
          break;
        }
      }
      if (entry === null) state2.lastBufferedRequest = null;
    }
    state2.bufferedRequest = entry;
    state2.bufferProcessing = false;
  }
  Writable.prototype._write = function(chunk, encoding, cb) {
    cb(new ERR_METHOD_NOT_IMPLEMENTED("_write()"));
  };
  Writable.prototype._writev = null;
  Writable.prototype.end = function(chunk, encoding, cb) {
    var state2 = this._writableState;
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === "function") {
      cb = encoding;
      encoding = null;
    }
    if (chunk !== null && chunk !== void 0) this.write(chunk, encoding);
    if (state2.corked) {
      state2.corked = 1;
      this.uncork();
    }
    if (!state2.ending) endWritable(this, state2, cb);
    return this;
  };
  Object.defineProperty(Writable.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState.length;
    }
  });
  function needFinish(state2) {
    return state2.ending && state2.length === 0 && state2.bufferedRequest === null && !state2.finished && !state2.writing;
  }
  function callFinal(stream2, state2) {
    stream2._final(function(err) {
      state2.pendingcb--;
      if (err) {
        errorOrDestroy(stream2, err);
      }
      state2.prefinished = true;
      stream2.emit("prefinish");
      finishMaybe(stream2, state2);
    });
  }
  function prefinish(stream2, state2) {
    if (!state2.prefinished && !state2.finalCalled) {
      if (typeof stream2._final === "function" && !state2.destroyed) {
        state2.pendingcb++;
        state2.finalCalled = true;
        process.nextTick(callFinal, stream2, state2);
      } else {
        state2.prefinished = true;
        stream2.emit("prefinish");
      }
    }
  }
  function finishMaybe(stream2, state2) {
    var need = needFinish(state2);
    if (need) {
      prefinish(stream2, state2);
      if (state2.pendingcb === 0) {
        state2.finished = true;
        stream2.emit("finish");
        if (state2.autoDestroy) {
          var rState = stream2._readableState;
          if (!rState || rState.autoDestroy && rState.endEmitted) {
            stream2.destroy();
          }
        }
      }
    }
    return need;
  }
  function endWritable(stream2, state2, cb) {
    state2.ending = true;
    finishMaybe(stream2, state2);
    if (cb) {
      if (state2.finished) process.nextTick(cb);
      else stream2.once("finish", cb);
    }
    state2.ended = true;
    stream2.writable = false;
  }
  function onCorkedFinish(corkReq, state2, err) {
    var entry = corkReq.entry;
    corkReq.entry = null;
    while (entry) {
      var cb = entry.callback;
      state2.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    state2.corkedRequestsFree.next = corkReq;
  }
  Object.defineProperty(Writable.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      if (this._writableState === void 0) {
        return false;
      }
      return this._writableState.destroyed;
    },
    set: function set(value) {
      if (!this._writableState) {
        return;
      }
      this._writableState.destroyed = value;
    }
  });
  Writable.prototype.destroy = destroyImpl.destroy;
  Writable.prototype._undestroy = destroyImpl.undestroy;
  Writable.prototype._destroy = function(err, cb) {
    cb(err);
  };
  return _stream_writable;
}
var _stream_duplex;
var hasRequired_stream_duplex;
function require_stream_duplex() {
  if (hasRequired_stream_duplex) return _stream_duplex;
  hasRequired_stream_duplex = 1;
  var objectKeys = Object.keys || function(obj) {
    var keys2 = [];
    for (var key in obj) keys2.push(key);
    return keys2;
  };
  _stream_duplex = Duplex;
  var Readable = require_stream_readable();
  var Writable = require_stream_writable();
  requireInherits()(Duplex, Readable);
  {
    var keys = objectKeys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
    }
  }
  function Duplex(options) {
    if (!(this instanceof Duplex)) return new Duplex(options);
    Readable.call(this, options);
    Writable.call(this, options);
    this.allowHalfOpen = true;
    if (options) {
      if (options.readable === false) this.readable = false;
      if (options.writable === false) this.writable = false;
      if (options.allowHalfOpen === false) {
        this.allowHalfOpen = false;
        this.once("end", onend);
      }
    }
  }
  Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState.highWaterMark;
    }
  });
  Object.defineProperty(Duplex.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState && this._writableState.getBuffer();
    }
  });
  Object.defineProperty(Duplex.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._writableState.length;
    }
  });
  function onend() {
    if (this._writableState.ended) return;
    process.nextTick(onEndNT, this);
  }
  function onEndNT(self2) {
    self2.end();
  }
  Object.defineProperty(Duplex.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      if (this._readableState === void 0 || this._writableState === void 0) {
        return false;
      }
      return this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function set(value) {
      if (this._readableState === void 0 || this._writableState === void 0) {
        return;
      }
      this._readableState.destroyed = value;
      this._writableState.destroyed = value;
    }
  });
  return _stream_duplex;
}
var string_decoder = {};
var safeBuffer = { exports: {} };
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
var hasRequiredSafeBuffer;
function requireSafeBuffer() {
  if (hasRequiredSafeBuffer) return safeBuffer.exports;
  hasRequiredSafeBuffer = 1;
  (function(module, exports) {
    var buffer = require$$0$3;
    var Buffer2 = buffer.Buffer;
    function copyProps(src2, dst) {
      for (var key in src2) {
        dst[key] = src2[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  })(safeBuffer, safeBuffer.exports);
  return safeBuffer.exports;
}
var hasRequiredString_decoder;
function requireString_decoder() {
  if (hasRequiredString_decoder) return string_decoder;
  hasRequiredString_decoder = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var isEncoding = Buffer2.isEncoding || function(encoding) {
    encoding = "" + encoding;
    switch (encoding && encoding.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return true;
      default:
        return false;
    }
  };
  function _normalizeEncoding(enc) {
    if (!enc) return "utf8";
    var retried;
    while (true) {
      switch (enc) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return enc;
        default:
          if (retried) return;
          enc = ("" + enc).toLowerCase();
          retried = true;
      }
    }
  }
  function normalizeEncoding(enc) {
    var nenc = _normalizeEncoding(enc);
    if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc))) throw new Error("Unknown encoding: " + enc);
    return nenc || enc;
  }
  string_decoder.StringDecoder = StringDecoder;
  function StringDecoder(encoding) {
    this.encoding = normalizeEncoding(encoding);
    var nb;
    switch (this.encoding) {
      case "utf16le":
        this.text = utf16Text;
        this.end = utf16End;
        nb = 4;
        break;
      case "utf8":
        this.fillLast = utf8FillLast;
        nb = 4;
        break;
      case "base64":
        this.text = base64Text;
        this.end = base64End;
        nb = 3;
        break;
      default:
        this.write = simpleWrite;
        this.end = simpleEnd;
        return;
    }
    this.lastNeed = 0;
    this.lastTotal = 0;
    this.lastChar = Buffer2.allocUnsafe(nb);
  }
  StringDecoder.prototype.write = function(buf) {
    if (buf.length === 0) return "";
    var r;
    var i;
    if (this.lastNeed) {
      r = this.fillLast(buf);
      if (r === void 0) return "";
      i = this.lastNeed;
      this.lastNeed = 0;
    } else {
      i = 0;
    }
    if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
    return r || "";
  };
  StringDecoder.prototype.end = utf8End;
  StringDecoder.prototype.text = utf8Text;
  StringDecoder.prototype.fillLast = function(buf) {
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
    this.lastNeed -= buf.length;
  };
  function utf8CheckByte(byte) {
    if (byte <= 127) return 0;
    else if (byte >> 5 === 6) return 2;
    else if (byte >> 4 === 14) return 3;
    else if (byte >> 3 === 30) return 4;
    return byte >> 6 === 2 ? -1 : -2;
  }
  function utf8CheckIncomplete(self2, buf, i) {
    var j = buf.length - 1;
    if (j < i) return 0;
    var nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) self2.lastNeed = nb - 1;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) self2.lastNeed = nb - 2;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) {
        if (nb === 2) nb = 0;
        else self2.lastNeed = nb - 3;
      }
      return nb;
    }
    return 0;
  }
  function utf8CheckExtraBytes(self2, buf, p) {
    if ((buf[0] & 192) !== 128) {
      self2.lastNeed = 0;
      return "�";
    }
    if (self2.lastNeed > 1 && buf.length > 1) {
      if ((buf[1] & 192) !== 128) {
        self2.lastNeed = 1;
        return "�";
      }
      if (self2.lastNeed > 2 && buf.length > 2) {
        if ((buf[2] & 192) !== 128) {
          self2.lastNeed = 2;
          return "�";
        }
      }
    }
  }
  function utf8FillLast(buf) {
    var p = this.lastTotal - this.lastNeed;
    var r = utf8CheckExtraBytes(this, buf);
    if (r !== void 0) return r;
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, p, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, p, 0, buf.length);
    this.lastNeed -= buf.length;
  }
  function utf8Text(buf, i) {
    var total = utf8CheckIncomplete(this, buf, i);
    if (!this.lastNeed) return buf.toString("utf8", i);
    this.lastTotal = total;
    var end = buf.length - (total - this.lastNeed);
    buf.copy(this.lastChar, 0, end);
    return buf.toString("utf8", i, end);
  }
  function utf8End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + "�";
    return r;
  }
  function utf16Text(buf, i) {
    if ((buf.length - i) % 2 === 0) {
      var r = buf.toString("utf16le", i);
      if (r) {
        var c = r.charCodeAt(r.length - 1);
        if (c >= 55296 && c <= 56319) {
          this.lastNeed = 2;
          this.lastTotal = 4;
          this.lastChar[0] = buf[buf.length - 2];
          this.lastChar[1] = buf[buf.length - 1];
          return r.slice(0, -1);
        }
      }
      return r;
    }
    this.lastNeed = 1;
    this.lastTotal = 2;
    this.lastChar[0] = buf[buf.length - 1];
    return buf.toString("utf16le", i, buf.length - 1);
  }
  function utf16End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) {
      var end = this.lastTotal - this.lastNeed;
      return r + this.lastChar.toString("utf16le", 0, end);
    }
    return r;
  }
  function base64Text(buf, i) {
    var n = (buf.length - i) % 3;
    if (n === 0) return buf.toString("base64", i);
    this.lastNeed = 3 - n;
    this.lastTotal = 3;
    if (n === 1) {
      this.lastChar[0] = buf[buf.length - 1];
    } else {
      this.lastChar[0] = buf[buf.length - 2];
      this.lastChar[1] = buf[buf.length - 1];
    }
    return buf.toString("base64", i, buf.length - n);
  }
  function base64End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
    return r;
  }
  function simpleWrite(buf) {
    return buf.toString(this.encoding);
  }
  function simpleEnd(buf) {
    return buf && buf.length ? this.write(buf) : "";
  }
  return string_decoder;
}
var endOfStream;
var hasRequiredEndOfStream;
function requireEndOfStream() {
  if (hasRequiredEndOfStream) return endOfStream;
  hasRequiredEndOfStream = 1;
  var ERR_STREAM_PREMATURE_CLOSE = requireErrors().codes.ERR_STREAM_PREMATURE_CLOSE;
  function once(callback) {
    var called = false;
    return function() {
      if (called) return;
      called = true;
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      callback.apply(this, args);
    };
  }
  function noop() {
  }
  function isRequest(stream2) {
    return stream2.setHeader && typeof stream2.abort === "function";
  }
  function eos(stream2, opts, callback) {
    if (typeof opts === "function") return eos(stream2, null, opts);
    if (!opts) opts = {};
    callback = once(callback || noop);
    var readable2 = opts.readable || opts.readable !== false && stream2.readable;
    var writable = opts.writable || opts.writable !== false && stream2.writable;
    var onlegacyfinish = function onlegacyfinish2() {
      if (!stream2.writable) onfinish();
    };
    var writableEnded = stream2._writableState && stream2._writableState.finished;
    var onfinish = function onfinish2() {
      writable = false;
      writableEnded = true;
      if (!readable2) callback.call(stream2);
    };
    var readableEnded = stream2._readableState && stream2._readableState.endEmitted;
    var onend = function onend2() {
      readable2 = false;
      readableEnded = true;
      if (!writable) callback.call(stream2);
    };
    var onerror = function onerror2(err) {
      callback.call(stream2, err);
    };
    var onclose = function onclose2() {
      var err;
      if (readable2 && !readableEnded) {
        if (!stream2._readableState || !stream2._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
        return callback.call(stream2, err);
      }
      if (writable && !writableEnded) {
        if (!stream2._writableState || !stream2._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
        return callback.call(stream2, err);
      }
    };
    var onrequest = function onrequest2() {
      stream2.req.on("finish", onfinish);
    };
    if (isRequest(stream2)) {
      stream2.on("complete", onfinish);
      stream2.on("abort", onclose);
      if (stream2.req) onrequest();
      else stream2.on("request", onrequest);
    } else if (writable && !stream2._writableState) {
      stream2.on("end", onlegacyfinish);
      stream2.on("close", onlegacyfinish);
    }
    stream2.on("end", onend);
    stream2.on("finish", onfinish);
    if (opts.error !== false) stream2.on("error", onerror);
    stream2.on("close", onclose);
    return function() {
      stream2.removeListener("complete", onfinish);
      stream2.removeListener("abort", onclose);
      stream2.removeListener("request", onrequest);
      if (stream2.req) stream2.req.removeListener("finish", onfinish);
      stream2.removeListener("end", onlegacyfinish);
      stream2.removeListener("close", onlegacyfinish);
      stream2.removeListener("finish", onfinish);
      stream2.removeListener("end", onend);
      stream2.removeListener("error", onerror);
      stream2.removeListener("close", onclose);
    };
  }
  endOfStream = eos;
  return endOfStream;
}
var async_iterator;
var hasRequiredAsync_iterator;
function requireAsync_iterator() {
  if (hasRequiredAsync_iterator) return async_iterator;
  hasRequiredAsync_iterator = 1;
  var _Object$setPrototypeO;
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== void 0) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  var finished = requireEndOfStream();
  var kLastResolve = Symbol("lastResolve");
  var kLastReject = Symbol("lastReject");
  var kError = Symbol("error");
  var kEnded = Symbol("ended");
  var kLastPromise = Symbol("lastPromise");
  var kHandlePromise = Symbol("handlePromise");
  var kStream = Symbol("stream");
  function createIterResult(value, done) {
    return {
      value,
      done
    };
  }
  function readAndResolve(iter) {
    var resolve2 = iter[kLastResolve];
    if (resolve2 !== null) {
      var data = iter[kStream].read();
      if (data !== null) {
        iter[kLastPromise] = null;
        iter[kLastResolve] = null;
        iter[kLastReject] = null;
        resolve2(createIterResult(data, false));
      }
    }
  }
  function onReadable(iter) {
    process.nextTick(readAndResolve, iter);
  }
  function wrapForNext(lastPromise, iter) {
    return function(resolve2, reject2) {
      lastPromise.then(function() {
        if (iter[kEnded]) {
          resolve2(createIterResult(void 0, true));
          return;
        }
        iter[kHandlePromise](resolve2, reject2);
      }, reject2);
    };
  }
  var AsyncIteratorPrototype = Object.getPrototypeOf(function() {
  });
  var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
    get stream() {
      return this[kStream];
    },
    next: function next() {
      var _this = this;
      var error = this[kError];
      if (error !== null) {
        return Promise.reject(error);
      }
      if (this[kEnded]) {
        return Promise.resolve(createIterResult(void 0, true));
      }
      if (this[kStream].destroyed) {
        return new Promise(function(resolve2, reject2) {
          process.nextTick(function() {
            if (_this[kError]) {
              reject2(_this[kError]);
            } else {
              resolve2(createIterResult(void 0, true));
            }
          });
        });
      }
      var lastPromise = this[kLastPromise];
      var promise;
      if (lastPromise) {
        promise = new Promise(wrapForNext(lastPromise, this));
      } else {
        var data = this[kStream].read();
        if (data !== null) {
          return Promise.resolve(createIterResult(data, false));
        }
        promise = new Promise(this[kHandlePromise]);
      }
      this[kLastPromise] = promise;
      return promise;
    }
  }, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function() {
    return this;
  }), _defineProperty(_Object$setPrototypeO, "return", function _return() {
    var _this2 = this;
    return new Promise(function(resolve2, reject2) {
      _this2[kStream].destroy(null, function(err) {
        if (err) {
          reject2(err);
          return;
        }
        resolve2(createIterResult(void 0, true));
      });
    });
  }), _Object$setPrototypeO), AsyncIteratorPrototype);
  var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator2(stream2) {
    var _Object$create;
    var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
      value: stream2,
      writable: true
    }), _defineProperty(_Object$create, kLastResolve, {
      value: null,
      writable: true
    }), _defineProperty(_Object$create, kLastReject, {
      value: null,
      writable: true
    }), _defineProperty(_Object$create, kError, {
      value: null,
      writable: true
    }), _defineProperty(_Object$create, kEnded, {
      value: stream2._readableState.endEmitted,
      writable: true
    }), _defineProperty(_Object$create, kHandlePromise, {
      value: function value(resolve2, reject2) {
        var data = iterator[kStream].read();
        if (data) {
          iterator[kLastPromise] = null;
          iterator[kLastResolve] = null;
          iterator[kLastReject] = null;
          resolve2(createIterResult(data, false));
        } else {
          iterator[kLastResolve] = resolve2;
          iterator[kLastReject] = reject2;
        }
      },
      writable: true
    }), _Object$create));
    iterator[kLastPromise] = null;
    finished(stream2, function(err) {
      if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
        var reject2 = iterator[kLastReject];
        if (reject2 !== null) {
          iterator[kLastPromise] = null;
          iterator[kLastResolve] = null;
          iterator[kLastReject] = null;
          reject2(err);
        }
        iterator[kError] = err;
        return;
      }
      var resolve2 = iterator[kLastResolve];
      if (resolve2 !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve2(createIterResult(void 0, true));
      }
      iterator[kEnded] = true;
    });
    stream2.on("readable", onReadable.bind(null, iterator));
    return iterator;
  };
  async_iterator = createReadableStreamAsyncIterator;
  return async_iterator;
}
var from_1;
var hasRequiredFrom;
function requireFrom() {
  if (hasRequiredFrom) return from_1;
  hasRequiredFrom = 1;
  function asyncGeneratorStep(gen, resolve2, reject2, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject2(error);
      return;
    }
    if (info.done) {
      resolve2(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }
  function _asyncToGenerator(fn) {
    return function() {
      var self2 = this, args = arguments;
      return new Promise(function(resolve2, reject2) {
        var gen = fn.apply(self2, args);
        function _next(value) {
          asyncGeneratorStep(gen, resolve2, reject2, _next, _throw, "next", value);
        }
        function _throw(err) {
          asyncGeneratorStep(gen, resolve2, reject2, _next, _throw, "throw", err);
        }
        _next(void 0);
      });
    };
  }
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      enumerableOnly && (symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })), keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      i % 2 ? ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
    return target;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== void 0) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  var ERR_INVALID_ARG_TYPE = requireErrors().codes.ERR_INVALID_ARG_TYPE;
  function from(Readable, iterable, opts) {
    var iterator;
    if (iterable && typeof iterable.next === "function") {
      iterator = iterable;
    } else if (iterable && iterable[Symbol.asyncIterator]) iterator = iterable[Symbol.asyncIterator]();
    else if (iterable && iterable[Symbol.iterator]) iterator = iterable[Symbol.iterator]();
    else throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
    var readable2 = new Readable(_objectSpread({
      objectMode: true
    }, opts));
    var reading = false;
    readable2._read = function() {
      if (!reading) {
        reading = true;
        next();
      }
    };
    function next() {
      return _next2.apply(this, arguments);
    }
    function _next2() {
      _next2 = _asyncToGenerator(function* () {
        try {
          var _yield$iterator$next = yield iterator.next(), value = _yield$iterator$next.value, done = _yield$iterator$next.done;
          if (done) {
            readable2.push(null);
          } else if (readable2.push(yield value)) {
            next();
          } else {
            reading = false;
          }
        } catch (err) {
          readable2.destroy(err);
        }
      });
      return _next2.apply(this, arguments);
    }
    return readable2;
  }
  from_1 = from;
  return from_1;
}
var _stream_readable;
var hasRequired_stream_readable;
function require_stream_readable() {
  if (hasRequired_stream_readable) return _stream_readable;
  hasRequired_stream_readable = 1;
  _stream_readable = Readable;
  var Duplex;
  Readable.ReadableState = ReadableState;
  require$$0.EventEmitter;
  var EElistenerCount = function EElistenerCount2(emitter, type2) {
    return emitter.listeners(type2).length;
  };
  var Stream = requireStream();
  var Buffer2 = require$$0$3.Buffer;
  var OurUint8Array = (typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {}).Uint8Array || function() {
  };
  function _uint8ArrayToBuffer(chunk) {
    return Buffer2.from(chunk);
  }
  function _isUint8Array(obj) {
    return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
  }
  var debugUtil = require$$1$1;
  var debug2;
  if (debugUtil && debugUtil.debuglog) {
    debug2 = debugUtil.debuglog("stream");
  } else {
    debug2 = function debug3() {
    };
  }
  var BufferList = requireBuffer_list();
  var destroyImpl = requireDestroy();
  var _require = requireState(), getHighWaterMark = _require.getHighWaterMark;
  var _require$codes = requireErrors().codes, ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE, ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;
  var StringDecoder;
  var createReadableStreamAsyncIterator;
  var from;
  requireInherits()(Readable, Stream);
  var errorOrDestroy = destroyImpl.errorOrDestroy;
  var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
  function prependListener(emitter, event, fn) {
    if (typeof emitter.prependListener === "function") return emitter.prependListener(event, fn);
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);
    else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);
    else emitter._events[event] = [fn, emitter._events[event]];
  }
  function ReadableState(options, stream2, isDuplex) {
    Duplex = Duplex || require_stream_duplex();
    options = options || {};
    if (typeof isDuplex !== "boolean") isDuplex = stream2 instanceof Duplex;
    this.objectMode = !!options.objectMode;
    if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;
    this.highWaterMark = getHighWaterMark(this, options, "readableHighWaterMark", isDuplex);
    this.buffer = new BufferList();
    this.length = 0;
    this.pipes = null;
    this.pipesCount = 0;
    this.flowing = null;
    this.ended = false;
    this.endEmitted = false;
    this.reading = false;
    this.sync = true;
    this.needReadable = false;
    this.emittedReadable = false;
    this.readableListening = false;
    this.resumeScheduled = false;
    this.paused = true;
    this.emitClose = options.emitClose !== false;
    this.autoDestroy = !!options.autoDestroy;
    this.destroyed = false;
    this.defaultEncoding = options.defaultEncoding || "utf8";
    this.awaitDrain = 0;
    this.readingMore = false;
    this.decoder = null;
    this.encoding = null;
    if (options.encoding) {
      if (!StringDecoder) StringDecoder = requireString_decoder().StringDecoder;
      this.decoder = new StringDecoder(options.encoding);
      this.encoding = options.encoding;
    }
  }
  function Readable(options) {
    Duplex = Duplex || require_stream_duplex();
    if (!(this instanceof Readable)) return new Readable(options);
    var isDuplex = this instanceof Duplex;
    this._readableState = new ReadableState(options, this, isDuplex);
    this.readable = true;
    if (options) {
      if (typeof options.read === "function") this._read = options.read;
      if (typeof options.destroy === "function") this._destroy = options.destroy;
    }
    Stream.call(this);
  }
  Object.defineProperty(Readable.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      if (this._readableState === void 0) {
        return false;
      }
      return this._readableState.destroyed;
    },
    set: function set(value) {
      if (!this._readableState) {
        return;
      }
      this._readableState.destroyed = value;
    }
  });
  Readable.prototype.destroy = destroyImpl.destroy;
  Readable.prototype._undestroy = destroyImpl.undestroy;
  Readable.prototype._destroy = function(err, cb) {
    cb(err);
  };
  Readable.prototype.push = function(chunk, encoding) {
    var state2 = this._readableState;
    var skipChunkCheck;
    if (!state2.objectMode) {
      if (typeof chunk === "string") {
        encoding = encoding || state2.defaultEncoding;
        if (encoding !== state2.encoding) {
          chunk = Buffer2.from(chunk, encoding);
          encoding = "";
        }
        skipChunkCheck = true;
      }
    } else {
      skipChunkCheck = true;
    }
    return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
  };
  Readable.prototype.unshift = function(chunk) {
    return readableAddChunk(this, chunk, null, true, false);
  };
  function readableAddChunk(stream2, chunk, encoding, addToFront, skipChunkCheck) {
    debug2("readableAddChunk", chunk);
    var state2 = stream2._readableState;
    if (chunk === null) {
      state2.reading = false;
      onEofChunk(stream2, state2);
    } else {
      var er;
      if (!skipChunkCheck) er = chunkInvalid(state2, chunk);
      if (er) {
        errorOrDestroy(stream2, er);
      } else if (state2.objectMode || chunk && chunk.length > 0) {
        if (typeof chunk !== "string" && !state2.objectMode && Object.getPrototypeOf(chunk) !== Buffer2.prototype) {
          chunk = _uint8ArrayToBuffer(chunk);
        }
        if (addToFront) {
          if (state2.endEmitted) errorOrDestroy(stream2, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
          else addChunk(stream2, state2, chunk, true);
        } else if (state2.ended) {
          errorOrDestroy(stream2, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state2.destroyed) {
          return false;
        } else {
          state2.reading = false;
          if (state2.decoder && !encoding) {
            chunk = state2.decoder.write(chunk);
            if (state2.objectMode || chunk.length !== 0) addChunk(stream2, state2, chunk, false);
            else maybeReadMore(stream2, state2);
          } else {
            addChunk(stream2, state2, chunk, false);
          }
        }
      } else if (!addToFront) {
        state2.reading = false;
        maybeReadMore(stream2, state2);
      }
    }
    return !state2.ended && (state2.length < state2.highWaterMark || state2.length === 0);
  }
  function addChunk(stream2, state2, chunk, addToFront) {
    if (state2.flowing && state2.length === 0 && !state2.sync) {
      state2.awaitDrain = 0;
      stream2.emit("data", chunk);
    } else {
      state2.length += state2.objectMode ? 1 : chunk.length;
      if (addToFront) state2.buffer.unshift(chunk);
      else state2.buffer.push(chunk);
      if (state2.needReadable) emitReadable(stream2);
    }
    maybeReadMore(stream2, state2);
  }
  function chunkInvalid(state2, chunk) {
    var er;
    if (!_isUint8Array(chunk) && typeof chunk !== "string" && chunk !== void 0 && !state2.objectMode) {
      er = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
    }
    return er;
  }
  Readable.prototype.isPaused = function() {
    return this._readableState.flowing === false;
  };
  Readable.prototype.setEncoding = function(enc) {
    if (!StringDecoder) StringDecoder = requireString_decoder().StringDecoder;
    var decoder = new StringDecoder(enc);
    this._readableState.decoder = decoder;
    this._readableState.encoding = this._readableState.decoder.encoding;
    var p = this._readableState.buffer.head;
    var content = "";
    while (p !== null) {
      content += decoder.write(p.data);
      p = p.next;
    }
    this._readableState.buffer.clear();
    if (content !== "") this._readableState.buffer.push(content);
    this._readableState.length = content.length;
    return this;
  };
  var MAX_HWM = 1073741824;
  function computeNewHighWaterMark(n) {
    if (n >= MAX_HWM) {
      n = MAX_HWM;
    } else {
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }
    return n;
  }
  function howMuchToRead(n, state2) {
    if (n <= 0 || state2.length === 0 && state2.ended) return 0;
    if (state2.objectMode) return 1;
    if (n !== n) {
      if (state2.flowing && state2.length) return state2.buffer.head.data.length;
      else return state2.length;
    }
    if (n > state2.highWaterMark) state2.highWaterMark = computeNewHighWaterMark(n);
    if (n <= state2.length) return n;
    if (!state2.ended) {
      state2.needReadable = true;
      return 0;
    }
    return state2.length;
  }
  Readable.prototype.read = function(n) {
    debug2("read", n);
    n = parseInt(n, 10);
    var state2 = this._readableState;
    var nOrig = n;
    if (n !== 0) state2.emittedReadable = false;
    if (n === 0 && state2.needReadable && ((state2.highWaterMark !== 0 ? state2.length >= state2.highWaterMark : state2.length > 0) || state2.ended)) {
      debug2("read: emitReadable", state2.length, state2.ended);
      if (state2.length === 0 && state2.ended) endReadable(this);
      else emitReadable(this);
      return null;
    }
    n = howMuchToRead(n, state2);
    if (n === 0 && state2.ended) {
      if (state2.length === 0) endReadable(this);
      return null;
    }
    var doRead = state2.needReadable;
    debug2("need readable", doRead);
    if (state2.length === 0 || state2.length - n < state2.highWaterMark) {
      doRead = true;
      debug2("length less than watermark", doRead);
    }
    if (state2.ended || state2.reading) {
      doRead = false;
      debug2("reading or ended", doRead);
    } else if (doRead) {
      debug2("do read");
      state2.reading = true;
      state2.sync = true;
      if (state2.length === 0) state2.needReadable = true;
      this._read(state2.highWaterMark);
      state2.sync = false;
      if (!state2.reading) n = howMuchToRead(nOrig, state2);
    }
    var ret;
    if (n > 0) ret = fromList(n, state2);
    else ret = null;
    if (ret === null) {
      state2.needReadable = state2.length <= state2.highWaterMark;
      n = 0;
    } else {
      state2.length -= n;
      state2.awaitDrain = 0;
    }
    if (state2.length === 0) {
      if (!state2.ended) state2.needReadable = true;
      if (nOrig !== n && state2.ended) endReadable(this);
    }
    if (ret !== null) this.emit("data", ret);
    return ret;
  };
  function onEofChunk(stream2, state2) {
    debug2("onEofChunk");
    if (state2.ended) return;
    if (state2.decoder) {
      var chunk = state2.decoder.end();
      if (chunk && chunk.length) {
        state2.buffer.push(chunk);
        state2.length += state2.objectMode ? 1 : chunk.length;
      }
    }
    state2.ended = true;
    if (state2.sync) {
      emitReadable(stream2);
    } else {
      state2.needReadable = false;
      if (!state2.emittedReadable) {
        state2.emittedReadable = true;
        emitReadable_(stream2);
      }
    }
  }
  function emitReadable(stream2) {
    var state2 = stream2._readableState;
    debug2("emitReadable", state2.needReadable, state2.emittedReadable);
    state2.needReadable = false;
    if (!state2.emittedReadable) {
      debug2("emitReadable", state2.flowing);
      state2.emittedReadable = true;
      process.nextTick(emitReadable_, stream2);
    }
  }
  function emitReadable_(stream2) {
    var state2 = stream2._readableState;
    debug2("emitReadable_", state2.destroyed, state2.length, state2.ended);
    if (!state2.destroyed && (state2.length || state2.ended)) {
      stream2.emit("readable");
      state2.emittedReadable = false;
    }
    state2.needReadable = !state2.flowing && !state2.ended && state2.length <= state2.highWaterMark;
    flow(stream2);
  }
  function maybeReadMore(stream2, state2) {
    if (!state2.readingMore) {
      state2.readingMore = true;
      process.nextTick(maybeReadMore_, stream2, state2);
    }
  }
  function maybeReadMore_(stream2, state2) {
    while (!state2.reading && !state2.ended && (state2.length < state2.highWaterMark || state2.flowing && state2.length === 0)) {
      var len = state2.length;
      debug2("maybeReadMore read 0");
      stream2.read(0);
      if (len === state2.length)
        break;
    }
    state2.readingMore = false;
  }
  Readable.prototype._read = function(n) {
    errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED("_read()"));
  };
  Readable.prototype.pipe = function(dest, pipeOpts) {
    var src2 = this;
    var state2 = this._readableState;
    switch (state2.pipesCount) {
      case 0:
        state2.pipes = dest;
        break;
      case 1:
        state2.pipes = [state2.pipes, dest];
        break;
      default:
        state2.pipes.push(dest);
        break;
    }
    state2.pipesCount += 1;
    debug2("pipe count=%d opts=%j", state2.pipesCount, pipeOpts);
    var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
    var endFn = doEnd ? onend : unpipe;
    if (state2.endEmitted) process.nextTick(endFn);
    else src2.once("end", endFn);
    dest.on("unpipe", onunpipe);
    function onunpipe(readable2, unpipeInfo) {
      debug2("onunpipe");
      if (readable2 === src2) {
        if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
          unpipeInfo.hasUnpiped = true;
          cleanup();
        }
      }
    }
    function onend() {
      debug2("onend");
      dest.end();
    }
    var ondrain = pipeOnDrain(src2);
    dest.on("drain", ondrain);
    var cleanedUp = false;
    function cleanup() {
      debug2("cleanup");
      dest.removeListener("close", onclose);
      dest.removeListener("finish", onfinish);
      dest.removeListener("drain", ondrain);
      dest.removeListener("error", onerror);
      dest.removeListener("unpipe", onunpipe);
      src2.removeListener("end", onend);
      src2.removeListener("end", unpipe);
      src2.removeListener("data", ondata);
      cleanedUp = true;
      if (state2.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
    }
    src2.on("data", ondata);
    function ondata(chunk) {
      debug2("ondata");
      var ret = dest.write(chunk);
      debug2("dest.write", ret);
      if (ret === false) {
        if ((state2.pipesCount === 1 && state2.pipes === dest || state2.pipesCount > 1 && indexOf(state2.pipes, dest) !== -1) && !cleanedUp) {
          debug2("false write response, pause", state2.awaitDrain);
          state2.awaitDrain++;
        }
        src2.pause();
      }
    }
    function onerror(er) {
      debug2("onerror", er);
      unpipe();
      dest.removeListener("error", onerror);
      if (EElistenerCount(dest, "error") === 0) errorOrDestroy(dest, er);
    }
    prependListener(dest, "error", onerror);
    function onclose() {
      dest.removeListener("finish", onfinish);
      unpipe();
    }
    dest.once("close", onclose);
    function onfinish() {
      debug2("onfinish");
      dest.removeListener("close", onclose);
      unpipe();
    }
    dest.once("finish", onfinish);
    function unpipe() {
      debug2("unpipe");
      src2.unpipe(dest);
    }
    dest.emit("pipe", src2);
    if (!state2.flowing) {
      debug2("pipe resume");
      src2.resume();
    }
    return dest;
  };
  function pipeOnDrain(src2) {
    return function pipeOnDrainFunctionResult() {
      var state2 = src2._readableState;
      debug2("pipeOnDrain", state2.awaitDrain);
      if (state2.awaitDrain) state2.awaitDrain--;
      if (state2.awaitDrain === 0 && EElistenerCount(src2, "data")) {
        state2.flowing = true;
        flow(src2);
      }
    };
  }
  Readable.prototype.unpipe = function(dest) {
    var state2 = this._readableState;
    var unpipeInfo = {
      hasUnpiped: false
    };
    if (state2.pipesCount === 0) return this;
    if (state2.pipesCount === 1) {
      if (dest && dest !== state2.pipes) return this;
      if (!dest) dest = state2.pipes;
      state2.pipes = null;
      state2.pipesCount = 0;
      state2.flowing = false;
      if (dest) dest.emit("unpipe", this, unpipeInfo);
      return this;
    }
    if (!dest) {
      var dests = state2.pipes;
      var len = state2.pipesCount;
      state2.pipes = null;
      state2.pipesCount = 0;
      state2.flowing = false;
      for (var i = 0; i < len; i++) dests[i].emit("unpipe", this, {
        hasUnpiped: false
      });
      return this;
    }
    var index = indexOf(state2.pipes, dest);
    if (index === -1) return this;
    state2.pipes.splice(index, 1);
    state2.pipesCount -= 1;
    if (state2.pipesCount === 1) state2.pipes = state2.pipes[0];
    dest.emit("unpipe", this, unpipeInfo);
    return this;
  };
  Readable.prototype.on = function(ev, fn) {
    var res = Stream.prototype.on.call(this, ev, fn);
    var state2 = this._readableState;
    if (ev === "data") {
      state2.readableListening = this.listenerCount("readable") > 0;
      if (state2.flowing !== false) this.resume();
    } else if (ev === "readable") {
      if (!state2.endEmitted && !state2.readableListening) {
        state2.readableListening = state2.needReadable = true;
        state2.flowing = false;
        state2.emittedReadable = false;
        debug2("on readable", state2.length, state2.reading);
        if (state2.length) {
          emitReadable(this);
        } else if (!state2.reading) {
          process.nextTick(nReadingNextTick, this);
        }
      }
    }
    return res;
  };
  Readable.prototype.addListener = Readable.prototype.on;
  Readable.prototype.removeListener = function(ev, fn) {
    var res = Stream.prototype.removeListener.call(this, ev, fn);
    if (ev === "readable") {
      process.nextTick(updateReadableListening, this);
    }
    return res;
  };
  Readable.prototype.removeAllListeners = function(ev) {
    var res = Stream.prototype.removeAllListeners.apply(this, arguments);
    if (ev === "readable" || ev === void 0) {
      process.nextTick(updateReadableListening, this);
    }
    return res;
  };
  function updateReadableListening(self2) {
    var state2 = self2._readableState;
    state2.readableListening = self2.listenerCount("readable") > 0;
    if (state2.resumeScheduled && !state2.paused) {
      state2.flowing = true;
    } else if (self2.listenerCount("data") > 0) {
      self2.resume();
    }
  }
  function nReadingNextTick(self2) {
    debug2("readable nexttick read 0");
    self2.read(0);
  }
  Readable.prototype.resume = function() {
    var state2 = this._readableState;
    if (!state2.flowing) {
      debug2("resume");
      state2.flowing = !state2.readableListening;
      resume(this, state2);
    }
    state2.paused = false;
    return this;
  };
  function resume(stream2, state2) {
    if (!state2.resumeScheduled) {
      state2.resumeScheduled = true;
      process.nextTick(resume_, stream2, state2);
    }
  }
  function resume_(stream2, state2) {
    debug2("resume", state2.reading);
    if (!state2.reading) {
      stream2.read(0);
    }
    state2.resumeScheduled = false;
    stream2.emit("resume");
    flow(stream2);
    if (state2.flowing && !state2.reading) stream2.read(0);
  }
  Readable.prototype.pause = function() {
    debug2("call pause flowing=%j", this._readableState.flowing);
    if (this._readableState.flowing !== false) {
      debug2("pause");
      this._readableState.flowing = false;
      this.emit("pause");
    }
    this._readableState.paused = true;
    return this;
  };
  function flow(stream2) {
    var state2 = stream2._readableState;
    debug2("flow", state2.flowing);
    while (state2.flowing && stream2.read() !== null) ;
  }
  Readable.prototype.wrap = function(stream2) {
    var _this = this;
    var state2 = this._readableState;
    var paused = false;
    stream2.on("end", function() {
      debug2("wrapped end");
      if (state2.decoder && !state2.ended) {
        var chunk = state2.decoder.end();
        if (chunk && chunk.length) _this.push(chunk);
      }
      _this.push(null);
    });
    stream2.on("data", function(chunk) {
      debug2("wrapped data");
      if (state2.decoder) chunk = state2.decoder.write(chunk);
      if (state2.objectMode && (chunk === null || chunk === void 0)) return;
      else if (!state2.objectMode && (!chunk || !chunk.length)) return;
      var ret = _this.push(chunk);
      if (!ret) {
        paused = true;
        stream2.pause();
      }
    });
    for (var i in stream2) {
      if (this[i] === void 0 && typeof stream2[i] === "function") {
        this[i] = /* @__PURE__ */ function methodWrap(method) {
          return function methodWrapReturnFunction() {
            return stream2[method].apply(stream2, arguments);
          };
        }(i);
      }
    }
    for (var n = 0; n < kProxyEvents.length; n++) {
      stream2.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
    }
    this._read = function(n2) {
      debug2("wrapped _read", n2);
      if (paused) {
        paused = false;
        stream2.resume();
      }
    };
    return this;
  };
  if (typeof Symbol === "function") {
    Readable.prototype[Symbol.asyncIterator] = function() {
      if (createReadableStreamAsyncIterator === void 0) {
        createReadableStreamAsyncIterator = requireAsync_iterator();
      }
      return createReadableStreamAsyncIterator(this);
    };
  }
  Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._readableState.highWaterMark;
    }
  });
  Object.defineProperty(Readable.prototype, "readableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._readableState && this._readableState.buffer;
    }
  });
  Object.defineProperty(Readable.prototype, "readableFlowing", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._readableState.flowing;
    },
    set: function set(state2) {
      if (this._readableState) {
        this._readableState.flowing = state2;
      }
    }
  });
  Readable._fromList = fromList;
  Object.defineProperty(Readable.prototype, "readableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function get() {
      return this._readableState.length;
    }
  });
  function fromList(n, state2) {
    if (state2.length === 0) return null;
    var ret;
    if (state2.objectMode) ret = state2.buffer.shift();
    else if (!n || n >= state2.length) {
      if (state2.decoder) ret = state2.buffer.join("");
      else if (state2.buffer.length === 1) ret = state2.buffer.first();
      else ret = state2.buffer.concat(state2.length);
      state2.buffer.clear();
    } else {
      ret = state2.buffer.consume(n, state2.decoder);
    }
    return ret;
  }
  function endReadable(stream2) {
    var state2 = stream2._readableState;
    debug2("endReadable", state2.endEmitted);
    if (!state2.endEmitted) {
      state2.ended = true;
      process.nextTick(endReadableNT, state2, stream2);
    }
  }
  function endReadableNT(state2, stream2) {
    debug2("endReadableNT", state2.endEmitted, state2.length);
    if (!state2.endEmitted && state2.length === 0) {
      state2.endEmitted = true;
      stream2.readable = false;
      stream2.emit("end");
      if (state2.autoDestroy) {
        var wState = stream2._writableState;
        if (!wState || wState.autoDestroy && wState.finished) {
          stream2.destroy();
        }
      }
    }
  }
  if (typeof Symbol === "function") {
    Readable.from = function(iterable, opts) {
      if (from === void 0) {
        from = requireFrom();
      }
      return from(Readable, iterable, opts);
    };
  }
  function indexOf(xs, x) {
    for (var i = 0, l = xs.length; i < l; i++) {
      if (xs[i] === x) return i;
    }
    return -1;
  }
  return _stream_readable;
}
var _stream_transform;
var hasRequired_stream_transform;
function require_stream_transform() {
  if (hasRequired_stream_transform) return _stream_transform;
  hasRequired_stream_transform = 1;
  _stream_transform = Transform;
  var _require$codes = requireErrors().codes, ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED, ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK, ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING, ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
  var Duplex = require_stream_duplex();
  requireInherits()(Transform, Duplex);
  function afterTransform(er, data) {
    var ts = this._transformState;
    ts.transforming = false;
    var cb = ts.writecb;
    if (cb === null) {
      return this.emit("error", new ERR_MULTIPLE_CALLBACK());
    }
    ts.writechunk = null;
    ts.writecb = null;
    if (data != null)
      this.push(data);
    cb(er);
    var rs = this._readableState;
    rs.reading = false;
    if (rs.needReadable || rs.length < rs.highWaterMark) {
      this._read(rs.highWaterMark);
    }
  }
  function Transform(options) {
    if (!(this instanceof Transform)) return new Transform(options);
    Duplex.call(this, options);
    this._transformState = {
      afterTransform: afterTransform.bind(this),
      needTransform: false,
      transforming: false,
      writecb: null,
      writechunk: null,
      writeencoding: null
    };
    this._readableState.needReadable = true;
    this._readableState.sync = false;
    if (options) {
      if (typeof options.transform === "function") this._transform = options.transform;
      if (typeof options.flush === "function") this._flush = options.flush;
    }
    this.on("prefinish", prefinish);
  }
  function prefinish() {
    var _this = this;
    if (typeof this._flush === "function" && !this._readableState.destroyed) {
      this._flush(function(er, data) {
        done(_this, er, data);
      });
    } else {
      done(this, null, null);
    }
  }
  Transform.prototype.push = function(chunk, encoding) {
    this._transformState.needTransform = false;
    return Duplex.prototype.push.call(this, chunk, encoding);
  };
  Transform.prototype._transform = function(chunk, encoding, cb) {
    cb(new ERR_METHOD_NOT_IMPLEMENTED("_transform()"));
  };
  Transform.prototype._write = function(chunk, encoding, cb) {
    var ts = this._transformState;
    ts.writecb = cb;
    ts.writechunk = chunk;
    ts.writeencoding = encoding;
    if (!ts.transforming) {
      var rs = this._readableState;
      if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
    }
  };
  Transform.prototype._read = function(n) {
    var ts = this._transformState;
    if (ts.writechunk !== null && !ts.transforming) {
      ts.transforming = true;
      this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
    } else {
      ts.needTransform = true;
    }
  };
  Transform.prototype._destroy = function(err, cb) {
    Duplex.prototype._destroy.call(this, err, function(err2) {
      cb(err2);
    });
  };
  function done(stream2, er, data) {
    if (er) return stream2.emit("error", er);
    if (data != null)
      stream2.push(data);
    if (stream2._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
    if (stream2._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
    return stream2.push(null);
  }
  return _stream_transform;
}
var _stream_passthrough;
var hasRequired_stream_passthrough;
function require_stream_passthrough() {
  if (hasRequired_stream_passthrough) return _stream_passthrough;
  hasRequired_stream_passthrough = 1;
  _stream_passthrough = PassThrough;
  var Transform = require_stream_transform();
  requireInherits()(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough)) return new PassThrough(options);
    Transform.call(this, options);
  }
  PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
  return _stream_passthrough;
}
var pipeline_1;
var hasRequiredPipeline;
function requirePipeline() {
  if (hasRequiredPipeline) return pipeline_1;
  hasRequiredPipeline = 1;
  var eos;
  function once(callback) {
    var called = false;
    return function() {
      if (called) return;
      called = true;
      callback.apply(void 0, arguments);
    };
  }
  var _require$codes = requireErrors().codes, ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS, ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
  function noop(err) {
    if (err) throw err;
  }
  function isRequest(stream2) {
    return stream2.setHeader && typeof stream2.abort === "function";
  }
  function destroyer(stream2, reading, writing, callback) {
    callback = once(callback);
    var closed = false;
    stream2.on("close", function() {
      closed = true;
    });
    if (eos === void 0) eos = requireEndOfStream();
    eos(stream2, {
      readable: reading,
      writable: writing
    }, function(err) {
      if (err) return callback(err);
      closed = true;
      callback();
    });
    var destroyed = false;
    return function(err) {
      if (closed) return;
      if (destroyed) return;
      destroyed = true;
      if (isRequest(stream2)) return stream2.abort();
      if (typeof stream2.destroy === "function") return stream2.destroy();
      callback(err || new ERR_STREAM_DESTROYED("pipe"));
    };
  }
  function call(fn) {
    fn();
  }
  function pipe(from, to) {
    return from.pipe(to);
  }
  function popCallback(streams) {
    if (!streams.length) return noop;
    if (typeof streams[streams.length - 1] !== "function") return noop;
    return streams.pop();
  }
  function pipeline() {
    for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
      streams[_key] = arguments[_key];
    }
    var callback = popCallback(streams);
    if (Array.isArray(streams[0])) streams = streams[0];
    if (streams.length < 2) {
      throw new ERR_MISSING_ARGS("streams");
    }
    var error;
    var destroys = streams.map(function(stream2, i) {
      var reading = i < streams.length - 1;
      var writing = i > 0;
      return destroyer(stream2, reading, writing, function(err) {
        if (!error) error = err;
        if (err) destroys.forEach(call);
        if (reading) return;
        destroys.forEach(call);
        callback(error);
      });
    });
    return streams.reduce(pipe);
  }
  pipeline_1 = pipeline;
  return pipeline_1;
}
(function(module, exports) {
  var Stream = require$$0$2;
  if (process.env.READABLE_STREAM === "disable" && Stream) {
    module.exports = Stream.Readable;
    Object.assign(module.exports, Stream);
    module.exports.Stream = Stream;
  } else {
    exports = module.exports = require_stream_readable();
    exports.Stream = Stream || exports;
    exports.Readable = exports;
    exports.Writable = require_stream_writable();
    exports.Duplex = require_stream_duplex();
    exports.Transform = require_stream_transform();
    exports.PassThrough = require_stream_passthrough();
    exports.finished = requireEndOfStream();
    exports.pipeline = requirePipeline();
  }
})(readable, readable.exports);
var readableExports = readable.exports;
Object.defineProperty(lib, "__esModule", { value: true });
lib.ReadableWebToNodeStream = void 0;
const readable_stream_1 = readableExports;
class ReadableWebToNodeStream extends readable_stream_1.Readable {
  /**
   *
   * @param stream Readable​Stream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
   */
  constructor(stream2) {
    super();
    this.bytesRead = 0;
    this.released = false;
    this.reader = stream2.getReader();
  }
  /**
   * Implementation of readable._read(size).
   * When readable._read() is called, if data is available from the resource,
   * the implementation should begin pushing that data into the read queue
   * https://nodejs.org/api/stream.html#stream_readable_read_size_1
   */
  async _read() {
    if (this.released) {
      this.push(null);
      return;
    }
    this.pendingRead = this.reader.read();
    const data = await this.pendingRead;
    delete this.pendingRead;
    if (data.done || this.released) {
      this.push(null);
    } else {
      this.bytesRead += data.value.length;
      this.push(data.value);
    }
  }
  /**
   * If there is no unresolved read call to Web-API Readable​Stream immediately returns;
   * otherwise will wait until the read is resolved.
   */
  async waitForReadToComplete() {
    if (this.pendingRead) {
      await this.pendingRead;
    }
  }
  /**
   * Close wrapper
   */
  async close() {
    await this.syncAndRelease();
  }
  async syncAndRelease() {
    this.released = true;
    await this.waitForReadToComplete();
    await this.reader.releaseLock();
  }
}
lib.ReadableWebToNodeStream = ReadableWebToNodeStream;
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.fetchFromUrl = exports.parseBlob = exports.parseReadableStream = exports.parseNodeStream = exports.selectCover = exports.ratingToStars = exports.orderTags = exports.parseFromTokenizer = exports.parseBuffer = void 0;
  const initDebug = srcExports;
  const mm = core$2;
  const readable_web_to_node_stream_1 = lib;
  const debug2 = initDebug("music-metadata-browser:main");
  var core_12 = core$2;
  Object.defineProperty(exports, "parseBuffer", { enumerable: true, get: function() {
    return core_12.parseBuffer;
  } });
  Object.defineProperty(exports, "parseFromTokenizer", { enumerable: true, get: function() {
    return core_12.parseFromTokenizer;
  } });
  Object.defineProperty(exports, "orderTags", { enumerable: true, get: function() {
    return core_12.orderTags;
  } });
  Object.defineProperty(exports, "ratingToStars", { enumerable: true, get: function() {
    return core_12.ratingToStars;
  } });
  Object.defineProperty(exports, "selectCover", { enumerable: true, get: function() {
    return core_12.selectCover;
  } });
  exports.parseNodeStream = mm.parseStream;
  async function parseReadableStream(stream2, fileInfo, options) {
    const ns = new readable_web_to_node_stream_1.ReadableWebToNodeStream(stream2);
    const res = await (0, exports.parseNodeStream)(ns, typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo, options);
    await ns.close();
    return res;
  }
  exports.parseReadableStream = parseReadableStream;
  async function parseBlob(blob, options) {
    ({ mimeType: blob.type, size: blob.size });
    if (blob instanceof File) {
      blob.name;
    }
    const stream2 = blob.stream ? blob.stream() : convertBlobToReadableStream(blob);
    return parseReadableStream(stream2, { mimeType: blob.type, size: blob.size }, options);
  }
  exports.parseBlob = parseBlob;
  function convertBlobToReadableStream(blob) {
    const fileReader = new FileReader();
    return new ReadableStream({
      start(controller) {
        fileReader.onloadend = (event) => {
          let data = event.target.result;
          if (data instanceof ArrayBuffer) {
            data = new Uint8Array(data);
          }
          controller.enqueue(data);
          controller.close();
        };
        fileReader.onerror = (error) => {
          controller.close();
        };
        fileReader.onabort = (error) => {
          controller.close();
        };
        fileReader.readAsArrayBuffer(blob);
      }
    });
  }
  async function fetchFromUrl(audioTrackUrl, options) {
    const response = await fetch(audioTrackUrl);
    const fileInfo = {
      size: parseInt(response.headers.get("Content-Length"), 10),
      mimeType: response.headers.get("Content-Type")
    };
    if (response.ok) {
      if (response.body) {
        const res = await parseReadableStream(response.body, fileInfo, options);
        debug2("Closing HTTP-readable-stream...");
        if (!response.body.locked) {
          await response.body.cancel();
        }
        debug2("HTTP-readable-stream closed.");
        return res;
      } else {
        return parseBlob(await response.blob(), options);
      }
    } else {
      throw new Error(`HTTP error status=${response.status}: ${response.statusText}`);
    }
  }
  exports.fetchFromUrl = fetchFromUrl;
})(lib$3);
async function loadMusic(path2) {
  return new Promise((resolve2, reject2) => {
    fs.readFile(path2, (err, data) => {
      if (err) reject2(err);
      else resolve2(data);
    });
  });
}
async function loadLyric(path2) {
  return new Promise((resolve2, reject2) => {
    fs.readFile(path2, (err, data) => {
      if (err) reject2(void 0);
      else resolve2(data.toString());
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
    if (require$$3.BrowserWindow.getAllWindows.length === 0) window$1 = createWindows();
  });
});
require$$3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") require$$3.app.quit();
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
require$$3.ipcMain.on(
  "doSetTumbarButtons",
  (_event, args) => {
    setTumbarButtons(args);
  }
);
function doPre() {
  window$1.webContents.send("doPre");
}
function doPlay() {
  window$1.webContents.send("doPlay");
}
function doNext() {
  window$1.webContents.send("doNext");
}
function setTumbarButtons(args) {
  const buttons = [
    {
      tooltip: "上一首",
      icon: require$$3.nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/previous.png")
      ),
      click: doPre
    },
    {
      tooltip: "播放",
      icon: require$$3.nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/play.png")
      ),
      click: doPlay
    },
    {
      tooltip: "下一首",
      icon: require$$3.nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/next.png")
      ),
      click: doNext
    }
  ];
  if (args.isPlaying) {
    buttons[1].tooltip = "暂停";
    buttons[1].icon = require$$3.nativeImage.createFromPath(
      path.join(path.dirname(__dirname), "/src/assets/stop.png")
    );
  } else {
    buttons[1].tooltip = "播放";
    buttons[1].icon = require$$3.nativeImage.createFromPath(
      path.join(path.dirname(__dirname), "/src/assets/play.png")
    );
  }
  window$1.setThumbarButtons(buttons);
}
