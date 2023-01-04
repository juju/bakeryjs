/* eslint-disable no-undef */
/* Copyright (C) 2018 Canonical Ltd. */

import atob from "atob";
import btoa from "btoa";
import macaroonlib, { newMacaroon } from "macaroon";
import { TextEncoder } from "util";
import MockProgressEvent from "xhr-mock/lib/MockProgressEvent";
import MockXMLHttpRequest from "xhr-mock/lib/MockXMLHttpRequest";
import { Error as MacaroonError, MacaroonObject } from "./macaroon";

import {
  Bakery,
  BakeryStorage,
  InMemoryStore,
  VisitPageInfo,
} from "../src/bakery";

const mockError: MacaroonError<VisitPageInfo> = {
  Code: "",
  Info: {
    WaitURL: "",
    VisitURL: "",
    Macaroon: "",
    MacaroonPath: "",
    CookieNameSuffix: "",
    InteractionMethods: "",
    LegacyVisitURL: "",
    LegacyWaitURL: "",
  },
  Message: "",
};

jest.mock("macaroon", () => {
  const actual = jest.requireActual("macaroon");
  return {
    __esModule: true,
    ...actual,
    default: actual,
  };
});

type BakeryInstance = InstanceType<typeof Bakery>;
type BakeryStorageInstance = InstanceType<typeof BakeryStorage>;

function setup(
  params: {
    onSuccess?: BakeryInstance["_onSuccess"];
    sendRequest?: BakeryInstance["_sendRequest"];
    storage?: BakeryInstance["storage"];
    visitPage?: BakeryInstance["_visitPage"];
    protocolVersion?: BakeryInstance["_protocolVersion"];
  } = {},
  storageParams: {
    charmstoreCookieSetter?: BakeryStorageInstance["_charmstoreCookieSetter"];
    services?: BakeryStorageInstance["_services"];
  } = {}
) {
  const sendRequest = jest.fn();
  const store = new InMemoryStore();
  const bakeryStorage = {
    services: {
      charmstore: "http://example.com/charmstore",
      otherService: "http://example.com/other",
    },
    ...storageParams,
  };
  const storage = new BakeryStorage(store, bakeryStorage);
  const bakeryParams = {
    sendRequest,
    storage,
    ...params,
  };
  const bakeryInstance = new Bakery(bakeryParams);
  return { bakeryInstance, sendRequest, storage, store };
}

let windowOpen: jest.SpyInstance;

beforeEach(() => {
  windowOpen = jest.spyOn(window, "open");
  windowOpen.mockImplementation(jest.fn());
});

afterEach(() => {
  windowOpen.mockClear();
});

