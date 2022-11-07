/* Copyright (C) 2018 Canonical Ltd. */

import atob from "atob";
import btoa from "btoa";
import { TextEncoder } from "util";
import macaroonlib from "macaroon";

import bakery from "../src/bakery";

jest.mock('macaroon', () => {
  const originalModule = jest.requireActual('macaroon');
  return {
    __esModule: true,
    default: originalModule,
  };
});

function setup(params = {}, storageParams = {}) {
  const sendRequest = jest.fn();
  const store = new bakery.InMemoryStore();
  storageParams.services = {
    charmstore: "http://example.com/charmstore",
    otherService: "http://example.com/other",
  };
  const storage = new bakery.BakeryStorage(store, storageParams);
  params.sendRequest = sendRequest;
  params.storage = storage;
  const bakeryInstance = new bakery.Bakery(params);
  return { bakeryInstance, sendRequest, storage, store };
}

beforeEach(() => {
  window.open = jest.fn();
});

afterEach(() => {
  window.open.mockClear();
});

describe("can send requests", () => {
  test("sets the method", () => {
    const { bakeryInstance, sendRequest } = setup();
    const url = "http://example.com/";
    const headers = { header: 42 };
    const callback = (response) => 42;
    let body = "content";
    let args;
    ["PATCH", "post", "PUT"].forEach((method) => {
      bakeryInstance.sendRequest(url, method, headers, body, callback);
      expect(sendRequest).toHaveBeenCalledTimes(1);
      args = sendRequest.mock.calls[0];
      expect(args[0]).toBe(url);
      expect(args[1]).toBe(method.toLowerCase());
      expect(args[2]).toStrictEqual({ header: 42, "Bakery-Protocol-Version": "2" });
      expect(args[3]).toBe(body);
      expect(typeof args[5]).toBe("function");
      sendRequest.mockClear();
    });
    ["GET", "delete"].forEach((method) => {
      bakeryInstance.sendRequest(url, method, headers, callback);
      expect(sendRequest).toHaveBeenCalledTimes(1);
      args = sendRequest.mock.calls[0];
      expect(args[0]).toBe(url);
      expect(args[1]).toBe(method.toLowerCase());
      expect(args[2]).toStrictEqual({ header: 42, "Bakery-Protocol-Version": "2" });
      expect(typeof args[5]).toBe("function");
      sendRequest.mockClear();
    });
  });

  test("properly handles cookie auth", () => {
    const { bakeryInstance, sendRequest } = setup();
    const assertWithCredentials = (method, path, expectedValue) => {
      sendRequest.mockClear();
      bakeryInstance.sendRequest("http://example.com" + path, method);
      expect(sendRequest.mock.calls[0][4]).toBe(expectedValue);
    };
    // When sending PUT requests to "/set-auth-cookie" endpoints, the
    // "withCredentials" attribute is properly set to true on the request.
    assertWithCredentials("PUT", "/set-auth-cookie", true);
    assertWithCredentials("PUT", "/foo/set-auth-cookie/bar", true);
    // For other endpoints the "withCredentials" attribute is set to false.
    assertWithCredentials("PUT", "/", false);
    assertWithCredentials("PUT", "/foo", false);
    // For other methods the "withCredentials" attribute is set to false.
    assertWithCredentials("POST", "/set-auth-cookie", false);
    assertWithCredentials("POST", "/foo/set-auth-cookie/bar", false);
    // In all other cases the "withCredentials" attribute is set to false.
    assertWithCredentials("POST", "/foo", false);
  });

  test("sets the headers", () => {
    const { bakeryInstance, sendRequest } = setup();
    bakeryInstance.sendRequest("http://example.com/", "GET", { foo: "bar" });
    const expectedHeaders = {
      "Bakery-Protocol-Version": "2",
      foo: "bar",
    };
    expect(sendRequest.mock.calls[0][2]).toStrictEqual(expectedHeaders);
  });

  test("sets the headers when the protocol version is set", () => {
    const { bakeryInstance, sendRequest } = setup({ protocolVersion: 1 });
    bakeryInstance.sendRequest("http://example.com/", "GET", { foo: "bar" });
    const expectedHeaders = {
      "Bakery-Protocol-Version": "1",
      foo: "bar",
    };
    expect(sendRequest.mock.calls[0][2]).toStrictEqual(expectedHeaders);
  });

  test("adds macaroons to the request", () => {
    const { bakeryInstance, sendRequest, store } = setup();
    // We add two "macaroons" into the store--one for the url we're setting,
    // one that we should not get.
    store.setItem("charmstore", "doctor");
    store.setItem("identity", "bad wolf");
    bakeryInstance.sendRequest("http://example.com/charmstore", "GET");
    const expectedHeaders = {
      "Bakery-Protocol-Version": "2",
      Macaroons: "doctor",
    };
    expect(sendRequest.mock.calls[0][2]).toStrictEqual(expectedHeaders);
  });

  test("wraps callbacks with discharge functionality", () => {
    const { bakeryInstance } = setup();
    const wrapper = jest.spyOn(bakeryInstance, "_wrapCallback");
    bakeryInstance.sendRequest("http://example.com/", "GET");
    expect(wrapper).toHaveBeenCalledTimes(1);
  });
});

