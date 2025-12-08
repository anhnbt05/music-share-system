import { camelCase } from 'lodash';

export function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result: any, key) => {
            const camel = camelCase(key);
            result[camel] = toCamelCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
}
