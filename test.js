/* Copyright (C) 2018 Canonical Ltd. */

'use strict';

const atob = require('atob');
const btoa = require('btoa');
const tap = require('tap');
const rewire = require('rewire');
const sinon = require('sinon');

const bakery = rewire('./index');

let TextEncoder;
if (typeof window === 'undefined') {
  // No window if it's node.js.
  const util = require('util');
  TextEncoder = util.TextEncoder;
} else {
  TextEncoder = window.TextEncoder;
}

global.window = {
  open: sinon.stub()
};

function setup(params={}, storageParams={}) {
  const sendRequest = sinon.stub();
  const store = new bakery.InMemoryStore();
  storageParams.services = {
    charmstore: 'http://example.com/charmstore',
    otherService: 'http://example.com/other'
  };
  const storage = new bakery.BakeryStorage(store, storageParams);
  params.sendRequest = sendRequest;
  params.storage = storage;
  const bakeryInstance = new bakery.Bakery(params);
  return {bakeryInstance, sendRequest, storage, store};
}

tap.test('can send requests', t => {
  t.autoend(true);

  t.test('sets the method', t => {
    const {bakeryInstance, sendRequest} = setup();
    const url = 'http://example.com/';
    const headers = {header: 42};
    const callback = response => 42;
    let body = 'content';
    let args;
    ['PATCH', 'post', 'PUT'].forEach(method => {
      bakeryInstance.sendRequest(url, method, headers, body, callback);
      t.equal(sendRequest.callCount, 1);
      args = sendRequest.args[0];
      t.equal(args[0], url);
      t.equal(args[1], method.toLowerCase());
      t.deepEqual(args[2], {header: 42, 'Bakery-Protocol-Version': 1});
      t.equal(args[3], body);
      t.type(args[5], 'function');
      sendRequest.reset();
    });
    ['GET', 'delete'].forEach(method => {
      bakeryInstance.sendRequest(url, method, headers, callback);
      t.equal(sendRequest.callCount, 1);
      args = sendRequest.args[0];
      t.equal(args[0], url);
      t.equal(args[1], method.toLowerCase());
      t.deepEqual(args[2], {header: 42, 'Bakery-Protocol-Version': 1});
      t.type(args[5], 'function');
      sendRequest.reset();
    });
    t.end();
  });

  t.test('properly handles cookie auth', t => {
    const {bakeryInstance, sendRequest} = setup();
    const assertWithCredentials = (method, path, expectedValue) => {
      sendRequest.reset();
      bakeryInstance.sendRequest('http://example.com' + path, method);
      t.equal(sendRequest.args[0][4], expectedValue, `${method} ${path}`);
    };
    // When sending PUT requests to "/set-auth-cookie" endpoints, the
    // "withCredentials" attribute is properly set to true on the request.
    assertWithCredentials('PUT', '/set-auth-cookie', true);
    assertWithCredentials('PUT', '/foo/set-auth-cookie/bar', true);
    // For other endpoints the "withCredentials" attribute is set to false.
    assertWithCredentials('PUT', '/', false);
    assertWithCredentials('PUT', '/foo', false);
    // For other methods the "withCredentials" attribute is set to false.
    assertWithCredentials('POST', '/set-auth-cookie', false);
    assertWithCredentials('POST', '/foo/set-auth-cookie/bar', false);
    // In all other cases the "withCredentials" attribute is set to false.
    assertWithCredentials('POST', '/foo', false);
    t.end();
  });

  t.test('sets the headers', t => {
    const {bakeryInstance, sendRequest} = setup();
    bakeryInstance.sendRequest('http://example.com/', 'GET', {'foo': 'bar'});
    const expectedHeaders = {
      'Bakery-Protocol-Version': 1,
      'foo': 'bar'
    };
    t.deepEqual(sendRequest.args[0][2], expectedHeaders);
    t.end();
  });

  t.test('adds macaroons to the request', t => {
    const {bakeryInstance, sendRequest, store} = setup();
    // We add two "macaroons" into the store--one for the url we're setting,
    // one that we should not get.
    store.setItem('charmstore', 'doctor');
    store.setItem('identity', 'bad wolf');
    bakeryInstance.sendRequest('http://example.com/charmstore', 'GET');
    const expectedHeaders = {
      'Bakery-Protocol-Version': 1,
      'Macaroons': 'doctor'
    };
    t.deepEqual(sendRequest.args[0][2], expectedHeaders);
    t.end();
  });

  t.test('wraps callbacks with discharge functionality', t => {
    const {bakeryInstance} = setup();
    const wrapper = sinon.stub(bakeryInstance, '_wrapCallback');
    bakeryInstance.sendRequest('http://example.com/', 'GET');
    t.equal(wrapper.callCount, 1);
    t.end();
  });

});

