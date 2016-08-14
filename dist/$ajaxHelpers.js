"use strict";
var lodash_ext_1 = require("lodash-ext");
var AjaxHelpers = (function () {
    function AjaxHelpers($http, $q, $timeout, apiUrl) {
        this.$http = $http;
        this.$q = $q;
        this.$timeout = $timeout;
        this.apiUrl = apiUrl;
    }
    AjaxHelpers.prototype.RAW = function (method, url, data, config) {
        config = config || {};
        lodash_ext_1.default.assign(config, {
            params: config.params || {}
        });
        config.url = this.buildUrl(url, config.params, config.noApi);
        config.method = method.toLowerCase();
        config.data = lodash_ext_1.default.omitPrivateFields(data);
        var deferred = this._addCanceling(config);
        return this._convertToPromise(this.$http(config), deferred);
    };
    AjaxHelpers.prototype.GET = function (url, params, config) {
        config = config || {};
        lodash_ext_1.default.assign(config, {
            params: params || {}
        });
        return this.RAW('get', url, undefined, config);
    };
    AjaxHelpers.prototype.DELETE = function (url, params, config) {
        config = config || {};
        lodash_ext_1.default.assign(config, {
            params: params || {}
        });
        return this.RAW('delete', url, undefined, config);
    };
    AjaxHelpers.prototype.POST = function (url, data, config) {
        return this.RAW('post', url, data, config);
    };
    AjaxHelpers.prototype.PUT = function (url, data, config) {
        return this.RAW('put', url, data, config);
    };
    AjaxHelpers.prototype.buildCacheKey = function (url, params) {
        params = params || {};
        url = this.buildUrl(url, params);
        var pairs = [];
        lodash_ext_1.default.forEach(params, function (value, key) {
            if (lodash_ext_1.default.isUndefined(value) || lodash_ext_1.default.isNull(value)) {
                return;
            }
            if (lodash_ext_1.default.isArray(value)) {
                value = value.join(',');
            }
            pairs.push([key, value].join('='));
        });
        return url + (lodash_ext_1.default.isEmpty(pairs) ? '' : pairs.join('&'));
    };
    AjaxHelpers.prototype.buildUrl = function (url, params, noApi) {
        if (noApi === void 0) { noApi = false; }
        url = url.replace(/\{(\w+?)\}/g, function (match, field) {
            if (lodash_ext_1.default.has(params, field)) {
                var value = params[field];
                delete params[field];
                return encodeURIComponent(value);
            }
            else {
                return match;
            }
        });
        if (!(noApi || lodash_ext_1.default.startsWith(url, 'http'))) {
            url = this.apiUrl + url;
        }
        return url;
    };
    AjaxHelpers.prototype._addCanceling = function (config) {
        var deferred = this.$q.defer();
        var oldTimeout = config.timeout;
        var resolve = lodash_ext_1.default.bind(deferred.resolve, deferred);
        if (lodash_ext_1.default.isNumber(oldTimeout)) {
            this.$timeout(resolve, oldTimeout);
        }
        if (lodash_ext_1.default.isPromise(oldTimeout)) {
            oldTimeout.then(resolve);
        }
        config.timeout = deferred.promise;
        return deferred;
    };
    AjaxHelpers.prototype._convertToPromise = function (httpPromise, timeoutDeferred) {
        var self = this;
        var deferred = self.$q.defer();
        function isEmptyString(string) {
            return !/[^\s]/.test(string);
        }
        function parseErrorString(string) {
            var msg;
            var stack;
            if (lodash_ext_1.default.includes(string, '<title>')) {
                msg = string.match(/<title>([\s\S]+?)<\/title>/)[1];
                stack = [string];
            }
            else if (lodash_ext_1.default.includes(string, '<h1>')) {
                msg = string.match(/<h1>([\s\S]+?)<\/h1>/)[1];
                stack = [string];
            }
            else {
                var rows = lodash_ext_1.default.compact(string.split('\n'));
                msg = lodash_ext_1.default.first(rows);
                stack = lodash_ext_1.default.tail(rows);
            }
            return {
                message: msg,
                exception: {
                    message: msg,
                    stack: stack
                }
            };
        }
        function successCallback(response) {
            var data = response.data;
            if (lodash_ext_1.default.isObject(data)) {
                data._status = response.status;
                data._headers = lodash_ext_1.default.isFunction(response.headers) ? response.headers() : {};
                if (lodash_ext_1.default.has(data._headers, 'x-total-count')) {
                    data._total = data._headers['x-total-count'];
                }
            }
            deferred.resolve(data);
        }
        function errorCallback(response) {
            var data = response.data;
            if (lodash_ext_1.default.isUndefined(data) || lodash_ext_1.default.isNull(data) || data === 'null' || isEmptyString(data)) {
                data = {};
            }
            else if (lodash_ext_1.default.isString(data)) {
                data = parseErrorString(data);
            }
            data.isCancelled = function () {
                return response.status === 0;
            };
            data._status = status;
            data._headers = lodash_ext_1.default.isFunction(response.headers) ? response.headers() : {};
            deferred.reject(data);
        }
        httpPromise.then(successCallback, errorCallback);
        var result = deferred.promise;
        var delay = parseInt(localStorage.getItem('delay') || 0, 10);
        var delayedPromise = lodash_ext_1.default.constant(self.$timeout(lodash_ext_1.default.constant(deferred.promise), delay));
        if (delay > 0) {
            result = deferred.promise.then(delayedPromise, delayedPromise);
        }
        result.cancel = function () {
            if (timeoutDeferred) {
                timeoutDeferred.resolve();
            }
        };
        return result;
    };
    AjaxHelpers.$inject = ['$http', '$q', '$timeout', 'apiUrl'];
    return AjaxHelpers;
}());
exports.AjaxHelpers = AjaxHelpers;
