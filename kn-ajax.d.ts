/// <reference path="./typings/index.d.ts"/>

declare namespace KN {
    interface IRequestConfig extends ng.IRequestShortcutConfig {
        noApi?: boolean;
    }

    interface IHttpPromise<T> extends ng.IPromise<T> {
        cancel(): void;
    }

    interface IHttpResponse {
        _xhr: XMLHttpRequest;
        _headers: any;
        _status: number;
        _total?: number;
    }

    interface IAjaxHelpersService {
        GET<T>(url: string, params?: any, config?: IRequestConfig): IHttpPromise<T>;
        DELETE<T>(url: string, params?: any, config?: IRequestConfig): IHttpPromise<T>;
        POST<T>(url: string, data?: any, config?: IRequestConfig): IHttpPromise<T>;
        PUT<T>(url: string, data?: any, config?: IRequestConfig): IHttpPromise<T>;
        buildUrl(url: string, params: any, noApi?: boolean): string;
    }
}

declare var require: {
    <T>(path: string): T;
    (paths: string[], callback: (...modules: any[]) => void): void;
    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void) => void;
};