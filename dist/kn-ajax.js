(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './$ajaxHelpers', 'angular'], factory);
    }
})(function (require, exports) {
    "use strict";
    var _ajaxHelpers_1 = require('./$ajaxHelpers');
    require('angular');
    var moduleName = 'kn-ajax';
    angular.module(moduleName, [])
        .constant('apiUrl', '')
        .service({
        $ajaxHelpers: _ajaxHelpers_1.AjaxHelpers
    });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = moduleName;
});
