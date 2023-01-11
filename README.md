[![view on npm](https://img.shields.io/npm/v/@canonical/macaroon-bakery?logo=npm)](https://www.npmjs.org/package/@canonical/macaroon-bakery)
[![npm module downloads](https://img.shields.io/npm/dt/@canonical/macaroon-bakery.svg)](https://www.npmjs.org/package/@canonical/macaroon-bakery)

# bakeryjs

# API Reference

Javascript implementation of the Macaroon Bakery.

**Example**

```js
import { Bakery } from "@canonical/macaroon-bakery";
const bakery = new Bakery();

bakery.get(url, headers, callback);
```

- [bakeryjs](#module_bakeryjs)
  - [~Bakery](#module_bakeryjs..Bakery)
    - [new Bakery(config)](#new_module_bakeryjs..Bakery_new)
    - [.sendRequest(url, method, headers, body, callback)](#module_bakeryjs..Bakery+sendRequest) ⇒
    - [.get()](#module_bakeryjs..Bakery+get)
    - [.delete()](#module_bakeryjs..Bakery+delete)
    - [.post()](#module_bakeryjs..Bakery+post)
    - [.put()](#module_bakeryjs..Bakery+put)
    - [.patch()](#module_bakeryjs..Bakery+patch)
    - [.discharge(macaroon, onSuccess, onFailure)](#module_bakeryjs..Bakery+discharge)
  - [~BakeryStorage](#module_bakeryjs..BakeryStorage)
    - [new BakeryStorage(store, config)](#new_module_bakeryjs..BakeryStorage_new)
    - [.get(key)](#module_bakeryjs..BakeryStorage+get) ⇒
    - [.set(key, value, callback)](#module_bakeryjs..BakeryStorage+set)
    - [.clear()](#module_bakeryjs..BakeryStorage+clear)
  - [~InMemoryStore](#module_bakeryjs..InMemoryStore)
  - [~serialize(macaroons)](#module_bakeryjs..serialize) ⇒
  - [~deserialize(serialized)](#module_bakeryjs..deserialize) ⇒

<a name="module_bakeryjs..Bakery"></a>

### bakeryjs~Bakery

A macaroon bakery implementation.

The bakery implements the protocol used to acquire and discharge macaroons
over HTTP.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)

- [~Bakery](#module_bakeryjs..Bakery)
  - [new Bakery(config)](#new_module_bakeryjs..Bakery_new)
  - [.sendRequest(url, method, headers, body, callback)](#module_bakeryjs..Bakery+sendRequest) ⇒
  - [.get()](#module_bakeryjs..Bakery+get)
  - [.delete()](#module_bakeryjs..Bakery+delete)
  - [.post()](#module_bakeryjs..Bakery+post)
  - [.put()](#module_bakeryjs..Bakery+put)
  - [.patch()](#module_bakeryjs..Bakery+patch)
  - [.discharge(macaroon, onSuccess, onFailure)](#module_bakeryjs..Bakery+discharge)

<a name="new_module_bakeryjs..Bakery_new"></a>

#### new Bakery(config)

Initialize a macaroon bakery with the given parameters.

| Param                          | Description                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| config                         | optional config.                                                                                                                                                                                                   |
| config.onSuccess               | a function to be called when the request completes properly.                                                                                                                                                       |
| config.protocolVersion         | the macaroon protocol version that the bakery should use.                                                                                                                                                          |
| config.storage                 | the storage used to persist macaroons. It must implement the following interface:                                                                                                                                  |
| config.storage.get             | get(key) -> value.                                                                                                                                                                                                 |
| config.storage.set             | set(key, value, callback): the callback is called without arguments when the set operation has been performed. If not provided, it defaults to BakeryStorage using an in memory store.                             |
| config.visitPage               | the function used to visit the identity provider page when required, defaulting to opening a pop up window. It receives an error object.                                                                           |
| config.visitPage.Info          | an object containing relevant info for the visit handling.                                                                                                                                                         |
| config.visitPage.Info.WaitURL  | the url to wait on for IdM discharge.                                                                                                                                                                              |
| config.visitPage.Info.VisitURL | the url to visit to authenticate with the IdM.                                                                                                                                                                     |
| config.visitPage.jujugui       | an optional value specifying a method to use against idm to authenticate. Used in non interactive authentication scenarios.                                                                                        |
| config.sendRequest             | a function used to make XHR HTTP requests, with the following signature: func(path, method, headers, body, withCredentials, callback) -> xhr. By default an internal function is used. This is mostly for testing. |

<a name="module_bakeryjs..Bakery+sendRequest"></a>

#### bakery.sendRequest(url, method, headers, body, callback) ⇒

Send an HTTP request to the given URL with the given HTTP method, headers
and body. The given callback receives an error and a response when the
request is complete.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
**Returns**: the XHR instance.

| Param    | Description                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| url      | The URL to which to send the request.                                                                                                                  |
| method   | The HTTP method, like "get" or "POST".                                                                                                                 |
| headers  | Headers that must be included in the request. Note that bakery specific headers are automatically added internally.                                    |
| body     | The request body if it applies, or null.                                                                                                               |
| callback | A function called when the response is received from the remote URL. It receives a tuple (error, response). If the request succeeds the error is null. |

<a name="module_bakeryjs..Bakery+get"></a>

#### bakery.get()

Send an HTTP GET request to the given URL with the given headers.
The given callback receives an error and a response when the request is
complete.

      See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
<a name="module_bakeryjs..Bakery+delete"></a>

#### bakery.delete()

Send an HTTP DELETE request to the given URL with the given headers and
body. The given callback receives an error and a response when the
request is complete.

      See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
<a name="module_bakeryjs..Bakery+post"></a>

#### bakery.post()

Send an HTTP POST request to the given URL with the given headers and
body. The given callback receives an error and a response when the
request is complete.

      See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
<a name="module_bakeryjs..Bakery+put"></a>

#### bakery.put()

Send an HTTP PUT request to the given URL with the given headers and
body. The given callback receives an error and a response when the
request is complete.

      See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
<a name="module_bakeryjs..Bakery+patch"></a>

#### bakery.patch()

Send an HTTP PATCH request to the given URL with the given headers and
body. The given callback receives an error and a response when the
request is complete.

      See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
<a name="module_bakeryjs..Bakery+discharge"></a>

#### bakery.discharge(macaroon, onSuccess, onFailure)

Discharge the given macaroon. Acquire any third party discharges.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)

| Param     | Description                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------- |
| macaroon  | The decoded macaroon to be discharged.                                                          |
| onSuccess | The function to be called if the discharge succeeds. It receives the resulting macaroons array. |
| onFailure | The function to be called if the discharge fails. It receives an error message.                 |

<a name="module_bakeryjs..BakeryStorage"></a>

### bakeryjs~BakeryStorage

A storage for the macaroon bakery.

The storage is used to persist macaroons.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)

- [~BakeryStorage](#module_bakeryjs..BakeryStorage)
  - [new BakeryStorage(store, config)](#new_module_bakeryjs..BakeryStorage_new)
  - [.get(key)](#module_bakeryjs..BakeryStorage+get) ⇒
  - [.set(key, value, callback)](#module_bakeryjs..BakeryStorage+set)
  - [.clear()](#module_bakeryjs..BakeryStorage+clear)

<a name="new_module_bakeryjs..BakeryStorage_new"></a>

#### new BakeryStorage(store, config)

Initialize a bakery storage with the given underlaying store and params.

| Param                         | Description                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| store                         | A store object implement the following interface: - getItem(key) -> value; - setItem(key, value); - clear().                                                                            |
| config                        | Optional configuration.                                                                                                                                                                 |
| config.initial                | a map of key/value pairs that must be initially included in                                                                                                                             |
| config.services               | a map of service names (like "charmstore" or "terms") to the base URL of their corresponding API endpoints. This is used to simplify and reduce the URLs passed as keys to the storage. |
| config.charmstoreCookieSetter | a function that can be used to register macaroons to the charm store service. The function accepts a value and a callback, which receives an error and a response.                      |

<a name="module_bakeryjs..BakeryStorage+get"></a>

#### bakeryStorage.get(key) ⇒

Retrieve and return the value for the provided key.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  
**Returns**: The corresponding value, usually a serialized macaroon.

| Param | Description                     |
| ----- | ------------------------------- |
| key   | The storage key, usually a URL. |

<a name="module_bakeryjs..BakeryStorage+set"></a>

#### bakeryStorage.set(key, value, callback)

Store the given value in the given storage key.

      Call the callback when done.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)

| Param    | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| key      | The storage key, usually a URL.                                        |
| value    | The value, usually a serialized macaroon.                              |
| callback | A function called without arguments when the value is properly stored. |

<a name="module_bakeryjs..BakeryStorage+clear"></a>

#### bakeryStorage.clear()

Remove all key/value pairs from the storage.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  
<a name="module_bakeryjs..InMemoryStore"></a>

### bakeryjs~InMemoryStore

An in-memory store for the BakeryStorage.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)  
<a name="module_bakeryjs..serialize"></a>

### bakeryjs~serialize(macaroons) ⇒

Serialize the given macaroons.

**Kind**: inner method of [<code>bakeryjs</code>](#module_bakeryjs)  
**Returns**: The resulting serialized string.

| Param     | Description                     |
| --------- | ------------------------------- |
| macaroons | The macaroons to be serialized. |

<a name="module_bakeryjs..deserialize"></a>

### bakeryjs~deserialize(serialized) ⇒

De-serialize the given serialized macaroons.

**Kind**: inner method of [<code>bakeryjs</code>](#module_bakeryjs)  
**Returns**: The resulting macaroon slice.

| Param      | Description               |
| ---------- | ------------------------- |
| serialized | The serialized macaroons. |
