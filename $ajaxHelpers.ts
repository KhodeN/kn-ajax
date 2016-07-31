/// <reference path="./kn-ajax.d.ts" />
let _ = require<_.LoDashStatic>("lodash-ext");

/**
 * Методы для удобной работы с AJAX
 *
 * Исправляет некоторые неудобства штатного [$http](https://docs.angularjs.org/api/ng/service/$http):
 *
 * - возвращает обычный промис вместо особого промиса с методами `success`, `error`
 * - умеет строить url
 * - позволяет отменить запрос:
 * - более удобные параметры для GET, POST
 * - ошибочные запросы пытаются распарситься, чтобы вытащить message,
 *   даже если в ответ пришла html-заглушка с сервера
 *
 * ### Пример 1
 *
 *      let request = $ajaxHelpers.GET('/books/{id}', {id: 2}); // подстановка параметров в URL
 *      request.cancel(); // отмена запроса
 *      // при отмене промис request реджектиться с ошибкой у которой метод `isCanceled` возвращает `true`
 *
 * ### Пример 2
 *
 *     // POST также поддерживает подстановка параметров в URL
 *     let request = $ajaxHelpers.POST('/books/{id}', {name:'xxx'}, {params:{id: 2}});
 *
 * @class cmHelpers.services.$ajaxHelpers
 * @xtype $ajaxHelpers
 * @singleton
 */
export class AjaxHelpers implements KN.IAjaxHelpersService {
    public static $inject = ['$http', '$q', '$timeout', 'apiUrl'];

    constructor(private $http: ng.IHttpService,
                private $q: ng.IQService,
                private $timeout: ng.ITimeoutService,
                private apiUrl: string) {
    }

    /**
     * Отправляет GET запрос
     * @param {string} url Адрес запроса
     * Автоматически добавляется `apiUrl`, если в конфиге не задано `noApi=false`
     * @param {Object} [params] Параметры для подстановки в адрес
     * @param {Object} [config] Дополнительные параметры запроса (стандартные для `$http`)
     * @returns {Promise}
     */
    public GET(url: string, params?: any, config?: KN.IRequestConfig) {
        config = config || {};
        _.assign(config, {
            params: _.isUndefined(params) ? {} : params
        });

        let deferred = this._addCanceling(config);

        url = this.buildUrl(url, params, config && config.noApi);

        return this._convertToPromise(this.$http.get(url, config), deferred);
    }

    public DELETE(url: string, params?: any, config?: KN.IRequestConfig) {
        config = config || {};
        _.assign(config, {
            params: _.isUndefined(params) ? {} : params
        });

        let deferred = this._addCanceling(config);

        url = this.buildUrl(url, params, config && config.noApi);

        return this._convertToPromise(this.$http.delete(url, config), deferred);
    }

    /**
     * Отправляет POST запрос
     * @param {string} url Адрес запроса
     * Автоматически добавляется `apiUrl`, если в конфиге не задано `noApi=false`
     * @param {Object} [data] Данные для отправки
     * @param {Object} [config] Дополнительные параметры запроса (стандартные для `$http`)
     * @returns {Promise}
     */
    public POST(url: string, data?: any, config?: KN.IRequestConfig) {
        config = config || {};
        url = this.buildUrl(url, config.params, config.noApi);

        let deferred = this._addCanceling(config);

        return this._convertToPromise(this.$http.post(url, _.omitPrivateFields(data), config), deferred);
    }

    public PUT(url: string, data?: any, config?: KN.IRequestConfig) {
        config = config || {};
        url = this.buildUrl(url, config.params, config.noApi);

        let deferred = this._addCanceling(config);

        return this._convertToPromise(this.$http.put(url, _.omitPrivateFields(data), config), deferred);
    }

    /**
     * Строит уникальную строку для данного урла с параметрами.
     * Используется для работы кешей.
     *
     * @param {string} url
     * @param {Object} params
     * @returns {string}
     */
    public buildCacheKey(url: string, params?: any) {
        params = params || {};
        url = this.buildUrl(url, params);

        let pairs: string[] = [];
        _.forEach(params, function (value: any, key: string) {
            if ( _.isUndefined(value) || _.isNull(value) ) {
                return;
            }
            if ( _.isArray(value) ) {
                value = value.join(',');
            }
            pairs.push([key, value].join('='));
        });

        return url + (_.isEmpty(pairs) ? '' : pairs.join('&'));
    }

    public buildUrl(url: string, params: any, noApi = false) {
        url = url.replace(/\{(\w+?)\}/g, function (match, field) {
            if ( _.has(params, field) ) {
                let value = params[field];
                delete params[field];
                return encodeURIComponent(value);
            } else {
                return match;
            }
        });
        if ( !(noApi || _.startsWith(url, 'http')) ) {
            url = this.apiUrl + url;
        }
        return url;
    }

    private _addCanceling(config?: KN.IRequestConfig) {
        let deferred = this.$q.defer();
        let oldTimeout = <ng.IPromise<any>>config.timeout;

        let resolve = <any>_.bind(deferred.resolve, deferred);
        if ( _.isNumber(oldTimeout) ) {
            this.$timeout(resolve, <any>oldTimeout);
        }

        if ( _.isPromise(oldTimeout) ) {
            oldTimeout.then(resolve);
        }

        config.timeout = deferred.promise;
        return deferred;
    }


    /**
     * Конвертирует HttpPromise от $http в обычный Promise
     *
     * Copied from kbiface ($helpers)
     * @param {angular.HttpPromise} httpPromise
     * @param {Deferred} timeoutDeferred
     * @returns {Promise}
     * @private
     */
    private _convertToPromise<T>(httpPromise: ng.IHttpPromise<T>, timeoutDeferred: ng.IDeferred<T>) {
        let self = this;
        let deferred = self.$q.defer<any>();

        function isEmptyString(string: string) {
            return !/[^\s]/.test(string);
        }

        function parseErrorString(string: string) {
            let msg: string;
            let stack: string[];

            if ( _.includes(string, '<title>') ) {
                msg = string.match(/<title>([\s\S]+?)<\/title>/)[1];
                stack = [string];
            } else if ( _.includes(string, '<h1>') ) {
                msg = string.match(/<h1>([\s\S]+?)<\/h1>/)[1];
                stack = [string];
            } else {
                let rows = _.compact(string.split('\n'));
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

        function successCallback(response: ng.IHttpPromiseCallbackArg<any>) {
            let data = response.data;
            if ( _.isObject(data) ) {
                data._status = response.status;
                data._headers = _.isFunction(response.headers) ? response.headers() : {};
                if ( _.has(data._headers, 'x-total-count') ) {
                    data._total = data._headers['x-total-count'];
                }
            }
            deferred.resolve(data);
        }

        function errorCallback(response: ng.IHttpPromiseCallbackArg<any>) {
            let data = response.data;

            if ( _.isUndefined(data) || _.isNull(data) || data === 'null' || isEmptyString(data) ) {
                data = {};
            } else if ( _.isString(data) ) {
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

        let result = <KN.IHttpPromise<T>> deferred.promise;

        // for debug loaders
        let delay = parseInt(localStorage.getItem('delay') || 0, 10);
        let delayedPromise = _.constant(self.$timeout(_.constant(deferred.promise), delay));
        if ( delay > 0 ) {
            result = <any>deferred.promise.then(delayedPromise, delayedPromise);
        }

        result.cancel = function () {
            if ( timeoutDeferred ) {
                timeoutDeferred.resolve();
            }
        };

        return result;
    }
}