describe("can send requests", () => {
  test("sets the method", () => {
    const { bakeryInstance, sendRequest } = setup();
    const url = "http://example.com/";
    const headers = { header: "42" };
    const callback = () => 42;
    const body = "content";
    let args;
    ["PATCH", "post", "PUT"].forEach((method) => {
      bakeryInstance.sendRequest(url, method, headers, body, callback);
      expect(sendRequest).toHaveBeenCalledTimes(1);
      args = sendRequest.mock.calls[0];
      expect(args[0]).toBe(url);
      expect(args[1]).toBe(method.toLowerCase());
      expect(args[2]).toStrictEqual({
        header: "42",
        "Bakery-Protocol-Version": "2",
      });
      expect(args[3]).toBe(body);
      expect(typeof args[5]).toBe("function");
      sendRequest.mockClear();
    });
    ["GET", "delete"].forEach((method) => {
      bakeryInstance.sendRequest(url, method, headers, null, callback);
      expect(sendRequest).toHaveBeenCalledTimes(1);
      args = sendRequest.mock.calls[0];
      expect(args[0]).toBe(url);
      expect(args[1]).toBe(method.toLowerCase());
      expect(args[2]).toStrictEqual({
        header: "42",
        "Bakery-Protocol-Version": "2",
      });
      expect(typeof args[5]).toBe("function");
      sendRequest.mockClear();
    });
  });

  test("properly handles cookie auth", () => {
    const { bakeryInstance, sendRequest } = setup();
    const assertWithCredentials = (
      method: string,
      path: string,
      expectedValue: boolean
    ) => {
      sendRequest.mockClear();
      bakeryInstance.sendRequest(
        "http://example.com" + path,
        method,
        {},
        null,
        jest.fn()
      );
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
    bakeryInstance.sendRequest(
      "http://example.com/",
      "GET",
      { foo: "bar" },
      null,
      jest.fn()
    );
    const expectedHeaders = {
      "Bakery-Protocol-Version": "2",
      foo: "bar",
    };
    expect(sendRequest.mock.calls[0][2]).toStrictEqual(expectedHeaders);
  });

  test("sets the headers when the protocol version is set", () => {
    const { bakeryInstance, sendRequest } = setup({ protocolVersion: 1 });
    bakeryInstance.sendRequest(
      "http://example.com/",
      "GET",
      { foo: "bar" },
      null,
      jest.fn()
    );
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
    bakeryInstance.sendRequest(
      "http://example.com/charmstore",
      "GET",
      {},
      null,
      jest.fn()
    );
    const expectedHeaders = {
      "Bakery-Protocol-Version": "2",
      Macaroons: "doctor",
    };
    expect(sendRequest.mock.calls[0][2]).toStrictEqual(expectedHeaders);
  });

  test("wraps callbacks with discharge functionality", () => {
    const { bakeryInstance } = setup();
    const wrapper = jest.spyOn(bakeryInstance, "_wrapCallback");
    bakeryInstance.sendRequest(
      "http://example.com/",
      "GET",
      {},
      null,
      jest.fn()
    );
    expect(wrapper).toHaveBeenCalledTimes(1);
  });
});

describe("macaroon discharges", () => {
  test("discharges v2 macaroons", () => {
    const macaroonV2 = newMacaroon({
      identifier: new Uint8Array(),
      location: "",
      rootKey: new Uint8Array(),
      version: 2,
    });
    let called = false;
    const macaroonJSON = macaroonV2.exportJSON();
    const dischargeMacaroonSpy = jest
      .spyOn(macaroonlib, "dischargeMacaroon")
      .mockImplementation((_a, b, c, _d) => {
        b("", "", new Uint8Array(), jest.fn(), jest.fn());
        // Call the onOK method in macaroon.
        c([macaroonV2]);
        called = true;
      });
    const importMacaroonsSpy = jest
      .spyOn(macaroonlib, "importMacaroons")
      .mockImplementation(jest.fn().mockReturnValue([macaroonJSON]));
    const { bakeryInstance } = setup();
    const success = (discharges: MacaroonObject[]) => {
      expect(discharges).toStrictEqual([macaroonV2.exportJSON()]);
    };
    const failure = (msg: string | MacaroonError) => {
      console.error(msg);
      fail("macaroon discharge failed");
    };
    bakeryInstance.discharge(macaroonJSON, success, failure);
    expect(called).toBe(true);
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("discharges v1 macaroons", () => {
    const macaroonV1 = newMacaroon({
      identifier: new Uint8Array(),
      location: "",
      rootKey: new Uint8Array(),
      version: 1,
    });
    let called = false;
    const macaroonJSON = macaroonV1.exportJSON();
    const dischargeMacaroonSpy = jest
      .spyOn(macaroonlib, "dischargeMacaroon")
      .mockImplementation((_a, b, c, _d) => {
        b("", "", new Uint8Array(), jest.fn(), jest.fn());
        // Call the onOK method in macaroon.
        c([macaroonV1]);
        called = true;
      });
    const importMacaroonsSpy = jest
      .spyOn(macaroonlib, "importMacaroons")
      .mockImplementation(jest.fn().mockReturnValue([macaroonJSON]));
    const { bakeryInstance } = setup();
    const success = (discharges: MacaroonObject[]) => {
      expect(discharges).toStrictEqual([macaroonV1.exportJSON()]);
    };
    const failure = (msg: string | MacaroonError) => {
      console.error(msg);
      fail("macaroon discharge failed");
    };
    bakeryInstance.discharge(macaroonJSON, success, failure);
    expect(called).toBe(true);
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles failures discharging macaroons", () => {
    const fakeMacaroon = newMacaroon({
      identifier: new Uint8Array(),
      location: "",
      rootKey: new Uint8Array(),
      version: 2,
    }).exportJSON();
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest
      .spyOn(macaroonlib, "dischargeMacaroon")
      .mockImplementation(dischargeMacaroon);
    const importMacaroonsSpy = jest
      .spyOn(macaroonlib, "importMacaroons")
      .mockImplementation(jest.fn().mockReturnValue([]));
    const { bakeryInstance } = setup();
    const success = (_discharges: MacaroonObject[]) => {
      fail("this should have failed");
    };
    const failure = (msg: string | MacaroonError) => {
      expect(msg).toBe("broken");
    };
    bakeryInstance.discharge(fakeMacaroon, success, failure);
    expect(dischargeMacaroon).toHaveBeenCalledTimes(1);
    // Call the onOK method in macaroon.
    dischargeMacaroon.mock.calls[0][3]("broken");
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles third party discharge", () => {
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest
      .spyOn(macaroonlib, "dischargeMacaroon")
      .mockImplementation(dischargeMacaroon);
    const importMacaroonsSpy = jest
      .spyOn(macaroonlib, "importMacaroons")
      .mockImplementation(jest.fn().mockReturnValue([]));
    const { bakeryInstance, sendRequest } = setup();
    const condition = new TextEncoder().encode("this is a caveat"); // uint8array
    const success = () => {};
    const failure = () => {};
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
    expect(args[3]).toBe(
      "id=this%20is%20a%20caveat&location=http%3A%2F%2Fexample.com%2F"
    );
    dischargeMacaroonSpy.mockRestore();
    importMacaroonsSpy.mockRestore();
  });

  test("handles failure parsing third party maracoon data", () => {
    const dischargeMacaroon = jest.fn();
    const dischargeMacaroonSpy = jest
      .spyOn(macaroonlib, "dischargeMacaroon")
      .mockImplementation(dischargeMacaroon);
    const importMacaroonsSpy = jest
      .spyOn(macaroonlib, "importMacaroons")
      .mockImplementation(jest.fn().mockReturnValue([]));
    const { bakeryInstance, sendRequest } = setup();
    const condition = new TextEncoder().encode("this is a caveat"); // uint8array
    const success = () => {};
    const failure = (err: string | MacaroonError) => {
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
    expect(args[3]).toBe(
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
  const getTarget = (
    responseObj?: Partial<MacaroonError<VisitPageInfo>>
  ): MockXMLHttpRequest => {
    const response = new MockXMLHttpRequest();
    response.getResponseHeader = jest.fn().mockReturnValue("application/json");
    if (!responseObj) {
      return {
        ...response,
        status: 200,
      } as MockXMLHttpRequest;
    }
    const responseText = JSON.stringify(responseObj);
    return {
      ...response,
      status: 401,
      responseText,
    } as MockXMLHttpRequest;
  };

  const createFakeEvent = (
    responseObj?: Partial<MacaroonError<VisitPageInfo>>
  ) => {
    const progressEvent = new MockProgressEvent("load");
    const target = getTarget(responseObj);
    return {
      ...progressEvent,
      target: target as XMLHttpRequest,
      composed: false,
      composedPath: jest.fn(),
      initEvent: jest.fn(),
      preventDefault: jest.fn(),
      stopImmediatePropagation: jest.fn(),
      stopPropagation: jest.fn(),
      NONE: 0,
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
    wrappedCB(createFakeEvent());
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
    const event = {
      ...mockError,
      Code: "interaction required",
      Info: {
        ...mockError.Info,
        VisitURL: "http://example.com/identity",
        WaitURL: "http://example.com/identity/wait",
      },
    };
    wrappedCB(createFakeEvent(event));
    expect(interact).toHaveBeenCalledTimes(1);
    const info = (interact.mock.calls[0][0] as MacaroonError<VisitPageInfo>)
      .Info;
    expect(info.VisitURL).toBe("http://example.com/identity");
    expect(info.WaitURL).toBe("http://example.com/identity/wait");
  });

  test("handles discharge if needed", () => {
    const { bakeryInstance } = setup();
    const dischargeStub = jest.spyOn(bakeryInstance, "discharge");
    dischargeStub.mockImplementation(jest.fn());
    const cb = jest.fn();
    const wrappedCB = bakeryInstance._wrapCallback(
      "http://example.com",
      "POST",
      {},
      "body",
      cb
    );
    const event = {
      ...mockError,
      Code: "macaroon discharge required",
      Info: {
        ...mockError.Info,
        Macaroon: "macaroon",
      },
    };
    wrappedCB(createFakeEvent(event));
    expect(dischargeStub).toHaveBeenCalledTimes(1);
    const args = dischargeStub.mock.calls[0];
    expect(args[0]).toBe("macaroon");
  });
});

describe("interact handling", () => {
  const getResponse = (fail?: boolean) => {
    const response = {
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
    const { bakeryInstance } = setup({
      visitPage: () => {
        return "visits";
      },
    });
    expect(
      bakeryInstance._visitPage({ Info: { WaitURL: "", VisitURL: "" } })
    ).toBe("visits");
  });

  test("opens the visit page", () => {
    const openSpy = jest.spyOn(window, "open");
    const { bakeryInstance } = setup();
    const error = {
      Info: {
        VisitURL: "http://example.com",
        WaitURL: "",
      },
    };
    bakeryInstance._visitPage(error);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toBe(error.Info.VisitURL);
  });

  test("sets the content type correctly for the wait call", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      ...mockError,
      Info: {
        ...mockError.Info,
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
    expect(sendRequest.mock.calls[0][2]["Content-Type"]).toBe(
      "application/json"
    );
  });

  test("handles retry", () => {
    const { bakeryInstance, sendRequest } = setup();
    const error = {
      ...mockError,
      Info: {
        ...mockError.Info,
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
      ...mockError,
      Info: {
        ...mockError.Info,
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
      ...mockError,
      Info: {
        ...mockError.Info,
        WaitURL: "http://example.com/wait",
        VisitURL: "http://example.com/visit",
      },
    };
    sendRequest.mockImplementation(
      (url, method, allHeaders, body, withCredentials, wrappedCallback) => {
        wrappedCallback(getResponse(true));
      }
    );
    jest
      .spyOn(bakeryInstance, "_getError")
      .mockReturnValue({ ...mockError, Message: "bad wolf" });
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
      ...mockError,
      Info: {
        ...mockError.Info,
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
    const { storage } = setup({}, { charmstoreCookieSetter: cookieSet });
    const macaroonValue = btoa(JSON.stringify("macaroon"));
    storage.set("http://example.com/charmstore", macaroonValue, () => {});
    expect(cookieSet).toHaveBeenCalledTimes(1);
    expect(cookieSet.mock.calls[0][0]).toBe("macaroon");
  });

  describe("keys", () => {
    test("removes discharge suffix", () => {
      const { storage } = setup();
      expect("http://example.com/identity").toBe(
        storage._getKey("http://example.com/identity/discharge")
      );
    });

    test("gets keys from services", () => {
      const { storage } = setup();
      expect("charmstore").toBe(
        storage._getKey("http://example.com/charmstore")
      );
    });

    test("does not modify other keys", () => {
      const { storage } = setup();
      expect("a-key").toBe(storage._getKey("a-key"));
    });
  });
});
