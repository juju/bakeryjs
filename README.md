[![view on npm](http://img.shields.io/npm/v/@canonical/macaroon-bakery)](https://www.npmjs.org/package/@canonical/macaroon-bakery)
[![npm module downloads](http://img.shields.io/npm/dt/@canonical/macaroon-bakery.svg)](https://www.npmjs.org/package/@canonical/macaroon-bakery)

# bakeryjs

# API Reference
bakeryjs.

**Example**  
```js
import { Bakery } from "@canonical/macaroon-bakery";
const bakery = new Bakery();

bakery.get(url, headers, callback)
```

* [bakeryjs](#module_bakeryjs)
    * [~Bakery](#module_bakeryjs..Bakery)
        * [new Bakery(params)](#new_module_bakeryjs..Bakery_new)
        * [.sendRequest(url, method, headers, body, callback)](#module_bakeryjs..Bakery+sendRequest) ⇒ <code>Object</code>
        * [.get()](#module_bakeryjs..Bakery+get)
        * [.delete()](#module_bakeryjs..Bakery+delete)
        * [.post()](#module_bakeryjs..Bakery+post)
        * [.put()](#module_bakeryjs..Bakery+put)
        * [.patch()](#module_bakeryjs..Bakery+patch)
        * [.discharge(macaroon, onSuccess, onFailure)](#module_bakeryjs..Bakery+discharge)
        * [._wrapCallback()](#module_bakeryjs..Bakery+_wrapCallback) ⇒ <code>function</code>
        * [._getThirdPartyDischarge(location, thirdPartyLocation, condition, onSuccess, onFailure)](#module_bakeryjs..Bakery+_getThirdPartyDischarge)
        * [._interact(visitURL, waitURL, onSuccess, onFailure)](#module_bakeryjs..Bakery+_interact)
        * [._getError(target)](#module_bakeryjs..Bakery+_getError) ⇒ <code>Object</code> \| <code>String</code>
        * [._getErrorMessage(jsonResponse)](#module_bakeryjs..Bakery+_getErrorMessage) ⇒ <code>String</code>
    * [~BakeryStorage](#module_bakeryjs..BakeryStorage)
        * [new BakeryStorage(store, params)](#new_module_bakeryjs..BakeryStorage_new)
        * [.get(key)](#module_bakeryjs..BakeryStorage+get) ⇒ <code>String</code>
        * [.set(key, value, callback)](#module_bakeryjs..BakeryStorage+set)
        * [.clear()](#module_bakeryjs..BakeryStorage+clear)
        * [._getKey(key)](#module_bakeryjs..BakeryStorage+_getKey) ⇒ <code>String</code>
    * [~InMemoryStore](#module_bakeryjs..InMemoryStore)
    * [~serialize(macaroons)](#module_bakeryjs..serialize) ⇒ <code>string</code>
    * [~deserialize(serialized)](#module_bakeryjs..deserialize) ⇒ <code>Array</code>
    * [~_request(path, method, headers, body, withCredentials, callback)](#module_bakeryjs.._request) ⇒ <code>Object</code>

<a name="module_bakeryjs..Bakery"></a>

### bakeryjs~Bakery
A macaroon bakery implementation.

  The bakery implements the protocol used to acquire and discharge macaroons
  over HTTP.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)  

* [~Bakery](#module_bakeryjs..Bakery)
    * [new Bakery(params)](#new_module_bakeryjs..Bakery_new)
    * [.sendRequest(url, method, headers, body, callback)](#module_bakeryjs..Bakery+sendRequest) ⇒ <code>Object</code>
    * [.get()](#module_bakeryjs..Bakery+get)
    * [.delete()](#module_bakeryjs..Bakery+delete)
    * [.post()](#module_bakeryjs..Bakery+post)
    * [.put()](#module_bakeryjs..Bakery+put)
    * [.patch()](#module_bakeryjs..Bakery+patch)
    * [.discharge(macaroon, onSuccess, onFailure)](#module_bakeryjs..Bakery+discharge)
    * [._wrapCallback()](#module_bakeryjs..Bakery+_wrapCallback) ⇒ <code>function</code>
    * [._getThirdPartyDischarge(location, thirdPartyLocation, condition, onSuccess, onFailure)](#module_bakeryjs..Bakery+_getThirdPartyDischarge)
    * [._interact(visitURL, waitURL, onSuccess, onFailure)](#module_bakeryjs..Bakery+_interact)
    * [._getError(target)](#module_bakeryjs..Bakery+_getError) ⇒ <code>Object</code> \| <code>String</code>
    * [._getErrorMessage(jsonResponse)](#module_bakeryjs..Bakery+_getErrorMessage) ⇒ <code>String</code>

<a name="new_module_bakeryjs..Bakery_new"></a>

#### new Bakery(params)
Initialize a macaroon bakery with the given parameters.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Optional parameters including:       - onSuccess: a function to be called when the request completes         properly. It defaults to a no-op function.       - storage: the storage used to persist macaroons. It must implement the         following interface:         - get(key) -> value;         - set(key, value, callback): the callback is called without arguments           when the set operation has been performed.         If not provided, it defaults to BakeryStorage using an in memory store.       - visitPage: the function used to visit the identity provider page when         required, defaulting to opening a pop up window. It receives an         error object containing:           - Info: an object containing relevant info for the visit handling:             - WaitURL: the url to wait on for IdM discharge             - VisitURL: the url to visit to authenticate with the IdM           - jujugui: an optional value specifying a method to use against             idm to authenticate. Used in non interactive authentication             scenarios.       - sendRequest: a function used to make XHR HTTP requests, with the         following signature:         func(path, method, headers, body, withCredentials, callback) -> xhr.         By default an internal function is used. This is mostly for testing. |

<a name="module_bakeryjs..Bakery+sendRequest"></a>

#### bakery.sendRequest(url, method, headers, body, callback) ⇒ <code>Object</code>
Send an HTTP request to the given URL with the given HTTP method, headers
    and body. The given callback receives an error and a response when the
    request is complete.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
**Returns**: <code>Object</code> - the XHR instance.  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | The URL to which to send the request. |
| method | <code>String</code> | The HTTP method, like "get" or "POST". |
| headers | <code>Object</code> | Headers that must be included in the request.       Note that bakery specific headers are automatically added internally. |
| body | <code>String</code> | The request body if it applies, or null. |
| callback | <code>function</code> | A function called when the response is       received from the remote URL. It receives a tuple (error, response).       If the request succeeds the error is null. |

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

| Param | Type | Description |
| --- | --- | --- |
| macaroon | <code>Object</code> | The decoded macaroon to be discharged. |
| onSuccess | <code>function</code> | The function to be called if the       discharge succeeds. It receives the resulting macaroons array. |
| onFailure | <code>function</code> | The function to be called if the       discharge fails. It receives an error message. |

<a name="module_bakeryjs..Bakery+_wrapCallback"></a>

#### bakery.\_wrapCallback() ⇒ <code>function</code>
Wrap the given callback function so that "discharge required" and
    "interaction required" errors in the response are internally handled.

    See the "sendRequest" method above for a description of the parameters.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
**Returns**: <code>function</code> - A callable accepting an HTTP response.  
<a name="module_bakeryjs..Bakery+_getThirdPartyDischarge"></a>

#### bakery.\_getThirdPartyDischarge(location, thirdPartyLocation, condition, onSuccess, onFailure)
Obtain a discharge macaroon for the given third party location.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  

| Param | Type | Description |
| --- | --- | --- |
| location | <code>String</code> | The origin location. |
| thirdPartyLocation | <code>String</code> | The third party location where to       discharge. |
| condition | <code>Uint8Array</code> | The caveat to be discharged. |
| onSuccess | <code>function</code> | A function that will be called with the       discharge macaroon when the acquisition is successfully completed. |
| onFailure | <code>function</code> | A function that will be called with an error       message when the third party discharge fails. |

<a name="module_bakeryjs..Bakery+_interact"></a>

#### bakery.\_interact(visitURL, waitURL, onSuccess, onFailure)
Interact to be able to acquire authentication macaroons.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  

| Param | Type | Description |
| --- | --- | --- |
| visitURL | <code>String</code> | The URL that must be visited to authenticate. |
| waitURL | <code>String</code> | The URL where to wait for the authentication to       be completed, and that will eventually provide the authentication       macaroons and the discharge token. |
| onSuccess | <code>function</code> | The function that will be called with the       macaroon when the acquisition succeeds. |
| onFailure | <code>function</code> | The function that will be called with an       error string when the acquisition fails. |

<a name="module_bakeryjs..Bakery+_getError"></a>

#### bakery.\_getError(target) ⇒ <code>Object</code> \| <code>String</code>
Return any error present in the given response.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
**Returns**: <code>Object</code> \| <code>String</code> - The error as found in the request.  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>Object</code> | The XHR response.target. |

<a name="module_bakeryjs..Bakery+_getErrorMessage"></a>

#### bakery.\_getErrorMessage(jsonResponse) ⇒ <code>String</code>
Try to parse the given JSON decoded response in order to retrieve a
    human friendly error.

**Kind**: instance method of [<code>Bakery</code>](#module_bakeryjs..Bakery)  
**Returns**: <code>String</code> - The error message.  

| Param | Type | Description |
| --- | --- | --- |
| jsonResponse | <code>Object</code> | The JSON decoded response text. |

<a name="module_bakeryjs..BakeryStorage"></a>

### bakeryjs~BakeryStorage
A storage for the macaroon bakery.

  The storage is used to persist macaroons.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)  

* [~BakeryStorage](#module_bakeryjs..BakeryStorage)
    * [new BakeryStorage(store, params)](#new_module_bakeryjs..BakeryStorage_new)
    * [.get(key)](#module_bakeryjs..BakeryStorage+get) ⇒ <code>String</code>
    * [.set(key, value, callback)](#module_bakeryjs..BakeryStorage+set)
    * [.clear()](#module_bakeryjs..BakeryStorage+clear)
    * [._getKey(key)](#module_bakeryjs..BakeryStorage+_getKey) ⇒ <code>String</code>

<a name="new_module_bakeryjs..BakeryStorage_new"></a>

#### new BakeryStorage(store, params)
Initialize a bakery storage with the given underlaying store and params.


| Param | Type | Description |
| --- | --- | --- |
| store | <code>Object</code> | A store object implement the following interface:       - getItem(key) -> value;       - setItem(key, value);       - clear(). |
| params | <code>Object</code> | Optional parameters including:       - initial: a map of key/value pairs that must be initially included in         the storage;       - services: a map of service names (like "charmstore" or "terms") to         the base URL of their corresponding API endpoints. This is used to         simplify and reduce the URLs passed as keys to the storage;       - charmstoreCookieSetter: a function that can be used to register         macaroons to the charm store service. The function accepts a value         and a callback, which receives an error and a response. |

<a name="module_bakeryjs..BakeryStorage+get"></a>

#### bakeryStorage.get(key) ⇒ <code>String</code>
Retrieve and return the value for the provided key.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  
**Returns**: <code>String</code> - The corresponding value, usually a serialized macaroon.  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>String</code> | The storage key, usually a URL. |

<a name="module_bakeryjs..BakeryStorage+set"></a>

#### bakeryStorage.set(key, value, callback)
Store the given value in the given storage key.

    Call the callback when done.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>String</code> | The storage key, usually a URL. |
| value | <code>String</code> | The value, usually a serialized macaroon. |
| callback | <code>function</code> | A function called without arguments when the       value is properly stored. |

<a name="module_bakeryjs..BakeryStorage+clear"></a>

#### bakeryStorage.clear()
Remove all key/value pairs from the storage.

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  
<a name="module_bakeryjs..BakeryStorage+_getKey"></a>

#### bakeryStorage.\_getKey(key) ⇒ <code>String</code>
Turn the given key (usually a URL) into a more friendly service name,
    when possible. This also means that different endpoints of the same
    service are reduced to the same service name key, which is ok given that
    all our services use the same macaroon root id for all endpoints.

    If the given key is not a URL, then return it untouched, so that it is
    still possible to set arbitrary keys in the storage. For instance, it is
    surely useful to be able to set or retrieve a service macaroon by using
    its corresponding service name (and not necessarily a URL).

**Kind**: instance method of [<code>BakeryStorage</code>](#module_bakeryjs..BakeryStorage)  
**Returns**: <code>String</code> - A possibly simplified/reduced key.  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>String</code> | The original key. |

<a name="module_bakeryjs..InMemoryStore"></a>

### bakeryjs~InMemoryStore
An in-memory store for the BakeryStorage.

**Kind**: inner class of [<code>bakeryjs</code>](#module_bakeryjs)  
<a name="module_bakeryjs..serialize"></a>

### bakeryjs~serialize(macaroons) ⇒ <code>string</code>
Serialize the given macaroons.

**Kind**: inner method of [<code>bakeryjs</code>](#module_bakeryjs)  
**Returns**: <code>string</code> - The resulting serialized string.  

| Param | Type | Description |
| --- | --- | --- |
| macaroons | <code>Array</code> | The macaroons to be serialized. |

<a name="module_bakeryjs..deserialize"></a>

### bakeryjs~deserialize(serialized) ⇒ <code>Array</code>
De-serialize the given serialized macaroons.

**Kind**: inner method of [<code>bakeryjs</code>](#module_bakeryjs)  
**Returns**: <code>Array</code> - The resulting macaroon slice.  

| Param | Type | Description |
| --- | --- | --- |
| serialized | <code>string</code> | The serialized macaroons. |

<a name="module_bakeryjs.._request"></a>

### bakeryjs~\_request(path, method, headers, body, withCredentials, callback) ⇒ <code>Object</code>
Create, set up and send an asynchronous request to the given path/URL with
  the given method and parameters.

**Kind**: inner method of [<code>bakeryjs</code>](#module_bakeryjs)  
**Returns**: <code>Object</code> - The xhr asynchronous request instance.  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | The remote target path/URL. |
| method | <code>String</code> | The request method (e.g. "GET" or "POST"). |
| headers | <code>Object</code> | Additional request headers as key/value pairs. |
| body | <code>Object</code> | The data to send as a file object, a string or in     general as an ArrayBufferView/Blob object. |
| withCredentials | <code>Boolean</code> | Whether to include credentials. |
| callback | <code>function</code> | The load event callback. |


* * *