describe("macaroon discharges", () => {
  test("discharges v2 macaroons", () => {
    const macaroonString = "I macaroon";
    const macaroon = {
      _exportAsJSONObjectV2: jest.fn().mockReturnValue(macaroonString),
    };
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest.spyOn(macaroonlib, "dischargeMacaroon").mockImplementation(dischargeMacaroon)
    const importMacaroonsSpy = jest.spyOn(macaroonlib, "importMacaroons").mockImplementation(jest.fn().mockReturnValue([macaroon]))
    const { bakeryInstance } = setup();
    const success = (discharges) => {
      expect(discharges).toStrictEqual([macaroonString]);
    };
    const failure = (msg) => {
      console.error(msg);
      fail("macaroon discharge failed");
    };
    bakeryInstance.discharge(macaroon, success, failure);
    expect(dischargeMacaroon).toHaveBeenCalledTimes(1);
    // Call the onOK method in macaroon.
    dischargeMacaroon.mock.calls[0][2]([macaroon]);
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("discharges v1 macaroons", () => {
    const macaroonString = "I macaroon";
    const macaroon = {
      _exportAsJSONObjectV1: jest.fn().mockReturnValue(macaroonString),
    };
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest.spyOn(macaroonlib, "dischargeMacaroon").mockImplementation(dischargeMacaroon)
    const importMacaroonsSpy = jest.spyOn(macaroonlib, "importMacaroons").mockImplementation(jest.fn().mockReturnValue([macaroon]))
    const { bakeryInstance } = setup({ protocolVersion: 1 });
    const success = (discharges) => {
      expect(discharges).toStrictEqual([macaroonString]);
    };
    const failure = (msg) => {
      console.error(msg);
      fail("macaroon discharge failed");
    };
    bakeryInstance.discharge(macaroon, success, failure);
    expect(dischargeMacaroon).toHaveBeenCalledTimes(1);
    // Call the onOK method in macaroon.
    dischargeMacaroon.mock.calls[0][2]([macaroon]);
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles failures discharging macaroons", () => {
    const macaroon = "I macaroon";
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest.spyOn(macaroonlib, "dischargeMacaroon").mockImplementation(dischargeMacaroon)
    const importMacaroonsSpy = jest.spyOn(macaroonlib, "importMacaroons").mockImplementation(jest.fn().mockReturnValue([]))
    const { bakeryInstance } = setup();
    const success = (discharges) => {
      fail("this should have failed");
    };
    const failure = (msg) => {
      expect(msg).toBe("broken");
    };
    bakeryInstance.discharge(macaroon, success, failure);
    expect(dischargeMacaroon).toHaveBeenCalledTimes(1);
    // Call the onOK method in macaroon.
    dischargeMacaroon.mock.calls[0][3]("broken");
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles third party discharge", () => {
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest.spyOn(macaroonlib, "dischargeMacaroon").mockImplementation(dischargeMacaroon)
    const importMacaroonsSpy = jest.spyOn(macaroonlib, "importMacaroons").mockImplementation(jest.fn().mockReturnValue([]))
    const { bakeryInstance, sendRequest } = setup();
    const condition = new TextEncoder().encode("this is a caveat"); // uint8array
    const success = (macaroons) => {};
    const failure = (err) => {};
    bakeryInstance._getThirdPartyDischarge(
      "http://example.com/",
      "http://example.com/identity",
      condition,
      success,
      failure
    );
    expect(sendRequest).toHaveBeenCalledTimes(1);
    const args = sendRequest.mock.calls[0];
    expect(args[0]).toBe("http://example.com/identity/discharge");
    expect(args[1]).toBe("post");
    expect(args[2]).toStrictEqual({
      "Bakery-Protocol-Version": "2",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(
      args[3]).toBe(
      "id=this%20is%20a%20caveat&location=http%3A%2F%2Fexample.com%2F"
    );
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles failure parsing third party maracoon data", () => {
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest.spyOn(macaroonlib, "dischargeMacaroon").mockImplementation(dischargeMacaroon)
    const importMacaroonsSpy = jest.spyOn(macaroonlib, "importMacaroons").mockImplementation(jest.fn().mockReturnValue([]))
    const { bakeryInstance, sendRequest } = setup();
    const condition = new TextEncoder().encode("this is a caveat"); // uint8array
    const success = (macaroons) => {};
    const failure = (err) => {
      expect(err).toBe("unable to parse macaroon.");
    };
    bakeryInstance._getThirdPartyDischarge(
      "http://example.com/",
      "http://example.com/identity",
      condition,
      success,
      failure
    );
    expect(sendRequest).toHaveBeenCalledTimes(1);
    const args = sendRequest.mock.calls[0];
    expect(args[0]).toBe("http://example.com/identity/discharge");
    expect(args[1]).toBe("post");
    expect(args[2]).toStrictEqual({
      "Bakery-Protocol-Version": "2",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(
      args[3]).toBe(
      "id=this%20is%20a%20caveat&location=http%3A%2F%2Fexample.com%2F"
    );
    // When a request fails the target has no responseText so this simulates
    // that type of failure.
    args[5]({
      target: {},
    });
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });
});

describe("wrapped callbacks", () => {

  const getTarget = (responseObj) => {
    if (!responseObj) {
      return { status: 200 };
    }
    const responseText = JSON.stringify(responseObj);
    return {
      status: 401,
      getResponseHeader: jest.fn().mockReturnValue("application/json"),
      responseText: responseText,
    };
  };

  test("handles requests normally if nothing is needed", () => {
    const cb = jest.fn();
    const { bakeryInstance } = setup();
    const wrappedCB = bakeryInstance._wrapCallback(
      "http://example.com",
      "POST",
      {},
      "body",
      cb
    );
    const target = getTarget();
    wrappedCB({ target });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("handles interaction if needed", () => {
    const { bakeryInstance } = setup();
    const interact = jest.spyOn(bakeryInstance, "_interact");
    const cb = jest.fn();
    const wrappedCB = bakeryInstance._wrapCallback(
      "http://example.com",
      "POST",
      {},
      "body",
      cb
    );
    const target = getTarget({
      Code: "interaction required",
      Info: {
        VisitURL: "http://example.com/identity",
        WaitURL: "http://example.com/identity/wait",
      },
    });
    wrappedCB({ target });
    expect(interact).toHaveBeenCalledTimes(1);
    const info = interact.mock.calls[0][0].Info;
    expect(info.VisitURL).toBe("http://example.com/identity");
    expect(info.WaitURL).toBe("http://example.com/identity/wait");
  });

  test("handles discharge if needed", () => {
    const { bakeryInstance } = setup();
    const dischargeStub = jest.spyOn(bakeryInstance, "discharge");
    const cb = jest.fn();
    const wrappedCB = bakeryInstance._wrapCallback(
      "http://example.com",
      "POST",
      {},
      "body",
      cb
    );
    const target = getTarget({
      Code: "macaroon discharge required",
      Info: { Macaroon: "macaroon" },
    });
    wrappedCB({ target });
    expect(dischargeStub).toHaveBeenCalledTimes(1);
    const args = dischargeStub.mock.calls[0];
    expect(args[0]).toBe("macaroon");
  });
});

describe("interact handling", () => {

  const getResponse = (fail) => {
    let response = {
      target: {
        status: 200,
        responseText: "",
        response: "",
      },
    };
    if (fail) {
      response.target.status = 0;
    }
    return response;
  };

  test("accepts a visit page method", () => {
    let { bakeryInstance } = setup({
      visitPage: () => {
        return "visits";
      },
    });
    expect(bakeryInstance._visitPage()).toBe("visits");
  });

  test("opens the visit page", () => {
    global.window = {
      open: jest.fn(),
    };
    const { bakeryInstance } = setup();
    const error = {
      Info: {
        VisitURL: "http://example.com",
      },
    };
    bakeryInstance._visitPage(error);
    expect(global.window.open).toHaveBeenCalledTimes(1);
    expect(global.window.open.mock.calls[0][0]).toBe(error.Info.VisitURL);
  });

  test("sets the content type correctly for the wait call", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      Info: {
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    bakeryInstance._interact(
      error,
      () => {},
      () => {}
    );
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(sendRequest.mock.calls[0][0]).toBe("http://example.com/wait");
    expect(sendRequest.mock.calls[0][2]["Content-Type"]).toBe("application/json");
  });

  test("handles retry", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      Info: {
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    let calls = 0;
    sendRequest.mockImplementation(
      (url, method, allHeaders, body, withCredentials, wrappedCallback) => {
        calls += 1;
        wrappedCallback(getResponse(calls === 1));
      }
    );
    bakeryInstance._interact(
      error,
      () => {},
      () => {}
    );
    expect(sendRequest).toHaveBeenCalledTimes(2);
  });

  test("limits retries", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      Info: {
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    sendRequest.mockImplementation(
      (url, method, allHeaders, body, withCredentials, wrappedCallback) => {
        wrappedCallback(getResponse(true));
      }
    );
    bakeryInstance._interact(
      error,
      () => {},
      () => {}
    );
    expect(sendRequest).toHaveBeenCalledTimes(6); // 6 is retrycount limit
  });

  test("handles errors", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      Info: {
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    sendRequest.mockImplementation(
      (url, method, allHeaders, body, withCredentials, wrappedCallback) => {
        wrappedCallback(getResponse(true));
      }
    );
    jest.spyOn(bakeryInstance, "_getError").mockReturnValue({ message: "bad wolf" });
    const ok = jest.fn();
    const fail = jest.fn();
    bakeryInstance._interact(error, ok, fail);
    expect(ok).toHaveBeenCalledTimes(0);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail.mock.calls[0][0]).toBe("cannot interact: bad wolf");
  });

  test("handles success", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      Info: {
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    sendRequest.mockImplementation(
      (url, method, allHeaders, body, withCredentials, wrappedCallback) => {
        wrappedCallback(getResponse());
      }
    );
    jest.spyOn(bakeryInstance, "_getError").mockReturnValue(null);
    const ok = jest.fn();
    const fail = jest.fn();
    bakeryInstance._interact(error, ok, fail);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(fail).toHaveBeenCalledTimes(0);
  });
});

describe("storage", () => {

  test("sets items", () => {
    const { storage, store } = setup();
    storage.set("http://example.com/charmstore", "foo", () => {});
    expect(store.getItem("charmstore")).toBe("foo");
  });

  test("gets items", () => {
    const { storage, store } = setup();
    store.setItem("charmstore", "foo");
    expect("foo").toBe(storage.get("http://example.com/charmstore"));
  });

  test("sets cookies for charmstore", () => {
    global.atob = atob;
    const cookieSet = jest.fn();
    let { storage } = setup({}, { charmstoreCookieSetter: cookieSet });
    const macaroonValue = btoa(JSON.stringify("macaroon"));
    storage.set("http://example.com/charmstore", macaroonValue, () => {});
    expect(cookieSet).toHaveBeenCalledTimes(1);
    expect(cookieSet.mock.calls[0][0]).toBe("macaroon");
  });

  describe("keys", () => {

    test("removes discharge suffix", () => {
      const { storage } = setup();
      expect(
        "http://example.com/identity").toBe(
        storage._getKey("http://example.com/identity/discharge")
      );
    });

    test("gets keys from services", () => {
      const { storage } = setup();
      expect("charmstore").toBe(storage._getKey("http://example.com/charmstore"));
    });

    test("does not modify other keys", () => {
      const { storage } = setup();
      expect("a-key").toBe(storage._getKey("a-key"));
    });
  });
});
