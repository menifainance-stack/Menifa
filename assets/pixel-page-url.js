/* Campaign landings only: /lp/mihzur, /lp/ihud, /q/mihzur, /q/ihud.
   Meta's remote config for pixel 1085659520839178 opts menifa.org into
   ProtectedDataMode. That plugin sets documentLink to new URL(href).origin,
   so facebook.com/tr is sent with dl=https://menifa.org and the path gone.
   Confirmed on live (fbevents 2.9.419): location.href still has the path.
   The same mode sets the pixel image referrerPolicy to "origin", so the
   Referer header is origin-only as well. This restores dl only.
   UTM query is kept (origin + pathname + search). The hash is dropped.
   Make's event_source_url is not touched (still origin + pathname).
   Lead eventID / event_id dedupe is not touched. */
(function () {
  'use strict';
  var path = location.pathname.replace(/\/+$/, '');
  if (path !== '/lp/mihzur' && path !== '/lp/ihud' && path !== '/q/mihzur' && path !== '/q/ihud') return;
  if (window.__menifaPixelPageUrl) return;
  window.__menifaPixelPageUrl = true;

  function pageUrl() {
    return location.origin + location.pathname + location.search;
  }

  function isTr(url) {
    return /(^|\.)facebook\.com$/.test(url.hostname) || /(^|\.)instagram\.com$/.test(url.hostname)
      ? url.pathname.indexOf('/tr') !== -1
      : false;
  }

  function pathStripped(dl) {
    try {
      var cur = new URL(dl, location.href);
      var p = cur.pathname || '/';
      return cur.origin === location.origin && (p === '/' || p === '') && location.pathname !== '/' && location.pathname !== '';
    } catch (e) {
      return false;
    }
  }

  function fixRequestUrl(raw) {
    if (typeof raw !== 'string' || raw.indexOf('/tr') === -1) return raw;
    try {
      var u = new URL(raw, location.href);
      if (!isTr(u)) return raw;
      var dl = u.searchParams.get('dl');
      if (!dl || !pathStripped(dl)) return raw;
      u.searchParams.set('dl', pageUrl());
      return u.toString();
    } catch (e) {
      return raw;
    }
  }

  function fixBody(data) {
    if (!data || typeof data.get !== 'function' || typeof data.forEach !== 'function') return data;
    var dl;
    try { dl = data.get('dl'); } catch (e) { return data; }
    if (!dl || !pathStripped(String(dl))) return data;
    try {
      var copy = new FormData();
      data.forEach(function (v, k) { copy.append(k, k === 'dl' ? pageUrl() : v); });
      return copy;
    } catch (e) {
      return data;
    }
  }

  var desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (desc && desc.set && desc.get) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: function (v) {
        desc.set.call(this, typeof v === 'string' ? fixRequestUrl(v) : v);
      }
    });
  }

  if (navigator.sendBeacon) {
    var origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return origBeacon(typeof url === 'string' ? fixRequestUrl(url) : url, fixBody(data));
    };
  }

  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string') input = fixRequestUrl(input);
        else if (input && typeof input.url === 'string') {
          var fixed = fixRequestUrl(input.url);
          if (fixed !== input.url) input = new Request(fixed, input);
        }
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
  }
})();
