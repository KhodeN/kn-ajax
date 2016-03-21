(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", 'lodashExt'], factory);
    }
})(function (require, exports) {
    "use strict";
    require('lodashExt');
    var AjaxHelpers = (function () {
        function AjaxHelpers($http, $q, $timeout, apiUrl) {
            'ngInject';
            this.$http = $http;
            this.$q = $q;
            this.$timeout = $timeout;
            this.apiUrl = apiUrl;
        }
        AjaxHelpers.prototype.GET = function (url, params, config) {
            config = config || {};
            _.assign(config, {
                params: _.isUndefined(params) ? {} : params
            });
            var deferred = this._addCanceling(config);
            url = this._buildUrl(url, params, config && config.noApi);
            return this._convertToPromise(this.$http.get(url, config), deferred);
        };
        AjaxHelpers.prototype.DELETE = function (url, params, config) {
            config = config || {};
            _.assign(config, {
                params: _.isUndefined(params) ? {} : params
            });
            var deferred = this._addCanceling(config);
            url = this._buildUrl(url, params, config && config.noApi);
            return this._convertToPromise(this.$http.delete(url, config), deferred);
        };
        AjaxHelpers.prototype.POST = function (url, data, config) {
            config = config || {};
            url = this._buildUrl(url, config.params, config.noApi);
            var deferred = this._addCanceling(config);
            return this._convertToPromise(this.$http.post(url, _.omitPrivateFields(data), config), deferred);
        };
        AjaxHelpers.prototype.PUT = function (url, data, config) {
            config = config || {};
            url = this._buildUrl(url, config.params, config.noApi);
            var deferred = this._addCanceling(config);
            return this._convertToPromise(this.$http.put(url, _.omitPrivateFields(data), config), deferred);
        };
        AjaxHelpers.prototype.buildCacheKey = function (url, params) {
            params = params || {};
            url = this._buildUrl(url, params);
            var pairs = [];
            _.forEach(params, function (value, key) {
                if (_.isUndefined(value) || _.isNull(value)) {
                    return;
                }
                if (_.isArray(value)) {
                    value = value.join(',');
                }
                pairs.push([key, value].join('='));
            });
            return url + (_.isEmpty(pairs) ? '' : pairs.join('&'));
        };
        AjaxHelpers.prototype._addCanceling = function (config) {
            var deferred = this.$q.defer();
            var oldTimeout = config.timeout;
            var resolve = _.bind(deferred.resolve, deferred);
            if (_.isNumber(oldTimeout)) {
                this.$timeout(resolve, oldTimeout);
            }
            if (_.isPromise(oldTimeout)) {
                oldTimeout.then(resolve);
            }
            config.timeout = deferred.promise;
            return deferred;
        };
        AjaxHelpers.prototype._buildUrl = function (url, params, noApi) {
            if (noApi === void 0) { noApi = false; }
            url = url.replace(/\{(\w+?)\}/g, function (match, field) {
                if (_.has(params, field)) {
                    var value = params[field];
                    delete params[field];
                    return encodeURIComponent(value);
                }
                else {
                    return match;
                }
            });
            if (!(noApi || _.startsWith(url, 'http'))) {
                url = this.apiUrl + url;
            }
            return url;
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
                if (_.includes(string, '<title>')) {
                    msg = string.match(/<title>([\s\S]+?)<\/title>/)[1];
                    stack = [string];
                }
                else if (_.includes(string, '<h1>')) {
                    msg = string.match(/<h1>([\s\S]+?)<\/h1>/)[1];
                    stack = [string];
                }
                else {
                    var rows = _.compact(string.split('\n'));
                    msg = _.first(rows);
                    stack = _.tail(rows);
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
                if (_.isObject(data)) {
                    data._status = response.status;
                    data._headers = _.isFunction(response.headers) ? response.headers() : {};
                    if (_.has(data._headers, 'x-total-count')) {
                        data._total = data._headers['x-total-count'];
                    }
                }
                deferred.resolve(data);
            }
            function errorCallback(response) {
                var data = response.data;
                if (_.isUndefined(data) || _.isNull(data) || data === 'null' || isEmptyString(data)) {
                    data = {};
                }
                else if (_.isString(data)) {
                    data = parseErrorString(data);
                }
                data.isCancelled = function () {
                    return response.status === 0;
                };
                data._status = status;
                data._headers = _.isFunction(response.headers) ? response.headers() : {};
                deferred.reject(data);
            }
            httpPromise.then(successCallback, errorCallback);
            var result = deferred.promise;
            var delay = parseInt(localStorage.getItem('delay') || 0, 10);
            var delayedPromise = _.constant(self.$timeout(_.constant(deferred.promise), delay));
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
        return AjaxHelpers;
    }());
    exports.AjaxHelpers = AjaxHelpers;
});
