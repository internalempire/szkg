(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/events/events.js
  var require_events = __commonJS({
    "node_modules/events/events.js"(exports, module) {
      "use strict";
      var R = typeof Reflect === "object" ? Reflect : null;
      var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
        return Function.prototype.apply.call(target, receiver, args);
      };
      var ReflectOwnKeys;
      if (R && typeof R.ownKeys === "function") {
        ReflectOwnKeys = R.ownKeys;
      } else if (Object.getOwnPropertySymbols) {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
        };
      } else {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target);
        };
      }
      function ProcessEmitWarning(warning) {
        if (console && console.warn) console.warn(warning);
      }
      var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
        return value !== value;
      };
      function EventEmitter3() {
        EventEmitter3.init.call(this);
      }
      module.exports = EventEmitter3;
      module.exports.once = once;
      EventEmitter3.EventEmitter = EventEmitter3;
      EventEmitter3.prototype._events = void 0;
      EventEmitter3.prototype._eventsCount = 0;
      EventEmitter3.prototype._maxListeners = void 0;
      var defaultMaxListeners = 10;
      function checkListener(listener) {
        if (typeof listener !== "function") {
          throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
        }
      }
      Object.defineProperty(EventEmitter3, "defaultMaxListeners", {
        enumerable: true,
        get: function() {
          return defaultMaxListeners;
        },
        set: function(arg) {
          if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
            throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
          }
          defaultMaxListeners = arg;
        }
      });
      EventEmitter3.init = function() {
        if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        }
        this._maxListeners = this._maxListeners || void 0;
      };
      EventEmitter3.prototype.setMaxListeners = function setMaxListeners(n) {
        if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
          throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
        }
        this._maxListeners = n;
        return this;
      };
      function _getMaxListeners(that) {
        if (that._maxListeners === void 0)
          return EventEmitter3.defaultMaxListeners;
        return that._maxListeners;
      }
      EventEmitter3.prototype.getMaxListeners = function getMaxListeners() {
        return _getMaxListeners(this);
      };
      EventEmitter3.prototype.emit = function emit(type) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var doError = type === "error";
        var events = this._events;
        if (events !== void 0)
          doError = doError && events.error === void 0;
        else if (!doError)
          return false;
        if (doError) {
          var er;
          if (args.length > 0)
            er = args[0];
          if (er instanceof Error) {
            throw er;
          }
          var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
          err.context = er;
          throw err;
        }
        var handler = events[type];
        if (handler === void 0)
          return false;
        if (typeof handler === "function") {
          ReflectApply(handler, this, args);
        } else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            ReflectApply(listeners[i], this, args);
        }
        return true;
      };
      function _addListener(target, type, listener, prepend) {
        var m;
        var events;
        var existing;
        checkListener(listener);
        events = target._events;
        if (events === void 0) {
          events = target._events = /* @__PURE__ */ Object.create(null);
          target._eventsCount = 0;
        } else {
          if (events.newListener !== void 0) {
            target.emit(
              "newListener",
              type,
              listener.listener ? listener.listener : listener
            );
            events = target._events;
          }
          existing = events[type];
        }
        if (existing === void 0) {
          existing = events[type] = listener;
          ++target._eventsCount;
        } else {
          if (typeof existing === "function") {
            existing = events[type] = prepend ? [listener, existing] : [existing, listener];
          } else if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
          m = _getMaxListeners(target);
          if (m > 0 && existing.length > m && !existing.warned) {
            existing.warned = true;
            var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
            w.name = "MaxListenersExceededWarning";
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            ProcessEmitWarning(w);
          }
        }
        return target;
      }
      EventEmitter3.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false);
      };
      EventEmitter3.prototype.on = EventEmitter3.prototype.addListener;
      EventEmitter3.prototype.prependListener = function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };
      function onceWrapper() {
        if (!this.fired) {
          this.target.removeListener(this.type, this.wrapFn);
          this.fired = true;
          if (arguments.length === 0)
            return this.listener.call(this.target);
          return this.listener.apply(this.target, arguments);
        }
      }
      function _onceWrap(target, type, listener) {
        var state = { fired: false, wrapFn: void 0, target, type, listener };
        var wrapped = onceWrapper.bind(state);
        wrapped.listener = listener;
        state.wrapFn = wrapped;
        return wrapped;
      }
      EventEmitter3.prototype.once = function once2(type, listener) {
        checkListener(listener);
        this.on(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter3.prototype.prependOnceListener = function prependOnceListener(type, listener) {
        checkListener(listener);
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter3.prototype.removeListener = function removeListener(type, listener) {
        var list, events, position, i, originalListener;
        checkListener(listener);
        events = this._events;
        if (events === void 0)
          return this;
        list = events[type];
        if (list === void 0)
          return this;
        if (list === listener || list.listener === listener) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else {
            delete events[type];
            if (events.removeListener)
              this.emit("removeListener", type, list.listener || listener);
          }
        } else if (typeof list !== "function") {
          position = -1;
          for (i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener || list[i].listener === listener) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }
          if (position < 0)
            return this;
          if (position === 0)
            list.shift();
          else {
            spliceOne(list, position);
          }
          if (list.length === 1)
            events[type] = list[0];
          if (events.removeListener !== void 0)
            this.emit("removeListener", type, originalListener || listener);
        }
        return this;
      };
      EventEmitter3.prototype.off = EventEmitter3.prototype.removeListener;
      EventEmitter3.prototype.removeAllListeners = function removeAllListeners(type) {
        var listeners, events, i;
        events = this._events;
        if (events === void 0)
          return this;
        if (events.removeListener === void 0) {
          if (arguments.length === 0) {
            this._events = /* @__PURE__ */ Object.create(null);
            this._eventsCount = 0;
          } else if (events[type] !== void 0) {
            if (--this._eventsCount === 0)
              this._events = /* @__PURE__ */ Object.create(null);
            else
              delete events[type];
          }
          return this;
        }
        if (arguments.length === 0) {
          var keys = Object.keys(events);
          var key;
          for (i = 0; i < keys.length; ++i) {
            key = keys[i];
            if (key === "removeListener") continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners("removeListener");
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
          return this;
        }
        listeners = events[type];
        if (typeof listeners === "function") {
          this.removeListener(type, listeners);
        } else if (listeners !== void 0) {
          for (i = listeners.length - 1; i >= 0; i--) {
            this.removeListener(type, listeners[i]);
          }
        }
        return this;
      };
      function _listeners(target, type, unwrap) {
        var events = target._events;
        if (events === void 0)
          return [];
        var evlistener = events[type];
        if (evlistener === void 0)
          return [];
        if (typeof evlistener === "function")
          return unwrap ? [evlistener.listener || evlistener] : [evlistener];
        return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
      }
      EventEmitter3.prototype.listeners = function listeners(type) {
        return _listeners(this, type, true);
      };
      EventEmitter3.prototype.rawListeners = function rawListeners(type) {
        return _listeners(this, type, false);
      };
      EventEmitter3.listenerCount = function(emitter, type) {
        if (typeof emitter.listenerCount === "function") {
          return emitter.listenerCount(type);
        } else {
          return listenerCount.call(emitter, type);
        }
      };
      EventEmitter3.prototype.listenerCount = listenerCount;
      function listenerCount(type) {
        var events = this._events;
        if (events !== void 0) {
          var evlistener = events[type];
          if (typeof evlistener === "function") {
            return 1;
          } else if (evlistener !== void 0) {
            return evlistener.length;
          }
        }
        return 0;
      }
      EventEmitter3.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
      };
      function arrayClone(arr, n) {
        var copy = new Array(n);
        for (var i = 0; i < n; ++i)
          copy[i] = arr[i];
        return copy;
      }
      function spliceOne(list, index) {
        for (; index + 1 < list.length; index++)
          list[index] = list[index + 1];
        list.pop();
      }
      function unwrapListeners(arr) {
        var ret = new Array(arr.length);
        for (var i = 0; i < ret.length; ++i) {
          ret[i] = arr[i].listener || arr[i];
        }
        return ret;
      }
      function once(emitter, name) {
        return new Promise(function(resolve, reject) {
          function errorListener(err) {
            emitter.removeListener(name, resolver);
            reject(err);
          }
          function resolver() {
            if (typeof emitter.removeListener === "function") {
              emitter.removeListener("error", errorListener);
            }
            resolve([].slice.call(arguments));
          }
          ;
          eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
          if (name !== "error") {
            addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
          }
        });
      }
      function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
        if (typeof emitter.on === "function") {
          eventTargetAgnosticAddListener(emitter, "error", handler, flags);
        }
      }
      function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
        if (typeof emitter.on === "function") {
          if (flags.once) {
            emitter.once(name, listener);
          } else {
            emitter.on(name, listener);
          }
        } else if (typeof emitter.addEventListener === "function") {
          emitter.addEventListener(name, function wrapListener(arg) {
            if (flags.once) {
              emitter.removeEventListener(name, wrapListener);
            }
            listener(arg);
          });
        } else {
          throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
        }
      }
    }
  });

  // node_modules/graphology-utils/is-graph.js
  var require_is_graph = __commonJS({
    "node_modules/graphology-utils/is-graph.js"(exports, module) {
      module.exports = function isGraph2(value) {
        return value !== null && typeof value === "object" && typeof value.addUndirectedEdgeWithKey === "function" && typeof value.dropNode === "function" && typeof value.multi === "boolean";
      };
    }
  });

  // node_modules/graphology/dist/graphology.mjs
  var import_events = __toESM(require_events(), 1);
  function assignPolyfill() {
    const target = arguments[0];
    for (let i = 1, l = arguments.length; i < l; i++) {
      if (!arguments[i]) continue;
      for (const k in arguments[i]) target[k] = arguments[i][k];
    }
    return target;
  }
  var assign = assignPolyfill;
  if (typeof Object.assign === "function") assign = Object.assign;
  function getMatchingEdge(graph2, source, target, type) {
    const sourceData = graph2._nodes.get(source);
    let edge = null;
    if (!sourceData) return edge;
    if (type === "mixed") {
      edge = sourceData.out && sourceData.out[target] || sourceData.undirected && sourceData.undirected[target];
    } else if (type === "directed") {
      edge = sourceData.out && sourceData.out[target];
    } else {
      edge = sourceData.undirected && sourceData.undirected[target];
    }
    return edge;
  }
  function isPlainObject(value) {
    return typeof value === "object" && value !== null;
  }
  function isEmpty(o) {
    let k;
    for (k in o) return false;
    return true;
  }
  function privateProperty(target, name, value) {
    Object.defineProperty(target, name, {
      enumerable: false,
      configurable: false,
      writable: true,
      value
    });
  }
  function readOnlyProperty(target, name, value) {
    const descriptor = {
      enumerable: true,
      configurable: true
    };
    if (typeof value === "function") {
      descriptor.get = value;
    } else {
      descriptor.value = value;
      descriptor.writable = false;
    }
    Object.defineProperty(target, name, descriptor);
  }
  function validateHints(hints) {
    if (!isPlainObject(hints)) return false;
    if (hints.attributes && !Array.isArray(hints.attributes)) return false;
    return true;
  }
  function incrementalIdStartingFromRandomByte() {
    let i = Math.floor(Math.random() * 256) & 255;
    return () => {
      return i++;
    };
  }
  function chain() {
    const iterables = arguments;
    let current = null;
    let i = -1;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let step = null;
        do {
          if (current === null) {
            i++;
            if (i >= iterables.length) return { done: true };
            current = iterables[i][Symbol.iterator]();
          }
          step = current.next();
          if (step.done) {
            current = null;
            continue;
          }
          break;
        } while (true);
        return step;
      }
    };
  }
  function emptyIterator() {
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        return { done: true };
      }
    };
  }
  var GraphError = class extends Error {
    constructor(message) {
      super();
      this.name = "GraphError";
      this.message = message;
    }
  };
  var InvalidArgumentsGraphError = class _InvalidArgumentsGraphError extends GraphError {
    constructor(message) {
      super(message);
      this.name = "InvalidArgumentsGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(
          this,
          _InvalidArgumentsGraphError.prototype.constructor
        );
    }
  };
  var NotFoundGraphError = class _NotFoundGraphError extends GraphError {
    constructor(message) {
      super(message);
      this.name = "NotFoundGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(this, _NotFoundGraphError.prototype.constructor);
    }
  };
  var UsageGraphError = class _UsageGraphError extends GraphError {
    constructor(message) {
      super(message);
      this.name = "UsageGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(this, _UsageGraphError.prototype.constructor);
    }
  };
  function MixedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  MixedNodeData.prototype.clear = function() {
    this.inDegree = 0;
    this.outDegree = 0;
    this.undirectedDegree = 0;
    this.undirectedLoops = 0;
    this.directedLoops = 0;
    this.in = {};
    this.out = {};
    this.undirected = {};
  };
  function DirectedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  DirectedNodeData.prototype.clear = function() {
    this.inDegree = 0;
    this.outDegree = 0;
    this.directedLoops = 0;
    this.in = {};
    this.out = {};
  };
  function UndirectedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  UndirectedNodeData.prototype.clear = function() {
    this.undirectedDegree = 0;
    this.undirectedLoops = 0;
    this.undirected = {};
  };
  function EdgeData(undirected, key, source, target, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.undirected = undirected;
    this.source = source;
    this.target = target;
  }
  EdgeData.prototype.attach = function() {
    let outKey = "out";
    let inKey = "in";
    if (this.undirected) outKey = inKey = "undirected";
    const source = this.source.key;
    const target = this.target.key;
    this.source[outKey][target] = this;
    if (this.undirected && source === target) return;
    this.target[inKey][source] = this;
  };
  EdgeData.prototype.attachMulti = function() {
    let outKey = "out";
    let inKey = "in";
    const source = this.source.key;
    const target = this.target.key;
    if (this.undirected) outKey = inKey = "undirected";
    const adj = this.source[outKey];
    const head = adj[target];
    if (typeof head === "undefined") {
      adj[target] = this;
      if (!(this.undirected && source === target)) {
        this.target[inKey][source] = this;
      }
      return;
    }
    head.previous = this;
    this.next = head;
    adj[target] = this;
    this.target[inKey][source] = this;
  };
  EdgeData.prototype.detach = function() {
    const source = this.source.key;
    const target = this.target.key;
    let outKey = "out";
    let inKey = "in";
    if (this.undirected) outKey = inKey = "undirected";
    delete this.source[outKey][target];
    delete this.target[inKey][source];
  };
  EdgeData.prototype.detachMulti = function() {
    const source = this.source.key;
    const target = this.target.key;
    let outKey = "out";
    let inKey = "in";
    if (this.undirected) outKey = inKey = "undirected";
    if (this.previous === void 0) {
      if (this.next === void 0) {
        delete this.source[outKey][target];
        delete this.target[inKey][source];
      } else {
        this.next.previous = void 0;
        this.source[outKey][target] = this.next;
        this.target[inKey][source] = this.next;
      }
    } else {
      this.previous.next = this.next;
      if (this.next !== void 0) {
        this.next.previous = this.previous;
      }
    }
  };
  var NODE = 0;
  var SOURCE = 1;
  var TARGET = 2;
  var OPPOSITE = 3;
  function findRelevantNodeData(graph2, method, mode, nodeOrEdge, nameOrEdge, add1, add2) {
    let nodeData, edgeData, arg1, arg2;
    nodeOrEdge = "" + nodeOrEdge;
    if (mode === NODE) {
      nodeData = graph2._nodes.get(nodeOrEdge);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.${method}: could not find the "${nodeOrEdge}" node in the graph.`
        );
      arg1 = nameOrEdge;
      arg2 = add1;
    } else if (mode === OPPOSITE) {
      nameOrEdge = "" + nameOrEdge;
      edgeData = graph2._edges.get(nameOrEdge);
      if (!edgeData)
        throw new NotFoundGraphError(
          `Graph.${method}: could not find the "${nameOrEdge}" edge in the graph.`
        );
      const source = edgeData.source.key;
      const target = edgeData.target.key;
      if (nodeOrEdge === source) {
        nodeData = edgeData.target;
      } else if (nodeOrEdge === target) {
        nodeData = edgeData.source;
      } else {
        throw new NotFoundGraphError(
          `Graph.${method}: the "${nodeOrEdge}" node is not attached to the "${nameOrEdge}" edge (${source}, ${target}).`
        );
      }
      arg1 = add1;
      arg2 = add2;
    } else {
      edgeData = graph2._edges.get(nodeOrEdge);
      if (!edgeData)
        throw new NotFoundGraphError(
          `Graph.${method}: could not find the "${nodeOrEdge}" edge in the graph.`
        );
      if (mode === SOURCE) {
        nodeData = edgeData.source;
      } else {
        nodeData = edgeData.target;
      }
      arg1 = nameOrEdge;
      arg2 = add1;
    }
    return [nodeData, arg1, arg2];
  }
  function attachNodeAttributeGetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, name] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      return data.attributes[name];
    };
  }
  function attachNodeAttributesGetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge) {
      const [data] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge
      );
      return data.attributes;
    };
  }
  function attachNodeAttributeChecker(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, name] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      return data.attributes.hasOwnProperty(name);
    };
  }
  function attachNodeAttributeSetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1, add2) {
      const [data, name, value] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1,
        add2
      );
      data.attributes[name] = value;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributeUpdater(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1, add2) {
      const [data, name, updater] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1,
        add2
      );
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: updater should be a function.`
        );
      const attributes = data.attributes;
      const value = updater(attributes[name]);
      attributes[name] = value;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributeRemover(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, name] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      delete data.attributes[name];
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "remove",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributesReplacer(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, attributes] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided attributes are not a plain object.`
        );
      data.attributes = attributes;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "replace",
        attributes: data.attributes
      });
      return this;
    };
  }
  function attachNodeAttributesMerger(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, attributes] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided attributes are not a plain object.`
        );
      assign(data.attributes, attributes);
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "merge",
        attributes: data.attributes,
        data: attributes
      });
      return this;
    };
  }
  function attachNodeAttributesUpdater(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      const [data, updater] = findRelevantNodeData(
        this,
        method,
        mode,
        nodeOrEdge,
        nameOrEdge,
        add1
      );
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided updater is not a function.`
        );
      data.attributes = updater(data.attributes);
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "update",
        attributes: data.attributes
      });
      return this;
    };
  }
  var NODE_ATTRIBUTES_METHODS = [
    {
      name: (element) => `get${element}Attribute`,
      attacher: attachNodeAttributeGetter
    },
    {
      name: (element) => `get${element}Attributes`,
      attacher: attachNodeAttributesGetter
    },
    {
      name: (element) => `has${element}Attribute`,
      attacher: attachNodeAttributeChecker
    },
    {
      name: (element) => `set${element}Attribute`,
      attacher: attachNodeAttributeSetter
    },
    {
      name: (element) => `update${element}Attribute`,
      attacher: attachNodeAttributeUpdater
    },
    {
      name: (element) => `remove${element}Attribute`,
      attacher: attachNodeAttributeRemover
    },
    {
      name: (element) => `replace${element}Attributes`,
      attacher: attachNodeAttributesReplacer
    },
    {
      name: (element) => `merge${element}Attributes`,
      attacher: attachNodeAttributesMerger
    },
    {
      name: (element) => `update${element}Attributes`,
      attacher: attachNodeAttributesUpdater
    }
  ];
  function attachNodeAttributesMethods(Graph2) {
    NODE_ATTRIBUTES_METHODS.forEach(function({ name, attacher }) {
      attacher(Graph2, name("Node"), NODE);
      attacher(Graph2, name("Source"), SOURCE);
      attacher(Graph2, name("Target"), TARGET);
      attacher(Graph2, name("Opposite"), OPPOSITE);
    });
  }
  function attachEdgeAttributeGetter(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element;
        const target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      return data.attributes[name];
    };
  }
  function attachEdgeAttributesGetter(Class, method, type) {
    Class.prototype[method] = function(element) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 1) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element, target = "" + arguments[1];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      return data.attributes;
    };
  }
  function attachEdgeAttributeChecker(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element;
        const target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      return data.attributes.hasOwnProperty(name);
    };
  }
  function attachEdgeAttributeSetter(Class, method, type) {
    Class.prototype[method] = function(element, name, value) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 3) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element;
        const target = "" + name;
        name = arguments[2];
        value = arguments[3];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      data.attributes[name] = value;
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributeUpdater(Class, method, type) {
    Class.prototype[method] = function(element, name, updater) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 3) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element;
        const target = "" + name;
        name = arguments[2];
        updater = arguments[3];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: updater should be a function.`
        );
      data.attributes[name] = updater(data.attributes[name]);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributeRemover(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element;
        const target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      delete data.attributes[name];
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "remove",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributesReplacer(Class, method, type) {
    Class.prototype[method] = function(element, attributes) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element, target = "" + attributes;
        attributes = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided attributes are not a plain object.`
        );
      data.attributes = attributes;
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "replace",
        attributes: data.attributes
      });
      return this;
    };
  }
  function attachEdgeAttributesMerger(Class, method, type) {
    Class.prototype[method] = function(element, attributes) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element, target = "" + attributes;
        attributes = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided attributes are not a plain object.`
        );
      assign(data.attributes, attributes);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "merge",
        attributes: data.attributes,
        data: attributes
      });
      return this;
    };
  }
  function attachEdgeAttributesUpdater(Class, method, type) {
    Class.prototype[method] = function(element, updater) {
      let data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError(
          `Graph.${method}: cannot find this type of edges in your ${this.type} graph.`
        );
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError(
            `Graph.${method}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`
          );
        const source = "" + element, target = "" + updater;
        updater = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find an edge for the given path ("${source}" - "${target}").`
          );
      } else {
        if (type !== "mixed")
          throw new UsageGraphError(
            `Graph.${method}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`
          );
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError(
            `Graph.${method}: could not find the "${element}" edge in the graph.`
          );
      }
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          `Graph.${method}: provided updater is not a function.`
        );
      data.attributes = updater(data.attributes);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "update",
        attributes: data.attributes
      });
      return this;
    };
  }
  var EDGE_ATTRIBUTES_METHODS = [
    {
      name: (element) => `get${element}Attribute`,
      attacher: attachEdgeAttributeGetter
    },
    {
      name: (element) => `get${element}Attributes`,
      attacher: attachEdgeAttributesGetter
    },
    {
      name: (element) => `has${element}Attribute`,
      attacher: attachEdgeAttributeChecker
    },
    {
      name: (element) => `set${element}Attribute`,
      attacher: attachEdgeAttributeSetter
    },
    {
      name: (element) => `update${element}Attribute`,
      attacher: attachEdgeAttributeUpdater
    },
    {
      name: (element) => `remove${element}Attribute`,
      attacher: attachEdgeAttributeRemover
    },
    {
      name: (element) => `replace${element}Attributes`,
      attacher: attachEdgeAttributesReplacer
    },
    {
      name: (element) => `merge${element}Attributes`,
      attacher: attachEdgeAttributesMerger
    },
    {
      name: (element) => `update${element}Attributes`,
      attacher: attachEdgeAttributesUpdater
    }
  ];
  function attachEdgeAttributesMethods(Graph2) {
    EDGE_ATTRIBUTES_METHODS.forEach(function({ name, attacher }) {
      attacher(Graph2, name("Edge"), "mixed");
      attacher(Graph2, name("DirectedEdge"), "directed");
      attacher(Graph2, name("UndirectedEdge"), "undirected");
    });
  }
  var EDGES_ITERATION = [
    {
      name: "edges",
      type: "mixed"
    },
    {
      name: "inEdges",
      type: "directed",
      direction: "in"
    },
    {
      name: "outEdges",
      type: "directed",
      direction: "out"
    },
    {
      name: "inboundEdges",
      type: "mixed",
      direction: "in"
    },
    {
      name: "outboundEdges",
      type: "mixed",
      direction: "out"
    },
    {
      name: "directedEdges",
      type: "directed"
    },
    {
      name: "undirectedEdges",
      type: "undirected"
    }
  ];
  function forEachSimple(breakable, object, callback, avoid) {
    let shouldBreak = false;
    for (const k in object) {
      if (k === avoid) continue;
      const edgeData = object[k];
      shouldBreak = callback(
        edgeData.key,
        edgeData.attributes,
        edgeData.source.key,
        edgeData.target.key,
        edgeData.source.attributes,
        edgeData.target.attributes,
        edgeData.undirected
      );
      if (breakable && shouldBreak) return edgeData.key;
    }
    return;
  }
  function forEachMulti(breakable, object, callback, avoid) {
    let edgeData, source, target;
    let shouldBreak = false;
    for (const k in object) {
      if (k === avoid) continue;
      edgeData = object[k];
      do {
        source = edgeData.source;
        target = edgeData.target;
        shouldBreak = callback(
          edgeData.key,
          edgeData.attributes,
          source.key,
          target.key,
          source.attributes,
          target.attributes,
          edgeData.undirected
        );
        if (breakable && shouldBreak) return edgeData.key;
        edgeData = edgeData.next;
      } while (edgeData !== void 0);
    }
    return;
  }
  function createIterator(object, avoid) {
    const keys = Object.keys(object);
    const l = keys.length;
    let edgeData;
    let i = 0;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        do {
          if (!edgeData) {
            if (i >= l) return { done: true };
            const k = keys[i++];
            if (k === avoid) {
              edgeData = void 0;
              continue;
            }
            edgeData = object[k];
          } else {
            edgeData = edgeData.next;
          }
        } while (!edgeData);
        return {
          done: false,
          value: {
            edge: edgeData.key,
            attributes: edgeData.attributes,
            source: edgeData.source.key,
            target: edgeData.target.key,
            sourceAttributes: edgeData.source.attributes,
            targetAttributes: edgeData.target.attributes,
            undirected: edgeData.undirected
          }
        };
      }
    };
  }
  function forEachForKeySimple(breakable, object, k, callback) {
    const edgeData = object[k];
    if (!edgeData) return;
    const sourceData = edgeData.source;
    const targetData = edgeData.target;
    if (callback(
      edgeData.key,
      edgeData.attributes,
      sourceData.key,
      targetData.key,
      sourceData.attributes,
      targetData.attributes,
      edgeData.undirected
    ) && breakable)
      return edgeData.key;
  }
  function forEachForKeyMulti(breakable, object, k, callback) {
    let edgeData = object[k];
    if (!edgeData) return;
    let shouldBreak = false;
    do {
      shouldBreak = callback(
        edgeData.key,
        edgeData.attributes,
        edgeData.source.key,
        edgeData.target.key,
        edgeData.source.attributes,
        edgeData.target.attributes,
        edgeData.undirected
      );
      if (breakable && shouldBreak) return edgeData.key;
      edgeData = edgeData.next;
    } while (edgeData !== void 0);
    return;
  }
  function createIteratorForKey(object, k) {
    let edgeData = object[k];
    if (edgeData.next !== void 0) {
      return {
        [Symbol.iterator]() {
          return this;
        },
        next() {
          if (!edgeData) return { done: true };
          const value = {
            edge: edgeData.key,
            attributes: edgeData.attributes,
            source: edgeData.source.key,
            target: edgeData.target.key,
            sourceAttributes: edgeData.source.attributes,
            targetAttributes: edgeData.target.attributes,
            undirected: edgeData.undirected
          };
          edgeData = edgeData.next;
          return {
            done: false,
            value
          };
        }
      };
    }
    let done = false;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        if (done === true) return { done: true };
        done = true;
        return {
          done: false,
          value: {
            edge: edgeData.key,
            attributes: edgeData.attributes,
            source: edgeData.source.key,
            target: edgeData.target.key,
            sourceAttributes: edgeData.source.attributes,
            targetAttributes: edgeData.target.attributes,
            undirected: edgeData.undirected
          }
        };
      }
    };
  }
  function createEdgeArray(graph2, type) {
    if (graph2.size === 0) return [];
    if (type === "mixed" || type === graph2.type) {
      return Array.from(graph2._edges.keys());
    }
    const size = type === "undirected" ? graph2.undirectedSize : graph2.directedSize;
    const list = new Array(size), mask = type === "undirected";
    const iterator = graph2._edges.values();
    let i = 0;
    let step, data;
    while (step = iterator.next(), step.done !== true) {
      data = step.value;
      if (data.undirected === mask) list[i++] = data.key;
    }
    return list;
  }
  function forEachEdge(breakable, graph2, type, callback) {
    if (graph2.size === 0) return;
    const shouldFilter = type !== "mixed" && type !== graph2.type;
    const mask = type === "undirected";
    let step, data;
    let shouldBreak = false;
    const iterator = graph2._edges.values();
    while (step = iterator.next(), step.done !== true) {
      data = step.value;
      if (shouldFilter && data.undirected !== mask) continue;
      const { key, attributes, source, target } = data;
      shouldBreak = callback(
        key,
        attributes,
        source.key,
        target.key,
        source.attributes,
        target.attributes,
        data.undirected
      );
      if (breakable && shouldBreak) return key;
    }
    return;
  }
  function createEdgeIterator(graph2, type) {
    if (graph2.size === 0) return emptyIterator();
    const shouldFilter = type !== "mixed" && type !== graph2.type;
    const mask = type === "undirected";
    const iterator = graph2._edges.values();
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let step, data;
        while (true) {
          step = iterator.next();
          if (step.done) return step;
          data = step.value;
          if (shouldFilter && data.undirected !== mask) continue;
          break;
        }
        const value = {
          edge: data.key,
          attributes: data.attributes,
          source: data.source.key,
          target: data.target.key,
          sourceAttributes: data.source.attributes,
          targetAttributes: data.target.attributes,
          undirected: data.undirected
        };
        return { value, done: false };
      }
    };
  }
  function forEachEdgeForNode(breakable, multi, type, direction, nodeData, callback) {
    const fn = multi ? forEachMulti : forEachSimple;
    let found;
    if (type !== "undirected") {
      if (direction !== "out") {
        found = fn(breakable, nodeData.in, callback);
        if (breakable && found) return found;
      }
      if (direction !== "in") {
        found = fn(
          breakable,
          nodeData.out,
          callback,
          !direction ? nodeData.key : void 0
        );
        if (breakable && found) return found;
      }
    }
    if (type !== "directed") {
      found = fn(breakable, nodeData.undirected, callback);
      if (breakable && found) return found;
    }
    return;
  }
  function createEdgeArrayForNode(multi, type, direction, nodeData) {
    const edges = [];
    forEachEdgeForNode(false, multi, type, direction, nodeData, function(key) {
      edges.push(key);
    });
    return edges;
  }
  function createEdgeIteratorForNode(type, direction, nodeData) {
    let iterator = emptyIterator();
    if (type !== "undirected") {
      if (direction !== "out" && typeof nodeData.in !== "undefined")
        iterator = chain(iterator, createIterator(nodeData.in));
      if (direction !== "in" && typeof nodeData.out !== "undefined")
        iterator = chain(
          iterator,
          createIterator(nodeData.out, !direction ? nodeData.key : void 0)
        );
    }
    if (type !== "directed" && typeof nodeData.undirected !== "undefined") {
      iterator = chain(iterator, createIterator(nodeData.undirected));
    }
    return iterator;
  }
  function forEachEdgeForPath(breakable, type, multi, direction, sourceData, target, callback) {
    const fn = multi ? forEachForKeyMulti : forEachForKeySimple;
    let found;
    if (type !== "undirected") {
      if (typeof sourceData.in !== "undefined" && direction !== "out") {
        found = fn(breakable, sourceData.in, target, callback);
        if (breakable && found) return found;
      }
      if (typeof sourceData.out !== "undefined" && direction !== "in" && (direction || sourceData.key !== target)) {
        found = fn(breakable, sourceData.out, target, callback);
        if (breakable && found) return found;
      }
    }
    if (type !== "directed") {
      if (typeof sourceData.undirected !== "undefined") {
        found = fn(breakable, sourceData.undirected, target, callback);
        if (breakable && found) return found;
      }
    }
    return;
  }
  function createEdgeArrayForPath(type, multi, direction, sourceData, target) {
    const edges = [];
    forEachEdgeForPath(
      false,
      type,
      multi,
      direction,
      sourceData,
      target,
      function(key) {
        edges.push(key);
      }
    );
    return edges;
  }
  function createEdgeIteratorForPath(type, direction, sourceData, target) {
    let iterator = emptyIterator();
    if (type !== "undirected") {
      if (typeof sourceData.in !== "undefined" && direction !== "out" && target in sourceData.in)
        iterator = chain(iterator, createIteratorForKey(sourceData.in, target));
      if (typeof sourceData.out !== "undefined" && direction !== "in" && target in sourceData.out && (direction || sourceData.key !== target))
        iterator = chain(iterator, createIteratorForKey(sourceData.out, target));
    }
    if (type !== "directed") {
      if (typeof sourceData.undirected !== "undefined" && target in sourceData.undirected)
        iterator = chain(
          iterator,
          createIteratorForKey(sourceData.undirected, target)
        );
    }
    return iterator;
  }
  function attachEdgeArrayCreator(Class, description) {
    const { name, type, direction } = description;
    Class.prototype[name] = function(source, target) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return [];
      if (!arguments.length) return createEdgeArray(this, type);
      if (arguments.length === 1) {
        source = "" + source;
        const nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError(
            `Graph.${name}: could not find the "${source}" node in the graph.`
          );
        return createEdgeArrayForNode(
          this.multi,
          type === "mixed" ? this.type : type,
          direction,
          nodeData
        );
      }
      if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        const sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError(
            `Graph.${name}:  could not find the "${source}" source node in the graph.`
          );
        if (!this._nodes.has(target))
          throw new NotFoundGraphError(
            `Graph.${name}:  could not find the "${target}" target node in the graph.`
          );
        return createEdgeArrayForPath(
          type,
          this.multi,
          direction,
          sourceData,
          target
        );
      }
      throw new InvalidArgumentsGraphError(
        `Graph.${name}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`
      );
    };
  }
  function attachForEachEdge(Class, description) {
    const { name, type, direction } = description;
    const forEachName = "forEach" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[forEachName] = function(source, target, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type) return;
      if (arguments.length === 1) {
        callback = source;
        return forEachEdge(false, this, type, callback);
      }
      if (arguments.length === 2) {
        source = "" + source;
        callback = target;
        const nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError(
            `Graph.${forEachName}: could not find the "${source}" node in the graph.`
          );
        return forEachEdgeForNode(
          false,
          this.multi,
          type === "mixed" ? this.type : type,
          direction,
          nodeData,
          callback
        );
      }
      if (arguments.length === 3) {
        source = "" + source;
        target = "" + target;
        const sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError(
            `Graph.${forEachName}:  could not find the "${source}" source node in the graph.`
          );
        if (!this._nodes.has(target))
          throw new NotFoundGraphError(
            `Graph.${forEachName}:  could not find the "${target}" target node in the graph.`
          );
        return forEachEdgeForPath(
          false,
          type,
          this.multi,
          direction,
          sourceData,
          target,
          callback
        );
      }
      throw new InvalidArgumentsGraphError(
        `Graph.${forEachName}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`
      );
    };
    const mapName = "map" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[mapName] = function() {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();
      let result;
      if (args.length === 0) {
        let length = 0;
        if (type !== "directed") length += this.undirectedSize;
        if (type !== "undirected") length += this.directedSize;
        result = new Array(length);
        let i = 0;
        args.push((e, ea, s, t, sa, ta, u) => {
          result[i++] = callback(e, ea, s, t, sa, ta, u);
        });
      } else {
        result = [];
        args.push((e, ea, s, t, sa, ta, u) => {
          result.push(callback(e, ea, s, t, sa, ta, u));
        });
      }
      this[forEachName].apply(this, args);
      return result;
    };
    const filterName = "filter" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[filterName] = function() {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();
      const result = [];
      args.push((e, ea, s, t, sa, ta, u) => {
        if (callback(e, ea, s, t, sa, ta, u)) result.push(e);
      });
      this[forEachName].apply(this, args);
      return result;
    };
    const reduceName = "reduce" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[reduceName] = function() {
      let args = Array.prototype.slice.call(arguments);
      if (args.length < 2 || args.length > 4) {
        throw new InvalidArgumentsGraphError(
          `Graph.${reduceName}: invalid number of arguments (expecting 2, 3 or 4 and got ${args.length}).`
        );
      }
      if (typeof args[args.length - 1] === "function" && typeof args[args.length - 2] !== "function") {
        throw new InvalidArgumentsGraphError(
          `Graph.${reduceName}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`
        );
      }
      let callback;
      let initialValue;
      if (args.length === 2) {
        callback = args[0];
        initialValue = args[1];
        args = [];
      } else if (args.length === 3) {
        callback = args[1];
        initialValue = args[2];
        args = [args[0]];
      } else if (args.length === 4) {
        callback = args[2];
        initialValue = args[3];
        args = [args[0], args[1]];
      }
      let accumulator = initialValue;
      args.push((e, ea, s, t, sa, ta, u) => {
        accumulator = callback(accumulator, e, ea, s, t, sa, ta, u);
      });
      this[forEachName].apply(this, args);
      return accumulator;
    };
  }
  function attachFindEdge(Class, description) {
    const { name, type, direction } = description;
    const findEdgeName = "find" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[findEdgeName] = function(source, target, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return false;
      if (arguments.length === 1) {
        callback = source;
        return forEachEdge(true, this, type, callback);
      }
      if (arguments.length === 2) {
        source = "" + source;
        callback = target;
        const nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError(
            `Graph.${findEdgeName}: could not find the "${source}" node in the graph.`
          );
        return forEachEdgeForNode(
          true,
          this.multi,
          type === "mixed" ? this.type : type,
          direction,
          nodeData,
          callback
        );
      }
      if (arguments.length === 3) {
        source = "" + source;
        target = "" + target;
        const sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError(
            `Graph.${findEdgeName}:  could not find the "${source}" source node in the graph.`
          );
        if (!this._nodes.has(target))
          throw new NotFoundGraphError(
            `Graph.${findEdgeName}:  could not find the "${target}" target node in the graph.`
          );
        return forEachEdgeForPath(
          true,
          type,
          this.multi,
          direction,
          sourceData,
          target,
          callback
        );
      }
      throw new InvalidArgumentsGraphError(
        `Graph.${findEdgeName}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`
      );
    };
    const someName = "some" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[someName] = function() {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();
      args.push((e, ea, s, t, sa, ta, u) => {
        return callback(e, ea, s, t, sa, ta, u);
      });
      const found = this[findEdgeName].apply(this, args);
      if (found) return true;
      return false;
    };
    const everyName = "every" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[everyName] = function() {
      const args = Array.prototype.slice.call(arguments);
      const callback = args.pop();
      args.push((e, ea, s, t, sa, ta, u) => {
        return !callback(e, ea, s, t, sa, ta, u);
      });
      const found = this[findEdgeName].apply(this, args);
      if (found) return false;
      return true;
    };
  }
  function attachEdgeIteratorCreator(Class, description) {
    const { name: originalName, type, direction } = description;
    const name = originalName.slice(0, -1) + "Entries";
    Class.prototype[name] = function(source, target) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return emptyIterator();
      if (!arguments.length) return createEdgeIterator(this, type);
      if (arguments.length === 1) {
        source = "" + source;
        const sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError(
            `Graph.${name}: could not find the "${source}" node in the graph.`
          );
        return createEdgeIteratorForNode(type, direction, sourceData);
      }
      if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        const sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError(
            `Graph.${name}:  could not find the "${source}" source node in the graph.`
          );
        if (!this._nodes.has(target))
          throw new NotFoundGraphError(
            `Graph.${name}:  could not find the "${target}" target node in the graph.`
          );
        return createEdgeIteratorForPath(type, direction, sourceData, target);
      }
      throw new InvalidArgumentsGraphError(
        `Graph.${name}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`
      );
    };
  }
  function attachEdgeIterationMethods(Graph2) {
    EDGES_ITERATION.forEach((description) => {
      attachEdgeArrayCreator(Graph2, description);
      attachForEachEdge(Graph2, description);
      attachFindEdge(Graph2, description);
      attachEdgeIteratorCreator(Graph2, description);
    });
  }
  var NEIGHBORS_ITERATION = [
    {
      name: "neighbors",
      type: "mixed"
    },
    {
      name: "inNeighbors",
      type: "directed",
      direction: "in"
    },
    {
      name: "outNeighbors",
      type: "directed",
      direction: "out"
    },
    {
      name: "inboundNeighbors",
      type: "mixed",
      direction: "in"
    },
    {
      name: "outboundNeighbors",
      type: "mixed",
      direction: "out"
    },
    {
      name: "directedNeighbors",
      type: "directed"
    },
    {
      name: "undirectedNeighbors",
      type: "undirected"
    }
  ];
  function CompositeSetWrapper() {
    this.A = null;
    this.B = null;
  }
  CompositeSetWrapper.prototype.wrap = function(set) {
    if (this.A === null) this.A = set;
    else if (this.B === null) this.B = set;
  };
  CompositeSetWrapper.prototype.has = function(key) {
    if (this.A !== null && key in this.A) return true;
    if (this.B !== null && key in this.B) return true;
    return false;
  };
  function forEachInObjectOnce(breakable, visited, nodeData, object, callback) {
    for (const k in object) {
      const edgeData = object[k];
      const sourceData = edgeData.source;
      const targetData = edgeData.target;
      const neighborData = sourceData === nodeData ? targetData : sourceData;
      if (visited && visited.has(neighborData.key)) continue;
      const shouldBreak = callback(neighborData.key, neighborData.attributes);
      if (breakable && shouldBreak) return neighborData.key;
    }
    return;
  }
  function forEachNeighbor(breakable, type, direction, nodeData, callback) {
    if (type !== "mixed") {
      if (type === "undirected")
        return forEachInObjectOnce(
          breakable,
          null,
          nodeData,
          nodeData.undirected,
          callback
        );
      if (typeof direction === "string")
        return forEachInObjectOnce(
          breakable,
          null,
          nodeData,
          nodeData[direction],
          callback
        );
    }
    const visited = new CompositeSetWrapper();
    let found;
    if (type !== "undirected") {
      if (direction !== "out") {
        found = forEachInObjectOnce(
          breakable,
          null,
          nodeData,
          nodeData.in,
          callback
        );
        if (breakable && found) return found;
        visited.wrap(nodeData.in);
      }
      if (direction !== "in") {
        found = forEachInObjectOnce(
          breakable,
          visited,
          nodeData,
          nodeData.out,
          callback
        );
        if (breakable && found) return found;
        visited.wrap(nodeData.out);
      }
    }
    if (type !== "directed") {
      found = forEachInObjectOnce(
        breakable,
        visited,
        nodeData,
        nodeData.undirected,
        callback
      );
      if (breakable && found) return found;
    }
    return;
  }
  function createNeighborArrayForNode(type, direction, nodeData) {
    if (type !== "mixed") {
      if (type === "undirected") return Object.keys(nodeData.undirected);
      if (typeof direction === "string") return Object.keys(nodeData[direction]);
    }
    const neighbors = [];
    forEachNeighbor(false, type, direction, nodeData, function(key) {
      neighbors.push(key);
    });
    return neighbors;
  }
  function createDedupedObjectIterator(visited, nodeData, object) {
    const keys = Object.keys(object);
    const l = keys.length;
    let i = 0;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let neighborData = null;
        do {
          if (i >= l) {
            if (visited) visited.wrap(object);
            return { done: true };
          }
          const edgeData = object[keys[i++]];
          const sourceData = edgeData.source;
          const targetData = edgeData.target;
          neighborData = sourceData === nodeData ? targetData : sourceData;
          if (visited && visited.has(neighborData.key)) {
            neighborData = null;
            continue;
          }
        } while (neighborData === null);
        return {
          done: false,
          value: { neighbor: neighborData.key, attributes: neighborData.attributes }
        };
      }
    };
  }
  function createNeighborIterator(type, direction, nodeData) {
    if (type !== "mixed") {
      if (type === "undirected")
        return createDedupedObjectIterator(null, nodeData, nodeData.undirected);
      if (typeof direction === "string")
        return createDedupedObjectIterator(null, nodeData, nodeData[direction]);
    }
    let iterator = emptyIterator();
    const visited = new CompositeSetWrapper();
    if (type !== "undirected") {
      if (direction !== "out") {
        iterator = chain(
          iterator,
          createDedupedObjectIterator(visited, nodeData, nodeData.in)
        );
      }
      if (direction !== "in") {
        iterator = chain(
          iterator,
          createDedupedObjectIterator(visited, nodeData, nodeData.out)
        );
      }
    }
    if (type !== "directed") {
      iterator = chain(
        iterator,
        createDedupedObjectIterator(visited, nodeData, nodeData.undirected)
      );
    }
    return iterator;
  }
  function attachNeighborArrayCreator(Class, description) {
    const { name, type, direction } = description;
    Class.prototype[name] = function(node) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return [];
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError(
          `Graph.${name}: could not find the "${node}" node in the graph.`
        );
      return createNeighborArrayForNode(
        type === "mixed" ? this.type : type,
        direction,
        nodeData
      );
    };
  }
  function attachForEachNeighbor(Class, description) {
    const { name, type, direction } = description;
    const forEachName = "forEach" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[forEachName] = function(node, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type) return;
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError(
          `Graph.${forEachName}: could not find the "${node}" node in the graph.`
        );
      forEachNeighbor(
        false,
        type === "mixed" ? this.type : type,
        direction,
        nodeData,
        callback
      );
    };
    const mapName = "map" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[mapName] = function(node, callback) {
      const result = [];
      this[forEachName](node, (n, a) => {
        result.push(callback(n, a));
      });
      return result;
    };
    const filterName = "filter" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[filterName] = function(node, callback) {
      const result = [];
      this[forEachName](node, (n, a) => {
        if (callback(n, a)) result.push(n);
      });
      return result;
    };
    const reduceName = "reduce" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[reduceName] = function(node, callback, initialValue) {
      if (arguments.length < 3)
        throw new InvalidArgumentsGraphError(
          `Graph.${reduceName}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`
        );
      let accumulator = initialValue;
      this[forEachName](node, (n, a) => {
        accumulator = callback(accumulator, n, a);
      });
      return accumulator;
    };
  }
  function attachFindNeighbor(Class, description) {
    const { name, type, direction } = description;
    const capitalizedSingular = name[0].toUpperCase() + name.slice(1, -1);
    const findName = "find" + capitalizedSingular;
    Class.prototype[findName] = function(node, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type) return;
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError(
          `Graph.${findName}: could not find the "${node}" node in the graph.`
        );
      return forEachNeighbor(
        true,
        type === "mixed" ? this.type : type,
        direction,
        nodeData,
        callback
      );
    };
    const someName = "some" + capitalizedSingular;
    Class.prototype[someName] = function(node, callback) {
      const found = this[findName](node, callback);
      if (found) return true;
      return false;
    };
    const everyName = "every" + capitalizedSingular;
    Class.prototype[everyName] = function(node, callback) {
      const found = this[findName](node, (n, a) => {
        return !callback(n, a);
      });
      if (found) return false;
      return true;
    };
  }
  function attachNeighborIteratorCreator(Class, description) {
    const { name, type, direction } = description;
    const iteratorName = name.slice(0, -1) + "Entries";
    Class.prototype[iteratorName] = function(node) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return emptyIterator();
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError(
          `Graph.${iteratorName}: could not find the "${node}" node in the graph.`
        );
      return createNeighborIterator(
        type === "mixed" ? this.type : type,
        direction,
        nodeData
      );
    };
  }
  function attachNeighborIterationMethods(Graph2) {
    NEIGHBORS_ITERATION.forEach((description) => {
      attachNeighborArrayCreator(Graph2, description);
      attachForEachNeighbor(Graph2, description);
      attachFindNeighbor(Graph2, description);
      attachNeighborIteratorCreator(Graph2, description);
    });
  }
  function forEachAdjacency(breakable, assymetric, disconnectedNodes, graph2, callback) {
    const iterator = graph2._nodes.values();
    const type = graph2.type;
    let step, sourceData, neighbor, adj, edgeData, targetData, shouldBreak;
    while (step = iterator.next(), step.done !== true) {
      let hasEdges = false;
      sourceData = step.value;
      if (type !== "undirected") {
        adj = sourceData.out;
        for (neighbor in adj) {
          edgeData = adj[neighbor];
          do {
            targetData = edgeData.target;
            hasEdges = true;
            shouldBreak = callback(
              sourceData.key,
              targetData.key,
              sourceData.attributes,
              targetData.attributes,
              edgeData.key,
              edgeData.attributes,
              edgeData.undirected
            );
            if (breakable && shouldBreak) return edgeData;
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (type !== "directed") {
        adj = sourceData.undirected;
        for (neighbor in adj) {
          if (assymetric && sourceData.key > neighbor) continue;
          edgeData = adj[neighbor];
          do {
            targetData = edgeData.target;
            if (targetData.key !== neighbor) targetData = edgeData.source;
            hasEdges = true;
            shouldBreak = callback(
              sourceData.key,
              targetData.key,
              sourceData.attributes,
              targetData.attributes,
              edgeData.key,
              edgeData.attributes,
              edgeData.undirected
            );
            if (breakable && shouldBreak) return edgeData;
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (disconnectedNodes && !hasEdges) {
        shouldBreak = callback(
          sourceData.key,
          null,
          sourceData.attributes,
          null,
          null,
          null,
          null
        );
        if (breakable && shouldBreak) return null;
      }
    }
    return;
  }
  function serializeNode(key, data) {
    const serialized = { key };
    if (!isEmpty(data.attributes))
      serialized.attributes = assign({}, data.attributes);
    return serialized;
  }
  function serializeEdge(type, key, data) {
    const serialized = {
      key,
      source: data.source.key,
      target: data.target.key
    };
    if (!isEmpty(data.attributes))
      serialized.attributes = assign({}, data.attributes);
    if (type === "mixed" && data.undirected) serialized.undirected = true;
    return serialized;
  }
  function validateSerializedNode(value) {
    if (!isPlainObject(value))
      throw new InvalidArgumentsGraphError(
        'Graph.import: invalid serialized node. A serialized node should be a plain object with at least a "key" property.'
      );
    if (!("key" in value))
      throw new InvalidArgumentsGraphError(
        "Graph.import: serialized node is missing its key."
      );
    if ("attributes" in value && (!isPlainObject(value.attributes) || value.attributes === null))
      throw new InvalidArgumentsGraphError(
        "Graph.import: invalid attributes. Attributes should be a plain object, null or omitted."
      );
  }
  function validateSerializedEdge(value) {
    if (!isPlainObject(value))
      throw new InvalidArgumentsGraphError(
        'Graph.import: invalid serialized edge. A serialized edge should be a plain object with at least a "source" & "target" property.'
      );
    if (!("source" in value))
      throw new InvalidArgumentsGraphError(
        "Graph.import: serialized edge is missing its source."
      );
    if (!("target" in value))
      throw new InvalidArgumentsGraphError(
        "Graph.import: serialized edge is missing its target."
      );
    if ("attributes" in value && (!isPlainObject(value.attributes) || value.attributes === null))
      throw new InvalidArgumentsGraphError(
        "Graph.import: invalid attributes. Attributes should be a plain object, null or omitted."
      );
    if ("undirected" in value && typeof value.undirected !== "boolean")
      throw new InvalidArgumentsGraphError(
        "Graph.import: invalid undirectedness information. Undirected should be boolean or omitted."
      );
  }
  var INSTANCE_ID = incrementalIdStartingFromRandomByte();
  var TYPES = /* @__PURE__ */ new Set(["directed", "undirected", "mixed"]);
  var EMITTER_PROPS = /* @__PURE__ */ new Set([
    "domain",
    "_events",
    "_eventsCount",
    "_maxListeners"
  ]);
  var EDGE_ADD_METHODS = [
    {
      name: (verb) => `${verb}Edge`,
      generateKey: true
    },
    {
      name: (verb) => `${verb}DirectedEdge`,
      generateKey: true,
      type: "directed"
    },
    {
      name: (verb) => `${verb}UndirectedEdge`,
      generateKey: true,
      type: "undirected"
    },
    {
      name: (verb) => `${verb}EdgeWithKey`
    },
    {
      name: (verb) => `${verb}DirectedEdgeWithKey`,
      type: "directed"
    },
    {
      name: (verb) => `${verb}UndirectedEdgeWithKey`,
      type: "undirected"
    }
  ];
  var DEFAULTS = {
    allowSelfLoops: true,
    multi: false,
    type: "mixed"
  };
  function addNode(graph2, node, attributes) {
    if (attributes && !isPlainObject(attributes))
      throw new InvalidArgumentsGraphError(
        `Graph.addNode: invalid attributes. Expecting an object but got "${attributes}"`
      );
    node = "" + node;
    attributes = attributes || {};
    if (graph2._nodes.has(node))
      throw new UsageGraphError(
        `Graph.addNode: the "${node}" node already exist in the graph.`
      );
    const data = new graph2.NodeDataClass(node, attributes);
    graph2._nodes.set(node, data);
    graph2.emit("nodeAdded", {
      key: node,
      attributes
    });
    return data;
  }
  function unsafeAddNode(graph2, node, attributes) {
    const data = new graph2.NodeDataClass(node, attributes);
    graph2._nodes.set(node, data);
    graph2.emit("nodeAdded", {
      key: node,
      attributes
    });
    return data;
  }
  function addEdge(graph2, name, mustGenerateKey, undirected, edge, source, target, attributes) {
    if (!undirected && graph2.type === "undirected")
      throw new UsageGraphError(
        `Graph.${name}: you cannot add a directed edge to an undirected graph. Use the #.addEdge or #.addUndirectedEdge instead.`
      );
    if (undirected && graph2.type === "directed")
      throw new UsageGraphError(
        `Graph.${name}: you cannot add an undirected edge to a directed graph. Use the #.addEdge or #.addDirectedEdge instead.`
      );
    if (attributes && !isPlainObject(attributes))
      throw new InvalidArgumentsGraphError(
        `Graph.${name}: invalid attributes. Expecting an object but got "${attributes}"`
      );
    source = "" + source;
    target = "" + target;
    attributes = attributes || {};
    if (!graph2.allowSelfLoops && source === target)
      throw new UsageGraphError(
        `Graph.${name}: source & target are the same ("${source}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`
      );
    const sourceData = graph2._nodes.get(source), targetData = graph2._nodes.get(target);
    if (!sourceData)
      throw new NotFoundGraphError(
        `Graph.${name}: source node "${source}" not found.`
      );
    if (!targetData)
      throw new NotFoundGraphError(
        `Graph.${name}: target node "${target}" not found.`
      );
    const eventData = {
      key: null,
      undirected,
      source,
      target,
      attributes
    };
    if (mustGenerateKey) {
      edge = graph2._edgeKeyGenerator();
    } else {
      edge = "" + edge;
      if (graph2._edges.has(edge))
        throw new UsageGraphError(
          `Graph.${name}: the "${edge}" edge already exists in the graph.`
        );
    }
    if (!graph2.multi && (undirected ? typeof sourceData.undirected[target] !== "undefined" : typeof sourceData.out[target] !== "undefined")) {
      throw new UsageGraphError(
        `Graph.${name}: an edge linking "${source}" to "${target}" already exists. If you really want to add multiple edges linking those nodes, you should create a multi graph by using the 'multi' option.`
      );
    }
    const edgeData = new EdgeData(
      undirected,
      edge,
      sourceData,
      targetData,
      attributes
    );
    graph2._edges.set(edge, edgeData);
    const isSelfLoop = source === target;
    if (undirected) {
      sourceData.undirectedDegree++;
      targetData.undirectedDegree++;
      if (isSelfLoop) {
        sourceData.undirectedLoops++;
        graph2._undirectedSelfLoopCount++;
      }
    } else {
      sourceData.outDegree++;
      targetData.inDegree++;
      if (isSelfLoop) {
        sourceData.directedLoops++;
        graph2._directedSelfLoopCount++;
      }
    }
    if (graph2.multi) edgeData.attachMulti();
    else edgeData.attach();
    if (undirected) graph2._undirectedSize++;
    else graph2._directedSize++;
    eventData.key = edge;
    graph2.emit("edgeAdded", eventData);
    return edge;
  }
  function mergeEdge(graph2, name, mustGenerateKey, undirected, edge, source, target, attributes, asUpdater) {
    if (!undirected && graph2.type === "undirected")
      throw new UsageGraphError(
        `Graph.${name}: you cannot merge/update a directed edge to an undirected graph. Use the #.mergeEdge/#.updateEdge or #.addUndirectedEdge instead.`
      );
    if (undirected && graph2.type === "directed")
      throw new UsageGraphError(
        `Graph.${name}: you cannot merge/update an undirected edge to a directed graph. Use the #.mergeEdge/#.updateEdge or #.addDirectedEdge instead.`
      );
    if (attributes) {
      if (asUpdater) {
        if (typeof attributes !== "function")
          throw new InvalidArgumentsGraphError(
            `Graph.${name}: invalid updater function. Expecting a function but got "${attributes}"`
          );
      } else {
        if (!isPlainObject(attributes))
          throw new InvalidArgumentsGraphError(
            `Graph.${name}: invalid attributes. Expecting an object but got "${attributes}"`
          );
      }
    }
    source = "" + source;
    target = "" + target;
    let updater;
    if (asUpdater) {
      updater = attributes;
      attributes = void 0;
    }
    if (!graph2.allowSelfLoops && source === target)
      throw new UsageGraphError(
        `Graph.${name}: source & target are the same ("${source}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`
      );
    let sourceData = graph2._nodes.get(source);
    let targetData = graph2._nodes.get(target);
    let edgeData;
    let alreadyExistingEdgeData;
    if (!mustGenerateKey) {
      edgeData = graph2._edges.get(edge);
      if (edgeData) {
        if (edgeData.source.key !== source || edgeData.target.key !== target) {
          if (!undirected || edgeData.source.key !== target || edgeData.target.key !== source) {
            throw new UsageGraphError(
              `Graph.${name}: inconsistency detected when attempting to merge the "${edge}" edge with "${source}" source & "${target}" target vs. ("${edgeData.source.key}", "${edgeData.target.key}").`
            );
          }
        }
        alreadyExistingEdgeData = edgeData;
      }
    }
    if (!alreadyExistingEdgeData && !graph2.multi && sourceData) {
      alreadyExistingEdgeData = undirected ? sourceData.undirected[target] : sourceData.out[target];
    }
    if (alreadyExistingEdgeData) {
      const info = [alreadyExistingEdgeData.key, false, false, false];
      if (asUpdater ? !updater : !attributes) return info;
      if (asUpdater) {
        const oldAttributes = alreadyExistingEdgeData.attributes;
        alreadyExistingEdgeData.attributes = updater(oldAttributes);
        graph2.emit("edgeAttributesUpdated", {
          type: "replace",
          key: alreadyExistingEdgeData.key,
          attributes: alreadyExistingEdgeData.attributes
        });
      } else {
        assign(alreadyExistingEdgeData.attributes, attributes);
        graph2.emit("edgeAttributesUpdated", {
          type: "merge",
          key: alreadyExistingEdgeData.key,
          attributes: alreadyExistingEdgeData.attributes,
          data: attributes
        });
      }
      return info;
    }
    attributes = attributes || {};
    if (asUpdater && updater) attributes = updater(attributes);
    const eventData = {
      key: null,
      undirected,
      source,
      target,
      attributes
    };
    if (mustGenerateKey) {
      edge = graph2._edgeKeyGenerator();
    } else {
      edge = "" + edge;
      if (graph2._edges.has(edge))
        throw new UsageGraphError(
          `Graph.${name}: the "${edge}" edge already exists in the graph.`
        );
    }
    let sourceWasAdded = false;
    let targetWasAdded = false;
    if (!sourceData) {
      sourceData = unsafeAddNode(graph2, source, {});
      sourceWasAdded = true;
      if (source === target) {
        targetData = sourceData;
        targetWasAdded = true;
      }
    }
    if (!targetData) {
      targetData = unsafeAddNode(graph2, target, {});
      targetWasAdded = true;
    }
    edgeData = new EdgeData(undirected, edge, sourceData, targetData, attributes);
    graph2._edges.set(edge, edgeData);
    const isSelfLoop = source === target;
    if (undirected) {
      sourceData.undirectedDegree++;
      targetData.undirectedDegree++;
      if (isSelfLoop) {
        sourceData.undirectedLoops++;
        graph2._undirectedSelfLoopCount++;
      }
    } else {
      sourceData.outDegree++;
      targetData.inDegree++;
      if (isSelfLoop) {
        sourceData.directedLoops++;
        graph2._directedSelfLoopCount++;
      }
    }
    if (graph2.multi) edgeData.attachMulti();
    else edgeData.attach();
    if (undirected) graph2._undirectedSize++;
    else graph2._directedSize++;
    eventData.key = edge;
    graph2.emit("edgeAdded", eventData);
    return [edge, true, sourceWasAdded, targetWasAdded];
  }
  function dropEdgeFromData(graph2, edgeData) {
    graph2._edges.delete(edgeData.key);
    const { source: sourceData, target: targetData, attributes } = edgeData;
    const undirected = edgeData.undirected;
    const isSelfLoop = sourceData === targetData;
    if (undirected) {
      sourceData.undirectedDegree--;
      targetData.undirectedDegree--;
      if (isSelfLoop) {
        sourceData.undirectedLoops--;
        graph2._undirectedSelfLoopCount--;
      }
    } else {
      sourceData.outDegree--;
      targetData.inDegree--;
      if (isSelfLoop) {
        sourceData.directedLoops--;
        graph2._directedSelfLoopCount--;
      }
    }
    if (graph2.multi) edgeData.detachMulti();
    else edgeData.detach();
    if (undirected) graph2._undirectedSize--;
    else graph2._directedSize--;
    graph2.emit("edgeDropped", {
      key: edgeData.key,
      attributes,
      source: sourceData.key,
      target: targetData.key,
      undirected
    });
  }
  var Graph = class _Graph extends import_events.EventEmitter {
    constructor(options) {
      super();
      options = assign({}, DEFAULTS, options);
      if (typeof options.multi !== "boolean")
        throw new InvalidArgumentsGraphError(
          `Graph.constructor: invalid 'multi' option. Expecting a boolean but got "${options.multi}".`
        );
      if (!TYPES.has(options.type))
        throw new InvalidArgumentsGraphError(
          `Graph.constructor: invalid 'type' option. Should be one of "mixed", "directed" or "undirected" but got "${options.type}".`
        );
      if (typeof options.allowSelfLoops !== "boolean")
        throw new InvalidArgumentsGraphError(
          `Graph.constructor: invalid 'allowSelfLoops' option. Expecting a boolean but got "${options.allowSelfLoops}".`
        );
      const NodeDataClass = options.type === "mixed" ? MixedNodeData : options.type === "directed" ? DirectedNodeData : UndirectedNodeData;
      privateProperty(this, "NodeDataClass", NodeDataClass);
      const instancePrefix = "geid_" + INSTANCE_ID() + "_";
      let edgeId2 = 0;
      const edgeKeyGenerator = () => {
        let availableEdgeKey;
        do {
          availableEdgeKey = instancePrefix + edgeId2++;
        } while (this._edges.has(availableEdgeKey));
        return availableEdgeKey;
      };
      privateProperty(this, "_attributes", {});
      privateProperty(this, "_nodes", /* @__PURE__ */ new Map());
      privateProperty(this, "_edges", /* @__PURE__ */ new Map());
      privateProperty(this, "_directedSize", 0);
      privateProperty(this, "_undirectedSize", 0);
      privateProperty(this, "_directedSelfLoopCount", 0);
      privateProperty(this, "_undirectedSelfLoopCount", 0);
      privateProperty(this, "_edgeKeyGenerator", edgeKeyGenerator);
      privateProperty(this, "_options", options);
      EMITTER_PROPS.forEach((prop) => privateProperty(this, prop, this[prop]));
      readOnlyProperty(this, "order", () => this._nodes.size);
      readOnlyProperty(this, "size", () => this._edges.size);
      readOnlyProperty(this, "directedSize", () => this._directedSize);
      readOnlyProperty(this, "undirectedSize", () => this._undirectedSize);
      readOnlyProperty(
        this,
        "selfLoopCount",
        () => this._directedSelfLoopCount + this._undirectedSelfLoopCount
      );
      readOnlyProperty(
        this,
        "directedSelfLoopCount",
        () => this._directedSelfLoopCount
      );
      readOnlyProperty(
        this,
        "undirectedSelfLoopCount",
        () => this._undirectedSelfLoopCount
      );
      readOnlyProperty(this, "multi", this._options.multi);
      readOnlyProperty(this, "type", this._options.type);
      readOnlyProperty(this, "allowSelfLoops", this._options.allowSelfLoops);
      readOnlyProperty(this, "implementation", () => "graphology");
    }
    _resetInstanceCounters() {
      this._directedSize = 0;
      this._undirectedSize = 0;
      this._directedSelfLoopCount = 0;
      this._undirectedSelfLoopCount = 0;
    }
    /**---------------------------------------------------------------------------
     * Read
     **---------------------------------------------------------------------------
     */
    /**
     * Method returning whether the given node is found in the graph.
     *
     * @param  {any}     node - The node.
     * @return {boolean}
     */
    hasNode(node) {
      return this._nodes.has("" + node);
    }
    /**
     * Method returning whether the given directed edge is found in the graph.
     *
     * Arity 1:
     * @param  {any}     edge - The edge's key.
     *
     * Arity 2:
     * @param  {any}     source - The edge's source.
     * @param  {any}     target - The edge's target.
     *
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the arguments are invalid.
     */
    hasDirectedEdge(source, target) {
      if (this.type === "undirected") return false;
      if (arguments.length === 1) {
        const edge = "" + source;
        const edgeData = this._edges.get(edge);
        return !!edgeData && !edgeData.undirected;
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        const nodeData = this._nodes.get(source);
        if (!nodeData) return false;
        return nodeData.out.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError(
        `Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`
      );
    }
    /**
     * Method returning whether the given undirected edge is found in the graph.
     *
     * Arity 1:
     * @param  {any}     edge - The edge's key.
     *
     * Arity 2:
     * @param  {any}     source - The edge's source.
     * @param  {any}     target - The edge's target.
     *
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the arguments are invalid.
     */
    hasUndirectedEdge(source, target) {
      if (this.type === "directed") return false;
      if (arguments.length === 1) {
        const edge = "" + source;
        const edgeData = this._edges.get(edge);
        return !!edgeData && edgeData.undirected;
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        const nodeData = this._nodes.get(source);
        if (!nodeData) return false;
        return nodeData.undirected.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError(
        `Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`
      );
    }
    /**
     * Method returning whether the given edge is found in the graph.
     *
     * Arity 1:
     * @param  {any}     edge - The edge's key.
     *
     * Arity 2:
     * @param  {any}     source - The edge's source.
     * @param  {any}     target - The edge's target.
     *
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the arguments are invalid.
     */
    hasEdge(source, target) {
      if (arguments.length === 1) {
        const edge = "" + source;
        return this._edges.has(edge);
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        const nodeData = this._nodes.get(source);
        if (!nodeData) return false;
        return typeof nodeData.out !== "undefined" && nodeData.out.hasOwnProperty(target) || typeof nodeData.undirected !== "undefined" && nodeData.undirected.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError(
        `Graph.hasEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`
      );
    }
    /**
     * Method returning the edge matching source & target in a directed fashion.
     *
     * @param  {any} source - The edge's source.
     * @param  {any} target - The edge's target.
     *
     * @return {any|undefined}
     *
     * @throws {Error} - Will throw if the graph is multi.
     * @throws {Error} - Will throw if source or target doesn't exist.
     */
    directedEdge(source, target) {
      if (this.type === "undirected") return;
      source = "" + source;
      target = "" + target;
      if (this.multi)
        throw new UsageGraphError(
          "Graph.directedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.directedEdges instead."
        );
      const sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError(
          `Graph.directedEdge: could not find the "${source}" source node in the graph.`
        );
      if (!this._nodes.has(target))
        throw new NotFoundGraphError(
          `Graph.directedEdge: could not find the "${target}" target node in the graph.`
        );
      const edgeData = sourceData.out && sourceData.out[target] || void 0;
      if (edgeData) return edgeData.key;
    }
    /**
     * Method returning the edge matching source & target in a undirected fashion.
     *
     * @param  {any} source - The edge's source.
     * @param  {any} target - The edge's target.
     *
     * @return {any|undefined}
     *
     * @throws {Error} - Will throw if the graph is multi.
     * @throws {Error} - Will throw if source or target doesn't exist.
     */
    undirectedEdge(source, target) {
      if (this.type === "directed") return;
      source = "" + source;
      target = "" + target;
      if (this.multi)
        throw new UsageGraphError(
          "Graph.undirectedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.undirectedEdges instead."
        );
      const sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError(
          `Graph.undirectedEdge: could not find the "${source}" source node in the graph.`
        );
      if (!this._nodes.has(target))
        throw new NotFoundGraphError(
          `Graph.undirectedEdge: could not find the "${target}" target node in the graph.`
        );
      const edgeData = sourceData.undirected && sourceData.undirected[target] || void 0;
      if (edgeData) return edgeData.key;
    }
    /**
     * Method returning the edge matching source & target in a mixed fashion.
     *
     * @param  {any} source - The edge's source.
     * @param  {any} target - The edge's target.
     *
     * @return {any|undefined}
     *
     * @throws {Error} - Will throw if the graph is multi.
     * @throws {Error} - Will throw if source or target doesn't exist.
     */
    edge(source, target) {
      if (this.multi)
        throw new UsageGraphError(
          "Graph.edge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.edges instead."
        );
      source = "" + source;
      target = "" + target;
      const sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError(
          `Graph.edge: could not find the "${source}" source node in the graph.`
        );
      if (!this._nodes.has(target))
        throw new NotFoundGraphError(
          `Graph.edge: could not find the "${target}" target node in the graph.`
        );
      const edgeData = sourceData.out && sourceData.out[target] || sourceData.undirected && sourceData.undirected[target] || void 0;
      if (edgeData) return edgeData.key;
    }
    /**
     * Method returning whether two nodes are directed neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areDirectedNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areDirectedNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return false;
      return neighbor in nodeData.in || neighbor in nodeData.out;
    }
    /**
     * Method returning whether two nodes are out neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areOutNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areOutNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return false;
      return neighbor in nodeData.out;
    }
    /**
     * Method returning whether two nodes are in neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areInNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areInNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return false;
      return neighbor in nodeData.in;
    }
    /**
     * Method returning whether two nodes are undirected neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areUndirectedNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areUndirectedNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type === "directed") return false;
      return neighbor in nodeData.undirected;
    }
    /**
     * Method returning whether two nodes are neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type !== "undirected") {
        if (neighbor in nodeData.in || neighbor in nodeData.out) return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected) return true;
      }
      return false;
    }
    /**
     * Method returning whether two nodes are inbound neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areInboundNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areInboundNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type !== "undirected") {
        if (neighbor in nodeData.in) return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected) return true;
      }
      return false;
    }
    /**
     * Method returning whether two nodes are outbound neighbors.
     *
     * @param  {any}     node     - The node's key.
     * @param  {any}     neighbor - The neighbor's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    areOutboundNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.areOutboundNeighbors: could not find the "${node}" node in the graph.`
        );
      if (this.type !== "undirected") {
        if (neighbor in nodeData.out) return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected) return true;
      }
      return false;
    }
    /**
     * Method returning the given node's in degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    inDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.inDegree: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.inDegree;
    }
    /**
     * Method returning the given node's out degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    outDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.outDegree: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.outDegree;
    }
    /**
     * Method returning the given node's directed degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    directedDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.directedDegree: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.inDegree + nodeData.outDegree;
    }
    /**
     * Method returning the given node's undirected degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    undirectedDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.undirectedDegree: could not find the "${node}" node in the graph.`
        );
      if (this.type === "directed") return 0;
      return nodeData.undirectedDegree;
    }
    /**
     * Method returning the given node's inbound degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's inbound degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    inboundDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.inboundDegree: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree;
      }
      return degree;
    }
    /**
     * Method returning the given node's outbound degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's outbound degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    outboundDegree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.outboundDegree: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.outDegree;
      }
      return degree;
    }
    /**
     * Method returning the given node's directed degree.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    degree(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.degree: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree + nodeData.outDegree;
      }
      return degree;
    }
    /**
     * Method returning the given node's in degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    inDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.inDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.inDegree - nodeData.directedLoops;
    }
    /**
     * Method returning the given node's out degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    outDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.outDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.outDegree - nodeData.directedLoops;
    }
    /**
     * Method returning the given node's directed degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    directedDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.directedDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      if (this.type === "undirected") return 0;
      return nodeData.inDegree + nodeData.outDegree - nodeData.directedLoops * 2;
    }
    /**
     * Method returning the given node's undirected degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's in degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    undirectedDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.undirectedDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      if (this.type === "directed") return 0;
      return nodeData.undirectedDegree - nodeData.undirectedLoops * 2;
    }
    /**
     * Method returning the given node's inbound degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's inbound degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    inboundDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.inboundDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      let loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree;
        loops += nodeData.directedLoops;
      }
      return degree - loops;
    }
    /**
     * Method returning the given node's outbound degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's outbound degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    outboundDegreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.outboundDegreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      let loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.outDegree;
        loops += nodeData.directedLoops;
      }
      return degree - loops;
    }
    /**
     * Method returning the given node's directed degree without considering self loops.
     *
     * @param  {any}     node - The node's key.
     * @return {number}       - The node's degree.
     *
     * @throws {Error} - Will throw if the node isn't in the graph.
     */
    degreeWithoutSelfLoops(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.degreeWithoutSelfLoops: could not find the "${node}" node in the graph.`
        );
      let degree = 0;
      let loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree + nodeData.outDegree;
        loops += nodeData.directedLoops * 2;
      }
      return degree - loops;
    }
    /**
     * Method returning the given edge's source.
     *
     * @param  {any} edge - The edge's key.
     * @return {any}      - The edge's source.
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    source(edge) {
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.source: could not find the "${edge}" edge in the graph.`
        );
      return data.source.key;
    }
    /**
     * Method returning the given edge's target.
     *
     * @param  {any} edge - The edge's key.
     * @return {any}      - The edge's target.
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    target(edge) {
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.target: could not find the "${edge}" edge in the graph.`
        );
      return data.target.key;
    }
    /**
     * Method returning the given edge's extremities.
     *
     * @param  {any}   edge - The edge's key.
     * @return {array}      - The edge's extremities.
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    extremities(edge) {
      edge = "" + edge;
      const edgeData = this._edges.get(edge);
      if (!edgeData)
        throw new NotFoundGraphError(
          `Graph.extremities: could not find the "${edge}" edge in the graph.`
        );
      return [edgeData.source.key, edgeData.target.key];
    }
    /**
     * Given a node & an edge, returns the other extremity of the edge.
     *
     * @param  {any}   node - The node's key.
     * @param  {any}   edge - The edge's key.
     * @return {any}        - The related node.
     *
     * @throws {Error} - Will throw if the edge isn't in the graph or if the
     *                   edge & node are not related.
     */
    opposite(node, edge) {
      node = "" + node;
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.opposite: could not find the "${edge}" edge in the graph.`
        );
      const source = data.source.key;
      const target = data.target.key;
      if (node === source) return target;
      if (node === target) return source;
      throw new NotFoundGraphError(
        `Graph.opposite: the "${node}" node is not attached to the "${edge}" edge (${source}, ${target}).`
      );
    }
    /**
     * Returns whether the given edge has the given node as extremity.
     *
     * @param  {any}     edge - The edge's key.
     * @param  {any}     node - The node's key.
     * @return {boolean}      - The related node.
     *
     * @throws {Error} - Will throw if either the node or the edge isn't in the graph.
     */
    hasExtremity(edge, node) {
      edge = "" + edge;
      node = "" + node;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.hasExtremity: could not find the "${edge}" edge in the graph.`
        );
      return data.source.key === node || data.target.key === node;
    }
    /**
     * Method returning whether the given edge is undirected.
     *
     * @param  {any}     edge - The edge's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    isUndirected(edge) {
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.isUndirected: could not find the "${edge}" edge in the graph.`
        );
      return data.undirected;
    }
    /**
     * Method returning whether the given edge is directed.
     *
     * @param  {any}     edge - The edge's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    isDirected(edge) {
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.isDirected: could not find the "${edge}" edge in the graph.`
        );
      return !data.undirected;
    }
    /**
     * Method returning whether the given edge is a self loop.
     *
     * @param  {any}     edge - The edge's key.
     * @return {boolean}
     *
     * @throws {Error} - Will throw if the edge isn't in the graph.
     */
    isSelfLoop(edge) {
      edge = "" + edge;
      const data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError(
          `Graph.isSelfLoop: could not find the "${edge}" edge in the graph.`
        );
      return data.source === data.target;
    }
    /**---------------------------------------------------------------------------
     * Mutation
     **---------------------------------------------------------------------------
     */
    /**
     * Method used to add a node to the graph.
     *
     * @param  {any}    node         - The node.
     * @param  {object} [attributes] - Optional attributes.
     * @return {any}                 - The node.
     *
     * @throws {Error} - Will throw if the given node already exist.
     * @throws {Error} - Will throw if the given attributes are not an object.
     */
    addNode(node, attributes) {
      const nodeData = addNode(this, node, attributes);
      return nodeData.key;
    }
    /**
     * Method used to merge a node into the graph.
     *
     * @param  {any}    node         - The node.
     * @param  {object} [attributes] - Optional attributes.
     * @return {any}                 - The node.
     */
    mergeNode(node, attributes) {
      if (attributes && !isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          `Graph.mergeNode: invalid attributes. Expecting an object but got "${attributes}"`
        );
      node = "" + node;
      attributes = attributes || {};
      let data = this._nodes.get(node);
      if (data) {
        if (attributes) {
          assign(data.attributes, attributes);
          this.emit("nodeAttributesUpdated", {
            type: "merge",
            key: node,
            attributes: data.attributes,
            data: attributes
          });
        }
        return [node, false];
      }
      data = new this.NodeDataClass(node, attributes);
      this._nodes.set(node, data);
      this.emit("nodeAdded", {
        key: node,
        attributes
      });
      return [node, true];
    }
    /**
     * Method used to add a node if it does not exist in the graph or else to
     * update its attributes using a function.
     *
     * @param  {any}      node      - The node.
     * @param  {function} [updater] - Optional updater function.
     * @return {any}                - The node.
     */
    updateNode(node, updater) {
      if (updater && typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          `Graph.updateNode: invalid updater function. Expecting a function but got "${updater}"`
        );
      node = "" + node;
      let data = this._nodes.get(node);
      if (data) {
        if (updater) {
          const oldAttributes = data.attributes;
          data.attributes = updater(oldAttributes);
          this.emit("nodeAttributesUpdated", {
            type: "replace",
            key: node,
            attributes: data.attributes
          });
        }
        return [node, false];
      }
      const attributes = updater ? updater({}) : {};
      data = new this.NodeDataClass(node, attributes);
      this._nodes.set(node, data);
      this.emit("nodeAdded", {
        key: node,
        attributes
      });
      return [node, true];
    }
    /**
     * Method used to drop a single node & all its attached edges from the graph.
     *
     * @param  {any}    node - The node.
     * @return {Graph}
     *
     * @throws {Error} - Will throw if the node doesn't exist.
     */
    dropNode(node) {
      node = "" + node;
      const nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError(
          `Graph.dropNode: could not find the "${node}" node in the graph.`
        );
      let edgeData;
      if (this.type !== "undirected") {
        for (const neighbor in nodeData.out) {
          edgeData = nodeData.out[neighbor];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
        for (const neighbor in nodeData.in) {
          edgeData = nodeData.in[neighbor];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (this.type !== "directed") {
        for (const neighbor in nodeData.undirected) {
          edgeData = nodeData.undirected[neighbor];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      this._nodes.delete(node);
      this.emit("nodeDropped", {
        key: node,
        attributes: nodeData.attributes
      });
    }
    /**
     * Method used to drop a single edge from the graph.
     *
     * Arity 1:
     * @param  {any}    edge - The edge.
     *
     * Arity 2:
     * @param  {any}    source - Source node.
     * @param  {any}    target - Target node.
     *
     * @return {Graph}
     *
     * @throws {Error} - Will throw if the edge doesn't exist.
     */
    dropEdge(edge) {
      let edgeData;
      if (arguments.length > 1) {
        const source = "" + arguments[0];
        const target = "" + arguments[1];
        edgeData = getMatchingEdge(this, source, target, this.type);
        if (!edgeData)
          throw new NotFoundGraphError(
            `Graph.dropEdge: could not find the "${source}" -> "${target}" edge in the graph.`
          );
      } else {
        edge = "" + edge;
        edgeData = this._edges.get(edge);
        if (!edgeData)
          throw new NotFoundGraphError(
            `Graph.dropEdge: could not find the "${edge}" edge in the graph.`
          );
      }
      dropEdgeFromData(this, edgeData);
      return this;
    }
    /**
     * Method used to drop a single directed edge from the graph.
     *
     * @param  {any}    source - Source node.
     * @param  {any}    target - Target node.
     *
     * @return {Graph}
     *
     * @throws {Error} - Will throw if the edge doesn't exist.
     */
    dropDirectedEdge(source, target) {
      if (arguments.length < 2)
        throw new UsageGraphError(
          "Graph.dropDirectedEdge: it does not make sense to try and drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead."
        );
      if (this.multi)
        throw new UsageGraphError(
          "Graph.dropDirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones."
        );
      source = "" + source;
      target = "" + target;
      const edgeData = getMatchingEdge(this, source, target, "directed");
      if (!edgeData)
        throw new NotFoundGraphError(
          `Graph.dropDirectedEdge: could not find a "${source}" -> "${target}" edge in the graph.`
        );
      dropEdgeFromData(this, edgeData);
      return this;
    }
    /**
     * Method used to drop a single undirected edge from the graph.
     *
     * @param  {any}    source - Source node.
     * @param  {any}    target - Target node.
     *
     * @return {Graph}
     *
     * @throws {Error} - Will throw if the edge doesn't exist.
     */
    dropUndirectedEdge(source, target) {
      if (arguments.length < 2)
        throw new UsageGraphError(
          "Graph.dropUndirectedEdge: it does not make sense to drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead."
        );
      if (this.multi)
        throw new UsageGraphError(
          "Graph.dropUndirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones."
        );
      const edgeData = getMatchingEdge(this, source, target, "undirected");
      if (!edgeData)
        throw new NotFoundGraphError(
          `Graph.dropUndirectedEdge: could not find a "${source}" -> "${target}" edge in the graph.`
        );
      dropEdgeFromData(this, edgeData);
      return this;
    }
    /**
     * Method used to remove every edge & every node from the graph.
     *
     * @return {Graph}
     */
    clear() {
      this._edges.clear();
      this._nodes.clear();
      this._resetInstanceCounters();
      this.emit("cleared");
    }
    /**
     * Method used to remove every edge from the graph.
     *
     * @return {Graph}
     */
    clearEdges() {
      const iterator = this._nodes.values();
      let step;
      while (step = iterator.next(), step.done !== true) {
        step.value.clear();
      }
      this._edges.clear();
      this._resetInstanceCounters();
      this.emit("edgesCleared");
    }
    /**---------------------------------------------------------------------------
     * Attributes-related methods
     **---------------------------------------------------------------------------
     */
    /**
     * Method returning the desired graph's attribute.
     *
     * @param  {string} name - Name of the attribute.
     * @return {any}
     */
    getAttribute(name) {
      return this._attributes[name];
    }
    /**
     * Method returning the graph's attributes.
     *
     * @return {object}
     */
    getAttributes() {
      return this._attributes;
    }
    /**
     * Method returning whether the graph has the desired attribute.
     *
     * @param  {string}  name - Name of the attribute.
     * @return {boolean}
     */
    hasAttribute(name) {
      return this._attributes.hasOwnProperty(name);
    }
    /**
     * Method setting a value for the desired graph's attribute.
     *
     * @param  {string}  name  - Name of the attribute.
     * @param  {any}     value - Value for the attribute.
     * @return {Graph}
     */
    setAttribute(name, value) {
      this._attributes[name] = value;
      this.emit("attributesUpdated", {
        type: "set",
        attributes: this._attributes,
        name
      });
      return this;
    }
    /**
     * Method using a function to update the desired graph's attribute's value.
     *
     * @param  {string}   name    - Name of the attribute.
     * @param  {function} updater - Function use to update the attribute's value.
     * @return {Graph}
     */
    updateAttribute(name, updater) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.updateAttribute: updater should be a function."
        );
      const value = this._attributes[name];
      this._attributes[name] = updater(value);
      this.emit("attributesUpdated", {
        type: "set",
        attributes: this._attributes,
        name
      });
      return this;
    }
    /**
     * Method removing the desired graph's attribute.
     *
     * @param  {string} name  - Name of the attribute.
     * @return {Graph}
     */
    removeAttribute(name) {
      delete this._attributes[name];
      this.emit("attributesUpdated", {
        type: "remove",
        attributes: this._attributes,
        name
      });
      return this;
    }
    /**
     * Method replacing the graph's attributes.
     *
     * @param  {object} attributes - New attributes.
     * @return {Graph}
     *
     * @throws {Error} - Will throw if given attributes are not a plain object.
     */
    replaceAttributes(attributes) {
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          "Graph.replaceAttributes: provided attributes are not a plain object."
        );
      this._attributes = attributes;
      this.emit("attributesUpdated", {
        type: "replace",
        attributes: this._attributes
      });
      return this;
    }
    /**
     * Method merging the graph's attributes.
     *
     * @param  {object} attributes - Attributes to merge.
     * @return {Graph}
     *
     * @throws {Error} - Will throw if given attributes are not a plain object.
     */
    mergeAttributes(attributes) {
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError(
          "Graph.mergeAttributes: provided attributes are not a plain object."
        );
      assign(this._attributes, attributes);
      this.emit("attributesUpdated", {
        type: "merge",
        attributes: this._attributes,
        data: attributes
      });
      return this;
    }
    /**
     * Method updating the graph's attributes.
     *
     * @param  {function} updater - Function used to update the attributes.
     * @return {Graph}
     *
     * @throws {Error} - Will throw if given updater is not a function.
     */
    updateAttributes(updater) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.updateAttributes: provided updater is not a function."
        );
      this._attributes = updater(this._attributes);
      this.emit("attributesUpdated", {
        type: "update",
        attributes: this._attributes
      });
      return this;
    }
    /**
     * Method used to update each node's attributes using the given function.
     *
     * @param {function}  updater - Updater function to use.
     * @param {object}    [hints] - Optional hints.
     */
    updateEachNodeAttributes(updater, hints) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.updateEachNodeAttributes: expecting an updater function."
        );
      if (hints && !validateHints(hints))
        throw new InvalidArgumentsGraphError(
          "Graph.updateEachNodeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}"
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        nodeData.attributes = updater(nodeData.key, nodeData.attributes);
      }
      this.emit("eachNodeAttributesUpdated", {
        hints: hints ? hints : null
      });
    }
    /**
     * Method used to update each edge's attributes using the given function.
     *
     * @param {function}  updater - Updater function to use.
     * @param {object}    [hints] - Optional hints.
     */
    updateEachEdgeAttributes(updater, hints) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.updateEachEdgeAttributes: expecting an updater function."
        );
      if (hints && !validateHints(hints))
        throw new InvalidArgumentsGraphError(
          "Graph.updateEachEdgeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}"
        );
      const iterator = this._edges.values();
      let step, edgeData, sourceData, targetData;
      while (step = iterator.next(), step.done !== true) {
        edgeData = step.value;
        sourceData = edgeData.source;
        targetData = edgeData.target;
        edgeData.attributes = updater(
          edgeData.key,
          edgeData.attributes,
          sourceData.key,
          targetData.key,
          sourceData.attributes,
          targetData.attributes,
          edgeData.undirected
        );
      }
      this.emit("eachEdgeAttributesUpdated", {
        hints: hints ? hints : null
      });
    }
    /**---------------------------------------------------------------------------
     * Iteration-related methods
     **---------------------------------------------------------------------------
     */
    /**
     * Method iterating over the graph's adjacency using the given callback.
     *
     * @param  {function}  callback - Callback to use.
     */
    forEachAdjacencyEntry(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.forEachAdjacencyEntry: expecting a callback."
        );
      forEachAdjacency(false, false, false, this, callback);
    }
    forEachAdjacencyEntryWithOrphans(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.forEachAdjacencyEntryWithOrphans: expecting a callback."
        );
      forEachAdjacency(false, false, true, this, callback);
    }
    /**
     * Method iterating over the graph's assymetric adjacency using the given callback.
     *
     * @param  {function}  callback - Callback to use.
     */
    forEachAssymetricAdjacencyEntry(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.forEachAssymetricAdjacencyEntry: expecting a callback."
        );
      forEachAdjacency(false, true, false, this, callback);
    }
    forEachAssymetricAdjacencyEntryWithOrphans(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.forEachAssymetricAdjacencyEntryWithOrphans: expecting a callback."
        );
      forEachAdjacency(false, true, true, this, callback);
    }
    /**
     * Method returning the list of the graph's nodes.
     *
     * @return {array} - The nodes.
     */
    nodes() {
      return Array.from(this._nodes.keys());
    }
    /**
     * Method iterating over the graph's nodes using the given callback.
     *
     * @param  {function}  callback - Callback (key, attributes, index).
     */
    forEachNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.forEachNode: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        callback(nodeData.key, nodeData.attributes);
      }
    }
    /**
     * Method iterating attempting to find a node matching the given predicate
     * function.
     *
     * @param  {function}  callback - Callback (key, attributes).
     */
    findNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.findNode: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes)) return nodeData.key;
      }
      return;
    }
    /**
     * Method mapping nodes.
     *
     * @param  {function}  callback - Callback (key, attributes).
     */
    mapNodes(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.mapNode: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      const result = new Array(this.order);
      let i = 0;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        result[i++] = callback(nodeData.key, nodeData.attributes);
      }
      return result;
    }
    /**
     * Method returning whether some node verify the given predicate.
     *
     * @param  {function}  callback - Callback (key, attributes).
     */
    someNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.someNode: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes)) return true;
      }
      return false;
    }
    /**
     * Method returning whether all node verify the given predicate.
     *
     * @param  {function}  callback - Callback (key, attributes).
     */
    everyNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.everyNode: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (!callback(nodeData.key, nodeData.attributes)) return false;
      }
      return true;
    }
    /**
     * Method filtering nodes.
     *
     * @param  {function}  callback - Callback (key, attributes).
     */
    filterNodes(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.filterNodes: expecting a callback."
        );
      const iterator = this._nodes.values();
      let step, nodeData;
      const result = [];
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes))
          result.push(nodeData.key);
      }
      return result;
    }
    /**
     * Method reducing nodes.
     *
     * @param  {function}  callback - Callback (accumulator, key, attributes).
     */
    reduceNodes(callback, initialValue) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError(
          "Graph.reduceNodes: expecting a callback."
        );
      if (arguments.length < 2)
        throw new InvalidArgumentsGraphError(
          "Graph.reduceNodes: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array."
        );
      let accumulator = initialValue;
      const iterator = this._nodes.values();
      let step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        accumulator = callback(accumulator, nodeData.key, nodeData.attributes);
      }
      return accumulator;
    }
    /**
     * Method returning an iterator over the graph's node entries.
     *
     * @return {Iterator}
     */
    nodeEntries() {
      const iterator = this._nodes.values();
      return {
        [Symbol.iterator]() {
          return this;
        },
        next() {
          const step = iterator.next();
          if (step.done) return step;
          const data = step.value;
          return {
            value: { node: data.key, attributes: data.attributes },
            done: false
          };
        }
      };
    }
    /**---------------------------------------------------------------------------
     * Serialization
     **---------------------------------------------------------------------------
     */
    /**
     * Method used to export the whole graph.
     *
     * @return {object} - The serialized graph.
     */
    export() {
      const nodes = new Array(this._nodes.size);
      let i = 0;
      this._nodes.forEach((data, key) => {
        nodes[i++] = serializeNode(key, data);
      });
      const edges = new Array(this._edges.size);
      i = 0;
      this._edges.forEach((data, key) => {
        edges[i++] = serializeEdge(this.type, key, data);
      });
      return {
        options: {
          type: this.type,
          multi: this.multi,
          allowSelfLoops: this.allowSelfLoops
        },
        attributes: this.getAttributes(),
        nodes,
        edges
      };
    }
    /**
     * Method used to import a serialized graph.
     *
     * @param  {object|Graph} data  - The serialized graph.
     * @param  {boolean}      merge - Whether to merge data.
     * @return {Graph}              - Returns itself for chaining.
     */
    import(data, merge = false) {
      if (data instanceof _Graph) {
        data.forEachNode((n, a) => {
          if (merge) this.mergeNode(n, a);
          else this.addNode(n, a);
        });
        data.forEachEdge((e, a, s, t, _sa, _ta, u) => {
          if (merge) {
            if (u) this.mergeUndirectedEdgeWithKey(e, s, t, a);
            else this.mergeDirectedEdgeWithKey(e, s, t, a);
          } else {
            if (u) this.addUndirectedEdgeWithKey(e, s, t, a);
            else this.addDirectedEdgeWithKey(e, s, t, a);
          }
        });
        return this;
      }
      if (!isPlainObject(data))
        throw new InvalidArgumentsGraphError(
          "Graph.import: invalid argument. Expecting a serialized graph or, alternatively, a Graph instance."
        );
      if (data.attributes) {
        if (!isPlainObject(data.attributes))
          throw new InvalidArgumentsGraphError(
            "Graph.import: invalid attributes. Expecting a plain object."
          );
        if (merge) this.mergeAttributes(data.attributes);
        else this.replaceAttributes(data.attributes);
      }
      let i, l, list, node, edge;
      if (data.nodes) {
        list = data.nodes;
        if (!Array.isArray(list))
          throw new InvalidArgumentsGraphError(
            "Graph.import: invalid nodes. Expecting an array."
          );
        for (i = 0, l = list.length; i < l; i++) {
          node = list[i];
          validateSerializedNode(node);
          const { key, attributes } = node;
          if (merge) this.mergeNode(key, attributes);
          else this.addNode(key, attributes);
        }
      }
      if (data.edges) {
        let undirectedByDefault = false;
        if (this.type === "undirected") {
          undirectedByDefault = true;
        }
        list = data.edges;
        if (!Array.isArray(list))
          throw new InvalidArgumentsGraphError(
            "Graph.import: invalid edges. Expecting an array."
          );
        for (i = 0, l = list.length; i < l; i++) {
          edge = list[i];
          validateSerializedEdge(edge);
          const {
            source,
            target,
            attributes,
            undirected = undirectedByDefault
          } = edge;
          let method;
          if ("key" in edge) {
            method = merge ? undirected ? this.mergeUndirectedEdgeWithKey : this.mergeDirectedEdgeWithKey : undirected ? this.addUndirectedEdgeWithKey : this.addDirectedEdgeWithKey;
            method.call(this, edge.key, source, target, attributes);
          } else {
            method = merge ? undirected ? this.mergeUndirectedEdge : this.mergeDirectedEdge : undirected ? this.addUndirectedEdge : this.addDirectedEdge;
            method.call(this, source, target, attributes);
          }
        }
      }
      return this;
    }
    /**---------------------------------------------------------------------------
     * Utils
     **---------------------------------------------------------------------------
     */
    /**
     * Method returning a null copy of the graph, i.e. a graph without nodes
     * & edges but with the exact same options.
     *
     * @param  {object} options - Options to merge with the current ones.
     * @return {Graph}          - The null copy.
     */
    nullCopy(options) {
      const graph2 = new _Graph(assign({}, this._options, options));
      graph2.replaceAttributes(assign({}, this.getAttributes()));
      return graph2;
    }
    /**
     * Method returning an empty copy of the graph, i.e. a graph without edges but
     * with the exact same options.
     *
     * @param  {object} options - Options to merge with the current ones.
     * @return {Graph}          - The empty copy.
     */
    emptyCopy(options) {
      const graph2 = this.nullCopy(options);
      this._nodes.forEach((nodeData, key) => {
        const attributes = assign({}, nodeData.attributes);
        nodeData = new graph2.NodeDataClass(key, attributes);
        graph2._nodes.set(key, nodeData);
      });
      return graph2;
    }
    /**
     * Method returning an exact copy of the graph.
     *
     * @param  {object} options - Upgrade options.
     * @return {Graph}          - The copy.
     */
    copy(options) {
      options = options || {};
      if (typeof options.type === "string" && options.type !== this.type && options.type !== "mixed")
        throw new UsageGraphError(
          `Graph.copy: cannot create an incompatible copy from "${this.type}" type to "${options.type}" because this would mean losing information about the current graph.`
        );
      if (typeof options.multi === "boolean" && options.multi !== this.multi && options.multi !== true)
        throw new UsageGraphError(
          "Graph.copy: cannot create an incompatible copy by downgrading a multi graph to a simple one because this would mean losing information about the current graph."
        );
      if (typeof options.allowSelfLoops === "boolean" && options.allowSelfLoops !== this.allowSelfLoops && options.allowSelfLoops !== true)
        throw new UsageGraphError(
          "Graph.copy: cannot create an incompatible copy from a graph allowing self loops to one that does not because this would mean losing information about the current graph."
        );
      const graph2 = this.emptyCopy(options);
      const iterator = this._edges.values();
      let step, edgeData;
      while (step = iterator.next(), step.done !== true) {
        edgeData = step.value;
        addEdge(
          graph2,
          "copy",
          false,
          edgeData.undirected,
          edgeData.key,
          edgeData.source.key,
          edgeData.target.key,
          assign({}, edgeData.attributes)
        );
      }
      return graph2;
    }
    /**---------------------------------------------------------------------------
     * Known methods
     **---------------------------------------------------------------------------
     */
    /**
     * Method used by JavaScript to perform JSON serialization.
     *
     * @return {object} - The serialized graph.
     */
    toJSON() {
      return this.export();
    }
    /**
     * Method returning [object Graph].
     */
    toString() {
      return "[object Graph]";
    }
    /**
     * Method used internally by node's console to display a custom object.
     *
     * @return {object} - Formatted object representation of the graph.
     */
    inspect() {
      const nodes = {};
      this._nodes.forEach((data, key) => {
        nodes[key] = data.attributes;
      });
      const edges = {}, multiIndex = {};
      this._edges.forEach((data, key) => {
        const direction = data.undirected ? "--" : "->";
        let label = "";
        let source = data.source.key;
        let target = data.target.key;
        let tmp;
        if (data.undirected && source > target) {
          tmp = source;
          source = target;
          target = tmp;
        }
        const desc = `(${source})${direction}(${target})`;
        if (!key.startsWith("geid_")) {
          label += `[${key}]: `;
        } else if (this.multi) {
          if (typeof multiIndex[desc] === "undefined") {
            multiIndex[desc] = 0;
          } else {
            multiIndex[desc]++;
          }
          label += `${multiIndex[desc]}. `;
        }
        label += desc;
        edges[label] = data.attributes;
      });
      const dummy = {};
      for (const k in this) {
        if (this.hasOwnProperty(k) && !EMITTER_PROPS.has(k) && typeof this[k] !== "function" && typeof k !== "symbol")
          dummy[k] = this[k];
      }
      dummy.attributes = this._attributes;
      dummy.nodes = nodes;
      dummy.edges = edges;
      privateProperty(dummy, "constructor", this.constructor);
      return dummy;
    }
  };
  if (typeof Symbol !== "undefined")
    Graph.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = Graph.prototype.inspect;
  EDGE_ADD_METHODS.forEach((method) => {
    ["add", "merge", "update"].forEach((verb) => {
      const name = method.name(verb);
      const fn = verb === "add" ? addEdge : mergeEdge;
      if (method.generateKey) {
        Graph.prototype[name] = function(source, target, attributes) {
          return fn(
            this,
            name,
            true,
            (method.type || this.type) === "undirected",
            null,
            source,
            target,
            attributes,
            verb === "update"
          );
        };
      } else {
        Graph.prototype[name] = function(edge, source, target, attributes) {
          return fn(
            this,
            name,
            false,
            (method.type || this.type) === "undirected",
            edge,
            source,
            target,
            attributes,
            verb === "update"
          );
        };
      }
    });
  });
  attachNodeAttributesMethods(Graph);
  attachEdgeAttributesMethods(Graph);
  attachEdgeIterationMethods(Graph);
  attachNeighborIterationMethods(Graph);
  var DirectedGraph = class extends Graph {
    constructor(options) {
      const finalOptions = assign({ type: "directed" }, options);
      if ("multi" in finalOptions && finalOptions.multi !== false)
        throw new InvalidArgumentsGraphError(
          "DirectedGraph.from: inconsistent indication that the graph should be multi in given options!"
        );
      if (finalOptions.type !== "directed")
        throw new InvalidArgumentsGraphError(
          'DirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!'
        );
      super(finalOptions);
    }
  };
  var UndirectedGraph = class extends Graph {
    constructor(options) {
      const finalOptions = assign({ type: "undirected" }, options);
      if ("multi" in finalOptions && finalOptions.multi !== false)
        throw new InvalidArgumentsGraphError(
          "UndirectedGraph.from: inconsistent indication that the graph should be multi in given options!"
        );
      if (finalOptions.type !== "undirected")
        throw new InvalidArgumentsGraphError(
          'UndirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!'
        );
      super(finalOptions);
    }
  };
  var MultiGraph = class extends Graph {
    constructor(options) {
      const finalOptions = assign({ multi: true }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError(
          "MultiGraph.from: inconsistent indication that the graph should be simple in given options!"
        );
      super(finalOptions);
    }
  };
  var MultiDirectedGraph = class extends Graph {
    constructor(options) {
      const finalOptions = assign({ type: "directed", multi: true }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError(
          "MultiDirectedGraph.from: inconsistent indication that the graph should be simple in given options!"
        );
      if (finalOptions.type !== "directed")
        throw new InvalidArgumentsGraphError(
          'MultiDirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!'
        );
      super(finalOptions);
    }
  };
  var MultiUndirectedGraph = class extends Graph {
    constructor(options) {
      const finalOptions = assign({ type: "undirected", multi: true }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError(
          "MultiUndirectedGraph.from: inconsistent indication that the graph should be simple in given options!"
        );
      if (finalOptions.type !== "undirected")
        throw new InvalidArgumentsGraphError(
          'MultiUndirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!'
        );
      super(finalOptions);
    }
  };
  function attachStaticFromMethod(Class) {
    Class.from = function(data, options) {
      const finalOptions = assign({}, data.options, options);
      const instance = new Class(finalOptions);
      instance.import(data);
      return instance;
    };
  }
  attachStaticFromMethod(Graph);
  attachStaticFromMethod(DirectedGraph);
  attachStaticFromMethod(UndirectedGraph);
  attachStaticFromMethod(MultiGraph);
  attachStaticFromMethod(MultiDirectedGraph);
  attachStaticFromMethod(MultiUndirectedGraph);
  Graph.Graph = Graph;
  Graph.DirectedGraph = DirectedGraph;
  Graph.UndirectedGraph = UndirectedGraph;
  Graph.MultiGraph = MultiGraph;
  Graph.MultiDirectedGraph = MultiDirectedGraph;
  Graph.MultiUndirectedGraph = MultiUndirectedGraph;
  Graph.InvalidArgumentsGraphError = InvalidArgumentsGraphError;
  Graph.NotFoundGraphError = NotFoundGraphError;
  Graph.UsageGraphError = UsageGraphError;

  // node_modules/sigma/dist/inherits-d1a1e29b.esm.js
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _classCallCheck(a, n) {
    if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
    }
  }
  function _createClass(e, r, t) {
    return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
      writable: false
    }), e;
  }
  function _getPrototypeOf(t) {
    return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
      return t2.__proto__ || Object.getPrototypeOf(t2);
    }, _getPrototypeOf(t);
  }
  function _isNativeReflectConstruct() {
    try {
      var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (t2) {
    }
    return (_isNativeReflectConstruct = function() {
      return !!t;
    })();
  }
  function _assertThisInitialized(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  function _possibleConstructorReturn(t, e) {
    if (e && ("object" == typeof e || "function" == typeof e)) return e;
    if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
    return _assertThisInitialized(t);
  }
  function _callSuper(t, o, e) {
    return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
  }
  function _setPrototypeOf(t, e) {
    return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
      return t2.__proto__ = e2, t2;
    }, _setPrototypeOf(t, e);
  }
  function _inherits(t, e) {
    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
    t.prototype = Object.create(e && e.prototype, {
      constructor: {
        value: t,
        writable: true,
        configurable: true
      }
    }), Object.defineProperty(t, "prototype", {
      writable: false
    }), e && _setPrototypeOf(t, e);
  }

  // node_modules/sigma/dist/colors-beb06eb2.esm.js
  function _arrayWithHoles(r) {
    if (Array.isArray(r)) return r;
  }
  function _iterableToArrayLimit(r, l) {
    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (null != t) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, 0 === l) {
          if (Object(t) !== t) return;
          f = false;
        } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
        } finally {
          if (o) throw n;
        }
      }
      return a;
    }
  }
  function _arrayLikeToArray(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _unsupportedIterableToArray(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
    }
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _slicedToArray(r, e) {
    return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
  }
  var HTML_COLORS = {
    black: "#000000",
    silver: "#C0C0C0",
    gray: "#808080",
    grey: "#808080",
    white: "#FFFFFF",
    maroon: "#800000",
    red: "#FF0000",
    purple: "#800080",
    fuchsia: "#FF00FF",
    green: "#008000",
    lime: "#00FF00",
    olive: "#808000",
    yellow: "#FFFF00",
    navy: "#000080",
    blue: "#0000FF",
    teal: "#008080",
    aqua: "#00FFFF",
    darkblue: "#00008B",
    mediumblue: "#0000CD",
    darkgreen: "#006400",
    darkcyan: "#008B8B",
    deepskyblue: "#00BFFF",
    darkturquoise: "#00CED1",
    mediumspringgreen: "#00FA9A",
    springgreen: "#00FF7F",
    cyan: "#00FFFF",
    midnightblue: "#191970",
    dodgerblue: "#1E90FF",
    lightseagreen: "#20B2AA",
    forestgreen: "#228B22",
    seagreen: "#2E8B57",
    darkslategray: "#2F4F4F",
    darkslategrey: "#2F4F4F",
    limegreen: "#32CD32",
    mediumseagreen: "#3CB371",
    turquoise: "#40E0D0",
    royalblue: "#4169E1",
    steelblue: "#4682B4",
    darkslateblue: "#483D8B",
    mediumturquoise: "#48D1CC",
    indigo: "#4B0082",
    darkolivegreen: "#556B2F",
    cadetblue: "#5F9EA0",
    cornflowerblue: "#6495ED",
    rebeccapurple: "#663399",
    mediumaquamarine: "#66CDAA",
    dimgray: "#696969",
    dimgrey: "#696969",
    slateblue: "#6A5ACD",
    olivedrab: "#6B8E23",
    slategray: "#708090",
    slategrey: "#708090",
    lightslategray: "#778899",
    lightslategrey: "#778899",
    mediumslateblue: "#7B68EE",
    lawngreen: "#7CFC00",
    chartreuse: "#7FFF00",
    aquamarine: "#7FFFD4",
    skyblue: "#87CEEB",
    lightskyblue: "#87CEFA",
    blueviolet: "#8A2BE2",
    darkred: "#8B0000",
    darkmagenta: "#8B008B",
    saddlebrown: "#8B4513",
    darkseagreen: "#8FBC8F",
    lightgreen: "#90EE90",
    mediumpurple: "#9370DB",
    darkviolet: "#9400D3",
    palegreen: "#98FB98",
    darkorchid: "#9932CC",
    yellowgreen: "#9ACD32",
    sienna: "#A0522D",
    brown: "#A52A2A",
    darkgray: "#A9A9A9",
    darkgrey: "#A9A9A9",
    lightblue: "#ADD8E6",
    greenyellow: "#ADFF2F",
    paleturquoise: "#AFEEEE",
    lightsteelblue: "#B0C4DE",
    powderblue: "#B0E0E6",
    firebrick: "#B22222",
    darkgoldenrod: "#B8860B",
    mediumorchid: "#BA55D3",
    rosybrown: "#BC8F8F",
    darkkhaki: "#BDB76B",
    mediumvioletred: "#C71585",
    indianred: "#CD5C5C",
    peru: "#CD853F",
    chocolate: "#D2691E",
    tan: "#D2B48C",
    lightgray: "#D3D3D3",
    lightgrey: "#D3D3D3",
    thistle: "#D8BFD8",
    orchid: "#DA70D6",
    goldenrod: "#DAA520",
    palevioletred: "#DB7093",
    crimson: "#DC143C",
    gainsboro: "#DCDCDC",
    plum: "#DDA0DD",
    burlywood: "#DEB887",
    lightcyan: "#E0FFFF",
    lavender: "#E6E6FA",
    darksalmon: "#E9967A",
    violet: "#EE82EE",
    palegoldenrod: "#EEE8AA",
    lightcoral: "#F08080",
    khaki: "#F0E68C",
    aliceblue: "#F0F8FF",
    honeydew: "#F0FFF0",
    azure: "#F0FFFF",
    sandybrown: "#F4A460",
    wheat: "#F5DEB3",
    beige: "#F5F5DC",
    whitesmoke: "#F5F5F5",
    mintcream: "#F5FFFA",
    ghostwhite: "#F8F8FF",
    salmon: "#FA8072",
    antiquewhite: "#FAEBD7",
    linen: "#FAF0E6",
    lightgoldenrodyellow: "#FAFAD2",
    oldlace: "#FDF5E6",
    magenta: "#FF00FF",
    deeppink: "#FF1493",
    orangered: "#FF4500",
    tomato: "#FF6347",
    hotpink: "#FF69B4",
    coral: "#FF7F50",
    darkorange: "#FF8C00",
    lightsalmon: "#FFA07A",
    orange: "#FFA500",
    lightpink: "#FFB6C1",
    pink: "#FFC0CB",
    gold: "#FFD700",
    peachpuff: "#FFDAB9",
    navajowhite: "#FFDEAD",
    moccasin: "#FFE4B5",
    bisque: "#FFE4C4",
    mistyrose: "#FFE4E1",
    blanchedalmond: "#FFEBCD",
    papayawhip: "#FFEFD5",
    lavenderblush: "#FFF0F5",
    seashell: "#FFF5EE",
    cornsilk: "#FFF8DC",
    lemonchiffon: "#FFFACD",
    floralwhite: "#FFFAF0",
    snow: "#FFFAFA",
    lightyellow: "#FFFFE0",
    ivory: "#FFFFF0"
  };
  var INT8 = new Int8Array(4);
  var INT32 = new Int32Array(INT8.buffer, 0, 1);
  var FLOAT32 = new Float32Array(INT8.buffer, 0, 1);
  var RGBA_TEST_REGEX = /^\s*rgba?\s*\(/;
  var RGBA_EXTRACT_REGEX = /^\s*rgba?\s*\(\s*([0-9]*)\s*,\s*([0-9]*)\s*,\s*([0-9]*)(?:\s*,\s*(.*)?)?\)\s*$/;
  function parseColor(val) {
    var r = 0;
    var g = 0;
    var b = 0;
    var a = 1;
    if (val[0] === "#") {
      if (val.length === 4) {
        r = parseInt(val.charAt(1) + val.charAt(1), 16);
        g = parseInt(val.charAt(2) + val.charAt(2), 16);
        b = parseInt(val.charAt(3) + val.charAt(3), 16);
      } else {
        r = parseInt(val.charAt(1) + val.charAt(2), 16);
        g = parseInt(val.charAt(3) + val.charAt(4), 16);
        b = parseInt(val.charAt(5) + val.charAt(6), 16);
      }
      if (val.length === 9) {
        a = parseInt(val.charAt(7) + val.charAt(8), 16) / 255;
      }
    } else if (RGBA_TEST_REGEX.test(val)) {
      var match = val.match(RGBA_EXTRACT_REGEX);
      if (match) {
        r = +match[1];
        g = +match[2];
        b = +match[3];
        if (match[4]) a = +match[4];
      }
    }
    return {
      r,
      g,
      b,
      a
    };
  }
  var FLOAT_COLOR_CACHE = {};
  for (htmlColor in HTML_COLORS) {
    FLOAT_COLOR_CACHE[htmlColor] = floatColor(HTML_COLORS[htmlColor]);
    FLOAT_COLOR_CACHE[HTML_COLORS[htmlColor]] = FLOAT_COLOR_CACHE[htmlColor];
  }
  var htmlColor;
  function rgbaToFloat(r, g, b, a, masking) {
    INT32[0] = a << 24 | b << 16 | g << 8 | r;
    if (masking) INT32[0] = INT32[0] & 4278190079;
    return FLOAT32[0];
  }
  function floatColor(val) {
    val = val.toLowerCase();
    if (typeof FLOAT_COLOR_CACHE[val] !== "undefined") return FLOAT_COLOR_CACHE[val];
    var parsed = parseColor(val);
    var r = parsed.r, g = parsed.g, b = parsed.b;
    var a = parsed.a;
    a = a * 255 | 0;
    var color = rgbaToFloat(r, g, b, a, true);
    FLOAT_COLOR_CACHE[val] = color;
    return color;
  }
  function colorToArray(val, masking) {
    FLOAT32[0] = floatColor(val);
    var intValue = INT32[0];
    if (masking) {
      intValue = intValue | 16777216;
    }
    var r = intValue & 255;
    var g = intValue >> 8 & 255;
    var b = intValue >> 16 & 255;
    var a = intValue >> 24 & 255;
    return [r, g, b, a];
  }
  var FLOAT_INDEX_CACHE = {};
  function indexToColor(index) {
    if (typeof FLOAT_INDEX_CACHE[index] !== "undefined") return FLOAT_INDEX_CACHE[index];
    var r = (index & 16711680) >>> 16;
    var g = (index & 65280) >>> 8;
    var b = index & 255;
    var a = 255;
    var color = rgbaToFloat(r, g, b, a, true);
    FLOAT_INDEX_CACHE[index] = color;
    return color;
  }
  function colorToIndex(r, g, b, _a) {
    return b + (g << 8) + (r << 16);
  }
  function getPixelColor(gl, frameBuffer, x, y, pixelRatio, downSizingRatio) {
    var bufferX = Math.floor(x / downSizingRatio * pixelRatio);
    var bufferY = Math.floor(gl.drawingBufferHeight / downSizingRatio - y / downSizingRatio * pixelRatio);
    var pixel = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.readPixels(bufferX, bufferY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    var _pixel = _slicedToArray(pixel, 4), r = _pixel[0], g = _pixel[1], b = _pixel[2], a = _pixel[3];
    return [r, g, b, a];
  }

  // node_modules/sigma/dist/index-fad77a13.esm.js
  function _defineProperty(e, r, t) {
    return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r2) {
        return Object.getOwnPropertyDescriptor(e, r2).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
        _defineProperty(e, r2, t[r2]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
        Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
      });
    }
    return e;
  }
  function _superPropBase(t, o) {
    for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t)); ) ;
    return t;
  }
  function _get() {
    return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(e, t, r) {
      var p = _superPropBase(e, t);
      if (p) {
        var n = Object.getOwnPropertyDescriptor(p, t);
        return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value;
      }
    }, _get.apply(null, arguments);
  }
  function _superPropGet(t, o, e, r) {
    var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e);
    return 2 & r && "function" == typeof p ? function(t2) {
      return p.apply(e, t2);
    } : p;
  }
  function getAttributeItemsCount(attr) {
    return attr.normalized ? 1 : attr.size;
  }
  function getAttributesItemsCount(attrs) {
    var res = 0;
    attrs.forEach(function(attr) {
      return res += getAttributeItemsCount(attr);
    });
    return res;
  }
  function loadShader(type, gl, source) {
    var glType = type === "VERTEX" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
    var shader = gl.createShader(glType);
    if (shader === null) {
      throw new Error("loadShader: error while creating the shader");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var successfullyCompiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!successfullyCompiled) {
      var infoLog = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("loadShader: error while compiling the shader:\n".concat(infoLog, "\n").concat(source));
    }
    return shader;
  }
  function loadVertexShader(gl, source) {
    return loadShader("VERTEX", gl, source);
  }
  function loadFragmentShader(gl, source) {
    return loadShader("FRAGMENT", gl, source);
  }
  function loadProgram(gl, shaders) {
    var program = gl.createProgram();
    if (program === null) {
      throw new Error("loadProgram: error while creating the program.");
    }
    var i, l;
    for (i = 0, l = shaders.length; i < l; i++) gl.attachShader(program, shaders[i]);
    gl.linkProgram(program);
    var successfullyLinked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!successfullyLinked) {
      var info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error("loadProgram: error while linking the program: ".concat(info));
    }
    return program;
  }
  function killProgram(_ref) {
    var gl = _ref.gl, buffer = _ref.buffer, program = _ref.program, vertexShader = _ref.vertexShader, fragmentShader = _ref.fragmentShader;
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
  }
  function numberToGLSLFloat(n) {
    return n % 1 === 0 ? n.toFixed(1) : n.toString();
  }
  var PICKING_PREFIX = "#define PICKING_MODE\n";
  var SIZE_FACTOR_PER_ATTRIBUTE_TYPE = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({}, WebGL2RenderingContext.BOOL, 1), WebGL2RenderingContext.BYTE, 1), WebGL2RenderingContext.UNSIGNED_BYTE, 1), WebGL2RenderingContext.SHORT, 2), WebGL2RenderingContext.UNSIGNED_SHORT, 2), WebGL2RenderingContext.INT, 4), WebGL2RenderingContext.UNSIGNED_INT, 4), WebGL2RenderingContext.FLOAT, 4);
  var Program = /* @__PURE__ */ (function() {
    function Program2(gl, pickingBuffer, renderer2) {
      _classCallCheck(this, Program2);
      _defineProperty(this, "array", new Float32Array());
      _defineProperty(this, "constantArray", new Float32Array());
      _defineProperty(this, "capacity", 0);
      _defineProperty(this, "verticesCount", 0);
      var def = this.getDefinition();
      this.VERTICES = def.VERTICES;
      this.VERTEX_SHADER_SOURCE = def.VERTEX_SHADER_SOURCE;
      this.FRAGMENT_SHADER_SOURCE = def.FRAGMENT_SHADER_SOURCE;
      this.UNIFORMS = def.UNIFORMS;
      this.ATTRIBUTES = def.ATTRIBUTES;
      this.METHOD = def.METHOD;
      this.CONSTANT_ATTRIBUTES = "CONSTANT_ATTRIBUTES" in def ? def.CONSTANT_ATTRIBUTES : [];
      this.CONSTANT_DATA = "CONSTANT_DATA" in def ? def.CONSTANT_DATA : [];
      this.isInstanced = "CONSTANT_ATTRIBUTES" in def;
      this.ATTRIBUTES_ITEMS_COUNT = getAttributesItemsCount(this.ATTRIBUTES);
      this.STRIDE = this.VERTICES * this.ATTRIBUTES_ITEMS_COUNT;
      this.renderer = renderer2;
      this.normalProgram = this.getProgramInfo("normal", gl, def.VERTEX_SHADER_SOURCE, def.FRAGMENT_SHADER_SOURCE, null);
      this.pickProgram = pickingBuffer ? this.getProgramInfo("pick", gl, PICKING_PREFIX + def.VERTEX_SHADER_SOURCE, PICKING_PREFIX + def.FRAGMENT_SHADER_SOURCE, pickingBuffer) : null;
      if (this.isInstanced) {
        var constantAttributesItemsCount = getAttributesItemsCount(this.CONSTANT_ATTRIBUTES);
        if (this.CONSTANT_DATA.length !== this.VERTICES) throw new Error("Program: error while getting constant data (expected ".concat(this.VERTICES, " items, received ").concat(this.CONSTANT_DATA.length, " instead)"));
        this.constantArray = new Float32Array(this.CONSTANT_DATA.length * constantAttributesItemsCount);
        for (var i = 0; i < this.CONSTANT_DATA.length; i++) {
          var vector = this.CONSTANT_DATA[i];
          if (vector.length !== constantAttributesItemsCount) throw new Error("Program: error while getting constant data (one vector has ".concat(vector.length, " items instead of ").concat(constantAttributesItemsCount, ")"));
          for (var j = 0; j < vector.length; j++) this.constantArray[i * constantAttributesItemsCount + j] = vector[j];
        }
        this.STRIDE = this.ATTRIBUTES_ITEMS_COUNT;
      }
    }
    return _createClass(Program2, [{
      key: "kill",
      value: function kill() {
        killProgram(this.normalProgram);
        if (this.pickProgram) {
          killProgram(this.pickProgram);
          this.pickProgram = null;
        }
      }
    }, {
      key: "getProgramInfo",
      value: function getProgramInfo(name, gl, vertexShaderSource, fragmentShaderSource, frameBuffer) {
        var def = this.getDefinition();
        var buffer = gl.createBuffer();
        if (buffer === null) throw new Error("Program: error while creating the WebGL buffer.");
        var vertexShader = loadVertexShader(gl, vertexShaderSource);
        var fragmentShader = loadFragmentShader(gl, fragmentShaderSource);
        var program = loadProgram(gl, [vertexShader, fragmentShader]);
        var uniformLocations = {};
        def.UNIFORMS.forEach(function(uniformName) {
          var location2 = gl.getUniformLocation(program, uniformName);
          if (location2) uniformLocations[uniformName] = location2;
        });
        var attributeLocations = {};
        def.ATTRIBUTES.forEach(function(attr) {
          attributeLocations[attr.name] = gl.getAttribLocation(program, attr.name);
        });
        var constantBuffer;
        if ("CONSTANT_ATTRIBUTES" in def) {
          def.CONSTANT_ATTRIBUTES.forEach(function(attr) {
            attributeLocations[attr.name] = gl.getAttribLocation(program, attr.name);
          });
          constantBuffer = gl.createBuffer();
          if (constantBuffer === null) throw new Error("Program: error while creating the WebGL constant buffer.");
        }
        return {
          name,
          program,
          gl,
          frameBuffer,
          buffer,
          constantBuffer: constantBuffer || {},
          uniformLocations,
          attributeLocations,
          isPicking: name === "pick",
          vertexShader,
          fragmentShader
        };
      }
    }, {
      key: "bindProgram",
      value: function bindProgram(program) {
        var _this = this;
        var offset = 0;
        var gl = program.gl, buffer = program.buffer;
        if (!this.isInstanced) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          offset = 0;
          this.ATTRIBUTES.forEach(function(attr) {
            return offset += _this.bindAttribute(attr, program, offset);
          });
          gl.bufferData(gl.ARRAY_BUFFER, this.array, gl.DYNAMIC_DRAW);
        } else {
          gl.bindBuffer(gl.ARRAY_BUFFER, program.constantBuffer);
          offset = 0;
          this.CONSTANT_ATTRIBUTES.forEach(function(attr) {
            return offset += _this.bindAttribute(attr, program, offset, false);
          });
          gl.bufferData(gl.ARRAY_BUFFER, this.constantArray, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, program.buffer);
          offset = 0;
          this.ATTRIBUTES.forEach(function(attr) {
            return offset += _this.bindAttribute(attr, program, offset, true);
          });
          gl.bufferData(gl.ARRAY_BUFFER, this.array, gl.DYNAMIC_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }
    }, {
      key: "unbindProgram",
      value: function unbindProgram(program) {
        var _this2 = this;
        if (!this.isInstanced) {
          this.ATTRIBUTES.forEach(function(attr) {
            return _this2.unbindAttribute(attr, program);
          });
        } else {
          this.CONSTANT_ATTRIBUTES.forEach(function(attr) {
            return _this2.unbindAttribute(attr, program, false);
          });
          this.ATTRIBUTES.forEach(function(attr) {
            return _this2.unbindAttribute(attr, program, true);
          });
        }
      }
    }, {
      key: "bindAttribute",
      value: function bindAttribute(attr, program, offset, setDivisor) {
        var sizeFactor = SIZE_FACTOR_PER_ATTRIBUTE_TYPE[attr.type];
        if (typeof sizeFactor !== "number") throw new Error('Program.bind: yet unsupported attribute type "'.concat(attr.type, '"'));
        var location2 = program.attributeLocations[attr.name];
        var gl = program.gl;
        if (location2 !== -1) {
          gl.enableVertexAttribArray(location2);
          var stride = !this.isInstanced ? this.ATTRIBUTES_ITEMS_COUNT * Float32Array.BYTES_PER_ELEMENT : (setDivisor ? this.ATTRIBUTES_ITEMS_COUNT : getAttributesItemsCount(this.CONSTANT_ATTRIBUTES)) * Float32Array.BYTES_PER_ELEMENT;
          gl.vertexAttribPointer(location2, attr.size, attr.type, attr.normalized || false, stride, offset);
          if (this.isInstanced && setDivisor) {
            if (gl instanceof WebGL2RenderingContext) {
              gl.vertexAttribDivisor(location2, 1);
            } else {
              var ext = gl.getExtension("ANGLE_instanced_arrays");
              if (ext) ext.vertexAttribDivisorANGLE(location2, 1);
            }
          }
        }
        return attr.size * sizeFactor;
      }
    }, {
      key: "unbindAttribute",
      value: function unbindAttribute(attr, program, unsetDivisor) {
        var location2 = program.attributeLocations[attr.name];
        var gl = program.gl;
        if (location2 !== -1) {
          gl.disableVertexAttribArray(location2);
          if (this.isInstanced && unsetDivisor) {
            if (gl instanceof WebGL2RenderingContext) {
              gl.vertexAttribDivisor(location2, 0);
            } else {
              var ext = gl.getExtension("ANGLE_instanced_arrays");
              if (ext) ext.vertexAttribDivisorANGLE(location2, 0);
            }
          }
        }
      }
    }, {
      key: "reallocate",
      value: function reallocate(capacity) {
        if (capacity === this.capacity) return;
        this.capacity = capacity;
        this.verticesCount = this.VERTICES * capacity;
        this.array = new Float32Array(!this.isInstanced ? this.verticesCount * this.ATTRIBUTES_ITEMS_COUNT : this.capacity * this.ATTRIBUTES_ITEMS_COUNT);
      }
    }, {
      key: "hasNothingToRender",
      value: function hasNothingToRender() {
        return this.verticesCount === 0;
      }
    }, {
      key: "renderProgram",
      value: function renderProgram(params, programInfo) {
        var gl = programInfo.gl, program = programInfo.program;
        gl.enable(gl.BLEND);
        gl.useProgram(program);
        this.setUniforms(params, programInfo);
        this.drawWebGL(this.METHOD, programInfo);
      }
    }, {
      key: "render",
      value: function render(params) {
        if (this.hasNothingToRender()) return;
        if (this.pickProgram) {
          this.pickProgram.gl.viewport(0, 0, params.width * params.pixelRatio / params.downSizingRatio, params.height * params.pixelRatio / params.downSizingRatio);
          this.bindProgram(this.pickProgram);
          this.renderProgram(_objectSpread2(_objectSpread2({}, params), {}, {
            pixelRatio: params.pixelRatio / params.downSizingRatio
          }), this.pickProgram);
          this.unbindProgram(this.pickProgram);
        }
        this.normalProgram.gl.viewport(0, 0, params.width * params.pixelRatio, params.height * params.pixelRatio);
        this.bindProgram(this.normalProgram);
        this.renderProgram(params, this.normalProgram);
        this.unbindProgram(this.normalProgram);
      }
    }, {
      key: "drawWebGL",
      value: function drawWebGL(method, _ref) {
        var gl = _ref.gl, frameBuffer = _ref.frameBuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        if (!this.isInstanced) {
          gl.drawArrays(method, 0, this.verticesCount);
        } else {
          if (gl instanceof WebGL2RenderingContext) {
            gl.drawArraysInstanced(method, 0, this.VERTICES, this.capacity);
          } else {
            var ext = gl.getExtension("ANGLE_instanced_arrays");
            if (ext) ext.drawArraysInstancedANGLE(method, 0, this.VERTICES, this.capacity);
          }
        }
      }
    }]);
  })();
  var NodeProgram = /* @__PURE__ */ (function(_ref) {
    function NodeProgram2() {
      _classCallCheck(this, NodeProgram2);
      return _callSuper(this, NodeProgram2, arguments);
    }
    _inherits(NodeProgram2, _ref);
    return _createClass(NodeProgram2, [{
      key: "kill",
      value: function kill() {
        _superPropGet(NodeProgram2, "kill", this, 3)([]);
      }
    }, {
      key: "process",
      value: function process(nodeIndex, offset, data) {
        var i = offset * this.STRIDE;
        if (data.hidden) {
          for (var l = i + this.STRIDE; i < l; i++) {
            this.array[i] = 0;
          }
          return;
        }
        return this.processVisibleItem(indexToColor(nodeIndex), i, data);
      }
    }]);
  })(Program);
  var EdgeProgram = /* @__PURE__ */ (function(_ref) {
    function EdgeProgram2() {
      var _this;
      _classCallCheck(this, EdgeProgram2);
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      _this = _callSuper(this, EdgeProgram2, [].concat(args));
      _defineProperty(_this, "drawLabel", void 0);
      return _this;
    }
    _inherits(EdgeProgram2, _ref);
    return _createClass(EdgeProgram2, [{
      key: "kill",
      value: function kill() {
        _superPropGet(EdgeProgram2, "kill", this, 3)([]);
      }
    }, {
      key: "process",
      value: function process(edgeIndex, offset, sourceData, targetData, data) {
        var i = offset * this.STRIDE;
        if (data.hidden || sourceData.hidden || targetData.hidden) {
          for (var l = i + this.STRIDE; i < l; i++) {
            this.array[i] = 0;
          }
          return;
        }
        return this.processVisibleItem(indexToColor(edgeIndex), i, sourceData, targetData, data);
      }
    }]);
  })(Program);
  function createEdgeCompoundProgram(programClasses, drawLabel) {
    return /* @__PURE__ */ (function() {
      function EdgeCompoundProgram(gl, pickingBuffer, renderer2) {
        _classCallCheck(this, EdgeCompoundProgram);
        _defineProperty(this, "drawLabel", drawLabel);
        this.programs = programClasses.map(function(Program2) {
          return new Program2(gl, pickingBuffer, renderer2);
        });
      }
      return _createClass(EdgeCompoundProgram, [{
        key: "reallocate",
        value: function reallocate(capacity) {
          this.programs.forEach(function(program) {
            return program.reallocate(capacity);
          });
        }
      }, {
        key: "process",
        value: function process(edgeIndex, offset, sourceData, targetData, data) {
          this.programs.forEach(function(program) {
            return program.process(edgeIndex, offset, sourceData, targetData, data);
          });
        }
      }, {
        key: "render",
        value: function render(params) {
          this.programs.forEach(function(program) {
            return program.render(params);
          });
        }
      }, {
        key: "kill",
        value: function kill() {
          this.programs.forEach(function(program) {
            return program.kill();
          });
        }
      }]);
    })();
  }
  function drawStraightEdgeLabel(context, edgeData, sourceData, targetData, settings) {
    var size = settings.edgeLabelSize, font = settings.edgeLabelFont, weight = settings.edgeLabelWeight, color = settings.edgeLabelColor.attribute ? edgeData[settings.edgeLabelColor.attribute] || settings.edgeLabelColor.color || "#000" : settings.edgeLabelColor.color;
    var label = edgeData.label;
    if (!label) return;
    context.fillStyle = color;
    context.font = "".concat(weight, " ").concat(size, "px ").concat(font);
    var sSize = sourceData.size;
    var tSize = targetData.size;
    var sx = sourceData.x;
    var sy = sourceData.y;
    var tx = targetData.x;
    var ty = targetData.y;
    var cx = (sx + tx) / 2;
    var cy = (sy + ty) / 2;
    var dx = tx - sx;
    var dy = ty - sy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < sSize + tSize) return;
    sx += dx * sSize / d;
    sy += dy * sSize / d;
    tx -= dx * tSize / d;
    ty -= dy * tSize / d;
    cx = (sx + tx) / 2;
    cy = (sy + ty) / 2;
    dx = tx - sx;
    dy = ty - sy;
    d = Math.sqrt(dx * dx + dy * dy);
    var textLength = context.measureText(label).width;
    if (textLength > d) {
      var ellipsis = "\u2026";
      label = label + ellipsis;
      textLength = context.measureText(label).width;
      while (textLength > d && label.length > 1) {
        label = label.slice(0, -2) + ellipsis;
        textLength = context.measureText(label).width;
      }
      if (label.length < 4) return;
    }
    var angle;
    if (dx > 0) {
      if (dy > 0) angle = Math.acos(dx / d);
      else angle = Math.asin(dy / d);
    } else {
      if (dy > 0) angle = Math.acos(dx / d) + Math.PI;
      else angle = Math.asin(dx / d) + Math.PI / 2;
    }
    context.save();
    context.translate(cx, cy);
    context.rotate(angle);
    context.fillText(label, -textLength / 2, edgeData.size / 2 + size);
    context.restore();
  }
  function drawDiscNodeLabel(context, data, settings) {
    if (!data.label) return;
    var size = settings.labelSize, font = settings.labelFont, weight = settings.labelWeight, color = settings.labelColor.attribute ? data[settings.labelColor.attribute] || settings.labelColor.color || "#000" : settings.labelColor.color;
    context.fillStyle = color;
    context.font = "".concat(weight, " ").concat(size, "px ").concat(font);
    context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
  }
  function drawDiscNodeHover(context, data, settings) {
    var size = settings.labelSize, font = settings.labelFont, weight = settings.labelWeight;
    context.font = "".concat(weight, " ").concat(size, "px ").concat(font);
    context.fillStyle = "#FFF";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 8;
    context.shadowColor = "#000";
    var PADDING = 2;
    if (typeof data.label === "string") {
      var textWidth = context.measureText(data.label).width, boxWidth = Math.round(textWidth + 5), boxHeight = Math.round(size + 2 * PADDING), radius = Math.max(data.size, size / 2) + PADDING;
      var angleRadian = Math.asin(boxHeight / 2 / radius);
      var xDeltaCoord = Math.sqrt(Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)));
      context.beginPath();
      context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
      context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
      context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
      context.closePath();
      context.fill();
    } else {
      context.beginPath();
      context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
      context.closePath();
      context.fill();
    }
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;
    drawDiscNodeLabel(context, data, settings);
  }
  var SHADER_SOURCE$6 = (
    /*glsl*/
    "\nprecision highp float;\n\nvarying vec4 v_color;\nvarying vec2 v_diffVector;\nvarying float v_radius;\n\nuniform float u_correctionRatio;\n\nconst vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);\n\nvoid main(void) {\n  float border = u_correctionRatio * 2.0;\n  float dist = length(v_diffVector) - v_radius + border;\n\n  // No antialiasing for picking mode:\n  #ifdef PICKING_MODE\n  if (dist > border)\n    gl_FragColor = transparent;\n  else\n    gl_FragColor = v_color;\n\n  #else\n  float t = 0.0;\n  if (dist > border)\n    t = 1.0;\n  else if (dist > 0.0)\n    t = dist / border;\n\n  gl_FragColor = mix(v_color, transparent, t);\n  #endif\n}\n"
  );
  var FRAGMENT_SHADER_SOURCE$2 = SHADER_SOURCE$6;
  var SHADER_SOURCE$5 = (
    /*glsl*/
    "\nattribute vec4 a_id;\nattribute vec4 a_color;\nattribute vec2 a_position;\nattribute float a_size;\nattribute float a_angle;\n\nuniform mat3 u_matrix;\nuniform float u_sizeRatio;\nuniform float u_correctionRatio;\n\nvarying vec4 v_color;\nvarying vec2 v_diffVector;\nvarying float v_radius;\nvarying float v_border;\n\nconst float bias = 255.0 / 254.0;\n\nvoid main() {\n  float size = a_size * u_correctionRatio / u_sizeRatio * 4.0;\n  vec2 diffVector = size * vec2(cos(a_angle), sin(a_angle));\n  vec2 position = a_position + diffVector;\n  gl_Position = vec4(\n    (u_matrix * vec3(position, 1)).xy,\n    0,\n    1\n  );\n\n  v_diffVector = diffVector;\n  v_radius = size / 2.0;\n\n  #ifdef PICKING_MODE\n  // For picking mode, we use the ID as the color:\n  v_color = a_id;\n  #else\n  // For normal mode, we use the color:\n  v_color = a_color;\n  #endif\n\n  v_color.a *= bias;\n}\n"
  );
  var VERTEX_SHADER_SOURCE$3 = SHADER_SOURCE$5;
  var _WebGLRenderingContex$3 = WebGLRenderingContext;
  var UNSIGNED_BYTE$3 = _WebGLRenderingContex$3.UNSIGNED_BYTE;
  var FLOAT$3 = _WebGLRenderingContex$3.FLOAT;
  var UNIFORMS$3 = ["u_sizeRatio", "u_correctionRatio", "u_matrix"];
  var NodeCircleProgram = /* @__PURE__ */ (function(_NodeProgram) {
    function NodeCircleProgram2() {
      _classCallCheck(this, NodeCircleProgram2);
      return _callSuper(this, NodeCircleProgram2, arguments);
    }
    _inherits(NodeCircleProgram2, _NodeProgram);
    return _createClass(NodeCircleProgram2, [{
      key: "getDefinition",
      value: function getDefinition() {
        return {
          VERTICES: 3,
          VERTEX_SHADER_SOURCE: VERTEX_SHADER_SOURCE$3,
          FRAGMENT_SHADER_SOURCE: FRAGMENT_SHADER_SOURCE$2,
          METHOD: WebGLRenderingContext.TRIANGLES,
          UNIFORMS: UNIFORMS$3,
          ATTRIBUTES: [{
            name: "a_position",
            size: 2,
            type: FLOAT$3
          }, {
            name: "a_size",
            size: 1,
            type: FLOAT$3
          }, {
            name: "a_color",
            size: 4,
            type: UNSIGNED_BYTE$3,
            normalized: true
          }, {
            name: "a_id",
            size: 4,
            type: UNSIGNED_BYTE$3,
            normalized: true
          }],
          CONSTANT_ATTRIBUTES: [{
            name: "a_angle",
            size: 1,
            type: FLOAT$3
          }],
          CONSTANT_DATA: [[NodeCircleProgram2.ANGLE_1], [NodeCircleProgram2.ANGLE_2], [NodeCircleProgram2.ANGLE_3]]
        };
      }
    }, {
      key: "processVisibleItem",
      value: function processVisibleItem(nodeIndex, startIndex, data) {
        var array = this.array;
        var color = floatColor(data.color);
        array[startIndex++] = data.x;
        array[startIndex++] = data.y;
        array[startIndex++] = data.size;
        array[startIndex++] = color;
        array[startIndex++] = nodeIndex;
      }
    }, {
      key: "setUniforms",
      value: function setUniforms(params, _ref) {
        var gl = _ref.gl, uniformLocations = _ref.uniformLocations;
        var u_sizeRatio = uniformLocations.u_sizeRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_matrix = uniformLocations.u_matrix;
        gl.uniform1f(u_correctionRatio, params.correctionRatio);
        gl.uniform1f(u_sizeRatio, params.sizeRatio);
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
      }
    }]);
  })(NodeProgram);
  _defineProperty(NodeCircleProgram, "ANGLE_1", 0);
  _defineProperty(NodeCircleProgram, "ANGLE_2", 2 * Math.PI / 3);
  _defineProperty(NodeCircleProgram, "ANGLE_3", 4 * Math.PI / 3);
  var SHADER_SOURCE$4 = (
    /*glsl*/
    "\nprecision mediump float;\n\nvarying vec4 v_color;\n\nvoid main(void) {\n  gl_FragColor = v_color;\n}\n"
  );
  var FRAGMENT_SHADER_SOURCE$1 = SHADER_SOURCE$4;
  var SHADER_SOURCE$3 = (
    /*glsl*/
    "\nattribute vec2 a_position;\nattribute vec2 a_normal;\nattribute float a_radius;\nattribute vec3 a_barycentric;\n\n#ifdef PICKING_MODE\nattribute vec4 a_id;\n#else\nattribute vec4 a_color;\n#endif\n\nuniform mat3 u_matrix;\nuniform float u_sizeRatio;\nuniform float u_correctionRatio;\nuniform float u_minEdgeThickness;\nuniform float u_lengthToThicknessRatio;\nuniform float u_widenessToThicknessRatio;\n\nvarying vec4 v_color;\n\nconst float bias = 255.0 / 254.0;\n\nvoid main() {\n  float minThickness = u_minEdgeThickness;\n\n  float normalLength = length(a_normal);\n  vec2 unitNormal = a_normal / normalLength;\n\n  // These first computations are taken from edge.vert.glsl and\n  // edge.clamped.vert.glsl. Please read it to get better comments on what's\n  // happening:\n  float pixelsThickness = max(normalLength / u_sizeRatio, minThickness);\n  float webGLThickness = pixelsThickness * u_correctionRatio;\n  float webGLNodeRadius = a_radius * 2.0 * u_correctionRatio / u_sizeRatio;\n  float webGLArrowHeadLength = webGLThickness * u_lengthToThicknessRatio * 2.0;\n  float webGLArrowHeadThickness = webGLThickness * u_widenessToThicknessRatio;\n\n  float da = a_barycentric.x;\n  float db = a_barycentric.y;\n  float dc = a_barycentric.z;\n\n  vec2 delta = vec2(\n      da * (webGLNodeRadius * unitNormal.y)\n    + db * ((webGLNodeRadius + webGLArrowHeadLength) * unitNormal.y + webGLArrowHeadThickness * unitNormal.x)\n    + dc * ((webGLNodeRadius + webGLArrowHeadLength) * unitNormal.y - webGLArrowHeadThickness * unitNormal.x),\n\n      da * (-webGLNodeRadius * unitNormal.x)\n    + db * (-(webGLNodeRadius + webGLArrowHeadLength) * unitNormal.x + webGLArrowHeadThickness * unitNormal.y)\n    + dc * (-(webGLNodeRadius + webGLArrowHeadLength) * unitNormal.x - webGLArrowHeadThickness * unitNormal.y)\n  );\n\n  vec2 position = (u_matrix * vec3(a_position + delta, 1)).xy;\n\n  gl_Position = vec4(position, 0, 1);\n\n  #ifdef PICKING_MODE\n  // For picking mode, we use the ID as the color:\n  v_color = a_id;\n  #else\n  // For normal mode, we use the color:\n  v_color = a_color;\n  #endif\n\n  v_color.a *= bias;\n}\n"
  );
  var VERTEX_SHADER_SOURCE$2 = SHADER_SOURCE$3;
  var _WebGLRenderingContex$2 = WebGLRenderingContext;
  var UNSIGNED_BYTE$2 = _WebGLRenderingContex$2.UNSIGNED_BYTE;
  var FLOAT$2 = _WebGLRenderingContex$2.FLOAT;
  var UNIFORMS$2 = ["u_matrix", "u_sizeRatio", "u_correctionRatio", "u_minEdgeThickness", "u_lengthToThicknessRatio", "u_widenessToThicknessRatio"];
  var DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS = {
    extremity: "target",
    lengthToThicknessRatio: 2.5,
    widenessToThicknessRatio: 2
  };
  function createEdgeArrowHeadProgram(inputOptions) {
    var options = _objectSpread2(_objectSpread2({}, DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS), inputOptions || {});
    return /* @__PURE__ */ (function(_EdgeProgram) {
      function EdgeArrowHeadProgram2() {
        _classCallCheck(this, EdgeArrowHeadProgram2);
        return _callSuper(this, EdgeArrowHeadProgram2, arguments);
      }
      _inherits(EdgeArrowHeadProgram2, _EdgeProgram);
      return _createClass(EdgeArrowHeadProgram2, [{
        key: "getDefinition",
        value: function getDefinition() {
          return {
            VERTICES: 3,
            VERTEX_SHADER_SOURCE: VERTEX_SHADER_SOURCE$2,
            FRAGMENT_SHADER_SOURCE: FRAGMENT_SHADER_SOURCE$1,
            METHOD: WebGLRenderingContext.TRIANGLES,
            UNIFORMS: UNIFORMS$2,
            ATTRIBUTES: [{
              name: "a_position",
              size: 2,
              type: FLOAT$2
            }, {
              name: "a_normal",
              size: 2,
              type: FLOAT$2
            }, {
              name: "a_radius",
              size: 1,
              type: FLOAT$2
            }, {
              name: "a_color",
              size: 4,
              type: UNSIGNED_BYTE$2,
              normalized: true
            }, {
              name: "a_id",
              size: 4,
              type: UNSIGNED_BYTE$2,
              normalized: true
            }],
            CONSTANT_ATTRIBUTES: [{
              name: "a_barycentric",
              size: 3,
              type: FLOAT$2
            }],
            CONSTANT_DATA: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
          };
        }
      }, {
        key: "processVisibleItem",
        value: function processVisibleItem(edgeIndex, startIndex, sourceData, targetData, data) {
          if (options.extremity === "source") {
            var _ref = [targetData, sourceData];
            sourceData = _ref[0];
            targetData = _ref[1];
          }
          var thickness = data.size || 1;
          var radius = targetData.size || 1;
          var x1 = sourceData.x;
          var y1 = sourceData.y;
          var x2 = targetData.x;
          var y2 = targetData.y;
          var color = floatColor(data.color);
          var dx = x2 - x1;
          var dy = y2 - y1;
          var len = dx * dx + dy * dy;
          var n1 = 0;
          var n2 = 0;
          if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len * thickness;
            n2 = dx * len * thickness;
          }
          var array = this.array;
          array[startIndex++] = x2;
          array[startIndex++] = y2;
          array[startIndex++] = -n1;
          array[startIndex++] = -n2;
          array[startIndex++] = radius;
          array[startIndex++] = color;
          array[startIndex++] = edgeIndex;
        }
      }, {
        key: "setUniforms",
        value: function setUniforms(params, _ref2) {
          var gl = _ref2.gl, uniformLocations = _ref2.uniformLocations;
          var u_matrix = uniformLocations.u_matrix, u_sizeRatio = uniformLocations.u_sizeRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_minEdgeThickness = uniformLocations.u_minEdgeThickness, u_lengthToThicknessRatio = uniformLocations.u_lengthToThicknessRatio, u_widenessToThicknessRatio = uniformLocations.u_widenessToThicknessRatio;
          gl.uniformMatrix3fv(u_matrix, false, params.matrix);
          gl.uniform1f(u_sizeRatio, params.sizeRatio);
          gl.uniform1f(u_correctionRatio, params.correctionRatio);
          gl.uniform1f(u_minEdgeThickness, params.minEdgeThickness);
          gl.uniform1f(u_lengthToThicknessRatio, options.lengthToThicknessRatio);
          gl.uniform1f(u_widenessToThicknessRatio, options.widenessToThicknessRatio);
        }
      }]);
    })(EdgeProgram);
  }
  var EdgeArrowHeadProgram = createEdgeArrowHeadProgram();
  var SHADER_SOURCE$2 = (
    /*glsl*/
    "\nprecision mediump float;\n\nvarying vec4 v_color;\nvarying vec2 v_normal;\nvarying float v_thickness;\nvarying float v_feather;\n\nconst vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);\n\nvoid main(void) {\n  // We only handle antialiasing for normal mode:\n  #ifdef PICKING_MODE\n  gl_FragColor = v_color;\n  #else\n  float dist = length(v_normal) * v_thickness;\n\n  float t = smoothstep(\n    v_thickness - v_feather,\n    v_thickness,\n    dist\n  );\n\n  gl_FragColor = mix(v_color, transparent, t);\n  #endif\n}\n"
  );
  var FRAGMENT_SHADER_SOURCE = SHADER_SOURCE$2;
  var SHADER_SOURCE$1 = (
    /*glsl*/
    "\nattribute vec4 a_id;\nattribute vec4 a_color;\nattribute vec2 a_normal;\nattribute float a_normalCoef;\nattribute vec2 a_positionStart;\nattribute vec2 a_positionEnd;\nattribute float a_positionCoef;\nattribute float a_radius;\nattribute float a_radiusCoef;\n\nuniform mat3 u_matrix;\nuniform float u_zoomRatio;\nuniform float u_sizeRatio;\nuniform float u_pixelRatio;\nuniform float u_correctionRatio;\nuniform float u_minEdgeThickness;\nuniform float u_lengthToThicknessRatio;\nuniform float u_feather;\n\nvarying vec4 v_color;\nvarying vec2 v_normal;\nvarying float v_thickness;\nvarying float v_feather;\n\nconst float bias = 255.0 / 254.0;\n\nvoid main() {\n  float minThickness = u_minEdgeThickness;\n\n  float radius = a_radius * a_radiusCoef;\n  vec2 normal = a_normal * a_normalCoef;\n  vec2 position = a_positionStart * (1.0 - a_positionCoef) + a_positionEnd * a_positionCoef;\n\n  float normalLength = length(normal);\n  vec2 unitNormal = normal / normalLength;\n\n  // These first computations are taken from edge.vert.glsl. Please read it to\n  // get better comments on what's happening:\n  float pixelsThickness = max(normalLength, minThickness * u_sizeRatio);\n  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;\n\n  // Here, we move the point to leave space for the arrow head:\n  float direction = sign(radius);\n  float webGLNodeRadius = direction * radius * 2.0 * u_correctionRatio / u_sizeRatio;\n  float webGLArrowHeadLength = webGLThickness * u_lengthToThicknessRatio * 2.0;\n\n  vec2 compensationVector = vec2(-direction * unitNormal.y, direction * unitNormal.x) * (webGLNodeRadius + webGLArrowHeadLength);\n\n  // Here is the proper position of the vertex\n  gl_Position = vec4((u_matrix * vec3(position + unitNormal * webGLThickness + compensationVector, 1)).xy, 0, 1);\n\n  v_thickness = webGLThickness / u_zoomRatio;\n\n  v_normal = unitNormal;\n\n  v_feather = u_feather * u_correctionRatio / u_zoomRatio / u_pixelRatio * 2.0;\n\n  #ifdef PICKING_MODE\n  // For picking mode, we use the ID as the color:\n  v_color = a_id;\n  #else\n  // For normal mode, we use the color:\n  v_color = a_color;\n  #endif\n\n  v_color.a *= bias;\n}\n"
  );
  var VERTEX_SHADER_SOURCE$1 = SHADER_SOURCE$1;
  var _WebGLRenderingContex$1 = WebGLRenderingContext;
  var UNSIGNED_BYTE$1 = _WebGLRenderingContex$1.UNSIGNED_BYTE;
  var FLOAT$1 = _WebGLRenderingContex$1.FLOAT;
  var UNIFORMS$1 = ["u_matrix", "u_zoomRatio", "u_sizeRatio", "u_correctionRatio", "u_pixelRatio", "u_feather", "u_minEdgeThickness", "u_lengthToThicknessRatio"];
  var DEFAULT_EDGE_CLAMPED_PROGRAM_OPTIONS = {
    lengthToThicknessRatio: DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS.lengthToThicknessRatio
  };
  function createEdgeClampedProgram(inputOptions) {
    var options = _objectSpread2(_objectSpread2({}, DEFAULT_EDGE_CLAMPED_PROGRAM_OPTIONS), inputOptions || {});
    return /* @__PURE__ */ (function(_EdgeProgram) {
      function EdgeClampedProgram2() {
        _classCallCheck(this, EdgeClampedProgram2);
        return _callSuper(this, EdgeClampedProgram2, arguments);
      }
      _inherits(EdgeClampedProgram2, _EdgeProgram);
      return _createClass(EdgeClampedProgram2, [{
        key: "getDefinition",
        value: function getDefinition() {
          return {
            VERTICES: 6,
            VERTEX_SHADER_SOURCE: VERTEX_SHADER_SOURCE$1,
            FRAGMENT_SHADER_SOURCE,
            METHOD: WebGLRenderingContext.TRIANGLES,
            UNIFORMS: UNIFORMS$1,
            ATTRIBUTES: [{
              name: "a_positionStart",
              size: 2,
              type: FLOAT$1
            }, {
              name: "a_positionEnd",
              size: 2,
              type: FLOAT$1
            }, {
              name: "a_normal",
              size: 2,
              type: FLOAT$1
            }, {
              name: "a_color",
              size: 4,
              type: UNSIGNED_BYTE$1,
              normalized: true
            }, {
              name: "a_id",
              size: 4,
              type: UNSIGNED_BYTE$1,
              normalized: true
            }, {
              name: "a_radius",
              size: 1,
              type: FLOAT$1
            }],
            CONSTANT_ATTRIBUTES: [
              // If 0, then position will be a_positionStart
              // If 1, then position will be a_positionEnd
              {
                name: "a_positionCoef",
                size: 1,
                type: FLOAT$1
              },
              {
                name: "a_normalCoef",
                size: 1,
                type: FLOAT$1
              },
              {
                name: "a_radiusCoef",
                size: 1,
                type: FLOAT$1
              }
            ],
            CONSTANT_DATA: [[0, 1, 0], [0, -1, 0], [1, 1, 1], [1, 1, 1], [0, -1, 0], [1, -1, -1]]
          };
        }
      }, {
        key: "processVisibleItem",
        value: function processVisibleItem(edgeIndex, startIndex, sourceData, targetData, data) {
          var thickness = data.size || 1;
          var x1 = sourceData.x;
          var y1 = sourceData.y;
          var x2 = targetData.x;
          var y2 = targetData.y;
          var color = floatColor(data.color);
          var dx = x2 - x1;
          var dy = y2 - y1;
          var radius = targetData.size || 1;
          var len = dx * dx + dy * dy;
          var n1 = 0;
          var n2 = 0;
          if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len * thickness;
            n2 = dx * len * thickness;
          }
          var array = this.array;
          array[startIndex++] = x1;
          array[startIndex++] = y1;
          array[startIndex++] = x2;
          array[startIndex++] = y2;
          array[startIndex++] = n1;
          array[startIndex++] = n2;
          array[startIndex++] = color;
          array[startIndex++] = edgeIndex;
          array[startIndex++] = radius;
        }
      }, {
        key: "setUniforms",
        value: function setUniforms(params, _ref) {
          var gl = _ref.gl, uniformLocations = _ref.uniformLocations;
          var u_matrix = uniformLocations.u_matrix, u_zoomRatio = uniformLocations.u_zoomRatio, u_feather = uniformLocations.u_feather, u_pixelRatio = uniformLocations.u_pixelRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_sizeRatio = uniformLocations.u_sizeRatio, u_minEdgeThickness = uniformLocations.u_minEdgeThickness, u_lengthToThicknessRatio = uniformLocations.u_lengthToThicknessRatio;
          gl.uniformMatrix3fv(u_matrix, false, params.matrix);
          gl.uniform1f(u_zoomRatio, params.zoomRatio);
          gl.uniform1f(u_sizeRatio, params.sizeRatio);
          gl.uniform1f(u_correctionRatio, params.correctionRatio);
          gl.uniform1f(u_pixelRatio, params.pixelRatio);
          gl.uniform1f(u_feather, params.antiAliasingFeather);
          gl.uniform1f(u_minEdgeThickness, params.minEdgeThickness);
          gl.uniform1f(u_lengthToThicknessRatio, options.lengthToThicknessRatio);
        }
      }]);
    })(EdgeProgram);
  }
  var EdgeClampedProgram = createEdgeClampedProgram();
  function createEdgeArrowProgram(inputOptions) {
    return createEdgeCompoundProgram([createEdgeClampedProgram(inputOptions), createEdgeArrowHeadProgram(inputOptions)]);
  }
  var EdgeArrowProgram = createEdgeArrowProgram();
  var EdgeArrowProgram$1 = EdgeArrowProgram;
  var SHADER_SOURCE = (
    /*glsl*/
    `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_normal;
attribute float a_normalCoef;
attribute vec2 a_positionStart;
attribute vec2 a_positionEnd;
attribute float a_positionCoef;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_zoomRatio;
uniform float u_pixelRatio;
uniform float u_correctionRatio;
uniform float u_minEdgeThickness;
uniform float u_feather;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_thickness;
varying float v_feather;

const float bias = 255.0 / 254.0;

void main() {
  float minThickness = u_minEdgeThickness;

  vec2 normal = a_normal * a_normalCoef;
  vec2 position = a_positionStart * (1.0 - a_positionCoef) + a_positionEnd * a_positionCoef;

  float normalLength = length(normal);
  vec2 unitNormal = normal / normalLength;

  // We require edges to be at least "minThickness" pixels thick *on screen*
  // (so we need to compensate the size ratio):
  float pixelsThickness = max(normalLength, minThickness * u_sizeRatio);

  // Then, we need to retrieve the normalized thickness of the edge in the WebGL
  // referential (in a ([0, 1], [0, 1]) space), using our "magic" correction
  // ratio:
  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;

  // Here is the proper position of the vertex
  gl_Position = vec4((u_matrix * vec3(position + unitNormal * webGLThickness, 1)).xy, 0, 1);

  // For the fragment shader though, we need a thickness that takes the "magic"
  // correction ratio into account (as in webGLThickness), but so that the
  // antialiasing effect does not depend on the zoom level. So here's yet
  // another thickness version:
  v_thickness = webGLThickness / u_zoomRatio;

  v_normal = unitNormal;

  v_feather = u_feather * u_correctionRatio / u_zoomRatio / u_pixelRatio * 2.0;

  #ifdef PICKING_MODE
  // For picking mode, we use the ID as the color:
  v_color = a_id;
  #else
  // For normal mode, we use the color:
  v_color = a_color;
  #endif

  v_color.a *= bias;
}
`
  );
  var VERTEX_SHADER_SOURCE = SHADER_SOURCE;
  var _WebGLRenderingContex = WebGLRenderingContext;
  var UNSIGNED_BYTE = _WebGLRenderingContex.UNSIGNED_BYTE;
  var FLOAT = _WebGLRenderingContex.FLOAT;
  var UNIFORMS = ["u_matrix", "u_zoomRatio", "u_sizeRatio", "u_correctionRatio", "u_pixelRatio", "u_feather", "u_minEdgeThickness"];
  var EdgeRectangleProgram = /* @__PURE__ */ (function(_EdgeProgram) {
    function EdgeRectangleProgram2() {
      _classCallCheck(this, EdgeRectangleProgram2);
      return _callSuper(this, EdgeRectangleProgram2, arguments);
    }
    _inherits(EdgeRectangleProgram2, _EdgeProgram);
    return _createClass(EdgeRectangleProgram2, [{
      key: "getDefinition",
      value: function getDefinition() {
        return {
          VERTICES: 6,
          VERTEX_SHADER_SOURCE,
          FRAGMENT_SHADER_SOURCE,
          METHOD: WebGLRenderingContext.TRIANGLES,
          UNIFORMS,
          ATTRIBUTES: [{
            name: "a_positionStart",
            size: 2,
            type: FLOAT
          }, {
            name: "a_positionEnd",
            size: 2,
            type: FLOAT
          }, {
            name: "a_normal",
            size: 2,
            type: FLOAT
          }, {
            name: "a_color",
            size: 4,
            type: UNSIGNED_BYTE,
            normalized: true
          }, {
            name: "a_id",
            size: 4,
            type: UNSIGNED_BYTE,
            normalized: true
          }],
          CONSTANT_ATTRIBUTES: [
            // If 0, then position will be a_positionStart
            // If 2, then position will be a_positionEnd
            {
              name: "a_positionCoef",
              size: 1,
              type: FLOAT
            },
            {
              name: "a_normalCoef",
              size: 1,
              type: FLOAT
            }
          ],
          CONSTANT_DATA: [[0, 1], [0, -1], [1, 1], [1, 1], [0, -1], [1, -1]]
        };
      }
    }, {
      key: "processVisibleItem",
      value: function processVisibleItem(edgeIndex, startIndex, sourceData, targetData, data) {
        var thickness = data.size || 1;
        var x1 = sourceData.x;
        var y1 = sourceData.y;
        var x2 = targetData.x;
        var y2 = targetData.y;
        var color = floatColor(data.color);
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = dx * dx + dy * dy;
        var n1 = 0;
        var n2 = 0;
        if (len) {
          len = 1 / Math.sqrt(len);
          n1 = -dy * len * thickness;
          n2 = dx * len * thickness;
        }
        var array = this.array;
        array[startIndex++] = x1;
        array[startIndex++] = y1;
        array[startIndex++] = x2;
        array[startIndex++] = y2;
        array[startIndex++] = n1;
        array[startIndex++] = n2;
        array[startIndex++] = color;
        array[startIndex++] = edgeIndex;
      }
    }, {
      key: "setUniforms",
      value: function setUniforms(params, _ref) {
        var gl = _ref.gl, uniformLocations = _ref.uniformLocations;
        var u_matrix = uniformLocations.u_matrix, u_zoomRatio = uniformLocations.u_zoomRatio, u_feather = uniformLocations.u_feather, u_pixelRatio = uniformLocations.u_pixelRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_sizeRatio = uniformLocations.u_sizeRatio, u_minEdgeThickness = uniformLocations.u_minEdgeThickness;
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.uniform1f(u_zoomRatio, params.zoomRatio);
        gl.uniform1f(u_sizeRatio, params.sizeRatio);
        gl.uniform1f(u_correctionRatio, params.correctionRatio);
        gl.uniform1f(u_pixelRatio, params.pixelRatio);
        gl.uniform1f(u_feather, params.antiAliasingFeather);
        gl.uniform1f(u_minEdgeThickness, params.minEdgeThickness);
      }
    }]);
  })(EdgeProgram);

  // node_modules/sigma/types/dist/sigma-types.esm.js
  var import_events2 = __toESM(require_events());
  var TypedEventEmitter = /* @__PURE__ */ (function(_ref) {
    function TypedEventEmitter2() {
      var _this;
      _classCallCheck(this, TypedEventEmitter2);
      _this = _callSuper(this, TypedEventEmitter2);
      _this.rawEmitter = _this;
      return _this;
    }
    _inherits(TypedEventEmitter2, _ref);
    return _createClass(TypedEventEmitter2);
  })(import_events2.EventEmitter);

  // node_modules/sigma/dist/normalization-be445518.esm.js
  var import_is_graph = __toESM(require_is_graph());
  var linear = function linear2(k) {
    return k;
  };
  var quadraticIn = function quadraticIn2(k) {
    return k * k;
  };
  var quadraticOut = function quadraticOut2(k) {
    return k * (2 - k);
  };
  var quadraticInOut = function quadraticInOut2(k) {
    if ((k *= 2) < 1) return 0.5 * k * k;
    return -0.5 * (--k * (k - 2) - 1);
  };
  var cubicIn = function cubicIn2(k) {
    return k * k * k;
  };
  var cubicOut = function cubicOut2(k) {
    return --k * k * k + 1;
  };
  var cubicInOut = function cubicInOut2(k) {
    if ((k *= 2) < 1) return 0.5 * k * k * k;
    return 0.5 * ((k -= 2) * k * k + 2);
  };
  var easings = {
    linear,
    quadraticIn,
    quadraticOut,
    quadraticInOut,
    cubicIn,
    cubicOut,
    cubicInOut
  };
  var ANIMATE_DEFAULTS = {
    easing: "quadraticInOut",
    duration: 150
  };
  function identity() {
    return Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
  }
  function scale(m, x, y) {
    m[0] = x;
    m[4] = typeof y === "number" ? y : x;
    return m;
  }
  function rotate(m, r) {
    var s = Math.sin(r), c = Math.cos(r);
    m[0] = c;
    m[1] = s;
    m[3] = -s;
    m[4] = c;
    return m;
  }
  function translate(m, x, y) {
    m[6] = x;
    m[7] = y;
    return m;
  }
  function multiply(a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    var b00 = b[0], b01 = b[1], b02 = b[2];
    var b10 = b[3], b11 = b[4], b12 = b[5];
    var b20 = b[6], b21 = b[7], b22 = b[8];
    a[0] = b00 * a00 + b01 * a10 + b02 * a20;
    a[1] = b00 * a01 + b01 * a11 + b02 * a21;
    a[2] = b00 * a02 + b01 * a12 + b02 * a22;
    a[3] = b10 * a00 + b11 * a10 + b12 * a20;
    a[4] = b10 * a01 + b11 * a11 + b12 * a21;
    a[5] = b10 * a02 + b11 * a12 + b12 * a22;
    a[6] = b20 * a00 + b21 * a10 + b22 * a20;
    a[7] = b20 * a01 + b21 * a11 + b22 * a21;
    a[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return a;
  }
  function multiplyVec2(a, b) {
    var z = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
    var a00 = a[0];
    var a01 = a[1];
    var a10 = a[3];
    var a11 = a[4];
    var a20 = a[6];
    var a21 = a[7];
    var b0 = b.x;
    var b1 = b.y;
    return {
      x: b0 * a00 + b1 * a10 + a20 * z,
      y: b0 * a01 + b1 * a11 + a21 * z
    };
  }
  function getCorrectionRatio(viewportDimensions, graphDimensions) {
    var viewportRatio = viewportDimensions.height / viewportDimensions.width;
    var graphRatio = graphDimensions.height / graphDimensions.width;
    if (viewportRatio < 1 && graphRatio > 1 || viewportRatio > 1 && graphRatio < 1) {
      return 1;
    }
    return Math.min(Math.max(graphRatio, 1 / graphRatio), Math.max(1 / viewportRatio, viewportRatio));
  }
  function matrixFromCamera(state, viewportDimensions, graphDimensions, padding, inverse) {
    var angle = state.angle, ratio = state.ratio, x = state.x, y = state.y;
    var width = viewportDimensions.width, height = viewportDimensions.height;
    var matrix = identity();
    var smallestDimension = Math.min(width, height) - 2 * padding;
    var correctionRatio = getCorrectionRatio(viewportDimensions, graphDimensions);
    if (!inverse) {
      multiply(matrix, scale(identity(), 2 * (smallestDimension / width) * correctionRatio, 2 * (smallestDimension / height) * correctionRatio));
      multiply(matrix, rotate(identity(), -angle));
      multiply(matrix, scale(identity(), 1 / ratio));
      multiply(matrix, translate(identity(), -x, -y));
    } else {
      multiply(matrix, translate(identity(), x, y));
      multiply(matrix, scale(identity(), ratio));
      multiply(matrix, rotate(identity(), angle));
      multiply(matrix, scale(identity(), width / smallestDimension / 2 / correctionRatio, height / smallestDimension / 2 / correctionRatio));
    }
    return matrix;
  }
  function getMatrixImpact(matrix, cameraState, viewportDimensions) {
    var _multiplyVec = multiplyVec2(matrix, {
      x: Math.cos(cameraState.angle),
      y: Math.sin(cameraState.angle)
    }, 0), x = _multiplyVec.x, y = _multiplyVec.y;
    return 1 / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / viewportDimensions.width;
  }
  function graphExtent(graph2) {
    if (!graph2.order) return {
      x: [0, 1],
      y: [0, 1]
    };
    var xMin = Infinity;
    var xMax = -Infinity;
    var yMin = Infinity;
    var yMax = -Infinity;
    graph2.forEachNode(function(_, attr) {
      var x = attr.x, y = attr.y;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    });
    return {
      x: [xMin, xMax],
      y: [yMin, yMax]
    };
  }
  function validateGraph(graph2) {
    if (!(0, import_is_graph.default)(graph2)) throw new Error("Sigma: invalid graph instance.");
    graph2.forEachNode(function(key, attributes) {
      if (!Number.isFinite(attributes.x) || !Number.isFinite(attributes.y)) {
        throw new Error("Sigma: Coordinates of node ".concat(key, " are invalid. A node must have a numeric 'x' and 'y' attribute."));
      }
    });
  }
  function createElement(tag, style, attributes) {
    var element = document.createElement(tag);
    if (style) {
      for (var k in style) {
        element.style[k] = style[k];
      }
    }
    if (attributes) {
      for (var _k in attributes) {
        element.setAttribute(_k, attributes[_k]);
      }
    }
    return element;
  }
  function getPixelRatio() {
    if (typeof window.devicePixelRatio !== "undefined") return window.devicePixelRatio;
    return 1;
  }
  function zIndexOrdering(_extent, getter, elements) {
    return elements.sort(function(a, b) {
      var zA = getter(a) || 0, zB = getter(b) || 0;
      if (zA < zB) return -1;
      if (zA > zB) return 1;
      return 0;
    });
  }
  function createNormalizationFunction(extent) {
    var _extent$x = _slicedToArray(extent.x, 2), minX = _extent$x[0], maxX = _extent$x[1], _extent$y = _slicedToArray(extent.y, 2), minY = _extent$y[0], maxY = _extent$y[1];
    var ratio = Math.max(maxX - minX, maxY - minY), dX = (maxX + minX) / 2, dY = (maxY + minY) / 2;
    if (ratio === 0 || Math.abs(ratio) === Infinity || isNaN(ratio)) ratio = 1;
    if (isNaN(dX)) dX = 0;
    if (isNaN(dY)) dY = 0;
    var fn = function fn2(data) {
      return {
        x: 0.5 + (data.x - dX) / ratio,
        y: 0.5 + (data.y - dY) / ratio
      };
    };
    fn.applyTo = function(data) {
      data.x = 0.5 + (data.x - dX) / ratio;
      data.y = 0.5 + (data.y - dY) / ratio;
    };
    fn.inverse = function(data) {
      return {
        x: dX + ratio * (data.x - 0.5),
        y: dY + ratio * (data.y - 0.5)
      };
    };
    fn.ratio = ratio;
    return fn;
  }

  // node_modules/sigma/dist/data-11df7124.esm.js
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function extend(array, values) {
    var l2 = values.size;
    if (l2 === 0) return;
    var l1 = array.length;
    array.length += l2;
    var i = 0;
    values.forEach(function(value) {
      array[l1 + i] = value;
      i++;
    });
  }
  function assign2(target) {
    target = target || {};
    for (var i = 0, l = arguments.length <= 1 ? 0 : arguments.length - 1; i < l; i++) {
      var o = i + 1 < 1 || arguments.length <= i + 1 ? void 0 : arguments[i + 1];
      if (!o) continue;
      Object.assign(target, o);
    }
    return target;
  }

  // node_modules/sigma/settings/dist/sigma-settings.esm.js
  var DEFAULT_SETTINGS = {
    // Performance
    hideEdgesOnMove: false,
    hideLabelsOnMove: false,
    renderLabels: true,
    renderEdgeLabels: false,
    enableEdgeEvents: false,
    // Component rendering
    defaultNodeColor: "#999",
    defaultNodeType: "circle",
    defaultEdgeColor: "#ccc",
    defaultEdgeType: "line",
    labelFont: "Arial",
    labelSize: 14,
    labelWeight: "normal",
    labelColor: {
      color: "#000"
    },
    edgeLabelFont: "Arial",
    edgeLabelSize: 14,
    edgeLabelWeight: "normal",
    edgeLabelColor: {
      attribute: "color"
    },
    stagePadding: 30,
    defaultDrawEdgeLabel: drawStraightEdgeLabel,
    defaultDrawNodeLabel: drawDiscNodeLabel,
    defaultDrawNodeHover: drawDiscNodeHover,
    minEdgeThickness: 1.7,
    antiAliasingFeather: 1,
    // Mouse and touch settings
    dragTimeout: 100,
    draggedEventsTolerance: 3,
    inertiaDuration: 200,
    inertiaRatio: 3,
    zoomDuration: 250,
    zoomingRatio: 1.7,
    doubleClickTimeout: 300,
    doubleClickZoomingRatio: 2.2,
    doubleClickZoomingDuration: 200,
    tapMoveTolerance: 10,
    // Size and scaling
    zoomToSizeRatioFunction: Math.sqrt,
    itemSizesReference: "screen",
    autoRescale: true,
    autoCenter: true,
    // Labels
    labelDensity: 1,
    labelGridCellSize: 100,
    labelRenderedSizeThreshold: 6,
    // Reducers
    nodeReducer: null,
    edgeReducer: null,
    // Features
    zIndex: false,
    minCameraRatio: null,
    maxCameraRatio: null,
    enableCameraZooming: true,
    enableCameraPanning: true,
    enableCameraRotation: true,
    cameraPanBoundaries: null,
    // Lifecycle
    allowInvalidContainer: false,
    // Program classes
    nodeProgramClasses: {},
    nodeHoverProgramClasses: {},
    edgeProgramClasses: {}
  };
  var DEFAULT_NODE_PROGRAM_CLASSES = {
    circle: NodeCircleProgram
  };
  var DEFAULT_EDGE_PROGRAM_CLASSES = {
    arrow: EdgeArrowProgram$1,
    line: EdgeRectangleProgram
  };
  function validateSettings(settings) {
    if (typeof settings.labelDensity !== "number" || settings.labelDensity < 0) {
      throw new Error("Settings: invalid `labelDensity`. Expecting a positive number.");
    }
    var minCameraRatio = settings.minCameraRatio, maxCameraRatio = settings.maxCameraRatio;
    if (typeof minCameraRatio === "number" && typeof maxCameraRatio === "number" && maxCameraRatio < minCameraRatio) {
      throw new Error("Settings: invalid camera ratio boundaries. Expecting `maxCameraRatio` to be greater than `minCameraRatio`.");
    }
  }
  function resolveSettings(settings) {
    var resolvedSettings = assign2({}, DEFAULT_SETTINGS, settings);
    resolvedSettings.nodeProgramClasses = assign2({}, DEFAULT_NODE_PROGRAM_CLASSES, resolvedSettings.nodeProgramClasses);
    resolvedSettings.edgeProgramClasses = assign2({}, DEFAULT_EDGE_PROGRAM_CLASSES, resolvedSettings.edgeProgramClasses);
    return resolvedSettings;
  }

  // node_modules/sigma/dist/sigma.esm.js
  var import_events3 = __toESM(require_events());
  var import_is_graph2 = __toESM(require_is_graph());
  var DEFAULT_ZOOMING_RATIO = 1.5;
  var Camera = /* @__PURE__ */ (function(_TypedEventEmitter) {
    function Camera2() {
      var _this;
      _classCallCheck(this, Camera2);
      _this = _callSuper(this, Camera2);
      _defineProperty(_this, "x", 0.5);
      _defineProperty(_this, "y", 0.5);
      _defineProperty(_this, "angle", 0);
      _defineProperty(_this, "ratio", 1);
      _defineProperty(_this, "minRatio", null);
      _defineProperty(_this, "maxRatio", null);
      _defineProperty(_this, "enabledZooming", true);
      _defineProperty(_this, "enabledPanning", true);
      _defineProperty(_this, "enabledRotation", true);
      _defineProperty(_this, "clean", null);
      _defineProperty(_this, "nextFrame", null);
      _defineProperty(_this, "previousState", null);
      _defineProperty(_this, "enabled", true);
      _this.previousState = _this.getState();
      return _this;
    }
    _inherits(Camera2, _TypedEventEmitter);
    return _createClass(Camera2, [{
      key: "enable",
      value: (
        /**
         * Method used to enable the camera.
         */
        function enable() {
          this.enabled = true;
          return this;
        }
      )
      /**
       * Method used to disable the camera.
       */
    }, {
      key: "disable",
      value: function disable() {
        this.enabled = false;
        return this;
      }
      /**
       * Method used to retrieve the camera's current state.
       */
    }, {
      key: "getState",
      value: function getState() {
        return {
          x: this.x,
          y: this.y,
          angle: this.angle,
          ratio: this.ratio
        };
      }
      /**
       * Method used to check whether the camera has the given state.
       */
    }, {
      key: "hasState",
      value: function hasState(state) {
        return this.x === state.x && this.y === state.y && this.ratio === state.ratio && this.angle === state.angle;
      }
      /**
       * Method used to retrieve the camera's previous state.
       */
    }, {
      key: "getPreviousState",
      value: function getPreviousState() {
        var state = this.previousState;
        if (!state) return null;
        return {
          x: state.x,
          y: state.y,
          angle: state.angle,
          ratio: state.ratio
        };
      }
      /**
       * Method used to check minRatio and maxRatio values.
       */
    }, {
      key: "getBoundedRatio",
      value: function getBoundedRatio(ratio) {
        var r = ratio;
        if (typeof this.minRatio === "number") r = Math.max(r, this.minRatio);
        if (typeof this.maxRatio === "number") r = Math.min(r, this.maxRatio);
        return r;
      }
      /**
       * Method used to check various things to return a legit state candidate.
       */
    }, {
      key: "validateState",
      value: function validateState(state) {
        var validatedState = {};
        if (this.enabledPanning && typeof state.x === "number") validatedState.x = state.x;
        if (this.enabledPanning && typeof state.y === "number") validatedState.y = state.y;
        if (this.enabledZooming && typeof state.ratio === "number") validatedState.ratio = this.getBoundedRatio(state.ratio);
        if (this.enabledRotation && typeof state.angle === "number") validatedState.angle = state.angle;
        return this.clean ? this.clean(_objectSpread2(_objectSpread2({}, this.getState()), validatedState)) : validatedState;
      }
      /**
       * Method used to check whether the camera is currently being animated.
       */
    }, {
      key: "isAnimated",
      value: function isAnimated() {
        return !!this.nextFrame;
      }
      /**
       * Method used to set the camera's state.
       */
    }, {
      key: "setState",
      value: function setState(state) {
        if (!this.enabled) return this;
        this.previousState = this.getState();
        var validState = this.validateState(state);
        if (typeof validState.x === "number") this.x = validState.x;
        if (typeof validState.y === "number") this.y = validState.y;
        if (typeof validState.ratio === "number") this.ratio = validState.ratio;
        if (typeof validState.angle === "number") this.angle = validState.angle;
        if (!this.hasState(this.previousState)) this.emit("updated", this.getState());
        return this;
      }
      /**
       * Method used to update the camera's state using a function.
       */
    }, {
      key: "updateState",
      value: function updateState(updater) {
        this.setState(updater(this.getState()));
        return this;
      }
      /**
       * Method used to animate the camera.
       */
    }, {
      key: "animate",
      value: function animate(state) {
        var _this2 = this;
        var opts = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        var callback = arguments.length > 2 ? arguments[2] : void 0;
        if (!callback) return new Promise(function(resolve) {
          return _this2.animate(state, opts, resolve);
        });
        if (!this.enabled) return;
        var options = _objectSpread2(_objectSpread2({}, ANIMATE_DEFAULTS), opts);
        var validState = this.validateState(state);
        var easing = typeof options.easing === "function" ? options.easing : easings[options.easing];
        var start2 = Date.now(), initialState = this.getState();
        var _fn = function fn() {
          var t = (Date.now() - start2) / options.duration;
          if (t >= 1) {
            _this2.nextFrame = null;
            _this2.setState(validState);
            if (_this2.animationCallback) {
              _this2.animationCallback.call(null);
              _this2.animationCallback = void 0;
            }
            return;
          }
          var coefficient = easing(t);
          var newState = {};
          if (typeof validState.x === "number") newState.x = initialState.x + (validState.x - initialState.x) * coefficient;
          if (typeof validState.y === "number") newState.y = initialState.y + (validState.y - initialState.y) * coefficient;
          if (_this2.enabledRotation && typeof validState.angle === "number") newState.angle = initialState.angle + (validState.angle - initialState.angle) * coefficient;
          if (typeof validState.ratio === "number") newState.ratio = initialState.ratio + (validState.ratio - initialState.ratio) * coefficient;
          _this2.setState(newState);
          _this2.nextFrame = requestAnimationFrame(_fn);
        };
        if (this.nextFrame) {
          cancelAnimationFrame(this.nextFrame);
          if (this.animationCallback) this.animationCallback.call(null);
          this.nextFrame = requestAnimationFrame(_fn);
        } else {
          _fn();
        }
        this.animationCallback = callback;
      }
      /**
       * Method used to zoom the camera.
       */
    }, {
      key: "animatedZoom",
      value: function animatedZoom(factorOrOptions) {
        if (!factorOrOptions) return this.animate({
          ratio: this.ratio / DEFAULT_ZOOMING_RATIO
        });
        if (typeof factorOrOptions === "number") return this.animate({
          ratio: this.ratio / factorOrOptions
        });
        return this.animate({
          ratio: this.ratio / (factorOrOptions.factor || DEFAULT_ZOOMING_RATIO)
        }, factorOrOptions);
      }
      /**
       * Method used to unzoom the camera.
       */
    }, {
      key: "animatedUnzoom",
      value: function animatedUnzoom(factorOrOptions) {
        if (!factorOrOptions) return this.animate({
          ratio: this.ratio * DEFAULT_ZOOMING_RATIO
        });
        if (typeof factorOrOptions === "number") return this.animate({
          ratio: this.ratio * factorOrOptions
        });
        return this.animate({
          ratio: this.ratio * (factorOrOptions.factor || DEFAULT_ZOOMING_RATIO)
        }, factorOrOptions);
      }
      /**
       * Method used to reset the camera.
       */
    }, {
      key: "animatedReset",
      value: function animatedReset(options) {
        return this.animate({
          x: 0.5,
          y: 0.5,
          ratio: 1,
          angle: 0
        }, options);
      }
      /**
       * Returns a new Camera instance, with the same state as the current camera.
       */
    }, {
      key: "copy",
      value: function copy() {
        return Camera2.from(this.getState());
      }
    }], [{
      key: "from",
      value: function from(state) {
        var camera = new Camera2();
        return camera.setState(state);
      }
    }]);
  })(TypedEventEmitter);
  function getPosition(e, dom) {
    var bbox = dom.getBoundingClientRect();
    return {
      x: e.clientX - bbox.left,
      y: e.clientY - bbox.top
    };
  }
  function getMouseCoords(e, dom) {
    var res = _objectSpread2(_objectSpread2({}, getPosition(e, dom)), {}, {
      sigmaDefaultPrevented: false,
      preventSigmaDefault: function preventSigmaDefault() {
        res.sigmaDefaultPrevented = true;
      },
      original: e
    });
    return res;
  }
  function cleanMouseCoords(e) {
    var res = "x" in e ? e : _objectSpread2(_objectSpread2({}, e.touches[0] || e.previousTouches[0]), {}, {
      original: e.original,
      sigmaDefaultPrevented: e.sigmaDefaultPrevented,
      preventSigmaDefault: function preventSigmaDefault() {
        e.sigmaDefaultPrevented = true;
        res.sigmaDefaultPrevented = true;
      }
    });
    return res;
  }
  function getWheelCoords(e, dom) {
    return _objectSpread2(_objectSpread2({}, getMouseCoords(e, dom)), {}, {
      delta: getWheelDelta(e)
    });
  }
  var MAX_TOUCHES = 2;
  function getTouchesArray(touches) {
    var arr = [];
    for (var i = 0, l = Math.min(touches.length, MAX_TOUCHES); i < l; i++) arr.push(touches[i]);
    return arr;
  }
  function getTouchCoords(e, previousTouches, dom) {
    var res = {
      touches: getTouchesArray(e.touches).map(function(touch) {
        return getPosition(touch, dom);
      }),
      previousTouches: previousTouches.map(function(touch) {
        return getPosition(touch, dom);
      }),
      sigmaDefaultPrevented: false,
      preventSigmaDefault: function preventSigmaDefault() {
        res.sigmaDefaultPrevented = true;
      },
      original: e
    };
    return res;
  }
  function getWheelDelta(e) {
    if (typeof e.deltaY !== "undefined") return e.deltaY * -3 / 360;
    if (typeof e.detail !== "undefined") return e.detail / -9;
    throw new Error("Captor: could not extract delta from event.");
  }
  var Captor = /* @__PURE__ */ (function(_TypedEventEmitter) {
    function Captor2(container, renderer2) {
      var _this;
      _classCallCheck(this, Captor2);
      _this = _callSuper(this, Captor2);
      _this.container = container;
      _this.renderer = renderer2;
      return _this;
    }
    _inherits(Captor2, _TypedEventEmitter);
    return _createClass(Captor2);
  })(TypedEventEmitter);
  var MOUSE_SETTINGS_KEYS = ["doubleClickTimeout", "doubleClickZoomingDuration", "doubleClickZoomingRatio", "dragTimeout", "draggedEventsTolerance", "inertiaDuration", "inertiaRatio", "zoomDuration", "zoomingRatio"];
  var DEFAULT_MOUSE_SETTINGS = MOUSE_SETTINGS_KEYS.reduce(function(iter, key) {
    return _objectSpread2(_objectSpread2({}, iter), {}, _defineProperty({}, key, DEFAULT_SETTINGS[key]));
  }, {});
  var MouseCaptor = /* @__PURE__ */ (function(_Captor) {
    function MouseCaptor2(container, renderer2) {
      var _this;
      _classCallCheck(this, MouseCaptor2);
      _this = _callSuper(this, MouseCaptor2, [container, renderer2]);
      _defineProperty(_this, "enabled", true);
      _defineProperty(_this, "draggedEvents", 0);
      _defineProperty(_this, "downStartTime", null);
      _defineProperty(_this, "lastMouseX", null);
      _defineProperty(_this, "lastMouseY", null);
      _defineProperty(_this, "isMouseDown", false);
      _defineProperty(_this, "isMoving", false);
      _defineProperty(_this, "movingTimeout", null);
      _defineProperty(_this, "startCameraState", null);
      _defineProperty(_this, "clicks", 0);
      _defineProperty(_this, "doubleClickTimeout", null);
      _defineProperty(_this, "currentWheelDirection", 0);
      _defineProperty(_this, "settings", DEFAULT_MOUSE_SETTINGS);
      _this.handleClick = _this.handleClick.bind(_this);
      _this.handleRightClick = _this.handleRightClick.bind(_this);
      _this.handleDown = _this.handleDown.bind(_this);
      _this.handleUp = _this.handleUp.bind(_this);
      _this.handleMove = _this.handleMove.bind(_this);
      _this.handleWheel = _this.handleWheel.bind(_this);
      _this.handleLeave = _this.handleLeave.bind(_this);
      _this.handleEnter = _this.handleEnter.bind(_this);
      container.addEventListener("click", _this.handleClick, {
        capture: false
      });
      container.addEventListener("contextmenu", _this.handleRightClick, {
        capture: false
      });
      container.addEventListener("mousedown", _this.handleDown, {
        capture: false
      });
      container.addEventListener("wheel", _this.handleWheel, {
        capture: false
      });
      container.addEventListener("mouseleave", _this.handleLeave, {
        capture: false
      });
      container.addEventListener("mouseenter", _this.handleEnter, {
        capture: false
      });
      document.addEventListener("mousemove", _this.handleMove, {
        capture: false
      });
      document.addEventListener("mouseup", _this.handleUp, {
        capture: false
      });
      return _this;
    }
    _inherits(MouseCaptor2, _Captor);
    return _createClass(MouseCaptor2, [{
      key: "kill",
      value: function kill() {
        var container = this.container;
        container.removeEventListener("click", this.handleClick);
        container.removeEventListener("contextmenu", this.handleRightClick);
        container.removeEventListener("mousedown", this.handleDown);
        container.removeEventListener("wheel", this.handleWheel);
        container.removeEventListener("mouseleave", this.handleLeave);
        container.removeEventListener("mouseenter", this.handleEnter);
        document.removeEventListener("mousemove", this.handleMove);
        document.removeEventListener("mouseup", this.handleUp);
      }
    }, {
      key: "handleClick",
      value: function handleClick(e) {
        var _this2 = this;
        if (!this.enabled) return;
        this.clicks++;
        if (this.clicks === 2) {
          this.clicks = 0;
          if (typeof this.doubleClickTimeout === "number") {
            clearTimeout(this.doubleClickTimeout);
            this.doubleClickTimeout = null;
          }
          return this.handleDoubleClick(e);
        }
        setTimeout(function() {
          _this2.clicks = 0;
          _this2.doubleClickTimeout = null;
        }, this.settings.doubleClickTimeout);
        if (this.draggedEvents < this.settings.draggedEventsTolerance) this.emit("click", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleRightClick",
      value: function handleRightClick(e) {
        if (!this.enabled) return;
        this.emit("rightClick", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleDoubleClick",
      value: function handleDoubleClick(e) {
        if (!this.enabled) return;
        e.preventDefault();
        e.stopPropagation();
        var mouseCoords = getMouseCoords(e, this.container);
        this.emit("doubleClick", mouseCoords);
        if (mouseCoords.sigmaDefaultPrevented) return;
        var camera = this.renderer.getCamera();
        var newRatio = camera.getBoundedRatio(camera.getState().ratio / this.settings.doubleClickZoomingRatio);
        camera.animate(this.renderer.getViewportZoomedState(getPosition(e, this.container), newRatio), {
          easing: "quadraticInOut",
          duration: this.settings.doubleClickZoomingDuration
        });
      }
    }, {
      key: "handleDown",
      value: function handleDown(e) {
        if (!this.enabled) return;
        if (e.button === 0) {
          this.startCameraState = this.renderer.getCamera().getState();
          var _getPosition = getPosition(e, this.container), x = _getPosition.x, y = _getPosition.y;
          this.lastMouseX = x;
          this.lastMouseY = y;
          this.draggedEvents = 0;
          this.downStartTime = Date.now();
          this.isMouseDown = true;
        }
        this.emit("mousedown", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleUp",
      value: function handleUp(e) {
        var _this3 = this;
        if (!this.enabled || !this.isMouseDown) return;
        var camera = this.renderer.getCamera();
        this.isMouseDown = false;
        if (typeof this.movingTimeout === "number") {
          clearTimeout(this.movingTimeout);
          this.movingTimeout = null;
        }
        var _getPosition2 = getPosition(e, this.container), x = _getPosition2.x, y = _getPosition2.y;
        var cameraState = camera.getState(), previousCameraState = camera.getPreviousState() || {
          x: 0,
          y: 0
        };
        if (this.isMoving) {
          camera.animate({
            x: cameraState.x + this.settings.inertiaRatio * (cameraState.x - previousCameraState.x),
            y: cameraState.y + this.settings.inertiaRatio * (cameraState.y - previousCameraState.y)
          }, {
            duration: this.settings.inertiaDuration,
            easing: "quadraticOut"
          });
        } else if (this.lastMouseX !== x || this.lastMouseY !== y) {
          camera.setState({
            x: cameraState.x,
            y: cameraState.y
          });
        }
        this.isMoving = false;
        setTimeout(function() {
          var shouldRefresh = _this3.draggedEvents > 0;
          _this3.draggedEvents = 0;
          if (shouldRefresh && _this3.renderer.getSetting("hideEdgesOnMove")) _this3.renderer.refresh();
        }, 0);
        this.emit("mouseup", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleMove",
      value: function handleMove(e) {
        var _this4 = this;
        if (!this.enabled) return;
        var mouseCoords = getMouseCoords(e, this.container);
        this.emit("mousemovebody", mouseCoords);
        if (e.target === this.container || e.composedPath()[0] === this.container) {
          this.emit("mousemove", mouseCoords);
        }
        if (mouseCoords.sigmaDefaultPrevented) return;
        if (this.isMouseDown) {
          this.isMoving = true;
          this.draggedEvents++;
          if (typeof this.movingTimeout === "number") {
            clearTimeout(this.movingTimeout);
          }
          this.movingTimeout = window.setTimeout(function() {
            _this4.movingTimeout = null;
            _this4.isMoving = false;
          }, this.settings.dragTimeout);
          var camera = this.renderer.getCamera();
          var _getPosition3 = getPosition(e, this.container), eX = _getPosition3.x, eY = _getPosition3.y;
          var lastMouse = this.renderer.viewportToFramedGraph({
            x: this.lastMouseX,
            y: this.lastMouseY
          });
          var mouse = this.renderer.viewportToFramedGraph({
            x: eX,
            y: eY
          });
          var offsetX = lastMouse.x - mouse.x, offsetY = lastMouse.y - mouse.y;
          var cameraState = camera.getState();
          var x = cameraState.x + offsetX, y = cameraState.y + offsetY;
          camera.setState({
            x,
            y
          });
          this.lastMouseX = eX;
          this.lastMouseY = eY;
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, {
      key: "handleLeave",
      value: function handleLeave(e) {
        this.emit("mouseleave", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleEnter",
      value: function handleEnter(e) {
        this.emit("mouseenter", getMouseCoords(e, this.container));
      }
    }, {
      key: "handleWheel",
      value: function handleWheel(e) {
        var _this5 = this;
        var camera = this.renderer.getCamera();
        if (!this.enabled || !camera.enabledZooming) return;
        var delta = getWheelDelta(e);
        if (!delta) return;
        var wheelCoords = getWheelCoords(e, this.container);
        this.emit("wheel", wheelCoords);
        if (wheelCoords.sigmaDefaultPrevented) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        var currentRatio = camera.getState().ratio;
        var ratioDiff = delta > 0 ? 1 / this.settings.zoomingRatio : this.settings.zoomingRatio;
        var newRatio = camera.getBoundedRatio(currentRatio * ratioDiff);
        var wheelDirection = delta > 0 ? 1 : -1;
        var now = Date.now();
        if (currentRatio === newRatio) return;
        e.preventDefault();
        e.stopPropagation();
        if (this.currentWheelDirection === wheelDirection && this.lastWheelTriggerTime && now - this.lastWheelTriggerTime < this.settings.zoomDuration / 5) {
          return;
        }
        camera.animate(this.renderer.getViewportZoomedState(getPosition(e, this.container), newRatio), {
          easing: "quadraticOut",
          duration: this.settings.zoomDuration
        }, function() {
          _this5.currentWheelDirection = 0;
        });
        this.currentWheelDirection = wheelDirection;
        this.lastWheelTriggerTime = now;
      }
    }, {
      key: "setSettings",
      value: function setSettings(settings) {
        this.settings = settings;
      }
    }]);
  })(Captor);
  var TOUCH_SETTINGS_KEYS = ["dragTimeout", "inertiaDuration", "inertiaRatio", "doubleClickTimeout", "doubleClickZoomingRatio", "doubleClickZoomingDuration", "tapMoveTolerance"];
  var DEFAULT_TOUCH_SETTINGS = TOUCH_SETTINGS_KEYS.reduce(function(iter, key) {
    return _objectSpread2(_objectSpread2({}, iter), {}, _defineProperty({}, key, DEFAULT_SETTINGS[key]));
  }, {});
  var TouchCaptor = /* @__PURE__ */ (function(_Captor) {
    function TouchCaptor2(container, renderer2) {
      var _this;
      _classCallCheck(this, TouchCaptor2);
      _this = _callSuper(this, TouchCaptor2, [container, renderer2]);
      _defineProperty(_this, "enabled", true);
      _defineProperty(_this, "isMoving", false);
      _defineProperty(_this, "hasMoved", false);
      _defineProperty(_this, "touchMode", 0);
      _defineProperty(_this, "startTouchesPositions", []);
      _defineProperty(_this, "lastTouches", []);
      _defineProperty(_this, "lastTap", null);
      _defineProperty(_this, "settings", DEFAULT_TOUCH_SETTINGS);
      _this.handleStart = _this.handleStart.bind(_this);
      _this.handleLeave = _this.handleLeave.bind(_this);
      _this.handleMove = _this.handleMove.bind(_this);
      container.addEventListener("touchstart", _this.handleStart, {
        capture: false
      });
      container.addEventListener("touchcancel", _this.handleLeave, {
        capture: false
      });
      document.addEventListener("touchend", _this.handleLeave, {
        capture: false,
        passive: false
      });
      document.addEventListener("touchmove", _this.handleMove, {
        capture: false,
        passive: false
      });
      return _this;
    }
    _inherits(TouchCaptor2, _Captor);
    return _createClass(TouchCaptor2, [{
      key: "kill",
      value: function kill() {
        var container = this.container;
        container.removeEventListener("touchstart", this.handleStart);
        container.removeEventListener("touchcancel", this.handleLeave);
        document.removeEventListener("touchend", this.handleLeave);
        document.removeEventListener("touchmove", this.handleMove);
      }
    }, {
      key: "getDimensions",
      value: function getDimensions() {
        return {
          width: this.container.offsetWidth,
          height: this.container.offsetHeight
        };
      }
    }, {
      key: "handleStart",
      value: function handleStart(e) {
        var _this2 = this;
        if (!this.enabled) return;
        e.preventDefault();
        var touches = getTouchesArray(e.touches);
        this.touchMode = touches.length;
        this.startCameraState = this.renderer.getCamera().getState();
        this.startTouchesPositions = touches.map(function(touch) {
          return getPosition(touch, _this2.container);
        });
        if (this.touchMode === 2) {
          var _this$startTouchesPos = _slicedToArray(this.startTouchesPositions, 2), _this$startTouchesPos2 = _this$startTouchesPos[0], x0 = _this$startTouchesPos2.x, y0 = _this$startTouchesPos2.y, _this$startTouchesPos3 = _this$startTouchesPos[1], x1 = _this$startTouchesPos3.x, y1 = _this$startTouchesPos3.y;
          this.startTouchesAngle = Math.atan2(y1 - y0, x1 - x0);
          this.startTouchesDistance = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        }
        this.emit("touchdown", getTouchCoords(e, this.lastTouches, this.container));
        this.lastTouches = touches;
        this.lastTouchesPositions = this.startTouchesPositions;
      }
    }, {
      key: "handleLeave",
      value: function handleLeave(e) {
        if (!this.enabled || !this.startTouchesPositions.length) return;
        if (e.cancelable) e.preventDefault();
        if (this.movingTimeout) {
          this.isMoving = false;
          clearTimeout(this.movingTimeout);
        }
        switch (this.touchMode) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          case 2:
            if (e.touches.length === 1) {
              this.handleStart(e);
              e.preventDefault();
              break;
            }
          /* falls through */
          case 1:
            if (this.isMoving) {
              var camera = this.renderer.getCamera();
              var cameraState = camera.getState(), previousCameraState = camera.getPreviousState() || {
                x: 0,
                y: 0
              };
              camera.animate({
                x: cameraState.x + this.settings.inertiaRatio * (cameraState.x - previousCameraState.x),
                y: cameraState.y + this.settings.inertiaRatio * (cameraState.y - previousCameraState.y)
              }, {
                duration: this.settings.inertiaDuration,
                easing: "quadraticOut"
              });
            }
            this.hasMoved = false;
            this.isMoving = false;
            this.touchMode = 0;
            break;
        }
        this.emit("touchup", getTouchCoords(e, this.lastTouches, this.container));
        if (!e.touches.length) {
          var position = getPosition(this.lastTouches[0], this.container);
          var downPosition = this.startTouchesPositions[0];
          var dSquare = Math.pow(position.x - downPosition.x, 2) + Math.pow(position.y - downPosition.y, 2);
          if (!e.touches.length && dSquare < Math.pow(this.settings.tapMoveTolerance, 2)) {
            if (this.lastTap && Date.now() - this.lastTap.time < this.settings.doubleClickTimeout) {
              var touchCoords = getTouchCoords(e, this.lastTouches, this.container);
              this.emit("doubletap", touchCoords);
              this.lastTap = null;
              if (!touchCoords.sigmaDefaultPrevented) {
                var _camera = this.renderer.getCamera();
                var newRatio = _camera.getBoundedRatio(_camera.getState().ratio / this.settings.doubleClickZoomingRatio);
                _camera.animate(this.renderer.getViewportZoomedState(position, newRatio), {
                  easing: "quadraticInOut",
                  duration: this.settings.doubleClickZoomingDuration
                });
              }
            } else {
              var _touchCoords = getTouchCoords(e, this.lastTouches, this.container);
              this.emit("tap", _touchCoords);
              this.lastTap = {
                time: Date.now(),
                position: _touchCoords.touches[0] || _touchCoords.previousTouches[0]
              };
            }
          }
        }
        this.lastTouches = getTouchesArray(e.touches);
        this.startTouchesPositions = [];
      }
    }, {
      key: "handleMove",
      value: function handleMove(e) {
        var _this3 = this;
        if (!this.enabled || !this.startTouchesPositions.length) return;
        e.preventDefault();
        var touches = getTouchesArray(e.touches);
        var touchesPositions = touches.map(function(touch) {
          return getPosition(touch, _this3.container);
        });
        var lastTouches = this.lastTouches;
        this.lastTouches = touches;
        this.lastTouchesPositions = touchesPositions;
        var touchCoords = getTouchCoords(e, lastTouches, this.container);
        this.emit("touchmove", touchCoords);
        if (touchCoords.sigmaDefaultPrevented) return;
        this.hasMoved || (this.hasMoved = touchesPositions.some(function(position, idx) {
          var startPosition = _this3.startTouchesPositions[idx];
          return startPosition && (position.x !== startPosition.x || position.y !== startPosition.y);
        }));
        if (!this.hasMoved) {
          return;
        }
        this.isMoving = true;
        if (this.movingTimeout) clearTimeout(this.movingTimeout);
        this.movingTimeout = window.setTimeout(function() {
          _this3.isMoving = false;
        }, this.settings.dragTimeout);
        var camera = this.renderer.getCamera();
        var startCameraState = this.startCameraState;
        var padding = this.renderer.getSetting("stagePadding");
        switch (this.touchMode) {
          case 1: {
            var _this$renderer$viewpo = this.renderer.viewportToFramedGraph((this.startTouchesPositions || [])[0]), xStart = _this$renderer$viewpo.x, yStart = _this$renderer$viewpo.y;
            var _this$renderer$viewpo2 = this.renderer.viewportToFramedGraph(touchesPositions[0]), x = _this$renderer$viewpo2.x, y = _this$renderer$viewpo2.y;
            camera.setState({
              x: startCameraState.x + xStart - x,
              y: startCameraState.y + yStart - y
            });
            break;
          }
          case 2: {
            var newCameraState = {
              x: 0.5,
              y: 0.5,
              angle: 0,
              ratio: 1
            };
            var _touchesPositions$ = touchesPositions[0], x0 = _touchesPositions$.x, y0 = _touchesPositions$.y;
            var _touchesPositions$2 = touchesPositions[1], x1 = _touchesPositions$2.x, y1 = _touchesPositions$2.y;
            var angleDiff = Math.atan2(y1 - y0, x1 - x0) - this.startTouchesAngle;
            var ratioDiff = Math.hypot(y1 - y0, x1 - x0) / this.startTouchesDistance;
            var newRatio = camera.getBoundedRatio(startCameraState.ratio / ratioDiff);
            newCameraState.ratio = newRatio;
            newCameraState.angle = startCameraState.angle + angleDiff;
            var dimensions = this.getDimensions();
            var touchGraphPosition = this.renderer.viewportToFramedGraph((this.startTouchesPositions || [])[0], {
              cameraState: startCameraState
            });
            var smallestDimension = Math.min(dimensions.width, dimensions.height) - 2 * padding;
            var dx = smallestDimension / dimensions.width;
            var dy = smallestDimension / dimensions.height;
            var ratio = newRatio / smallestDimension;
            var _x = x0 - smallestDimension / 2 / dx;
            var _y = y0 - smallestDimension / 2 / dy;
            var _ref = [_x * Math.cos(-newCameraState.angle) - _y * Math.sin(-newCameraState.angle), _y * Math.cos(-newCameraState.angle) + _x * Math.sin(-newCameraState.angle)];
            _x = _ref[0];
            _y = _ref[1];
            newCameraState.x = touchGraphPosition.x - _x * ratio;
            newCameraState.y = touchGraphPosition.y + _y * ratio;
            camera.setState(newCameraState);
            break;
          }
        }
      }
    }, {
      key: "setSettings",
      value: function setSettings(settings) {
        this.settings = settings;
      }
    }]);
  })(Captor);
  function _arrayWithoutHoles(r) {
    if (Array.isArray(r)) return _arrayLikeToArray(r);
  }
  function _iterableToArray(r) {
    if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
  }
  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _toConsumableArray(r) {
    return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread();
  }
  function _objectWithoutPropertiesLoose(r, e) {
    if (null == r) return {};
    var t = {};
    for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
      if (-1 !== e.indexOf(n)) continue;
      t[n] = r[n];
    }
    return t;
  }
  function _objectWithoutProperties(e, t) {
    if (null == e) return {};
    var o, r, i = _objectWithoutPropertiesLoose(e, t);
    if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);
      for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
    }
    return i;
  }
  var LabelCandidate = /* @__PURE__ */ (function() {
    function LabelCandidate2(key, size) {
      _classCallCheck(this, LabelCandidate2);
      this.key = key;
      this.size = size;
    }
    return _createClass(LabelCandidate2, null, [{
      key: "compare",
      value: function compare(first, second) {
        if (first.size > second.size) return -1;
        if (first.size < second.size) return 1;
        if (first.key > second.key) return 1;
        return -1;
      }
    }]);
  })();
  var LabelGrid = /* @__PURE__ */ (function() {
    function LabelGrid2() {
      _classCallCheck(this, LabelGrid2);
      _defineProperty(this, "width", 0);
      _defineProperty(this, "height", 0);
      _defineProperty(this, "cellSize", 0);
      _defineProperty(this, "columns", 0);
      _defineProperty(this, "rows", 0);
      _defineProperty(this, "cells", {});
    }
    return _createClass(LabelGrid2, [{
      key: "resizeAndClear",
      value: function resizeAndClear(dimensions, cellSize) {
        this.width = dimensions.width;
        this.height = dimensions.height;
        this.cellSize = cellSize;
        this.columns = Math.ceil(dimensions.width / cellSize);
        this.rows = Math.ceil(dimensions.height / cellSize);
        this.cells = {};
      }
    }, {
      key: "getIndex",
      value: function getIndex(pos) {
        var xIndex = Math.floor(pos.x / this.cellSize);
        var yIndex = Math.floor(pos.y / this.cellSize);
        return yIndex * this.columns + xIndex;
      }
    }, {
      key: "add",
      value: function add(key, size, pos) {
        var candidate = new LabelCandidate(key, size);
        var index = this.getIndex(pos);
        var cell = this.cells[index];
        if (!cell) {
          cell = [];
          this.cells[index] = cell;
        }
        cell.push(candidate);
      }
    }, {
      key: "organize",
      value: function organize() {
        for (var k in this.cells) {
          var cell = this.cells[k];
          cell.sort(LabelCandidate.compare);
        }
      }
    }, {
      key: "getLabelsToDisplay",
      value: function getLabelsToDisplay(ratio, density) {
        var cellArea = this.cellSize * this.cellSize;
        var scaledCellArea = cellArea / ratio / ratio;
        var scaledDensity = scaledCellArea * density / cellArea;
        var labelsToDisplayPerCell = Math.ceil(scaledDensity);
        var labels = [];
        for (var k in this.cells) {
          var cell = this.cells[k];
          for (var i = 0; i < Math.min(labelsToDisplayPerCell, cell.length); i++) {
            labels.push(cell[i].key);
          }
        }
        return labels;
      }
    }]);
  })();
  function edgeLabelsToDisplayFromNodes(params) {
    var graph2 = params.graph, hoveredNode = params.hoveredNode, highlightedNodes2 = params.highlightedNodes, displayedNodeLabels = params.displayedNodeLabels;
    var worthyEdges = [];
    graph2.forEachEdge(function(edge, _, source, target) {
      if (source === hoveredNode || target === hoveredNode || highlightedNodes2.has(source) || highlightedNodes2.has(target) || displayedNodeLabels.has(source) && displayedNodeLabels.has(target)) {
        worthyEdges.push(edge);
      }
    });
    return worthyEdges;
  }
  var X_LABEL_MARGIN = 150;
  var Y_LABEL_MARGIN = 50;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function applyNodeDefaults(settings, key, data) {
    if (!hasOwnProperty.call(data, "x") || !hasOwnProperty.call(data, "y")) throw new Error('Sigma: could not find a valid position (x, y) for node "'.concat(key, '". All your nodes must have a number "x" and "y". Maybe your forgot to apply a layout or your "nodeReducer" is not returning the correct data?'));
    if (!data.color) data.color = settings.defaultNodeColor;
    if (!data.label && data.label !== "") data.label = null;
    if (data.label !== void 0 && data.label !== null) data.label = "" + data.label;
    else data.label = null;
    if (!data.size) data.size = 2;
    if (!hasOwnProperty.call(data, "hidden")) data.hidden = false;
    if (!hasOwnProperty.call(data, "highlighted")) data.highlighted = false;
    if (!hasOwnProperty.call(data, "forceLabel")) data.forceLabel = false;
    if (!data.type || data.type === "") data.type = settings.defaultNodeType;
    if (!data.zIndex) data.zIndex = 0;
    return data;
  }
  function applyEdgeDefaults(settings, _key, data) {
    if (!data.color) data.color = settings.defaultEdgeColor;
    if (!data.label) data.label = "";
    if (!data.size) data.size = 0.5;
    if (!hasOwnProperty.call(data, "hidden")) data.hidden = false;
    if (!hasOwnProperty.call(data, "forceLabel")) data.forceLabel = false;
    if (!data.type || data.type === "") data.type = settings.defaultEdgeType;
    if (!data.zIndex) data.zIndex = 0;
    return data;
  }
  var Sigma$1 = /* @__PURE__ */ (function(_TypedEventEmitter) {
    function Sigma2(graph2, container) {
      var _this;
      var settings = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      _classCallCheck(this, Sigma2);
      _this = _callSuper(this, Sigma2);
      _defineProperty(_this, "elements", {});
      _defineProperty(_this, "canvasContexts", {});
      _defineProperty(_this, "webGLContexts", {});
      _defineProperty(_this, "pickingLayers", /* @__PURE__ */ new Set());
      _defineProperty(_this, "textures", {});
      _defineProperty(_this, "frameBuffers", {});
      _defineProperty(_this, "activeListeners", {});
      _defineProperty(_this, "labelGrid", new LabelGrid());
      _defineProperty(_this, "nodeDataCache", {});
      _defineProperty(_this, "edgeDataCache", {});
      _defineProperty(_this, "nodeProgramIndex", {});
      _defineProperty(_this, "edgeProgramIndex", {});
      _defineProperty(_this, "nodesWithForcedLabels", /* @__PURE__ */ new Set());
      _defineProperty(_this, "edgesWithForcedLabels", /* @__PURE__ */ new Set());
      _defineProperty(_this, "nodeExtent", {
        x: [0, 1],
        y: [0, 1]
      });
      _defineProperty(_this, "nodeZExtent", [Infinity, -Infinity]);
      _defineProperty(_this, "edgeZExtent", [Infinity, -Infinity]);
      _defineProperty(_this, "matrix", identity());
      _defineProperty(_this, "invMatrix", identity());
      _defineProperty(_this, "correctionRatio", 1);
      _defineProperty(_this, "customBBox", null);
      _defineProperty(_this, "normalizationFunction", createNormalizationFunction({
        x: [0, 1],
        y: [0, 1]
      }));
      _defineProperty(_this, "graphToViewportRatio", 1);
      _defineProperty(_this, "itemIDsIndex", {});
      _defineProperty(_this, "nodeIndices", {});
      _defineProperty(_this, "edgeIndices", {});
      _defineProperty(_this, "width", 0);
      _defineProperty(_this, "height", 0);
      _defineProperty(_this, "pixelRatio", getPixelRatio());
      _defineProperty(_this, "pickingDownSizingRatio", 2 * _this.pixelRatio);
      _defineProperty(_this, "displayedNodeLabels", /* @__PURE__ */ new Set());
      _defineProperty(_this, "displayedEdgeLabels", /* @__PURE__ */ new Set());
      _defineProperty(_this, "highlightedNodes", /* @__PURE__ */ new Set());
      _defineProperty(_this, "hoveredNode", null);
      _defineProperty(_this, "hoveredEdge", null);
      _defineProperty(_this, "renderFrame", null);
      _defineProperty(_this, "renderHighlightedNodesFrame", null);
      _defineProperty(_this, "needToProcess", false);
      _defineProperty(_this, "checkEdgesEventsFrame", null);
      _defineProperty(_this, "nodePrograms", {});
      _defineProperty(_this, "nodeHoverPrograms", {});
      _defineProperty(_this, "edgePrograms", {});
      _this.settings = resolveSettings(settings);
      validateSettings(_this.settings);
      validateGraph(graph2);
      if (!(container instanceof HTMLElement)) throw new Error("Sigma: container should be an html element.");
      _this.graph = graph2;
      _this.container = container;
      _this.createWebGLContext("edges", {
        picking: settings.enableEdgeEvents
      });
      _this.createCanvasContext("edgeLabels");
      _this.createWebGLContext("nodes", {
        picking: true
      });
      _this.createCanvasContext("labels");
      _this.createCanvasContext("hovers");
      _this.createWebGLContext("hoverNodes");
      _this.createCanvasContext("mouse", {
        style: {
          touchAction: "none",
          userSelect: "none"
        }
      });
      _this.resize();
      for (var type in _this.settings.nodeProgramClasses) {
        _this.registerNodeProgram(type, _this.settings.nodeProgramClasses[type], _this.settings.nodeHoverProgramClasses[type]);
      }
      for (var _type in _this.settings.edgeProgramClasses) {
        _this.registerEdgeProgram(_type, _this.settings.edgeProgramClasses[_type]);
      }
      _this.camera = new Camera();
      _this.bindCameraHandlers();
      _this.mouseCaptor = new MouseCaptor(_this.elements.mouse, _this);
      _this.mouseCaptor.setSettings(_this.settings);
      _this.touchCaptor = new TouchCaptor(_this.elements.mouse, _this);
      _this.touchCaptor.setSettings(_this.settings);
      _this.bindEventHandlers();
      _this.bindGraphHandlers();
      _this.handleSettingsUpdate();
      _this.refresh();
      return _this;
    }
    _inherits(Sigma2, _TypedEventEmitter);
    return _createClass(Sigma2, [{
      key: "registerNodeProgram",
      value: function registerNodeProgram(key, NodeProgramClass, NodeHoverProgram) {
        if (this.nodePrograms[key]) this.nodePrograms[key].kill();
        if (this.nodeHoverPrograms[key]) this.nodeHoverPrograms[key].kill();
        this.nodePrograms[key] = new NodeProgramClass(this.webGLContexts.nodes, this.frameBuffers.nodes, this);
        this.nodeHoverPrograms[key] = new (NodeHoverProgram || NodeProgramClass)(this.webGLContexts.hoverNodes, null, this);
        return this;
      }
      /**
       * Internal function used to register an edge program
       *
       * @param  {string}          key              - The program's key, matching the related edges "type" values.
       * @param  {EdgeProgramType} EdgeProgramClass - An edges program class.
       * @return {Sigma}
       */
    }, {
      key: "registerEdgeProgram",
      value: function registerEdgeProgram(key, EdgeProgramClass) {
        if (this.edgePrograms[key]) this.edgePrograms[key].kill();
        this.edgePrograms[key] = new EdgeProgramClass(this.webGLContexts.edges, this.frameBuffers.edges, this);
        return this;
      }
      /**
       * Internal function used to unregister a node program
       *
       * @param  {string} key - The program's key, matching the related nodes "type" values.
       * @return {Sigma}
       */
    }, {
      key: "unregisterNodeProgram",
      value: function unregisterNodeProgram(key) {
        if (this.nodePrograms[key]) {
          var _this$nodePrograms = this.nodePrograms, program = _this$nodePrograms[key], programs = _objectWithoutProperties(_this$nodePrograms, [key].map(_toPropertyKey));
          program.kill();
          this.nodePrograms = programs;
        }
        if (this.nodeHoverPrograms[key]) {
          var _this$nodeHoverProgra = this.nodeHoverPrograms, _program = _this$nodeHoverProgra[key], _programs = _objectWithoutProperties(_this$nodeHoverProgra, [key].map(_toPropertyKey));
          _program.kill();
          this.nodePrograms = _programs;
        }
        return this;
      }
      /**
       * Internal function used to unregister an edge program
       *
       * @param  {string} key - The program's key, matching the related edges "type" values.
       * @return {Sigma}
       */
    }, {
      key: "unregisterEdgeProgram",
      value: function unregisterEdgeProgram(key) {
        if (this.edgePrograms[key]) {
          var _this$edgePrograms = this.edgePrograms, program = _this$edgePrograms[key], programs = _objectWithoutProperties(_this$edgePrograms, [key].map(_toPropertyKey));
          program.kill();
          this.edgePrograms = programs;
        }
        return this;
      }
      /**
       * Method (re)binding WebGL texture (for picking).
       *
       * @return {Sigma}
       */
    }, {
      key: "resetWebGLTexture",
      value: function resetWebGLTexture(id) {
        var gl = this.webGLContexts[id];
        var frameBuffer = this.frameBuffers[id];
        var currentTexture = this.textures[id];
        if (currentTexture) gl.deleteTexture(currentTexture);
        var pickingTexture = gl.createTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        gl.bindTexture(gl.TEXTURE_2D, pickingTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickingTexture, 0);
        this.textures[id] = pickingTexture;
        return this;
      }
      /**
       * Method binding camera handlers.
       *
       * @return {Sigma}
       */
    }, {
      key: "bindCameraHandlers",
      value: function bindCameraHandlers() {
        var _this2 = this;
        this.activeListeners.camera = function() {
          _this2.scheduleRender();
        };
        this.camera.on("updated", this.activeListeners.camera);
        return this;
      }
      /**
       * Method unbinding camera handlers.
       *
       * @return {Sigma}
       */
    }, {
      key: "unbindCameraHandlers",
      value: function unbindCameraHandlers() {
        this.camera.removeListener("updated", this.activeListeners.camera);
        return this;
      }
      /**
       * Method that returns the closest node to a given position.
       */
    }, {
      key: "getNodeAtPosition",
      value: function getNodeAtPosition(position) {
        var x = position.x, y = position.y;
        var color = getPixelColor(this.webGLContexts.nodes, this.frameBuffers.nodes, x, y, this.pixelRatio, this.pickingDownSizingRatio);
        var index = colorToIndex.apply(void 0, _toConsumableArray(color));
        var itemAt = this.itemIDsIndex[index];
        return itemAt && itemAt.type === "node" ? itemAt.id : null;
      }
      /**
       * Method binding event handlers.
       *
       * @return {Sigma}
       */
    }, {
      key: "bindEventHandlers",
      value: function bindEventHandlers() {
        var _this3 = this;
        this.activeListeners.handleResize = function() {
          _this3.scheduleRefresh();
        };
        window.addEventListener("resize", this.activeListeners.handleResize);
        this.activeListeners.handleMove = function(e) {
          var event = cleanMouseCoords(e);
          var baseEvent = {
            event,
            preventSigmaDefault: function preventSigmaDefault() {
              event.preventSigmaDefault();
            }
          };
          var nodeToHover = _this3.getNodeAtPosition(event);
          if (nodeToHover && _this3.hoveredNode !== nodeToHover && !_this3.nodeDataCache[nodeToHover].hidden) {
            if (_this3.hoveredNode) _this3.emit("leaveNode", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
              node: _this3.hoveredNode
            }));
            _this3.hoveredNode = nodeToHover;
            _this3.emit("enterNode", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
              node: nodeToHover
            }));
            _this3.scheduleHighlightedNodesRender();
            return;
          }
          if (_this3.hoveredNode) {
            if (_this3.getNodeAtPosition(event) !== _this3.hoveredNode) {
              var node = _this3.hoveredNode;
              _this3.hoveredNode = null;
              _this3.emit("leaveNode", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
                node
              }));
              _this3.scheduleHighlightedNodesRender();
              return;
            }
          }
          if (_this3.settings.enableEdgeEvents) {
            var edgeToHover = _this3.hoveredNode ? null : _this3.getEdgeAtPoint(baseEvent.event.x, baseEvent.event.y);
            if (edgeToHover !== _this3.hoveredEdge) {
              if (_this3.hoveredEdge) _this3.emit("leaveEdge", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
                edge: _this3.hoveredEdge
              }));
              if (edgeToHover) _this3.emit("enterEdge", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
                edge: edgeToHover
              }));
              _this3.hoveredEdge = edgeToHover;
            }
          }
        };
        this.activeListeners.handleMoveBody = function(e) {
          var event = cleanMouseCoords(e);
          _this3.emit("moveBody", {
            event,
            preventSigmaDefault: function preventSigmaDefault() {
              event.preventSigmaDefault();
            }
          });
        };
        this.activeListeners.handleLeave = function(e) {
          var event = cleanMouseCoords(e);
          var baseEvent = {
            event,
            preventSigmaDefault: function preventSigmaDefault() {
              event.preventSigmaDefault();
            }
          };
          if (_this3.hoveredNode) {
            _this3.emit("leaveNode", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
              node: _this3.hoveredNode
            }));
            _this3.scheduleHighlightedNodesRender();
          }
          if (_this3.settings.enableEdgeEvents && _this3.hoveredEdge) {
            _this3.emit("leaveEdge", _objectSpread2(_objectSpread2({}, baseEvent), {}, {
              edge: _this3.hoveredEdge
            }));
            _this3.scheduleHighlightedNodesRender();
          }
          _this3.emit("leaveStage", _objectSpread2({}, baseEvent));
        };
        this.activeListeners.handleEnter = function(e) {
          var event = cleanMouseCoords(e);
          var baseEvent = {
            event,
            preventSigmaDefault: function preventSigmaDefault() {
              event.preventSigmaDefault();
            }
          };
          _this3.emit("enterStage", _objectSpread2({}, baseEvent));
        };
        var createInteractionListener = function createInteractionListener2(eventType) {
          return function(e) {
            var event = cleanMouseCoords(e);
            var baseEvent = {
              event,
              preventSigmaDefault: function preventSigmaDefault() {
                event.preventSigmaDefault();
              }
            };
            var nodeAtPosition = _this3.getNodeAtPosition(event);
            if (nodeAtPosition) return _this3.emit("".concat(eventType, "Node"), _objectSpread2(_objectSpread2({}, baseEvent), {}, {
              node: nodeAtPosition
            }));
            if (_this3.settings.enableEdgeEvents) {
              var edge = _this3.getEdgeAtPoint(event.x, event.y);
              if (edge) return _this3.emit("".concat(eventType, "Edge"), _objectSpread2(_objectSpread2({}, baseEvent), {}, {
                edge
              }));
            }
            return _this3.emit("".concat(eventType, "Stage"), baseEvent);
          };
        };
        this.activeListeners.handleClick = createInteractionListener("click");
        this.activeListeners.handleRightClick = createInteractionListener("rightClick");
        this.activeListeners.handleDoubleClick = createInteractionListener("doubleClick");
        this.activeListeners.handleWheel = createInteractionListener("wheel");
        this.activeListeners.handleDown = createInteractionListener("down");
        this.activeListeners.handleUp = createInteractionListener("up");
        this.mouseCaptor.on("mousemove", this.activeListeners.handleMove);
        this.mouseCaptor.on("mousemovebody", this.activeListeners.handleMoveBody);
        this.mouseCaptor.on("click", this.activeListeners.handleClick);
        this.mouseCaptor.on("rightClick", this.activeListeners.handleRightClick);
        this.mouseCaptor.on("doubleClick", this.activeListeners.handleDoubleClick);
        this.mouseCaptor.on("wheel", this.activeListeners.handleWheel);
        this.mouseCaptor.on("mousedown", this.activeListeners.handleDown);
        this.mouseCaptor.on("mouseup", this.activeListeners.handleUp);
        this.mouseCaptor.on("mouseleave", this.activeListeners.handleLeave);
        this.mouseCaptor.on("mouseenter", this.activeListeners.handleEnter);
        this.touchCaptor.on("touchdown", this.activeListeners.handleDown);
        this.touchCaptor.on("touchdown", this.activeListeners.handleMove);
        this.touchCaptor.on("touchup", this.activeListeners.handleUp);
        this.touchCaptor.on("touchmove", this.activeListeners.handleMove);
        this.touchCaptor.on("tap", this.activeListeners.handleClick);
        this.touchCaptor.on("doubletap", this.activeListeners.handleDoubleClick);
        this.touchCaptor.on("touchmove", this.activeListeners.handleMoveBody);
        return this;
      }
      /**
       * Method binding graph handlers
       *
       * @return {Sigma}
       */
    }, {
      key: "bindGraphHandlers",
      value: function bindGraphHandlers() {
        var _this4 = this;
        var graph2 = this.graph;
        var LAYOUT_IMPACTING_FIELDS = /* @__PURE__ */ new Set(["x", "y", "zIndex", "type"]);
        this.activeListeners.eachNodeAttributesUpdatedGraphUpdate = function(e) {
          var _e$hints;
          var updatedFields = (_e$hints = e.hints) === null || _e$hints === void 0 ? void 0 : _e$hints.attributes;
          _this4.graph.forEachNode(function(node) {
            return _this4.updateNode(node);
          });
          var layoutChanged = !updatedFields || updatedFields.some(function(f) {
            return LAYOUT_IMPACTING_FIELDS.has(f);
          });
          _this4.refresh({
            partialGraph: {
              nodes: graph2.nodes()
            },
            skipIndexation: !layoutChanged,
            schedule: true
          });
        };
        this.activeListeners.eachEdgeAttributesUpdatedGraphUpdate = function(e) {
          var _e$hints2;
          var updatedFields = (_e$hints2 = e.hints) === null || _e$hints2 === void 0 ? void 0 : _e$hints2.attributes;
          _this4.graph.forEachEdge(function(edge) {
            return _this4.updateEdge(edge);
          });
          var layoutChanged = updatedFields && ["zIndex", "type"].some(function(f) {
            return updatedFields === null || updatedFields === void 0 ? void 0 : updatedFields.includes(f);
          });
          _this4.refresh({
            partialGraph: {
              edges: graph2.edges()
            },
            skipIndexation: !layoutChanged,
            schedule: true
          });
        };
        this.activeListeners.addNodeGraphUpdate = function(payload) {
          var node = payload.key;
          _this4.addNode(node);
          _this4.refresh({
            partialGraph: {
              nodes: [node]
            },
            skipIndexation: false,
            schedule: true
          });
        };
        this.activeListeners.updateNodeGraphUpdate = function(payload) {
          var node = payload.key;
          _this4.refresh({
            partialGraph: {
              nodes: [node]
            },
            skipIndexation: false,
            schedule: true
          });
        };
        this.activeListeners.dropNodeGraphUpdate = function(payload) {
          var node = payload.key;
          _this4.removeNode(node);
          _this4.refresh({
            schedule: true
          });
        };
        this.activeListeners.addEdgeGraphUpdate = function(payload) {
          var edge = payload.key;
          _this4.addEdge(edge);
          _this4.refresh({
            partialGraph: {
              edges: [edge]
            },
            schedule: true
          });
        };
        this.activeListeners.updateEdgeGraphUpdate = function(payload) {
          var edge = payload.key;
          _this4.refresh({
            partialGraph: {
              edges: [edge]
            },
            skipIndexation: false,
            schedule: true
          });
        };
        this.activeListeners.dropEdgeGraphUpdate = function(payload) {
          var edge = payload.key;
          _this4.removeEdge(edge);
          _this4.refresh({
            schedule: true
          });
        };
        this.activeListeners.clearEdgesGraphUpdate = function() {
          _this4.clearEdgeState();
          _this4.clearEdgeIndices();
          _this4.refresh({
            schedule: true
          });
        };
        this.activeListeners.clearGraphUpdate = function() {
          _this4.clearEdgeState();
          _this4.clearNodeState();
          _this4.clearEdgeIndices();
          _this4.clearNodeIndices();
          _this4.refresh({
            schedule: true
          });
        };
        graph2.on("nodeAdded", this.activeListeners.addNodeGraphUpdate);
        graph2.on("nodeDropped", this.activeListeners.dropNodeGraphUpdate);
        graph2.on("nodeAttributesUpdated", this.activeListeners.updateNodeGraphUpdate);
        graph2.on("eachNodeAttributesUpdated", this.activeListeners.eachNodeAttributesUpdatedGraphUpdate);
        graph2.on("edgeAdded", this.activeListeners.addEdgeGraphUpdate);
        graph2.on("edgeDropped", this.activeListeners.dropEdgeGraphUpdate);
        graph2.on("edgeAttributesUpdated", this.activeListeners.updateEdgeGraphUpdate);
        graph2.on("eachEdgeAttributesUpdated", this.activeListeners.eachEdgeAttributesUpdatedGraphUpdate);
        graph2.on("edgesCleared", this.activeListeners.clearEdgesGraphUpdate);
        graph2.on("cleared", this.activeListeners.clearGraphUpdate);
        return this;
      }
      /**
       * Method used to unbind handlers from the graph.
       *
       * @return {undefined}
       */
    }, {
      key: "unbindGraphHandlers",
      value: function unbindGraphHandlers() {
        var graph2 = this.graph;
        graph2.removeListener("nodeAdded", this.activeListeners.addNodeGraphUpdate);
        graph2.removeListener("nodeDropped", this.activeListeners.dropNodeGraphUpdate);
        graph2.removeListener("nodeAttributesUpdated", this.activeListeners.updateNodeGraphUpdate);
        graph2.removeListener("eachNodeAttributesUpdated", this.activeListeners.eachNodeAttributesUpdatedGraphUpdate);
        graph2.removeListener("edgeAdded", this.activeListeners.addEdgeGraphUpdate);
        graph2.removeListener("edgeDropped", this.activeListeners.dropEdgeGraphUpdate);
        graph2.removeListener("edgeAttributesUpdated", this.activeListeners.updateEdgeGraphUpdate);
        graph2.removeListener("eachEdgeAttributesUpdated", this.activeListeners.eachEdgeAttributesUpdatedGraphUpdate);
        graph2.removeListener("edgesCleared", this.activeListeners.clearEdgesGraphUpdate);
        graph2.removeListener("cleared", this.activeListeners.clearGraphUpdate);
      }
      /**
       * Method looking for an edge colliding with a given point at (x, y). Returns
       * the key of the edge if any, or null else.
       */
    }, {
      key: "getEdgeAtPoint",
      value: function getEdgeAtPoint(x, y) {
        var color = getPixelColor(this.webGLContexts.edges, this.frameBuffers.edges, x, y, this.pixelRatio, this.pickingDownSizingRatio);
        var index = colorToIndex.apply(void 0, _toConsumableArray(color));
        var itemAt = this.itemIDsIndex[index];
        return itemAt && itemAt.type === "edge" ? itemAt.id : null;
      }
      /**
       * Method used to process the whole graph's data.
       *  - extent
       *  - normalizationFunction
       *  - compute node's coordinate
       *  - labelgrid
       *  - program data allocation
       * @return {Sigma}
       */
    }, {
      key: "process",
      value: function process() {
        var _this5 = this;
        this.emit("beforeProcess");
        var graph2 = this.graph;
        var settings = this.settings;
        var dimensions = this.getDimensions();
        this.nodeExtent = graphExtent(this.graph);
        if (!this.settings.autoRescale) {
          var width = dimensions.width, height = dimensions.height;
          var _this$nodeExtent = this.nodeExtent, x = _this$nodeExtent.x, y = _this$nodeExtent.y;
          this.nodeExtent = {
            x: [(x[0] + x[1]) / 2 - width / 2, (x[0] + x[1]) / 2 + width / 2],
            y: [(y[0] + y[1]) / 2 - height / 2, (y[0] + y[1]) / 2 + height / 2]
          };
        }
        this.normalizationFunction = createNormalizationFunction(this.customBBox || this.nodeExtent);
        var nullCamera = new Camera();
        var nullCameraMatrix = matrixFromCamera(nullCamera.getState(), dimensions, this.getGraphDimensions(), this.getStagePadding());
        this.labelGrid.resizeAndClear(dimensions, settings.labelGridCellSize);
        var nodesPerPrograms = {};
        var nodeIndices = {};
        var edgeIndices = {};
        var itemIDsIndex = {};
        var incrID = 1;
        var nodes = graph2.nodes();
        for (var i = 0, l = nodes.length; i < l; i++) {
          var node = nodes[i];
          var data = this.nodeDataCache[node];
          var attrs = graph2.getNodeAttributes(node);
          data.x = attrs.x;
          data.y = attrs.y;
          this.normalizationFunction.applyTo(data);
          if (typeof data.label === "string" && !data.hidden) this.labelGrid.add(node, data.size, this.framedGraphToViewport(data, {
            matrix: nullCameraMatrix
          }));
          nodesPerPrograms[data.type] = (nodesPerPrograms[data.type] || 0) + 1;
        }
        this.labelGrid.organize();
        for (var type in this.nodePrograms) {
          if (!hasOwnProperty.call(this.nodePrograms, type)) {
            throw new Error('Sigma: could not find a suitable program for node type "'.concat(type, '"!'));
          }
          this.nodePrograms[type].reallocate(nodesPerPrograms[type] || 0);
          nodesPerPrograms[type] = 0;
        }
        if (this.settings.zIndex && this.nodeZExtent[0] !== this.nodeZExtent[1]) nodes = zIndexOrdering(this.nodeZExtent, function(node2) {
          return _this5.nodeDataCache[node2].zIndex;
        }, nodes);
        for (var _i = 0, _l = nodes.length; _i < _l; _i++) {
          var _node = nodes[_i];
          nodeIndices[_node] = incrID;
          itemIDsIndex[nodeIndices[_node]] = {
            type: "node",
            id: _node
          };
          incrID++;
          var _data = this.nodeDataCache[_node];
          this.addNodeToProgram(_node, nodeIndices[_node], nodesPerPrograms[_data.type]++);
        }
        var edgesPerPrograms = {};
        var edges = graph2.edges();
        for (var _i2 = 0, _l2 = edges.length; _i2 < _l2; _i2++) {
          var edge = edges[_i2];
          var _data2 = this.edgeDataCache[edge];
          edgesPerPrograms[_data2.type] = (edgesPerPrograms[_data2.type] || 0) + 1;
        }
        if (this.settings.zIndex && this.edgeZExtent[0] !== this.edgeZExtent[1]) edges = zIndexOrdering(this.edgeZExtent, function(edge2) {
          return _this5.edgeDataCache[edge2].zIndex;
        }, edges);
        for (var _type2 in this.edgePrograms) {
          if (!hasOwnProperty.call(this.edgePrograms, _type2)) {
            throw new Error('Sigma: could not find a suitable program for edge type "'.concat(_type2, '"!'));
          }
          this.edgePrograms[_type2].reallocate(edgesPerPrograms[_type2] || 0);
          edgesPerPrograms[_type2] = 0;
        }
        for (var _i3 = 0, _l3 = edges.length; _i3 < _l3; _i3++) {
          var _edge = edges[_i3];
          edgeIndices[_edge] = incrID;
          itemIDsIndex[edgeIndices[_edge]] = {
            type: "edge",
            id: _edge
          };
          incrID++;
          var _data3 = this.edgeDataCache[_edge];
          this.addEdgeToProgram(_edge, edgeIndices[_edge], edgesPerPrograms[_data3.type]++);
        }
        this.itemIDsIndex = itemIDsIndex;
        this.nodeIndices = nodeIndices;
        this.edgeIndices = edgeIndices;
        this.emit("afterProcess");
        return this;
      }
      /**
       * Method that backports potential settings updates where it's needed.
       * @private
       */
    }, {
      key: "handleSettingsUpdate",
      value: function handleSettingsUpdate(oldSettings) {
        var _this6 = this;
        var settings = this.settings;
        this.camera.minRatio = settings.minCameraRatio;
        this.camera.maxRatio = settings.maxCameraRatio;
        this.camera.enabledZooming = settings.enableCameraZooming;
        this.camera.enabledPanning = settings.enableCameraPanning;
        this.camera.enabledRotation = settings.enableCameraRotation;
        if (settings.cameraPanBoundaries) {
          this.camera.clean = function(state) {
            return _this6.cleanCameraState(state, settings.cameraPanBoundaries && _typeof(settings.cameraPanBoundaries) === "object" ? settings.cameraPanBoundaries : {});
          };
        } else {
          this.camera.clean = null;
        }
        this.camera.setState(this.camera.validateState(this.camera.getState()));
        if (oldSettings) {
          if (oldSettings.edgeProgramClasses !== settings.edgeProgramClasses) {
            for (var type in settings.edgeProgramClasses) {
              if (settings.edgeProgramClasses[type] !== oldSettings.edgeProgramClasses[type]) {
                this.registerEdgeProgram(type, settings.edgeProgramClasses[type]);
              }
            }
            for (var _type3 in oldSettings.edgeProgramClasses) {
              if (!settings.edgeProgramClasses[_type3]) this.unregisterEdgeProgram(_type3);
            }
          }
          if (oldSettings.nodeProgramClasses !== settings.nodeProgramClasses || oldSettings.nodeHoverProgramClasses !== settings.nodeHoverProgramClasses) {
            for (var _type4 in settings.nodeProgramClasses) {
              if (settings.nodeProgramClasses[_type4] !== oldSettings.nodeProgramClasses[_type4] || settings.nodeHoverProgramClasses[_type4] !== oldSettings.nodeHoverProgramClasses[_type4]) {
                this.registerNodeProgram(_type4, settings.nodeProgramClasses[_type4], settings.nodeHoverProgramClasses[_type4]);
              }
            }
            for (var _type5 in oldSettings.nodeProgramClasses) {
              if (!settings.nodeProgramClasses[_type5]) this.unregisterNodeProgram(_type5);
            }
          }
        }
        this.mouseCaptor.setSettings(this.settings);
        this.touchCaptor.setSettings(this.settings);
        return this;
      }
    }, {
      key: "cleanCameraState",
      value: function cleanCameraState(state) {
        var _ref = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, _ref$tolerance = _ref.tolerance, tolerance = _ref$tolerance === void 0 ? 0 : _ref$tolerance, boundaries = _ref.boundaries;
        var newState = _objectSpread2({}, state);
        var _ref2 = boundaries || this.nodeExtent, _ref2$x = _slicedToArray(_ref2.x, 2), xMinGraph = _ref2$x[0], xMaxGraph = _ref2$x[1], _ref2$y = _slicedToArray(_ref2.y, 2), yMinGraph = _ref2$y[0], yMaxGraph = _ref2$y[1];
        var corners = [this.graphToViewport({
          x: xMinGraph,
          y: yMinGraph
        }, {
          cameraState: state
        }), this.graphToViewport({
          x: xMaxGraph,
          y: yMinGraph
        }, {
          cameraState: state
        }), this.graphToViewport({
          x: xMinGraph,
          y: yMaxGraph
        }, {
          cameraState: state
        }), this.graphToViewport({
          x: xMaxGraph,
          y: yMaxGraph
        }, {
          cameraState: state
        })];
        var xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        corners.forEach(function(_ref3) {
          var x = _ref3.x, y = _ref3.y;
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        });
        var graphWidth = xMax - xMin;
        var graphHeight = yMax - yMin;
        var _this$getDimensions = this.getDimensions(), width = _this$getDimensions.width, height = _this$getDimensions.height;
        var dx = 0;
        var dy = 0;
        if (graphWidth >= width) {
          if (xMax < width - tolerance) dx = xMax - (width - tolerance);
          else if (xMin > tolerance) dx = xMin - tolerance;
        } else {
          if (xMax > width + tolerance) dx = xMax - (width + tolerance);
          else if (xMin < -tolerance) dx = xMin + tolerance;
        }
        if (graphHeight >= height) {
          if (yMax < height - tolerance) dy = yMax - (height - tolerance);
          else if (yMin > tolerance) dy = yMin - tolerance;
        } else {
          if (yMax > height + tolerance) dy = yMax - (height + tolerance);
          else if (yMin < -tolerance) dy = yMin + tolerance;
        }
        if (dx || dy) {
          var origin = this.viewportToFramedGraph({
            x: 0,
            y: 0
          }, {
            cameraState: state
          });
          var delta = this.viewportToFramedGraph({
            x: dx,
            y: dy
          }, {
            cameraState: state
          });
          dx = delta.x - origin.x;
          dy = delta.y - origin.y;
          newState.x += dx;
          newState.y += dy;
        }
        return newState;
      }
      /**
       * Method used to render labels.
       *
       * @return {Sigma}
       */
    }, {
      key: "renderLabels",
      value: function renderLabels() {
        if (!this.settings.renderLabels) return this;
        var cameraState = this.camera.getState();
        var labelsToDisplay = this.labelGrid.getLabelsToDisplay(cameraState.ratio, this.settings.labelDensity);
        extend(labelsToDisplay, this.nodesWithForcedLabels);
        this.displayedNodeLabels = /* @__PURE__ */ new Set();
        var context = this.canvasContexts.labels;
        for (var i = 0, l = labelsToDisplay.length; i < l; i++) {
          var node = labelsToDisplay[i];
          var data = this.nodeDataCache[node];
          if (this.displayedNodeLabels.has(node)) continue;
          if (data.hidden) continue;
          var _this$framedGraphToVi = this.framedGraphToViewport(data), x = _this$framedGraphToVi.x, y = _this$framedGraphToVi.y;
          var size = this.scaleSize(data.size);
          if (!data.forceLabel && size < this.settings.labelRenderedSizeThreshold) continue;
          if (x < -X_LABEL_MARGIN || x > this.width + X_LABEL_MARGIN || y < -Y_LABEL_MARGIN || y > this.height + Y_LABEL_MARGIN) continue;
          this.displayedNodeLabels.add(node);
          var defaultDrawNodeLabel = this.settings.defaultDrawNodeLabel;
          var nodeProgram = this.nodePrograms[data.type];
          var drawLabel = (nodeProgram === null || nodeProgram === void 0 ? void 0 : nodeProgram.drawLabel) || defaultDrawNodeLabel;
          drawLabel(context, _objectSpread2(_objectSpread2({
            key: node
          }, data), {}, {
            size,
            x,
            y
          }), this.settings);
        }
        return this;
      }
      /**
       * Method used to render edge labels, based on which node labels were
       * rendered.
       *
       * @return {Sigma}
       */
    }, {
      key: "renderEdgeLabels",
      value: function renderEdgeLabels() {
        if (!this.settings.renderEdgeLabels) return this;
        var context = this.canvasContexts.edgeLabels;
        context.clearRect(0, 0, this.width, this.height);
        var edgeLabelsToDisplay = edgeLabelsToDisplayFromNodes({
          graph: this.graph,
          hoveredNode: this.hoveredNode,
          displayedNodeLabels: this.displayedNodeLabels,
          highlightedNodes: this.highlightedNodes
        });
        extend(edgeLabelsToDisplay, this.edgesWithForcedLabels);
        var displayedLabels = /* @__PURE__ */ new Set();
        for (var i = 0, l = edgeLabelsToDisplay.length; i < l; i++) {
          var edge = edgeLabelsToDisplay[i], extremities = this.graph.extremities(edge), sourceData = this.nodeDataCache[extremities[0]], targetData = this.nodeDataCache[extremities[1]], edgeData = this.edgeDataCache[edge];
          if (displayedLabels.has(edge)) continue;
          if (edgeData.hidden || sourceData.hidden || targetData.hidden) {
            continue;
          }
          var defaultDrawEdgeLabel = this.settings.defaultDrawEdgeLabel;
          var edgeProgram = this.edgePrograms[edgeData.type];
          var drawLabel = (edgeProgram === null || edgeProgram === void 0 ? void 0 : edgeProgram.drawLabel) || defaultDrawEdgeLabel;
          drawLabel(context, _objectSpread2(_objectSpread2({
            key: edge
          }, edgeData), {}, {
            size: this.scaleSize(edgeData.size)
          }), _objectSpread2(_objectSpread2(_objectSpread2({
            key: extremities[0]
          }, sourceData), this.framedGraphToViewport(sourceData)), {}, {
            size: this.scaleSize(sourceData.size)
          }), _objectSpread2(_objectSpread2(_objectSpread2({
            key: extremities[1]
          }, targetData), this.framedGraphToViewport(targetData)), {}, {
            size: this.scaleSize(targetData.size)
          }), this.settings);
          displayedLabels.add(edge);
        }
        this.displayedEdgeLabels = displayedLabels;
        return this;
      }
      /**
       * Method used to render the highlighted nodes.
       *
       * @return {Sigma}
       */
    }, {
      key: "renderHighlightedNodes",
      value: function renderHighlightedNodes() {
        var _this7 = this;
        var context = this.canvasContexts.hovers;
        context.clearRect(0, 0, this.width, this.height);
        var render = function render2(node) {
          var data = _this7.nodeDataCache[node];
          var _this7$framedGraphToV = _this7.framedGraphToViewport(data), x = _this7$framedGraphToV.x, y = _this7$framedGraphToV.y;
          var size = _this7.scaleSize(data.size);
          var defaultDrawNodeHover = _this7.settings.defaultDrawNodeHover;
          var nodeProgram = _this7.nodePrograms[data.type];
          var drawHover = (nodeProgram === null || nodeProgram === void 0 ? void 0 : nodeProgram.drawHover) || defaultDrawNodeHover;
          drawHover(context, _objectSpread2(_objectSpread2({
            key: node
          }, data), {}, {
            size,
            x,
            y
          }), _this7.settings);
        };
        var nodesToRender = [];
        if (this.hoveredNode && !this.nodeDataCache[this.hoveredNode].hidden) {
          nodesToRender.push(this.hoveredNode);
        }
        this.highlightedNodes.forEach(function(node) {
          if (node !== _this7.hoveredNode) nodesToRender.push(node);
        });
        nodesToRender.forEach(function(node) {
          return render(node);
        });
        var nodesPerPrograms = {};
        nodesToRender.forEach(function(node) {
          var type2 = _this7.nodeDataCache[node].type;
          nodesPerPrograms[type2] = (nodesPerPrograms[type2] || 0) + 1;
        });
        for (var type in this.nodeHoverPrograms) {
          this.nodeHoverPrograms[type].reallocate(nodesPerPrograms[type] || 0);
          nodesPerPrograms[type] = 0;
        }
        nodesToRender.forEach(function(node) {
          var data = _this7.nodeDataCache[node];
          _this7.nodeHoverPrograms[data.type].process(0, nodesPerPrograms[data.type]++, data);
        });
        this.webGLContexts.hoverNodes.clear(this.webGLContexts.hoverNodes.COLOR_BUFFER_BIT);
        var renderParams = this.getRenderParams();
        for (var _type6 in this.nodeHoverPrograms) {
          var program = this.nodeHoverPrograms[_type6];
          program.render(renderParams);
        }
      }
      /**
       * Method used to schedule a hover render.
       *
       */
    }, {
      key: "scheduleHighlightedNodesRender",
      value: function scheduleHighlightedNodesRender() {
        var _this8 = this;
        if (this.renderHighlightedNodesFrame || this.renderFrame) return;
        this.renderHighlightedNodesFrame = requestAnimationFrame(function() {
          _this8.renderHighlightedNodesFrame = null;
          _this8.renderHighlightedNodes();
          _this8.renderEdgeLabels();
        });
      }
      /**
       * Method used to render.
       *
       * @return {Sigma}
       */
    }, {
      key: "render",
      value: function render() {
        var _this9 = this;
        this.emit("beforeRender");
        var exitRender = function exitRender2() {
          _this9.emit("afterRender");
          return _this9;
        };
        if (this.renderFrame) {
          cancelAnimationFrame(this.renderFrame);
          this.renderFrame = null;
        }
        this.resize();
        if (this.needToProcess) this.process();
        this.needToProcess = false;
        this.clear();
        this.pickingLayers.forEach(function(layer) {
          return _this9.resetWebGLTexture(layer);
        });
        if (!this.graph.order) return exitRender();
        var mouseCaptor = this.mouseCaptor;
        var moving = this.camera.isAnimated() || mouseCaptor.isMoving || mouseCaptor.draggedEvents || mouseCaptor.currentWheelDirection;
        var cameraState = this.camera.getState();
        var viewportDimensions = this.getDimensions();
        var graphDimensions = this.getGraphDimensions();
        var padding = this.getStagePadding();
        this.matrix = matrixFromCamera(cameraState, viewportDimensions, graphDimensions, padding);
        this.invMatrix = matrixFromCamera(cameraState, viewportDimensions, graphDimensions, padding, true);
        this.correctionRatio = getMatrixImpact(this.matrix, cameraState, viewportDimensions);
        this.graphToViewportRatio = this.getGraphToViewportRatio();
        var params = this.getRenderParams();
        for (var type in this.nodePrograms) {
          var program = this.nodePrograms[type];
          program.render(params);
        }
        if (!this.settings.hideEdgesOnMove || !moving) {
          for (var _type7 in this.edgePrograms) {
            var _program2 = this.edgePrograms[_type7];
            _program2.render(params);
          }
        }
        if (this.settings.hideLabelsOnMove && moving) return exitRender();
        this.renderLabels();
        this.renderEdgeLabels();
        this.renderHighlightedNodes();
        return exitRender();
      }
      /**
       * Add a node in the internal data structures.
       * @private
       * @param key The node's graphology ID
       */
    }, {
      key: "addNode",
      value: function addNode2(key) {
        var attr = Object.assign({}, this.graph.getNodeAttributes(key));
        if (this.settings.nodeReducer) attr = this.settings.nodeReducer(key, attr);
        var data = applyNodeDefaults(this.settings, key, attr);
        this.nodeDataCache[key] = data;
        this.nodesWithForcedLabels["delete"](key);
        if (data.forceLabel && !data.hidden) this.nodesWithForcedLabels.add(key);
        this.highlightedNodes["delete"](key);
        if (data.highlighted && !data.hidden) this.highlightedNodes.add(key);
        if (this.settings.zIndex) {
          if (data.zIndex < this.nodeZExtent[0]) this.nodeZExtent[0] = data.zIndex;
          if (data.zIndex > this.nodeZExtent[1]) this.nodeZExtent[1] = data.zIndex;
        }
      }
      /**
       * Update a node the internal data structures.
       * @private
       * @param key The node's graphology ID
       */
    }, {
      key: "updateNode",
      value: function updateNode(key) {
        this.addNode(key);
        var data = this.nodeDataCache[key];
        this.normalizationFunction.applyTo(data);
      }
      /**
       * Remove a node from the internal data structures.
       * @private
       * @param key The node's graphology ID
       */
    }, {
      key: "removeNode",
      value: function removeNode(key) {
        delete this.nodeDataCache[key];
        delete this.nodeProgramIndex[key];
        this.highlightedNodes["delete"](key);
        if (this.hoveredNode === key) this.hoveredNode = null;
        this.nodesWithForcedLabels["delete"](key);
      }
      /**
       * Add an edge into the internal data structures.
       * @private
       * @param key The edge's graphology ID
       */
    }, {
      key: "addEdge",
      value: function addEdge2(key) {
        var attr = Object.assign({}, this.graph.getEdgeAttributes(key));
        if (this.settings.edgeReducer) attr = this.settings.edgeReducer(key, attr);
        var data = applyEdgeDefaults(this.settings, key, attr);
        this.edgeDataCache[key] = data;
        this.edgesWithForcedLabels["delete"](key);
        if (data.forceLabel && !data.hidden) this.edgesWithForcedLabels.add(key);
        if (this.settings.zIndex) {
          if (data.zIndex < this.edgeZExtent[0]) this.edgeZExtent[0] = data.zIndex;
          if (data.zIndex > this.edgeZExtent[1]) this.edgeZExtent[1] = data.zIndex;
        }
      }
      /**
       * Update an edge in the internal data structures.
       * @private
       * @param key The edge's graphology ID
       */
    }, {
      key: "updateEdge",
      value: function updateEdge(key) {
        this.addEdge(key);
      }
      /**
       * Remove an edge from the internal data structures.
       * @private
       * @param key The edge's graphology ID
       */
    }, {
      key: "removeEdge",
      value: function removeEdge(key) {
        delete this.edgeDataCache[key];
        delete this.edgeProgramIndex[key];
        if (this.hoveredEdge === key) this.hoveredEdge = null;
        this.edgesWithForcedLabels["delete"](key);
      }
      /**
       * Clear all indices related to nodes.
       * @private
       */
    }, {
      key: "clearNodeIndices",
      value: function clearNodeIndices() {
        this.labelGrid = new LabelGrid();
        this.nodeExtent = {
          x: [0, 1],
          y: [0, 1]
        };
        this.nodeDataCache = {};
        this.edgeProgramIndex = {};
        this.nodesWithForcedLabels = /* @__PURE__ */ new Set();
        this.nodeZExtent = [Infinity, -Infinity];
        this.highlightedNodes = /* @__PURE__ */ new Set();
      }
      /**
       * Clear all indices related to edges.
       * @private
       */
    }, {
      key: "clearEdgeIndices",
      value: function clearEdgeIndices() {
        this.edgeDataCache = {};
        this.edgeProgramIndex = {};
        this.edgesWithForcedLabels = /* @__PURE__ */ new Set();
        this.edgeZExtent = [Infinity, -Infinity];
      }
      /**
       * Clear all indices.
       * @private
       */
    }, {
      key: "clearIndices",
      value: function clearIndices() {
        this.clearEdgeIndices();
        this.clearNodeIndices();
      }
      /**
       * Clear all graph state related to nodes.
       * @private
       */
    }, {
      key: "clearNodeState",
      value: function clearNodeState() {
        this.displayedNodeLabels = /* @__PURE__ */ new Set();
        this.highlightedNodes = /* @__PURE__ */ new Set();
        this.hoveredNode = null;
      }
      /**
       * Clear all graph state related to edges.
       * @private
       */
    }, {
      key: "clearEdgeState",
      value: function clearEdgeState() {
        this.displayedEdgeLabels = /* @__PURE__ */ new Set();
        this.highlightedNodes = /* @__PURE__ */ new Set();
        this.hoveredEdge = null;
      }
      /**
       * Clear all graph state.
       * @private
       */
    }, {
      key: "clearState",
      value: function clearState() {
        this.clearEdgeState();
        this.clearNodeState();
      }
      /**
       * Add the node data to its program.
       * @private
       * @param node The node's graphology ID
       * @param fingerprint A fingerprint used to identity the node with picking
       * @param position The index where to place the node in the program
       */
    }, {
      key: "addNodeToProgram",
      value: function addNodeToProgram(node, fingerprint, position) {
        var data = this.nodeDataCache[node];
        var nodeProgram = this.nodePrograms[data.type];
        if (!nodeProgram) throw new Error('Sigma: could not find a suitable program for node type "'.concat(data.type, '"!'));
        nodeProgram.process(fingerprint, position, data);
        this.nodeProgramIndex[node] = position;
      }
      /**
       * Add the edge data to its program.
       * @private
       * @param edge The edge's graphology ID
       * @param fingerprint A fingerprint used to identity the edge with picking
       * @param position The index where to place the edge in the program
       */
    }, {
      key: "addEdgeToProgram",
      value: function addEdgeToProgram(edge, fingerprint, position) {
        var data = this.edgeDataCache[edge];
        var edgeProgram = this.edgePrograms[data.type];
        if (!edgeProgram) throw new Error('Sigma: could not find a suitable program for edge type "'.concat(data.type, '"!'));
        var extremities = this.graph.extremities(edge), sourceData = this.nodeDataCache[extremities[0]], targetData = this.nodeDataCache[extremities[1]];
        edgeProgram.process(fingerprint, position, sourceData, targetData, data);
        this.edgeProgramIndex[edge] = position;
      }
      /**---------------------------------------------------------------------------
       * Public API.
       **---------------------------------------------------------------------------
       */
      /**
       * Function used to get the render params.
       *
       * @return {RenderParams}
       */
    }, {
      key: "getRenderParams",
      value: function getRenderParams() {
        return {
          matrix: this.matrix,
          invMatrix: this.invMatrix,
          width: this.width,
          height: this.height,
          pixelRatio: this.pixelRatio,
          zoomRatio: this.camera.ratio,
          cameraAngle: this.camera.angle,
          sizeRatio: 1 / this.scaleSize(),
          correctionRatio: this.correctionRatio,
          downSizingRatio: this.pickingDownSizingRatio,
          minEdgeThickness: this.settings.minEdgeThickness,
          antiAliasingFeather: this.settings.antiAliasingFeather
        };
      }
      /**
       * Function used to retrieve the actual stage padding value.
       *
       * @return {number}
       */
    }, {
      key: "getStagePadding",
      value: function getStagePadding() {
        var _this$settings = this.settings, stagePadding = _this$settings.stagePadding, autoRescale = _this$settings.autoRescale;
        return autoRescale ? stagePadding || 0 : 0;
      }
      /**
       * Function used to create a layer element.
       *
       * @param {string} id - Context's id.
       * @param {string} tag - The HTML tag to use.
       * @param options
       * @return {Sigma}
       */
    }, {
      key: "createLayer",
      value: function createLayer(id, tag) {
        var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        if (this.elements[id]) throw new Error('Sigma: a layer named "'.concat(id, '" already exists'));
        var element = createElement(tag, {
          position: "absolute"
        }, {
          "class": "sigma-".concat(id)
        });
        if (options.style) Object.assign(element.style, options.style);
        this.elements[id] = element;
        if ("beforeLayer" in options && options.beforeLayer) {
          this.elements[options.beforeLayer].before(element);
        } else if ("afterLayer" in options && options.afterLayer) {
          this.elements[options.afterLayer].after(element);
        } else {
          this.container.appendChild(element);
        }
        return element;
      }
      /**
       * Function used to create a canvas element.
       *
       * @param {string} id - Context's id.
       * @param options
       * @return {Sigma}
       */
    }, {
      key: "createCanvas",
      value: function createCanvas(id) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        return this.createLayer(id, "canvas", options);
      }
      /**
       * Function used to create a canvas context and add the relevant DOM elements.
       *
       * @param  {string} id - Context's id.
       * @param  options
       * @return {Sigma}
       */
    }, {
      key: "createCanvasContext",
      value: function createCanvasContext(id) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        var canvas = this.createCanvas(id, options);
        var contextOptions = {
          preserveDrawingBuffer: false,
          antialias: false
        };
        this.canvasContexts[id] = canvas.getContext("2d", contextOptions);
        return this;
      }
      /**
       * Function used to create a WebGL context and add the relevant DOM
       * elements.
       *
       * @param  {string}  id      - Context's id.
       * @param  {object?} options - #getContext params to override (optional)
       * @return {WebGLRenderingContext}
       */
    }, {
      key: "createWebGLContext",
      value: function createWebGLContext(id) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        var canvas = (options === null || options === void 0 ? void 0 : options.canvas) || this.createCanvas(id, options);
        if (options.hidden) canvas.remove();
        var contextOptions = _objectSpread2({
          preserveDrawingBuffer: false,
          antialias: false
        }, options);
        var context;
        context = canvas.getContext("webgl2", contextOptions);
        if (!context) context = canvas.getContext("webgl", contextOptions);
        if (!context) context = canvas.getContext("experimental-webgl", contextOptions);
        var gl = context;
        this.webGLContexts[id] = gl;
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (options.picking) {
          this.pickingLayers.add(id);
          var newFrameBuffer = gl.createFramebuffer();
          if (!newFrameBuffer) throw new Error("Sigma: cannot create a new frame buffer for layer ".concat(id));
          this.frameBuffers[id] = newFrameBuffer;
        }
        return gl;
      }
      /**
       * Function used to properly kill a layer.
       *
       * @param  {string} id - Layer id.
       * @return {Sigma}
       */
    }, {
      key: "killLayer",
      value: function killLayer(id) {
        var element = this.elements[id];
        if (!element) throw new Error("Sigma: cannot kill layer ".concat(id, ", which does not exist"));
        if (this.webGLContexts[id]) {
          var _gl$getExtension;
          var gl = this.webGLContexts[id];
          (_gl$getExtension = gl.getExtension("WEBGL_lose_context")) === null || _gl$getExtension === void 0 || _gl$getExtension.loseContext();
          delete this.webGLContexts[id];
        } else if (this.canvasContexts[id]) {
          delete this.canvasContexts[id];
        }
        element.remove();
        delete this.elements[id];
        return this;
      }
      /**
       * Method returning the renderer's camera.
       *
       * @return {Camera}
       */
    }, {
      key: "getCamera",
      value: function getCamera() {
        return this.camera;
      }
      /**
       * Method setting the renderer's camera.
       *
       * @param  {Camera} camera - New camera.
       * @return {Sigma}
       */
    }, {
      key: "setCamera",
      value: function setCamera(camera) {
        this.unbindCameraHandlers();
        this.camera = camera;
        this.bindCameraHandlers();
      }
      /**
       * Method returning the container DOM element.
       *
       * @return {HTMLElement}
       */
    }, {
      key: "getContainer",
      value: function getContainer() {
        return this.container;
      }
      /**
       * Method returning the renderer's graph.
       *
       * @return {Graph}
       */
    }, {
      key: "getGraph",
      value: function getGraph() {
        return this.graph;
      }
      /**
       * Method used to set the renderer's graph.
       *
       * @return {Graph}
       */
    }, {
      key: "setGraph",
      value: function setGraph(graph2) {
        if (graph2 === this.graph) return;
        if (this.hoveredNode && !graph2.hasNode(this.hoveredNode)) this.hoveredNode = null;
        if (this.hoveredEdge && !graph2.hasEdge(this.hoveredEdge)) this.hoveredEdge = null;
        this.unbindGraphHandlers();
        if (this.checkEdgesEventsFrame !== null) {
          cancelAnimationFrame(this.checkEdgesEventsFrame);
          this.checkEdgesEventsFrame = null;
        }
        this.graph = graph2;
        this.bindGraphHandlers();
        this.refresh();
      }
      /**
       * Method returning the mouse captor.
       *
       * @return {MouseCaptor}
       */
    }, {
      key: "getMouseCaptor",
      value: function getMouseCaptor() {
        return this.mouseCaptor;
      }
      /**
       * Method returning the touch captor.
       *
       * @return {TouchCaptor}
       */
    }, {
      key: "getTouchCaptor",
      value: function getTouchCaptor() {
        return this.touchCaptor;
      }
      /**
       * Method returning the current renderer's dimensions.
       *
       * @return {Dimensions}
       */
    }, {
      key: "getDimensions",
      value: function getDimensions() {
        return {
          width: this.width,
          height: this.height
        };
      }
      /**
       * Method returning the current graph's dimensions.
       *
       * @return {Dimensions}
       */
    }, {
      key: "getGraphDimensions",
      value: function getGraphDimensions() {
        var extent = this.customBBox || this.nodeExtent;
        return {
          width: extent.x[1] - extent.x[0] || 1,
          height: extent.y[1] - extent.y[0] || 1
        };
      }
      /**
       * Method used to get all the sigma node attributes.
       * It's useful for example to get the position of a node
       * and to get values that are set by the nodeReducer
       *
       * @param  {string} key - The node's key.
       * @return {NodeDisplayData | undefined} A copy of the desired node's attribute or undefined if not found
       */
    }, {
      key: "getNodeDisplayData",
      value: function getNodeDisplayData(key) {
        var node = this.nodeDataCache[key];
        return node ? Object.assign({}, node) : void 0;
      }
      /**
       * Method used to get all the sigma edge attributes.
       * It's useful for example to get values that are set by the edgeReducer.
       *
       * @param  {string} key - The edge's key.
       * @return {EdgeDisplayData | undefined} A copy of the desired edge's attribute or undefined if not found
       */
    }, {
      key: "getEdgeDisplayData",
      value: function getEdgeDisplayData(key) {
        var edge = this.edgeDataCache[key];
        return edge ? Object.assign({}, edge) : void 0;
      }
      /**
       * Method used to get the set of currently displayed node labels.
       *
       * @return {Set<string>} A set of node keys whose label is displayed.
       */
    }, {
      key: "getNodeDisplayedLabels",
      value: function getNodeDisplayedLabels() {
        return new Set(this.displayedNodeLabels);
      }
      /**
       * Method used to get the set of currently displayed edge labels.
       *
       * @return {Set<string>} A set of edge keys whose label is displayed.
       */
    }, {
      key: "getEdgeDisplayedLabels",
      value: function getEdgeDisplayedLabels() {
        return new Set(this.displayedEdgeLabels);
      }
      /**
       * Method returning a copy of the settings collection.
       *
       * @return {Settings} A copy of the settings collection.
       */
    }, {
      key: "getSettings",
      value: function getSettings() {
        return _objectSpread2({}, this.settings);
      }
      /**
       * Method returning the current value for a given setting key.
       *
       * @param  {string} key - The setting key to get.
       * @return {any} The value attached to this setting key or undefined if not found
       */
    }, {
      key: "getSetting",
      value: function getSetting(key) {
        return this.settings[key];
      }
      /**
       * Method setting the value of a given setting key. Note that this will schedule
       * a new render next frame.
       *
       * @param  {string} key - The setting key to set.
       * @param  {any}    value - The value to set.
       * @return {Sigma}
       */
    }, {
      key: "setSetting",
      value: function setSetting(key, value) {
        var oldValues = _objectSpread2({}, this.settings);
        this.settings[key] = value;
        validateSettings(this.settings);
        this.handleSettingsUpdate(oldValues);
        this.scheduleRefresh();
        return this;
      }
      /**
       * Method updating the value of a given setting key using the provided function.
       * Note that this will schedule a new render next frame.
       *
       * @param  {string}   key     - The setting key to set.
       * @param  {function} updater - The update function.
       * @return {Sigma}
       */
    }, {
      key: "updateSetting",
      value: function updateSetting(key, updater) {
        this.setSetting(key, updater(this.settings[key]));
        return this;
      }
      /**
       * Method setting multiple settings at once.
       *
       * @param  {Partial<Settings>} settings - The settings to set.
       * @return {Sigma}
       */
    }, {
      key: "setSettings",
      value: function setSettings(settings) {
        var oldValues = _objectSpread2({}, this.settings);
        this.settings = _objectSpread2(_objectSpread2({}, this.settings), settings);
        validateSettings(this.settings);
        this.handleSettingsUpdate(oldValues);
        this.scheduleRefresh();
        return this;
      }
      /**
       * Method used to resize the renderer.
       *
       * @param  {boolean} force - If true, then resize is processed even if size is unchanged (optional).
       * @return {Sigma}
       */
    }, {
      key: "resize",
      value: function resize(force) {
        var previousWidth = this.width, previousHeight = this.height;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.pixelRatio = getPixelRatio();
        if (this.width === 0) {
          if (this.settings.allowInvalidContainer) this.width = 1;
          else throw new Error("Sigma: Container has no width. You can set the allowInvalidContainer setting to true to stop seeing this error.");
        }
        if (this.height === 0) {
          if (this.settings.allowInvalidContainer) this.height = 1;
          else throw new Error("Sigma: Container has no height. You can set the allowInvalidContainer setting to true to stop seeing this error.");
        }
        if (!force && previousWidth === this.width && previousHeight === this.height) return this;
        for (var id in this.elements) {
          var element = this.elements[id];
          element.style.width = this.width + "px";
          element.style.height = this.height + "px";
        }
        for (var _id in this.canvasContexts) {
          this.elements[_id].setAttribute("width", this.width * this.pixelRatio + "px");
          this.elements[_id].setAttribute("height", this.height * this.pixelRatio + "px");
          if (this.pixelRatio !== 1) this.canvasContexts[_id].scale(this.pixelRatio, this.pixelRatio);
        }
        for (var _id2 in this.webGLContexts) {
          this.elements[_id2].setAttribute("width", this.width * this.pixelRatio + "px");
          this.elements[_id2].setAttribute("height", this.height * this.pixelRatio + "px");
          var gl = this.webGLContexts[_id2];
          gl.viewport(0, 0, this.width * this.pixelRatio, this.height * this.pixelRatio);
          if (this.pickingLayers.has(_id2)) {
            var currentTexture = this.textures[_id2];
            if (currentTexture) gl.deleteTexture(currentTexture);
          }
        }
        this.emit("resize");
        return this;
      }
      /**
       * Method used to clear all the canvases.
       *
       * @return {Sigma}
       */
    }, {
      key: "clear",
      value: function clear() {
        this.emit("beforeClear");
        this.webGLContexts.nodes.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
        this.webGLContexts.nodes.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
        this.webGLContexts.edges.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
        this.webGLContexts.edges.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
        this.webGLContexts.hoverNodes.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
        this.canvasContexts.labels.clearRect(0, 0, this.width, this.height);
        this.canvasContexts.hovers.clearRect(0, 0, this.width, this.height);
        this.canvasContexts.edgeLabels.clearRect(0, 0, this.width, this.height);
        this.emit("afterClear");
        return this;
      }
      /**
       * Method used to refresh, i.e. force the renderer to reprocess graph
       * data and render, but keep the state.
       * - if a partialGraph is provided, we only reprocess those nodes & edges.
       * - if schedule is TRUE, we schedule a render instead of sync render
       * - if skipIndexation is TRUE, then labelGrid & program indexation are skipped (can be used if you haven't modify x, y, zIndex & size)
       *
       * @return {Sigma}
       */
    }, {
      key: "refresh",
      value: function refresh(opts) {
        var _this10 = this;
        var skipIndexation = (opts === null || opts === void 0 ? void 0 : opts.skipIndexation) !== void 0 ? opts === null || opts === void 0 ? void 0 : opts.skipIndexation : false;
        var schedule = (opts === null || opts === void 0 ? void 0 : opts.schedule) !== void 0 ? opts.schedule : false;
        var fullRefresh = !opts || !opts.partialGraph;
        if (fullRefresh) {
          this.clearEdgeIndices();
          this.clearNodeIndices();
          this.graph.forEachNode(function(node2) {
            return _this10.addNode(node2);
          });
          this.graph.forEachEdge(function(edge2) {
            return _this10.addEdge(edge2);
          });
        } else {
          var _opts$partialGraph, _opts$partialGraph2;
          var nodes = ((_opts$partialGraph = opts.partialGraph) === null || _opts$partialGraph === void 0 ? void 0 : _opts$partialGraph.nodes) || [];
          for (var i = 0, l = (nodes === null || nodes === void 0 ? void 0 : nodes.length) || 0; i < l; i++) {
            var node = nodes[i];
            this.updateNode(node);
            if (skipIndexation) {
              var programIndex = this.nodeProgramIndex[node];
              if (programIndex === void 0) throw new Error('Sigma: node "'.concat(node, `" can't be repaint`));
              this.addNodeToProgram(node, this.nodeIndices[node], programIndex);
            }
          }
          var edges = (opts === null || opts === void 0 || (_opts$partialGraph2 = opts.partialGraph) === null || _opts$partialGraph2 === void 0 ? void 0 : _opts$partialGraph2.edges) || [];
          for (var _i4 = 0, _l4 = edges.length; _i4 < _l4; _i4++) {
            var edge = edges[_i4];
            this.updateEdge(edge);
            if (skipIndexation) {
              var _programIndex = this.edgeProgramIndex[edge];
              if (_programIndex === void 0) throw new Error('Sigma: edge "'.concat(edge, `" can't be repaint`));
              this.addEdgeToProgram(edge, this.edgeIndices[edge], _programIndex);
            }
          }
        }
        if (fullRefresh || !skipIndexation) this.needToProcess = true;
        if (schedule) this.scheduleRender();
        else this.render();
        return this;
      }
      /**
       * Method used to schedule a render at the next available frame.
       * This method can be safely called on a same frame because it basically
       * debounces refresh to the next frame.
       *
       * @return {Sigma}
       */
    }, {
      key: "scheduleRender",
      value: function scheduleRender() {
        var _this11 = this;
        if (!this.renderFrame) {
          this.renderFrame = requestAnimationFrame(function() {
            _this11.render();
          });
        }
        return this;
      }
      /**
       * Method used to schedule a refresh (i.e. fully reprocess graph data and render)
       * at the next available frame.
       * This method can be safely called on a same frame because it basically
       * debounces refresh to the next frame.
       *
       * @return {Sigma}
       */
    }, {
      key: "scheduleRefresh",
      value: function scheduleRefresh(opts) {
        return this.refresh(_objectSpread2(_objectSpread2({}, opts), {}, {
          schedule: true
        }));
      }
      /**
       * Method used to (un)zoom, while preserving the position of a viewport point.
       * Used for instance to zoom "on the mouse cursor".
       *
       * @param viewportTarget
       * @param newRatio
       * @return {CameraState}
       */
    }, {
      key: "getViewportZoomedState",
      value: function getViewportZoomedState(viewportTarget, newRatio) {
        var _this$camera$getState = this.camera.getState(), ratio = _this$camera$getState.ratio, angle = _this$camera$getState.angle, x = _this$camera$getState.x, y = _this$camera$getState.y;
        var _this$settings2 = this.settings, minCameraRatio = _this$settings2.minCameraRatio, maxCameraRatio = _this$settings2.maxCameraRatio;
        if (typeof maxCameraRatio === "number") newRatio = Math.min(newRatio, maxCameraRatio);
        if (typeof minCameraRatio === "number") newRatio = Math.max(newRatio, minCameraRatio);
        var ratioDiff = newRatio / ratio;
        var center = {
          x: this.width / 2,
          y: this.height / 2
        };
        var graphMousePosition = this.viewportToFramedGraph(viewportTarget);
        var graphCenterPosition = this.viewportToFramedGraph(center);
        return {
          angle,
          x: (graphMousePosition.x - graphCenterPosition.x) * (1 - ratioDiff) + x,
          y: (graphMousePosition.y - graphCenterPosition.y) * (1 - ratioDiff) + y,
          ratio: newRatio
        };
      }
      /**
       * Method returning the abstract rectangle containing the graph according
       * to the camera's state.
       *
       * @return {object} - The view's rectangle.
       */
    }, {
      key: "viewRectangle",
      value: function viewRectangle() {
        var p1 = this.viewportToFramedGraph({
          x: 0,
          y: 0
        }), p2 = this.viewportToFramedGraph({
          x: this.width,
          y: 0
        }), h = this.viewportToFramedGraph({
          x: 0,
          y: this.height
        });
        return {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          height: p2.y - h.y
        };
      }
      /**
       * Method returning the coordinates of a point from the framed graph system to the viewport system. It allows
       * overriding anything that is used to get the translation matrix, or even the matrix itself.
       *
       * Be careful if overriding dimensions, padding or cameraState, as the computation of the matrix is not the lightest
       * of computations.
       */
    }, {
      key: "framedGraphToViewport",
      value: function framedGraphToViewport(coordinates) {
        var override = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        var recomputeMatrix = !!override.cameraState || !!override.viewportDimensions || !!override.graphDimensions;
        var matrix = override.matrix ? override.matrix : recomputeMatrix ? matrixFromCamera(override.cameraState || this.camera.getState(), override.viewportDimensions || this.getDimensions(), override.graphDimensions || this.getGraphDimensions(), override.padding || this.getStagePadding()) : this.matrix;
        var viewportPos = multiplyVec2(matrix, coordinates);
        return {
          x: (1 + viewportPos.x) * this.width / 2,
          y: (1 - viewportPos.y) * this.height / 2
        };
      }
      /**
       * Method returning the coordinates of a point from the viewport system to the framed graph system. It allows
       * overriding anything that is used to get the translation matrix, or even the matrix itself.
       *
       * Be careful if overriding dimensions, padding or cameraState, as the computation of the matrix is not the lightest
       * of computations.
       */
    }, {
      key: "viewportToFramedGraph",
      value: function viewportToFramedGraph(coordinates) {
        var override = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        var recomputeMatrix = !!override.cameraState || !!override.viewportDimensions || !override.graphDimensions;
        var invMatrix = override.matrix ? override.matrix : recomputeMatrix ? matrixFromCamera(override.cameraState || this.camera.getState(), override.viewportDimensions || this.getDimensions(), override.graphDimensions || this.getGraphDimensions(), override.padding || this.getStagePadding(), true) : this.invMatrix;
        var res = multiplyVec2(invMatrix, {
          x: coordinates.x / this.width * 2 - 1,
          y: 1 - coordinates.y / this.height * 2
        });
        if (isNaN(res.x)) res.x = 0;
        if (isNaN(res.y)) res.y = 0;
        return res;
      }
      /**
       * Method used to translate a point's coordinates from the viewport system (pixel distance from the top-left of the
       * stage) to the graph system (the reference system of data as they are in the given graph instance).
       *
       * This method accepts an optional camera which can be useful if you need to translate coordinates
       * based on a different view than the one being currently being displayed on screen.
       *
       * @param {Coordinates}                  viewportPoint
       * @param {CoordinateConversionOverride} override
       */
    }, {
      key: "viewportToGraph",
      value: function viewportToGraph(viewportPoint) {
        var override = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        return this.normalizationFunction.inverse(this.viewportToFramedGraph(viewportPoint, override));
      }
      /**
       * Method used to translate a point's coordinates from the graph system (the reference system of data as they are in
       * the given graph instance) to the viewport system (pixel distance from the top-left of the stage).
       *
       * This method accepts an optional camera which can be useful if you need to translate coordinates
       * based on a different view than the one being currently being displayed on screen.
       *
       * @param {Coordinates}                  graphPoint
       * @param {CoordinateConversionOverride} override
       */
    }, {
      key: "graphToViewport",
      value: function graphToViewport(graphPoint) {
        var override = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        return this.framedGraphToViewport(this.normalizationFunction(graphPoint), override);
      }
      /**
       * Method returning the distance multiplier between the graph system and the
       * viewport system.
       */
    }, {
      key: "getGraphToViewportRatio",
      value: function getGraphToViewportRatio() {
        var graphP1 = {
          x: 0,
          y: 0
        };
        var graphP2 = {
          x: 1,
          y: 1
        };
        var graphD = Math.sqrt(Math.pow(graphP1.x - graphP2.x, 2) + Math.pow(graphP1.y - graphP2.y, 2));
        var viewportP1 = this.graphToViewport(graphP1);
        var viewportP2 = this.graphToViewport(graphP2);
        var viewportD = Math.sqrt(Math.pow(viewportP1.x - viewportP2.x, 2) + Math.pow(viewportP1.y - viewportP2.y, 2));
        return viewportD / graphD;
      }
      /**
       * Method returning the graph's bounding box.
       *
       * @return {{ x: Extent, y: Extent }}
       */
    }, {
      key: "getBBox",
      value: function getBBox() {
        return this.nodeExtent;
      }
      /**
       * Method returning the graph's custom bounding box, if any.
       *
       * @return {{ x: Extent, y: Extent } | null}
       */
    }, {
      key: "getCustomBBox",
      value: function getCustomBBox() {
        return this.customBBox;
      }
      /**
       * Method used to override the graph's bounding box with a custom one. Give `null` as the argument to stop overriding.
       *
       * @return {Sigma}
       */
    }, {
      key: "setCustomBBox",
      value: function setCustomBBox(customBBox) {
        this.customBBox = customBBox;
        this.scheduleRender();
        return this;
      }
      /**
       * Method used to shut the container & release event listeners.
       *
       * @return {undefined}
       */
    }, {
      key: "kill",
      value: function kill() {
        this.emit("kill");
        this.removeAllListeners();
        this.unbindCameraHandlers();
        window.removeEventListener("resize", this.activeListeners.handleResize);
        this.mouseCaptor.kill();
        this.touchCaptor.kill();
        this.unbindGraphHandlers();
        this.clearIndices();
        this.clearState();
        this.nodeDataCache = {};
        this.edgeDataCache = {};
        this.highlightedNodes.clear();
        if (this.renderFrame) {
          cancelAnimationFrame(this.renderFrame);
          this.renderFrame = null;
        }
        if (this.renderHighlightedNodesFrame) {
          cancelAnimationFrame(this.renderHighlightedNodesFrame);
          this.renderHighlightedNodesFrame = null;
        }
        var container = this.container;
        while (container.firstChild) container.removeChild(container.firstChild);
        for (var type in this.nodePrograms) {
          this.nodePrograms[type].kill();
        }
        for (var _type8 in this.nodeHoverPrograms) {
          this.nodeHoverPrograms[_type8].kill();
        }
        for (var _type9 in this.edgePrograms) {
          this.edgePrograms[_type9].kill();
        }
        this.nodePrograms = {};
        this.nodeHoverPrograms = {};
        this.edgePrograms = {};
        for (var id in this.elements) {
          this.killLayer(id);
        }
        this.canvasContexts = {};
        this.webGLContexts = {};
        this.elements = {};
      }
      /**
       * Method used to scale the given size according to the camera's ratio, i.e.
       * zooming state.
       *
       * @param  {number?} size -        The size to scale (node size, edge thickness etc.).
       * @param  {number?} cameraRatio - A camera ratio (defaults to the actual camera ratio).
       * @return {number}              - The scaled size.
       */
    }, {
      key: "scaleSize",
      value: function scaleSize() {
        var size = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 1;
        var cameraRatio = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this.camera.ratio;
        return size / this.settings.zoomToSizeRatioFunction(cameraRatio) * (this.getSetting("itemSizesReference") === "positions" ? cameraRatio * this.graphToViewportRatio : 1);
      }
      /**
       * Method that returns the collection of all used canvases.
       * At the moment, the instantiated canvases are the following, and in the
       * following order in the DOM:
       * - `edges`
       * - `nodes`
       * - `edgeLabels`
       * - `labels`
       * - `hovers`
       * - `hoverNodes`
       * - `mouse`
       *
       * @return {PlainObject<HTMLCanvasElement>} - The collection of canvases.
       */
    }, {
      key: "getCanvases",
      value: function getCanvases() {
        var res = {};
        for (var layer in this.elements) if (this.elements[layer] instanceof HTMLCanvasElement) res[layer] = this.elements[layer];
        return res;
      }
    }]);
  })(TypedEventEmitter);
  var Sigma = Sigma$1;

  // node_modules/sigma/rendering/dist/sigma-rendering.esm.js
  var _WebGLRenderingContex$32 = WebGLRenderingContext;
  var UNSIGNED_BYTE$32 = _WebGLRenderingContex$32.UNSIGNED_BYTE;
  var FLOAT$32 = _WebGLRenderingContex$32.FLOAT;
  var SHADER_SOURCE$42 = (
    /*glsl*/
    "\nattribute vec4 a_id;\nattribute vec4 a_color;\nattribute vec2 a_normal;\nattribute float a_normalCoef;\nattribute vec2 a_positionStart;\nattribute vec2 a_positionEnd;\nattribute float a_positionCoef;\nattribute float a_sourceRadius;\nattribute float a_targetRadius;\nattribute float a_sourceRadiusCoef;\nattribute float a_targetRadiusCoef;\n\nuniform mat3 u_matrix;\nuniform float u_zoomRatio;\nuniform float u_sizeRatio;\nuniform float u_pixelRatio;\nuniform float u_correctionRatio;\nuniform float u_minEdgeThickness;\nuniform float u_lengthToThicknessRatio;\nuniform float u_feather;\n\nvarying vec4 v_color;\nvarying vec2 v_normal;\nvarying float v_thickness;\nvarying float v_feather;\n\nconst float bias = 255.0 / 254.0;\n\nvoid main() {\n  float minThickness = u_minEdgeThickness;\n\n  vec2 normal = a_normal * a_normalCoef;\n  vec2 position = a_positionStart * (1.0 - a_positionCoef) + a_positionEnd * a_positionCoef;\n\n  float normalLength = length(normal);\n  vec2 unitNormal = normal / normalLength;\n\n  // These first computations are taken from edge.vert.glsl. Please read it to\n  // get better comments on what's happening:\n  float pixelsThickness = max(normalLength, minThickness * u_sizeRatio);\n  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;\n\n  // Here, we move the point to leave space for the arrow heads:\n  // Source arrow head\n  float sourceRadius = a_sourceRadius * a_sourceRadiusCoef;\n  float sourceDirection = sign(sourceRadius);\n  float webGLSourceRadius = sourceDirection * sourceRadius * 2.0 * u_correctionRatio / u_sizeRatio;\n  float webGLSourceArrowHeadLength = webGLThickness * u_lengthToThicknessRatio * 2.0;\n  vec2 sourceCompensationVector =\n    vec2(-sourceDirection * unitNormal.y, sourceDirection * unitNormal.x)\n    * (webGLSourceRadius + webGLSourceArrowHeadLength);\n    \n  // Target arrow head\n  float targetRadius = a_targetRadius * a_targetRadiusCoef;\n  float targetDirection = sign(targetRadius);\n  float webGLTargetRadius = targetDirection * targetRadius * 2.0 * u_correctionRatio / u_sizeRatio;\n  float webGLTargetArrowHeadLength = webGLThickness * u_lengthToThicknessRatio * 2.0;\n  vec2 targetCompensationVector =\n  vec2(-targetDirection * unitNormal.y, targetDirection * unitNormal.x)\n    * (webGLTargetRadius + webGLTargetArrowHeadLength);\n\n  // Here is the proper position of the vertex\n  gl_Position = vec4((u_matrix * vec3(position + unitNormal * webGLThickness + sourceCompensationVector + targetCompensationVector, 1)).xy, 0, 1);\n\n  v_thickness = webGLThickness / u_zoomRatio;\n\n  v_normal = unitNormal;\n\n  v_feather = u_feather * u_correctionRatio / u_zoomRatio / u_pixelRatio * 2.0;\n\n  #ifdef PICKING_MODE\n  // For picking mode, we use the ID as the color:\n  v_color = a_id;\n  #else\n  // For normal mode, we use the color:\n  v_color = a_color;\n  #endif\n\n  v_color.a *= bias;\n}\n"
  );
  var VERTEX_SHADER_SOURCE$22 = SHADER_SOURCE$42;
  var _WebGLRenderingContex$22 = WebGLRenderingContext;
  var UNSIGNED_BYTE$22 = _WebGLRenderingContex$22.UNSIGNED_BYTE;
  var FLOAT$22 = _WebGLRenderingContex$22.FLOAT;
  var UNIFORMS$22 = ["u_matrix", "u_zoomRatio", "u_sizeRatio", "u_correctionRatio", "u_pixelRatio", "u_feather", "u_minEdgeThickness", "u_lengthToThicknessRatio"];
  var DEFAULT_EDGE_DOUBLE_CLAMPED_PROGRAM_OPTIONS = {
    lengthToThicknessRatio: DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS.lengthToThicknessRatio
  };
  function createEdgeDoubleClampedProgram(inputOptions) {
    var options = _objectSpread2(_objectSpread2({}, DEFAULT_EDGE_DOUBLE_CLAMPED_PROGRAM_OPTIONS), inputOptions || {});
    return /* @__PURE__ */ (function(_EdgeProgram) {
      function EdgeDoubleClampedProgram2() {
        _classCallCheck(this, EdgeDoubleClampedProgram2);
        return _callSuper(this, EdgeDoubleClampedProgram2, arguments);
      }
      _inherits(EdgeDoubleClampedProgram2, _EdgeProgram);
      return _createClass(EdgeDoubleClampedProgram2, [{
        key: "getDefinition",
        value: function getDefinition() {
          return {
            VERTICES: 6,
            VERTEX_SHADER_SOURCE: VERTEX_SHADER_SOURCE$22,
            FRAGMENT_SHADER_SOURCE,
            METHOD: WebGLRenderingContext.TRIANGLES,
            UNIFORMS: UNIFORMS$22,
            ATTRIBUTES: [{
              name: "a_positionStart",
              size: 2,
              type: FLOAT$22
            }, {
              name: "a_positionEnd",
              size: 2,
              type: FLOAT$22
            }, {
              name: "a_normal",
              size: 2,
              type: FLOAT$22
            }, {
              name: "a_color",
              size: 4,
              type: UNSIGNED_BYTE$22,
              normalized: true
            }, {
              name: "a_id",
              size: 4,
              type: UNSIGNED_BYTE$22,
              normalized: true
            }, {
              name: "a_sourceRadius",
              size: 1,
              type: FLOAT$22
            }, {
              name: "a_targetRadius",
              size: 1,
              type: FLOAT$22
            }],
            CONSTANT_ATTRIBUTES: [
              // If 0, then position will be a_positionStart
              // If 1, then position will be a_positionEnd
              {
                name: "a_positionCoef",
                size: 1,
                type: FLOAT$22
              },
              {
                name: "a_normalCoef",
                size: 1,
                type: FLOAT$22
              },
              {
                name: "a_sourceRadiusCoef",
                size: 1,
                type: FLOAT$22
              },
              {
                name: "a_targetRadiusCoef",
                size: 1,
                type: FLOAT$22
              }
            ],
            CONSTANT_DATA: [[0, 1, -1, 0], [0, -1, 1, 0], [1, 1, 0, 1], [1, 1, 0, 1], [0, -1, 1, 0], [1, -1, 0, -1]]
          };
        }
      }, {
        key: "processVisibleItem",
        value: function processVisibleItem(edgeIndex, startIndex, sourceData, targetData, data) {
          var thickness = data.size || 1;
          var x1 = sourceData.x;
          var y1 = sourceData.y;
          var x2 = targetData.x;
          var y2 = targetData.y;
          var color = floatColor(data.color);
          var dx = x2 - x1;
          var dy = y2 - y1;
          var sourceRadius = sourceData.size || 1;
          var targetRadius = targetData.size || 1;
          var len = dx * dx + dy * dy;
          var n1 = 0;
          var n2 = 0;
          if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len * thickness;
            n2 = dx * len * thickness;
          }
          var array = this.array;
          array[startIndex++] = x1;
          array[startIndex++] = y1;
          array[startIndex++] = x2;
          array[startIndex++] = y2;
          array[startIndex++] = n1;
          array[startIndex++] = n2;
          array[startIndex++] = color;
          array[startIndex++] = edgeIndex;
          array[startIndex++] = sourceRadius;
          array[startIndex++] = targetRadius;
        }
      }, {
        key: "setUniforms",
        value: function setUniforms(params, _ref) {
          var gl = _ref.gl, uniformLocations = _ref.uniformLocations;
          var u_matrix = uniformLocations.u_matrix, u_zoomRatio = uniformLocations.u_zoomRatio, u_feather = uniformLocations.u_feather, u_pixelRatio = uniformLocations.u_pixelRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_sizeRatio = uniformLocations.u_sizeRatio, u_minEdgeThickness = uniformLocations.u_minEdgeThickness, u_lengthToThicknessRatio = uniformLocations.u_lengthToThicknessRatio;
          gl.uniformMatrix3fv(u_matrix, false, params.matrix);
          gl.uniform1f(u_zoomRatio, params.zoomRatio);
          gl.uniform1f(u_sizeRatio, params.sizeRatio);
          gl.uniform1f(u_correctionRatio, params.correctionRatio);
          gl.uniform1f(u_pixelRatio, params.pixelRatio);
          gl.uniform1f(u_feather, params.antiAliasingFeather);
          gl.uniform1f(u_minEdgeThickness, params.minEdgeThickness);
          gl.uniform1f(u_lengthToThicknessRatio, options.lengthToThicknessRatio);
        }
      }]);
    })(EdgeProgram);
  }
  var EdgeDoubleClampedProgram = createEdgeDoubleClampedProgram();
  function createEdgeDoubleArrowProgram(inputOptions) {
    return createEdgeCompoundProgram([createEdgeDoubleClampedProgram(inputOptions), createEdgeArrowHeadProgram(inputOptions), createEdgeArrowHeadProgram(_objectSpread2(_objectSpread2({}, inputOptions), {}, {
      extremity: "source"
    }))]);
  }
  var EdgeDoubleArrowProgram = createEdgeDoubleArrowProgram();
  var _WebGLRenderingContex$12 = WebGLRenderingContext;
  var UNSIGNED_BYTE$12 = _WebGLRenderingContex$12.UNSIGNED_BYTE;
  var FLOAT$12 = _WebGLRenderingContex$12.FLOAT;
  var _WebGLRenderingContex2 = WebGLRenderingContext;
  var UNSIGNED_BYTE2 = _WebGLRenderingContex2.UNSIGNED_BYTE;
  var FLOAT2 = _WebGLRenderingContex2.FLOAT;

  // node_modules/sigma/utils/dist/sigma-utils.esm.js
  var import_is_graph3 = __toESM(require_is_graph());

  // node_modules/@sigma/edge-curve/dist/sigma-edge-curve.esm.js
  function _toPrimitive2(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey2(t) {
    var i = _toPrimitive2(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _defineProperty2(e, r, t) {
    return (r = _toPropertyKey2(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys2(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r2) {
        return Object.getOwnPropertyDescriptor(e, r2).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread22(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys2(Object(t), true).forEach(function(r2) {
        _defineProperty2(e, r2, t[r2]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys2(Object(t)).forEach(function(r2) {
        Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
      });
    }
    return e;
  }
  function _classCallCheck2(a, n) {
    if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
  }
  function _defineProperties2(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey2(o.key), o);
    }
  }
  function _createClass2(e, r, t) {
    return r && _defineProperties2(e.prototype, r), t && _defineProperties2(e, t), Object.defineProperty(e, "prototype", {
      writable: false
    }), e;
  }
  function _getPrototypeOf2(t) {
    return _getPrototypeOf2 = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
      return t2.__proto__ || Object.getPrototypeOf(t2);
    }, _getPrototypeOf2(t);
  }
  function _isNativeReflectConstruct2() {
    try {
      var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (t2) {
    }
    return (_isNativeReflectConstruct2 = function() {
      return !!t;
    })();
  }
  function _assertThisInitialized2(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  function _possibleConstructorReturn2(t, e) {
    if (e && ("object" == typeof e || "function" == typeof e)) return e;
    if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
    return _assertThisInitialized2(t);
  }
  function _callSuper2(t, o, e) {
    return o = _getPrototypeOf2(o), _possibleConstructorReturn2(t, _isNativeReflectConstruct2() ? Reflect.construct(o, e || [], _getPrototypeOf2(t).constructor) : o.apply(t, e));
  }
  function _setPrototypeOf2(t, e) {
    return _setPrototypeOf2 = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
      return t2.__proto__ = e2, t2;
    }, _setPrototypeOf2(t, e);
  }
  function _inherits2(t, e) {
    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
    t.prototype = Object.create(e && e.prototype, {
      constructor: {
        value: t,
        writable: true,
        configurable: true
      }
    }), Object.defineProperty(t, "prototype", {
      writable: false
    }), e && _setPrototypeOf2(t, e);
  }
  function _arrayLikeToArray2(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _arrayWithoutHoles2(r) {
    if (Array.isArray(r)) return _arrayLikeToArray2(r);
  }
  function _iterableToArray2(r) {
    if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
  }
  function _unsupportedIterableToArray2(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray2(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray2(r, a) : void 0;
    }
  }
  function _nonIterableSpread2() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _toConsumableArray2(r) {
    return _arrayWithoutHoles2(r) || _iterableToArray2(r) || _unsupportedIterableToArray2(r) || _nonIterableSpread2();
  }
  function getCurvePoint(t, p0, p1, p2) {
    var x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
    var y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
    return {
      x,
      y
    };
  }
  function getCurveLength(p0, p1, p2) {
    var steps = 20;
    var length = 0;
    var lastPoint = p0;
    for (var i = 0; i < steps; i++) {
      var point = getCurvePoint((i + 1) / steps, p0, p1, p2);
      length += Math.sqrt(Math.pow(lastPoint.x - point.x, 2) + Math.pow(lastPoint.y - point.y, 2));
      lastPoint = point;
    }
    return length;
  }
  function createDrawCurvedEdgeLabel(_ref) {
    var curvatureAttribute = _ref.curvatureAttribute, defaultCurvature = _ref.defaultCurvature, _ref$keepLabelUpright = _ref.keepLabelUpright, keepLabelUpright = _ref$keepLabelUpright === void 0 ? true : _ref$keepLabelUpright;
    return function(context, edgeData, sourceData, targetData, settings) {
      var size = settings.edgeLabelSize, curvature = edgeData[curvatureAttribute] || defaultCurvature, font = settings.edgeLabelFont, weight = settings.edgeLabelWeight, color = settings.edgeLabelColor.attribute ? edgeData[settings.edgeLabelColor.attribute] || settings.edgeLabelColor.color || "#000" : settings.edgeLabelColor.color;
      var label = edgeData.label;
      if (!label) return;
      context.fillStyle = color;
      context.font = "".concat(weight, " ").concat(size, "px ").concat(font);
      var ltr = !keepLabelUpright || sourceData.x < targetData.x;
      var sourceX = ltr ? sourceData.x : targetData.x;
      var sourceY = ltr ? sourceData.y : targetData.y;
      var targetX = ltr ? targetData.x : sourceData.x;
      var targetY = ltr ? targetData.y : sourceData.y;
      var centerX = (sourceX + targetX) / 2;
      var centerY = (sourceY + targetY) / 2;
      var diffX = targetX - sourceX;
      var diffY = targetY - sourceY;
      var diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
      var orientation = ltr ? 1 : -1;
      var anchorX = centerX + diffY * curvature * orientation;
      var anchorY = centerY - diffX * curvature * orientation;
      var offset = edgeData.size * 0.7 + 5;
      var sourceOffsetVector = {
        x: anchorY - sourceY,
        y: -(anchorX - sourceX)
      };
      var sourceOffsetVectorLength = Math.sqrt(Math.pow(sourceOffsetVector.x, 2) + Math.pow(sourceOffsetVector.y, 2));
      var targetOffsetVector = {
        x: targetY - anchorY,
        y: -(targetX - anchorX)
      };
      var targetOffsetVectorLength = Math.sqrt(Math.pow(targetOffsetVector.x, 2) + Math.pow(targetOffsetVector.y, 2));
      sourceX += offset * sourceOffsetVector.x / sourceOffsetVectorLength;
      sourceY += offset * sourceOffsetVector.y / sourceOffsetVectorLength;
      targetX += offset * targetOffsetVector.x / targetOffsetVectorLength;
      targetY += offset * targetOffsetVector.y / targetOffsetVectorLength;
      anchorX += offset * diffY / diff;
      anchorY -= offset * diffX / diff;
      var anchorPoint = {
        x: anchorX,
        y: anchorY
      };
      var sourcePoint = {
        x: sourceX,
        y: sourceY
      };
      var targetPoint = {
        x: targetX,
        y: targetY
      };
      var curveLength = getCurveLength(sourcePoint, anchorPoint, targetPoint);
      if (curveLength < sourceData.size + targetData.size) return;
      var textLength = context.measureText(label).width;
      var availableTextLength = curveLength - sourceData.size - targetData.size;
      if (textLength > availableTextLength) {
        var ellipsis = "\u2026";
        label = label + ellipsis;
        textLength = context.measureText(label).width;
        while (textLength > availableTextLength && label.length > 1) {
          label = label.slice(0, -2) + ellipsis;
          textLength = context.measureText(label).width;
        }
        if (label.length < 4) return;
      }
      var charactersLengthCache = {};
      for (var i = 0, length = label.length; i < length; i++) {
        var character = label[i];
        if (!charactersLengthCache[character]) {
          charactersLengthCache[character] = context.measureText(character).width * (1 + curvature * 0.35);
        }
      }
      var t = 0.5 - textLength / curveLength / 2;
      for (var _i = 0, _length = label.length; _i < _length; _i++) {
        var _character = label[_i];
        var point = getCurvePoint(t, sourcePoint, anchorPoint, targetPoint);
        var tangentX = 2 * (1 - t) * (anchorX - sourceX) + 2 * t * (targetX - anchorX);
        var tangentY = 2 * (1 - t) * (anchorY - sourceY) + 2 * t * (targetY - anchorY);
        var angle = Math.atan2(tangentY, tangentX);
        context.save();
        context.translate(point.x, point.y);
        context.rotate(angle);
        context.fillText(_character, 0, 0);
        context.restore();
        t += charactersLengthCache[_character] / curveLength;
      }
    };
  }
  function getFragmentShader(_ref) {
    var arrowHead = _ref.arrowHead;
    var hasTargetArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "target" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var hasSourceArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "source" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var SHADER = (
      /*glsl*/
      "\nprecision highp float;\n\nvarying vec4 v_color;\nvarying float v_thickness;\nvarying float v_feather;\nvarying vec2 v_cpA;\nvarying vec2 v_cpB;\nvarying vec2 v_cpC;\n".concat(hasTargetArrowHead ? "\nvarying float v_targetSize;\nvarying vec2 v_targetPoint;" : "", "\n").concat(hasSourceArrowHead ? "\nvarying float v_sourceSize;\nvarying vec2 v_sourcePoint;" : "", "\n").concat(arrowHead ? "\nuniform float u_lengthToThicknessRatio;\nuniform float u_widenessToThicknessRatio;" : "", "\n\nfloat det(vec2 a, vec2 b) {\n  return a.x * b.y - b.x * a.y;\n}\n\nvec2 getDistanceVector(vec2 b0, vec2 b1, vec2 b2) {\n  float a = det(b0, b2), b = 2.0 * det(b1, b0), d = 2.0 * det(b2, b1);\n  float f = b * d - a * a;\n  vec2 d21 = b2 - b1, d10 = b1 - b0, d20 = b2 - b0;\n  vec2 gf = 2.0 * (b * d21 + d * d10 + a * d20);\n  gf = vec2(gf.y, -gf.x);\n  vec2 pp = -f * gf / dot(gf, gf);\n  vec2 d0p = b0 - pp;\n  float ap = det(d0p, d20), bp = 2.0 * det(d10, d0p);\n  float t = clamp((ap + bp) / (2.0 * a + b + d), 0.0, 1.0);\n  return mix(mix(b0, b1, t), mix(b1, b2, t), t);\n}\n\nfloat distToQuadraticBezierCurve(vec2 p, vec2 b0, vec2 b1, vec2 b2) {\n  return length(getDistanceVector(b0 - p, b1 - p, b2 - p));\n}\n\nconst vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);\n\nvoid main(void) {\n  float dist = distToQuadraticBezierCurve(gl_FragCoord.xy, v_cpA, v_cpB, v_cpC);\n  float thickness = v_thickness;\n").concat(hasTargetArrowHead ? "\n  float distToTarget = length(gl_FragCoord.xy - v_targetPoint);\n  float targetArrowLength = v_targetSize + thickness * u_lengthToThicknessRatio;\n  if (distToTarget < targetArrowLength) {\n    thickness = (distToTarget - v_targetSize) / (targetArrowLength - v_targetSize) * u_widenessToThicknessRatio * thickness;\n  }" : "", "\n").concat(hasSourceArrowHead ? "\n  float distToSource = length(gl_FragCoord.xy - v_sourcePoint);\n  float sourceArrowLength = v_sourceSize + thickness * u_lengthToThicknessRatio;\n  if (distToSource < sourceArrowLength) {\n    thickness = (distToSource - v_sourceSize) / (sourceArrowLength - v_sourceSize) * u_widenessToThicknessRatio * thickness;\n  }" : "", "\n\n  float halfThickness = thickness / 2.0;\n  if (dist < halfThickness) {\n    #ifdef PICKING_MODE\n    gl_FragColor = v_color;\n    #else\n    float t = smoothstep(\n      halfThickness - v_feather,\n      halfThickness,\n      dist\n    );\n\n    gl_FragColor = mix(v_color, transparent, t);\n    #endif\n  } else {\n    gl_FragColor = transparent;\n  }\n}\n")
    );
    return SHADER;
  }
  function getVertexShader(_ref) {
    var arrowHead = _ref.arrowHead;
    var hasTargetArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "target" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var hasSourceArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "source" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var SHADER = (
      /*glsl*/
      "\nattribute vec4 a_id;\nattribute vec4 a_color;\nattribute float a_direction;\nattribute float a_thickness;\nattribute vec2 a_source;\nattribute vec2 a_target;\nattribute float a_current;\nattribute float a_curvature;\n".concat(hasTargetArrowHead ? "attribute float a_targetSize;\n" : "", "\n").concat(hasSourceArrowHead ? "attribute float a_sourceSize;\n" : "", "\n\nuniform mat3 u_matrix;\nuniform float u_sizeRatio;\nuniform float u_pixelRatio;\nuniform vec2 u_dimensions;\nuniform float u_minEdgeThickness;\nuniform float u_feather;\n\nvarying vec4 v_color;\nvarying float v_thickness;\nvarying float v_feather;\nvarying vec2 v_cpA;\nvarying vec2 v_cpB;\nvarying vec2 v_cpC;\n").concat(hasTargetArrowHead ? "\nvarying float v_targetSize;\nvarying vec2 v_targetPoint;" : "", "\n").concat(hasSourceArrowHead ? "\nvarying float v_sourceSize;\nvarying vec2 v_sourcePoint;" : "", "\n").concat(arrowHead ? "\nuniform float u_widenessToThicknessRatio;" : "", '\n\nconst float bias = 255.0 / 254.0;\nconst float epsilon = 0.7;\n\nvec2 clipspaceToViewport(vec2 pos, vec2 dimensions) {\n  return vec2(\n    (pos.x + 1.0) * dimensions.x / 2.0,\n    (pos.y + 1.0) * dimensions.y / 2.0\n  );\n}\n\nvec2 viewportToClipspace(vec2 pos, vec2 dimensions) {\n  return vec2(\n    pos.x / dimensions.x * 2.0 - 1.0,\n    pos.y / dimensions.y * 2.0 - 1.0\n  );\n}\n\nvoid main() {\n  float minThickness = u_minEdgeThickness;\n\n  // Selecting the correct position\n  // Branchless "position = a_source if a_current == 1.0 else a_target"\n  vec2 position = a_source * max(0.0, a_current) + a_target * max(0.0, 1.0 - a_current);\n  position = (u_matrix * vec3(position, 1)).xy;\n\n  vec2 source = (u_matrix * vec3(a_source, 1)).xy;\n  vec2 target = (u_matrix * vec3(a_target, 1)).xy;\n\n  vec2 viewportPosition = clipspaceToViewport(position, u_dimensions);\n  vec2 viewportSource = clipspaceToViewport(source, u_dimensions);\n  vec2 viewportTarget = clipspaceToViewport(target, u_dimensions);\n\n  vec2 delta = viewportTarget.xy - viewportSource.xy;\n  float len = length(delta);\n  vec2 normal = vec2(-delta.y, delta.x) * a_direction;\n  vec2 unitNormal = normal / len;\n  float boundingBoxThickness = len * a_curvature;\n\n  float curveThickness = max(minThickness, a_thickness / u_sizeRatio);\n  v_thickness = curveThickness * u_pixelRatio;\n  v_feather = u_feather;\n\n  v_cpA = viewportSource;\n  v_cpB = 0.5 * (viewportSource + viewportTarget) + unitNormal * a_direction * boundingBoxThickness;\n  v_cpC = viewportTarget;\n\n  vec2 viewportOffsetPosition = (\n    viewportPosition +\n    unitNormal * (boundingBoxThickness / 2.0 + sign(boundingBoxThickness) * (').concat(arrowHead ? "curveThickness * u_widenessToThicknessRatio" : "curveThickness", " + epsilon)) *\n    max(0.0, a_direction) // NOTE: cutting the bounding box in half to avoid overdraw\n  );\n\n  position = viewportToClipspace(viewportOffsetPosition, u_dimensions);\n  gl_Position = vec4(position, 0, 1);\n    \n").concat(hasTargetArrowHead ? "\n  v_targetSize = a_targetSize * u_pixelRatio / u_sizeRatio;\n  v_targetPoint = viewportTarget;\n" : "", "\n").concat(hasSourceArrowHead ? "\n  v_sourceSize = a_sourceSize * u_pixelRatio / u_sizeRatio;\n  v_sourcePoint = viewportSource;\n" : "", "\n\n  #ifdef PICKING_MODE\n  // For picking mode, we use the ID as the color:\n  v_color = a_id;\n  #else\n  // For normal mode, we use the color:\n  v_color = a_color;\n  #endif\n\n  v_color.a *= bias;\n}\n")
    );
    return SHADER;
  }
  var DEFAULT_EDGE_CURVATURE = 0.25;
  var DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS = {
    arrowHead: null,
    curvatureAttribute: "curvature",
    defaultCurvature: DEFAULT_EDGE_CURVATURE
  };
  var _WebGLRenderingContex3 = WebGLRenderingContext;
  var UNSIGNED_BYTE3 = _WebGLRenderingContex3.UNSIGNED_BYTE;
  var FLOAT3 = _WebGLRenderingContex3.FLOAT;
  function createEdgeCurveProgram(inputOptions) {
    var options = _objectSpread22(_objectSpread22({}, DEFAULT_EDGE_CURVE_PROGRAM_OPTIONS), inputOptions || {});
    var _ref = options, arrowHead = _ref.arrowHead, curvatureAttribute = _ref.curvatureAttribute, drawLabel = _ref.drawLabel;
    var hasTargetArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "target" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var hasSourceArrowHead = (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "source" || (arrowHead === null || arrowHead === void 0 ? void 0 : arrowHead.extremity) === "both";
    var UNIFORMS2 = ["u_matrix", "u_sizeRatio", "u_dimensions", "u_pixelRatio", "u_feather", "u_minEdgeThickness"].concat(_toConsumableArray2(arrowHead ? ["u_lengthToThicknessRatio", "u_widenessToThicknessRatio"] : []));
    return /* @__PURE__ */ (function(_EdgeProgram) {
      _inherits2(EdgeCurveProgram2, _EdgeProgram);
      function EdgeCurveProgram2() {
        var _this;
        _classCallCheck2(this, EdgeCurveProgram2);
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        _this = _callSuper2(this, EdgeCurveProgram2, [].concat(args));
        _defineProperty2(_assertThisInitialized2(_this), "drawLabel", drawLabel || createDrawCurvedEdgeLabel(options));
        return _this;
      }
      _createClass2(EdgeCurveProgram2, [{
        key: "getDefinition",
        value: function getDefinition() {
          return {
            VERTICES: 6,
            VERTEX_SHADER_SOURCE: getVertexShader(options),
            FRAGMENT_SHADER_SOURCE: getFragmentShader(options),
            METHOD: WebGLRenderingContext.TRIANGLES,
            UNIFORMS: UNIFORMS2,
            ATTRIBUTES: [{
              name: "a_source",
              size: 2,
              type: FLOAT3
            }, {
              name: "a_target",
              size: 2,
              type: FLOAT3
            }].concat(_toConsumableArray2(hasTargetArrowHead ? [{
              name: "a_targetSize",
              size: 1,
              type: FLOAT3
            }] : []), _toConsumableArray2(hasSourceArrowHead ? [{
              name: "a_sourceSize",
              size: 1,
              type: FLOAT3
            }] : []), [{
              name: "a_thickness",
              size: 1,
              type: FLOAT3
            }, {
              name: "a_curvature",
              size: 1,
              type: FLOAT3
            }, {
              name: "a_color",
              size: 4,
              type: UNSIGNED_BYTE3,
              normalized: true
            }, {
              name: "a_id",
              size: 4,
              type: UNSIGNED_BYTE3,
              normalized: true
            }]),
            CONSTANT_ATTRIBUTES: [
              {
                name: "a_current",
                size: 1,
                type: FLOAT3
              },
              // TODO: could optimize to bool
              {
                name: "a_direction",
                size: 1,
                type: FLOAT3
              }
              // TODO: could optimize to byte
            ],
            CONSTANT_DATA: [[0, 1], [0, -1], [1, 1], [0, -1], [1, 1], [1, -1]]
          };
        }
      }, {
        key: "processVisibleItem",
        value: function processVisibleItem(edgeIndex, startIndex, sourceData, targetData, data) {
          var _data;
          var thickness = data.size || 1;
          var x1 = sourceData.x;
          var y1 = sourceData.y;
          var x2 = targetData.x;
          var y2 = targetData.y;
          var color = floatColor(data.color);
          var curvature = (_data = data[curvatureAttribute]) !== null && _data !== void 0 ? _data : DEFAULT_EDGE_CURVATURE;
          var array = this.array;
          array[startIndex++] = x1;
          array[startIndex++] = y1;
          array[startIndex++] = x2;
          array[startIndex++] = y2;
          if (hasTargetArrowHead) array[startIndex++] = targetData.size;
          if (hasSourceArrowHead) array[startIndex++] = sourceData.size;
          array[startIndex++] = thickness;
          array[startIndex++] = curvature;
          array[startIndex++] = color;
          array[startIndex++] = edgeIndex;
        }
      }, {
        key: "setUniforms",
        value: function setUniforms(params, _ref2) {
          var gl = _ref2.gl, uniformLocations = _ref2.uniformLocations;
          var u_matrix = uniformLocations.u_matrix, u_pixelRatio = uniformLocations.u_pixelRatio, u_feather = uniformLocations.u_feather, u_sizeRatio = uniformLocations.u_sizeRatio, u_dimensions = uniformLocations.u_dimensions, u_minEdgeThickness = uniformLocations.u_minEdgeThickness;
          gl.uniformMatrix3fv(u_matrix, false, params.matrix);
          gl.uniform1f(u_pixelRatio, params.pixelRatio);
          gl.uniform1f(u_sizeRatio, params.sizeRatio);
          gl.uniform1f(u_feather, params.antiAliasingFeather);
          gl.uniform2f(u_dimensions, params.width * params.pixelRatio, params.height * params.pixelRatio);
          gl.uniform1f(u_minEdgeThickness, params.minEdgeThickness);
          if (arrowHead) {
            var u_lengthToThicknessRatio = uniformLocations.u_lengthToThicknessRatio, u_widenessToThicknessRatio = uniformLocations.u_widenessToThicknessRatio;
            gl.uniform1f(u_lengthToThicknessRatio, arrowHead.lengthToThicknessRatio);
            gl.uniform1f(u_widenessToThicknessRatio, arrowHead.widenessToThicknessRatio);
          }
        }
      }]);
      return EdgeCurveProgram2;
    })(EdgeProgram);
  }
  var EdgeCurveProgram = createEdgeCurveProgram();
  var EdgeCurvedArrowProgram = createEdgeCurveProgram({
    arrowHead: DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS
  });
  var EdgeCurvedDoubleArrowProgram = createEdgeCurveProgram({
    arrowHead: _objectSpread22(_objectSpread22({}, DEFAULT_EDGE_ARROW_HEAD_PROGRAM_OPTIONS), {}, {
      extremity: "both"
    })
  });

  // node_modules/@sigma/node-border/dist/sigma-node-border.esm.js
  function _arrayWithHoles2(r) {
    if (Array.isArray(r)) return r;
  }
  function _iterableToArrayLimit2(r, l) {
    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (null != t) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, 0 === l) {
          if (Object(t) !== t) return;
          f = false;
        } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
        } finally {
          if (o) throw n;
        }
      }
      return a;
    }
  }
  function _arrayLikeToArray3(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _unsupportedIterableToArray3(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray3(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray3(r, a) : void 0;
    }
  }
  function _nonIterableRest2() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _slicedToArray2(r, e) {
    return _arrayWithHoles2(r) || _iterableToArrayLimit2(r, e) || _unsupportedIterableToArray3(r, e) || _nonIterableRest2();
  }
  function _classCallCheck3(a, n) {
    if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
  }
  function _toPrimitive3(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey3(t) {
    var i = _toPrimitive3(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _defineProperties3(e, r) {
    for (var t = 0; t < r.length; t++) {
      var o = r[t];
      o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey3(o.key), o);
    }
  }
  function _createClass3(e, r, t) {
    return r && _defineProperties3(e.prototype, r), t && _defineProperties3(e, t), Object.defineProperty(e, "prototype", {
      writable: false
    }), e;
  }
  function _getPrototypeOf3(t) {
    return _getPrototypeOf3 = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
      return t2.__proto__ || Object.getPrototypeOf(t2);
    }, _getPrototypeOf3(t);
  }
  function _isNativeReflectConstruct3() {
    try {
      var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch (t2) {
    }
    return (_isNativeReflectConstruct3 = function() {
      return !!t;
    })();
  }
  function _assertThisInitialized3(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  function _possibleConstructorReturn3(t, e) {
    if (e && ("object" == typeof e || "function" == typeof e)) return e;
    if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
    return _assertThisInitialized3(t);
  }
  function _callSuper3(t, o, e) {
    return o = _getPrototypeOf3(o), _possibleConstructorReturn3(t, _isNativeReflectConstruct3() ? Reflect.construct(o, e || [], _getPrototypeOf3(t).constructor) : o.apply(t, e));
  }
  function _setPrototypeOf3(t, e) {
    return _setPrototypeOf3 = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
      return t2.__proto__ = e2, t2;
    }, _setPrototypeOf3(t, e);
  }
  function _inherits3(t, e) {
    if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
    t.prototype = Object.create(e && e.prototype, {
      constructor: {
        value: t,
        writable: true,
        configurable: true
      }
    }), Object.defineProperty(t, "prototype", {
      writable: false
    }), e && _setPrototypeOf3(t, e);
  }
  function _defineProperty3(e, r, t) {
    return (r = _toPropertyKey3(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function _arrayWithoutHoles3(r) {
    if (Array.isArray(r)) return _arrayLikeToArray3(r);
  }
  function _iterableToArray3(r) {
    if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
  }
  function _nonIterableSpread3() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _toConsumableArray3(r) {
    return _arrayWithoutHoles3(r) || _iterableToArray3(r) || _unsupportedIterableToArray3(r) || _nonIterableSpread3();
  }
  function ownKeys3(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r2) {
        return Object.getOwnPropertyDescriptor(e, r2).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread23(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys3(Object(t), true).forEach(function(r2) {
        _defineProperty3(e, r2, t[r2]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys3(Object(t)).forEach(function(r2) {
        Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
      });
    }
    return e;
  }
  var DEFAULT_BORDER_SIZE_MODE = "relative";
  var DEFAULT_CREATE_NODE_BORDER_OPTIONS = {
    drawLabel: void 0,
    drawHover: void 0,
    borders: [{
      size: {
        value: 0.1
      },
      color: {
        attribute: "borderColor"
      }
    }, {
      size: {
        fill: true
      },
      color: {
        attribute: "color"
      }
    }]
  };
  var DEFAULT_COLOR = "#000000";
  function getFragmentShader2(_ref) {
    var borders = _ref.borders;
    var fillCounts = numberToGLSLFloat(borders.filter(function(_ref2) {
      var size = _ref2.size;
      return "fill" in size;
    }).length);
    var SHADER = (
      /*glsl*/
      "\nprecision highp float;\n\nvarying vec2 v_diffVector;\nvarying float v_radius;\n\n#ifdef PICKING_MODE\nvarying vec4 v_color;\n#else\n// For normal mode, we use the border colors defined in the program:\n".concat(borders.flatMap(function(_ref3, i) {
        var size = _ref3.size;
        return "attribute" in size ? ["varying float v_borderSize_".concat(i + 1, ";")] : [];
      }).join("\n"), "\n").concat(borders.flatMap(function(_ref4, i) {
        var color = _ref4.color;
        return "attribute" in color ? ["varying vec4 v_borderColor_".concat(i + 1, ";")] : "value" in color ? ["uniform vec4 u_borderColor_".concat(i + 1, ";")] : [];
      }).join("\n"), "\n#endif\n\nuniform float u_correctionRatio;\n\nconst float bias = 255.0 / 254.0;\nconst vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);\n\nvoid main(void) {\n  float dist = length(v_diffVector);\n  float aaBorder = 2.0 * u_correctionRatio;\n  float v_borderSize_0 = v_radius;\n  vec4 v_borderColor_0 = transparent;\n\n  // No antialiasing for picking mode:\n  #ifdef PICKING_MODE\n  if (dist > v_radius)\n    gl_FragColor = transparent;\n  else {\n    gl_FragColor = v_color;\n    gl_FragColor.a *= bias;\n  }\n  #else\n  // Sizes:\n").concat(borders.flatMap(function(_ref5, i) {
        var size = _ref5.size;
        if ("fill" in size) return [];
        size = size;
        var value = "attribute" in size ? "v_borderSize_".concat(i + 1) : numberToGLSLFloat(size.value);
        var factor = (size.mode || DEFAULT_BORDER_SIZE_MODE) === "pixels" ? "u_correctionRatio" : "v_radius";
        return ["  float borderSize_".concat(i + 1, " = ").concat(factor, " * ").concat(value, ";")];
      }).join("\n"), `
  // Now, let's split the remaining space between "fill" borders:
  float fillBorderSize = (v_radius - (`).concat(borders.flatMap(function(_ref6, i) {
        var size = _ref6.size;
        return !("fill" in size) ? ["borderSize_".concat(i + 1)] : [];
      }).join(" + "), ") ) / ").concat(fillCounts, ";\n").concat(borders.flatMap(function(_ref7, i) {
        var size = _ref7.size;
        return "fill" in size ? ["  float borderSize_".concat(i + 1, " = fillBorderSize;")] : [];
      }).join("\n"), "\n\n  // Finally, normalize all border sizes, to start from the full size and to end with the smallest:\n  float adjustedBorderSize_0 = v_radius;\n").concat(borders.map(function(_, i) {
        return "  float adjustedBorderSize_".concat(i + 1, " = adjustedBorderSize_").concat(i, " - borderSize_").concat(i + 1, ";");
      }).join("\n"), "\n\n  // Colors:\n  vec4 borderColor_0 = transparent;\n").concat(borders.map(function(_ref8, i) {
        var color = _ref8.color;
        var res = [];
        if ("attribute" in color) {
          res.push("  vec4 borderColor_".concat(i + 1, " = v_borderColor_").concat(i + 1, ";"));
        } else if ("transparent" in color) {
          res.push("  vec4 borderColor_".concat(i + 1, " = vec4(0.0, 0.0, 0.0, 0.0);"));
        } else {
          res.push("  vec4 borderColor_".concat(i + 1, " = u_borderColor_").concat(i + 1, ";"));
        }
        res.push("  borderColor_".concat(i + 1, ".a *= bias;"));
        res.push("  if (borderSize_".concat(i + 1, " <= 1.0 * u_correctionRatio) { borderColor_").concat(i + 1, " = borderColor_").concat(i, "; }"));
        return res.join("\n");
      }).join("\n"), "\n  if (dist > adjustedBorderSize_0) {\n    gl_FragColor = borderColor_0;\n  } else ").concat(borders.map(function(_, i) {
        return "if (dist > adjustedBorderSize_".concat(i, " - aaBorder) {\n    gl_FragColor = mix(borderColor_").concat(i + 1, ", borderColor_").concat(i, ", (dist - adjustedBorderSize_").concat(i, " + aaBorder) / aaBorder);\n  } else if (dist > adjustedBorderSize_").concat(i + 1, ") {\n    gl_FragColor = borderColor_").concat(i + 1, ";\n  } else ");
      }).join(""), " { /* Nothing to add here */ }\n  #endif\n}\n")
    );
    return SHADER;
  }
  function getVertexShader2(_ref) {
    var borders = _ref.borders;
    var SHADER = (
      /*glsl*/
      "\nattribute vec2 a_position;\nattribute float a_size;\nattribute float a_angle;\n\nuniform mat3 u_matrix;\nuniform float u_sizeRatio;\nuniform float u_correctionRatio;\n\nvarying vec2 v_diffVector;\nvarying float v_radius;\n\n#ifdef PICKING_MODE\nattribute vec4 a_id;\nvarying vec4 v_color;\n#else\n".concat(borders.flatMap(function(_ref2, i) {
        var size = _ref2.size;
        return "attribute" in size ? ["attribute float a_borderSize_".concat(i + 1, ";"), "varying float v_borderSize_".concat(i + 1, ";")] : [];
      }).join("\n"), "\n").concat(borders.flatMap(function(_ref3, i) {
        var color = _ref3.color;
        return "attribute" in color ? ["attribute vec4 a_borderColor_".concat(i + 1, ";"), "varying vec4 v_borderColor_".concat(i + 1, ";")] : [];
      }).join("\n"), "\n#endif\n\nconst float bias = 255.0 / 254.0;\nconst vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);\n\nvoid main() {\n  float size = a_size * u_correctionRatio / u_sizeRatio * 4.0;\n  vec2 diffVector = size * vec2(cos(a_angle), sin(a_angle));\n  vec2 position = a_position + diffVector;\n  gl_Position = vec4(\n    (u_matrix * vec3(position, 1)).xy,\n    0,\n    1\n  );\n\n  v_radius = size / 2.0;\n  v_diffVector = diffVector;\n\n  #ifdef PICKING_MODE\n  v_color = a_id;\n  #else\n").concat(borders.flatMap(function(_ref4, i) {
        var size = _ref4.size;
        return "attribute" in size ? ["  v_borderSize_".concat(i + 1, " = a_borderSize_").concat(i + 1, ";")] : [];
      }).join("\n"), "\n").concat(borders.flatMap(function(_ref5, i) {
        var color = _ref5.color;
        return "attribute" in color ? ["  v_borderColor_".concat(i + 1, " = a_borderColor_").concat(i + 1, ";")] : [];
      }).join("\n"), "\n  #endif\n}\n")
    );
    return SHADER;
  }
  var _WebGLRenderingContex4 = WebGLRenderingContext;
  var UNSIGNED_BYTE4 = _WebGLRenderingContex4.UNSIGNED_BYTE;
  var FLOAT4 = _WebGLRenderingContex4.FLOAT;
  function createNodeBorderProgram(inputOptions) {
    var _NodeBorderProgram;
    var options = _objectSpread23(_objectSpread23({}, DEFAULT_CREATE_NODE_BORDER_OPTIONS), inputOptions || {});
    var borders = options.borders, drawLabel = options.drawLabel, drawHover = options.drawHover;
    var UNIFORMS2 = ["u_sizeRatio", "u_correctionRatio", "u_matrix"].concat(_toConsumableArray3(borders.flatMap(function(_ref, i) {
      var color = _ref.color;
      return "value" in color ? ["u_borderColor_".concat(i + 1)] : [];
    })));
    return _NodeBorderProgram = /* @__PURE__ */ (function(_NodeProgram) {
      _inherits3(NodeBorderProgram2, _NodeProgram);
      function NodeBorderProgram2() {
        var _this;
        _classCallCheck3(this, NodeBorderProgram2);
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        _this = _callSuper3(this, NodeBorderProgram2, [].concat(args));
        _defineProperty3(_assertThisInitialized3(_this), "drawLabel", drawLabel);
        _defineProperty3(_assertThisInitialized3(_this), "drawHover", drawHover);
        return _this;
      }
      _createClass3(NodeBorderProgram2, [{
        key: "getDefinition",
        value: function getDefinition() {
          return {
            VERTICES: 3,
            VERTEX_SHADER_SOURCE: getVertexShader2(options),
            FRAGMENT_SHADER_SOURCE: getFragmentShader2(options),
            METHOD: WebGLRenderingContext.TRIANGLES,
            UNIFORMS: UNIFORMS2,
            ATTRIBUTES: [{
              name: "a_position",
              size: 2,
              type: FLOAT4
            }, {
              name: "a_id",
              size: 4,
              type: UNSIGNED_BYTE4,
              normalized: true
            }, {
              name: "a_size",
              size: 1,
              type: FLOAT4
            }].concat(_toConsumableArray3(borders.flatMap(function(_ref2, i) {
              var color = _ref2.color;
              return "attribute" in color ? [{
                name: "a_borderColor_".concat(i + 1),
                size: 4,
                type: UNSIGNED_BYTE4,
                normalized: true
              }] : [];
            })), _toConsumableArray3(borders.flatMap(function(_ref3, i) {
              var size = _ref3.size;
              return "attribute" in size ? [{
                name: "a_borderSize_".concat(i + 1),
                size: 1,
                type: FLOAT4
              }] : [];
            }))),
            CONSTANT_ATTRIBUTES: [{
              name: "a_angle",
              size: 1,
              type: FLOAT4
            }],
            CONSTANT_DATA: [[NodeBorderProgram2.ANGLE_1], [NodeBorderProgram2.ANGLE_2], [NodeBorderProgram2.ANGLE_3]]
          };
        }
      }, {
        key: "processVisibleItem",
        value: function processVisibleItem(nodeIndex, startIndex, data) {
          var array = this.array;
          array[startIndex++] = data.x;
          array[startIndex++] = data.y;
          array[startIndex++] = nodeIndex;
          array[startIndex++] = data.size;
          borders.forEach(function(_ref4) {
            var color = _ref4.color;
            if ("attribute" in color) array[startIndex++] = floatColor(data[color.attribute] || color.defaultValue || DEFAULT_COLOR);
          });
          borders.forEach(function(_ref5) {
            var size = _ref5.size;
            if ("attribute" in size) array[startIndex++] = data[size.attribute] || size.defaultValue;
          });
        }
      }, {
        key: "setUniforms",
        value: function setUniforms(params, _ref6) {
          var gl = _ref6.gl, uniformLocations = _ref6.uniformLocations;
          var u_sizeRatio = uniformLocations.u_sizeRatio, u_correctionRatio = uniformLocations.u_correctionRatio, u_matrix = uniformLocations.u_matrix;
          gl.uniform1f(u_correctionRatio, params.correctionRatio);
          gl.uniform1f(u_sizeRatio, params.sizeRatio);
          gl.uniformMatrix3fv(u_matrix, false, params.matrix);
          borders.forEach(function(_ref7, i) {
            var color = _ref7.color;
            if ("value" in color) {
              var location2 = uniformLocations["u_borderColor_".concat(i + 1)];
              var _colorToArray = colorToArray(color.value), _colorToArray2 = _slicedToArray2(_colorToArray, 4), r = _colorToArray2[0], g = _colorToArray2[1], b = _colorToArray2[2], a = _colorToArray2[3];
              gl.uniform4f(location2, r / 255, g / 255, b / 255, a / 255);
            }
          });
        }
      }]);
      return NodeBorderProgram2;
    })(NodeProgram), _defineProperty3(_NodeBorderProgram, "ANGLE_1", 0), _defineProperty3(_NodeBorderProgram, "ANGLE_2", 2 * Math.PI / 3), _defineProperty3(_NodeBorderProgram, "ANGLE_3", 4 * Math.PI / 3), _NodeBorderProgram;
  }
  var NodeBorderProgram = createNodeBorderProgram();

  // web/app-sigma.js
  var GRAPH_DATA_URL = "../data/graph.json";
  var CLUSTER_DATA_URL = "../data/clusters.json";
  var USE_CURVED_EDGES = new URLSearchParams(location.search).get("edges") !== "straight";
  var MAX_TOPIC_LABELS = 14;
  var METADATA_URL = "../data/metadata.json";
  var topicColors = /* @__PURE__ */ new Map();
  var topicRgbColors = /* @__PURE__ */ new Map();
  var topicLabels = /* @__PURE__ */ new Map();
  var graph;
  var renderer;
  var currentTopics = [];
  var activeTopic = null;
  var selectedNode = null;
  var selectedEdge = null;
  var highlightedNodes = null;
  var highlightedEdges = null;
  var hiddenTopics = /* @__PURE__ */ new Set();
  var showWeakAssignments = true;
  var topicLabelElements = [];
  var paperMeta = {};
  async function readJson(path) {
    const sep = path.includes("?") ? "&" : "?";
    const response = await fetch(`${path}${sep}t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read ${path}`);
    return response.json();
  }
  async function loadMetadata() {
    try {
      paperMeta = await readJson(METADATA_URL);
    } catch {
      paperMeta = {};
    }
  }
  function hslToRgb(h, s, l) {
    h /= 360;
    const f = (n) => {
      const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  }
  function generateColors(topics) {
    topicColors = /* @__PURE__ */ new Map();
    topicRgbColors = /* @__PURE__ */ new Map();
    topicLabels = /* @__PURE__ */ new Map();
    topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count).forEach((t, i) => {
      const rgb = hslToRgb(i * 137.5 % 360, 0.72, 0.58);
      topicRgbColors.set(t.id, rgb);
      topicColors.set(t.id, `rgb(${rgb.join(", ")})`);
      topicLabels.set(t.id, t.label);
    });
    topicRgbColors.set(-1, [110, 120, 140]);
    topicColors.set(-1, "rgb(110, 120, 140)");
    topicLabels.set(-1, "unclassified");
  }
  function topicColor(topic, alpha = 1) {
    const [r, g, b] = topicRgbColors.get(topic) || [110, 120, 140];
    return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  function edgeColor(a, b, alpha = 1) {
    const x = topicRgbColors.get(a) || [110, 120, 140], y = topicRgbColors.get(b) || [110, 120, 140];
    const rgb = [x[0] + y[0] >> 1, x[1] + y[1] >> 1, x[2] + y[2] >> 1];
    return alpha === 1 ? `rgb(${rgb.join(", ")})` : `rgba(${rgb.join(", ")}, ${alpha})`;
  }
  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }
  function edgeId(e) {
    return `${e.source}__${e.target}`;
  }
  function edgeCurvature(id) {
    const h = hashString(id);
    return (h < 0.5 ? -1 : 1) * (0.055 + Math.floor(h * 1e3) % 8 * 0.012);
  }
  function validateCoordinates(nodes) {
    const n = nodes.find((x) => !Number.isFinite(x.x) || !Number.isFinite(x.y));
    if (n) throw new Error(`Paper "${n.title || n.id}" has no position. Run 'python app.py refresh'.`);
  }
  function nodeSize(degree, weak_assignment, selected = false) {
    let diameter = Math.min(30, 3 + degree * 0.85);
    if (weak_assignment) diameter *= 0.85;
    if (selected) diameter = Math.max(18, diameter) + 6;
    return diameter / 2;
  }
  function nodeAttributes(n, degree = 0) {
    const color = topicColor(n.cluster, n.weak_assignment ? 0.5 : 1);
    return {
      x: n.x,
      y: n.y,
      label: n.title,
      title: n.title,
      cluster: n.cluster,
      clusterLabel: n.cluster_label,
      weak_assignment: !!n.weak_assignment,
      degree,
      size: nodeSize(degree, !!n.weak_assignment),
      color,
      baseColor: color,
      borderColor: color,
      haloColor: color,
      type: "border",
      hidden: false,
      zIndex: 1
    };
  }
  function edgeAttributes(e, topicA, topicB) {
    const color = edgeColor(topicA, topicB, 0.28);
    return {
      weight: e.weight,
      size: 0.8 + (e.weight || 0.5) * 0.9,
      color,
      baseColor: color,
      curvature: edgeCurvature(edgeId(e)),
      type: USE_CURVED_EDGES ? "curve" : "line",
      hidden: false,
      zIndex: 1
    };
  }
  function buildGraph(data) {
    validateCoordinates(data.nodes);
    const g = new Graph({ type: "undirected", multi: false, allowSelfLoops: false });
    data.nodes.forEach((n) => g.addNode(n.id, nodeAttributes(n)));
    data.edges.forEach((e) => {
      const id = edgeId(e);
      if (!g.hasNode(e.source) || !g.hasNode(e.target) || g.hasEdge(id)) return;
      g.addUndirectedEdgeWithKey(
        id,
        e.source,
        e.target,
        edgeAttributes(e, g.getNodeAttribute(e.source, "cluster"), g.getNodeAttribute(e.target, "cluster"))
      );
    });
    g.forEachNode((id, a) => g.mergeNodeAttributes(
      id,
      { degree: g.degree(id), size: nodeSize(g.degree(id), a.weak_assignment) }
    ));
    return g;
  }
  function reduceNode(id, a) {
    const sel = id === selectedNode;
    const evid = highlightedNodes === null || highlightedNodes.has(id);
    const color = evid ? a.baseColor : "rgba(110, 120, 140, 0.08)";
    return {
      ...a,
      color,
      size: nodeSize(a.degree || 0, a.weak_assignment, sel),
      borderColor: sel ? "#ffffff" : color,
      haloColor: sel ? "rgba(255, 255, 255, 0.22)" : color,
      zIndex: sel ? 100 : evid ? 20 : 1
    };
  }
  function reduceEdge(id, a) {
    if (a.hidden) return { ...a, hidden: true };
    if (id === selectedEdge)
      return { ...a, hidden: false, color: "#ffffff", size: 3.5, zIndex: 90 };
    if (highlightedEdges !== null) {
      if (!highlightedEdges.has(id)) return { ...a, hidden: true };
      return { ...a, hidden: false, color: "#ffb020", size: 2.2, zIndex: 40 };
    }
    return { ...a, color: a.baseColor, zIndex: 1 };
  }
  var BorderNodeProgram = createNodeBorderProgram({
    borders: [
      { size: { value: 4, mode: "pixels" }, color: { attribute: "haloColor" } },
      { size: { value: 2, mode: "pixels" }, color: { attribute: "borderColor" } },
      { size: { fill: true }, color: { attribute: "color" } }
    ]
  });
  var CurvedEdgeProgram = createEdgeCurveProgram({ curvatureAttribute: "curvature", defaultCurvature: 0.08 });
  function withMultisampledContexts(build) {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      if (type === "webgl2" || type === "webgl" || type === "experimental-webgl") {
        attributes = Object.assign({}, attributes, { antialias: true });
      }
      return original.call(this, type, attributes);
    };
    try {
      build();
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  }
  function createRenderer() {
    withMultisampledContexts(() => {
      renderer = new Sigma(graph, document.getElementById("cy"), {
        renderLabels: false,
        renderEdgeLabels: false,
        enableEdgeEvents: true,
        hideEdgesOnMove: false,
        hideLabelsOnMove: false,
        zIndex: true,
        stagePadding: 30,
        minCameraRatio: 5e-3,
        maxCameraRatio: 33.333,
        doubleClickZoomingRatio: 1.8,
        doubleClickZoomingDuration: 250,
        zoomToSizeRatioFunction: () => 1,
        itemSizesReference: "screen",
        minEdgeThickness: 1.1,
        defaultNodeType: "border",
        defaultEdgeType: USE_CURVED_EDGES ? "curve" : "line",
        nodeProgramClasses: { border: BorderNodeProgram },
        edgeProgramClasses: USE_CURVED_EDGES ? { curve: CurvedEdgeProgram } : {},
        nodeReducer: reduceNode,
        edgeReducer: reduceEdge
      });
    });
  }
  function refreshRenderer() {
    if (renderer) renderer.refresh();
  }
  function internalEdges(ids) {
    const result = /* @__PURE__ */ new Set();
    graph.forEachEdge((id, _a, s, t) => {
      if (ids.has(s) && ids.has(t)) result.add(id);
    });
    return result;
  }
  function applyHighlight(ids) {
    highlightedNodes = ids instanceof Set ? ids : new Set(ids);
    highlightedEdges = internalEdges(highlightedNodes);
    refreshRenderer();
  }
  function clearHighlight(render = true) {
    highlightedNodes = null;
    highlightedEdges = null;
    selectedEdge = null;
    if (render) refreshRenderer();
  }
  function restoreHighlight() {
    clearHighlight(false);
    if (selectedNode && graph.hasNode(selectedNode))
      applyHighlight(/* @__PURE__ */ new Set([selectedNode, ...graph.neighbors(selectedNode)]));
    else if (activeTopic !== null)
      applyHighlight(new Set(graph.filterNodes((_id, a) => a.cluster === activeTopic)));
    else refreshRenderer();
  }
  function deselectNode() {
    selectedNode = null;
    selectedEdge = null;
  }
  function resetSelection() {
    activeTopic = null;
    deselectNode();
    clearHighlight(false);
    hidePanels();
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
    refreshRenderer();
  }
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }
  function showInfo(id, boxId) {
    if (!graph.hasNode(id)) return;
    const n = graph.getNodeAttributes(id), box = document.getElementById(boxId);
    const meta = paperMeta[id] || {};
    const authors = (meta.authors || "").trim();
    const journal = (meta.journal || "").trim();
    const year = (meta.year || "").trim();
    const venue = [journal, year].filter(Boolean).join(" \xB7 ");
    const abstract = (meta.abstract || "").trim();
    box.querySelector(".panel-body").innerHTML = `
    <p class="paper-title">${escapeHtml(n.title)}</p>
    ${authors ? `<p class="authors">${escapeHtml(authors)}</p>` : ""}
    ${venue ? `<p class="journal">${escapeHtml(venue)}</p>` : ""}
    <div class="meta-row">
      <span class="topic-chip" style="background:${topicColor(n.cluster)}">${escapeHtml(topicLabels.get(n.cluster) || "\u2014")}</span>
      ${n.weak_assignment ? '<span class="weak-badge">weak assignment</span>' : ""}
      <span class="link-count">${graph.degree(id)} links</span>
    </div>
    <div class="abstract">${abstract ? escapeHtml(abstract) : '<span class="empty">No abstract available.</span>'}</div>
    <p class="zotero-link"><a href="zotero://select/library/items/${encodeURIComponent(id)}">Open in Zotero \u2197</a></p>`;
    box.classList.remove("hidden");
  }
  function hidePanels() {
    document.getElementById("info").classList.add("hidden");
    document.getElementById("info2").classList.add("hidden");
    selectedEdge = null;
  }
  function bindRendererEvents() {
    const tooltip = document.getElementById("tooltip");
    renderer.on("enterNode", ({ node, event }) => {
      tooltip.textContent = graph.getNodeAttribute(node, "title");
      tooltip.style.left = `${event.x + 14}px`;
      tooltip.style.top = `${event.y + 14}px`;
      tooltip.classList.remove("hidden");
    });
    renderer.on("leaveNode", () => tooltip.classList.add("hidden"));
    renderer.on("clickNode", ({ node }) => {
      activeTopic = null;
      document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
      selectedNode = node;
      selectedEdge = null;
      document.getElementById("info2").classList.add("hidden");
      applyHighlight(/* @__PURE__ */ new Set([node, ...graph.neighbors(node)]));
      showInfo(node, "info");
    });
    renderer.on("clickEdge", ({ edge }) => {
      if (!selectedNode || !graph.hasEdge(edge)) return;
      const [a, b] = graph.extremities(edge);
      if (a !== selectedNode && b !== selectedNode) return;
      selectedEdge = edge;
      refreshRenderer();
      showInfo(a === selectedNode ? b : a, "info2");
    });
    renderer.on("clickStage", resetSelection);
    renderer.getCamera().on("updated", updateTopicLabelPositions);
    renderer.on("resize", updateTopicLabelPositions);
    document.getElementById("cy").addEventListener("mousemove", (e) => {
      if (tooltip.classList.contains("hidden")) return;
      tooltip.style.left = `${e.offsetX + 14}px`;
      tooltip.style.top = `${e.offsetY + 14}px`;
    });
  }
  function updateVisibility() {
    graph.forEachNode((id, a) => {
      const hidden = hiddenTopics.has(a.cluster) || !showWeakAssignments && a.weak_assignment;
      if (a.hidden !== hidden) graph.setNodeAttribute(id, "hidden", hidden);
    });
    graph.forEachEdge((id, a, s, t) => {
      const hidden = graph.getNodeAttribute(s, "hidden") || graph.getNodeAttribute(t, "hidden");
      if (a.hidden !== hidden) graph.setEdgeAttribute(id, "hidden", hidden);
    });
    refreshRenderer();
  }
  function updateStatistics() {
    const topicCount = new Set(graph.mapNodes((_id, a) => a.cluster).filter((x) => x !== -1)).size;
    document.getElementById("stats").textContent = `${graph.order} papers \xB7 ${topicCount} topics \xB7 ${graph.size} links`;
  }
  function buildLegend(topics) {
    const ul = document.getElementById("legend");
    ul.innerHTML = "";
    const sortedTopics = [...topics].sort((a, b) => (a.id === -1) - (b.id === -1) || b.paper_count - a.paper_count);
    sortedTopics.forEach((t) => {
      const li = document.createElement("li");
      if (hiddenTopics.has(t.id)) li.classList.add("topic-hidden");
      li.innerHTML = `<input type="checkbox" class="vis" ${hiddenTopics.has(t.id) ? "" : "checked"}
      title="Show or hide this topic on the map" />
      <span class="swatch" style="background:${topicColor(t.id)}"></span>
      <span class="name">${escapeHtml(t.label)}</span><span class="count">${t.paper_count}</span>`;
      const checkbox = li.querySelector(".vis");
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) hiddenTopics.delete(t.id);
        else hiddenTopics.add(t.id);
        li.classList.toggle("topic-hidden", !e.target.checked);
        updateVisibility();
        updateTopicLabelPositions();
      });
      li.addEventListener("mouseenter", () => {
        if (!hiddenTopics.has(t.id))
          applyHighlight(new Set(graph.filterNodes((_id, a) => a.cluster === t.id)));
      });
      li.addEventListener("mouseleave", restoreHighlight);
      li.addEventListener("click", () => {
        const wasActive = activeTopic === t.id;
        deselectNode();
        hidePanels();
        document.querySelectorAll("#legend li").forEach((x) => x.classList.remove("active"));
        activeTopic = wasActive ? null : t.id;
        if (activeTopic !== null) li.classList.add("active");
        restoreHighlight();
      });
      ul.appendChild(li);
    });
  }
  function createTopicLabels(topics) {
    const container = document.getElementById("topic-labels");
    container.innerHTML = "";
    topicLabelElements = [];
    topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count).slice(0, MAX_TOPIC_LABELS).forEach((t) => {
      const nodes = graph.filterNodes((_id, a) => a.cluster === t.id);
      if (!nodes.length) return;
      let sx = 0, sy = 0;
      nodes.forEach((id) => {
        sx += graph.getNodeAttribute(id, "x");
        sy += graph.getNodeAttribute(id, "y");
      });
      const el = document.createElement("div");
      el.className = "topic-label";
      el.style.color = topicColor(t.id);
      el.innerHTML = `${escapeHtml((t.label.split(",")[0] || "").trim())}<span class="count">${t.paper_count}</span>`;
      container.appendChild(el);
      topicLabelElements.push({ id: t.id, el, x: sx / nodes.length, y: sy / nodes.length });
    });
    updateTopicLabelPositions();
  }
  function updateTopicLabelPositions() {
    if (!renderer) return;
    topicLabelElements.forEach((e) => {
      const hidden = hiddenTopics.has(e.id);
      e.el.style.display = hidden ? "none" : "block";
      if (!hidden) {
        const p = renderer.graphToViewport({ x: e.x, y: e.y });
        e.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
      }
    });
  }
  function bindControls() {
    document.getElementById("search").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      activeTopic = null;
      deselectNode();
      hidePanels();
      document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
      if (!q) return clearHighlight();
      const matches = new Set(graph.filterNodes((_id, a) => (a.title || "").toLowerCase().includes(q)));
      matches.size ? applyHighlight(matches) : clearHighlight();
    });
    document.getElementById("toggle-weak").addEventListener("change", (e) => {
      showWeakAssignments = e.target.checked;
      updateVisibility();
    });
    document.getElementById("btn-reset").addEventListener("click", () => {
      resetSelection();
      document.getElementById("search").value = "";
      renderer.getCamera().animatedReset({ duration: 250 });
    });
    document.querySelectorAll(".panel-close").forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.box === "info") hidePanels();
      else {
        document.getElementById("info2").classList.add("hidden");
        selectedEdge = null;
      }
      refreshRenderer();
    }));
    document.getElementById("btn-refresh").addEventListener("click", refreshData);
    document.getElementById("btn-zoom-in").addEventListener("click", () => renderer.getCamera().animatedZoom({ factor: 1.5, duration: 200 }));
    document.getElementById("btn-zoom-out").addEventListener("click", () => renderer.getCamera().animatedUnzoom({ factor: 1.5, duration: 200 }));
    document.getElementById("btn-zoom-fit").addEventListener("click", () => renderer.getCamera().animatedReset({ duration: 250 }));
  }
  function updateExistingColors(data) {
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    graph.forEachNode((id) => {
      const n = byId.get(id);
      if (!n) return;
      const c = topicColor(n.cluster, n.weak_assignment ? 0.5 : 1);
      graph.mergeNodeAttributes(id, {
        title: n.title,
        label: n.title,
        cluster: n.cluster,
        clusterLabel: n.cluster_label,
        weak_assignment: !!n.weak_assignment,
        baseColor: c,
        color: c,
        borderColor: c,
        haloColor: c
      });
    });
    graph.forEachEdge((id, _a, s, t) => {
      const c = edgeColor(graph.getNodeAttribute(s, "cluster"), graph.getNodeAttribute(t, "cluster"), 0.28);
      graph.mergeEdgeAttributes(id, { baseColor: c, color: c });
    });
  }
  async function refreshData() {
    try {
      const [data, topics] = await Promise.all([readJson(GRAPH_DATA_URL), readJson(CLUSTER_DATA_URL), loadMetadata()]);
      validateCoordinates(data.nodes);
      currentTopics = topics.topics;
      generateColors(currentTopics);
      const existing = new Set(graph.nodes());
      const newNodes = data.nodes.filter((n) => !existing.has(n.id)), newNodeIds = new Set(newNodes.map((n) => n.id));
      newNodes.forEach((n) => graph.addNode(n.id, nodeAttributes(n)));
      data.edges.forEach((e) => {
        if (!newNodeIds.has(e.source) && !newNodeIds.has(e.target)) return;
        const id = edgeId(e);
        if (graph.hasEdge(id) || !graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
        graph.addUndirectedEdgeWithKey(
          id,
          e.source,
          e.target,
          edgeAttributes(e, graph.getNodeAttribute(e.source, "cluster"), graph.getNodeAttribute(e.target, "cluster"))
        );
      });
      updateExistingColors(data);
      graph.forEachNode((id, a) => graph.mergeNodeAttributes(
        id,
        { degree: graph.degree(id), size: nodeSize(graph.degree(id), a.weak_assignment) }
      ));
      buildLegend(currentTopics);
      updateStatistics();
      updateVisibility();
      createTopicLabels(currentTopics);
      alert(newNodes.length ? `Added ${newNodes.length} new papers to the map.` : "No new papers to add. Colors and legend were refreshed.");
    } catch (err) {
      alert(`Refresh failed: ${err.message}`);
    }
  }
  async function start() {
    try {
      const [data, topics] = await Promise.all([readJson(GRAPH_DATA_URL), readJson(CLUSTER_DATA_URL), loadMetadata()]);
      currentTopics = topics.topics;
      generateColors(currentTopics);
      graph = buildGraph(data);
      createRenderer();
      bindRendererEvents();
      bindControls();
      buildLegend(currentTopics);
      updateStatistics();
      createTopicLabels(currentTopics);
      requestAnimationFrame(() => {
        renderer.resize();
        renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
        updateTopicLabelPositions();
        document.getElementById("loading").classList.add("hidden");
      });
    } catch (err) {
      document.getElementById("loading").textContent = `Could not load the map: ${err.message}`;
    }
  }
  start();
})();