tap.test('macaroon discharges', t => {
  t.autoend(true);

  t.test('discharges macaroons', t => {
    const macaroonString = 'I macaroon';
    const macaroon = {_exportAsJSONObjectV1: sinon.stub().returns(macaroonString)};
    const dischargeMacaroon = sinon.stub();
    const stubReset = bakery.__set__('macaroonlib', {
      dischargeMacaroon,
      importMacaroons: sinon.stub().returns([macaroon])
    });
    const {bakeryInstance} = setup();
    const success = discharges => {
      t.deepEqual(discharges, [macaroonString]);
      stubReset();
      t.end();
    };
    const failure = msg => {
      console.error(msg);
      t.fail('macaroon discharge failed');
    };
    bakeryInstance.discharge(macaroon, success, failure);
    t.equal(dischargeMacaroon.callCount, 1, 'macaroonlib discharge not called');
    // Call the onOK method in macaroon.
    dischargeMacaroon.args[0][2]([macaroon]);
  });

  t.test('handles failures discharging macaroons', t => {
    const macaroon = 'I macaroon';
    const dischargeMacaroon = sinon.stub();
    const stubReset = bakery.__set__('macaroonlib', {
      dischargeMacaroon,
      importMacaroons: sinon.stub().returns([])
    });
    const {bakeryInstance} = setup();
    const success = discharges => {
      t.fail('this should have failed');
    };
    const failure = msg => {
      stubReset();
      t.equal(msg, 'broken');
      t.end();
    };
    bakeryInstance.discharge(macaroon, success, failure);
    t.equal(dischargeMacaroon.callCount, 1, 'macaroonlib discharge not called');
    // Call the onOK method in macaroon.
    dischargeMacaroon.args[0][3]('broken');
  });

  t.test('handles third party discharge', t => {
    const dischargeMacaroon = sinon.stub();
    const stubReset = bakery.__set__('macaroonlib', {
      dischargeMacaroon,
      importMacaroons: sinon.stub().returns([])
    });
    const {bakeryInstance, sendRequest} = setup();
    const condition = new TextEncoder().encode('this is a caveat'); // uint8array
    const success = macaroons => {};
    const failure = err => {};
    bakeryInstance._getThirdPartyDischarge(
      'http://example.com/',
      'http://example.com/identity',
      condition, success, failure);
    t.equal(sendRequest.callCount, 1);
    const args = sendRequest.args[0];
    t.equal(args[0], 'http://example.com/identity/discharge');
    t.equal(args[1], 'post');
    t.deepEqual(args[2], {
      'Bakery-Protocol-Version': 1,
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    t.equal(
      args[3],
      'id=this%20is%20a%20caveat&location=http%3A%2F%2Fexample.com%2F');
    stubReset();
    t.end();
  });

  t.test('handles failure parsing third party maracoon data', t => {
    const dischargeMacaroon = sinon.stub();
    const stubReset = bakery.__set__('macaroonlib', {
      dischargeMacaroon,
      importMacaroons: sinon.stub().returns([])
    });
    const {bakeryInstance, sendRequest} = setup();
    const condition = new TextEncoder().encode('this is a caveat'); // uint8array
    const success = macaroons => {};
    const failure = err => {
      t.equal(err, 'unable to parse macaroon.');
      stubReset();
      t.end();
    };
    bakeryInstance._getThirdPartyDischarge(
      'http://example.com/',
      'http://example.com/identity',
      condition, success, failure);
    t.equal(sendRequest.callCount, 1);
    const args = sendRequest.args[0];
    t.equal(args[0], 'http://example.com/identity/discharge');
    t.equal(args[1], 'post');
    t.deepEqual(args[2], {
      'Bakery-Protocol-Version': 1,
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    t.equal(
      args[3],
      'id=this%20is%20a%20caveat&location=http%3A%2F%2Fexample.com%2F');
    // When a request fails the target has no responseText so this simulates
    // that type of failure.
    args[5]({
      target: {}
    });
  });
});

tap.test('wrapped callbacks', t => {
  t.autoend(true);

  const getTarget = responseObj => {
    if (!responseObj) {
      return { status: 200 };
    }
    const responseText = JSON.stringify(responseObj);
    return {
      status: 401,
      getResponseHeader: sinon.stub().returns('application/json'),
      responseText: responseText
    };
  };

  t.test('handles requests normally if nothing is needed', t => {
    const cb = sinon.stub();
    const {bakeryInstance} = setup();
    const wrappedCB = bakeryInstance._wrapCallback(
      'http://example.com', 'POST', {}, 'body', cb);
    const target = getTarget();
    wrappedCB({ target });
    t.equal(cb.callCount, 1);
    t.end();
  });

  t.test('handles interaction if needed', t => {
    const {bakeryInstance} = setup();
    const interact = sinon.stub(bakeryInstance, '_interact');
    const cb = sinon.stub();
    const wrappedCB = bakeryInstance._wrapCallback(
      'http://example.com', 'POST', {}, 'body', cb);
    const target = getTarget({
      Code: 'interaction required',
      Info: {
        VisitURL: 'http://example.com/identity',
        WaitURL: 'http://example.com/identity/wait'
      }
    });
    wrappedCB({ target });
    t.equal(interact.callCount, 1);
    const info = interact.args[0][0].Info;
    t.equal(info.VisitURL, 'http://example.com/identity');
    t.equal(info.WaitURL, 'http://example.com/identity/wait');
    t.end();
  });

  t.test('handles discharge if needed', t => {
    const {bakeryInstance} = setup();
    const dischargeStub = sinon.stub(bakeryInstance, 'discharge');
    const cb = sinon.stub();
    const wrappedCB = bakeryInstance._wrapCallback(
      'http://example.com', 'POST', {}, 'body', cb);
    const target = getTarget({
      Code: 'macaroon discharge required',
      Info: { Macaroon: 'macaroon' }
    });
    wrappedCB({ target });
    t.equal(dischargeStub.callCount, 1);
    const args = dischargeStub.args[0];
    t.equal(args[0], 'macaroon');
    t.end();
  });

});

tap.test('interact handling', t => {
  t.autoend(true);

  const getResponse = fail => {
    let response = {
      target: {
        status: 200,
        responseText: '',
        response: ''
      }
    };
    if (fail) {
      response.target.status = 0;
    }
    return response;
  };

  t.test('accepts a visit page method', t => {
    let {bakeryInstance} = setup({
      visitPage: () => { return 'visits'; }
    });
    t.equal(bakeryInstance._visitPage(), 'visits');
    t.end();
  });

  t.test('opens the visit page', t => {
    global.window = {
      open: sinon.stub()
    };
    const {bakeryInstance} = setup();
    const error = {
      Info: {
        VisitURL: 'http://example.com'
      }
    };
    bakeryInstance._visitPage(error);
    t.equal(global.window.open.callCount, 1);
    t.equal(global.window.open.args[0][0], error.Info.VisitURL);
    t.end();
  });

  t.test('sets the content type correctly for the wait call', t => {
    const {bakeryInstance, sendRequest} = setup();
    const error = {
      Info: {
        WaitURL: 'http://example.com/wait',
        VisitURL: 'http://example.com/visit'
      }
    };
    bakeryInstance._interact(error, ()=>{}, ()=>{});
    t.equal(sendRequest.callCount, 1);
    t.equal(
      sendRequest.args[0][0], 'http://example.com/wait');
    t.equal(
      sendRequest.args[0][2]['Content-Type'], 'application/json');
    t.end();
  });

  t.test('handles retry', t => {
    const {bakeryInstance, sendRequest} = setup();
    const error = {
      Info: {
        WaitURL: 'http://example.com/wait',
        VisitURL: 'http://example.com/visit'
      }
    };
    sendRequest
      .onFirstCall().callsArgWith(5, getResponse(true))
      .onSecondCall().callsArgWith(5, getResponse(false));
    bakeryInstance._interact(error, ()=>{}, ()=>{});
    t.equal(sendRequest.callCount, 2);
    t.end();
  });

  t.test('limits retries', t => {
    const {bakeryInstance, sendRequest} = setup();
    const error = {
      Info: {
        WaitURL: 'http://example.com/wait',
        VisitURL: 'http://example.com/visit'
      }
    };
    sendRequest.callsArgWith(5, getResponse(true));
    bakeryInstance._interact(error, ()=>{}, ()=>{});
    t.equal(sendRequest.callCount, 6); // 6 is retrycount limit
    t.end();
  });

  t.test('handles errors', t => {
    const {bakeryInstance, sendRequest} = setup();
    const error = {
      Info: {
        WaitURL: 'http://example.com/wait',
        VisitURL: 'http://example.com/visit'
      }
    };
    sendRequest.callsArgWith(5, getResponse(true));
    sinon.stub(bakeryInstance, '_getError').returns({'message': 'bad wolf'});
    const ok = sinon.stub();
    const fail = sinon.stub();
    bakeryInstance._interact(error, ok, fail);
    t.equal(ok.callCount, 0);
    t.equal(fail.callCount, 1);
    t.equal(fail.args[0][0], 'cannot interact: bad wolf');
    t.end();
  });

  t.test('handles success', t => {
    const {bakeryInstance, sendRequest} = setup();
    const error = {
      Info: {
        WaitURL: 'http://example.com/wait',
        VisitURL: 'http://example.com/visit'
      }
    };
    sendRequest.callsArgWith(5, getResponse(true));
    sinon.stub(bakeryInstance, '_getError').returns(null);
    const ok = sinon.stub();
    const fail = sinon.stub();
    bakeryInstance._interact(error, ok, fail);
    t.equal(ok.callCount, 1);
    t.equal(fail.callCount, 0);
    t.end();
  });
});

tap.test('storage', t => {
  t.autoend(true);

  t.test('sets items', t => {
    const {storage, store} = setup();
    storage.set('http://example.com/charmstore', 'foo', () => {});
    t.equal(store.getItem('charmstore'), 'foo');
    t.end();
  });

  t.test('gets items', t => {
    const {storage, store} = setup();
    store.setItem('charmstore', 'foo');
    t.equal('foo', storage.get('http://example.com/charmstore'));
    t.end();
  });

  t.test('sets cookies for charmstore', t => {
    global.atob = atob;
    const cookieSet = sinon.stub();
    let {storage} = setup({}, {charmstoreCookieSetter: cookieSet});
    const macaroonValue = btoa(JSON.stringify('macaroon'));
    storage.set('http://example.com/charmstore', macaroonValue, () => {});
    t.equal(cookieSet.callCount, 1);
    t.equal(cookieSet.args[0][0], 'macaroon');
    t.end();
  });

  t.test('keys', t => {
    t.autoend(true);

    t.test('removes discharge suffix', t => {
      const {storage} = setup();
      t.equal(
        'http://example.com/identity',
        storage._getKey('http://example.com/identity/discharge'));
      t.end();
    });

    t.test('gets keys from services', t => {
      const {storage} = setup();
      t.equal(
        'charmstore',
        storage._getKey('http://example.com/charmstore'));
      t.end();
    });

    t.test('does not modify other keys', t => {
      const {storage} = setup();
      t.equal('a-key', storage._getKey('a-key'));
      t.end();
    });
  });

});
