"use strict";
var _ajaxHelpers_1 = require('./$ajaxHelpers');
require('angular');
var moduleName = 'kn-ajax';
angular.module(moduleName, [])
    .value('apiUrl', '')
    .service({
    $ajaxHelpers: _ajaxHelpers_1.AjaxHelpers
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = moduleName;
