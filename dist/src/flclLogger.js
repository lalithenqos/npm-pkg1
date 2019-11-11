"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bunyanClient_1 = require("./bunyanClient");
let globals = require('../globals');
const DEFAULT_LOG_ROOT_PATH = require('app-root-path') + '/logs/';
let CUSTOM_LEVELS = {
    SECURITY_ERROR: 61,
    SECURITY_INFO: 31,
    NOTICE: 41,
    SERIOUS_ERROR: 55,
    VALIDATION_ERROR: 45
};
class FlclLogger {
    constructor(options) {
        if (!options.logRootPath)
            options.logRootPath = DEFAULT_LOG_ROOT_PATH;
        if (options.requestId)
            this.setRequestId(options.requestId);
        if (options.errorMsgCategoryList)
            globals.errorMsgCategoryList = options.errorMsgCategoryList;
        this.logger = new bunyanClient_1.BunyanClient(options.logRootPath, options).createLogger();
        this.info({ identifier: 'flclLogger-instance', data: { msg: 'New Flcl-logger instance has been created!' } });
        this.bindCustomLevelLogs();
    }
    bindCustomLevelLogs() {
        this.logger.notice = this.getCustomLevel(CUSTOM_LEVELS.NOTICE);
        this.logger.securityError = this.getCustomLevel(CUSTOM_LEVELS.SECURITY_ERROR);
        this.logger.securityInfo = this.getCustomLevel(CUSTOM_LEVELS.SECURITY_INFO);
        this.logger.criticalError = this.getCustomLevel(CUSTOM_LEVELS.SERIOUS_ERROR);
        this.logger.validationError = this.getCustomLevel(CUSTOM_LEVELS.VALIDATION_ERROR);
    }
    getCustomLevel(level) {
        return (msg, ...args) => {
            let theArgs;
            if (typeof msg === 'string') {
                theArgs = Object.assign({ level: level, msg }, args);
            }
            else if (typeof msg === 'object') {
                theArgs = Object.assign(Object.assign({ level: level }, msg), args);
            }
            else {
                throw new Error('Invalid arguments provided');
            }
            if (theArgs)
                this.logger.fatal(theArgs);
        };
    }
    setRequestId(requestId) {
        this.requestId = requestId;
    }
    getRequestId() {
        return this.requestId;
    }
    structurizeArg(data) {
        try {
            let requestId = this.getRequestId();
            if (data) {
                if (typeof data == 'object') {
                    data = this.cleanObj(data);
                    data.requestId = requestId;
                }
                else if (typeof data == 'string' || typeof data == 'number') {
                    let msgText = data;
                    data = {
                        message: msgText,
                        requestId: requestId,
                    };
                }
                ;
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            return data;
        }
        ;
    }
    cleanObj(data) {
        let cleanedObj = {};
        try {
            /**
             * The 'data' might have 'non-enumerable' properties.
             * The normal loop methods like 'forLoop' or '_.each" will not look on the non-enumerable properties, and hence those properties will get skipped in our log information.
             * Hence, we are Iterating 'data' using Object.getOwnPropertyNames().forEach(()=>{}) syntax (to iterate over non-enumerable properties as well)
             * Ex: 'FlclError' object instance has a property named 'stack', which is non-enumerable
             */
            Object.getOwnPropertyNames(data).forEach((key) => {
                let propVal = data[key];
                if (this.displayInRootLevel(key)) {
                    if (typeof propVal == 'object' && this.canStringify(key))
                        cleanedObj[key] = this._getStringified(propVal);
                    else
                        cleanedObj[key] = propVal;
                }
                else {
                    cleanedObj.message = cleanedObj.message || {};
                    cleanedObj.message[key] = propVal;
                }
            });
            cleanedObj.message = this._getStringified(cleanedObj.message);
        }
        catch (e) {
            cleanedObj['logdata-parse-error'] = true;
            cleanedObj['logdata-parse-error-msg'] = e.message;
            cleanedObj['logdata-parse-error-stack'] = e.stack;
        }
        finally {
            return cleanedObj;
        }
    }
    _getStringified(jsonObj) {
        let stringified = '';
        try {
            stringified = JSON.stringify(jsonObj, FlclLogger.replacer, 4);
        }
        catch (e) {
            if (jsonObj && jsonObj.response && jsonObj.response.data) {
                stringified = this._getStringified(jsonObj.response.data);
            }
            else {
                stringified = JSON.stringify({ identifier: 'INVALID_JSON_CIRCULAR_JSON', message: jsonObj.message || 'This is circular json. Could not able to convert', stackTrace: this._getStackTrace() }, FlclLogger.replacer, 4);
            }
        }
        finally {
            return stringified;
        }
    }
    static replacer(key, data) {
        /**
         * ERROR object is non-enumerable, and JSON.stringify() could not able to return stringified version of it.
         * So, using Object.getOwnPropertyNames().forEach(()=>{}), cloning its non-enumerable properties into other object as enumerable properties, and returning that new object.
         */
        if (data instanceof Error) {
            let cleanData = {};
            Object.getOwnPropertyNames(data).forEach((key) => {
                cleanData[key] = data[key];
            });
            data = cleanData;
        }
        else if (typeof data === 'string') { // If its already stringified object, then parse it(since the parent stringify will take care of stringifying it)
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                data = data;
            }
        }
        return data;
    }
    displayInRootLevel(key) {
        let rootLevels = [
            'userAgent', 'host',
            'req', 'res', 'err',
            'appId', 'userId', 'customerName', 'companyName', 'customerId', 'companyName', 'orderReference', 'fromCity', 'fromCountry', 'toCity', 'toCountry',
            'className', 'class', 'methodName', 'propertyValue', 'propertyName', 'level',
            'requestId', 'isNewRequest', 'isEndOfResponse', 'inTime', 'elapsedTime',
            'workerName', 'action',
            'errorType', 'identifier'
        ];
        if (rootLevels.indexOf(key) != -1)
            return true;
        else
            return false;
    }
    canStringify(key) {
        let stringifyProps = [
            'propertyValue',
        ];
        if (stringifyProps.indexOf(key) != -1)
            return true;
        else
            return false;
    }
    _getStackTrace() {
        let obj = {};
        Error.captureStackTrace(obj, this._getStackTrace);
        return obj.stack;
    }
    trace(args) {
        this.logger.trace(this.structurizeArg(args));
    }
    debug(args) {
        this.logger.debug(this.structurizeArg(args));
    }
    info(args) {
        this.logger.info(this.structurizeArg(args));
    }
    warn(args) {
        this.logger.warn(this.structurizeArg(args));
    }
    error(args) {
        if (args && args.errorType == 'critical' || (this.flclMsgController && this.flclMsgController.isCriticalError(args)))
            this.critical(args);
        else if (args && args.errorType == 'validation' || (this.flclMsgController && this.flclMsgController.isValidationError(args)))
            this.validation(args);
        else
            this.logger.error(this.structurizeArg(args));
    }
    validation(args) {
        this.logger.validationError(this.structurizeArg(args));
    }
    critical(args) {
        this.logger.criticalError(this.structurizeArg(args));
    }
    fatal(args) {
        this.logger.fatal(this.structurizeArg(args));
    }
}
exports.FlclLogger = FlclLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxjbExvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mbGNsTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaURBQThDO0FBQzlDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxRQUFRLENBQUM7QUFJbEUsSUFBSSxhQUFhLEdBQUc7SUFDbEIsY0FBYyxFQUFFLEVBQUU7SUFDbEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsTUFBTSxFQUFFLEVBQUU7SUFDVixhQUFhLEVBQUUsRUFBRTtJQUNqQixnQkFBZ0IsRUFBRSxFQUFFO0NBQ3JCLENBQUM7QUFFRixNQUFhLFVBQVU7SUFJckIsWUFBWSxPQUFvQjtRQUM5QixJQUFHLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkIsT0FBTyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztRQUNoRCxJQUFHLE9BQU8sQ0FBQyxTQUFTO1lBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXpDLElBQUcsT0FBTyxDQUFDLG9CQUFvQjtZQUMzQixPQUFPLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDO1FBRWhFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwyQkFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDNUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsNENBQTRDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFFN0IsQ0FBQztJQUVELG1CQUFtQjtRQUNqQixJQUFJLENBQUMsTUFBTSxD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