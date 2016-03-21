import { AjaxHelpers } from './$ajaxHelpers';
import 'angular';

var moduleName = 'kn-ajax';
angular.module(moduleName, [])
    .value('apiUrl', '')
    .service({
        $ajaxHelpers: AjaxHelpers
    });

export default moduleName;
